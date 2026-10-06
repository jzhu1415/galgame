import type { Bilingual } from './story'

export type TheatreMemory = 'rain' | 'breakfast' | 'film'
export type TheatreEnding = 'saved' | 'bargained' | 'exhausted'
export type TheatreSpeaker = 'narrator' | 'naifen' | 'naiba' | 'researcher' | 'journal' | 'me'
export type TheatreLine = { speaker: TheatreSpeaker; text: Bilingual }
export type TheatreChoice = { id: string; text: Bilingual; detail: Bilingual; next: string; spirit?: number; pollution?: number; memory?: TheatreMemory; verifyRoute?: boolean; requiresRoute?: boolean; trade?: 'real' | 'fake' }
export type TheatreNode = { title: Bilingual; act: number; art: 'hospital' | 'theatre' | 'rain' | 'breakfast' | 'film' | 'backstage'; character?: boolean; lines: TheatreLine[]; next?: string; choices?: TheatreChoice[]; map?: boolean; ending?: TheatreEnding }
export type TheatreSave = { version: 1; node: string; line: number; spirit: number; pollution: number; memories: TheatreMemory[]; routeVerified: boolean; trade: 'real' | 'fake' | null; visited: string[]; history: { node: string; line: number }[]; endings: TheatreEnding[] }
const b = (zh: string, en: string): Bilingual => ({ zh, en })
const n = (zh: string, en: string): TheatreLine => ({ speaker: 'narrator', text: b(zh, en) })
const s = (speaker: TheatreSpeaker, zh: string, en: string): TheatreLine => ({ speaker, text: b(zh, en) })
const c = (id: string, zh: string, en: string, descZh: string, descEn: string, next: string, effects: Partial<TheatreChoice> = {}): TheatreChoice => ({ id, text: b(zh, en), detail: b(descZh, descEn), next, ...effects })
export const theatreMemoryIds: TheatreMemory[] = ['rain', 'breakfast', 'film']
export const theatreEndingIds: TheatreEnding[] = ['saved', 'bargained', 'exhausted']
export const theatreSpeakers: Record<TheatreSpeaker, Bilingual> = { narrator: b('旁白', 'Narration'), naifen: b('奶粉', 'Naifen'), naiba: b('奶霸', 'Naiba'), researcher: b('研究员', 'Researcher'), journal: b('奶蛙观察日记', 'Naiwa\'s journal'), me: b('我', 'Me') }
export const theatreMemoryNames: Record<TheatreMemory, Bilingual> = { rain: b('雨夜 · 歪斜的伞', 'Rain · The tilted umbrella'), breakfast: b('早餐 · 焦掉的松饼', 'Breakfast · The burnt pancake'), film: b('录像 · 偏转的车头', 'Film · The turning wheels') }
export const theatreEndingNames: Record<TheatreEnding, Bilingual> = { saved: b('落幕之后', 'After the curtain'), bargained: b('掌声里的空位', 'An empty seat in the applause'), exhausted: b('无人谢幕', 'No curtain call') }

