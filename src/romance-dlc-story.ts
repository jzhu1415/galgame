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
  { id: 'shore', start: 'shore', image: 'dlc-coastal-shore', title: b('退潮后的小秘密', 'A Secret at Low Tide'), note: b('海岸寻迹 · 解开旅馆留下的路线', 'Coastal trail · Follow the innkeeper’s clues'), stamp: b('一起走过的海岸', 'Our coastal trail') },
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
    n('恋爱后的一个月末，我终于攒下两天连在一起的假期。奶蛙把海边小旅馆的确认信放到桌上，下面压着两张车票。', 'At the end of a month together, I finally had two days off in a row. Naiwa put the seaside inn’s confirmation on the table, with two train tickets underneath.'),
    p('你什么时候订的？', 'When did you book this?'),
    w('你说想听真正的海浪的时候。我先留了房，等你确认能请假才付的钱。', 'When you said you wanted to hear real waves. I held a room and waited until your leave was approved before paying.'),
    n('这次我们把电脑留在家里，只带一个小旅行袋。袋底塞好换洗衣服，剩下的空位最多还能放两样东西。', 'This time we would leave our computers at home and share one small travel bag. After packing clothes, there was room for only two more things.'),
    w('薄毯、保温壶，还有录音机。我都想带，但拎着走海边会累。你来选两样？', 'The blanket, the thermos, and the recorder. I would love all three, but carrying them along the shore might be tiring. Will you choose two?'),
  ], next: 'departure-train' },
  'departure-train': { episode: 'departure', lines: [
    n('最后一班沿海列车慢慢离开站台。我把旅行袋塞到座位下面，奶蛙坐在靠窗的一侧，给我留了半扇窗的风景。', 'The last coastal train pulled away. I slid our bag under the seat. Naiwa sat by the window and left half the view for me.'),
    w('我做了一页很满的行程表。但你要是想发呆，我们可以一项也不做。', 'I made a very full itinerary. But if you would rather daydream, we do not have to do any of it.'),
    p('给我看看。至少挑一件只在这里才能做的事。', 'Let me see it. Let us choose at least one thing we can only do here.'),
    n('表上写着海岸步道和山上的观星台。我把纸摊在两个人膝盖之间，列车过弯时，我们同时伸手按住它。', 'The list had a coastal trail and a hilltop observatory. I spread it across our knees. When the train rounded a bend, we both reached to hold it down.'),
  ], choices: [{ text: b('留出时间，认真找海岸上的秘密', 'Leave time to look for the coastal secret'), next: 'departure-route' }, { text: b('先不赶行程，路上遇见什么就停下来', 'Leave room to stop whenever something catches our eye'), next: 'departure-slow' }] },
  'departure-route': { episode: 'departure', lines: [
    w('那我负责看路线，你负责提醒我抬头看海。别到最后只记得地图。', 'Then I will watch the route, and you remind me to look up at the sea. I do not want to remember only the map.'),
    p('成交。走错了也算我们一起发现的新路线。', 'Deal. If we get lost, that is a new route we discovered together.'),
  ], next: 'departure-end' },
  'departure-slow': { episode: 'departure', lines: [
    w('那行程表翻过来。空白这一面，就写我们真正去过的地方。', 'Then let us turn the itinerary over. We can write the places we actually visit on the blank side.'),
    n('奶蛙把第一项写成“并排坐着看海”。我接过笔，在旁边打了一个勾。', 'Naiwa wrote “sit together and watch the sea” as the first item. I took the pen and checked it off.'),
  ], next: 'departure-end' },
  'departure-end': { episode: 'departure', ending: true, lines: [
    n('下车时天还没完全黑。我们找到旅馆，柜台上有一叠手绘路线卡，背面写着：退潮以后，给愿意慢慢走的人。', 'It was not quite dark when we arrived. At the inn, we found hand-drawn trail cards. On the back: After low tide, for those willing to walk slowly.'),
    w('明天一起去看看吧。今天先睡好，不用把假期也过成赶作业。', 'Let us take a look tomorrow. Tonight, we should rest. A holiday should not feel like homework.'),
    p('好。闹钟定晚一点。', 'All right. We will set the alarm a little later.'),
  ] },
  shore: { episode: 'shore', activity: 'trail', lines: [
    n('退潮后，旅馆老板把一张小地图递给我们。海边有个给旅客准备的留言盒，找到的人可以取一颗海玻璃，留一张纸条。', 'After low tide, the innkeeper handed us a little map. A visitor box by the shore held sea glass. Anyone who found it could take a piece and leave a note.'),
    w('每一颗都是海磨圆的，不能带走活的贝壳。他特意写了这一句。', 'Every piece has been rounded by the sea. Do not take living shells. He made a point of writing that down.'),
    n('路线卡上只有三句：先找替船照路的；再找让船停下的；最后找听得见海的。三个标记被风吹得皱巴巴。', 'The card had three clues: First, what guides a ship. Then, what holds it still. Last, what lets you hear the sea. The wind had creased the symbols.'),
    p('灯塔、船锚、贝壳。我们照顺序走，应该就能找到那个盒子。', 'A lighthouse, an anchor, and a shell. If we follow them in order, we should find the box.'),
    w('你选路线，我跟你走。想不出来就一起想，不用假装你什么都会。', 'Choose the route, and I will come with you. If we get stuck, we can work it out together. You do not have to know everything.'),
  ], next: 'shore-found' },
  'shore-found': { episode: 'shore', lines: [
    n('我们走过灯塔和旧船锚，最后在贝壳标记旁找到留言盒。盒子里的海玻璃不是宝石，奶蛙却把它举到阳光下看了很久。', 'We passed the lighthouse and the old anchor, then found the box beside the shell marker. The sea glass was no jewel, but Naiwa held it to the sunlight for a long time.'),
    w('原来没什么特别的东西，也能因为两个人一起找到，变得特别。', 'Something ordinary can become special just because we found it together.'),
    p('写什么留给下一个人？', 'What should we write for the next person?'),
  ], choices: [{ text: b('写下今天的风向和最容易走错的岔口', 'Leave the wind direction and a warning about the confusing turn'), next: 'shore-help' }, { text: b('留一句“找到这里的人，今天都值得被拥抱”', 'Write: “Whoever found this deserves a hug today”'), next: 'shore-wish' }] },
  'shore-help': { episode: 'shore', lines: [
    n('我写路线，奶蛙补了一句“脚下湿的时候别跑”。纸条没有漂亮的修辞，却是我们认真走过的经验。', 'I wrote the directions. Naiwa added, “Do not run when the ground is wet.” It was not poetry, but it came from a walk we had shared.'),
    w('下次来，说不定能看到别人给我们的回复。', 'Perhaps next time we come, someone will have left a reply.'),
  ], next: 'shore-end' },
  'shore-wish': { episode: 'shore', lines: [
    w('那我是不是也算找到这里的人？', 'Do I count as someone who found it?'),
    p('当然。可以抱一下吗？', 'Of course. May I hug you?'),
    n('奶蛙点头，我才把它轻轻抱住。海风从我们旁边吹过去，把纸条的一角掀起来。', 'Naiwa nodded before I gently held it. The sea breeze lifted a corner of our note.'),
  ], next: 'shore-end' },
  'shore-missed': { episode: 'shore', lines: [
    n('我们沿海走了很久，没找到留言盒。奶蛙用笔在地图上圈出走过的路，把另一半留白。', 'We walked along the coast for a long time without finding the box. Naiwa marked the paths we had taken and left the rest blank.'),
    w('下次再来，不就还有一个理由？今天的海也没有白看。', 'Now we have a reason to come back. We still got to see the sea today.'),
    p('那这张地图留好。下一次，我们从这里继续。', 'Then keep the map. Next time, we can start here.'),
  ], next: 'shore-end' },
  'shore-end': { episode: 'shore', ending: true, lines: [
    n('回旅馆前，我们在海堤上脱下鞋，倒掉鞋里少得可怜却怎么也倒不完的沙。奶蛙先笑，我也跟着笑。', 'Before returning to the inn, we took off our shoes on the seawall. There was hardly any sand in them, yet it never seemed to run out. Naiwa laughed, and so did I.'),
    w('今晚还能去看星星。你先休息，我来查上山的车。', 'We can still see the stars tonight. You rest; I will check the bus up the hill.'),
  ] },
  rain: { episode: 'rain', lines: [
    n('傍晚，观星台发来临时关闭的通知。玻璃上很快爬满雨痕，奶蛙捏着已经买好的车票，没有立刻说话。', 'That evening, the observatory sent a closure notice. Rain soon covered the window. Naiwa held the bus tickets and stayed quiet for a moment.'),
    p('有点失望？', 'A little disappointed?'),
    w('嗯。想让你看见我在网上看过的那片星空。但天气不是我能安排的。', 'Yes. I wanted you to see the sky I had found online. But I cannot arrange the weather.'),
    n('前台借给我们一台旧星空投影仪。窗外的雨没停，屋里还有一整晚可以重新安排。', 'The front desk lent us an old star projector. The rain was still falling, but we had a whole evening to make a new plan.'),
  ], choices: [{ text: b('把天花板变成星空，办一场两人天文课', 'Turn the ceiling into a private planetarium'), next: 'rain-stars' }, { text: b('收集雨声和海浪，给旅行录一张声音明信片', 'Make an audio postcard from the rain and waves'), next: 'rain-sound' }] },
  'rain-stars': { episode: 'rain', lines: [
    n('投影仪转起来，星点慢慢越过天花板。奶蛙把说明书反着拿，我没有提醒，等它念到“先摘下镜头盖”才一起笑出来。', 'The projector turned, and stars drifted across the ceiling. Naiwa held the instructions upside down. I waited until it read “remove the lens cap first,” and we both laughed.'),
    w('这位同学，天文老师临时换成你。你来讲，讲错也可以。', 'The astronomy teacher has just been replaced. You can teach. Mistakes are allowed.'),
    p('那今天只认一颗星。找到以后，剩下的时间都放假。', 'Then we will learn one star tonight. Once we find it, class is over.'),
  ], next: 'rain-end' },
  'rain-sound': { episode: 'rain', lines: [
    p('不用录得好听。先记一句：我们现在在海边，外面下雨。', 'It does not have to sound polished. Start with: We are by the sea, and it is raining outside.'),
    w('然后记一句：本来打算看星星，后来发现，听你说话也很好。', 'Then add: We planned to see the stars, but it turned out that listening to you was lovely, too.'),
    n('我念完开头，奶蛙接着念。中间有几秒谁也没说话，只听见雨声；我们没有把那段空白删掉。', 'I read the opening, and Naiwa continued. For a few seconds neither of us spoke. There was only rain. We kept that silence in the recording.'),
  ], next: 'rain-end' },
  'rain-end': { episode: 'rain', ending: true, lines: [
    { ...n('我们把没用上的车票夹进地图。它没有成为一次失败的约会，只变成了一场没有在行程表上的夜晚。', 'We tucked the unused bus tickets into the map. It was not a failed date, just an evening the itinerary had never predicted.'), blanketText: b('我们裹着出发前选的那条薄毯，并排坐到雨声变轻。没用上的车票夹进地图，这晚却不用重新买票，也值得留下。', 'We sat under the blanket we had packed until the rain grew softer. The unused tickets went inside the map. This evening needed no ticket to be worth keeping.') },
    w('谢谢你没有急着说“这有什么”。我只是失望一下，现在好多了。', 'Thank you for not rushing to say it was no big deal. I needed a moment to feel disappointed. I feel better now.'),
    p('明早再看海吧。醒不来就睡到自然醒。', 'Let us see the sea tomorrow morning. If we do not wake up early, we can sleep in.'),
  ] },
  dawn: { episode: 'dawn', finale: true, lines: [
    n('清晨，雨停了。我醒来时奶蛙正轻手轻脚地找外套，看见我睁眼，就停下来等。', 'By dawn, the rain had stopped. I woke to find Naiwa quietly looking for a jacket. When it saw my eyes open, it waited.'),
    w('要一起去海堤吗？你还困的话，我可以回来陪你吃早饭。', 'Would you like to walk to the seawall? If you are still sleepy, I can come back and have breakfast with you.'),
    p('一起去。最后这一段路，不能让你一个人走。', 'Let us go together. I would not want you to walk this last stretch alone.'),
    n('旅馆给了两只信封，让我们给以后的自己写一封信。纸是空白的，这次没有人替我们安排要写什么。', 'The inn gave us two envelopes for letters to our future selves. The pages were blank. This time, no one had planned what we should write.'),
  ], next: 'dawn-promise' },
  'dawn-tide': { episode: 'dawn', ending: true, lines: [
    n('我倒出保温壶里还热的水。奶蛙把海玻璃放在信纸上压住，风没有再把纸吹跑。', 'I poured the still-warm water from the thermos. Naiwa used the sea glass to weigh down the letter, and the wind could no longer steal it.'),
    w('我写好了：以后就算忙，也要给两个人留一趟不用赶的旅行。', 'Mine is ready: Even when we are busy, make room for a journey neither of us has to rush.'),
    p('我的最后一句是，下次退潮，我们还一起来。', 'My last line says: When the tide goes out again, let us come back together.'),
    n('我们交换信封，没有马上拆开。海玻璃留在我的口袋里，奶蛙的手留在我手里。', 'We exchanged envelopes without opening them yet. The sea glass stayed in my pocket. Naiwa’s hand stayed in mine.'),
  ] },
  'dawn-sound': { episode: 'dawn', ending: true, lines: [
    n('我打开录音机，把雨夜那段放给奶蛙听。它听见自己说到一半笑起来的声音，也跟着笑了。', 'I played our rainy-night recording. Naiwa heard its own laugh halfway through a sentence and laughed again.'),
    w('以后忙得没空出来，就听这个。我们真的有过这样的一晚。', 'When we are too busy to come out here, let us listen to this. We really did have an evening like this.'),
    p('下一段录今天的海。我们不用等很久，才有新的声音。', 'Let us record the sea today. We do not have to wait long to have something new to hear.'),
    n('我在信上写下录音的日期。信封不厚，却装得下一个晚上、一阵雨，和我们都没有删掉的沉默。', 'I wrote the date of the recording on the letter. The envelope was thin, but it held an evening, a rainstorm, and the silence we had kept.'),
  ] },
  'dawn-promise': { episode: 'dawn', ending: true, lines: [
    w('我没有写什么很大的愿望。只写了下一次还想和你出门。', 'I did not write a grand wish. Just that I want to go somewhere with you again.'),
    p('那我也不写保证每天都开心。遇见下雨的那一天，我们一起改计划。', 'Then I will not promise every day will be happy. When a rainy day comes, we can change the plan together.'),
    n('奶蛙把信封认真收好。回程的车票夹在昨天那页地图里，空白的地方，我们又添上了一行：下次再来。', 'Naiwa carefully put the envelopes away. The return tickets went inside yesterday’s map. In the blank space, we added one line: Come back next time.'),
  ] },
}
