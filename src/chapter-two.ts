import './chapter-two.css'
import { mountPoolIceWorld, type IceClueId } from './pool-ice-world'
import type { Language } from './story'
import { characterVoiceSequence } from './character-voice'
import { isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'

type Phase = 'hospital' | 'threshold' | 'map' | 'core' | 'ending'
type FragmentId = 'footage' | 'shard' | 'echo'
type ChapterSave = { version: 1; phase: Phase; line: number; clues: IceClueId[]; approach: 'chase' | 'restore' | 'comfort' | null; response?: 'trust' | 'question' | null; completed: boolean; pendingFragment: { id: FragmentId; line: number } | null }
const KEY = 'naiwa-chapter-two-v1'
const clues: IceClueId[] = ['footage', 'shard', 'echo', 'note', 'routeOne', 'route']
const fragmentIds: FragmentId[] = ['footage', 'shard', 'echo']
const blank = (): ChapterSave => ({ version: 1, phase: 'hospital', line: 0, clues: [], approach: null, response: null, completed: false, pendingFragment: null })
function load(): ChapterSave {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ChapterSave> | null
    if (!raw || raw.version !== 1 || !['hospital', 'threshold', 'map', 'core', 'ending'].includes(raw.phase ?? '')) return blank()
    const found = Array.isArray(raw.clues) ? clues.filter(id => raw.clues?.includes(id)) : []
    if (found.includes('route') && !found.includes('routeOne')) found.push('routeOne')
    const pending = raw.pendingFragment
    const pendingFragment = pending && fragmentIds.includes(pending.id) && found.includes(pending.id)
      ? { id: pending.id, line: Math.max(0, Number(pending.line) || 0) } : null
    return { version: 1, phase: raw.phase!, line: Math.max(0, Number(raw.line) || 0), clues: found, approach: raw.approach === 'chase' || raw.approach === 'restore' || raw.approach === 'comfort' ? raw.approach : null, response: raw.response === 'trust' || raw.response === 'question' ? raw.response : null, completed: !!raw.completed, pendingFragment }
  } catch { return blank() }
}
const copy = {
  zh: {
    back: '返回章节', chapter: '第二章', title: '冰镜疑凶', subtitle: '第二层 · 冰封镜馆', next: '继续', enter: '进入冰封镜馆', resume: '继续探索', restart: '重玩第二章', restartConfirm: '重新开始第二章？本章线索和进度将被清除。', fullscreen: '进入全屏', exitFullscreen: '退出全屏', routes: '剧情树', routesTitle: '冰镜剧情树', close: '关闭', locked: '尚未抵达', visited: '已抵达',
    map: '探索镜馆', clues: '探索记录', clueNames: { footage: '残缺监控', shard: '冰蓝晶片', echo: '被封住的声音', note: '密码纸条', routeOne: '第一段路线', route: '第二段路线' },
    hospital: [
      ['旁白', '从迷雾游乐园回来后，奶蛙的心跳终于有了微弱的节律。监护仪每响一声，我就知道自己还有路要走。可病房安静得过分，连窗外的雨都像被谁按住了声音。'],
      ['旁白', '凌晨两点十七分，监护仪短促地响了三声。奶蛙的手指蜷了一下，床边那本《奶蛙观察日记》随即浮出一行陌生字迹：第二层，不要相信第一面镜子。'],
      ['旁白', '午夜的病房监控里，一个紫色身影取走了日记新浮现的一页。右手的金属手甲闪过几种颜色；画面偏偏在他转身时雪花化，像有人刻意剪掉了脸。'],
      ['奶霸', '你救回来的是他的一部分。别急着翻下一页。医院里有些门，关上之后就不该再打开。'],
      ['旁白', '我追到走廊，防火门却在眼前合拢。门缝下滑过一片结霜的纸角。奶蛙的心率在那一瞬间起伏，我听见隔墙里有人用他的声音说：“不是他一个人。”'],
      ['旁白', '护士说昨晚整层楼短暂断电，监控却显示那一刻所有病房灯都亮着。她递来一张设备维护单：冷藏电梯在停用多年后，刚刚被从地下呼叫。'],
      ['旁白', '日记残页上留下半枚蓝色指印和一个坐标：第二层，冰封镜馆。镜子会保存记忆，也会把记忆裁成令人相信的形状。'],
      ['旁白', '门后的寒气沿着指尖爬上来。我回头看了一眼病床：奶蛙仍在沉睡，掌心却握紧了那枚本不属于他的冰屑。'],
    ],
    threshold: [
      ['旁白', '冷藏电梯停在没有楼层数字的一站。门外是一座被冰封的镜馆，穹顶上倒悬着无数走廊，像整栋医院被折进了玻璃。'],
      ['旁白', '入口的三面镜子映出三种我：一个追着紫色影子跑，一个跪下来拼镜片，最后一个站着不动，听镜墙深处传来的呼吸。'],
      ['旁白', '冰层下有三条路：追上紫色影子，复原破碎的镜片，或先寻找那个说着“不要相信他”的声音。选择会改变我先看见什么，却不会替我决定该相信谁。'],
      ['旁白', '馆内的灯每隔几秒便熄灭一次。墙上有被指甲划出的方向记号，地面留着半干的脚印；我必须沿着线索走深，找到通往中央镜心的路。'],
      ['旁白', '我得带回三段彼此独立的记忆，才能打开镜心。越接近事故发生的那一刻，镜子越像在等我先下结论。'],
    ],
    approaches: [
      ['追逐紫色影子', '最快抵达镜馆深处，但镜子会加剧猜疑。'],
      ['拼合散落镜片', '慢一些，却能看清事故片段的顺序。'],
      ['先回应求救声', '试着安抚自我封闭的奶蛙碎片。'],
    ],
    responses: [['先相信奶鼠', '带着疑问离开镜心，约定之后一起查证。'], ['继续追问奶霸', '当面追问手甲与那条制动指令的来历。']],
    responseLines: { trust: '我选择先相信奶鼠。奶霸沉默片刻，把晶片收进掌心：“那就别让下一次记忆也只剩一个人的说法。”', question: '我没有放过奶霸：“那条制动指令是谁下的？”他看了看暗下去的宝石：“我会告诉你，但不是在这面镜子面前。”' },
    approachLines: {
      chase: '我追着紫色残影穿过镜阵，胸口泛起寒意。三段记忆都指向车祸现场，却仍缺了关键的一瞬。',
      restore: '我按时间拼好镜片。紫色身影确实在场；一条制动指令早于撞击。看见顺序，反而让我更想知道前因。',
      comfort: '我先想起现实里奶蛙曾尊重我的每一次选择，再把三段记忆并排放下。碎片终于愿意听我说话；事故影像仍不完整。',
    },
    core: [
      ['奶鼠', '别信他。镜子里，我只看见他站在车祸现场。手甲亮起，我倒下。每次想起那一瞬间，我都会听见刹车声从很远的地方传来。'],
      ['旁白', '我把三段记忆放在一起。紫色身影确实在场；录像里，一条制动指令却早于撞击。冰镜给出了事实，也藏起了前因。'],
      ['旁白', '镜心忽然映出事故前的几分钟：雨水盖住路标，副驾驶座上有一只摔碎的药瓶。画面刚要继续，镜面便像被什么从另一侧敲了一下。'],
      ['奶鼠', '我记得车里很冷。有人叫我的名字，可那声音不像奶霸。也许……我只是想找个人怪罪。'],
      ['旁白', '我没有逼他把缺失的部分说完。我把手放在冰面上，听见心跳隔着镜子传来：一快一慢，像两个人试着重新对上节拍。'],
      ['旁白', '奶霸突然闯入，击碎中央的镜面，带走一片冰蓝晶片。我看到一根细线从晶片伸向自己心口；他的手甲碰到它时，一颗宝石暗了下去。'],
      ['奶霸', '你看见的，都是真的。但别急着认定那就是全部。你找到的顺序，比我能给你的答案更重要。'],
      ['旁白', '碎镜在脚边铺开，映出奶霸紧握晶片的手。他像是疼得发抖，却还是把碎片藏进掌心。我分不清他是在阻止我，还是在替我挡住镜子。'],
      ['奶鼠', '如果你要继续，至少先答应我：下一次，不要独自承受。你可以怀疑他，也可以怀疑我，但别把所有声音都关掉。'],
      ['旁白', '我答应了。奶霸没有伸手，只退到出口旁，给我留下自己决定方向的余地。中央镜心却没有关闭——它还在等一段尚未抵达的记忆。'],
    ],
    ending: [
      ['旁白', '冰层开始融化。冷酷的碎片不再躲进镜子，它牵住我的手，终于肯相信有人会留下。我们没有说原谅，只约好不再让沉默替我们作证。'],
      ['旁白', '现实病房里，奶蛙的手指动了一下。监护仪稳住了节拍；窗外雨停了，玻璃上却映出一条通往更深处的楼梯。'],
      ['旁白', '楼梯间里，失踪的日记页被人放回。纸上多出一行新字：“刹车不是开始。去找那场雨之前，谁改过路线。”'],
      ['旁白', '我将那页纸收好。关于奶霸，我仍有太多问题；关于这场事故，我还没有原谅任何人。但这次，我知道下一步该查什么。'],
      ['旁白', '电梯指示灯亮起第三层。奶蛙没有醒来，奶鼠也没有消失；他们留在镜面的两侧，像两段等待重新拼合的记忆。'],
    ],
    complete: '第二章 · 完', completeNote: '冰镜已融，真相仍藏在下一层。', choose: '选择进入镜馆的方式', mapHint: '看左下角地图：先走「前左前左」，再解第二枚碎片的密码。', skipToMap: '返回镜馆', voicePlay: '播放奶鼠原声片段', voiceStop: '停止播放', voiceError: '音频暂时无法播放', characterVoicePlay: '播放奶霸声音', characterVoiceStop: '跳过声音', narratorVoicePlay: '播放旁白',
  },
  en: {
    back: 'Chapters', chapter: 'Chapter two', title: 'The Culprit in the Ice', subtitle: 'Layer two · The Frozen Mirror Hall', next: 'Continue', enter: 'Enter the mirror hall', resume: 'Resume exploration', restart: 'Replay chapter two', restartConfirm: 'Restart chapter two? This chapter’s clues and progress will be cleared.', fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', routes: 'Story tree', routesTitle: 'Frozen mirror story tree', close: 'Close', locked: 'Not reached', visited: 'Reached',
    map: 'Explore the hall', clues: 'Clues', clueNames: { footage: 'Broken footage', shard: 'Blue crystal', echo: 'The sealed voice', note: 'Cipher note', routeOne: 'First route', route: 'Second route' },
    hospital: [
      ['Narration', 'After the mistbound fairground, a faint rhythm returned to naiwa’s heartbeat. Every tone from the monitor told me there was still a way forward. Yet the ward was too quiet; even the rain beyond the window seemed muted.'],
      ['Narration', 'At 2:17 a.m., the monitor sounded three short alerts. naiwa’s fingers curled. A new line appeared in his journal: Layer two. Do not trust the first mirror.'],
      ['Narration', 'The ward camera caught a purple figure taking the newly written page. Several colours flashed across the metal gauntlet on his right hand; the image broke into static just as he turned, as if someone had cut away his face.'],
      ['Naiba', 'You brought back one part of him. Don’t rush to turn the next page. Some doors in this hospital should stay closed.'],
      ['Narration', 'I ran into the corridor, but the fire door closed before I reached him. A frosted corner of paper slid under it. naiwa’s pulse shifted, and from beyond the wall I heard his voice: “He wasn’t alone.”'],
      ['Narration', 'The nurse said the whole floor had lost power last night, yet every ward light stayed on in the footage. She handed me a maintenance slip: the long-disabled cold-storage lift had just been called from below.'],
      ['Narration', 'Only a blue fingerprint and one coordinate remained on the torn page: layer two, the Frozen Mirror Hall. Mirrors preserve memories, then crop them into shapes we want to believe.'],
      ['Narration', 'Cold crept from the lift doors along my fingers. I looked back at the bed: naiwa was still asleep, but his palm had closed around a shard of ice that did not belong to him.'],
    ],
    threshold: [
      ['Narration', 'The cold-storage lift stopped at a floor with no number. Beyond it stood a hall sealed in ice. Corridors hung upside down from the dome, as if the whole hospital had folded itself into glass.'],
      ['Narration', 'Three mirrors at the entrance showed three versions of me: one chasing a purple shadow, one kneeling to restore the glass, and one listening to a breath behind the walls.'],
      ['Narration', 'Three paths lay beneath the ice: follow the purple shadow, restore the scattered pieces, or answer the voice whispering “don’t trust him.” The choice would change what I saw first, not who I chose to believe.'],
      ['Narration', 'The lights went out every few seconds. Scratches marked directions on the walls; half-dry footprints crossed the floor. I would have to follow the clues deeper to find the heart of the hall.'],
      ['Narration', 'I needed three separate memories to open the central mirror. The closer I came to the crash, the more the glass seemed to wait for me to make up my mind.'],
    ],
    approaches: [
      ['Follow the purple shadow', 'The quickest route inward, though the mirrors feed suspicion.'],
      ['Restore the mirror pieces', 'Slower, but reveals the order of the accident fragments.'],
      ['Answer the distant voice', 'Reach the part of naiwa that has shut everyone out.'],
    ],
    responses: [['Trust Naishu for now', 'Leave with questions and investigate together.'], ['Press Naiba for answers', 'Ask about the gauntlet and the braking command.']],
    responseLines: { trust: 'I chose to trust Naishu for now. Naiba fell silent, then closed his hand around the crystal. “Then let’s make sure the next memory isn’t told by just one person.”', question: 'I did not let Naiba go. “Who issued the braking command?” He looked at the darkened jewel. “I will tell you, but not in front of this mirror.”' },
    approachLines: {
      chase: 'I followed the purple shadow through the mirror maze, cold spreading across my chest. All three memories led to the crash, but one crucial moment was missing.',
      restore: 'I put the fragments in order. The purple figure was there; a braking command came before the impact. The sequence only made me need the cause more.',
      comfort: 'I remembered every time naiwa had respected my choices, then laid the three memories side by side. The fragment finally listened. The crash footage remained incomplete.',
    },
    core: [
      ['Naishu', 'Don’t trust him. The mirror showed him at the crash. His gauntlet lit up. I fell. Every time I remember it, I hear brakes from very far away.'],
      ['Narration', 'I set the three memories side by side. The purple figure was there. Yet a braking command appeared before the impact. The mirror showed facts and hid what led to them.'],
      ['Narration', 'The heart of the mirror showed the minutes before the crash: rain covering the signs, a broken medicine bottle on the passenger seat. Just as the scene continued, something knocked from the other side.'],
      ['Naishu', 'I remember the car was cold. Someone called my name, but it didn’t sound like Naiba. Maybe… I just wanted someone to blame.'],
      ['Narration', 'I did not force him to fill in what was missing. I rested my hand on the ice and heard two heartbeats through the glass, one fast and one slow, trying to find the same rhythm.'],
      ['Narration', 'Naiba burst in and shattered the central mirror, taking a blue crystal. A thin thread ran from it toward my chest. When his gauntlet touched it, one jewel went dark.'],
      ['Naiba', 'Everything you saw was real. Just don’t decide it was everything. The order you found matters more than any answer I can give.'],
      ['Narration', 'Broken glass reflected Naiba’s clenched hand. He seemed to be shaking with pain, yet still hid the crystal in his palm. I could not tell whether he was stopping me or shielding me from the mirror.'],
      ['Naishu', 'If you keep going, promise me one thing: next time, don’t carry it alone. You can doubt him, or doubt me, but don’t shut out every voice.'],
      ['Narration', 'I promised. Naiba did not reach for me; he stepped aside and left the next choice to me. The mirror did not close. It was still waiting for a memory that had not arrived.'],
    ],
    ending: [
      ['Narration', 'The ice began to thaw. The cold fragment stepped out from behind the glass and took my hand, finally willing to believe someone could stay. We did not speak of forgiveness, only promised not to let silence speak for us again.'],
      ['Narration', 'In the hospital, naiwa’s finger moved. The monitor found a steady rhythm. The rain stopped, but the window reflected a staircase leading deeper down.'],
      ['Narration', 'The missing journal page had been returned in the stairwell. A new line appeared: “The brakes were not the beginning. Find who changed the route before the rain.”'],
      ['Narration', 'I kept the page. I still had questions for Naiba, and I had forgiven no one for the crash. But now I knew what to investigate next.'],
      ['Narration', 'The lift indicator lit up for level three. naiwa had not woken, and Naishu had not vanished. They remained on opposite sides of the glass, two memories waiting to be made whole.'],
    ],
    complete: 'Chapter two · End', completeNote: 'The ice has melted. The truth waits deeper in.', choose: 'Choose your way into the hall', mapHint: 'Use the map: complete forward-left-forward-left, then decode the second shard.', skipToMap: 'Return to the hall', voicePlay: 'Play Naishu voice clip', voiceStop: 'Stop audio', voiceError: 'Audio is unavailable', characterVoicePlay: 'Play Naiba voice', characterVoiceStop: 'Skip voice', narratorVoicePlay: 'Play narration',
  },
} as const

