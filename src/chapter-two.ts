import './chapter-two.css'
import { mountPoolIceWorld, type IceClueId } from './pool-ice-world'
import type { Language } from './story'
import { characterVoiceSequence } from './character-voice'
import { isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'
import { confirmInApp } from './ui-confirm'
import { showChapterRoutePreview } from './chapter-route-preview'

type Phase = 'hospital' | 'threshold' | 'map' | 'core' | 'ending'
type FragmentId = 'footage' | 'shard' | 'echo'
type ChapterSave = { version: 1; phase: Phase; line: number; clues: IceClueId[]; approach: 'chase' | 'restore' | 'comfort' | null; response?: 'trust' | 'question' | null; completed: boolean; pendingFragment: { id: FragmentId; line: number } | null; history: { phase: Exclude<Phase, 'map'>; line: number }[] }
const KEY = 'naiwa-chapter-two-v1'
const clues: IceClueId[] = ['footage', 'shard', 'echo', 'note', 'routeOne', 'route']
const fragmentIds: FragmentId[] = ['footage', 'shard', 'echo']
const blank = (): ChapterSave => ({ version: 1, phase: 'hospital', line: 0, clues: [], approach: null, response: null, completed: false, pendingFragment: null, history: [] })
function load(): ChapterSave {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ChapterSave> | null
    if (!raw || raw.version !== 1 || !['hospital', 'threshold', 'map', 'core', 'ending'].includes(raw.phase ?? '')) return blank()
    const found = Array.isArray(raw.clues) ? clues.filter(id => raw.clues?.includes(id)) : []
    if (found.includes('route') && !found.includes('routeOne')) found.push('routeOne')
    const pending = raw.pendingFragment
    const pendingFragment = pending && fragmentIds.includes(pending.id) && found.includes(pending.id)
      ? { id: pending.id, line: Math.max(0, Number(pending.line) || 0) } : null
    const history = Array.isArray(raw.history) ? raw.history.filter((entry): entry is ChapterSave['history'][number] => !!entry && ['hospital', 'threshold', 'core', 'ending'].includes(entry.phase) && Number.isInteger(entry.line)).slice(-100) : []
    return { version: 1, phase: raw.phase!, line: Math.max(0, Number(raw.line) || 0), clues: found, approach: raw.approach === 'chase' || raw.approach === 'restore' || raw.approach === 'comfort' ? raw.approach : null, response: raw.response === 'trust' || raw.response === 'question' ? raw.response : null, completed: !!raw.completed, pendingFragment, history }
  } catch { return blank() }
}
const copy = {
  zh: {
    back: '章节详情', chapter: '第二章', title: '冰镜疑凶', subtitle: '第二层 · 冰封镜馆', next: '继续', enter: '进入冰封镜馆', resume: '继续探索', restart: '重玩第二章', restartConfirm: '重新开始第二章？本章线索和进度将被清除。', fullscreen: '进入全屏', exitFullscreen: '退出全屏', routes: '剧情树', routesTitle: '冰镜剧情树', close: '关闭', locked: '尚未抵达', visited: '已抵达', log: '回顾', menu: '菜单', routeHint: '点击已抵达的节点返回该段剧情。',
    map: '探索镜馆', clues: '探索记录', clueNames: { footage: '残缺监控', shard: '冰蓝晶片', echo: '被封住的声音', note: '入口便笺', routeOne: '第一段路线', route: '第二段路线' },
    hospital: [
      ['旁白', '从游乐园回来，奶蛙的心跳终于稳了一点。我在病床边睡着过一次，醒来时手还攥着他的被角。窗外的雨下了一整夜。'],
      ['旁白', '两点十七分，监护仪连响三声。奶蛙的手指缩了一下。床边的《奶蛙观察日记》自行翻页，纸上慢慢洇出一行字：第二层。别信第一面镜子。'],
      ['旁白', '我调出病房监控。一个紫色身影从日记里抽走那一页，右手的金属手甲闪了一下。就在他要回头时，画面花了。我倒回去三次，都是同一处。'],
      ['奶霸', '日记那页给我。你已经带回来一个了，别再进去。'],
      ['旁白', '我追出病房，防火门在面前砰地合上。门缝里卡着一角结霜的纸。身后的监护仪忽然加快；隔墙有人用奶蛙的声音说：“当时不止他一个人。”'],
      ['旁白', '护士说昨夜整层楼停过电。我指给她看监控：停电的那一分钟，每间病房的灯都亮着。她拿来维修单，冷藏电梯的呼叫记录上写着同一个时间。'],
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
      ['旁白', '电梯屏亮起“三”。奶蛙还没醒；镜面里，肥嘟嘟站在原处，看着我按下按钮。'],
    ],
    complete: '第二章 · 完', completeNote: '冰镜已融，真相仍藏在下一层。', choose: '选择进入镜馆的方式', mapHint: '跟随地图的当前目标一路向北；取得物证后，继续前往下一间镜室。', skipToMap: '返回镜馆', voicePlay: '播放肥嘟嘟原声片段', voiceStop: '停止播放', voiceError: '音频暂时无法播放', characterVoicePlay: '播放奶霸声音', characterVoiceStop: '跳过声音', narratorVoicePlay: '播放旁白',
  },
  en: {
    back: 'Chapter details', chapter: 'Chapter two', title: 'The Culprit in the Ice', subtitle: 'Layer two · The Frozen Mirror Hall', next: 'Continue', enter: 'Enter the mirror hall', resume: 'Resume exploration', restart: 'Replay chapter two', restartConfirm: 'Restart chapter two? This chapter\'s clues and progress will be cleared.', fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', routes: 'Story tree', routesTitle: 'Frozen mirror story tree', close: 'Close', locked: 'Not reached', visited: 'Reached', log: 'History', menu: 'Menu', routeHint: 'Select a reached node to revisit that part of the story.',
    map: 'Explore the hall', clues: 'Clues', clueNames: { footage: 'Broken footage', shard: 'Blue crystal', echo: 'The sealed voice', note: 'Entrance note', routeOne: 'First route', route: 'Second route' },
    hospital: [
      ['Narration', 'Naiwa\'s pulse had steadied since the fairground. I fell asleep beside his bed once and woke with a fistful of blanket in my hand. Rain kept tapping at the window.'],
      ['Narration', 'At 2:17 a.m., the monitor beeped three times. Naiwa\'s fingers curled. His journal opened by itself, and ink spread across the page: Layer Two. Don\'t trust the first mirror.'],
      ['Narration', 'I pulled up the ward footage. A figure in purple took that page from the journal. His right gauntlet flashed. The picture broke up just as he turned. I rewound it three times. Same spot.'],
      ['Naiba', 'Give me that page. You brought one of him back already. Don\'t go in again.'],
      ['Narration', 'I ran after him. The fire door slammed shut in my face, trapping a frosted corner of paper. Behind me, the monitor sped up. Through the wall, someone spoke in Naiwa\'s voice: “He wasn\'t the only one there.”'],
      ['Narration', 'The nurse said the whole floor had lost power overnight. I showed her the footage: every room was lit during the outage. She checked the maintenance log. The cold-storage lift had been called at the same minute.'],
      ['Narration', 'A partial blue fingerprint marked the paper. Below it: Layer Two, Frozen Mirror Hall. The rest had been torn away recently.'],
      ['Narration', 'The lift opened, and cold air slipped up my sleeves. I looked back at Naiwa. Still asleep. A chip of ice sat in his fist, leaving a wet ring on the sheet.'],
    ],
    threshold: [
      ['Narration', 'The lift stopped. Its floor display showed a single dash. Ice veined the tiles outside. Above me, another corridor hung upside down in the glass ceiling.'],
      ['Narration', 'Three mirrors stood by the entrance. In one, I chased a purple coat. In another, I knelt to gather broken glass. In the third, I pressed my ear to a wall and heard someone breathing.'],
      ['Narration', 'Each reflection led farther into the hall. I touched the glass and pulled my hand away from the cold. “Don\'t trust him,” the wall said again. This time the last word cut off.'],
      ['Narration', 'The lights stayed on for three seconds, off for two. While they were on, I counted scratches on the wall and wet footprints below. In the dark, one more print appeared.'],
      ['Narration', 'The central mirror was locked, with three empty slots in its frame. At the first turn, I found a damp note. Someone had folded directions into it.'],
    ],
    approaches: [
      ['Follow the purple figure', 'He just turned into the left-hand mirror.'],
      ['Collect the mirror pieces', 'Each piece has a different timestamp.'],
      ['Find the voice in the wall', 'Whoever is inside is still breathing.'],
    ],
    responses: [['Let Fat Dudu finish', 'He still remembers a voice from the crash.'], ['Question Naiba', 'Ask about the gauntlet and the braking command.']],
    responseLines: { trust: 'I let Fat Dudu speak first. He stared at the crystal in Naiba\'s hand. “Someone shouted stop before the car hit.” Naiba did not correct him.', question: '“Did you send the braking command?” I asked. Naiba looked down at the dark jewel on his gauntlet. “Yes. Ask someone else why the car took that road.”' },
    approachLines: {
      chase: 'I chased the purple coat down three corridors. It vanished at every turn. The last mirror showed the crash, but its timestamp jumped over the second before impact.',
      restore: 'I lined up the pieces by timestamp. Naiba was at the scene. The braking command came one second before impact. I checked the order again. It held.',
      comfort: 'I followed the voice first. Fat Dudu recognized me through the glass and finally looked at the three memories on the table. When the crash appeared, he turned away.',
    },
    core: [
      ['Fat Dudu', 'I saw him. His gauntlet was in the headlights. He was standing right there when I fell. But the brakes… I think I heard them first.'],
      ['Narration', 'I laid all three recordings over the mirror: the purple gauntlet, the turning wheels, the brake log. The command came a second before impact. The footage for that second was blank.'],
      ['Narration', 'The ice lit up again. Rain blurred the road signs. A broken medicine bottle rolled on the passenger seat. Two knocks came from the other side of the glass, and the picture froze.'],
      ['Fat Dudu', 'The car was freezing. Someone called my name twice. I thought it was him… No. His voice doesn\'t sound like that.'],
      ['Narration', 'Fat Dudu fell quiet. I put my hand against the ice. Warmth met it on the other side. A quick pulse and a slow one ticked through the wall.'],
      ['Narration', 'Naiba burst through a side door, smashed the central mirror, and pulled out a blue crystal. A fine thread trailed from it into my chest. When he gripped the crystal, a jewel on his gauntlet went dark.'],
      ['Naiba', 'Don\'t touch that thread. I\'ll answer for the crash. First, get out of here.'],
      ['Narration', 'The broken glass caught his reflection. His hand shook so badly he could barely hold the crystal. I reached toward him. He stepped back and clenched it tighter.'],
      ['Fat Dudu', 'Wait. That voice in the car… I\'ve heard it before. Give me a minute. Don\'t close the mirror yet.'],
      ['Narration', 'Naiba stood by the exit and let me pass. The mirror was broken, but the ice on the floor remained. So did that blank second in the recording.'],
    ],
    ending: [
      ['Narration', 'Fat Dudu came out from behind the glass, water dripping from his sleeves. He caught my cuff, then let go. “Some of what I said—I\'m not sure anymore. Will you come back and ask me?” I nodded.'],
      ['Narration', 'Back in the ward, Naiwa\'s finger moved again. I watched it happen this time. The rain had stopped, but a stairway now showed in the window\'s reflection.'],
      ['Narration', 'The missing journal page lay on the first step. On its back, someone had written: “The brakes weren\'t the beginning. Find out who changed the route before the rain.”'],
      ['Narration', 'I folded the page into my pocket and looked back at Naiba. He offered no explanation. He did not follow. The dead jewel on his gauntlet was still black.'],
      ['Narration', 'A three lit up on the lift display. Naiwa was still asleep. In the glass, Fat Dudu stayed where he was and watched me press the button.'],
    ],
    complete: 'Chapter two · End', completeNote: 'The ice has melted. The truth waits deeper in.', choose: 'Choose your way into the hall', mapHint: 'Follow the current map target north. Each recovered exhibit leads to the next chamber.', skipToMap: 'Return to the hall', voicePlay: 'Play Fat Dudu voice clip', voiceStop: 'Stop audio', voiceError: 'Audio is unavailable', characterVoicePlay: 'Play Naiba voice', characterVoiceStop: 'Skip voice', narratorVoicePlay: 'Play narration',
  },
} as const

