export type Language = 'zh' | 'en'
export type Bilingual = { zh: string; en: string }
export type MemoryId = 'toy' | 'gift' | 'photo'

export interface Line {
  speaker?: Bilingual
  text: Bilingual
  when?: 'uneasy' | 'secure'
}

export interface Choice {
  text: Bilingual
  next: string
  affection?: number
  anxiety?: number
  spirit?: number
  danger?: number
  memory?: MemoryId
  unlessMemory?: MemoryId
  requiresAllMemories?: boolean
}

export interface Scene {
  image: string
  mood: 'real' | 'threshold' | 'dream' | 'ending'
  chapter: Bilingual
  lines: Line[]
  next?: string
  choices?: Choice[]
  ending?: 'missed' | 'embrace' | 'escape' | 'exhausted' | 'true'
}

const b = (zh: string, en: string): Bilingual => ({ zh, en })
const n = (zh: string, en: string): Line => ({ text: b(zh, en) })
const say = (zh: string, en: string, nameZh = '奶蛙', nameEn = 'naiwa'): Line => ({ speaker: b(nameZh, nameEn), text: b(zh, en) })
const diary = (zh: string, en: string): Line => ({ speaker: b('奶蛙观察日记', 'naiwa’s journal'), text: b(zh, en) })
const c = (zh: string, en: string, next: string, effects: Partial<Choice> = {}): Choice => ({ text: b(zh, en), next, ...effects })

export const memoryNames: Record<MemoryId, Bilingual> = {
  toy: b('最爱的玩具', 'Favorite toy'),
  gift: b('第一份礼物', 'First gift'),
  photo: b('两人的合照', 'Our photo'),
}