const fragmentStories = {
  zh: {
    footage: { title: '被剪掉的一秒', art: ['chapter-02-crash-memory', 'chapter-02-crash-memory', 'chapter-02-gauntlet', 'chapter-02-crash-memory'], lines: [
      ['旁白', '胶片离开冰面，影格里的雨点却向上流。时间码停在凌晨两点十七分，下一帧里，一个人影已经冲向车道。'],
      ['奶鼠', '我记得那盏灯一直是红的。可是画面里，它在撞击前一秒就熄了。'],
      ['旁白', '我把两帧叠在一起。紫色手甲亮起时，车轮已经开始偏转；中间整整一秒被裁掉了。'],
      ['旁白', '胶片边缘压着两道重叠的声纹。有人把缺失的一秒藏进了另一件物证。'],
    ] },
    shard: { title: '镜片背面的人', art: ['chapter-02-cg-shattered-mirror', 'chapter-02-gauntlet', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-shattered-mirror'], lines: [
      ['旁白', '冰蓝镜片映出空走廊。我翻到背面，一根黑发还粘在没有结霜的银层上，像是刚有人碰过它。'],
      ['旁白', '残影闪过：奶霸的手甲抓住车门，却没有抓住门后伸出的那只手。镜面在这一刻裂成两半。'],
      ['奶鼠', '我只记得他站在那里。每次想看清他之前做了什么，镜子就让我回到撞击那一秒。'],
      ['旁白', '裂纹两侧的影像对不上。有人将“赶到现场”和“造成事故”拼成了同一个瞬间。'],
    ] },
    echo: { title: '没有回声的心跳', art: ['chapter-02-cg-cold-mirror', 'chapter-02-crash-memory', 'chapter-02-cg-cold-mirror', 'chapter-02-ice-hall'], lines: [
      ['旁白', '蜡片贴上耳边，两段几乎相同的心跳一前一后响起。第二声到了镜墙，竟没有传回回声。'],
      ['奶鼠', '别信他……不，等一下。这句话是谁先说的？我听见的，像是我自己的声音。'],
      ['旁白', '声纹在“别信他”三个字上完全重合，随后的呼吸却分向两侧。镜中的奶鼠并非只留下了一段记忆。'],
      ['旁白', '我把蜡片收好。要让两道声音重新对上，必须去镜心，听完被截断的后半句。'],
    ] },
  },
  en: {
    footage: { title: 'The Missing Second', art: ['chapter-02-crash-memory', 'chapter-02-crash-memory', 'chapter-02-gauntlet', 'chapter-02-crash-memory'], lines: [
      ['Narration', 'As I lift the film from the ice, rain runs upward through its frames. The timestamp stops at 2:17 a.m. In the next frame, a figure is already running into the road.'],
      ['Naishu', 'I remember the light staying red. But here it goes out a second before the crash.'],
      ['Narration', 'I overlap the frames. The wheels were already turning when the purple gauntlet lit up. A whole second has been cut out.'],
      ['Narration', 'Two sound traces are pressed into the film edge. Someone hid the missing second in another exhibit.'],
    ] },
    shard: { title: 'The Other Side of the Glass', art: ['chapter-02-cg-shattered-mirror', 'chapter-02-gauntlet', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-shattered-mirror'], lines: [
      ['Narration', 'The blue lens reflects an empty corridor. On its unsilvered back, a dark hair remains warm, as though someone touched it moments ago.'],
      ['Narration', 'A memory flashes: Naiba’s gauntlet catches the car door, but misses the hand reaching from behind it. The mirror splits in two.'],
      ['Naishu', 'I only remember him standing there. Whenever I try to see what he did before that, the mirror takes me back to the impact.'],
      ['Narration', 'The two sides of the fracture do not align. Someone joined “arriving at the scene” and “causing the crash” into one moment.'],
    ] },
    echo: { title: 'A Heartbeat Without an Echo', art: ['chapter-02-cg-cold-mirror', 'chapter-02-crash-memory', 'chapter-02-cg-cold-mirror', 'chapter-02-ice-hall'], lines: [
      ['Narration', 'I hold the wax record to my ear. Two nearly identical heartbeats sound in turn. The second reaches the mirror wall and sends back no echo.'],
      ['Naishu', 'Don’t trust him… wait. Who said that first? The voice I heard sounds like my own.'],
      ['Narration', 'The waveforms overlap exactly on “don’t trust him,” then the breaths part. More than one memory of Naishu is trapped here.'],
      ['Narration', 'I keep the record. At the mirror core, perhaps I can hear the rest of the sentence that was cut away.'],
    ] },
  },
} as const