const fragmentStories = {
  zh: {
    footage: { title: '被剪掉的一秒', art: ['chapter-02-cg-film-fragment', 'chapter-02-crash-memory', 'chapter-02-cg-film-fragment', 'chapter-02-cg-film-fragment'], lines: [
      ['旁白', '胶片离开冰面，雨点在画格里倒着往上走。时间码停在两点十七分；跳过一格，人影已经跑进车道。'],
      ['肥嘟嘟', '我一直记得那盏红灯。你看，撞上去之前它灭了。为什么我一点印象都没有？'],
      ['旁白', '我把胶片对着灯叠起来。手甲亮起之前，车轮已经偏转；两帧之间少了一秒。'],
      ['旁白', '胶片边缘压着两道声纹，窄得几乎看不见。我拍下照片，留着跟别的线索对照。'],
    ] },
    shard: { title: '镜片背面的人', art: ['chapter-02-cg-shattered-mirror', 'chapter-02-gauntlet', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-shattered-mirror'], lines: [
      ['旁白', '镜片正面映出空走廊。背面的银层上粘着一根黑发，没有结霜，摸上去还是温的。'],
      ['旁白', '镜中闪过车门。奶霸的手甲抓住门把，却没抓住门后伸来的手。玻璃突然从中间裂开。'],
      ['肥嘟嘟', '我记得他站在那儿。再往前想，镜子就跳回撞上的那一刻。我试过很多次。'],
      ['旁白', '裂缝左边的时间码比右边早了三秒。我把镜片转来转去，也对不齐。'],
    ] },
    echo: { title: '没有回声的心跳', art: ['chapter-02-cg-cold-mirror', 'chapter-02-cg-medicine-memory', 'chapter-02-cg-shared-palm', 'chapter-02-ice-hall'], lines: [
      ['旁白', '我把蜡片贴近耳朵。两下心跳，一前一后；第二下撞上镜墙，什么回声也没有。'],
      ['肥嘟嘟', '“别信他”……等一下。先说这句话的是谁？我听着像我自己。'],
      ['旁白', '我又听了一遍。“别信他”三个字重在一起，后面的呼吸却分成两道。'],
      ['旁白', '我收起蜡片。录音在这里断了；也许镜心还留着后半句。'],
    ] },
  },
  en: {
    footage: { title: 'The Missing Second', art: ['chapter-02-cg-film-fragment', 'chapter-02-crash-memory', 'chapter-02-cg-film-fragment', 'chapter-02-cg-film-fragment'], lines: [
      ['Narration', 'I lifted the film from the ice. Rain ran upward in the frames. The timecode read 2:17; one frame later, a figure was already in the road.'],
      ['Fat Dudu', 'I remember that light being red. Look—it goes out before the crash. How did I miss that?'],
      ['Narration', 'I held the frames against the light. The wheels had turned before the gauntlet flashed. There was a missing second between them.'],
      ['Narration', 'Two thin sound tracks ran along the edge of the film. I photographed them to compare with the other clues.'],
    ] },
    shard: { title: 'The Other Side of the Glass', art: ['chapter-02-cg-shattered-mirror', 'chapter-02-gauntlet', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-shattered-mirror'], lines: [
      ['Narration', 'The front of the lens reflected an empty corridor. A dark hair clung to the silver on the back. It felt warm against my finger.'],
      ['Narration', 'The car door flashed in the glass. Naiba\'s gauntlet caught the handle, but missed the hand reaching from inside. The lens split down the middle.'],
      ['Fat Dudu', 'I remember him standing there. Every time I try to look earlier, the mirror skips back to the impact. I\'ve tried.'],
      ['Narration', 'The timecodes on either side of the crack were three seconds apart. I turned the lens over. They still would not meet.'],
    ] },
    echo: { title: 'A Heartbeat Without an Echo', art: ['chapter-02-cg-cold-mirror', 'chapter-02-cg-medicine-memory', 'chapter-02-cg-shared-palm', 'chapter-02-ice-hall'], lines: [
      ['Narration', 'I held the wax record to my ear. Two heartbeats, one after the other. The second struck the mirror wall and gave no echo.'],
      ['Fat Dudu', '“Don\'t trust him”… Wait. Who said it first? That sounds like me.'],
      ['Narration', 'I played it again. The words overlapped exactly; the breaths afterward split apart.'],
      ['Narration', 'I pocketed the record. The voice cut off there. Maybe the central mirror held the rest.'],
    ] },
  },
} as const