export const theatreStory: Record<string, TheatreNode> = {
  invitation: { title: b('虚假的援手', 'An offer of help'), act: 0, art: 'hospital', lines: [
    n('电梯上的“三”亮了很久。回到病房时，一个陌生人已经坐在奶蛙床边，膝上放着银色箱子。', 'The elevator display had been stuck on 3 for a while. When I got back to the ward, a stranger was sitting by Naiwa’s bed with a silver case on his lap.'),
    s('researcher', '我们研究过这样的昏迷。你带回来的碎片，让他有了反应。下一层，我们可以帮你。', 'We’ve studied cases like this. Naiwa responded to the fragments you brought back. We can help you with the next layer.'),
    n('他递过一段录像。雨还没落下来，奶霸就站在路口，右手按着控制器。车辆随他的手指转弯。', 'He handed me a recording. Before the rain began, Naiba stood at the junction with a controller in his right hand. A car turned as he moved his finger.'),
    s('me', '这段录像从哪儿来的？为什么现在才给我？', 'Where did you get this? Why show me now?'),
    s('researcher', '先让奶蛙醒来。我们只需要下一层的碎片，其他问题可以等治疗结束。', 'Let’s get Naiwa awake first. All we need is the next fragment. We can discuss the rest after treatment.'),
    n('箱子里是一枚探针，和一张印着我名字的同意书。签名栏下面还有一行小字：血液样本，待采集。', 'The case held a probe and a consent form printed with my name. Below the signature line: blood sample, pending collection.'),
    s('journal', '第三层，血肉剧场。掌声最大的时候，别忘了看台下。', 'Layer Three: the Flesh Theatre. When the applause gets loud, look at the seats.'),
  ], choices: [
    c('probe', '带上组织探针', 'Take the institute’s probe', '进入更轻松，但探针让头痛加重。', 'An easier entry, though the probe makes the headache worse.', 'threshold', { spirit: 8, pollution: 14 }),
    c('journal', '只带日记进入', 'Enter with the journal', '不用探针，潜入时会多消耗精神力。', 'Without the probe, entering costs more spirit.', 'threshold', { spirit: -6 }),
  ] },
  threshold: { title: b('第三声铃', 'The third bell'), act: 0, art: 'theatre', lines: [
    n('我把血滴在奶蛙额头。医院的墙向两侧退开，红色帷幕贴着我的肩膀落下。有人在黑暗里数：一、二、三。', 'I touched a drop of blood to Naiwa\'s forehead. The ward walls drew apart. Red curtains fell against my shoulders. Someone in the dark counted: one, two, three.'),
    n('观众席是空的，掌声却从每张椅子里传来。舞台上摆着餐桌、雨窗和一台放映机，头顶的红线缓慢收紧。', 'The seats were empty, but applause came from every chair. A table, a rainy window, and a projector stood on stage. Red threads tightened overhead.'),
    n('一个粉色身影背对着我。它猛地拽下一根线，窗里的雨夜碎成纸片，掌声立刻更响。', 'A pink figure stood with its back to me. It pulled down a thread. The rainy night in the window shattered into scraps, and the applause grew louder.'),
    s('naifen', '你来得太迟了。我把这出戏砸掉一次，它就再演一次。你看，他们连我的手都摆好了。', 'You’re late. I wreck the stage, and the whole thing starts over. Look. They’ve even put my hands where they want them.'),
    s('me', '你叫什么？', 'What’s your name?'),
    s('naifen', '奶粉。别喊错了。你要看戏，就站远一点；你要带我走，就别碰那些线。', 'Naifen. Don’t get it wrong. Here to watch? Stay back. Here to get me out? Leave those threads alone.'),
  ], next: 'meeting' },
  meeting: { title: b('粉色的演员', 'The pink performer'), act: 0, art: 'theatre', character: true, lines: [
    n('奶粉的肚皮是浅色的，眼睛绿得像窗边那盆小植物。它手心被红线勒出凹痕，却还抓着一张皱掉的剧本。', 'Naifen’s belly was pale, its eyes the same green as the plant by our window. Red threads had cut into its palms, but it was still clutching a crumpled script.'),
    s('naifen', '这上面写着：你受伤，我生气，然后我把所有东西都打碎。每次都一样。', 'It says you get hurt. Then I get angry and smash everything. Same thing every time.'),
    n('幕后的紫色影子抬起右手。所有吊线同时绷直，像是奶霸正在指挥整场演出。奶粉攥紧了拳头。', 'A purple shadow raised its right hand behind the curtain. Every thread pulled taut, as if Naiba were directing the show. Naifen clenched its fists.'),
    s('naifen', '我不想再看你倒下去。要不……我先把门砸了？', 'I don’t want to watch you fall again. Maybe… I could smash the door first?'),
    s('me', '先别砸。让我看看那三幕，不该每一幕都是这样。', 'Don’t smash it yet. Let me see those three acts. They can’t all have been like this.'),
    s('journal', '看清道具，别只盯着撞车那一刻。找齐三段记忆，再去幕后。', 'Look at the props, not just the crash. Find all three memories before going backstage.'),
  ], next: 'explore' },
  explore: { title: b('血肉剧场', 'The Flesh Theatre'), act: 1, art: 'theatre', map: true, lines: [] },
  rain: { title: b('第一幕 · 雨夜', 'Act I · Rain'), act: 1, art: 'rain', character: true, lines: [
    n('雨窗亮了。两个纸箱并排摆在巷口，一个干净，一个泡得塌了边。两段影像同时伸手，等我选。', 'The window lit up with rain. In the alley stood two boxes, one clean and one sagging from the water. A figure reached out from each scene, waiting for me to choose.'),
    s('naifen', '右边那出戏里，你说永远不会离开。然后车灯亮了。每次我都会去挡，每次都来不及。', 'In the one on the right, you promise you’ll never leave. Then the headlights come on. I try to get in front of you, but I’m always too late.'),
    n('左边的影像很安静。伞尖歪向纸箱，奶蛙的半边身子还在淋雨。它忙着护住箱里的东西，没顾上看我。', 'The left-hand recording was quiet. The umbrella tilted over the box. Half of Naiwa was still in the rain. It was busy keeping its things dry.'),
    s('me', '那时候我们还没约定什么。我只是把伞留给了你。', 'We hadn’t promised each other anything yet. I only left you an umbrella.'),
    s('naifen', '这段到这里就完了？后面没有车？', 'This one ends here? No car after it?'),
  ], choices: [
    c('rain-real', '留下歪斜的伞', 'Keep the tilted umbrella', '纸箱有雨痕，伞没有遮住全身。', 'The box is wet, and half of Naiwa is still out in the rain.', 'rain-kept', { memory: 'rain', spirit: 4 }),
    c('rain-fake', '留下永不离开的誓言', 'Keep the promise of forever', '画面里只有誓言和撞击，没有日常细节。', 'The scene skips straight from the promise to the crash.', 'rehearsal', { spirit: -16, pollution: 10 }),
  ] },
  'rain-kept': { title: b('伞下的一角', 'A corner under the umbrella'), act: 1, art: 'rain', character: true, lines: [
    s('naifen', '箱子里有我的东西……我那时候只顾着别让它淋湿。', 'My things were in the box… I was just trying to keep them dry.'),
    n('奶粉松开拳头，窗上的雨终于向下落。纸片合成一角记忆，我把它收进日记。', 'Naifen unclenched its fists. Rain finally fell down the window. The scraps joined into a memory, and I tucked it into the journal.'),
  ], next: 'explore' },
  breakfast: { title: b('第二幕 · 早餐', 'Act II · Breakfast'), act: 1, art: 'breakfast', character: true, lines: [
    n('餐桌转了半圈。左边的松饼焦了一小块，杯子上有歪歪的小星星。右边的餐盘漂亮得像广告。', 'The table turned halfway around. On the left, a pancake had a burnt edge beside a mug with crooked stars. On the right, everything looked ready for an advertisement.'),
    s('naifen', '漂亮的那盘，你一定会喜欢吧？我照着剧本做了好多遍。', 'You’d like that perfect one, wouldn’t you? I’ve made it so many times, just like the script says.'),
    n('右边的“我”只说了一句谢谢，画面便跳到摔杯子。左边的人忙着找锅铲，奶蛙笑着问今天谁洗碗。', 'On the right, I said thanks, and the scene jumped to a smashed cup. On the left, I was looking for the spatula while Naiwa laughed and asked who was doing the dishes.'),
    s('me', '那块焦掉的，是我走神了。你说还可以吃，把好的一半推给我。', 'That burnt bit was my fault. I wasn’t paying attention. You said we could still eat it and gave me the good half.'),
    s('naifen', '剧本没写这件事。它说，做不好就会被丢掉。', 'The script doesn’t say that. It says if I get it wrong, you’ll throw me away.'),
  ], choices: [
    c('breakfast-real', '留下焦掉的松饼', 'Keep the burnt pancake', '星星杯、锅铲和洗碗的玩笑都在。', 'The star mug, the spatula, and our joke about the dishes remain.', 'breakfast-kept', { memory: 'breakfast', spirit: 4 }),
    c('breakfast-fake', '留下完美的餐盘', 'Keep the perfect plate', '看起来更美，但没有做饭的过程。', 'It looks better, but nothing shows how we cooked it.', 'rehearsal', { spirit: -16, pollution: 10 }),
  ] },
  'breakfast-kept': { title: b('没洗完的碗', 'Dishes still in the sink'), act: 1, art: 'breakfast', character: true, lines: [
    s('naifen', '这桌子……算了，先不砸了。明天还在这儿吃饭？', 'This table… Fine. I’ll leave it alone. Can we eat here tomorrow?'),
    s('me', '嗯。吃完一起洗碗。', 'Yeah. We’ll wash up afterward.'),
    n('餐桌边的红线断了一根。奶粉把焦掉的那半块松饼放回盘子，记忆落在我手里。', 'A thread snapped beside the table. Naifen put the burnt half back on the plate. The memory settled in my hand.'),
  ], next: 'explore' },
  film: { title: b('第三幕 · 车灯', 'Act III · Headlights'), act: 1, art: 'film', lines: [
    n('放映机里卡着两卷胶片。组织给我的那卷，只反复播放奶霸按下控制器的手。', 'Two reels were caught in the projector. The institute\'s reel repeated only Naiba\'s hand pressing the controller.'),
    n('另一卷从雨前开始。奶霸站在路口，车辆向我驶来。撞击前一秒，车头却偏向了我身旁的护栏。', 'The other began before the rain. Naiba stood at the junction. The car headed toward me, then turned toward the barrier beside me a second before impact.'),
    s('me', '他确实操控了车。可为什么在最后一秒转向？', 'So he was controlling the car. Why steer away at the last second?'),
    s('naifen', '别替他解释。我还记得奶蛙倒下去。你也记得，对不对？', 'Don’t make excuses for him. I remember Naiwa falling. You remember too, don’t you?'),
    s('me', '我没忘。整卷留下，我要他当面解释。', 'I haven’t forgotten. We’re keeping the whole reel. I want him to explain it to my face.'),
  ], choices: [
    c('film-real', '保留转向前后的完整片段', 'Keep the footage around the turn', '保留肇事证据，也保留无法解释的一秒。', 'Keep the proof of his involvement and the unexplained second.', 'film-kept', { memory: 'film' }),
    c('film-fake', '只保留按控制器的画面', 'Keep only the controller shot', '证据更直接，但时间顺序被截断。', 'It shows his hand on the controller, but cuts out what happened next.', 'rehearsal', { spirit: -16, pollution: 10 }),
  ] },
  'film-kept': { title: b('不能剪掉的一秒', 'A second that must remain'), act: 1, art: 'film', lines: [
    n('胶片烧出一小块空白。我护住两端，奶霸的手和偏转的车轮终于留在同一段记录里。', 'A blank patch burned into the film. I protected both ends. Naiba\'s hand and the turning wheels remained in the same recording.'),
    s('naifen', '好。可是等你问他的时候，我也要在场。', 'All right. But when you ask him, I want to be there.'),
  ], next: 'explore' },
  rehearsal: { title: b('又一次排演', 'Another rehearsal'), act: 1, art: 'theatre', character: true, lines: [
    n('掌声震得座椅发抖。场景越演越快，所有细节消失，只剩我倒下去的那一刻。头痛猛地加重。', 'Applause shook the seats. The scene accelerated until every detail vanished except the moment I fell. Pain stabbed through my head.'),
    s('naifen', '停一下！它又要让我砸东西了……你刚刚选的那段，少了什么？', 'Stop! It’s making me break things again… What was missing from the scene you chose?'),
    s('journal', '记忆没有留下。回舞台，再看看被跳过的地方。', 'The memory didn’t hold. Go back to the stage and look at what the scene skipped.'),
  ], next: 'explore' },
  route: { title: b('夹在剧本里的路线', 'Directions inside the script'), act: 1, art: 'backstage', lines: [
    n('后台墙上贴着组织的导览图：“请走正门”。地图把最亮的门圈了起来，门把上缠着和探针一样的银线。', 'The institute’s guide said to take the main door. It circled the brightest entrance, whose handle was wrapped in the same silver wire as the probe.'),
    n('奶粉的剧本里夹着另一张手绘图。三个圆点依次画着：星星杯、歪伞、车轮。终点是一扇不起眼的侧门。', 'A hand-drawn map lay in Naifen’s script. Three dots showed a star mug, a tilted umbrella, and a wheel, ending at an unremarkable side door.'),
    n('我走近正门，手里的记忆开始发热。侧门边有三道浅浅的划痕，像戴着金属手甲的人留下的。', 'The memories in my hand grew hot as I neared the main door. By the side door were three shallow scratches, the kind a metal gauntlet might leave.'),
    s('naifen', '我只走过亮的那扇。每次进去，出来都更想砸东西。你想试哪边？', 'I’ve only used the bright door. Every time I come out, I want to break things more. Which one will you try?'),
  ], choices: [
    c('route-side', '核对三件道具，走侧门', 'Match the three props; take the side door', '路线图与真实记忆的物件吻合。', 'The map matches the objects in the real memories.', 'route-kept', { verifyRoute: true }),
    c('route-main', '照组织导览，推开正门', 'Follow the institute’s guide to the main door', '门更亮，里面传来“治疗已经准备好”。', 'A voice behind the brighter door says treatment is ready.', 'trap', { spirit: -24, pollution: 15 }),
  ] },
  'route-kept': { title: b('侧门后的空容器', 'An empty vessel behind the side door'), act: 1, art: 'backstage', lines: [
    n('我依次碰过星星杯、歪伞和车轮。侧门打开，没有掌声。架子上放着一个与组织箱子里一模一样的空容器。', 'I touched the star mug, the umbrella, then the wheel. The side door opened without applause. On a shelf sat an empty vessel identical to the institute\'s.'),
    n('容器底部残留粉色颜料，外壁却亮得像真碎片。我收起它，把路线图折进日记。', 'Pink pigment clung to the bottom. Its walls glowed like a real fragment. I pocketed it and folded the map into the journal.'),
    s('journal', '容器外形相同。交易时别拿错。', 'The vessels look the same. Don’t hand over the wrong one.'),
  ], next: 'explore' },
  trap: { title: b('没有出口的掌声', 'Applause without an exit'), act: 1, art: 'backstage', character: true, lines: [
    n('门内没有病床。银线贴上我的手腕，日记的字一行行变淡。我退了一步，鞋底却粘在地上。', 'There was no bed behind the door. Silver wires caught my wrist. The journal\'s words faded line by line. I tried to step back, but my shoes stuck to the floor.'),
    s('naifen', '别听它的，抓住我！这次我只砸门，不砸你。', 'Don\'t listen to it. Hold onto me! This time I\'ll break the door, not you.'),
    n('奶粉拽着我退回观众席。正门重新亮起来，里面仍用同样温和的语气说：治疗已经准备好。', 'Naifen pulled me back into the auditorium. The door lit up again, repeating in the same gentle voice: treatment is ready.'),
  ], next: 'explore' },
  confrontation: { title: b('车是哪来的', 'Who brought the car'), act: 2, art: 'backstage', lines: [
    n('三幕记忆归位，舞台后露出一道医院走廊。奶霸站在走廊尽头，把发光容器递给组织的人。', 'The three memories settled into place. A hospital corridor appeared backstage. At its far end, Naiba handed a glowing vessel to an institute employee.'),
    s('researcher', '东西给你。下一次，别让他自己选路。', 'Here are his things. Next time, don\'t let him choose his own route.'),
    n('奶霸接过我的旧手机。屏幕上还是奶蛙做早餐的照片。我不知道它什么时候被拿走了。', 'Naiba took my old phone. Its screen still showed Naiwa making breakfast. I hadn\'t known it was missing.'),
    s('me', '录像我看了。那辆车，是不是你控制的？', 'I saw the footage. Did you control that car?'),
    s('naiba', '车确实是我引来的。', 'I did bring the car.'),
    n('奶粉从我身后冲出去，扯断一排红线。空椅子同时向前翻，像一群看不见的人急着起身。', 'Naifen rushed past me and tore down a row of threads. Empty seats tipped forward as though an invisible crowd were rising.'),
    s('naiba', '恨就恨吧。先把奶粉带出去，别再让他们取你的血。', 'Hate me if you want. Get Naifen out first. Don’t let them take any more of your blood.'),
    n('组织的人转身离开。奶霸抬手砸碎了交易容器，里面没有碎片，只有一滩发亮的颜料。他仍不肯看我。', 'The employee left. Naiba smashed the vessel he’d handed over. Glowing paint spilled out, with no fragment in it. He still wouldn’t look at me.'),
    s('me', '你引来的车，还叫我听你的？等奶蛙醒了，我们再算这笔账。', 'You brought that car, and you still expect me to listen? When Naiwa wakes up, we’re settling this.'),
  ], next: 'bargain' },
  bargain: { title: b('治疗的价码', 'The price of treatment'), act: 2, art: 'backstage', character: true, lines: [
    n('帷幕后，组织的探针亮了。研究员的声音传过来，温和得像病房里的第一次见面。', 'The probe lit up behind the curtain. I heard the researcher’s voice, just as gentle as it had been in the ward.'),
    s('researcher', '把三段记忆放进容器。我们会立刻开始治疗，你不必再留在这里。', 'Put all three memories in the vessel. We’ll begin treatment immediately. You won’t need to stay here.'),
    s('naifen', '等一下。你要给他们哪一个？别连我也装进箱子里。', 'Wait. Which one are you giving them? Don’t put me in that box too.'),
    n('手里的真碎片微微发热。我听到奶蛙床边的监护声，隔着帷幕，一声接一声。', 'The real fragment warmed in my hand. Naiwa’s monitor beeped beyond the curtain, one beat after another.'),
  ], choices: [
    c('trade-real', '交出真碎片，换取治疗', 'Trade the real fragment for treatment', '接受组织的承诺，让他们带走记忆。', 'Accept the promise and let the institute take the memories.', 'real-trade', { trade: 'real', pollution: 25 }),
    c('trade-fake', '用空容器交换，保留真碎片', 'Trade the decoy; keep the real fragment', '需要先调查幕后路线，找到替代容器。', 'First verify the backstage route and find the decoy vessel.', 'fake-trade', { trade: 'fake', requiresRoute: true }),
    c('return-stage', '先回舞台核对路线', 'Return to the stage and check the route', '暂缓交易，调查剧本里的手绘图。', 'Delay the bargain and investigate the hand-drawn map.', 'explore'),
  ] },
  'fake-trade': { title: b('藏在掌心的记忆', 'Memories held close'), act: 2, art: 'backstage', character: true, lines: [
    n('我把颜料注入空容器。研究员接过它，亮光遮住了底部。他说治疗开始了，帷幕却没有打开。', 'I poured paint into the empty vessel. Its glow hid the bottom as the researcher took it. He said treatment had started, but the curtain stayed shut.'),
    s('me', '奶粉，真正的记忆在这里。我没有把你交给他们。', 'Naifen, the real memories are here. I didn’t hand you over.'),
    s('naifen', '那他们要是回来抢呢？我可以把整个剧场……', 'What if they come back to take them? I could smash the whole theatre…'),
  ], next: 'comfort' },
  comfort: { title: b('剧本以外的一句', 'A line outside the script'), act: 2, art: 'theatre', character: true, lines: [
    n('奶粉攥住最后一根吊线。舞台裂缝里涌出掌声，催促它动手。记忆在我掌心一闪一闪。', 'Naifen held the final thread. Applause poured from a crack in the stage, urging it on. The memories flickered in my palm.'),
    s('naifen', '我一想起来就想砸东西，忍不住。你是不是也嫌我烦了？', 'Every time I remember it, I want to smash something. I can’t help it. Are you sick of me too?'),
  ], choices: [
    c('comfort-listen', '我在听。先跟我出去，好不好？', 'I’m listening. Let’s get out of here first, okay?', '伸出手，等奶粉松开吊线。', 'Hold out your hand and wait for Naifen to release the thread.', 'saved'),
    c('comfort-order', '立刻停下，你会毁掉一切', 'Stop now. You’ll destroy everything.', '奶粉听见命令，再次攥紧剧本；可以重新回应。', 'Naifen tightens its grip on the script. You’ll get another chance to answer.', 'resistance', { spirit: -12, pollution: 8 }),
  ] },
  resistance: { title: b('又一道命令', 'Another order'), act: 2, art: 'theatre', character: true, lines: [
    s('naifen', '他们也这么说。停下，站好，照着演。可我到底什么时候能说我疼？', 'That\'s what they say too. Stop. Stand there. Follow the script. When do I get to say it hurts?'),
    n('红线又收紧了一寸。我把命令咽回去，重新伸出手。', 'The thread tightened another inch. I swallowed the order and offered my hand again.'),
  ], next: 'comfort' },
  'real-trade': { title: b('过于安静的舞台', 'A stage too quiet'), act: 2, art: 'theatre', character: true, lines: [
    n('真碎片离开掌心。探针的灯变绿，研究员说奶蛙的心率正在恢复。我几乎松了一口气。', 'The real fragment left my palm. The probe turned green. The researcher said Naiwa\'s pulse was recovering. I almost felt relieved.'),
    s('naifen', '等一下……那把伞是什么颜色？你昨天和我说过，我现在记不清了。', 'Wait… What color was the umbrella? You told me yesterday. I can\'t remember now.'),
    n('奶粉盯着空餐盘，试着笑了一下。它没有再砸东西，可我叫它时，它迟了很久才转头。', 'Naifen stared at the empty plate and tried to smile. It stopped breaking things. When I called its name, it took a long time to turn.'),
    n('帷幕上打出“治疗完成”。幕后的监护声仍在重复同一段，连呼吸的间隔也没有变化。', 'The curtain announced that treatment was complete. The monitor behind it repeated the same sequence, down to the gaps between breaths.'),
  ], next: 'bargained' },
  saved: { title: b('落幕之后', 'After the curtain'), act: 3, art: 'theatre', character: true, ending: 'saved', lines: [
    s('naifen', '那……先不砸。可是我明天还想骂他，你还听吗？', 'Then… I’ll leave it alone. But if I still want to curse him out tomorrow, will you listen?'),
    s('me', '能。我们还要去问清楚车祸的事。', 'Yes. We still need answers about the crash.'),
    n('奶粉自己松开吊线，把手放进我掌心。红色帷幕落下，这次没有掌声。第三层碎片融入日记，肚皮上那道勒痕慢慢浅了。', 'Naifen let go of the thread and placed its hand in mine. The curtain fell without applause. The third fragment settled into the journal; the groove across its belly began to fade.'),
    n('回到病房，奶蛙的手掌轻轻合拢，握住了我的指尖。我等了很久，它还没有睁眼。', 'Back in the ward, Naiwa’s hand closed around my fingers. I waited for a long time, but its eyes stayed shut.'),
    s('me', '我不会把你的记忆交出去。奶霸的事，我也不会当作没发生。', 'I won’t give your memories away. And I won’t pretend Naiba’s part in this never happened.'),
    n('楼梯口，奶霸擦过组织探针的屏幕。记录着我血液波形的那一栏突然熄灭，只剩一阵失控的火花。', 'On the stairs, Naiba ran a hand across the probe’s screen. The trace labeled with my blood sample went dark in a spray of sparks.'),
    s('naiba', '账记着。我等你来问，别死在下面。', 'Keep score. I’ll be here when you come to ask. Don’t die down there.'),
    n('我把手绘路线图收好。下一层的门像笼子一样，在电梯倒影里缓缓合上。', 'I put the hand-drawn map away. In the lift’s reflection, the next door slowly closed like a cage.'),
  ] },
  bargained: { title: b('掌声里的空位', 'An empty seat in the applause'), act: 3, art: 'theatre', ending: 'bargained', lines: [
    n('回到病房，奶蛙的手指动了一下。我低头去找日记里的第三层，纸上只剩一个空白的圆。', 'Back in the ward, Naiwa\'s finger moved. I looked for Layer Three in the journal. Only a blank circle remained.'),
    n('探针的绿色灯一直亮着，太阳穴却越来越疼。我打开手机，早餐照片里的星星杯变成了模糊的一团。', 'The probe stayed green, but my temples hurt more and more. On my phone, the star mug in the breakfast photograph had become a blur.'),
    s('naiba', '你把什么给了他们？', 'What did you give them?'),
    s('me', '他们说能让奶蛙醒。你有什么资格质问我？', 'They said they could wake Naiwa up. Who are you to question me?'),
    n('他没回答，只把手甲按在探针上。屏幕爆出火花，我以为他又在毁掉证据。', 'He didn’t answer. He pressed his gauntlet against the probe until sparks burst from the screen. To me, it looked like he was destroying evidence again.'),
    n('电梯的“四”亮起来。我仍能往下走，但背后空椅子里的掌声，好像跟到了现实。', 'The elevator display lit up with a 4. I could still go down. Behind me, I thought I could hear the applause from those empty seats.'),
  ] },
  exhausted: { title: b('无人谢幕', 'No curtain call'), act: 3, art: 'theatre', ending: 'exhausted', lines: [
    n('我想往侧门走，腿却没有跟上。掌声越来越远，舞台的灯一盏接一盏熄灭。', 'I tried to get to the side door, but my legs wouldn’t move. The applause faded as the stage lights went out one by one.'),
    s('naifen', '别闭眼。你还没告诉我，明天谁洗碗……', 'Don’t close your eyes. You haven’t told me whose turn it is to wash up tomorrow…'),
    n('日记从手里滑落。医院的监护声突然拉成一条长线，这次没有下一幕。', 'The journal slipped from my hand. The hospital monitor became a single unbroken tone. There would be no next act.'),
  ] },
}

