export type Language = 'zh' | 'en'
export type Bilingual = { zh: string; en: string }
export type MemoryId = 'toy' | 'gift' | 'photo'

export interface Line {
  speaker?: Bilingual
  text: Bilingual
  when?: 'uneasy' | 'secure'
  sound?: 'naiwa-laugh' | 'naiwa-speech' | 'naiwa-short-reply' | 'protagonist-listen' | 'protagonist-home' | 'protagonist-choice'
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
const say = (zh: string, en: string, nameZh = '奶蛙', nameEn = 'Naiwa'): Line => ({ speaker: b(nameZh, nameEn), text: b(zh, en), ...(nameZh === '奶蛙' ? { sound: 'naiwa-speech' as const } : {}) })
const diary = (zh: string, en: string): Line => ({ speaker: b('奶蛙观察日记', 'Naiwa\'s journal'), text: b(zh, en) })
const laugh = (line: Line): Line => ({ ...line, sound: 'naiwa-laugh' })
const shortSay = (zh: string, en: string): Line => ({ ...say(zh, en), sound: 'naiwa-short-reply' })
const heroVoice = (line: Line, sound: 'protagonist-listen' | 'protagonist-home' | 'protagonist-choice'): Line => ({ ...line, sound })
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
      n('加班到末班车都走了，我踩着积水往家赶。', 'I missed the last bus after work and walked home through puddles.'),
      laugh(n('巷子里有人笑了一声。这么大的雨，居然还有人笑得出来。我走过去，看见墙边的纸箱动了动。', 'A laugh came from the alley. In this rain? I went to look and saw a cardboard box shifting against the wall.')),
    ], next: 'p02',
  },
  p02: {
    image: 'P02', mood: 'real', chapter: b('序章 · 相遇', 'Prologue · The meeting'),
    lines: [
      n('我掀起箱盖。里面的小家伙湿透了，抖得纸箱也跟着晃。刚才那声笑就是它发出来的。', 'I lifted the lid. The little creature inside was soaked and shaking hard enough to rattle the box. That laugh had come from it.'),
      say('啊，吓到你了？我就躲个雨，没干别的！', 'Oh! Did I scare you? I’m just sheltering from the rain, honest!'),
      say('我叫奶蛙。这箱子不漏水，就是盖子总掉。', 'I’m Naiwa. The box keeps the rain out. The lid’s the problem.'),
      n('它说得轻松，手却冻得发僵。', 'It sounded cheerful. Its hands were so cold it could barely move them.'),
    ], choices: [
      c('带它回家，给它一条干毛巾', 'Take Naiwa home and get a dry towel', 'p03a', { affection: 20 }),
      c('把伞留给它，先行离开', 'Leave Naiwa the umbrella', 'p03b', { affection: 5, anxiety: 10 }),
    ],
  },
  p03a: {
    image: 'P03A', mood: 'real', chapter: b('序章 · 一条毛巾', 'Prologue · A towel'),
    lines: [
      n('到家后，我拿了条干毛巾。奶蛙愣了一下，用两只短手接住，连脑袋一起裹了进去。', 'At home, I handed Naiwa a dry towel. It paused, took it in both little hands, and wrapped it over its head.'),
      laugh(say('呼，暖和了。我箱子没落外面吧？里面还有东西呢！', 'Ah, much better. We brought my box, right? My stuff’s still in there!')),
    ], next: 'p04a',
  },
  p03b: {
    image: 'P03B', mood: 'real', chapter: b('序章 · 留下的伞', 'Prologue · The umbrella'),
    lines: [
      n('我把伞留在纸箱旁。奶蛙撑起伞，朝我用力挥手。', 'I left my umbrella beside the box. Naiwa opened it and waved as hard as it could.'),
      laugh(say('谢谢！你快回去吧，别也淋感冒了！', 'Thanks! You’d better get home before you catch a cold too!')),
      n('走出几步，我又回了头。奶蛙还举着伞，伞尖歪向纸箱，自己淋湿了半边。', 'When I looked back, Naiwa had tilted the umbrella over the box. Half its body was still getting soaked.'),
      n('第二天经过巷口，它叫住我，问伞要不要还。我说不急。我们从那天开始常常见面。', 'The next day, it called out to ask if I wanted the umbrella back. I said it could wait. After that, we kept meeting.'),
    ], next: 'p04a',
  },
  p04a: {
    image: 'P04A', mood: 'real', chapter: b('序章 · 新的日常', 'Prologue · A new routine'),
    lines: [
      n('几天后，我家开始摆两副餐具。奶蛙起得比我早，我还没洗漱，它已经在厨房忙上了。', 'A few days later, I was setting the table for two. Naiwa got up before me. It was already busy in the kitchen while I was still washing up.'),
      laugh(say('好了好了，来吃！卖相先别看，你尝一口。', 'Ready! Come eat! Ignore how it looks for a second. Try a bite.')),
      n('我送它一只画着小星星的杯子。奶蛙把杯子捧了很久，后来每天都用它喝热牛奶。', 'I gave it a mug covered in little stars. Naiwa held onto it for ages. After that, it drank warm milk from it every morning.'),
    ], next: 'p04b',
  },
  p04b: {
    image: 'P04B', mood: 'real', chapter: b('序章 · 新的日常', 'Prologue · A new routine'),
    lines: [
      n('它哼着不成调的歌打扫房间。阳光落在地板上，雨夜像是很久以前的事了。', 'It hummed off-key while cleaning. Sunlight spread across the floor, and the rainy night felt far away.'),
      n('那只旧木马玩具跟着它轻轻叮当。奶蛙总把玩具放在餐桌边，说它也是家里的一员。', 'Its old carousel toy jingled as it moved. Naiwa always put it beside the table. It was part of the family, apparently.'),
      laugh(say('今天谁洗碗？我猜拳可不会再输给你了。', 'Whose turn is it to wash up? I’m not losing rock-paper-scissors again.')),
    ], next: 'p05',
  },
  p05: {
    image: 'P05', mood: 'real', chapter: b('序章 · 告白', 'Prologue · A confession'),
    lines: [
      n('那天早晨，奶蛙捧着一个认真包好的小礼物，难得紧张起来。', 'That morning, Naiwa stood there with a neatly wrapped gift. For once, it looked nervous.'),
      say('我喜欢你，想跟你谈恋爱。昨晚练了好几遍，怎么还是……你愿意吗？', 'I like you. I want to be with you. I practiced this all last night, so why am I still… Would you go out with me?'),
      n('它没有靠近，只安静等着我的回答。', 'It stayed where it was, waiting for me to answer.'),
    ], choices: [
      c('答应奶蛙，握住它的手', 'Say yes and take Naiwa’s hand', 'r01', { affection: 20 }),
      c('温柔地拒绝', 'Decline gently', 'n01'),
    ],
  },
  n01: {
    image: 'N01', mood: 'ending', chapter: b('结局 · 温柔的错过', 'Ending · A gentle parting'),
    lines: [
      n('奶蛙的笑容停了一瞬，然后它把礼物轻轻放回桌上。', 'Naiwa’s smile faltered. It lowered the gift onto the table.'),
      say('哦……好，我知道了。礼物先放这儿吧。', 'Oh… Okay. I understand. I’ll leave the gift here for now.'),
      n('它把没拆开的礼物收进抽屉。第二天早上，餐桌上还是摆着两只杯子。', 'It put the unopened gift in a drawer. The next morning, there were still two mugs on the table.'),
    ], ending: 'missed',
  },
  r01: {
    image: 'R01_MARKET', mood: 'real', chapter: b('第一幕 · 周末的约会', 'Act I · Our first weekend out'),
    lines: [
      n('成为恋人后的第一个周末，我们没有订什么特别的行程，只拎着一个空布袋逛街角集市。', 'For our first weekend together, we took an empty tote bag to the market around the corner.'),
      laugh(say('那边有风铃！不过你想先去哪儿？今天我们慢慢逛。', 'Wind chimes! Over there! Where do you want to start? We’ve got all day.')),
      n('奶蛙停在摊位前等我，眼睛却忍不住往那些叮当作响的小玩意儿上瞟。', 'Naiwa waited for me by the stall, still sneaking looks at the chimes.'),
    ], choices: [
      c('先陪它挑一只风铃', 'Help Naiwa pick a wind chime', 'r01a', { affection: 8 }),
      c('提议先挑一盆窗边的植物', 'Suggest picking a plant for the window first', 'r01b', { affection: 8 }),
    ],
  },
  r01a: {
    image: 'R01_MARKET', mood: 'real', chapter: b('第一幕 · 风铃', 'Act I · Wind chimes'),
    lines: [
      n('我们挨个轻轻拨动风铃。奶蛙挑中一只声音很轻的，说这样不会吵醒晚归的我。', 'We tried the chimes one by one. Naiwa picked a soft-sounding one so it wouldn’t wake me after a late shift.'),
      laugh(say('你听，像不像雨快停的时候？', 'Listen. Doesn’t it sound like rain letting up?')),
      n('我把风铃放进布袋。它没有赶着去下一处，只牵着我沿摊位慢慢走。', 'I put it in the bag. Naiwa took my hand, and we wandered along the stalls.'),
    ], next: 'r02',
  },
  r01b: {
    image: 'R01_MARKET', mood: 'real', chapter: b('第一幕 · 窗边的绿意', 'Act I · A plant for the window'),
    lines: [
      n('我指向一盆小小的迷迭香。奶蛙认真闻了闻，打了个轻轻的喷嚏。', 'I pointed to a small rosemary plant. Naiwa leaned in for a sniff and sneezed.'),
      laugh(say('就它吧。浇水写在日历上，不然我肯定会浇两遍。', 'Let’s get this one. Put the watering days on the calendar, though. Otherwise I’ll water it twice.')),
      n('我们把花盆安稳地放进布袋，走到风铃摊时又停下来听了一会儿。', 'We settled the pot safely in the tote, then stopped to listen at the wind chime stall.'),
    ], next: 'r02',
  },
  r02: {
    image: 'R02_KITCHEN', mood: 'real', chapter: b('第一幕 · 一起做早餐', 'Act I · Breakfast together'),
    lines: [
      n('下一个周日，奶蛙宣布要做松饼。我负责搅面糊，它负责翻面；第一张却歪得像一朵云。', 'The next Sunday, Naiwa announced we were making pancakes. I mixed the batter; it flipped them. The first one came out looking like a cloud.'),
      say('嗯……这张算试做。你想怎么处理？', 'Well… Let’s call that one practice. What do we do with it?'),
    ], choices: [
      c('一起再试一张，做成两人份', 'Try again together and make enough for two', 'r02a', { affection: 10, anxiety: -5 }),
      c('先尝尝这张，形状不重要', 'Try this one first, even if it’s crooked', 'r02b', { affection: 8, anxiety: -5 }),
    ],
  },
  r02a: {
    image: 'R02_KITCHEN', mood: 'real', chapter: b('第一幕 · 第二张松饼', 'Act I · The second pancake'),
    lines: [
      n('我重新搅匀面糊，奶蛙在旁边数着时间。这回松饼圆了一些，边缘还是翘起一点。', 'I stirred the batter again while Naiwa counted the seconds. The next pancake was rounder, with one edge still curled up.'),
      laugh(say('这回至少能装进盘子了。第一张归我！', 'This one actually fits on a plate. I’m having the first one!')),
      n('那张歪松饼也没剩下。奶蛙说归它，最后还是分了半张给我。', 'The crooked pancake didn’t last either. Naiwa had claimed it, but still gave me half.'),
    ], next: 'r03',
  },
  r02b: {
    image: 'R02_KITCHEN', mood: 'real', chapter: b('第一幕 · 歪松饼', 'Act I · The crooked pancake'),
    lines: [
      n('我切下一角尝了尝。奶蛙盯着我的表情，直到我点头，才放心地咬了一口。', 'I cut off a corner and tried it. Naiwa watched my face. When I nodded, it took a bite too.'),
      say('是真的好吃，还是你在安慰我？', 'Is it actually good, or are you just being nice?'),
      n('我说口感还可以，下次少放一点糖。它把这条建议认真记在食谱边上。', 'I said it was fluffy enough, but a bit too sweet. Naiwa wrote “less sugar” beside the recipe.'),
    ], next: 'r03',
  },
  r03: {
    image: 'R03_PHOTO', mood: 'real', chapter: b('第一幕 · 窗边的合照', 'Act I · The window photograph'),
    lines: [
      n('又过了几天，我们在窗边架起一台旧相机。快门响起时，阳光正好从我身后照进来。', 'A few days later, we set an old camera by the window. The shutter clicked just as sunlight spilled in behind me.'),
      n('相纸慢慢显影。奶蛙笑得很清楚，我的脸却被逆光照得模糊。', 'The photo slowly developed. Naiwa’s smile came out clearly. My face was lost in the glare.'),
      say('要重拍吗？还是……你喜欢这张？', 'Should we take another? Or… do you like this one?'),
    ], choices: [
      c('就留这张，笑得挺好看的', 'Keep this one. That’s a good smile', 'r03a', { affection: 10, anxiety: -5 }),
      c('再拍一张清楚的，也留下这一张', 'Take a clearer one too, and keep this one', 'r03b', { affection: 8 }),
    ],
  },
  r03a: {
    image: 'R03_PHOTO', mood: 'real', chapter: b('第一幕 · 不完美的照片', 'Act I · An imperfect photo'),
    lines: [
      n('我把相片放到窗边。奶蛙凑近看了又看，手指停在那道过亮的光上。', 'I put the photo by the window. Naiwa leaned over it, pointing at the patch of glare.'),
      laugh(say('脸是看不清，可我记得拍照时你在笑。', 'I can’t see your face, but I remember you smiling when we took it.')),
      n('窗台从此多了一张有点歪的合照。', 'After that, the photo stayed on the windowsill, always a little crooked.'),
    ], next: 'r04',
  },
  r03b: {
    image: 'R03_PHOTO', mood: 'real', chapter: b('第一幕 · 两张照片', 'Act I · Two photographs'),
    lines: [
      n('我们又拍了一张。第二张清楚些，奶蛙还是把第一张放到了窗边。', 'We took another photo. It came out clearer, but Naiwa still put the first one by the window.'),
      laugh(say('第一张别扔啊。我喜欢你这里笑的样子。', 'Don’t throw the first one away. I like your smile in it.')),
      n('我点头。后来两张照片一直挨着摆，第一张总被风吹得歪一点。', 'I nodded. We kept both photos by the window; the first always tilted when the wind came in.'),
    ], next: 'r04',
  },
  r04: {
    image: 'R04_QUIET', mood: 'real', chapter: b('第一幕 · 各自的夜晚', 'Act I · A quiet evening'),
    lines: [
      n('有些晚上，我们吃完饭就各忙各的。奶蛙写日记，我占着沙发看书。', 'Some evenings, we went off to do our own things after dinner. Naiwa wrote in its journal. I took the sofa and read.'),
      say('我想把今天记下来。你先看书，等会儿再讲给你听。', 'I want to write about today. Keep reading; I’ll tell you about it when I’m done.'),
      n('星星杯搁在日记旁，牛奶快凉了。它写到一半，伸手摸了摸杯子，又继续写。', 'The star mug stood beside the journal. Halfway through writing, Naiwa touched the mug to check the cooling milk, then went back to the page.'),
      n('接下来几周，窗台的迷迭香长高了一截；我们的作息还是对不上，但都记得给它浇水。', 'Over the next few weeks, the rosemary grew a little taller. Our schedules rarely lined up, but we both remembered to water it.'),
    ], next: 'a01',
  },
  a01: {
    image: 'A01', mood: 'real', chapter: b('第一幕 · 两人份的晚餐', 'Act I · Dinner for two'),
    lines: [
      n('这天我临时加班，回家比平时晚了很多。推开门时，奶蛙正把两人份的晚饭重新热好。', 'I got stuck at work and came home much later than usual. Naiwa was heating up our dinner when I opened the door.'),
      n('窗边还摆着我们的合照。那天阳光太亮，我的脸几乎被照得看不清，奶蛙却笑得很开心。', 'Our photo was still by the window. My face was washed out by the sun, but Naiwa’s grin was clear.'),
      laugh(say('你回来啦！饭刚热好。先坐下歇一会儿，今天很累吧？', 'You’re home! I just warmed up dinner. Sit down and rest a little. Rough day?')),
      n('我正要回答，手机又亮了。朋友问：“你们才认识不久，真的想清楚了吗？”我看了看奶蛙，决定怎么开口。', 'Before I could answer, my phone lit up. A friend had texted: “You haven’t known each other long. Have you really thought this through?” I looked at Naiwa, unsure how to bring it up.'),
    ], choices: [
      c('解释晚归，约定下次提前报平安', 'Explain the delay and promise to check in next time', 'a02a', { affection: 15, anxiety: -10 }),
      c('暂时回避，不谈今天的事', 'Avoid the conversation for now', 'a02b', { affection: -5, anxiety: 20 }),
      c('坦白朋友的劝告，认真聊聊', 'Tell Naiwa what my friend said', 'a02c', { anxiety: 25 }),
    ],
  },
  a02a: {
    image: 'A02A', mood: 'real', chapter: b('第一幕 · 热饭', 'Act I · A warm meal'),
    lines: [
      n('我说了今天的忙乱，也说下次会提前报平安。奶蛙把热饭推到我面前。', 'I told Naiwa what had kept me at work and said I’d text next time. It pushed a warm bowl toward me.'),
      say('饭热了两次。下回晚了，发个消息就行。', 'I’ve reheated this twice. Just text me if you’re running late.'),
      n('我们靠在一起吃完晚饭。', 'We finished dinner side by side.'),
    ], next: 'a03',
  },
  a02b: {
    image: 'A02B', mood: 'real', chapter: b('第一幕 · 没说出口的话', 'Act I · Unsaid things'),
    lines: [
      n('我把手机收起来，说今天太累了。奶蛙点点头，把饭放下。', 'I put my phone away and said I was too tired to talk. Naiwa nodded and set the food down.'),
      say('哦。那先吃吧，快凉了。', 'Oh. We should eat before it gets cold.'),
      n('它没有再问。我吃到一半才发现，奶蛙把自己那份放凉了。', 'It didn’t ask again. Halfway through my meal, I noticed Naiwa’s dinner had gone cold.'),
    ], next: 'a03',
  },
  a02c: {
    image: 'A02C', mood: 'real', chapter: b('第一幕 · 劝告', 'Act I · A friend\'s warning'),
    lines: [
      n('我把朋友的话原原本本告诉了奶蛙。它听完，沉默了一会儿。', 'I told Naiwa exactly what my friend had said. It listened, then fell quiet.'),
      say('你朋友是担心你吧。我听着难受，不过……你也是这么想的吗？', 'Your friend’s worried about you. I hate hearing it, but… do you feel the same way?'),
      n('我没答上来。奶蛙低头扒了一口饭，也没再问。那顿饭一直吃到凉。', 'I didn’t know what to say. Naiwa took a bite and didn’t ask again. By the time we finished, the food was cold.'),
    ], next: 'a03',
  },
  a03: {
    image: 'A03', mood: 'threshold', chapter: b('第二幕 · 强光', 'Act II · Headlights'),
    lines: [
      n('某个雨夜，我们走在回家的路上。路口忽然亮起刺眼的车灯。', 'One rainy night, we were walking home when headlights blazed across the intersection.'),
      n('远处有人影。还没来得及看清，奶蛙已经挡在我身前。', 'I could see people farther down the road. Before I got a good look, Naiwa stepped in front of me.'),
      shortSay('别怕。看着我。', 'Don’t be afraid. Look at me.'),
    ], next: 'a04',
  },
  a04: {
    image: 'A04', mood: 'threshold', chapter: b('第二幕 · 保护的代价', 'Act II · The cost of protection'),
    lines: [
      n('光从奶蛙身上涌出，将道路和那些模糊的身影一同吞没。', 'Light burst from Naiwa until I could no longer see the road or the figures ahead.'),
      n('等光散去，它倒在我怀里。刚才还温暖的手，慢慢失去了力气。', 'When the light faded, it collapsed into my arms. The hand that had felt so warm went still.'),
      shortSay('你没事……就好。', 'You\'re safe… that\'s enough.'),
    ], next: 'm01',
  },
  m01: {
    image: 'M01', mood: 'threshold', chapter: b('第三幕 · 观察日记', 'Act III · The journal'),
    lines: [
      n('医生说，奶蛙还活着，却无法醒来。病房里只剩监测仪规律的轻响。', 'The doctor said Naiwa was alive, but wouldn’t wake up. The room was silent apart from the steady beep of the monitor.'),
      n('床边摊着它的观察日记。最后一页，缓缓浮出了从未见过的字。', 'Its journal lay open beside the bed. Words I had never seen slowly appeared on the final page.'),
      diary('如果有一天我睡着了，请不要放弃我。用你的血，来我的精神世界找我。', 'If I ever fall asleep and cannot wake, please don’t give up on me. Use your blood to find me inside my mind.'),
      n('我伸手摸了摸纸面，指尖沾到一点没干的墨。', 'I touched the page. The ink was still wet enough to mark my finger.'),
    ], next: 'm02',
  },
  m02: {
    image: 'M02', mood: 'threshold', chapter: b('第三幕 · 血与誓约', 'Act III · Blood and promise'),
    lines: [
      n('我让一滴血落在奶蛙额头，轻声叫它的名字。', 'I let a drop of blood fall onto Naiwa’s forehead and whispered its name.'),
      n('床脚先变得模糊，接着是整间病房。脚下的地板湿了，我闻见了游乐园那股铁锈味。', 'The foot of the bed blurred first, then the room. The floor went wet under me. I smelled rust, the same smell as the fairground.'),
      n('日记上的字在我眼前闪过：在这里，每一步都会消耗精神力。', 'The journal’s words flashed before me: every step here will drain my spirit.'),
    ], next: 'm03',
  },
  m03: {
    image: 'M03', mood: 'dream', chapter: b('第一层 · 迷雾游乐园', 'Layer One · The mistbound fairground'),
    lines: [
      n('雨永远下着。旋转木马空转，破旧的玩偶盯着没有人的路。', 'The rain never stopped. A carousel spun on its own while worn dolls watched the empty paths.'),
      { ...n('每走几步，身后的路灯就灭掉一盏。我不敢回头看。', 'A streetlamp went out every few steps behind me. I kept my eyes ahead.'), when: 'uneasy' },
      { ...n('我摸到口袋里那张合照的边角，沿着木马的铃声往前走。', 'The edge of our photo was still in my pocket. I followed the carousel\'s faint jingle.'), when: 'secure' },
    ], next: 'm04',
  },
  m04: {
    image: 'M04', mood: 'dream', chapter: b('第一层 · 哭泣的碎片', 'Layer One · The crying fragment'),
    lines: [
      n('奶蛙蹲在木马旁，眼睛哭得发红。它看见我，先笑了一下，随即抓紧了木马的缰绳。', 'Naiwa crouched beside the carousel, eyes red from crying. It smiled when it saw me, then gripped the horse’s reins.'),
      say('不要丢下我……你留下来，好不好？', 'Please don’t leave me… Will you stay?'),
      say('这次，你只能看着我。', 'This time, keep your eyes on me. Only me.'),
      n('话音刚落，玩偶的脑袋齐齐转向我。奶蛙还盯着我，我往后挪了一点，它的眼睛立刻跟了过来。', 'Every doll’s head turned toward me as it spoke. Naiwa kept staring. I shifted back a little, and its eyes followed at once.'),
    ], choices: [
      c('立刻冲过去抱住它', 'Run over and hug it', 'be01', { spirit: -10 }),
      c('站在原处，温柔地呼唤它', 'Stay back and call to it gently', 'm05', { spirit: -10 }),
      c('转身寻找出口', 'Turn and search for an exit', 'be02', { spirit: -10 }),
    ],
  },
  be01: {
    image: 'BE01', mood: 'ending', chapter: b('结局 · 失控的拥抱', 'Ending · An embrace too soon'),
    lines: [
      n('我的手刚碰到它，所有怪偶同时转过头。木马的影子收拢，像一道锁。', 'The instant I touched it, every doll turned. The carousel\'s shadows closed like a lock.'),
      say('你真的留下来了……再也不要走，好吗？', 'You really stayed… You won\'t leave again, will you?'),
      n('我还没来得及回答，世界便暗了下去。', 'Before I could answer, the world went dark.'),
    ], ending: 'embrace',
  },
  be02: {
    image: 'M03', mood: 'ending', chapter: b('结局 · 消失的出口', 'Ending · The vanishing exit'),
    lines: [
      n('我朝出口奔去。那扇门却越来越远，仿佛雨把整个游乐园拉长了。', 'I ran for the exit, but it receded with every step, as if the rain were stretching the whole fairground.'),
      say('你也要走吗？你也不要我了吗？', 'You’re leaving too? You don’t want me either?'),
      n('影子盖过天空。我的意识碎在雨声里。', 'Shadows covered the sky. My thoughts broke apart in the rain.'),
    ], ending: 'escape',
  },
  m05: {
    image: 'M05', mood: 'dream', chapter: b('第一层 · 一点微光', 'Layer One · A small light'),
    lines: [
      n('我停在几步外，没再往前。它攥着缰绳的手还在抖。', 'I stopped a few steps away. Its hands were still shaking around the reins.'),
      heroVoice(say('奶蛙，我在这里。我先听你说。', 'Naiwa, I’m here. I’m listening.', '我', 'Me'), 'protagonist-listen'),
      n('奶蛙张了张嘴，半天才说：“我醒来会不会又只剩一个人？”身后的玩偶停住了。', 'Naiwa opened its mouth twice before the words came. “What if I wake up and you’re gone?” The dolls stopped moving.'),
      diary('木马、礼物摊、照相亭。带回那三样东西。别在原地站太久，玩偶听得见呼吸。', 'Carousel. Gift stall. Photo booth. Bring back one thing from each. Don’t stand still too long; the dolls can hear you breathe.'),
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
      c('带着三件回忆物回到奶蛙身边', 'Take all three memories back to Naiwa', 'm07', { spirit: -10, requiresAllMemories: true }),
    ],
  },
  explore_toy: {
    image: 'M03_CAROUSEL_PICK', mood: 'dream', chapter: b('探索 · 旋转木马', 'Explore · The carousel'),
    lines: [
      n('木马忽快忽慢地转着。两只玩具被挂在不同的马鞍上，其中一只发出熟悉的叮当声。', 'The carousel lurched between slow and fast. Two toys hung from different saddles; one made a familiar jingle.'),
      n('我必须在木马再次加速前认出奶蛙最爱的那只。', 'I had to pick out Naiwa’s favorite before the carousel sped up again.'),
    ], choices: [
      c('取下磨旧的木马玩具', 'Take the worn carousel toy', 'find_toy', { memory: 'toy' }),
      c('取下崭新的小丑玩偶', 'Take the new clown doll', 'wrong_toy', { spirit: -15, danger: 2 }),
      c('先回到岔路', 'Return to the crossroads', 'm06'),
    ],
  },
  explore_gift: {
    image: 'M06_GIFT_STALL', mood: 'dream', chapter: b('探索 · 礼物摊', 'Explore · The gift stall'),
    lines: [
      n('潮湿的摊台上，一只画着星星的杯子与一枚闪亮的戒指并排放着。奶蛙收到第一份礼物时，说以后每天都会用到它。', 'A star-patterned mug and a shiny ring lay on the wet counter. Naiwa had said it would use my first gift every day.'),
      n('戒指的价签还没撕，杯底却有我熟悉的那道小缺口。', 'The ring still had its price tag. Under the mug was that familiar chip.'),
    ], choices: [
      c('拿起画着星星的杯子', 'Choose the star-patterned mug', 'find_gift', { memory: 'gift' }),
      c('拿起闪亮的新戒指', 'Choose the glittering new ring', 'wrong_gift', { spirit: -15, danger: 2 }),
      c('先回到岔路', 'Return to the crossroads', 'm06'),
    ],
  },
  explore_photo: {
    image: 'M06_PHOTO_BOOTH', mood: 'dream', chapter: b('探索 · 照相亭', 'Explore · The photo booth'),
    lines: [
      n('潮湿的照相亭台面上，摆着两张几乎相同的合照。其中一张完美得像是这个世界替我们编造的。', 'Two almost identical photos lay on the wet counter. One looked suspiciously perfect, as if this place had made it up.'),
      n('我凑近去看：一张照片的右下角，沾着窗台上那盆迷迭香掉下的土。', 'I leaned closer. One photo had dirt in the bottom corner from the rosemary on our windowsill.'),
    ], choices: [
      c('取下窗边逆光、看不清我脸的合照', 'Take the window photo with my face lost in the glare', 'find_photo', { memory: 'photo' }),
      c('取下两人面容都清晰无瑕的照片', 'Take the flawless photo of both our faces', 'wrong_photo', { spirit: -15, danger: 2 }),
      c('先回到岔路', 'Return to the crossroads', 'm06'),
    ],
  },
  diary_kiosk: {
    image: 'M01', mood: 'dream', chapter: b('探索 · 日记亭', 'Explore · The journal kiosk'),
    lines: [
      n('亭子里没有人，日记却自己翻到了几页被雨浸湿的记录。', 'The kiosk was empty, but the journal turned by itself to pages damp with rain.'),
      diary('木马的铃铛总少响一下。星星杯底磕掉一块。那张合照里，你的脸被晒得看不清。', 'The carousel toy misses one beat when it rings. There’s a chip under the starry mug. In our photo, the sun washed out your face.'),
      diary('如果玩偶围上来，别跟着它们的声音跑。躲到停转的木马背后，等它们走过。', 'If the dolls close in, don’t follow their voices. Hide behind the stopped carousel and wait for them to pass.'),
    ], next: 'm06',
  },
  find_toy: {
    image: 'M03_CAROUSEL_PICK', mood: 'dream', chapter: b('回忆 · 最爱的玩具', 'Memory · A favorite toy'),
    lines: [
      n('我取下磨旧的木马玩具。那声不成调的叮当，确实来自我们的餐桌。', 'I took down the worn carousel toy. Its off-key jingle really was the one from our table.'),
      n('奶蛙曾把它放在餐桌边，说这样我们吃饭时就像有了第三位朋友。', 'Naiwa used to put it beside us at dinner and say we had a third friend at the table.'),
    ], next: 'm06',
  },
  find_gift: {
    image: 'M06_GIFT_STALL', mood: 'dream', chapter: b('回忆 · 第一份礼物', 'Memory · The first gift'),
    lines: [
      n('我拿起画着小星星的杯子。即使在这片雨里，我仿佛还闻得到清晨热牛奶的香气。', 'I picked up the mug with little stars. Even in the rain, I could almost smell warm milk from our mornings together.'),
      n('奶蛙当时抱着杯子转了好几个圈，还问我会不会太破费。', 'Naiwa had spun around with the mug in its arms, then asked if it had cost too much.'),
    ], next: 'm06',
  },
  find_photo: {
    image: 'M06_PHOTO_BOOTH', mood: 'dream', chapter: b('回忆 · 两人的合照', 'Memory · Our photo'),
    lines: [
      n('照片里，我们站在窗边。我的脸被阳光照得模糊，奶蛙却笑得很坦然。', 'There we were by the window. My face was lost in the sunlight. Naiwa was grinning.'),
      n('相纸背面有奶蛙写的小字：“没对上快门，下次再拍。”我把照片收好。', 'On the back, Naiwa had written: “Missed the timer. Try again?” I tucked the photo away.'),
    ], next: 'm06',
  },
  wrong_toy: { image: 'M03_CAROUSEL_PICK', mood: 'dream', chapter: b('误判 · 小丑玩偶', 'Mistake · The clown doll'), lines: [n('小丑玩偶突然睁眼。我松开手，它落进水里，玩偶们的脚步更近了。', 'The clown doll opened its eyes. I dropped it into the water, and the other dolls moved closer.')], next: 'm06' },
  wrong_gift: { image: 'M06_GIFT_STALL', mood: 'dream', chapter: b('误判 · 陌生的戒指', 'Mistake · The unfamiliar ring'), lines: [n('戒指在我手里碎成灰。摊位后面，玩偶的脚步声忽然快了。', 'The ring crumbled to ash in my hand. Behind the stall, the dolls quickened their pace.')], next: 'm06' },
  wrong_photo: { image: 'M06_PHOTO_BOOTH', mood: 'dream', chapter: b('误判 · 完美的照片', 'Mistake · The perfect photograph'), lines: [n('照片里的人影转向我，露出一模一样的笑。真正的那张没有如此清晰的脸。', 'The figures in the photo turned toward me with identical smiles. Our real picture had never shown my face so clearly.')], next: 'm06' },
  doll_hunt: {
    image: 'M03', mood: 'dream', chapter: b('危机 · 玩偶逼近', 'Danger · The dolls approach'),
    lines: [n('我刚迈出一步，四周的玩偶同时抬头。细碎的脚步声从雨幕里包围过来。', 'As I took another step, every doll looked up. Tiny footsteps surrounded me through the rain.'), n('出口在雾里晃。我想起日记说过，不能往那边跑。', 'The exit wavered in the mist. The journal had warned me not to run that way.')],
    choices: [
      c('躲到停转的木马背后，等玩偶走过', 'Hide behind the still carousel and wait', 'm06', { spirit: -10, danger: -3 }),
      c('朝出口全力奔跑', 'Run straight toward the exit', 'be02', { spirit: -10 }),
    ],
  },
  m07: {
    image: 'M07', mood: 'dream', chapter: b('第一层 · 我来接你回家', 'Layer One · I came to bring you home'),
    lines: [
      n('我蹲下，把三样东西放到它面前，再退回刚才站的地方。', 'I crouched, set the three objects in front of it, and stepped back to where I had been standing.'),
      heroVoice(say('我不会丢下你。我来接你回家了。', 'I won’t abandon you. I came to bring you home.', '我', 'Me'), 'protagonist-home'),
      heroVoice(say('还怕的话就拉着我。先松开缰绳，我们一起出去。', 'Hold onto me if you’re still scared. Let go of the reins. We’ll get out together.', '我', 'Me'), 'protagonist-choice'),
      n('它看着那张照片，慢慢松开了攥紧的手。旋转木马终于放缓。', 'It looked at the photo and slowly unclenched its hands. The carousel began to slow.'),
      shortSay('原来……你真的还记得。', 'You… really do remember.'),
    ], next: 'm08',
  },
  m08: {
    image: 'M08', mood: 'dream', chapter: b('第一层 · 雨停', 'Layer One · After the rain'),
    lines: [
      n('雨声慢慢稀了。奶蛙伸手碰了碰我的指尖，身影一点点散成微光。', 'The rain thinned out. Naiwa touched my fingertips, and its outline came apart into points of light.'),
      n('积水里映出一小片晴空。我知道，这只是它精神世界的第一层。', 'A patch of clear sky appeared in the puddles. I knew this was only the first layer of its mind.'),
    ], next: 'e01',
  },
  e01: {
    image: 'E01', mood: 'threshold', chapter: b('终幕 · 微弱的回应', 'Epilogue · A faint response'),
    lines: [
      n('我在病床边醒来。奶蛙仍沉睡着，可它的手指轻轻动了一下。', 'I woke beside the hospital bed. Naiwa was still asleep. Then one finger twitched.'),
      n('它的眼角湿了。我拿纸巾去擦，手一抖，碰到了监护仪的线。', 'There was a tear at the corner of its eye. I reached for a tissue, but my shaking hand caught the monitor cable.'),
    ], next: 'e02',
  },
  e02: {
    image: 'E02', mood: 'ending', chapter: b('终幕 · 还有更多面', 'Epilogue · More than one side'),
    lines: [
      n('日记翻开新的一页。字迹像是从很远的地方传来。', 'The journal opened to a new page. The words appeared slowly, as if someone far away were writing them.'),
      diary('你找到我了。可我还没全回来。日记后面的字，不一定都是我写的。', 'You found me. I’m still not all here. And I didn’t write everything that comes after this.'),
      n('我把日记合上，留在枕边。等它醒来，我要先问问这句话是谁写的。', 'I closed the journal and left it by Naiwa’s pillow. When it woke, I was going to ask who had written that line.'),
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
