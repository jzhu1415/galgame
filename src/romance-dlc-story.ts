import type { Language } from './story'
type Text = Record<Language, string>
export type RomanceLine = { speaker: 'narrator' | 'player' | 'naiwa'; text: Text; happy?: boolean; blanketText?: Text }
export type RomanceNode = { episode: string; lines: RomanceLine[]; choices?: { text: Text; next: string }[]; next?: string; ending?: boolean; activity?: 'pack' | 'trail'; finale?: boolean }
const b = (zh: string, en: string): Text => ({ zh, en })
const n = (zh: string, en: string): RomanceLine => ({ speaker: 'narrator', text: b(zh, en) })
const p = (zh: string, en: string): RomanceLine => ({ speaker: 'player', text: b(zh, en) })
const w = (zh: string, en: string, happy = false): RomanceLine => ({ speaker: 'naiwa', text: b(zh, en), happy })
export const romanceEpisodes = [
  { id: 'departure', start: 'departure', image: 'dlc-coastal-train', title: b('去海边的末班车', 'The Last Train to the Coast'), note: b('旅程前夜 · 为两个人整理行李', 'Before the trip · Pack for two'), stamp: b('两张车票', 'Two tickets') },
  { id: 'shore', start: 'shore', image: 'dlc-coastal-shore', title: b('退潮后的小秘密', 'A Secret at Low Tide'), note: b('海岸寻迹 · 解开旅馆留下的路线', 'Coastal trail · Follow the innkeeper\'s clues'), stamp: b('一起走过的海岸', 'Our coastal trail') },
  { id: 'rain', start: 'rain', image: 'dlc-coastal-rain', title: b('没有星星的观星夜', 'A Stargazing Night without Stars'), note: b('意外下雨 · 重新安排这场约会', 'An unexpected storm · Make a new plan'), stamp: b('雨夜的备用计划', 'Our rainy-night plan') },
  { id: 'dawn', start: 'dawn', image: 'dlc-coastal-dawn', title: b('寄给以后的我们', 'To Our Future Selves'), note: b('清晨海堤 · 写下这趟旅行的结尾', 'Dawn on the seawall · A letter to keep'), stamp: b('潮汐写给你的信', 'A Letter from the Tide') },
] as const
export const packingItems = [
  { id: 'blanket', title: b('薄毯', 'A light blanket'), note: b('海边夜里会凉，能一起裹着坐。', 'For sitting together when the sea breeze turns cold.') },
  { id: 'thermos', title: b('保温壶', 'A thermos'), note: b('奶蛙说想在日出前喝到热的。', 'Naiwa wanted something warm before sunrise.') },
  { id: 'recorder', title: b('小录音机', 'A pocket recorder'), note: b('把海浪和沿途的声音带回家。', 'Bring the sound of the sea home with us.') },
] as const
export const trailOrder = ['lighthouse', 'anchor', 'shell'] as const
export function romanceTrailResult(path: string[]) {
  if (path.length < 3) return 'pending'
  return path.length === 3 && path.every((id, index) => id === trailOrder[index]) ? 'found' : 'retry'
}
export function romanceFinale(gear: string[], treasure: boolean, rainChoice?: string) {
  if (treasure && gear.includes('thermos')) return 'dawn-tide'
  if (gear.includes('recorder') && rainChoice === 'rain-sound') return 'dawn-sound'
  return 'dawn-promise'
}
export const romanceStory: Record<string, RomanceNode> = {
  departure: { episode: 'departure', activity: 'pack', lines: [
    n('月底，我总算能连休两天。奶蛙往桌上放了一张海边旅馆的订单，底下还压着两张车票。', 'At the end of the month, I finally had two days off in a row. Naiwa put the booking confirmation for a seaside inn on the table, with two train tickets underneath.'),
    p('你什么时候订的？', 'When did you book this?'),
    w('就你说想去听海那天啊。房间先留着，等你假批了才付的钱。', 'Remember when you said you wanted to hear the waves? I reserved a room that day. Didn\'t pay until your time off was approved.'),
    n('这次我们把电脑留在家里，只带一个小旅行袋。袋底塞好换洗衣服，剩下的空位最多还能放两样东西。', 'We were leaving our computers at home and sharing one small bag. With our clothes packed, we could squeeze in two more things.'),
    w('毯子、保温壶、录音机……怎么都塞不下。你帮我挑两样，剩下那个放家里。', 'The blanket, the thermos, the recorder… They won\'t all fit. Help me pick two. We\'ll leave the other one here.'),
  ], next: 'departure-train' },
  'departure-train': { episode: 'departure', lines: [
    n('末班车开了。我把袋子塞进座位底下，奶蛙往窗边挪了挪，我们挤在一起往外看。', 'The last train pulled out. I shoved the bag under our seats. Naiwa shifted toward the window, and we squeezed together to look outside.'),
    w('行程我写好了……好像写多了。你看看，累的就划掉。', 'I\'ve made an itinerary… Might have got carried away. Have a look. Cross out anything that sounds tiring.'),
    p('拿来看看。都到海边了，总得出去走走。', 'Let me see. We\'re going all the way to the coast. We should get out at least once.'),
    n('表上写着海岸步道和山上的观星台。我把纸摊在两个人膝盖之间，列车过弯时，我们同时伸手按住它。', 'The list had a coastal trail and a hilltop observatory. I spread it across our knees. When the train rounded a bend, we both reached to hold it down.'),
  ], choices: [{ text: b('留出时间，认真找海岸上的秘密', 'Leave time to look for the coastal secret'), next: 'departure-route' }, { text: b('先不赶行程，路上遇见什么就停下来', 'Leave room to stop whenever something catches our eye'), next: 'departure-slow' }] },
  'departure-route': { episode: 'departure', lines: [
    w('那我负责看路线，你负责提醒我抬头看海。别到最后只记得地图。', 'I\'ll watch the map. You remind me to look up now and then, or I\'ll miss the whole sea.'),
    p('行。你别光顾着看地图，把我带沟里去了。', 'Deal. Just don\'t get so caught up in the map that you lead us into a ditch.'),
  ], next: 'departure-end' },
  'departure-slow': { episode: 'departure', lines: [
    w('那先不看了。背面空着，走到哪儿记到哪儿吧。', 'Let\'s put it aside, then. The back\'s blank. We can write down where we end up.'),
    n('奶蛙把第一项写成“并排坐着看海”。我接过笔，在旁边打了一个勾。', 'Naiwa wrote “sit together and watch the sea” as the first item. I took the pen and checked it off.'),
  ], next: 'departure-end' },
  'departure-end': { episode: 'departure', ending: true, lines: [
    n('下车时天还没黑透。旅馆柜台上放着一叠手绘路线卡，背面写着“退潮后再走”。奶蛙拿了一张。', 'It wasn\'t quite dark when we arrived. A stack of hand-drawn trail cards lay on the inn\'s counter. “Wait until low tide,” said the back. Naiwa took one.'),
    w('明天去？我今天走不动了，想先睡一觉。', 'Want to go tomorrow? I\'m too tired to walk any farther today. I need some sleep.'),
    p('好。闹钟定晚一点。', 'Okay. Let\'s set the alarm a bit later.'),
  ] },
  shore: { episode: 'shore', activity: 'trail', lines: [
    n('退潮后，旅馆老板把一张小地图递给我们。海边有个给旅客准备的留言盒，找到的人可以取一颗海玻璃，留一张纸条。', 'Once the tide went out, the innkeeper gave us a little map. There was a box of sea glass somewhere along the shore. Find it, take a piece, leave a note.'),
    w('你看，还写着别捡活贝壳。我们拿玻璃就好。', 'Look, it says to leave live shells alone. We\'ll stick to the glass.'),
    n('路线卡上只有三句：先找替船照路的；再找让船停下的；最后找听得见海的。三个标记被风吹得皱巴巴。', 'The card had three clues: find what guides a ship, then what holds it still, then what lets you hear the sea. The wind had crumpled the card around its three symbols.'),
    p('灯塔、船锚、贝壳。我们照顺序走，应该就能找到那个盒子。', 'A lighthouse, an anchor, and a shell. If we follow them in order, we should find the box.'),
    w('那你带路。走错了我可要笑你的。', 'You lead, then. If we get lost, I\'m going to laugh at you.'),
  ], next: 'shore-found' },
  'shore-found': { episode: 'shore', lines: [
    n('过了灯塔和旧船锚，我们在贝壳标记旁找到了盒子。奶蛙挑出一颗海玻璃，举到太阳底下，翻来覆去地看。', 'Past the lighthouse and the old anchor, we found the box beside the shell marker. Naiwa picked out a piece of sea glass and kept turning it in the sunlight.'),
    w('跑了这么远，就这么一小颗啊……还挺好看的。你看。', 'All that way for this little thing… It\'s pretty, though. Here, look.'),
    p('写什么留给下一个人？', 'What should we write for the next person?'),
  ], choices: [{ text: b('写下今天的风向和最容易走错的岔口', 'Write down the wind direction and the turn we nearly missed'), next: 'shore-help' }, { text: b('写一句“找到啦，抱一下！”', 'Write: “Found it! Time for a hug!”'), next: 'shore-wish' }] },
  'shore-help': { episode: 'shore', lines: [
    n('我把容易走错的岔口写上，奶蛙在下面补了一句：“地上湿，别跑。”我们把纸条折好，放进盒子。', 'I noted the turn where we\'d nearly gone wrong. Naiwa added, “Wet ground. Don\'t run.” We folded the note and put it in the box.'),
    w('下次来，说不定能看到别人给我们的回复。', 'Maybe someone will leave us a reply. We can check next time.'),
  ], next: 'shore-end' },
  'shore-wish': { episode: 'shore', lines: [
    w('我也找到了。我的呢？', 'I found it too. Where\'s mine?'),
    p('有。过来让我抱一下？', 'Right here. Come over for a hug?'),
    n('奶蛙点头，我才把它轻轻抱住。海风从我们旁边吹过去，把纸条的一角掀起来。', 'Naiwa nodded, and I put my arms around it. The sea breeze lifted one corner of our note.'),
  ], next: 'shore-end' },
  'shore-missed': { episode: 'shore', lines: [
    n('我们沿海走了很久，没找到留言盒。奶蛙用笔在地图上圈出走过的路，把另一半留白。', 'We walked along the coast for a long time without finding the box. Naiwa marked the paths we had taken and left the rest blank.'),
    w('先不找了，脚都酸了。地图留着，下次再来。', 'Let\'s call it a day. My feet hurt. Keep the map. We\'ll try again next time.'),
    p('那这张地图留好。下一次，我们从这里继续。', 'Keep that map safe, then. We\'ll pick up here next time.'),
  ], next: 'shore-end' },
  'shore-end': { episode: 'shore', ending: true, lines: [
    n('回旅馆前，我们在海堤上脱下鞋，倒掉鞋里少得可怜却怎么也倒不完的沙。奶蛙先笑，我也跟着笑。', 'Before heading back to the inn, we sat on the seawall and emptied our shoes. There was barely any sand, but somehow it kept coming out. Naiwa started laughing. So did I.'),
    w('今晚还能去看星星。你先休息，我来查上山的车。', 'We can still go stargazing tonight. Take a break. I\'ll look up the bus.'),
  ] },
  rain: { episode: 'rain', lines: [
    n('傍晚，观星台发来临时关闭的通知。玻璃上很快爬满雨痕，奶蛙捏着已经买好的车票，没有立刻说话。', 'That evening, we got a message saying the observatory was closed. Rain streaked the window. Naiwa looked down at the bus tickets without saying anything.'),
    p('有点失望？', 'Disappointed?'),
    w('嗯。照片上那么多星星，我还想指给你看呢。票都买了……', 'Yeah. There were so many stars in the photos. I wanted to point them out to you. We even bought the tickets…'),
    n('前台借了台旧星空投影仪给我们。窗外雨没停，我把它放到桌上，找了个插座。', 'The front desk lent us an old star projector. It was still raining. I set it on the table and found a socket.'),
  ], choices: [{ text: b('打开投影仪，在房间里认星星', 'Switch on the projector and find stars on the ceiling'), next: 'rain-stars' }, { text: b('录下雨声，再说几句话留着听', 'Record the rain and a few words to listen to later'), next: 'rain-sound' }] },
  'rain-stars': { episode: 'rain', lines: [
    n('奶蛙拿着说明书研究了半天，念出一句“先摘下镜头盖”。我们看着桌上那台黑着的投影仪，一起笑了。摘掉盖子，星点终于爬上天花板。', 'Naiwa puzzled over the instructions, then read out, “Remove the lens cap first.” We looked at the dark projector and started laughing. Once we took the cap off, stars finally spread across the ceiling.'),
    w('好了，老师换你。刚才那句不许录下来。', 'Right. Your turn to teach. And you\'d better not have recorded that.'),
    p('那就认一颗。认完睡觉。', 'One star, then. After that, bed.'),
  ], next: 'rain-end' },
  'rain-sound': { episode: 'rain', lines: [
    p('开了啊。我们现在在海边，外面下雨……你接着说。', 'It\'s recording. We\'re at the coast, and it\'s raining outside… Your turn.'),
    w('本来要去看星星的，现在窝在房间里。旁边这个人，正等着我没话说。', 'We were supposed to be looking at stars. We\'re in our room instead, and this one\'s waiting for me to run out of things to say.'),
    n('我念完开头，奶蛙接着念。中间有几秒谁也没说话，只听见雨声；我们没有把那段空白删掉。', 'I read the opening, and Naiwa continued. For a few seconds neither of us spoke. There was only rain. We kept that silence in the recording.'),
  ], next: 'rain-end' },
  'rain-end': { episode: 'rain', ending: true, lines: [
    { ...n('我把没用上的车票夹进地图。窗外雨声渐小，我们还坐着，谁也没去开灯。', 'I tucked the unused tickets into the map. The rain grew quieter outside. We stayed where we were, neither of us getting up to turn on the light.'), blanketText: b('我把没用上的车票夹进地图，拉过薄毯盖住我们俩。奶蛙往我这边挪了一点，坐到雨声渐渐小了。', 'I tucked the unused tickets into the map and pulled the blanket over us. Naiwa moved a little closer. We sat there as the rain grew quieter.') },
    w('刚才还有点不高兴。现在不想动了，就这么坐着吧。', 'I was still in a bad mood a bit ago. Now I just want to sit here with you.'),
    p('嗯。明早醒得早就去看海，醒不来再说。', 'Okay. If we\'re up early, we\'ll go down to the sea. If not, we\'ll see.'),
  ] },
  dawn: { episode: 'dawn', finale: true, lines: [
    n('清晨，雨停了。我醒来时奶蛙正轻手轻脚地找外套，看见我睁眼，就停下来等。', 'The rain had stopped by morning. I woke to Naiwa trying to find a jacket without making a sound. It saw I was awake and stopped to wait.'),
    w('醒了？我想去海堤。你再睡会儿，还是一起？', 'You\'re awake? I\'m going to the seawall. Coming, or going back to sleep?'),
    p('等我穿件衣服。', 'Give me a second to get dressed.'),
    n('旅馆送了两只信封，说可以给以后的自己写封信。我们带到海堤上，一人拿一张纸，半天没下笔。', 'The inn had given us two envelopes so we could write to our future selves. On the seawall, we each sat with a blank sheet. Neither of us knew how to start.'),
  ], next: 'dawn-promise' },
  'dawn-tide': { episode: 'dawn', ending: true, lines: [
    n('我倒出保温壶里还热的水。奶蛙把海玻璃放在信纸上压住，风没有再把纸吹跑。', 'I poured out some water from the thermos. It was still hot. Naiwa set the sea glass on the letter to stop it blowing away.'),
    w('写好了。下次还来，行李少带一点。', 'Done. It says we should come back, but pack less next time.'),
    p('我的最后一句是，下次退潮，我们还一起来。', 'I ended mine with “Let\'s come back together at low tide.”'),
    n('我们换了信封，约好回家再拆。我把海玻璃揣进口袋，腾出手来牵住奶蛙。', 'We swapped envelopes and agreed to open them at home. I slipped the sea glass into my pocket and took Naiwa\'s hand.'),
  ] },
  'dawn-sound': { episode: 'dawn', ending: true, lines: [
    n('我打开录音机，把雨夜那段放给奶蛙听。它听见自己说到一半笑起来的声音，也跟着笑了。', 'I played our rainy-night recording. Naiwa heard its own laugh halfway through a sentence and laughed again.'),
    w('回家以后别删啊。刚才我笑得是不是有点傻？', 'Don\'t delete it when we get home. Did my laugh sound a bit silly?'),
    p('自己听。听完再录一段，今天没下雨的。', 'Listen for yourself. Then we\'ll record today\'s sea, without the rain.'),
    n('我把录音日期写在信上，免得回去找不到。奶蛙等我收好信，才按下录音键。海浪声里，能听见我们翻纸的声音。', 'I wrote the recording date in the letter so we could find it later. Naiwa waited until I put the letter away, then pressed record. Under the waves, you could hear our papers rustling.'),
  ] },
  'dawn-promise': { episode: 'dawn', ending: true, lines: [
    w('我就写了一句，下次还想跟你出来。你写了什么？', 'I just wrote that I want to take another trip with you. What did you put?'),
    p('跟你差不多。不过下次出门，先看天气预报。', 'About the same. Though next time, we should check the weather first.'),
    n('奶蛙把信封认真收好。回程的车票夹在昨天那页地图里，空白的地方，我们又添上了一行：下次再来。', 'Naiwa carefully put the envelopes away. The return tickets went inside yesterday\'s map. In the blank space, we added one line: Come back next time.'),
  ] },
}