export function newTheatreSave(endings: TheatreEnding[] = []): TheatreSave {
  return { version: 1, node: 'invitation', line: 0, spirit: 80, pollution: 0, memories: [], routeVerified: false, trade: null, visited: ['invitation'], history: [], endings: [...endings] }
}
const clamp = (value: unknown, max: number, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback
export function normalizeTheatreSave(raw: unknown): TheatreSave {
  if (!raw || typeof raw !== 'object') return newTheatreSave()
  const data = raw as Partial<TheatreSave>
  if (data.version !== 1 || typeof data.node !== 'string' || !Object.hasOwn(theatreStory, data.node)) return newTheatreSave()
  const validNode = (id: unknown): id is string => typeof id === 'string' && Object.hasOwn(theatreStory, id)
  const memories = Array.isArray(data.memories) ? [...new Set(data.memories.filter(id => theatreMemoryIds.includes(id)))] : []
  const save: TheatreSave = {
    version: 1, node: data.node, line: clamp(data.line, Math.max(0, theatreStory[data.node].lines.length - 1)), spirit: clamp(data.spirit, 100, 80), pollution: clamp(data.pollution, 100), memories,
    routeVerified: data.routeVerified === true, trade: data.trade === 'real' || data.trade === 'fake' ? data.trade : null,
    visited: Array.isArray(data.visited) ? [...new Set(data.visited.filter(validNode)), data.node].filter((id, i, ids) => ids.indexOf(id) === i) : [data.node],
    history: Array.isArray(data.history) ? data.history.filter(entry => entry && validNode(entry.node) && Number.isInteger(entry.line) && entry.line >= 0 && entry.line < theatreStory[entry.node].lines.length).slice(-200) : [],
    endings: Array.isArray(data.endings) ? [...new Set(data.endings.filter(id => theatreEndingIds.includes(id)))] : [],
  }
  if (save.spirit === 0 && !theatreStory[save.node].ending) { save.node = 'exhausted'; save.line = 0 }
  if (['confrontation', 'bargain', 'fake-trade', 'real-trade', 'comfort', 'resistance', 'saved', 'bargained'].includes(save.node) && memories.length < 3) { save.node = 'explore'; save.line = 0 }
  if (['fake-trade', 'comfort', 'resistance', 'saved'].includes(save.node) && (!save.routeVerified || save.trade !== 'fake')) { save.node = 'bargain'; save.line = 0 }
  if (['real-trade', 'bargained'].includes(save.node) && save.trade !== 'real') { save.node = 'bargain'; save.line = 0 }
  if (save.node === 'exhausted') save.spirit = 0
  if (!save.visited.includes(save.node)) save.visited.push(save.node)
  return save
}
export function enterTheatreNode(save: TheatreSave, id: string): TheatreSave {
  if (!Object.hasOwn(theatreStory, id)) return save
  const next = save.spirit === 0 && !theatreStory[id].ending ? 'exhausted' : id
  return { ...save, node: next, line: 0, visited: [...new Set([...save.visited, next])] }
}
export function applyTheatreChoice(save: TheatreSave, id: string): TheatreSave {
  const node = theatreStory[save.node]
  if (save.line < node.lines.length - 1) return save
  const choice = node.choices?.find(item => item.id === id)
  if (!choice || (choice.requiresRoute && !save.routeVerified)) return save
  const firstMemory = !choice.memory || !save.memories.includes(choice.memory)
  return enterTheatreNode({ ...save, spirit: clamp(save.spirit + (firstMemory ? choice.spirit ?? 0 : 0), 100), pollution: clamp(save.pollution + (choice.pollution ?? 0), 100), memories: choice.memory ? [...new Set([...save.memories, choice.memory])] : save.memories, routeVerified: save.routeVerified || !!choice.verifyRoute, trade: choice.trade ?? save.trade }, choice.next)
}
export function advanceTheatre(save: TheatreSave): TheatreSave {
  const node = theatreStory[save.node]
  if (save.line < node.lines.length - 1) return { ...save, line: save.line + 1 }
  if (node.ending) return { ...save, endings: [...new Set([...save.endings, node.ending])] }
  return node.next ? enterTheatreNode(save, node.next) : save
}
export function openTheatreLocation(save: TheatreSave, id: TheatreMemory | 'route' | 'confrontation'): TheatreSave {
  if (save.node !== 'explore') return save
  if (id === 'confrontation' && save.memories.length < 3) return save
  if (!['rain', 'breakfast', 'film', 'route', 'confrontation'].includes(id)) return save
  // Re-reading recovered acts does not drain or replenish spirit.
  const cost = theatreMemoryIds.includes(id as TheatreMemory) && !save.memories.includes(id as TheatreMemory) ? 4 : 0
  return enterTheatreNode({ ...save, spirit: Math.max(0, save.spirit - cost) }, id)
}