export function mountChapterTwo(root: HTMLElement, initialLanguage: Language, onBack: (language: Language) => void, onLanguageChange?: (language: Language) => void) {
  let language = initialLanguage
  let save = load()
  let mapController: ReturnType<typeof mountPoolIceWorld> | null = null
  let mouseVoice: HTMLAudioElement | null = null
  let characterVoice: HTMLAudioElement | null = null
  let routesOpen = false
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
    const t = copy[language]
    const isMap = save.phase === 'map'
    const lines = isMap ? [] : t[save.phase]
    const line = lines?.[Math.min(save.line, Math.max(0, lines.length - 1))]
    const lineText = save.phase === 'core' && save.line === 1 && save.approach ? t.approachLines[save.approach] : save.phase === 'ending' && save.line === 0 && save.response ? t.responseLines[save.response] : line?.[1] ?? ''
    const showVoice = save.phase === 'core' && (save.line === 0 || save.line === 8)
    const showCharacterVoice = line?.[0] === '奶霸' || line?.[0] === 'Naiba'
    const showNarrationVoice = line?.[0] === '旁白' || line?.[0] === 'Narration'
    const showSpokenVoice = showCharacterVoice || showNarrationVoice
    const artByPhase: Record<Phase, string[]> = {
      hospital: ['chapter-02-hospital', 'chapter-02-journal', 'chapter-02-hospital', 'chapter-02-hospital', 'chapter-02-hospital', 'chapter-02-hospital', 'chapter-02-journal', 'chapter-02-hospital'],
      threshold: ['chapter-02-elevator', 'chapter-02-ice-hall', 'chapter-02-elevator', 'chapter-02-ice-hall', 'chapter-02-ice-hall'],
      core: ['chapter-02-cg-cold-mirror', 'chapter-02-crash-memory', 'chapter-02-crash-memory', 'chapter-02-cg-shattered-mirror', 'chapter-02-cg-cold-mirror', 'chapter-02-gauntlet', 'chapter-02-gauntlet', 'chapter-02-cg-shattered-mirror', 'chapter-02-cg-cold-mirror', 'chapter-02-cg-cold-mirror'],
      ending: ['chapter-02-thaw', 'chapter-02-hospital', 'chapter-02-journal', 'chapter-02-thaw', 'chapter-02-elevator'],
      map: [],
    }
    const art = isMap ? 'chapter-02-ice-hall' : artByPhase[save.phase][Math.min(save.line, artByPhase[save.phase].length - 1)]
    const rank: Record<Phase, number> = { hospital: 0, threshold: 1, map: 2, core: 3, ending: 4 }
    const reached = (phase: Phase) => save.completed || rank[save.phase] >= rank[phase]
    const node = (phase: Phase, title: string, detail = '') => `<div class="ice-route-node ${reached(phase) ? 'is-reached' : 'is-locked'}"><span class="ice-route-dot">${reached(phase) ? '✓' : '·'}</span><div><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ''}</div><em>${reached(phase) ? t.visited : t.locked}</em></div>`
    const routeTree = `<div class="ice-route-tree"><div class="ice-route-spine"><span class="ice-route-kicker">01</span><div class="ice-route-branches"><div class="ice-route-branch">${node('hospital', language === 'zh' ? '医院病房' : 'Hospital ward', language === 'zh' ? '日记残页 · 冷藏电梯' : 'Journal page · cold lift')}<div class="ice-route-link"></div>${node('threshold', language === 'zh' ? '镜馆入口' : 'Hall entrance', language === 'zh' ? '选择进入方式' : 'Choose an approach')}<div class="ice-route-link"></div><div class="ice-route-choice-title">${language === 'zh' ? '三种进入方式' : 'Three approaches'}</div><div class="ice-route-choice-grid">${t.approaches.map(([name, desc], i) => `<div class="ice-route-choice ${save.approach === (['chase','restore','comfort'] as const)[i] ? 'is-selected' : ''} ${save.approach ? (save.approach === (['chase','restore','comfort'] as const)[i] ? 'is-reached' : 'is-locked') : reached('map') ? 'is-reached' : 'is-locked'}"><strong>${name}</strong><small>${desc}</small>${save.approach === (['chase','restore','comfort'] as const)[i] ? `<em>${language === 'zh' ? '当前路线' : 'Selected'}</em>` : ''}</div>`).join('')}</div><div class="ice-route-link"></div>${node('map', language === 'zh' ? '镜馆探索' : 'Hall exploration', `${t.clues} ${save.clues.length}/6 · ${save.clues.map(id => t.clueNames[id]).join(' / ') || (language === 'zh' ? '尚无线索' : 'No clues yet')}`)}<div class="ice-route-link"></div>${node('core', language === 'zh' ? '镜心对质' : 'Confrontation', language === 'zh' ? '三段记忆与路线合流' : 'Memories and route converge')}<div class="ice-route-choice-grid ice-response-branches">${t.responses.map(([name, desc], i) => { const id = (['trust','question'] as const)[i]; return `<div class="ice-route-choice ${save.response === id ? 'is-selected is-reached' : reached('ending') ? 'is-reached' : 'is-locked'}"><strong>${name}</strong><small>${desc}</small>${save.response === id ? `<em>${language === 'zh' ? '当前结局' : 'Selected'}</em>` : ''}</div>` }).join('')}</div><div class="ice-route-link"></div>${node('ending', language === 'zh' ? '冰镜结局' : 'The thawing', language === 'zh' ? '通往第三层' : 'A path to layer three')}</div></div></div>`
    root.innerHTML = `<div class="chapter-two ${isMap ? 'is-map' : ''}"><header class="ice-top"><button class="ice-back" id="ice-back" type="button">← ${t.back}</button><span>NAIWA <i>✦</i> ${t.chapter}</span><div class="ice-top-tools"><button class="ice-restart" id="ice-restart" type="button">${t.restart}</button><button class="ice-top-action" id="ice-routes" type="button">⌘ ${t.routes}</button><button class="ice-top-action ice-fullscreen" id="ice-fullscreen" type="button" aria-pressed="${isAppFullscreen(root)}">${isAppFullscreen(root) ? t.exitFullscreen : t.fullscreen}</button><button class="ice-language" id="ice-language" type="button">${language === 'zh' ? 'EN' : '中文'}</button></div></header><main class="ice-layout"><div class="ice-heading"><span>${t.chapter.toUpperCase()} / 02</span><h1>${t.title}</h1><p>${t.subtitle}</p></div>${isMap ? `<div class="ice-world" id="ice-world"></div><div class="ice-map-foot"><span>${t.mapHint}</span><strong>${t.clues} ${save.clues.length}/6</strong></div>` : `<section class="ice-narrative" style="--ice-art:url('/images/${art}.webp')"><div class="ice-atmosphere" aria-hidden="true"></div><div class="ice-copy"><div class="ice-index">${String(save.line + 1).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}</div><div class="ice-speaker">${line?.[0] ?? ''}</div><p>${lineText}</p>${showVoice ? `<button class="ice-voice" id="ice-voice" type="button">♪ ${t.voicePlay}</button>` : ''}${showSpokenVoice ? `<button class="ice-voice" id="ice-character-voice" type="button">♪ ${t.characterVoiceStop}</button>` : ''}${save.phase === 'threshold' && save.line === lines.length - 1 ? `<div class="ice-approaches" role="group" aria-label="${t.choose}">${t.approaches.map(([name, description], i) => `<button data-approach="${i}" type="button"><strong>${String(i + 1).padStart(2, '0')} · ${name}</strong><small>${description}</small></button>`).join('')}</div>` : save.phase === 'core' && save.line === lines.length - 1 ? `<div class="ice-approaches ice-response-options" role="group" aria-label="${t.choose}">${t.responses.map(([name, description], i) => `<button data-response="${i}" type="button"><strong>${String(i + 1).padStart(2, '0')} · ${name}</strong><small>${description}</small></button>`).join('')}</div>` : save.phase === 'ending' && save.line === lines.length - 1 ? `<div class="ice-end"><strong>${t.complete}</strong><span>${t.completeNote}</span><button id="ice-finish" type="button">${t.back} →</button></div>` : `<button class="ice-next" id="ice-next" type="button">${save.phase === 'threshold' ? t.enter : t.next} <span>↗</span></button>`}</div></section>`}${routesOpen ? `<div class="ice-routes-scrim" id="ice-routes-scrim"><section class="ice-routes-dialog" role="dialog" aria-modal="true" aria-labelledby="ice-routes-title"><header><div><span>NAIWA / 02</span><h2 id="ice-routes-title">${t.routesTitle}</h2></div><button id="ice-routes-close" type="button" aria-label="${t.close}">×</button></header>${routeTree}</section></div>` : ''}</main></div>`
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
    if (showSpokenVoice && !routesOpen) {
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
    root.querySelector('#ice-back')?.addEventListener('click', () => { stopVoice(); stopCharacterVoice(); clearMap(); onBack(language) })
    root.querySelector('#ice-restart')?.addEventListener('click', () => { if (window.confirm(t.restartConfirm)) { stopVoice(); clearMap(); save = blank(); persist(); render() } })
    const closeRoutes = () => { routesOpen = false; root.querySelector('#ice-routes-scrim')?.remove() }
    root.querySelector('#ice-routes')?.addEventListener('click', () => {
      if (routesOpen) return
      routesOpen = true
      root.querySelector('.ice-layout')?.insertAdjacentHTML('beforeend', `<div class="ice-routes-scrim" id="ice-routes-scrim"><section class="ice-routes-dialog" role="dialog" aria-modal="true" aria-labelledby="ice-routes-title"><header><div><span>NAIWA / 02</span><h2 id="ice-routes-title">${t.routesTitle}</h2></div><button id="ice-routes-close" type="button" aria-label="${t.close}">×</button></header>${routeTree}</section></div>`)
      root.querySelector('#ice-routes-close')?.addEventListener('click', closeRoutes)
      root.querySelector('#ice-routes-scrim')?.addEventListener('click', event => { if (event.target === event.currentTarget) closeRoutes() })
    })
    root.querySelector('#ice-fullscreen')?.addEventListener('click', async () => {
      const target = root.ownerDocument.getElementById('app') ?? root
      await toggleAppFullscreen(target)
      updateFullscreenLabel()
    })
    const mouseButton = root.querySelector<HTMLButtonElement>('#ice-voice')
    if (mouseButton && !routesOpen) {
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