function chapterTwoRouteTree(save: ChapterSave, language: Language) {
  const t = copy[language]
    const rank: Record<Phase, number> = { hospital: 0, threshold: 1, map: 2, core: 3, ending: 4 }
    const reached = (phase: Phase) => save.completed || rank[save.phase] >= rank[phase]
    const node = (phase: Phase, title: string, detail = '') => `<button type="button" data-ice-route="${phase}" class="ice-route-node ${reached(phase) ? 'is-reached' : 'is-locked'}" ${reached(phase) ? '' : 'disabled'}><span class="ice-route-dot">${reached(phase) ? '✓' : '·'}</span><span class="ice-route-description"><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ''}</span><em>${reached(phase) ? t.visited : t.locked}</em></button>`
    const routeTree = `<div class="ice-route-tree"><div class="ice-route-spine"><span class="ice-route-kicker">01</span><div class="ice-route-branches"><div class="ice-route-branch">${node('hospital', language === 'zh' ? '医院病房' : 'Hospital ward', language === 'zh' ? '日记残页 · 冷藏电梯' : 'Journal page · cold lift')}<div class="ice-route-link"></div>${node('threshold', language === 'zh' ? '镜馆入口' : 'Hall entrance', language === 'zh' ? '选择进入方式' : 'Choose an approach')}<div class="ice-route-link"></div><div class="ice-route-choice-title">${language === 'zh' ? '三种进入方式' : 'Three approaches'}</div><div class="ice-route-choice-grid">${t.approaches.map(([name, desc], i) => `<div class="ice-route-choice ${save.approach === (['chase','restore','comfort'] as const)[i] ? 'is-selected' : ''} ${save.approach ? (save.approach === (['chase','restore','comfort'] as const)[i] ? 'is-reached' : 'is-locked') : reached('map') ? 'is-reached' : 'is-locked'}"><strong>${name}</strong><small>${desc}</small>${save.approach === (['chase','restore','comfort'] as const)[i] ? `<em>${language === 'zh' ? '当前路线' : 'Selected'}</em>` : ''}</div>`).join('')}</div><div class="ice-route-link"></div>${node('map', language === 'zh' ? '镜馆探索' : 'Hall exploration', `${t.clues} ${save.clues.length}/6 · ${save.clues.map(id => t.clueNames[id]).join(' / ') || (language === 'zh' ? '尚无线索' : 'No clues yet')}`)}<div class="ice-route-link"></div>${node('core', language === 'zh' ? '镜心对质' : 'Confrontation', language === 'zh' ? '三段记忆与路线合流' : 'Memories and route converge')}<div class="ice-route-choice-grid ice-response-branches">${t.responses.map(([name, desc], i) => { const id = (['trust','question'] as const)[i]; return `<div class="ice-route-choice ${save.response === id ? 'is-selected is-reached' : reached('ending') ? 'is-reached' : 'is-locked'}"><strong>${name}</strong><small>${desc}</small>${save.response === id ? `<em>${language === 'zh' ? '当前结局' : 'Selected'}</em>` : ''}</div>` }).join('')}</div><div class="ice-route-link"></div>${node('ending', language === 'zh' ? '冰镜结局' : 'The thawing', language === 'zh' ? '通往第三层' : 'A path to layer three')}</div></div></div>`
  return { reached, routeTree }
}

