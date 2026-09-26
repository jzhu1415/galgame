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
    ], next: 'p04b',
  },
  p04b: {
    image: 'P04B', mood: 'real', chapter: b('序章 · 新的日常', 'Prologue · A new routine'),
    lines: [
      n('它哼着不成调的歌打扫房间。阳光落在地板上，雨夜像是很久以前的事了。', 'It hummed off-key while cleaning. Sunlight spread across the floor, and the rainy night felt far away.'),
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
      c('答应奶蛙，握住它的手', 'Say yes and take naiwa’s hand', 'a01', { affection: 20 }),
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
  a01: {
    image: 'A01', mood: 'real', chapter: b('第一幕 · 两人份的晚餐', 'Act I · Dinner for two'),
    lines: [
      n('这天我临时加班，回家比平时晚了很多。推开门时，奶蛙正把两人份的晚饭重新热好。', 'An unexpected late shift kept me out much longer than usual. When I opened the door, naiwa was reheating dinner for two.'),
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
      diary('找回我们共同记得的三样东西。让它看见，爱不需要一把锁。', 'Find three things you remember together. Show it that love needs no lock.'),
    ], next: 'm06',
  },
  m06: {
    image: 'M06', mood: 'dream', chapter: b('第一层 · 回忆的碎片', 'Layer One · Pieces of memory'),
    lines: [
      n('雾里浮现一条岔路。日记的字提醒我：回忆可能藏在我们曾一起做过的事里。', 'A path emerged through the mist. The journal hinted that memories might hide in things we once did together.'),
    ], choices: [
      c('循着旧玩具的声音寻找', 'Follow the sound of an old toy', 'find_toy', { spirit: -10, memory: 'toy', unlessMemory: 'toy' }),
      c('寻找第一次交换礼物的暖光', 'Seek the warmth of our first gift', 'find_gift', { spirit: -10, memory: 'gift', unlessMemory: 'gift' }),
      c('追随映在积水里的两个人影', 'Follow two figures reflected in a puddle', 'find_photo', { spirit: -10, memory: 'photo', unlessMemory: 'photo' }),
      c('追逐玩偶传来的陌生呼声', 'Chase a stranger’s voice among the dolls', 'false_trail', { spirit: -20 }),
      c('带着三件回忆物回到奶蛙身边', 'Return to naiwa with all three memories', 'm07', { spirit: -10, requiresAllMemories: true }),
    ],
  },
  find_toy: {
    image: 'M06', mood: 'dream', chapter: b('回忆 · 最爱的玩具', 'Memory · A favorite toy'),
    lines: [
      n('旧木马上，一只磨得发亮的小玩具正发出熟悉的轻响。', 'On the old carousel, a well-loved little toy made a familiar sound.'),
      n('奶蛙曾把它放在餐桌边，说这样我们吃饭时就像有了第三位朋友。', 'naiwa used to put it beside us at dinner and say we had a third friend at the table.'),
    ], next: 'm06',
  },
  find_gift: {
    image: 'M06', mood: 'dream', chapter: b('回忆 · 第一份礼物', 'Memory · The first gift'),
    lines: [
      n('褪色的彩灯下，躺着我第一次送给奶蛙的小礼物。', 'Beneath faded carnival lights lay the first little gift I had given naiwa.'),
      n('它当时抱着礼物转了好几个圈，却仍先问我，花了多少钱，会不会太破费。', 'It had spun around with joy, then immediately asked whether I had spent too much.'),
    ], next: 'm06',
  },
  find_photo: {
    image: 'M06', mood: 'dream', chapter: b('回忆 · 两人的合照', 'Memory · Our photo'),
    lines: [
      n('长椅旁的相框里，我们并排坐着。我的脸被阳光遮住，奶蛙笑得很坦然。', 'In a frame beside a bench, we sat together. Sunlight hid my face, while naiwa smiled freely.'),
      n('照片定格的是那一天，而不是任何永远不会改变的承诺。', 'The photo held one day we had shared, not a promise that nothing would ever change.'),
    ], next: 'm06',
  },
  false_trail: {
    image: 'M03', mood: 'dream', chapter: b('第一层 · 错误的路', 'Layer One · A false trail'),
    lines: [
      n('呼声把我带回原地。玩偶的笑脸在雨里靠近，精神力被雾吞去一截。', 'The voice led me in a circle. Doll faces drew closer in the rain, and the mist drained my spirit.'),
      diary('不要追逐它们制造的声音。想一想，我们真正留下过什么。', 'Do not follow voices the dolls make. Remember what we truly shared.'),
    ], next: 'm06',
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
