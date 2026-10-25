import { browserStorage } from './browser-storage'
import './chapter-two.css'
import './reading-settings.css'
import { bindReadingControls, createDialogueReader, getReadingSettings, onReadingSettingsChange, readingDelay, renderReadingControls } from './reading-settings'
import { loadIceManualSaves, writeIceManualSave } from './chapter-two-saves'
import { resolveIceDialogue } from './chapter-two-dialogue'
import { mountPoolIceWorld, type IceClueId } from './pool-ice-world'
import type { Language } from './story'
import { characterVoiceSequence } from './character-voice'
import { isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'
import { confirmInApp } from './ui-confirm'
import { showIceStoryMap } from './chapter-two-map'
import { iceSaveKey as KEY, iceProgressKey as PROGRESS_KEY, fragmentIds, newIceSave as blank, normalizeIceSave, normalizeIceProgress, recordIceCheckpoint, restartIceFrom, type ChapterSave, type Phase, type FragmentId, type IceProgress } from './chapter-two-progress'

function load(): ChapterSave {
  try { return normalizeIceSave(JSON.parse(browserStorage.getItem(KEY) ?? 'null')) } catch { return blank() }
}
function loadProgress(save: ChapterSave): IceProgress {
  try { return normalizeIceProgress(JSON.parse(browserStorage.getItem(PROGRESS_KEY) ?? 'null'), save) } catch { return normalizeIceProgress(null, save) }
}
const routeConfirmation = (language: Language) => language === 'zh' ? '从这里重新开始？将恢复首次抵达时的线索和路线；已解锁节点与结局会保留。' : 'Restart here? Restore the clues and route recorded on arrival. Unlocked nodes and endings will remain.'
const copy = {
  zh: {
    back: '章节详情', chapter: '第二章', title: '冰镜疑凶', subtitle: '第二层 · 冰封镜馆', next: '继续', enter: '进入冰封镜馆', resume: '继续探索', restart: '重玩第二章', restartConfirm: '重新开始第二章？本章线索和进度将被清除。', fullscreen: '进入全屏', exitFullscreen: '退出全屏', routes: '剧情树', routesTitle: '冰镜剧情树', close: '关闭', locked: '尚未抵达', visited: '已抵达', log: '回顾', menu: '菜单', routeHint: '点击已抵达的节点返回该段剧情。',
    map: '探索镜馆', clues: '探索记录', clueNames: { footage: '残缺监控', shard: '冰蓝晶片', echo: '被封住的声音', note: '入口便笺', routeOne: '第一段路线', route: '第二段路线' },
    hospital: [
      ['旁白', "从游乐园回来，奶蛙的心跳终于稳了一点。穿黄色香蕉壳的橘猫替我刷开病房门：“香蕉猫，监控和门禁找我。”床边，短发的黄色姑娘把一根管线接回泵上：“我是奶豆，设备和记录由我管，别自己拔线。”门外一位长着紫色斑角的金黄牛形人举起夹板：“牛来。要换病区，先来找我核对车和去处。”护士替奶蛙盖好被子。三人各自忙着，我把这当成了普通的交班。"],
      ['旁白', '两点十七分，监护仪连响三声。奶蛙的手指缩了一下。床边的《奶蛙观察日记》自行翻页，纸上慢慢洇出一行字：第二层。别信第一面镜子。'],
      ['旁白', '我去值班台查录像。橘猫把屏幕转过来：“叫我香蕉猫就好。我管这一层的监控和门禁，病房的事你找护士。”它替我调出两点十七分的画面：一个紫色身影抽走日记页，金属手甲闪了一下。画面在他回头时花了；倒回三次，都是同一处。'],
      ['奶霸', '日记那页给我。你已经带回来一个了，别再进去。'],
      ['旁白', '我追出病房，防火门在面前砰地合上。门缝里卡着一角结霜的纸。身后的监护仪忽然加快；隔墙有人用奶蛙的声音说：“当时不止他一个人。”'],
      ['旁白', "护士说昨夜整层楼停过电。我指给她看监控：停电的那一分钟，每间病房的灯都亮着。她把设备记录递给奶豆。奶豆用深灰色的手指按住一行：“只是切换电源，病床不用搬。”牛来却已经在冷藏电梯的呼叫单上签了字；香蕉猫低头把屏幕切回走廊。三个时间都停在两点十七分。我问那台电梯运了什么，牛来收起单子：“先去看奶蛙吧。”"],
      ['旁白', '纸角上有半枚蓝色指印，还有一行地址：第二层，冰封镜馆。剩下的字被撕走了，断口很新。'],
      ['旁白', '电梯门一开，寒气钻进袖口。我回头看奶蛙。他还睡着，手心却握着一小片冰，床单已经湿了一圈。'],
    ],
    threshold: [
      ['旁白', '电梯停了，楼层屏上只有一道横线。门外的瓷砖爬满冰纹；抬头时，我看见另一条走廊倒挂在玻璃顶上。'],
      ['旁白', '入口摆着三面镜子。左边的我追着紫色背影跑，中间的我蹲着捡镜片，右边的我贴在墙上，听里面有人喘气。'],
      ['旁白', '镜中的三条路都通向馆内。我伸手去碰，镜面冰得刺骨。墙里又传来那句话：“别信他。”这次尾音像是被掐断了。'],
      ['旁白', '灯亮三秒，灭两秒。趁亮，我记下墙上的抓痕和地面一串湿脚印；灭灯后，脚印又多出了一枚。'],
      ['旁白', '中央镜心锁着，门上有三个空槽。我在第一处转角找到一张沾水的纸条，折痕里写着路线。'],
    ],
    approaches: [
      ['追上紫色背影', '他刚从左边的镜子里转过去。'],
      ['捡起散落镜片', '碎片上的时间码各不相同。'],
      ['去找墙里的声音', '那人还在里面喘气。'],
    ],
    responses: [['先听肥嘟嘟说完', '他还记得事故时的声音。'], ['追问奶霸', '问清手甲和制动指令的事。']],
    responseLines: { trust: '我让肥嘟嘟先说。他盯着奶霸手里的晶片，低声补了一句：“撞车前，有人喊过停车。”奶霸没有反驳。', question: '“制动指令是你下的？”我问。奶霸看了一眼手甲上熄掉的宝石：“是。车为什么会走那条路，你得去问另一个人。”' },
    approachLines: {
      chase: '我追过三条走廊，紫色背影却总在转角先一步消失。最后一面镜子里是事故现场，时间码偏偏跳过了撞击前的一秒。',
      restore: '我把镜片按时间码排开。奶霸出现在车祸现场；制动指令比撞击早了一秒。我又重新排了一遍，结果没变。',
      comfort: '我先去找墙里的声音。肥嘟嘟隔着镜子认出了我，才肯看桌上的三段记忆。看到车祸画面时，他又把脸转开了。',
    },
    core: [
      ['肥嘟嘟', '我看见他了。车灯照着他的手甲，他就站在路边。我倒下去的时候，还听见刹车声……可那声音好像是先响的。'],
      ['旁白', '三段影像叠在镜心上：紫色手甲、偏转的车轮、制动记录。记录比撞击早一秒；那一秒的画面却始终是空白。'],
      ['旁白', '冰面又亮了一次。雨把路标打得模糊，副驾驶座上滚着一只摔破的药瓶。有人从镜子另一面敲了两下，画面停住。'],
      ['肥嘟嘟', '车里冷得要命。有人叫我，叫了两遍。我以为是他……不对，他的声音不是那样的。'],
      ['旁白', '肥嘟嘟不说了。我把手贴上冰面，另一边也传来掌心的温度。监护仪般的滴答声一快一慢，隔着墙响。'],
      ['旁白', '奶霸从侧门闯进来，手甲砸碎镜心，抽出一片冰蓝晶片。晶片拖着一根细线，线的另一头没入我胸口。他握住它，手甲上的一颗宝石熄了。'],
      ['奶霸', '别碰那根线。车祸的事，我会回答。但先离开这里。'],
      ['旁白', '碎镜映出他的手，抖得几乎握不住晶片。我伸手，他却退开一步，把晶片攥得更紧。'],
      ['肥嘟嘟', '等等。车里的那个声音……我听过。让我再想一想，别现在就把镜子关上。'],
      ['旁白', '奶霸站在出口旁，没再拦我。镜心碎了，地上的冰却没有化，空白的一秒仍卡在影像中间。'],
    ],
    ending: [
      ['旁白', '肥嘟嘟从镜后走出来，衣角还滴着水。他拉住我的袖子，又很快松开：“我刚才说的，有些我记不准。你会回来问我吗？”我点头。'],
      ['旁白', '病房里，奶蛙的手指又动了一下。这次我看得清清楚楚。窗外的雨停了，玻璃上却多出一段向下的楼梯。'],
      ['旁白', '失踪的日记页放在楼梯第一级。背面多了一行字：“刹车不是开始。去查下雨之前，谁改了那条路线。”'],
      ['旁白', '我把纸折进衣袋，回头看了奶霸一眼。他没有解释，也没有追上来。手甲上那颗熄掉的宝石，仍是黑的。'],
      ['旁白', "电梯屏亮起“三”。镜面里，肥嘟嘟叫住我：“下次你进去，还会回来吗？”我答会回来继续找线索。它点点头，还是没松开门框。镜子的另一边，香蕉猫把病房画面转向它，轻声说：“留在这儿也能帮上忙，奶豆会接好线路。”我按下按钮时，肥嘟嘟还在看那张病床。"],
    ],
    complete: '第二章 · 完', completeNote: '镜心碎了，那一秒还没找回来。', choose: '选择进入镜馆的方式', mapHint: '跟随地图的当前目标一路向北；取得物证后，继续前往下一间镜室。', skipToMap: '返回镜馆', voicePlay: '播放肥嘟嘟原声片段', voiceStop: '停止播放', voiceError: '音频暂时无法播放', characterVoicePlay: '播放奶霸声音', characterVoiceStop: '跳过声音', narratorVoicePlay: '播放旁白',
  },
  en: {
    back: 'Chapter details', chapter: 'Chapter two', title: 'The Culprit in the Ice', subtitle: 'Layer two · The Frozen Mirror Hall', next: 'Continue', enter: 'Enter the mirror hall', resume: 'Resume exploration', restart: 'Replay chapter two', restartConfirm: 'Restart chapter two? This chapter\'s clues and progress will be cleared.', fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', routes: 'Story map', routesTitle: 'Mirror hall story map', close: 'Close', locked: 'Not reached', visited: 'Reached', log: 'History', menu: 'Menu', routeHint: 'Select a reached node to revisit that part of the story.',
    map: 'Explore the hall', clues: 'Clues', clueNames: { footage: 'Broken footage', shard: 'Blue crystal', echo: 'The sealed voice', note: 'Entrance note', routeOne: 'First route', route: 'Second route' },
    hospital: [
      ['Narration', "Naiwa’s heartbeat had steadied after the fairground. An orange cat in a yellow banana shell swiped the ward door open. “Banana Cat. Ask me about cameras and doors.” Beside the bed, a yellow woman with a dark bob reconnected a pump tube. “Naidou. I handle equipment and records. Do not unplug anything yourself.” A golden cow with purple spotted horns held up a clipboard at the door. “Niulai. Before changing wards, check the vehicle and destination with me.” The nurse tucked Naiwa in. I took their separate tasks for an ordinary shift handover."],
      ['Narration', 'At 2:17 a.m., the monitor beeped three times. Naiwa\'s fingers curled. The journal flipped open by itself, and ink seeped into the page: Layer Two. Don\'t trust the first mirror.'],
      ['Narration', 'I went to the duty desk for the footage. The cat turned its screen toward me. “Call me Banana Cat. I handle cameras and doors on this floor. Ask the nurse about patient care.” It opened the 2:17 recording: a purple figure took the journal page, his gauntlet flashing. The picture broke up as he turned. Three rewinds, the same gap.'],
      ['Naiba', 'Give me that page. You\'ve brought back one fragment already. Don\'t go in again.'],
      ['Narration', 'I ran after him. The fire door slammed shut in my face, trapping a frosted corner of paper. Behind me, the monitor sped up. Through the wall, someone spoke in Naiwa\'s voice: “He wasn\'t the only one there.”'],
      ['Narration', "The nurse said the floor had lost power. I showed her the footage: every room stayed lit. She passed the equipment record to Naidou, who pinned a row with a charcoal finger. “Only a power changeover. No need to move the bed.” Yet Niulai had signed a call for the cold-storage lift, and Banana Cat switched the screen back to the corridor. All three times read 2:17. I asked what the lift had carried. Niulai folded the form away. “Check on Naiwa first.”"],
      ['Narration', 'Half a blue fingerprint marked the scrap of paper. Beneath it was an address: Layer Two, Frozen Mirror Hall. The rest was missing. The tear looked fresh.'],
      ['Narration', 'Cold air slid up my sleeves as the elevator opened. I looked back. Naiwa was still asleep, clutching a chip of ice. The sheet was wet around its hand.'],
    ],
    threshold: [
      ['Narration', 'The elevator stopped with a dash on its display. Ice spread across the tiles outside. When I looked up, I saw another corridor hanging upside down in the glass ceiling.'],
      ['Narration', 'Three mirrors stood at the entrance. The me on the left chased a figure in purple. The one in the middle picked up shards of glass. On the right, I had my ear against a wall, listening to someone breathe.'],
      ['Narration', 'Each reflection led farther into the hall. I touched the glass and pulled my hand away from the cold. “Don\'t trust him,” the wall said again. This time the last word cut off.'],
      ['Narration', 'The lights stayed on for three seconds, off for two. While they were on, I counted scratches on the wall and wet footprints below. In the dark, one more print appeared.'],
      ['Narration', 'The central mirror was locked. Three slots in its frame were empty. At the first turn, I found a wet note with directions written along the folds.'],
    ],
    approaches: [
      ['Follow the purple figure', 'He just turned into the left-hand mirror.'],
      ['Collect the mirror pieces', 'Each piece has a different timestamp.'],
      ['Find the voice in the wall', 'Whoever is inside is still breathing.'],
    ],
    responses: [['Let Fat Dudu finish', 'He still remembers a voice from the crash.'], ['Question Naiba', 'Ask about the gauntlet and the braking command.']],
    responseLines: { trust: 'I let Fat Dudu finish. Still watching the crystal in Naiba\'s hand, he added, “Someone yelled stop before the crash.” Naiba didn\'t deny it.', question: '“Did you send the braking command?” I asked. Naiba looked down at the dark jewel on his gauntlet. “Yes. Ask someone else why the car took that road.”' },
    approachLines: {
      chase: 'I chased the purple coat down three corridors. It vanished at every turn. The last mirror showed the crash, but its timestamp jumped over the second before impact.',
      restore: 'I sorted the shards by timestamp. Naiba was at the scene, and the brake command came a second before impact. I rearranged the pieces to check. Same result.',
      comfort: 'I followed the voice first. Fat Dudu recognized me through the glass and finally looked at the three memories on the table. When the crash appeared, he turned away.',
    },
    core: [
      ['Fat Dudu', 'I saw him. His gauntlet was in the headlights. He was standing right there when I fell. But the brakes… I think I heard them first.'],
      ['Narration', 'I laid all three recordings over the mirror: the purple gauntlet, the turning wheels, the brake log. The command came a second before impact. The footage for that second was blank.'],
      ['Narration', 'The ice lit up again. Rain blurred the road signs. A broken medicine bottle rolled on the passenger seat. Two knocks came from the other side of the glass, and the picture froze.'],
      ['Fat Dudu', 'The car was freezing. Someone called my name twice. I thought it was him… No. His voice doesn\'t sound like that.'],
      ['Narration', 'Fat Dudu stopped talking. I put my palm against the ice and felt the warmth of a hand on the other side. Through the wall came two monitor-like beats, one fast and one slow.'],
      ['Narration', 'Naiba burst through a side door, smashed the central mirror, and pulled out a blue crystal. A fine thread trailed from it into my chest. When he gripped the crystal, a jewel on his gauntlet went dark.'],
      ['Naiba', 'Don\'t touch that thread. I\'ll answer your questions about the crash. Get out of here first.'],
      ['Narration', 'The broken glass caught his reflection. His hand shook so badly he could barely hold the crystal. I reached toward him. He stepped back and clenched it tighter.'],
      ['Fat Dudu', 'Wait. That voice in the car… I\'ve heard it before. Give me a minute. Don\'t close the mirror yet.'],
      ['Narration', 'Naiba stood by the exit without blocking me. The central mirror was broken. The floor was still frozen, and that second of footage was still missing.'],
    ],
    ending: [
      ['Narration', 'Fat Dudu stepped out from behind the glass with water dripping from his sleeves. He caught my sleeve, then let go. “I\'m not sure I remember all of it right. Will you come back and ask me?” I nodded.'],
      ['Narration', 'Back in the ward, Naiwa\'s finger moved again. I watched it happen this time. The rain had stopped, but a stairway now showed in the window\'s reflection.'],
      ['Narration', 'The missing journal page lay on the first step. On its back, someone had written: “The brakes weren\'t the beginning. Find out who changed the route before the rain.”'],
      ['Narration', 'I folded the page into my pocket and looked back at Naiba. He didn\'t explain or follow me. The jewel that had gone dark on his gauntlet was still black.'],
      ['Narration', "The elevator display lit up with 3. Fat Dudu stopped me in the mirror. “If you go in again, will you come back?” I said I would return to keep looking for clues. It nodded but kept hold of the door frame. On the other side, Banana Cat turned the ward feed toward it. “You can help by staying here too. Naidou will connect the lines.” When I pressed the button, Fat Dudu was still watching the bed."],
    ],
    complete: 'Chapter two · End', completeNote: 'The central mirror is broken. One second of footage is still missing.', choose: 'Choose your way into the hall', mapHint: 'Follow the current map target north. Each recovered exhibit leads to the next chamber.', skipToMap: 'Return to the hall', voicePlay: 'Play Fat Dudu voice clip', voiceStop: 'Stop audio', voiceError: 'Audio is unavailable', characterVoicePlay: 'Play Naiba voice', characterVoiceStop: 'Skip voice', narratorVoicePlay: 'Play narration',
  },
} as const

const fragmentStories = {
  zh: {
    footage: { title: '被剪掉的一秒', art: ['chapter-02-cg-film-fragment', 'chapter-02-cg-feidudu-afraid-close', 'chapter-02-cg-film-fragment', 'chapter-02-cg-film-fragment'], lines: [
      ['旁白', '胶片离开冰面，雨点在画格里倒着往上走。时间码停在两点十七分；跳过一格，人影已经跑进车道。'],
      ['肥嘟嘟', '我一直记得那盏红灯。你看，撞上去之前它灭了。为什么我一点印象都没有？'],
      ['旁白', '我把胶片对着灯叠起来。手甲亮起之前，车轮已经偏转；两帧之间少了一秒。'],
      ['旁白', '胶片边缘压着两道声纹，窄得几乎看不见。我拍下照片，留着跟别的线索对照。'],
    ] },
    shard: { title: '镜片背面的人', art: ['chapter-02-cg-mirror-hair-close', 'chapter-02-gauntlet', 'chapter-02-cg-feidudu-afraid-close', 'chapter-02-cg-mirror-hair-close'], lines: [
      ['旁白', '镜片正面映出空走廊。背面的银层上粘着一根黑发，没有结霜，摸上去还是温的。'],
      ['旁白', '镜中闪过车门。奶霸的手甲抓住门把，却没抓住门后伸来的手。玻璃突然从中间裂开。'],
      ['肥嘟嘟', '我记得他站在那儿。再往前想，镜子就跳回撞上的那一刻。我试过很多次。'],
      ['旁白', '裂缝左边的时间码比右边早了三秒。我把镜片转来转去，也对不齐。'],
    ] },
    echo: { title: '没有回声的心跳', art: ['chapter-02-cg-echo-record-close', 'chapter-02-cg-feidudu-recalls-close', 'chapter-02-cg-echo-record-close', 'chapter-02-ice-hall'], lines: [
      ['旁白', '我把蜡片贴近耳朵。两下心跳，一前一后；第二下撞上镜墙，什么回声也没有。'],
      ['肥嘟嘟', '“别信他”……等一下。先说这句话的是谁？我听着像我自己。'],
      ['旁白', '我又听了一遍。“别信他”三个字重在一起，后面的呼吸却分成两道。'],
      ['旁白', '我收起蜡片。录音在这里断了；也许镜心还留着后半句。'],
    ] },
  },
  en: {
    footage: { title: 'The Missing Second', art: ['chapter-02-cg-film-fragment', 'chapter-02-cg-feidudu-afraid-close', 'chapter-02-cg-film-fragment', 'chapter-02-cg-film-fragment'], lines: [
      ['Narration', 'I lifted the film from the ice. Rain ran upward in the frames. The timecode read 2:17; one frame later, a figure was already in the road.'],
      ['Fat Dudu', 'That light was red. Look, it goes out before the crash. Why don\'t I remember that?'],
      ['Narration', 'I held the frames against the light. The wheels had turned before the gauntlet flashed. There was a missing second between them.'],
      ['Narration', 'Two thin sound tracks ran along the edge of the film. I photographed them to compare with the other clues.'],
    ] },
    shard: { title: 'The Other Side of the Glass', art: ['chapter-02-cg-mirror-hair-close', 'chapter-02-gauntlet', 'chapter-02-cg-feidudu-afraid-close', 'chapter-02-cg-mirror-hair-close'], lines: [
      ['Narration', 'The front of the lens reflected an empty corridor. A dark hair clung to the silver on the back. It felt warm against my finger.'],
      ['Narration', 'The car door flashed in the glass. Naiba\'s gauntlet caught the handle, but missed the hand reaching from inside. The lens split down the middle.'],
      ['Fat Dudu', 'I remember him standing there. Every time I try to look earlier, the mirror skips back to the impact. I\'ve tried.'],
      ['Narration', 'The timecodes on either side of the crack were three seconds apart. I turned the lens over, but they still didn\'t match.'],
    ] },
    echo: { title: 'A Heartbeat Without an Echo', art: ['chapter-02-cg-echo-record-close', 'chapter-02-cg-feidudu-recalls-close', 'chapter-02-cg-echo-record-close', 'chapter-02-ice-hall'], lines: [
      ['Narration', 'I held the wax record to my ear and heard two heartbeats in turn. The second sounded against the mirror wall, with no echo.'],
      ['Fat Dudu', '“Don\'t trust him”… Wait. Who said it first? That sounds like me.'],
      ['Narration', 'I played it again. The voices said the words in perfect unison, but took their next breaths at different times.'],
      ['Narration', 'I pocketed the record. The voice cut off there. Maybe the central mirror held the rest.'],
    ] },
  },
} as const

export function mountChapterTwo(root: HTMLElement, initialLanguage: Language, onBack: (language: Language) => void, onLanguageChange?: (language: Language) => void) {
  let language = initialLanguage
  let save = load()
  let progress = loadProgress(save)
  let disposed = false
  let panelDialog: HTMLDialogElement | null = null
  let mapController: ReturnType<typeof mountPoolIceWorld> | null = null
  let mouseVoice: HTMLAudioElement | null = null
  let characterVoice: HTMLAudioElement | null = null
  let panelOpen = false
  let storageAvailable = true
  let playbackMode: 'off' | 'auto' | 'skip' = 'off'
  let playbackTimer: number | null = null
  let readingNotice = ''
  let resumeMouse = false, resumeCharacter = false
  const reader = createDialogueReader()
  const tr = (zh: string, en: string) => language === 'zh' ? zh : en
  const clearPlaybackTimer = () => { if (playbackTimer !== null) window.clearTimeout(playbackTimer); playbackTimer = null }
  const readingKey = () => `${save.phase}/${save.line}/${save.approach ?? ''}/${save.response ?? ''}/${save.pendingFragment?.id ?? ''}/${save.pendingFragment?.line ?? ''}/${language}`
  const syncPauseState = () => {
    const blocked = document.hidden || panelOpen || !!root.querySelector('dialog[open]')
    if (blocked) reader.pause()
    else reader.resume()
    mapController?.setStoryPaused(blocked || !!save.pendingFragment)
  }
  const toolsMarkup = () => `<nav class="ice-reading-tools" aria-label="${tr('阅读工具', 'Reading tools')}"><button type="button" id="ice-save">${tr('存档／读档', 'Save / Load')}</button><button type="button" id="ice-auto" aria-pressed="${playbackMode === 'auto'}">${tr('自动', 'Auto')}</button><button type="button" id="ice-skip" aria-pressed="${playbackMode === 'skip'}">${tr('快进', 'Skip')}</button><button type="button" id="ice-settings">${tr('设置', 'Settings')}</button><button type="button" id="ice-gallery">${tr('图鉴', 'Gallery')}</button><span class="ice-reading-status" role="status">${readingNotice}</span></nav>`
  function updateReadingTools() {
    for (const [id, label] of [['save', tr('存档／读档', 'Save / Load')], ['auto', tr('自动', 'Auto')], ['skip', tr('快进', 'Skip')], ['settings', tr('设置', 'Settings')], ['gallery', tr('图鉴', 'Gallery')]]) {
      const button = root.querySelector<HTMLButtonElement>(`#ice-${id}`)
      if (button) { button.textContent = label; if (id === 'auto' || id === 'skip') button.setAttribute('aria-pressed', String(playbackMode === id)) }
    }
    const notice = root.querySelector('.ice-reading-status')
    if (notice) notice.textContent = readingNotice
  }
  function canAutoAdvance() {
    if (save.pendingFragment) return true
    if (save.phase === 'map') return false
    const lines = copy[language][save.phase]
    return !((save.phase === 'threshold' || save.phase === 'core' || save.phase === 'ending') && save.line === lines.length - 1)
  }
  function refreshPlayback() {
    clearPlaybackTimer()
    if (disposed || playbackMode === 'off' || panelOpen || root.querySelector('dialog[open]') || document.hidden) return
    if (!canAutoAdvance()) { playbackMode = 'off'; updateReadingTools(); return }
    const expected = readingKey()
    const text = save.pendingFragment ? fragmentStories[language][save.pendingFragment.id].lines[save.pendingFragment.line][1] : resolveIceDialogue(copy[language], { ...save, phase: save.phase as Exclude<Phase, 'map'> }).text
    const check = () => {
      playbackTimer = null
      if (disposed || expected !== readingKey() || playbackMode === 'off' || panelOpen || root.querySelector('dialog[open]') || document.hidden) return
      if (playbackMode === 'auto' && (!reader.complete || (mouseVoice && !mouseVoice.paused) || (characterVoice && !characterVoice.paused))) {
        playbackTimer = window.setTimeout(check, 150); return
      }
      root.querySelector<HTMLButtonElement>('#ice-fragment-next, #ice-next')?.click()
    }
    if (playbackMode === 'skip') reader.finish()
    const speed = getReadingSettings().textSpeed
    playbackTimer = window.setTimeout(check, playbackMode === 'skip' ? 220 : readingDelay(text) + (speed ? Array.from(text).length / speed * 1000 : 0))
  }
  function setPlayback(mode: 'auto' | 'skip') {
    playbackMode = playbackMode === mode ? 'off' : mode
    readingNotice = save.phase === 'map' && !save.pendingFragment ? tr('探索由你操作；自动和快进用于剧情与碎片回忆。', 'Explore manually; Auto and Skip apply to dialogue and fragment memories.') : ''
    if (playbackMode === 'skip') { stopVoice(); stopCharacterVoice(); reader.finish() }
    updateReadingTools(); refreshPlayback()
  }
  function stopPlayback() { playbackMode = 'off'; clearPlaybackTimer(); reader.clear(); updateReadingTools() }
  const unsubscribeSettings = onReadingSettingsChange(() => {
    reader.finish()
    const volume = getReadingSettings().voiceVolume
    if (mouseVoice) mouseVoice.volume = volume
    if (characterVoice) characterVoice.volume = volume
    refreshPlayback()
  })
  let visibilityMouse = false, visibilityCharacter = false
  function resumePanelAudio() {
    if (disposed) return
    if (document.hidden) {
      visibilityMouse = visibilityMouse || resumeMouse; visibilityCharacter = visibilityCharacter || resumeCharacter
      resumeMouse = false; resumeCharacter = false
      return
    }
    if (panelOpen || root.querySelector('dialog[open]')) return
    if (browserStorage.getItem('naiwa-audio-enabled-v1') !== 'false' && playbackMode !== 'skip') {
      if (resumeMouse) void mouseVoice?.play().catch(() => {})
      if (resumeCharacter) void characterVoice?.play().catch(() => {})
    }
    resumeMouse = false; resumeCharacter = false
  }
  const visibilityChanged = () => {
    if (document.hidden) {
      visibilityMouse = visibilityMouse || (!!mouseVoice && !mouseVoice.paused); visibilityCharacter = visibilityCharacter || (!!characterVoice && !characterVoice.paused)
      clearPlaybackTimer(); reader.pause(); mouseVoice?.pause(); characterVoice?.pause()
    } else if (!panelOpen && !root.querySelector('dialog[open]')) {
      if (browserStorage.getItem('naiwa-audio-enabled-v1') !== 'false' && playbackMode !== 'skip') {
        if (visibilityMouse) void mouseVoice?.play().catch(() => {})
        if (visibilityCharacter) void characterVoice?.play().catch(() => {})
      }
      visibilityMouse = false; visibilityCharacter = false
      resumePanelAudio(); refreshPlayback()
    }
    syncPauseState()
  }
  const dialogClosed = () => { if (!disposed) { resumePanelAudio(); syncPauseState(); refreshPlayback() } }
  root.ownerDocument.addEventListener('visibilitychange', visibilityChanged)
  root.addEventListener('close', dialogClosed, true)
  const persist = (arrival = false) => {
    recordIceCheckpoint(progress, save, undefined, arrival)
    const saved = browserStorage.setItem(KEY, JSON.stringify(save))
    const progressSaved = browserStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
    storageAvailable = saved && progressSaved
    updateStorageStatus()
  }
  function updateStorageStatus() {
    const status = root.querySelector<HTMLElement>('#ice-save-status')
    if (status) {
      status.hidden = storageAvailable
      status.textContent = language === 'zh' ? '仅本次会话保存 · 请保持页面打开' : 'Session only · Keep this page open'
    }
  }
  function updateMapCopy() {
    const t = copy[language]
    const labels: Record<string, string> = {
      '#ice-back': `← ${t.back}`, '#ice-restart': t.restart, '#ice-log': t.log,
      '#ice-routes': `⌘ ${t.routes}`, '#ice-menu': t.menu, '#ice-language': language === 'zh' ? 'EN' : 'ZH',
      '.ice-top > span:first-of-type': `NAIWA ✦ ${t.chapter}`, '.ice-heading > span': `${t.chapter.toUpperCase()} / 02`,
      '.ice-heading h1': t.title, '.ice-heading p': t.subtitle, '.ice-map-foot > span': t.mapHint,
      '.ice-map-foot strong': `${t.clues} ${save.clues.length}/6`,
      '.ice-memory-replays summary': language === 'zh' ? '回看碎片记忆' : 'Replay memories',
    }
    for (const [selector, text] of Object.entries(labels)) {
      const element = root.querySelector(selector)
      if (element) element.textContent = text
    }
    root.querySelectorAll<HTMLButtonElement>('[data-replay-fragment]').forEach(button => { button.textContent = t.clueNames[button.dataset.replayFragment as FragmentId] })
    updateFullscreenLabel()
    updateStorageStatus()
    updateReadingTools()
  }
  const clearMap = () => { mapController?.dispose(); mapController = null }
  const stopVoice = () => { resumeMouse = false; visibilityMouse = false; if (mouseVoice) { mouseVoice.pause(); mouseVoice.onended = null; mouseVoice.currentTime = 0; mouseVoice = null } }
  const stopCharacterVoice = () => { resumeCharacter = false; visibilityCharacter = false; characterVoice?.pause(); if (characterVoice) { characterVoice.removeAttribute('src'); characterVoice.load() }; characterVoice = null }
  const updateFullscreenLabel = () => {
    const button = root.querySelector<HTMLButtonElement>('#ice-fullscreen')
    if (button) { button.textContent = isAppFullscreen(root) ? copy[language].exitFullscreen : copy[language].fullscreen; button.setAttribute('aria-pressed', String(isAppFullscreen(root))) }
  }
  const keydown = (event: KeyboardEvent) => {
    if (disposed || panelOpen || root.querySelector('dialog[open]') || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
    if ((event.target as HTMLElement)?.closest('button, input, select, textarea, a, [contenteditable=true]')) return
    if (event.key !== ' ' && event.key !== 'Enter') return
    const next = root.querySelector<HTMLButtonElement>('#ice-fragment-next, #ice-next')
    if (next) { event.preventDefault(); next.click() }
  }
  root.ownerDocument.addEventListener('keydown', keydown)
  root.ownerDocument.addEventListener('fullscreenchange', updateFullscreenLabel)
  window.addEventListener('appimmersivechange', updateFullscreenLabel)
  function renderFragment() {
    root.querySelector('#ice-fragment-layer')?.remove()
    const pending = save.pendingFragment
    if (!pending) { reader.clear(); syncPauseState(); refreshPlayback(); return }
    const story = fragmentStories[language][pending.id]
    const index = Math.min(pending.line, story.lines.length - 1)
    const [speaker, text] = story.lines[index]
    const isLast = index === story.lines.length - 1
    const label = language === 'zh' ? '碎片记忆' : 'FRAGMENT MEMORY'
    root.querySelector('.ice-layout')?.insertAdjacentHTML('beforeend', `<section class="ice-fragment-layer" id="ice-fragment-layer" role="dialog" aria-modal="true" aria-label="${label}：${story.title}" style="--fragment-art:url('/images/${story.art[index]}.webp')"><div class="ice-fragment-art" aria-hidden="true"></div><div class="ice-fragment-top"><span>${label} / ${String(fragmentIds.indexOf(pending.id) + 1).padStart(2, '0')}</span><strong>${story.title}</strong><em>${String(index + 1).padStart(2, '0')} / ${String(story.lines.length).padStart(2, '0')}</em></div><div class="ice-fragment-dialogue"><span class="ice-fragment-speaker">${speaker}</span><p>${text}</p><button id="ice-fragment-next" type="button">${isLast ? language === 'zh' ? '收起记忆 · 返回镜馆' : 'Keep memory · Return to hall' : language === 'zh' ? '继续回忆' : 'Continue memory'} <span>↗</span></button></div></section>`)
    syncPauseState()
    reader.bind(root.querySelector('.ice-fragment-dialogue > p'), readingKey(), text)
    root.querySelector<HTMLButtonElement>('#ice-fragment-next')?.addEventListener('click', () => {
      if (!save.pendingFragment || panelOpen || root.querySelector('dialog[open]')) return
      if (playbackMode !== 'skip' && reader.finish()) { refreshPlayback(); return }
      if (index < story.lines.length - 1) save.pendingFragment.line = index + 1
      else save.pendingFragment = null
      persist()
      renderFragment()
    })
    mapController?.setStoryPaused(true)
    if (!panelOpen) root.querySelector<HTMLButtonElement>('#ice-fragment-next')?.focus()
    refreshPlayback()
  }
  function render() {
    if (disposed) return
    clearPlaybackTimer()
    if (panelDialog?.open) panelDialog.close()
    panelDialog?.remove(); panelDialog = null
    panelOpen = false
    syncPauseState()
    if (save.phase === 'map' && mapController && root.querySelector('#ice-world')) {
      mapController.setLanguage(language)
      updateMapCopy()
      if (save.pendingFragment) renderFragment()
      else { reader.clear(); syncPauseState(); refreshPlayback() }
      return
    }
    clearMap()
    stopVoice()
    stopCharacterVoice()
    panelOpen = false
    const t = copy[language]
    const isMap = save.phase === 'map'
    const lines = isMap ? [] : t[save.phase]
    const line = lines?.[Math.min(save.line, Math.max(0, lines.length - 1))]
    if (!isMap && line) {
      const entry = { phase: save.phase as Exclude<Phase, 'map'>, line: save.line, approach: save.approach, response: save.response ?? null }
      const last = save.history.at(-1)
      if (!last || last.phase !== entry.phase || last.line !== entry.line) { save.history.push(entry); save.history = save.history.slice(-100); persist() }
    }
    const dialogue = isMap ? null : resolveIceDialogue(t, { phase: save.phase as Exclude<Phase, 'map'>, line: save.line, approach: save.approach, response: save.response })
    const lineText = dialogue?.text ?? ''
    const audioEnabled = playbackMode !== 'skip' && browserStorage.getItem('naiwa-audio-enabled-v1') !== 'false'
    const showVoice = audioEnabled && save.phase === 'core' && (save.line === 0 || save.line === 8)
    const showCharacterVoice = line?.[0] === '奶霸' || line?.[0] === 'Naiba'
    const showNarrationVoice = line?.[0] === '旁白' || line?.[0] === 'Narration'
    const showSpokenVoice = audioEnabled && (showCharacterVoice || showNarrationVoice)
    const artByPhase: Record<Phase, string[]> = {
      hospital: ['chapter-02-cg-ward-handover', 'chapter-02-journal', 'chapter-02-cg-monitor-attendant', 'chapter-02-hospital', 'chapter-02-cg-door-note', 'chapter-02-cg-ward-handover', 'chapter-02-cg-door-note', 'chapter-02-elevator'],
      threshold: ['chapter-02-elevator', 'chapter-02-cg-three-mirrors', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-three-mirrors', 'chapter-02-ice-hall'],
      core: ['chapter-02-cg-feidudu-afraid-close', 'chapter-02-cg-film-fragment', 'chapter-02-cg-medicine-memory', 'chapter-02-cg-feidudu-afraid-close', 'chapter-02-cg-shared-palm', 'chapter-02-cg-dark-jewel', 'chapter-02-cg-naiba-warning-close', 'chapter-02-cg-gauntlet-tremor-close', 'chapter-02-cg-feidudu-recalls-close', 'chapter-02-cg-shattered-mirror'],
      ending: ['chapter-02-cg-naishu-emerges', 'chapter-02-hospital', 'chapter-02-journal', 'chapter-02-cg-gauntlet-tremor-close', 'chapter-02-elevator'],
      map: [],
    }
    const showStaff = false // The new hospital CGs contain the staff; do not duplicate their portraits.
    const art = isMap ? 'chapter-02-ice-hall' : artByPhase[save.phase][Math.min(save.line, artByPhase[save.phase].length - 1)]
    root.innerHTML = `<div data-dialogue-theme="ice" class="chapter-two ${isMap ? 'is-map' : ''}"><div class="ice-toolbar-wrapper"><header class="ice-top"><button class="ice-back" id="ice-back" type="button">← ${t.back}</button><span>NAIWA <i>✦</i> ${t.chapter}</span><div class="ice-top-tools"><button class="ice-restart" id="ice-restart" type="button">${t.restart}</button><button class="ice-top-action" id="ice-log" type="button">${t.log}</button><button class="ice-top-action" id="ice-routes" type="button">⌘ ${t.routes}</button><button class="ice-top-action" id="ice-menu" type="button">${t.menu}</button><button class="ice-top-action ice-fullscreen" id="ice-fullscreen" type="button" aria-pressed="${isAppFullscreen(root)}">${isAppFullscreen(root) ? t.exitFullscreen : t.fullscreen}</button><button class="ice-language" id="ice-language" type="button">${language === 'zh' ? 'EN' : 'ZH'}</button></div><span id="ice-save-status" class="ice-save-status" role="status" ${storageAvailable ? 'hidden' : ''}>${language === 'zh' ? '仅本次会话保存 · 请保持页面打开' : 'Session only · Keep this page open'}</span></header>${toolsMarkup()}</div><main class="ice-layout"><div class="ice-heading"><span>${t.chapter.toUpperCase()} / 02</span><h1>${t.title}</h1><p>${t.subtitle}</p></div>${isMap ? `<div class="ice-world" id="ice-world"></div><div class="ice-map-foot"><span>${t.mapHint}</span><strong>${t.clues} ${save.clues.length}/6</strong></div>` : `<section class="ice-narrative" style="--ice-art:url('/images/${art}.webp')"><div class="ice-atmosphere" aria-hidden="true"></div>${showStaff ? `<img class="ice-staff" src="/images/finale-banana-cat.webp" width="1024" height="1536" alt="${language === 'zh' ? '值班工作人员香蕉猫' : 'Banana Cat, the duty desk attendant'}" draggable="false">` : ''}<div class="ice-copy"><div class="ice-index">${String(save.line + 1).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}</div><div class="ice-speaker">${line?.[0] ?? ''}</div><p>${lineText}</p>${showVoice ? `<button class="ice-voice" id="ice-voice" type="button">♪ ${t.voicePlay}</button>` : ''}${showSpokenVoice ? `<button class="ice-voice" id="ice-character-voice" type="button">♪ ${t.characterVoiceStop}</button>` : ''}${save.phase === 'threshold' && save.line === lines.length - 1 ? `<div class="ice-approaches" role="group" aria-label="${t.choose}">${t.approaches.map(([name, description], i) => `<button data-approach="${i}" type="button"><strong>${String(i + 1).padStart(2, '0')} · ${name}</strong><small>${description}</small></button>`).join('')}</div>` : save.phase === 'core' && save.line === lines.length - 1 ? `<div class="ice-approaches ice-response-options" role="group" aria-label="${t.choose}">${t.responses.map(([name, description], i) => `<button data-response="${i}" type="button"><strong>${String(i + 1).padStart(2, '0')} · ${name}</strong><small>${description}</small></button>`).join('')}</div>` : save.phase === 'ending' && save.line === lines.length - 1 ? `<div class="ice-end"><strong>${t.complete}</strong><span>${t.completeNote}</span><button id="ice-finish" type="button">${t.back} →</button></div>` : `<button class="ice-next" id="ice-next" type="button">${save.phase === 'threshold' ? t.enter : t.next} <span>↗</span></button>`}</div></section>`}</main></div>`
    if (!isMap) reader.bind(root.querySelector('.ice-copy > p'), readingKey(), lineText)
    if (isMap) {
      root.querySelector('.ice-map-foot strong')?.insertAdjacentHTML('beforebegin', `<details class="ice-memory-replays"><summary>${language === 'zh' ? '回看碎片记忆' : 'Replay memories'}</summary><div>${fragmentIds.map(id => `<button type="button" data-replay-fragment="${id}" ${save.clues.includes(id) ? '' : 'disabled'}>${t.clueNames[id]}</button>`).join('')}</div></details>`)
      root.querySelectorAll<HTMLButtonElement>('[data-replay-fragment]').forEach(button => button.addEventListener('click', () => {
        const id = button.dataset.replayFragment as FragmentId
        if (!fragmentIds.includes(id) || !save.clues.includes(id)) return
        save.pendingFragment = { id, line: 0 }
        persist()
        mapController?.setStoryPaused(true)
        renderFragment()
      }))
    }
    if (showSpokenVoice) {
      const longLine = (lineText.match(/\p{Script=Han}/gu)?.length ?? 0) >= 20 || lineText.length >= 80
      const variant = dialogue?.variant
      const narrationUrl = `/audio/tts/narration-02-${save.phase}-${save.line}${variant ? `-${variant}` : ''}-${language}.mp3`
      const clips = showNarrationVoice ? [narrationUrl] : characterVoiceSequence(longLine)
      const playLabel = showNarrationVoice ? t.narratorVoicePlay : t.characterVoicePlay
      const audio = new Audio(clips[0])
      audio.volume = getReadingSettings().voiceVolume
      const button = root.querySelector<HTMLButtonElement>('#ice-character-voice')!
      let clipIndex = 0
      characterVoice = audio
      const play = () => {
        if (document.hidden) { visibilityCharacter = true; return }
        if (panelOpen || root.querySelector('dialog[open]')) { resumeCharacter = true; return }
        button.textContent = `♪ ${t.characterVoiceStop}`
        void audio.play().catch(() => { if (characterVoice === audio) button.textContent = t.voiceError })
      }
      audio.addEventListener('ended', () => {
        if (characterVoice !== audio) return
        if (clipIndex < clips.length - 1) { audio.src = clips[++clipIndex]; play() }
        else button.textContent = `♪ ${playLabel}`
      })
      button.addEventListener('click', () => {
        if (!audio.paused) {
          audio.pause()
          clipIndex = 0
          audio.src = clips[0]
          button.textContent = `♪ ${playLabel}`
        } else {
          if (audio.ended) { clipIndex = 0; audio.src = clips[0] }
          play()
        }
      })
      play()
    }
    const restartChapter = () => { stopPlayback(); stopVoice(); stopCharacterVoice(); clearMap(); save = blank(); persist(true); render() }
    const askRestart = () => confirmInApp(root, copy[language].restartConfirm, language, restartChapter)
    const closePanel = () => {
      const dialog = panelDialog
      panelDialog = null; panelOpen = false
      if (dialog?.open) dialog.close()
      dialog?.remove()
      resumePanelAudio(); syncPauseState(); refreshPlayback()
    }
    const openPanel = (kind: 'routes' | 'log' | 'menu' | 'saves' | 'settings' | 'gallery') => {
      const t = copy[language]
      if (panelOpen) closePanel()
      panelOpen = true
      clearPlaybackTimer(); reader.pause()
      resumeMouse = !!mouseVoice && !mouseVoice.paused; resumeCharacter = !!characterVoice && !characterVoice.paused
      mouseVoice?.pause(); characterVoice?.pause()
      mapController?.setStoryPaused(true)
      if (kind === 'routes') {
        const dialog = showIceStoryMap(root, language, save, progress, id => {
          if (!Object.hasOwn(progress.checkpoints, id)) return
          confirmInApp(root, routeConfirmation(language), language, () => {
            const restored = restartIceFrom(progress, id)
            if (!restored || disposed) return
            stopPlayback(); stopVoice(); stopCharacterVoice()
            resumeMouse = false; resumeCharacter = false; visibilityMouse = false; visibilityCharacter = false
            clearMap(); closePanel(); save = restored; persist(); render()
          })
        })
        panelDialog = dialog
        dialog.addEventListener('close', () => { if (panelDialog === dialog) { panelDialog = null; panelOpen = false; resumePanelAudio(); syncPauseState(); refreshPlayback() } }, { once: true })
        return
      }
      const title = kind === 'log' ? t.log : kind === 'saves' ? tr('存档／读档', 'Save / Load') : kind === 'settings' ? tr('设置', 'Settings') : kind === 'gallery' ? tr('图鉴', 'Gallery') : t.menu
      let content = kind === 'log'
        ? `<div class="ice-history-list">${save.history.length ? save.history.map(entry => { const item = resolveIceDialogue(t, entry); return item.text ? `<article><small>${t.chapter} · ${entry.phase}</small><strong>${item.speaker}</strong><p>${item.text}</p></article>` : '' }).join('') : `<p>${language === 'zh' ? '还没有可回顾的对话。' : 'No dialogue to review yet.'}</p>`}</div>`
        : `<div class="ice-panel-menu"><button type="button" data-panel-action="continue">${t.next}</button><button type="button" data-panel-action="log">${t.log}</button><button type="button" data-panel-action="routes">${t.routes}</button><button type="button" data-panel-action="saves">${tr('存档／读档', 'Save / Load')}</button><button type="button" data-panel-action="auto">${tr('自动', 'Auto')}</button><button type="button" data-panel-action="skip">${tr('快进', 'Skip')}</button><button type="button" data-panel-action="settings">${tr('设置', 'Settings')}</button><button type="button" data-panel-action="gallery">${tr('图鉴', 'Gallery')}</button><button type="button" data-panel-action="restart">${t.restart}</button><button type="button" data-panel-action="chapters">${t.back}</button></div>`
      if (kind === 'settings') content = `<label class="ice-settings-audio"><input id="ice-audio-enabled" type="checkbox" ${browserStorage.getItem('naiwa-audio-enabled-v1') !== 'false' ? 'checked' : ''}>${tr('开启对白声音', 'Enable dialogue audio')}</label>${renderReadingControls(language, 'ice')}`
      if (kind === 'saves') content = `<div class="ice-save-slots"><p>${tr('自动保存持续生效。手动存档独立保留，读档不会清除已解锁的图鉴与剧情树。', 'Autosave remains active. Manual slots are kept separately; loading preserves unlocked gallery and story-map entries.')}</p>${loadIceManualSaves().map((slot, index) => `<article class="ice-save-slot"><strong>${tr('存档', 'Slot')} ${index + 1}</strong><p>${slot ? `${copy[language].chapter} · ${({ hospital: tr('医院病房', 'Hospital ward'), threshold: tr('镜馆入口', 'Hall entrance'), map: tr('镜馆探索', 'Hall exploration'), core: tr('镜心对质', 'At the central mirror'), ending: tr('第二章结尾', 'Chapter ending') })[slot.state.phase]} · ${slot.state.pendingFragment ? `${t.clueNames[slot.state.pendingFragment.id]} ${slot.state.pendingFragment.line + 1}/4` : slot.state.line + 1} · ${slot.state.clues.length}/6<br>${new Date(slot.savedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}` : tr('空存档', 'Empty slot')}</p><div><button type="button" data-save-slot="${index}">${tr('保存到此处', 'Save here')}</button><button type="button" data-load-slot="${index}" ${slot ? '' : 'disabled'}>${tr('读取', 'Load')}</button></div></article>`).join('')}<p class="ice-slot-status" role="status">${readingNotice}</p></div>`
      if (kind === 'gallery') content = `<div class="ice-gallery-grid">${fragmentIds.map(id => { const unlocked = progress.visited.includes(id); return `<figure>${unlocked ? `<img src="/images/${fragmentStories[language][id].art[0]}.webp" alt="${fragmentStories[language][id].title}" loading="lazy">` : `<div class="ice-gallery-locked">???</div>`}<figcaption>${unlocked ? fragmentStories[language][id].title : tr('未解锁的碎片', 'Locked fragment')}</figcaption></figure>` }).join('')}${['ending-trust', 'ending-question'].map(id => { const unlocked = progress.endings.includes(id); return `<figure>${unlocked ? `<img src="/images/chapter-02-cg-naishu-emerges.webp" alt="${tr('镜后走来的人', 'Emerging from the mirror')}" loading="lazy">` : `<div class="ice-gallery-locked">???</div>`}<figcaption>${unlocked ? id === 'ending-trust' ? tr('先听他把话说完', 'Let him finish') : tr('追问制动指令', 'Ask about the braking command') : tr('未解锁的结局', 'Locked ending')}</figcaption></figure>` }).join('')}</div>`
      const focus = document.activeElement as HTMLElement | null
      const dialog = document.createElement('dialog')
      dialog.id = 'ice-routes-scrim'; dialog.className = 'app-dialog ice-routes-dialog'
      dialog.setAttribute('aria-labelledby', 'ice-routes-title')
      dialog.innerHTML = `<header><div><span>NAIWA / 02</span><h2 id="ice-routes-title">${title}</h2></div><button id="ice-routes-close" type="button" aria-label="${t.close}">×</button></header>${content}`
      root.append(dialog); panelDialog = dialog
      dialog.querySelector('#ice-routes-close')?.addEventListener('click', closePanel)
      dialog.addEventListener('close', () => {
        dialog.remove()
        if (panelDialog === dialog) { panelDialog = null; panelOpen = false; resumePanelAudio(); syncPauseState(); refreshPlayback() }
        if (!disposed && focus?.isConnected) focus.focus({ preventScroll: true })
      }, { once: true })
      dialog.addEventListener('click', event => { if (event.target !== dialog) return; const b = dialog.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close() })
      dialog.showModal()
      bindPanelTools()
      root.querySelectorAll<HTMLButtonElement>('[data-panel-action]').forEach(button => button.addEventListener('click', () => {
        const action = button.dataset.panelAction
        if (action === 'continue') closePanel()
        else if (action === 'restart') { closePanel(); askRestart() }
        else if (action === 'chapters') { closePanel(); onBack(language) }
        else if (action === 'auto' || action === 'skip') { setPlayback(action); closePanel() }
        else if (action === 'routes' || action === 'log' || action === 'saves' || action === 'settings' || action === 'gallery') openPanel(action)
      }))
    }
    const bindPanelTools = () => {
      if (!panelDialog) return
      bindReadingControls(panelDialog, language, 'ice')
      panelDialog.querySelector<HTMLInputElement>('#ice-audio-enabled')?.addEventListener('change', event => {
        browserStorage.setItem('naiwa-audio-enabled-v1', String((event.target as HTMLInputElement).checked))
        if (!(event.target as HTMLInputElement).checked) { resumeMouse = false; resumeCharacter = false; stopVoice(); stopCharacterVoice() }
      })
      panelDialog.querySelectorAll<HTMLButtonElement>('[data-save-slot]').forEach(button => button.addEventListener('click', () => {
        const slot = Number(button.dataset.saveSlot)
        const write = () => { if (disposed) return; persist(); const saved = writeIceManualSave(slot, save); readingNotice = saved ? tr('存档已保存', 'Slot saved') : tr('仅本次会话保存 · 请保持页面打开', 'Session only · Keep this page open'); openPanel('saves') }
        if (loadIceManualSaves()[slot]) confirmInApp(root, tr('覆盖这个手动存档？', 'Overwrite this manual save?'), language, write)
        else write()
      }))
      panelDialog.querySelectorAll<HTMLButtonElement>('[data-load-slot]').forEach(button => button.addEventListener('click', () => {
        const slot = loadIceManualSaves()[Number(button.dataset.loadSlot)]
        if (!slot) return
        confirmInApp(root, tr('读取这个存档？当前进度会被替换，已解锁内容会保留。', 'Load this save? Replace current progress and keep unlocked entries.'), language, () => {
          if (disposed) return
          stopPlayback(); closePanel(); clearMap(); save = slot.state; progress = normalizeIceProgress(progress, save); persist(); readingNotice = tr('存档已读取', 'Save loaded'); render()
        })
      }))
    }
    root.querySelector('#ice-save')?.addEventListener('click', () => openPanel('saves'))
    root.querySelector('#ice-settings')?.addEventListener('click', () => openPanel('settings'))
    root.querySelector('#ice-gallery')?.addEventListener('click', () => openPanel('gallery'))
    root.querySelector('#ice-auto')?.addEventListener('click', () => setPlayback('auto'))
    root.querySelector('#ice-skip')?.addEventListener('click', () => setPlayback('skip'))
    root.querySelector('#ice-back')?.addEventListener('click', () => { stopVoice(); stopCharacterVoice(); clearMap(); onBack(language) })
    root.querySelector('#ice-restart')?.addEventListener('click', askRestart)
    root.querySelector('#ice-routes')?.addEventListener('click', () => openPanel('routes'))
    root.querySelector('#ice-log')?.addEventListener('click', () => openPanel('log'))
    root.querySelector('#ice-menu')?.addEventListener('click', () => openPanel('menu'))
    root.querySelector('#ice-fullscreen')?.addEventListener('click', async () => {
      const target = root.ownerDocument.getElementById('app') ?? root
      await toggleAppFullscreen(target)
      updateFullscreenLabel()
    })
    const mouseButton = root.querySelector<HTMLButtonElement>('#ice-voice')
    if (mouseButton) {
      const audio = new Audio('/audio/second-plane-mouse-line.m4a')
      audio.volume = getReadingSettings().voiceVolume
      audio.preload = 'auto'
      mouseVoice = audio
      audio.onended = () => { if (mouseVoice === audio) mouseButton.textContent = `♪ ${t.voicePlay}` }
      const play = async () => {
        if (document.hidden) { visibilityMouse = true; return }
        if (panelOpen || root.querySelector('dialog[open]')) { resumeMouse = true; return }
        try {
          await audio.play()
          if (mouseVoice === audio) mouseButton.textContent = `■ ${t.voiceStop}`
        } catch (error) {
          if (mouseVoice === audio) mouseButton.textContent = error instanceof DOMException && error.name === 'NotAllowedError' ? `♪ ${t.voicePlay}` : t.voiceError
        }
      }
      mouseButton.addEventListener('click', () => {
        if (!audio.paused) { audio.pause(); audio.currentTime = 0; mouseButton.textContent = `♪ ${t.voicePlay}` }
        else void play()
      })
      void play()
    }
    root.querySelector('#ice-language')?.addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'; onLanguageChange?.(language); render() })
    root.querySelector('#ice-next')?.addEventListener('click', () => {
      if (panelOpen || root.querySelector('dialog[open]')) return
      if (playbackMode !== 'skip' && reader.finish()) { refreshPlayback(); return }
      if (save.phase === 'map' || save.phase === 'threshold' && save.line === t.threshold.length - 1) return
      const previousPhase = save.phase
      if (save.line < lines.length - 1) save.line++
      else { save.phase = save.phase === 'hospital' ? 'threshold' : save.phase === 'core' ? 'ending' : 'ending'; save.line = 0 }
      if (save.phase === 'ending') save.completed = true
      persist(save.phase !== previousPhase); render()
    })
    root.querySelectorAll<HTMLButtonElement>('[data-approach]').forEach(button => button.addEventListener('click', () => {
      stopPlayback()
      save.approach = (['chase', 'restore', 'comfort'] as const)[Number(button.dataset.approach)]
      save.phase = 'map'; save.line = 0; recordIceCheckpoint(progress, save, save.approach!); persist(true); render()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-response]').forEach(button => button.addEventListener('click', () => {
      stopPlayback()
      save.response = (['trust', 'question'] as const)[Number(button.dataset.response)]
      save.phase = 'ending'; save.line = 0; save.completed = true; persist(true); render()
    }))
    root.querySelector('#ice-finish')?.addEventListener('click', () => { stopVoice(); onBack(language) })
    if (isMap) {
      mapController = mountPoolIceWorld(root.querySelector<HTMLElement>('#ice-world')!, {
        language, found: save.clues, storyPaused: document.hidden || !!save.pendingFragment,
        onClue: id => {
          if (save.clues.includes(id)) return
          save.clues.push(id)
          if (fragmentIds.includes(id as FragmentId)) save.pendingFragment = { id: id as FragmentId, line: 0 }
          recordIceCheckpoint(progress, save, id)
          persist()
          const counter = root.querySelector('.ice-map-foot strong')
          if (counter) counter.textContent = `${copy[language].clues} ${save.clues.length}/6`
          const replay = root.querySelector<HTMLButtonElement>(`[data-replay-fragment="${id}"]`)
          if (replay) replay.disabled = false
          if (save.pendingFragment) { mapController?.setStoryPaused(true); renderFragment() }
        },
        onCore: () => { if (!(['footage', 'shard', 'echo', 'route'] as IceClueId[]).every(id => save.clues.includes(id))) return; save.phase = 'core'; save.line = 0; persist(true); render() },
        onExit: () => { stopVoice(); onBack(language) },
      })
    }
    if (save.pendingFragment) renderFragment()
    syncPauseState()
    refreshPlayback()
  }
  persist()
  render()
  return { dispose() { disposed = true; stopPlayback(); unsubscribeSettings(); root.ownerDocument.removeEventListener('visibilitychange', visibilityChanged); root.removeEventListener('close', dialogClosed, true); if (panelDialog?.open) panelDialog.close(); panelDialog?.remove(); panelDialog = null; stopVoice(); stopCharacterVoice(); clearMap(); root.ownerDocument.removeEventListener('keydown', keydown); root.ownerDocument.removeEventListener('fullscreenchange', updateFullscreenLabel); window.removeEventListener('appimmersivechange', updateFullscreenLabel) }, setLanguage(next: Language) { if (next !== language) { language = next; render() } }, restart() { stopPlayback(); stopVoice(); stopCharacterVoice(); clearMap(); save = blank(); persist(true); render() } }
}

export function chapterTwoStatus() { const save = load(); return { started: save.phase !== 'hospital' || save.line > 0, completed: save.completed, clues: save.clues.length } }

export function resetChapterTwo() { browserStorage.setItem(KEY, JSON.stringify(blank())) }

export function previewChapterTwoRoutes(root: HTMLElement, language: Language, onPlay: () => void) {
  const save = load()
  const progress = loadProgress(save)
  const dialog = showIceStoryMap(root, language, save, progress, id => {
    if (!Object.hasOwn(progress.checkpoints, id)) return
    confirmInApp(root, routeConfirmation(language), language, () => {
      const restored = restartIceFrom(progress, id)
      if (!restored) return
      browserStorage.setItem(KEY, JSON.stringify(restored))
      browserStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
      dialog.close()
      onPlay()
    })
  })
  return dialog
}