export function mountChapterTwo(root: HTMLElement, initialLanguage: Language, onBack: (language: Language) => void, onLanguageChange?: (language: Language) => void) {
  let language = initialLanguage
  let save = load()
  let mapController: ReturnType<typeof mountPoolIceWorld> | null = null
  let mouseVoice: HTMLAudioElement | null = null
  let characterVoice: HTMLAudioElement | null = null
  let panelOpen = false
  const persist = () => localStorage.setItem(KEY, JSON.stringify(save))
  const clearMap = () => { mapController?.dispose(); mapController = null }
  const stopVoice = () => { if (mouseVoice) { mouseVoice.pause(); mouseVoice.onended = null; mouseVoice.currentTime = 0; mouseVoice = null } }
  const stopCharacterVoice = () => { characterVoice?.pause(); if (characterVoice) characterVoice.src = ''; characterVoice = null }
  const updateFullscreenLabel = () => {
    const button = root.querySelector<HTMLButtonElement>('#ice-fullscreen')
    if (button) { button.textContent = isAppFullscreen(root) ? copy[language].exitFullscreen : copy[language].fullscreen; button.setAttribute('aria-pressed', String(isAppFullscreen(root))) }
  }
  root.ownerDocument.addEventListener('fullscreenchange', updateFullscreenLabel)
  window.addEventListener('appimmersivechange', updateFullscreenLabel)
  function renderFragment() {
    root.querySelector('#ice-fragment-layer')?.remove()
    const pending = save.pendingFragment
    if (!pending) { mapController?.setStoryPaused(false); return }
    const story = fragmentStories[language][pending.id]
    const index = Math.min(pending.line, story.lines.length - 1)
    const [speaker, text] = story.lines[index]
    const isLast = index === story.lines.length - 1
    const label = language === 'zh' ? '碎片记忆' : 'FRAGMENT MEMORY'
    root.querySelector('.ice-layout')?.insertAdjacentHTML('beforeend', `<section class="ice-fragment-layer" id="ice-fragment-layer" role="dialog" aria-modal="true" aria-label="${label}：${story.title}" style="--fragment-art:url('/images/${story.art[index]}.webp')"><div class="ice-fragment-art" aria-hidden="true"></div><div class="ice-fragment-top"><span>${label} / ${String(fragmentIds.indexOf(pending.id) + 1).padStart(2, '0')}</span><strong>${story.title}</strong><em>${String(index + 1).padStart(2, '0')} / ${String(story.lines.length).padStart(2, '0')}</em></div><div class="ice-fragment-dialogue"><span class="ice-fragment-speaker">${speaker}</span><p>${text}</p><button id="ice-fragment-next" type="button">${isLast ? language === 'zh' ? '收起记忆 · 返回镜馆' : 'Keep memory · Return to hall' : language === 'zh' ? '继续回忆' : 'Continue memory'} <span>↗</span></button></div></section>`)
    root.querySelector<HTMLButtonElement>('#ice-fragment-next')?.addEventListener('click', () => {
      if (!save.pendingFragment) return
      if (index < story.lines.length - 1) save.pendingFragment.line = index + 1
      else save.pendingFragment = null
      persist()
      renderFragment()
    })
    mapController?.setStoryPaused(true)
    root.querySelector<HTMLButtonElement>('#ice-fragment-next')?.focus()
  }
  function render() {
    clearMap()
    stopVoice()
    stopCharacterVoice()
    panelOpen = false
    const t = copy[language]
    const isMap = save.phase === 'map'
    const lines = isMap ? [] : t[save.phase]
    const line = lines?.[Math.min(save.line, Math.max(0, lines.length - 1))]
    if (!isMap && line) {
      const entry = { phase: save.phase as Exclude<Phase, 'map'>, line: save.line }
      const last = save.history.at(-1)
      if (!last || last.phase !== entry.phase || last.line !== entry.line) { save.history.push(entry); save.history = save.history.slice(-100); persist() }
    }
    const lineText = save.phase === 'core' && save.line === 1 && save.approach ? t.approachLines[save.approach] : save.phase === 'ending' && save.line === 0 && save.response ? t.responseLines[save.response] : line?.[1] ?? ''
    const audioEnabled = localStorage.getItem('naiwa-audio-enabled-v1') !== 'false'
    const showVoice = audioEnabled && save.phase === 'core' && (save.line === 0 || save.line === 8)
    const showCharacterVoice = line?.[0] === '奶霸' || line?.[0] === 'Naiba'
    const showNarrationVoice = line?.[0] === '旁白' || line?.[0] === 'Narration'
    const showSpokenVoice = audioEnabled && (showCharacterVoice || showNarrationVoice)
    const artByPhase: Record<Phase, string[]> = {
      hospital: ['chapter-02-hospital', 'chapter-02-journal', 'chapter-02-cg-surveillance', 'chapter-02-hospital', 'chapter-02-cg-door-note', 'chapter-02-cg-surveillance', 'chapter-02-cg-door-note', 'chapter-02-elevator'],
      threshold: ['chapter-02-elevator', 'chapter-02-cg-three-mirrors', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-three-mirrors', 'chapter-02-ice-hall'],
      core: ['chapter-02-cg-cold-mirror', 'chapter-02-cg-film-fragment', 'chapter-02-cg-medicine-memory', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-shared-palm', 'chapter-02-cg-dark-jewel', 'chapter-02-cg-dark-jewel', 'chapter-02-cg-dark-jewel', 'chapter-02-cg-shared-palm', 'chapter-02-cg-shattered-mirror'],
      ending: ['chapter-02-cg-Fat Dudu-emerges', 'chapter-02-hospital', 'chapter-02-journal', 'chapter-02-cg-dark-jewel', 'chapter-02-elevator'],
      map: [],
    }
    const art = isMap ? 'chapter-02-ice-hall' : artByPhase[save.phase][Math.min(save.line, artByPhase[save.phase].length - 1)]
    const { reached, routeTree } = chapterTwoRouteTree(save, language)
    root.innerHTML = `<div class="chapter-two ${isMap ? 'is-map' : ''}"><header class="ice-top"><button class="ice-back" id="ice-back" type="button">← ${t.back}</button><span>NAIWA <i>✦</i> ${t.chapter}</span><div class="ice-top-tools"><button class="ice-restart" id="ice-restart" type="button">${t.restart}</button><button class="ice-top-action" id="ice-log" type="button">${t.log}</button><button class="ice-top-action" id="ice-routes" type="button">⌘ ${t.routes}</button><button class="ice-top-action" id="ice-menu" type="button">${t.menu}</button><button class="ice-top-action ice-fullscreen" id="ice-fullscreen" type="button" aria-pressed="${isAppFullscreen(root)}">${isAppFullscreen(root) ? t.exitFullscreen : t.fullscreen}</button><button class="ice-language" id="ice-language" type="button">${language === 'zh' ? 'EN' : 'ZH'}</button></div></header><main class="ice-layout"><div class="ice-heading"><span>${t.chapter.toUpperCase()} / 02</span><h1>${t.title}</h1><p>${t.subtitle}</p></div>${isMap ? `<div class="ice-world" id="ice-world"></div><div class="ice-map-foot"><span>${t.mapHint}</span><strong>${t.clues} ${save.clues.length}/6</strong></div>` : `<section class="ice-narrative" style="--ice-art:url('/images/${art}.webp')"><div class="ice-atmosphere" aria-hidden="true"></div><div class="ice-copy"><div class="ice-index">${String(save.line + 1).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}</div><div class="ice-speaker">${line?.[0] ?? ''}</div><p>${lineText}</p>${showVoice ? `<button class="ice-voice" id="ice-voice" type="button">♪ ${t.voicePlay}</button>` : ''}${showSpokenVoice ? `<button class="ice-voice" id="ice-character-voice" type="button">♪ ${t.characterVoiceStop}</button>` : ''}${save.phase === 'threshold' && save.line === lines.length - 1 ? `<div class="ice-approaches" role="group" aria-label="${t.choose}">${t.approaches.map(([name, description], i) => `<button data-approach="${i}" type="button"><strong>${String(i + 1).padStart(2, '0')} · ${name}</strong><small>${description}</small></button>`).join('')}</div>` : save.phase === 'core' && save.line === lines.length - 1 ? `<div class="ice-approaches ice-response-options" role="group" aria-label="${t.choose}">${t.responses.map(([name, description], i) => `<button data-response="${i}" type="button"><strong>${String(i + 1).padStart(2, '0')} · ${name}</strong><small>${description}</small></button>`).join('')}</div>` : save.phase === 'ending' && save.line === lines.length - 1 ? `<div class="ice-end"><strong>${t.complete}</strong><span>${t.completeNote}</span><button id="ice-finish" type="button">${t.back} →</button></div>` : `<button class="ice-next" id="ice-next" type="button">${save.phase === 'threshold' ? t.enter : t.next} <span>↗</span></button>`}</div></section>`}</main></div>`
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
      const variant = save.phase === 'core' && save.line === 1 ? save.approach : save.phase === 'ending' && save.line === 0 ? save.response : null
      const narrationUrl = `/audio/tts/narration-02-${save.phase}-${save.line}${variant ? `-${variant}` : ''}-${language}.mp3`
      const clips = showNarrationVoice ? [narrationUrl] : characterVoiceSequence(longLine)
      const playLabel = showNarrationVoice ? t.narratorVoicePlay : t.characterVoicePlay
      const audio = new Audio(clips[0])
      const button = root.querySelector<HTMLButtonElement>('#ice-character-voice')!
      let clipIndex = 0
      characterVoice = audio
      const play = () => {
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
    const restartChapter = () => { stopVoice(); stopCharacterVoice(); clearMap(); save = blank(); persist(); render() }
    const askRestart = () => confirmInApp(root, t.restartConfirm, language, restartChapter)
    const closePanel = () => { panelOpen = false; root.querySelector('#ice-routes-scrim')?.remove(); mapController?.setStoryPaused(!!save.pendingFragment) }
    const openPanel = (kind: 'routes' | 'log' | 'menu') => {
      if (panelOpen) closePanel()
      panelOpen = true
      stopVoice(); stopCharacterVoice()
      mapController?.setStoryPaused(true)
      const title = kind === 'routes' ? t.routesTitle : kind === 'log' ? t.log : t.menu
      const content = kind === 'routes' ? `<p class="ice-panel-hint">${t.routeHint}</p>${routeTree}` : kind === 'log'
        ? `<div class="ice-history-list">${save.history.length ? save.history.map(entry => { const item = t[entry.phase][entry.line]; return item ? `<article><small>${t.chapter} · ${entry.phase}</small><strong>${item[0]}</strong><p>${item[1]}</p></article>` : '' }).join('') : `<p>${language === 'zh' ? '还没有可回顾的对话。' : 'No dialogue to review yet.'}</p>`}</div>`
        : `<div class="ice-panel-menu"><button type="button" data-panel-action="continue">${t.next}</button><button type="button" data-panel-action="log">${t.log}</button><button type="button" data-panel-action="routes">${t.routes}</button><button type="button" data-panel-action="restart">${t.restart}</button><button type="button" data-panel-action="chapters">${t.back}</button></div>`
      root.querySelector('.ice-layout')?.insertAdjacentHTML('beforeend', `<div class="ice-routes-scrim" id="ice-routes-scrim"><section class="ice-routes-dialog" role="dialog" aria-modal="true" aria-labelledby="ice-routes-title"><header><div><span>NAIWA / 02</span><h2 id="ice-routes-title">${title}</h2></div><button id="ice-routes-close" type="button" aria-label="${t.close}">×</button></header>${content}</section></div>`)
      root.querySelector('#ice-routes-close')?.addEventListener('click', closePanel)
      root.querySelector('#ice-routes-scrim')?.addEventListener('click', event => { if (event.target === event.currentTarget) closePanel() })
      root.querySelectorAll<HTMLButtonElement>('[data-ice-route]').forEach(button => button.addEventListener('click', () => {
        const phase = button.dataset.iceRoute as Phase
        if (!reached(phase)) return
        closePanel()
        save.phase = phase; save.line = 0; save.pendingFragment = null
        persist(); render()
      }))
      root.querySelectorAll<HTMLButtonElement>('[data-panel-action]').forEach(button => button.addEventListener('click', () => {
        const action = button.dataset.panelAction
        if (action === 'continue') closePanel()
        else if (action === 'restart') { closePanel(); askRestart() }
        else if (action === 'chapters') { closePanel(); onBack(language) }
        else if (action === 'routes' || action === 'log') openPanel(action)
      }))
    }
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
      audio.preload = 'auto'
      mouseVoice = audio
      audio.onended = () => { if (mouseVoice === audio) mouseButton.textContent = `♪ ${t.voicePlay}` }
      const play = async () => {
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
      if (save.phase === 'map' || save.phase === 'threshold' && save.line === t.threshold.length - 1) return
      if (save.line < lines.length - 1) save.line++
      else { save.phase = save.phase === 'hospital' ? 'threshold' : save.phase === 'core' ? 'ending' : 'ending'; save.line = 0 }
      if (save.phase === 'ending') save.completed = true
      persist(); render()
    })
    root.querySelectorAll<HTMLButtonElement>('[data-approach]').forEach(button => button.addEventListener('click', () => {
      save.approach = (['chase', 'restore', 'comfort'] as const)[Number(button.dataset.approach)]
      save.phase = 'map'; save.line = 0; persist(); render()
    }))
    root.querySelectorAll<HTMLButtonElement>('[data-response]').forEach(button => button.addEventListener('click', () => {
      save.response = (['trust', 'question'] as const)[Number(button.dataset.response)]
      save.phase = 'ending'; save.line = 0; save.completed = true; persist(); render()
    }))
    root.querySelector('#ice-finish')?.addEventListener('click', () => { stopVoice(); onBack(language) })
    if (isMap) {
      mapController = mountPoolIceWorld(root.querySelector<HTMLElement>('#ice-world')!, {
        language, found: save.clues, storyPaused: !!save.pendingFragment,
        onClue: id => {
          if (save.clues.includes(id)) return
          save.clues.push(id)
          if (fragmentIds.includes(id as FragmentId)) save.pendingFragment = { id: id as FragmentId, line: 0 }
          persist()
          const counter = root.querySelector('.ice-map-foot strong')
          if (counter) counter.textContent = `${t.clues} ${save.clues.length}/6`
          const replay = root.querySelector<HTMLButtonElement>(`[data-replay-fragment="${id}"]`)
          if (replay) replay.disabled = false
          if (save.pendingFragment) { mapController?.setStoryPaused(true); renderFragment() }
        },
        onCore: () => { if (!(['footage', 'shard', 'echo', 'route'] as IceClueId[]).every(id => save.clues.includes(id))) return; save.phase = 'core'; save.line = 0; persist(); render() },
        onExit: () => { stopVoice(); onBack(language) },
      })
    }
    if (save.pendingFragment) renderFragment()
  }
  render()
  return { dispose() { stopVoice(); stopCharacterVoice(); clearMap(); root.ownerDocument.removeEventListener('fullscreenchange', updateFullscreenLabel); window.removeEventListener('appimmersivechange', updateFullscreenLabel) }, setLanguage(next: Language) { language = next; render() }, restart() { stopVoice(); stopCharacterVoice(); clearMap(); save = blank(); persist(); render() } }
}

export function chapterTwoStatus() { const save = load(); return { started: save.phase !== 'hospital' || save.line > 0, completed: save.completed, clues: save.clues.length } }

export function resetChapterTwo() { localStorage.setItem(KEY, JSON.stringify(blank())) }

export function previewChapterTwoRoutes(root: HTMLElement, language: Language, onPlay: () => void) {
  const save = load()
  const { reached, routeTree } = chapterTwoRouteTree(save, language)
  const t = copy[language]
  const dialog = showChapterRoutePreview(root, language, t.routesTitle, `<p class="ice-panel-hint">${t.routeHint}</p>${routeTree}`, 'ice-routes-dialog')
  dialog.querySelectorAll<HTMLButtonElement>('[data-ice-route]').forEach(button => button.addEventListener('click', () => {
    const phase = button.dataset.iceRoute as Phase
    if (!reached(phase)) return
    save.phase = phase; save.line = 0; save.pendingFragment = null
    localStorage.setItem(KEY, JSON.stringify(save))
    dialog.close()
    onPlay()
  }))
  return dialog
}