export const story: Record<string, Scene> = {
  p01: {
    image: 'P01', mood: 'real', chapter: b('序章 · 雨夜', 'Prologue · A rainy night'),
    lines: [
      n('加班后的城市，只剩雨声陪我走回家。', 'After another late shift, the rain was my only company on the way home.'),
      n('巷口的纸箱轻轻动了一下。', 'A cardboard box stirred at the mouth of the alley.'),
    ], next: 'p02',
  },
  p02: {
    image: 'P02', mood: 'real', chapter: b('序章 · 相遇', 'Prologue · The meeting'),
    lines: [
      n('我掀开纸箱。里面坐着一个浑身湿透的小家伙，冷得发抖，却先冲我笑了。', 'I lifted the box. The little creature inside was soaked and shivering, yet it smiled at me first.'),
      say('吓到你了吗？抱歉！我只是想躲一会儿雨。', 'Did I startle you? Sorry! I was only hiding from the rain.'),
      say('我叫奶蛙。流浪有一阵子啦，不过今晚好像运气不错。', 'I’m naiwa. I’ve been wandering for a while, but tonight might be my lucky night.'),
      n('它说得轻松，手却冻得发僵。', 'It sounded cheerful, though its hands were stiff with cold.'),
    ], choices: [
      c('带它回家，给它一条干毛巾', 'Take naiwa home and offer a dry towel', 'p03a', { affection: 20 }),
      c('把伞留给它，先行离开', 'Leave naiwa the umbrella and go', 'p03b', { affection: 5, anxiety: 10 }),
    ],
  },
  p03a: {
    image: 'P03A', mood: 'real', chapter: b('序章 · 一条毛巾', 'Prologue · A towel'),
    lines: [
      n('我伸出手，奶蛙愣了半秒，随即用两只短手接过毛巾。', 'I reached out. naiwa paused for a moment, then took the towel in both small hands.'),
      say('真的可以跟你回去？太好了！我会尽量不添麻烦的。', 'I can really come with you? Thank you! I’ll try not to be a bother.'),
    ], next: 'p04a',
  },
  p03b: {
    image: 'P03B', mood: 'real', chapter: b('序章 · 留下的伞', 'Prologue · The umbrella'),
    lines: [
      n('我把伞留在纸箱旁。奶蛙撑起伞，朝我用力挥手。', 'I left my umbrella beside the box. naiwa opened it and waved with all its might.'),
      say('谢谢你！明天也要顺利呀！', 'Thank you! I hope tomorrow is kind to you!'),
      n('走出几步后，我又回了头。那把伞还停在雨中，像一盏小小的灯。', 'A few steps later, I looked back. The umbrella was still there, a tiny lantern in the rain.'),
      n('第二天，我再次经过巷口。它认出了我，我们聊了很久。后来，奶蛙走进了我的生活。', 'The next day, I passed the alley again. It remembered me. We talked for a long time, and soon naiwa became part of my life.'),
    ], next: 'p04a',
  },
  p04a: {
    image: 'P04A', mood: 'real', chapter: b('序章 · 新的日常', 'Prologue · A new routine'),
    lines: [
      n('几天后，公寓里多了两副餐具，也多了一个总想帮忙的身影。', 'A few days later, my apartment had a second place setting, and someone always eager to help.'),
      say('早餐好啦！形状有一点奇怪，但味道我有信心。', 'Breakfast is ready! The shape is a little odd, but I’m confident about the taste.'),
      n('我送它一只画着小星星的杯子。奶蛙把杯子捧了很久，后来每天都用它喝热牛奶。', 'I gave it a mug with little stars on it. naiwa held it for ages and used it for warm milk every day after that.'),
    ], next: 'p04b',
  },
  p04b: {
    image: 'P04B', mood: 'real', chapter: b('序章 · 新的日常', 'Prologue · A new routine'),
    lines: [
      n('它哼着不成调的歌打扫房间。阳光落在地板上，雨夜像是很久以前的事了。', 'It hummed off-key while cleaning. Sunlight spread across the floor, and the rainy night felt far away.'),
      n('那只旧木马玩具跟着它轻轻叮当。奶蛙总把玩具放在餐桌边，说它也是家里的一员。', 'Its worn carousel toy jingled softly as it moved. naiwa always kept it by the table and called it part of the family.'),
      say('和你一起住，平凡的一天也会变得很好。', 'Even an ordinary day feels wonderful when I’m here with you.'),
    ], next: 'p05',
  },
  p05: {
    image: 'P05', mood: 'real', chapter: b('序章 · 告白', 'Prologue · A confession'),
    lines: [
      n('那天早晨，奶蛙捧着一个认真包好的小礼物，难得紧张起来。', 'That morning, naiwa held a carefully wrapped gift and looked nervous for once.'),
      say('你……可以做我的对象吗？我会把最好的都给你。', 'Would you… be my partner? I want to give you the best of everything.'),
      n('它没有靠近，只安静等着我的回答。', 'It stayed where it was and quietly waited for my answer.'),
    ], choices: [
      c('答应奶蛙，握住它的手', 'Say yes and take naiwa’s hand', 'r01', { affection: 20 }),
      c('温柔地拒绝', 'Decline gently', 'n01'),
    ],
  },
  n01: {
    image: 'N01', mood: 'ending', chapter: b('结局 · 温柔的错过', 'Ending · A gentle parting'),
    lines: [
      n('奶蛙的笑容停了一瞬，然后它把礼物轻轻放回桌上。', 'naiwa’s smile faltered for a moment. It gently set the gift back on the table.'),
      say('我明白了。谢谢你认真告诉我。', 'I understand. Thank you for telling me honestly.'),
      n('它为我让开路。我们依然记得那个雨夜，只是故事从这里走向了不同的方向。', 'It stepped aside for me. We would both remember that rainy night, even though our stories now led in different directions.'),
    ], ending: 'missed',
  },
  r01: {
    image: 'R01_MARKET', mood: 'real', chapter: b('第一幕 · 周末的约会', 'Act I · Our first weekend out'),
    lines: [
      n('成为恋人后的第一个周末，我们没有订什么特别的行程，只拎着一个空布袋逛街角集市。', 'On our first weekend as a couple, we made no grand plans. We took an empty tote to the neighborhood market.'),
      say('那边有风铃！不过你想先去哪儿？今天我们慢慢逛。', 'There are wind chimes over there! Where would you like to go first? We have all day.'),
      n('奶蛙停在摊位前等我，眼睛却忍不住往那些叮当作响的小玩意儿上瞟。', 'naiwa waited beside the stall, though its eyes kept drifting toward the little things that chimed.'),
    ], choices: [
      c('先陪它挑一只风铃', 'Help naiwa choose a wind chime first', 'r01a', { affection: 8 }),
      c('提议先挑一盆窗边的植物', 'Suggest picking a plant for the window first', 'r01b', { affection: 8 }),
    ],
  },
  r01a: {
    image: 'R01_MARKET', mood: 'real', chapter: b('第一幕 · 风铃', 'Act I · Wind chimes'),
    lines: [
      n('我们挨个轻轻拨动风铃。奶蛙挑中一只声音很轻的，说这样不会吵醒晚归的我。', 'We listened to the chimes one by one. naiwa chose a quiet one, so it would not wake me after a late shift.'),
      say('你听，像不像雨快停的时候？', 'Listen. Doesn’t it sound like rain letting up?'),
      n('我把风铃放进布袋。它没有赶着去下一处，只牵着我沿摊位慢慢走。', 'I tucked it into the tote. naiwa took my hand, and we wandered on without hurrying.'),
    ], next: 'r02',
  },
  r01b: {
    image: 'R01_MARKET', mood: 'real', chapter: b('第一幕 · 窗边的绿意', 'Act I · A plant for the window'),
    lines: [
      n('我指向一盆小小的迷迭香。奶蛙认真闻了闻，打了个轻轻的喷嚏。', 'I pointed to a little rosemary plant. naiwa sniffed it carefully and gave a tiny sneeze.'),
      say('就它吧！以后我们轮流浇水。你挑的东西，我也想好好照顾。', 'Let’s take it home! We can water it in turns. I want to care for something you chose.'),
      n('我们把花盆安稳地放进布袋，走到风铃摊时又停下来听了一会儿。', 'We settled the pot safely in the tote, then stopped to listen at the wind chime stall.'),
    ], next: 'r02',
  },
  r02: {
    image: 'R02_KITCHEN', mood: 'real', chapter: b('第一幕 · 一起做早餐', 'Act I · Breakfast together'),
    lines: [
      n('下一个周日，奶蛙宣布要做松饼。我负责搅面糊，它负责翻面；第一张却歪得像一朵云。', 'The next Sunday, naiwa declared it pancake day. I mixed the batter and it worked the pan; the first pancake came out shaped like a cloud.'),
      say('嗯……这张算试做。你想怎么处理？', 'Well… that was a trial run. What should we do with it?'),
    ], choices: [
      c('一起再试一张，做成两人份', 'Try again together and make enough for two', 'r02a', { affection: 10, anxiety: -5 }),
      c('先尝尝这张，形状不重要', 'Taste this one first; the shape can wait', 'r02b', { affection: 8, anxiety: -5 }),
    ],
  },
  r02a: {
    image: 'R02_KITCHEN', mood: 'real', chapter: b('第一幕 · 第二张松饼', 'Act I · The second pancake'),
    lines: [
      n('我重新搅匀面糊，奶蛙在旁边数着时间。这回松饼圆了一些，边缘还是翘起一点。', 'I mixed a fresh bowl while naiwa counted the seconds. The next pancake was rounder, though one edge still curled up.'),
      say('成功一半！另一半就当是我们自己的形状。', 'Half a success! Let’s call the other half our signature shape.'),
      n('我们分着吃掉那张歪松饼，谁也没提要把它藏起来。', 'We shared the crooked one too. Neither of us suggested hiding it.'),
    ], next: 'r03',
  },
  r02b: {
    image: 'R02_KITCHEN', mood: 'real', chapter: b('第一幕 · 歪松饼', 'Act I · The crooked pancake'),
    lines: [
      n('我切下一角尝了尝。奶蛙盯着我的表情，直到我点头，才放心地咬了一口。', 'I cut off a corner to taste. naiwa watched my face, then took a bite when I nodded.'),
      say('是真的好吃，还是你在安慰我？', 'Is it really good, or are you being kind?'),
      n('我说口感还可以，下次少放一点糖。它把这条建议认真记在食谱边上。', 'I said the texture was good, but we could use less sugar next time. It wrote that beside the recipe.'),
    ], next: 'r03',
  },
  r03: {
    image: 'R03_PHOTO', mood: 'real', chapter: b('第一幕 · 窗边的合照', 'Act I · The window photograph'),
    lines: [
      n('又过了几天，我们在窗边架起一台旧相机。快门响起时，阳光正好从我身后照进来。', 'A few days later, we set an old camera by the window. The shutter clicked just as sunlight spilled in behind me.'),
      n('相纸慢慢显影。奶蛙笑得很清楚，我的脸却被逆光照得模糊。', 'The print slowly developed. naiwa’s smile was clear, while the backlight washed out my face.'),
      say('要重拍吗？还是……你喜欢这张？', 'Should we take another? Or… do you like this one?'),
    ], choices: [
      c('留下这张，它记住了今天', 'Keep it; it remembers this day', 'r03a', { affection: 10, anxiety: -5 }),
      c('再拍一张清楚的，也留下这一张', 'Take a clearer one too, and keep this one', 'r03b', { affection: 8 }),
    ],
  },
  r03a: {
    image: 'R03_PHOTO', mood: 'real', chapter: b('第一幕 · 不完美的照片', 'Act I · An imperfect photo'),
    lines: [
      n('我把相片放到窗边。奶蛙凑近看了又看，手指停在那道过亮的光上。', 'I set the print by the window. naiwa leaned in, its finger resting on the bright flare.'),
      say('脸是看不清，可我记得拍照时你在笑。', 'I can’t see your face, but I remember you smiling when we took it.'),
      n('窗台从此多了一张有点歪的合照。', 'From then on, a slightly crooked photo lived on the windowsill.'),
    ], next: 'r04',
  },
  r03b: {
    image: 'R03_PHOTO', mood: 'real', chapter: b('第一幕 · 两张照片', 'Act I · Two photographs'),
    lines: [
      n('我们又拍了一张。第二张清楚些，奶蛙还是把第一张放到了窗边。', 'We took another. The second came out clearer, but naiwa still placed the first by the window.'),
      say('这张是我们没准备好的样子。我想留着。', 'This is how we looked when we weren’t ready. I want to keep it.'),
      n('我点了点头。那道逆光留在相片上，也留在我们共同的记忆里。', 'I nodded. The patch of sunlight stayed in the print, and in our shared memory.'),
    ], next: 'r04',
  },
  r04: {
    image: 'R04_QUIET', mood: 'real', chapter: b('第一幕 · 各自的夜晚', 'Act I · A quiet evening'),
    lines: [
      n('后来我们也不总把夜晚排成约会。奶蛙写它的观察日记，我在沙发上读书。', 'Later, we stopped trying to make every evening a date. naiwa wrote in its journal while I read on the sofa.'),
      say('我想把今天记下来。你先看书，等会儿再讲给你听。', 'I want to write about today. Keep reading; I’ll tell you about it when I’m done.'),
      n('星星杯放在它手边，热牛奶冒着细细的白气。屋里很安静，却一点也不空。', 'The starry mug sat beside it, warm milk sending up a thin curl of steam. The room was quiet without feeling empty.'),
      n('几周就这样过去了。我们开始熟悉彼此的节奏，也知道有事可以开口商量。', 'Weeks passed this way. We learned each other’s rhythms, and learned we could talk when something mattered.'),
    ], next: 'a01',
  },
  a01: {
    image: 'A01', mood: 'real', chapter: b('第一幕 · 两人份的晚餐', 'Act I · Dinner for two'),
    lines: [
      n('这天我临时加班，回家比平时晚了很多。推开门时，奶蛙正把两人份的晚饭重新热好。', 'An unexpected late shift kept me out much longer than usual. When I opened the door, naiwa was reheating dinner for two.'),
      n('窗边还摆着我们的合照。那天阳光太亮，我的脸几乎被照得看不清，奶蛙却笑得很开心。', 'Our photo still stood by the window. The sunlight had washed out my face that day, while naiwa had smiled without a care.'),
      say('你回来啦！饭刚热好。先坐下歇一会儿，今天很累吧？', 'You’re home! I just warmed up dinner. Sit down and rest a little. Rough day?'),
      n('我正要回答，手机又亮了。朋友问：“你们才认识不久，真的想清楚了吗？”我看了看奶蛙，决定怎么开口。', 'I was about to answer when my phone lit up. A friend asked, “You’ve only known each other a short while. Are you sure about this?” I looked at naiwa and considered what to say.'),
    ], choices: [
      c('解释晚归，约定下次提前报平安', 'Explain the delay and promise to check in next time', 'a02a', { affection: 15, anxiety: -10 }),
      c('暂时回避，不谈今天的事', 'Avoid the conversation for now', 'a02b', { affection: -5, anxiety: 20 }),
      c('坦白朋友的劝告，认真聊聊', 'Share the friend’s concerns and talk openly', 'a02c', { anxiety: 25 }),
    ],
  },
  a02a: {
    image: 'A02A', mood: 'real', chapter: b('第一幕 · 热饭', 'Act I · A warm meal'),
    lines: [
      n('我说了今天的忙乱，也说下次会提前报平安。奶蛙把热饭推到我面前。', 'I told naiwa about the hectic day and promised to send a message next time. It pushed a warm bowl toward me.'),
      say('我不是要你汇报行程。我只是想知道，你平安到家了。', 'You never have to report every move to me. I just want to know you’re safe.'),
      n('我们靠在一起吃完晚饭。', 'We finished dinner side by side.'),
    ], next: 'a03',
  },
  a02b: {
    image: 'A02B', mood: 'real', chapter: b('第一幕 · 没说出口的话', 'Act I · Unsaid things'),
    lines: [
      n('我把手机收起来，说今天太累了。奶蛙点点头，把饭放下。', 'I put my phone away and said I was too tired. naiwa nodded and set dinner down.'),
      say('没关系。等你想说的时候，我会听。', 'That’s okay. When you want to talk, I’ll listen.'),
      n('它没有追问。只是那晚，我们之间多了一点说不清的安静。', 'It did not press me. That night, a quiet distance settled between us.'),
    ], next: 'a03',
  },
  a02c: {
    image: 'A02C', mood: 'real', chapter: b('第一幕 · 劝告', 'Act I · A friend’s warning'),
    lines: [
      n('我把朋友的话原原本本告诉了奶蛙。它听完，沉默了一会儿。', 'I told naiwa exactly what my friend had said. It listened, then sat quietly for a moment.'),
      say('我会难过，但你可以自己决定。我们能不能先聊聊？', 'It hurts to hear that, but the choice is yours. Can we talk about it first?'),
      n('我们谈了很久。疑虑没有在一夜间消失，至少它不再藏在沉默里。', 'We talked for a long time. The doubts did not vanish overnight, but they were no longer hidden in silence.'),
    ], next: 'a03',
  },
  a03: {
    image: 'A03', mood: 'threshold', chapter: b('第二幕 · 强光', 'Act II · Headlights'),
    lines: [
      n('某个雨夜，我们走在回家的路上。路口忽然亮起刺眼的车灯。', 'One rainy night, we were walking home when headlights blazed across the intersection.'),
      n('远处有人影。还没来得及看清，奶蛙已经挡在我身前。', 'There were figures in the distance. Before I could make them out, naiwa stepped in front of me.'),
      say('别怕。看着我。', 'Don’t be afraid. Look at me.'),
    ], next: 'a04',
  },
  a04: {
    image: 'A04', mood: 'threshold', chapter: b('第二幕 · 保护的代价', 'Act II · The cost of protection'),
    lines: [
      n('光从奶蛙身上涌出，将道路和那些模糊的身影一同吞没。', 'Light burst from naiwa, swallowing the road and the shadowy figures.'),
      n('等光散去，它倒在我怀里。刚才还温暖的手，慢慢失去了力气。', 'When the light faded, it collapsed into my arms. The hand that had felt so warm went still.'),
      say('你没事……就好。', 'You’re safe… that’s enough.'),
    ], next: 'm01',
  },
  m01: {
    image: 'M01', mood: 'threshold', chapter: b('第三幕 · 观察日记', 'Act III · The journal'),
    lines: [
      n('医生说，奶蛙还活着，却无法醒来。病房里只剩监测仪规律的轻响。', 'The doctor said naiwa was alive but could not wake. In the hospital room, only the monitor made a steady sound.'),
      n('床边摊着它的观察日记。最后一页，缓缓浮出了从未见过的字。', 'Its journal lay open beside the bed. Words I had never seen slowly appeared on the final page.'),
      diary('如果有一天我睡着了，请不要放弃我。用你的血，来我的精神世界找我。', 'If I ever fall asleep and cannot wake, please don’t give up on me. Use your blood to find me inside my mind.'),
      n('我想起那个雨夜、那盏灯，以及它等我回答时的眼神。', 'I remembered the rainy night, the light at home, and the way it had waited for my answer.'),
    ], next: 'm02',
  },
  m02: {
    image: 'M02', mood: 'threshold', chapter: b('第三幕 · 血与誓约', 'Act III · Blood and promise'),
    lines: [
      n('我让一滴血落在奶蛙额头，轻声叫它的名字。', 'I let a single drop of blood touch naiwa’s forehead and whispered its name.'),
      n('病房的边缘像雨中的倒影一样散开。冰凉的风从另一个世界吹来。', 'The edges of the room dissolved like a reflection in the rain. Cold wind blew in from another world.'),
      n('日记上的字在我眼前闪过：在这里，每一步都会消耗精神力。', 'The journal’s words flashed before me: every step here will drain my spirit.'),
    ], next: 'm03',
  },
  m03: {
    image: 'M03', mood: 'dream', chapter: b('第一层 · 迷雾游乐园', 'Layer One · The mistbound fairground'),
    lines: [
      n('雨永远下着。旋转木马空转，破旧的玩偶盯着没有人的路。', 'The rain never stopped. A carousel spun on its own while worn dolls watched the empty paths.'),
      { ...n('我感到这片世界格外逼仄，仿佛连过去没说出口的话都跟着我走了进来。', 'The world felt close around me, as though every unsaid word had followed me inside.'), when: 'uneasy' },
      { ...n('我想起我们在灯下谈过的话，稳住呼吸，走向木马。', 'I remembered our conversations in the lamplight, steadied my breath, and walked toward the carousel.'), when: 'secure' },
    ], next: 'm04',
  },
  m04: {
    image: 'M04', mood: 'dream', chapter: b('第一层 · 哭泣的碎片', 'Layer One · The crying fragment'),
    lines: [
      n('木马旁，奶蛙抱着膝盖哭泣。它抬起头，脸上是我从未见过的执拗。', 'Beside the carousel, naiwa huddled and cried. It looked up with an intensity I had never seen.'),
      say('不要丢下我……你留下来，好不好？', 'Please don’t leave me… Will you stay?'),
      say('这次，你只能看着我。', 'This time, you’ll look only at me.'),
      n('身后的怪偶动了。眼前的奶蛙是它被压住的恐惧，不是我熟悉的现实中的它。', 'The dolls behind it shifted. This was naiwa’s buried fear, not the way it had treated me in the waking world.'),
    ], choices: [
      c('立刻冲过去抱住它', 'Rush forward and embrace it', 'be01', { spirit: -10 }),
      c('站在原处，温柔地呼唤它', 'Stay back and call to it gently', 'm05', { spirit: -10 }),
      c('转身寻找出口', 'Turn and search for an exit', 'be02', { spirit: -10 }),
    ],
  },
  be01: {
    image: 'BE01', mood: 'ending', chapter: b('结局 · 失控的拥抱', 'Ending · An embrace too soon'),
    lines: [
      n('我的手刚碰到它，所有怪偶同时转过头。木马的影子收拢，像一道锁。', 'The instant I touched it, every doll turned. The carousel’s shadows closed like a lock.'),
      say('你真的留下来了……再也不要走，好吗？', 'You really stayed… You won’t leave again, will you?'),
      n('我还没来得及回答，世界便暗了下去。', 'Before I could answer, the world went dark.'),
    ], ending: 'embrace',
  },
  be02: {
    image: 'M03', mood: 'ending', chapter: b('结局 · 消失的出口', 'Ending · The vanishing exit'),
    lines: [
      n('我朝出口奔去。那扇门却越来越远，仿佛雨把整个游乐园拉长了。', 'I ran for the exit, but it receded with every step, as if the rain were stretching the whole fairground.'),
      say('你也要走吗？你也不要我了吗？', 'Are you leaving too? Do you not want me either?'),
      n('影子盖过天空。我的意识碎在雨声里。', 'Shadows covered the sky. My thoughts broke apart in the rain.'),
    ], ending: 'escape',
  },
  m05: {
    image: 'M05', mood: 'dream', chapter: b('第一层 · 一点微光', 'Layer One · A small light'),
    lines: [
      n('我停在它能看见、却不会吓到它的地方。', 'I stopped where it could see me without feeling cornered.'),
      say('奶蛙，我在这里。我先听你说。', 'naiwa, I’m here. I’m listening.', '我', 'Me'),
      n('那张执拗的笑脸终于松动。它哭着说，自己害怕再被留下。怪偶暂时安静下来。', 'Its fixed smile finally gave way. It cried that it was afraid of being left behind. The dolls fell still.'),
      diary('游乐园里藏着三件回忆。先看清线索，再认出真正属于我们的东西。玩偶会追逐犹豫太久的人。', 'Three memories are hidden in the fairground. Study the clues before choosing what truly belongs to us. The dolls pursue anyone who lingers too long.'),
    ], next: 'm06',
  },
  m06: {
    image: 'M06', mood: 'dream', chapter: b('第一层 · 回忆的碎片', 'Layer One · Pieces of memory'),
    lines: [
      n('雾里浮现几条路：木马、礼物摊、照相亭，以及一间亮着灯的日记亭。玩偶在身后慢慢靠近。', 'Several paths appeared in the mist: a carousel, a gift stall, a photo booth, and a lit journal kiosk. The dolls edged closer behind me.'),
    ], choices: [
      c('前往旋转木马', 'Go to the carousel', 'explore_toy', { spirit: -10, danger: 1, unlessMemory: 'toy' }),
      c('前往礼物摊', 'Go to the gift stall', 'explore_gift', { spirit: -10, danger: 1, unlessMemory: 'gift' }),
      c('前往照相亭', 'Go to the photo booth', 'explore_photo', { spirit: -10, danger: 1, unlessMemory: 'photo' }),
      c('进入日记亭寻找提示', 'Search the journal kiosk for clues', 'diary_kiosk', { spirit: -10, danger: 1 }),
      c('带着三件回忆物回到奶蛙身边', 'Return to naiwa with all three memories', 'm07', { spirit: -10, requiresAllMemories: true }),
    ],
  },
  explore_toy: {
    image: 'M03_CAROUSEL_PICK', mood: 'dream', chapter: b('探索 · 旋转木马', 'Explore · The carousel'),
    lines: [
      n('木马忽快忽慢地转着。两只玩具被挂在不同的马鞍上，其中一只发出熟悉的叮当声。', 'The carousel lurched between slow and fast. Two toys hung from different saddles; one made a familiar jingle.'),
      n('我必须在木马再次加速前认出奶蛙最爱的那只。', 'I had to recognize naiwa’s favorite before the carousel sped up again.'),
    ], choices: [
      c('取下磨旧的木马玩具', 'Take the worn carousel toy', 'find_toy', { memory: 'toy' }),
      c('取下崭新的小丑玩偶', 'Take the new clown doll', 'wrong_toy', { spirit: -15, danger: 2 }),
      c('先回到岔路', 'Return to the crossroads', 'm06'),
    ],
  },
  explore_gift: {
    image: 'M06_GIFT_STALL', mood: 'dream', chapter: b('探索 · 礼物摊', 'Explore · The gift stall'),
    lines: [
      n('潮湿的摊台上，一只画着星星的杯子与一枚闪亮的戒指并排放着。奶蛙收到第一份礼物时，说以后每天都会用到它。', 'On the damp counter sat a star-patterned mug and a glittering ring. When naiwa received my first gift, it said it would use it every day.'),
      n('光亮会骗人，真正的线索是我们一起度过的清晨。', 'Shine could mislead me. The real clue was in the mornings we shared.'),
    ], choices: [
      c('拿起画着星星的杯子', 'Choose the star-patterned mug', 'find_gift', { memory: 'gift' }),
      c('拿起闪亮的新戒指', 'Choose the glittering new ring', 'wrong_gift', { spirit: -15, danger: 2 }),
      c('先回到岔路', 'Return to the crossroads', 'm06'),
    ],
  },
  explore_photo: {
    image: 'M06_PHOTO_BOOTH', mood: 'dream', chapter: b('探索 · 照相亭', 'Explore · The photo booth'),
    lines: [
      n('潮湿的照相亭台面上，摆着两张几乎相同的合照。其中一张完美得像是这个世界替我们编造的。', 'Two almost identical photos stood on the damp booth counter. One looked so perfect it might have been invented by this world.'),
      n('真正的合照并不完美，但那天我们确实并肩站在一起。', 'Our real photo was imperfect, but we had stood together that day.'),
    ], choices: [
      c('取下窗边逆光、看不清我脸的合照', 'Take the backlit photo by the window, with my face washed out', 'find_photo', { memory: 'photo' }),
      c('取下两人面容都清晰无瑕的照片', 'Take the flawless photo of both our faces', 'wrong_photo', { spirit: -15, danger: 2 }),
      c('先回到岔路', 'Return to the crossroads', 'm06'),
    ],
  },
  diary_kiosk: {
    image: 'M01', mood: 'dream', chapter: b('探索 · 日记亭', 'Explore · The journal kiosk'),
    lines: [
      n('亭子里没有人，日记却自己翻到了几页被雨浸湿的记录。', 'The kiosk was empty, but the journal turned by itself to pages damp with rain.'),
      diary('餐桌边的旧木马，清晨盛着热牛奶的星星杯，还有窗边那张被阳光照花的合照。假的东西总比记忆完美。', 'The worn carousel toy by our table. The starry mug filled with warm milk each morning. The sun-washed photo by the window. The false things are always more perfect than memory.'),
      diary('如果玩偶围上来，别跟着它们的声音跑。躲到停转的木马背后，等它们走过。', 'If the dolls surround you, do not run toward their voices. Hide behind the still carousel until they pass.'),
    ], next: 'm06',
  },
  find_toy: {
    image: 'M03_CAROUSEL_PICK', mood: 'dream', chapter: b('回忆 · 最爱的玩具', 'Memory · A favorite toy'),
    lines: [
      n('我取下磨旧的木马玩具。那声不成调的叮当，确实来自我们的餐桌。', 'I took down the worn carousel toy. Its off-key jingle really was the one from our table.'),
      n('奶蛙曾把它放在餐桌边，说这样我们吃饭时就像有了第三位朋友。', 'naiwa used to put it beside us at dinner and say we had a third friend at the table.'),
    ], next: 'm06',
  },
  find_gift: {
    image: 'M06_GIFT_STALL', mood: 'dream', chapter: b('回忆 · 第一份礼物', 'Memory · The first gift'),
    lines: [
      n('我拿起画着小星星的杯子。即使在这片雨里，我仿佛还闻得到清晨热牛奶的香气。', 'I picked up the mug with little stars. Even in the rain, I could almost smell warm milk from our mornings together.'),
      n('奶蛙当时抱着杯子转了好几个圈，还问我会不会太破费。', 'naiwa had spun around holding it, then asked whether I had spent too much.'),
    ], next: 'm06',
  },
  find_photo: {
    image: 'M06_PHOTO_BOOTH', mood: 'dream', chapter: b('回忆 · 两人的合照', 'Memory · Our photo'),
    lines: [
      n('照片里，我们站在窗边。我的脸被阳光照得模糊，奶蛙却笑得很坦然。', 'In the photo, we stood by the window. Sunlight washed out my face, while naiwa smiled freely.'),
      n('照片定格的是那一天，而不是任何永远不会改变的承诺。', 'The photo held one day we had shared, not a promise that nothing would ever change.'),
    ], next: 'm06',
  },
  wrong_toy: { image: 'M03_CAROUSEL_PICK', mood: 'dream', chapter: b('误判 · 小丑玩偶', 'Mistake · The clown doll'), lines: [n('小丑玩偶突然睁眼。我松开手，它落进水里，玩偶们的脚步更近了。', 'The clown doll opened its eyes. I dropped it into the water, and the other dolls moved closer.')], next: 'm06' },
  wrong_gift: { image: 'M06_GIFT_STALL', mood: 'dream', chapter: b('误判 · 陌生的戒指', 'Mistake · The unfamiliar ring'), lines: [n('戒指在掌心里化成冷灰。我们的清晨从来没有它；我追逐的是这个世界造出的漂亮谎言。', 'The ring turned to cold ash in my hand. It had never been part of our mornings. I had followed this world’s pretty lie.')], next: 'm06' },
  wrong_photo: { image: 'M06_PHOTO_BOOTH', mood: 'dream', chapter: b('误判 · 完美的照片', 'Mistake · The perfect photograph'), lines: [n('照片里的人影转向我，露出一模一样的笑。真正的那张没有如此清晰的脸。', 'The figures in the photo turned toward me with identical smiles. Our real picture had never shown my face so clearly.')], next: 'm06' },
  doll_hunt: {
    image: 'M03', mood: 'dream', chapter: b('危机 · 玩偶逼近', 'Danger · The dolls approach'),
    lines: [n('我刚迈出一步，四周的玩偶同时抬头。细碎的脚步声从雨幕里包围过来。', 'As I took another step, every doll looked up. Tiny footsteps surrounded me through the rain.'), n('出口在远处晃动。日记里的提醒忽然变得重要。', 'The exit shimmered in the distance. The journal’s warning suddenly mattered.')],
    choices: [
      c('躲到停转的木马背后，等玩偶走过', 'Hide behind the still carousel and wait', 'm06', { spirit: -10, danger: -3 }),
      c('朝出口全力奔跑', 'Run straight toward the exit', 'be02', { spirit: -10 }),
    ],
  },
  m07: {
    image: 'M07', mood: 'dream', chapter: b('第一层 · 我来接你回家', 'Layer One · I came to bring you home'),
    lines: [
      n('我把三件回忆物放在奶蛙面前，仍然给它留出选择的距离。', 'I placed the three memories before naiwa, leaving it room to choose whether to come closer.'),
      say('我不会丢下你。我来接你回家了。', 'I won’t abandon you. I came to bring you home.', '我', 'Me'),
      say('但我们都可以自由选择。害怕的时候，告诉我。不要把自己困在这里。', 'But we are both free to choose. When you’re afraid, tell me. You don’t have to lock yourself in here.', '我', 'Me'),
      n('它看着那张照片，慢慢松开了攥紧的手。旋转木马终于放缓。', 'It looked at the photo and slowly unclenched its hands. The carousel began to slow.'),
      say('原来……你真的还记得。', 'You… really do remember.'),
    ], next: 'm08',
  },
  m08: {
    image: 'M08', mood: 'dream', chapter: b('第一层 · 雨停', 'Layer One · After the rain'),
    lines: [
      n('雨渐渐停了。奶蛙的碎片化作柔光，融入我的胸口。', 'The rain began to ease. naiwa’s fragment became a soft light and settled inside me.'),
      n('积水里映出一小片晴空。我知道，这只是它精神世界的第一层。', 'A patch of clear sky appeared in the puddles. I knew this was only the first layer of its mind.'),
    ], next: 'e01',
  },
  e01: {
    image: 'E01', mood: 'threshold', chapter: b('终幕 · 微弱的回应', 'Epilogue · A faint response'),
    lines: [
      n('我在病床边醒来。奶蛙仍沉睡着，可它的手指轻轻动了一下。', 'I woke beside the hospital bed. naiwa was still asleep, but one finger moved ever so slightly.'),
      n('眼角的一滴泪在晨光里闪烁。它还没有醒来，但我知道它听见了我。', 'A tear glimmered in the morning light. It had not woken, but I knew it had heard me.'),
    ], next: 'e02',
  },
  e02: {
    image: 'E02', mood: 'ending', chapter: b('终幕 · 还有更多面', 'Epilogue · More than one side'),
    lines: [
      n('日记翻开新的一页。字迹像是从很远的地方传来。', 'The journal opened to a new page. The writing felt as though it had come from somewhere far away.'),
      diary('谢谢你来到第一层。但是，我还有好多好多面，你愿意……全部接受吗？', 'Thank you for reaching the first layer. But there are so many more sides to me. Will you… accept all of them?'),
      n('我握住奶蛙的手。我们的故事，还没有结束。', 'I held naiwa’s hand. Our story was not over.'),
    ], ending: 'true',
  },
  exhausted: {
    image: 'M03', mood: 'ending', chapter: b('结局 · 雾中沉眠', 'Ending · Lost in the mist'),
    lines: [
      n('每一步都带走一点清醒。等我想起回去的路时，雨声已盖过所有念头。', 'Each step took a little more of my awareness. By the time I remembered the way back, the rain had drowned every thought.'),
      n('病房里的我再也没有睁开眼。', 'In the hospital room, I never opened my eyes again.'),
    ], ending: 'exhausted',
  },
}

export const firstScene = 'p01'
