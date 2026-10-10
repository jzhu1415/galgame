export type FinaleChapter = 5 | 6
export type FinaleBilingual = { zh: string; en: string }
export type FinaleSpeaker = 'narrator' | 'me' | 'naiwa' | 'naiba' | 'niulai' | 'banana-cat' | 'naidou' | 'feidudu' | 'journal'
export type FinaleLine = { speaker: FinaleSpeaker; text: FinaleBilingual }
export type FinaleChoice = { id: string; text: FinaleBilingual; detail: FinaleBilingual; next: string; spirit?: number; requires?: string[]; sets?: string[]; clue?: string }
export type FinaleNode = { title: FinaleBilingual; art: 'abyss' | 'pursuit' | 'archive' | 'laboratory' | 'core' | 'awakening' | 'city' | 'aftermath' | 'dawn' | 'cradle'; lines: FinaleLine[]; next?: string; choices?: FinaleChoice[]; kind?: 'film'; ending?: string; onEnter?: { clues?: string[]; flags?: string[] } }
export type FinaleSave = { version: 1; chapter: FinaleChapter; node: string; line: number; spirit: number; clues: string[]; flags: string[]; endings: string[]; visited: string[]; history: { node: string; line: number }[] }

const b = (zh: string, en: string): FinaleBilingual => ({ zh, en })
const n = (zh: string, en: string): FinaleLine => ({ speaker: 'narrator', text: b(zh, en) })
const s = (speaker: FinaleSpeaker, zh: string, en: string): FinaleLine => ({ speaker, text: b(zh, en) })
const c = (id: string, zh: string, en: string, detailZh: string, detailEn: string, next: string, effects: Partial<FinaleChoice> = {}): FinaleChoice => ({ id, text: b(zh, en), detail: b(detailZh, detailEn), next, ...effects })

export const finaleSpeakers: Record<FinaleSpeaker, FinaleBilingual> = {
  narrator: b('旁白', 'Narration'), me: b('我', 'Me'), naiwa: b('奶蛙', 'Naiwa'), naiba: b('奶霸', 'Naiba'),
  niulai: b('牛来', 'Niulai'), 'banana-cat': b('香蕉猫', 'Banana Cat'), naidou: b('奶豆', 'Naidou'),
  feidudu: b('肥嘟嘟', 'Feidudu'), journal: b('奶蛙观察日记', "Naiwa's journal"),
}

export const finaleEndingIds: Record<FinaleChapter, string[]> = {
  5: ['f5-escape', 'f5-taken', 'f5-bargain', 'f5-exhausted'],
  6: ['f6-reconcile', 'f6-sever', 'f6-captured', 'f6-cradle', 'f6-exhausted'],
}
export const finaleEndingNames: Record<string, FinaleBilingual> = {
  'f5-escape': b('追进无光之下', 'Into the Dark'),
  'f5-taken': b('转运车驶远', 'The Transfer Van Leaves'),
  'f5-bargain': b('签下空白同意书', 'The Blank Consent Form'),
  'f5-exhausted': b('深渊里的回声', 'An Echo in the Abyss'),
  'f6-reconcile': b('把他留下的话带回去', 'Carry His Words Home'),
  'f6-sever': b('没能说出口的告别', 'The Farewell Left Unsaid'),
  'f6-captured': b('新的通道', 'A New Conduit'),
  'f6-cradle': b('摇篮之外的清晨', 'Morning Beyond the Cradle'),
  'f6-exhausted': b('核心停止回应', 'The Core Falls Silent'),
}
export const finaleTitles: Record<FinaleChapter, FinaleBilingual> = {
  5: b('第五章 · 终章', 'Chapter Five · Finale'),
  6: b('第五章 · 终章', 'Chapter Five · Finale'),
}
export const finaleSaveKey = (chapter: FinaleChapter): string => chapter === 5 ? 'naiwa-chapter-five-v1' : 'naiwa-final-chapter-v1'
export const finaleProgressKey = (chapter: FinaleChapter): string => chapter === 5 ? 'naiwa-chapter-five-progress-v1' : 'naiwa-final-chapter-progress-v1'

export const finaleClueNames: Record<string, FinaleBilingual> = {
  'f5-signal': b('实验区信标', 'Laboratory beacon'),
  'f5-ledger-proof': b('患者账本原页与编号', 'Original patient ledger and serial'),
  'f5-film-proof': b('未剪辑的走廊录像', 'Unedited corridor recording'),
  'f5-members-proof': b('三名组织成员的值班表', 'Institute staff roster'),
  'f5-maintenance-log': b('奶豆的设备维护日志', 'Naidou’s maintenance log'),
  'f5-cradle-map': b('白铃与无把手出口的拓图', 'White bell and handleless exit sketch'),
  'f6-medical-log': b('完整医疗日志', 'Complete medical log'),
  'f6-waveform': b('两道精神波形', 'Paired mental waveforms'),
  'f6-car-log': b('事故原片与制动时间线', 'Crash original and braking timeline'),
  'f6-cradle-memory': b('摇篮曲与安抚步骤', 'Lullaby and settling instructions'),
  'f6-survivors': b('伤员已转移至救援广场', 'Injured moved to the rescue square'),
  'f6-ruin-record': b('城市废墟与组织装置的现场证据', 'Evidence of the ruins and institute device'),
}

export const finaleStories: Record<FinaleChapter, Record<string, FinaleNode>> = {
  5: {
    'f5-descent': { title: b('无光入口', 'The Lightless Entrance'), art: 'abyss', lines: [
      n('回医院以后，我把第四层的钥匙塞进日记，握住奶蛙的手。它的呼吸一下比一下浅。再睁眼，脚下没有地面，只有一道冷白光贴着墙根爬开。风把日记翻到空白页，页角有人写过一句：只剩一段的录像，别全信。', 'Back at the hospital I slid the fourth layer’s key into the journal and took Naiwa’s hand. Its breathing came shallower each time. When I opened my eyes there was no floor, only a strip of cold light crawling along the wall. The wind turned the journal to a blank page, and in the corner someone had written: a clip with only one part left is not the whole story.'),
      s('me', '我要找组织的实验记录。也得弄明白，他们为什么一直追着奶蛙和我。', 'I am here for the institute’s records. And I need to know why they keep coming after Naiwa and me.'),
      s('journal', '第五层，无光深渊。出口在最里面。别急着信先开口的人。', 'Layer Five. The Lightless Deep. The exit is at the far end. Do not trust whoever speaks first.'),
    ], next: 'f5-voice' },
    'f5-voice': { title: b('远处有人叫名字', 'A Voice in the Dark'), art: 'abyss', lines: [
      n('黑暗里有人叫了一声“奶蛙”。走廊尽头的屏幕跟着亮了：先是一段剪过的车祸画面，接着是我自己——镜馆、剧场、金笼，一路走过来的画面。', 'Someone in the dark called Naiwa’s name. A screen lit at the end of the corridor: first the edited crash footage, then me — the mirror gallery, the theatre, the gilded room, everything I had left behind on the way in.'),
      s('feidudu', '你每捡回一块，他就疼一次。别往里走了。', 'Every piece you pick up, he hurts for it. Stop walking in.'),
      s('me', '这声音是肥嘟嘟。它怎么会在这儿。', 'That is Feidudu. What is it doing here.'),
      n('屏幕下面还有一行小字：医院的实时监护。画面里牛来正把镜头往前推，推到床边那本日记看不见了。他们留在病房的线，也能把外面的声音送进这层记忆。', 'Under the screen ran a line of small text: the hospital monitor, live. On it Niulai zoomed in until the journal by the bed slipped out of frame. The lines they had left in the ward carried outside voices into this layer too.'),
    ], next: 'f5-chase' },
    'f5-chase': { title: b('追上那道影子', 'Chasing the Shadow'), art: 'pursuit', lines: [
      n('金色的影子沿着黑色栈道跑远了。它回头看过一次。面罩底下那对蓝眼睛，和我记忆里的还是同一双。', 'The golden shape ran off down the black walkway. It looked back once. Under the mask, those blue eyes were the same ones I remembered.'),
      s('me', '肥嘟嘟，等一下——我不是来害奶蛙的。', 'Feidudu, wait — I am not here to hurt Naiwa.'),
    ], choices: [
      c('f5-run-after', '追上去，不让它再消失', 'Run after it before it disappears', '路面断裂，强追会消耗精神力。', 'The path breaks apart. A hard sprint costs spirit.', 'f5-pursuit', { spirit: -16, clue: 'f5-signal' }),
      c('f5-call-gently', '停下来，叫它熟悉的名字', 'Stop and call it by its name', '留出距离，让它自己决定是否回应。', 'Give it room to decide whether to answer.', 'f5-call', { sets: ['f5-called'], clue: 'f5-signal' }),
    ] },
    'f5-pursuit': { title: b('追逐留下的痕迹', 'Marks Left by the Chase'), art: 'pursuit', lines: [
      n('我攥住扶手，才没掉下去。肥嘟嘟没回头，跑的时候撞翻了一枚银色信标。信标在地上打转，一遍遍放牛来的声音：目标正在靠近，按原计划把病患转走。', 'I grabbed the rail and did not fall. Feidudu did not stop; it knocked a silver beacon over as it ran. The beacon spun on the ground, repeating Niulai’s voice: the target is approaching, transfer the patient as planned.'),
      s('me', '在他们那张名单上，奶蛙是个“目标”。先找到他们把奶蛙送去哪儿，别的以后再说。', 'On their list, Naiwa is a “target.” First find where they are taking him. Everything else can wait.'),
    ], next: 'f5-cat-ambush' },
    'f5-call': { title: b('名字没有让它停下', 'The Name Does Not Stop It'), art: 'pursuit', lines: [
      s('feidudu', '你叫得出我的名字，改不了你做过的事。你一块一块把碎片拿走，他就一块一块空下去。', 'You can say my name. It does not change what you did. Every fragment you carry off, he goes emptier.'),
      s('me', '那我就去查查这机器到底在干什么。谁我都不会交出去。', 'Then I will find out what this machine actually does. I am not handing anyone over.'),
      n('它没搭话，抬脚把一枚蓝光信标踢到我面前。信标里存着实验区的位置。', 'It did not answer. It kicked a blue beacon across to my feet. The beacon held the direction of the lab.'),
    ], next: 'f5-cat-ambush' },
    'f5-trace': { title: b('追踪组织的信标', 'Following the Institute Beacon'), art: 'archive', lines: [
      n('信标把我带到一间旧档案室。门上贴着转运安排，桌面有三条线索：患者账本、走廊录像和人员值班表。最里面还有一张被烧掉一半的白色摇篮照片。', 'The beacon led to an old records room. A transfer schedule hung on the door. Three leads sat on the desk: a patient ledger, corridor footage, and a staff roster. At the back was a half-burned picture of a white cradle.'),
      s('me', '先把原件查清楚，再去找实验区。', 'I will verify the originals before entering the laboratory.'),
      s('journal', '账本和录像要互相核对。那张摇篮照片可能是旧档案留下的，不必急着追。', 'Cross-check the ledger and the footage. The cradle photo may belong to an older file; there is no need to pursue it yet.'),
    ], choices: [
      c('f5-open-ledger', '核对患者账本', 'Check the patient ledger', '查明组织把奶蛙列为哪一类实验对象。', 'Find how the institute classified Naiwa.', 'f5-ledger'),
      c('f5-open-film', '查看完整走廊录像', 'Inspect the full corridor recording', '对照时间戳，找出剪辑前后漏掉的部分。', 'Compare timestamps and locate what the edit removed.', 'f5-film'),
      c('f5-open-roster', '翻查值班表', 'Search the staff roster', '记录牛来、香蕉猫和奶豆在设施里的分工。', 'Record the roles of Niulai, Banana Cat, and Naidou at the facility.', 'f5-roster'),
      c('f5-open-cradle', '调查烧焦的摇篮照片', 'Investigate the burned cradle photo', '记下隐秘通路，之后也许能用上。', 'Copy this hidden passage; it may help later.', 'f5-cradle'),
      c('f5-proceed', '前往实验区', 'Proceed to the laboratory', '核对账本编号与录像时间戳，才能定位实验区。', 'Match the ledger serial and original footage timestamp to locate the laboratory.', 'f5-lab-entry', { requires: ['clue:f5-ledger-proof', 'clue:f5-film-proof'] }),
    ] },
    'f5-ledger': { title: b('病患账本', 'The Patient Ledger'), art: 'archive', lines: [
      n('账本上，昏迷的奶蛙是“可持续取样的核心载体”。我的名字在另一栏：连接者，未授权采血。每一次抽取，都写成了一条治疗记录。', 'In the ledger the unconscious Naiwa was “a core carrier suitable for repeated sampling.” My name sat in another column: connector, blood draw not authorized. Every extraction had been written up as treatment.'),
      s('me', '“治疗”两个字底下，是抽它的力气。还打算拿我的血，去开什么。', 'Under the word treatment, they drain him. And my blood, to open something.'),
      n('有一页被换过。纸面盖得住字，盖不住压痕，原来的编号还压在底下。', 'One page had been swapped. Paper hides ink, not pressure. The original serial was still pressed underneath.'),
    ], choices: [
      c('f5-keep-ledger', '拍下原页和被替换的编号', 'Photograph the original page and its serial number', '保留能追溯修改时间的证据。', 'Keep evidence that can trace when the page was changed.', 'f5-ledger-kept', { clue: 'f5-ledger-proof', sets: ['f5-evidence'] }),
      c('f5-trust-ledger', '只拿组织整理过的摘要', 'Take only the institute’s summary', '摘要跳过了未经授权的采血记录。', 'The summary skips the unauthorized blood draw.', 'f5-fog', { spirit: -18 }),
    ] },
    'f5-ledger-kept': { title: b('留下账页原件', 'Keeping the Ledger Page'), art: 'archive', lines: [
      s('me', '照片和编号都拍进日记了。他们的话我可以听，账得对着原件看。', 'Photograph and serial number are in the journal. I will listen to them. I will check the account against the original.'),
      n('账本边上印着一个箭头，指着更里面。', 'An arrow was printed along the ledger’s edge, pointing deeper in.'),
    ], next: 'f5-trace' },
    'f5-film': { title: b('走廊录像', 'The Corridor Recording'), art: 'archive', lines: [
      n('录像显示香蕉猫在病房外调过一次镜头，随后牛来进门签下转运单。奶豆把抽取泵接回病床，却在关闭记录前停了一秒。画面没有解释那一秒。', 'The footage showed Banana Cat adjusting a camera outside the ward. Niulai then entered and signed a transfer form. Naidou reconnected the extraction pump to the bed, but paused for one second before closing the log. The clip gave no explanation for that pause.'),
      n('屏幕右下角的时钟快了四分钟。校准后，另一段原片从缓存里恢复：组织的人还没到病房，抽取信号就已经启动。', 'The clock in the corner ran four minutes fast. After correction, another original clip returned from cache: extraction had started before the institute staff entered the ward.'),
      s('me', '这是原片。我留下时间戳，不把组织的剪辑当成完整经过。', 'This is the original. I will keep the timestamp and refuse to treat the institute’s edit as the whole account.'),
    ], choices: [
      c('f5-keep-film', '保存未剪辑的完整录像', 'Save the complete, unedited recording', '能够证明转运计划早于我的到来。', 'It shows the transfer plan began before I arrived.', 'f5-film-kept', { clue: 'f5-film-proof', sets: ['f5-evidence'] }),
      c('f5-cut-film', '只截取香蕉猫调镜头的画面', 'Keep only the shot of Banana Cat adjusting the camera', '这一帧方便指认，但会丢掉时间顺序。', 'That frame is easy to identify, but it loses the sequence of events.', 'f5-fog', { spirit: -16 }),
    ] },
    'f5-film-kept': { title: b('没有被剪掉的四分钟', 'The Four Minutes That Were Not Cut'), art: 'archive', lines: [
      n('完整录像里没有说明所有人的动机，但明确留下了每一份记录的先后。牛来的签字、香蕉猫的监控画面和奶豆的停顿都在同一条时间线上。', 'The full recording did not explain everyone’s motives, but it preserved the order of each record. Niulai’s signature, Banana Cat’s camera feed, and Naidou’s pause all appeared on one timeline.'),
    ], next: 'f5-trace' },
    'f5-roster': { title: b('三个人的值班表', 'The Three-Person Roster'), art: 'archive', lines: [
      n('值班表上写得清楚：牛来管谈判和转运许可，香蕉猫管监控和路线，奶豆管设备、整理临床记录。从头翻到尾，没有一栏叫“救援”。', 'The roster was plain: Niulai handled negotiation and transfer permits, Banana Cat handled surveillance and routes, Naidou handled the equipment and kept the charts. From top to bottom, not one column said rescue.'),
      s('me', '谁签的字，谁动的镜头，谁接的泵。我一个一个记着。', 'Who signed. Who moved the camera. Who hooked up the pump. I am keeping each one.'),
    ], choices: [
      c('f5-save-roster', '拍下完整值班表', 'Photograph the full roster', '可选证据，不改变任何人的既定责任。', 'Optional evidence. It does not change anyone’s established responsibility.', 'f5-roster-kept', { clue: 'f5-members-proof' }),
      c('f5-leave-roster', '把它放回原处', 'Leave it where it is', '不带走这份可选记录。', 'Leave this optional record behind.', 'f5-trace'),
    ] },
    'f5-roster-kept': { title: b('留存人员记录', 'Keeping the Staff Record'), art: 'archive', lines: [
      n('照片存进日记。三个名字终于有了对应的面孔。牛来的签名最醒目，奶豆的字却越来越小。', 'The photo went into the journal. Three names finally had faces. Niulai’s signatures were bold; Naidou’s handwriting grew smaller down the page.'),
    ], next: 'f5-trace' },
    'f5-cradle': { title: b('烧焦的白色摇篮', 'The Burned White Cradle'), art: 'cradle', lines: [
      n('照片背面写着：非核心项目，旧日安抚室。摇篮是空的，里面只有一枚压扁的白铃，和三笔手画的路线。最短的那条通向实验区，旁边另画着一扇没有门把的门。', 'On the back: non-core project, former comfort room. The cradle was empty — only a flattened white bell and three routes drawn by hand. The shortest led to the lab. Beside it another door, drawn with no handle.'),
      s('journal', '这张图只能带路，开不了门。到了核心，自己再看一遍。', 'This map can lead you. It cannot open anything. Look again for yourself at the Core.'),
    ], choices: [
      c('f5-record-cradle', '拓下白铃和无把手出口的图案', 'Copy the white bell and handleless-exit pattern', '获得线索；它只作参考，不会替终章完成调查。', 'Gain a clue. It is a reference and will not replace the final chapter’s investigation.', 'f5-cradle-kept', { clue: 'f5-cradle-map' }),
      c('f5-ignore-cradle', '不碰旧照片，先查正式档案', 'Leave the old photo and return to the official files', '不取得摇篮线索。', 'Leave without the cradle clue.', 'f5-trace'),
    ] },
    'f5-cradle-kept': { title: b('抄下来的图案', 'The Pattern I Copied'), art: 'cradle', lines: [
      n('我把图案抄进日记，没照着它去开门。前面的实验区，得拿原始记录才进得去。', 'I copied the pattern into the journal and did not try to open anything with it. The lab ahead still needed the original records.'),
    ], next: 'f5-trace' },
    'f5-fog': { title: b('被摘要带偏', 'Misled by the Summary'), art: 'archive', lines: [
      n('摘要把未经授权的抽取写成“紧急稳定”。越往下读，我越分不清他们删掉了什么，头痛也越来越重。', 'The summary called unauthorized extraction “emergency stabilization.” The farther I read, the harder it was to tell what they had removed. My headache grew.'),
      s('me', '停。回去找原件。不能让他们的措辞替我作决定。', 'Stop. I need the originals. Their wording cannot make this decision for me.'),
    ], next: 'f5-trace' },
    'f5-lab-entry': { title: b('实验区门禁', 'The Laboratory Gate'), art: 'laboratory', lines: [
      n('账本编号和原始录像的时间戳拼出门禁码。门开后，墙面屏幕仍在播同一段车祸画面。旁边的管线图把医院病床、记忆储存槽和一个写着“核心”的位置连在一起。', 'The ledger serial and the original footage timestamp formed the access code. Beyond the door, a wall screen still replayed the crash clip. A pipe diagram linked the hospital bed, memory storage, and a location labeled “Core.”'),
      s('me', '这不是治疗室。这里在准备把奶蛙的记忆抽出来，再用我的血打开核心。', 'This is not a treatment room. They are preparing to drain Naiwa’s memories and use my blood to open the Core.'),
      n('实验区另一侧响起重物撞门声。肥嘟嘟守在通道中央，身上接着数根蓝光管线。', 'A heavy impact shook the far door. Feidudu stood in the passage, connected to several blue-lit lines.'),
    ], next: 'f5-encounter' },
    'f5-encounter': { title: b('管线另一端的肥嘟嘟', 'Feidudu at the End of the Lines'), art: 'laboratory', lines: [
      s('feidudu', '他们说你要把奶蛙的记忆全带走。我不准你过去。', 'They said you would take all of Naiwa’s memories. I will not let you through.'),
      s('me', '我看到了他们的记录。现在把管线拔掉，和我一起离开。', 'I saw their records. Disconnect these lines and leave with me.'),
      n('它攥紧拳头。管线跟着收缩，墙里的装置开始抽取能量。屏幕右侧的数字往下掉，像是在倒计时。', 'It clenched its fists. The lines tightened, and the device in the wall began drawing energy. A number on the screen fell like a countdown.'),
    ], choices: [
      c('f5-speak-feidudu', '告诉它录像是组织剪过的，请它看原件', 'Show it the original footage and explain the edit', '给它选择的机会，不用攻击逼它让路。', 'Give it a choice instead of forcing it aside.', 'f5-feidudu-clash', { sets: ['f5-showed-original'] }),
      c('f5-push-feidudu', '趁管线松动，从侧边冲过去', 'Rush past while the lines loosen', '强闯会消耗精神力，也会让抽取装置加速。', 'Forcing a way through costs spirit and speeds up the extractor.', 'f5-feidudu-clash', { spirit: -24 }),
    ] },
    'f5-break-lines': { title: b('先断开外接管线', 'Disconnect the External Lines First'), art: 'laboratory', lines: [
      n('我没有打它。趁它迟疑，我拔下墙侧的外接线。肥嘟嘟被光刺得退开几步，蓝色能量仍在它身上流动，但不再被机器拉走。', 'I did not strike it. While it hesitated, I pulled the wall-side cable free. Feidudu recoiled from the flash. Blue energy still moved through its body, but the machine was no longer drawing it away.'),
      s('feidudu', '我看到的画面里，你一直在让他受伤。', 'In the footage I saw, you kept making him suffer.'),
      s('me', '我会把原片留给你看。现在先离开这个会抽走你的装置。', 'I will keep the original for you. First, let us leave the machine that is draining you.'),
      n('它没有答应，却没有再堵住路。实验区另一道门打开，奶豆抱着一叠记录站在门口。', 'It did not agree, but it stopped blocking the passage. Another laboratory door opened. Naidou stood there holding a stack of records.'),
    ], next: 'f5-naidou' },
    'f5-naidou': { title: b('奶豆带来的记录', 'The Records Naidou Brought'), art: 'laboratory', lines: [
      s('naidou', '设备不是我设计的，但我一直在维护。我看过每次抽取后的病情变化。我该更早停下来。', 'I did not design the equipment, but I maintained it. I saw Naiwa’s condition after every extraction. I should have stopped sooner.'),
      s('me', '你知道奶蛙越来越虚弱，为什么还把泵接回去？', 'You knew Naiwa was getting weaker. Why did you reconnect the pump?'),
      s('naidou', '我以为停机会害死它。现在我知道那是骗我的……牛来已经批准转运，香蕉猫正在监控医院。', 'I thought switching it off would kill Naiwa. Now I know they lied to me… Niulai approved the transfer, and Banana Cat is watching the hospital.'),
    ], choices: [
      c('f5-accept-naidou', '收下日志，让奶豆带路', 'Take the log and ask Naidou to guide you', '记录进入证据链；奶豆仍要回答自己做过的事。', 'Add the log to the evidence. Naidou still has to answer for what they did.', 'f5-bargain', { clue: 'f5-maintenance-log', sets: ['f5-naidou-trust'] }),
      c('f5-refuse-naidou', '先拿记录，不承诺会替它求情', 'Take the log without promising leniency', '保留证据，也保留追责。', 'Keep the evidence and the right to hold Naidou accountable.', 'f5-bargain', { clue: 'f5-maintenance-log' }),
    ] },
    'f5-bargain': { title: b('牛来的紧急方案', 'Niulai’s Emergency Offer'), art: 'laboratory', lines: [
      s('niulai', '医院那边已经准备好转运了。签下同意书，我就把奶蛙送进治疗舱。你也得配合采样。', 'The hospital is ready for the transfer. Sign the consent form, and I move Naiwa into the treatment pod. You will need to give a sample too.'),
      s('me', '抽的时候写“治疗”，取我的血又不用问。先停机。停了才有得谈。', 'Extraction gets written up as treatment. My blood gets taken without asking. Shut the machine down first. Then we talk.'),
      s('niulai', '你现在不签，转运照样按原计划走。签字是最省事的。', 'Refuse now and the transfer goes ahead as planned anyway. Signing is the simplest way.'),
      n('牛来把一张空白同意书推到我面前。采样范围没写，奶蛙能不能退出，也没写。', 'Niulai slid a blank consent form across to me. No sample range. Nothing about whether Naiwa could withdraw.'),
    ], choices: [
      c('f5-refuse-sign', '拒绝空白同意书，要求先停机', 'Refuse the blank form and demand a shutdown', '明确拒绝牺牲式捷径，记录你的决定。', 'Reject the sacrificial shortcut and record your decision.', 'f5-refusal', { sets: ['f5-refused'] }),
      c('f5-sign-form', '签字换取暂缓转运', 'Sign to delay the transfer', '组织取得采样许可，后续代价由你承担。', 'The institute gains permission to take a sample. You will face the cost later.', 'f5-signed', { spirit: -20, sets: ['f5-sacrificed'] }),
    ] },
    'f5-refusal': { title: b('拒绝不等于放弃', 'Refusing Is Not Giving Up'), art: 'laboratory', lines: [
      s('me', '奶蛙不是你们的实验材料。奶豆，带我回医院。', 'Naiwa is not your experiment. Naidou, take me back to the hospital.'),
      n('牛来收起同意书，转身下令封锁出口。香蕉猫的声音从广播里传来：“走廊已清空，病床正在移动。”', 'Niulai put away the form and ordered the exits sealed. Banana Cat’s voice came over the speaker: “The corridor is clear. The bed is moving.”'),
    ], next: 'f5-return' },
    'f5-signed': { title: b('签字后的代价', 'The Cost of Signing'), art: 'laboratory', lines: [
      n('签完，我才看见同一页下面还有一行附加条款：抽取可以继续，直到“核心稳定”。那几个字，牛来一个字都没提。', 'Only after I signed did I see the added clause further down the same page: extraction may continue until the “Core stabilizes.” Niulai had not mentioned those words once.'),
      s('me', '我签的是缓一缓，不是让你们一直抽。这份原件我也要带走。', 'I signed to slow the transfer. Not to let you keep drawing. I am taking this original too.'),
      n('警报响了。他们照样把病床推向地下货梯。', 'The alarm went off. They pushed the bed toward the service elevator anyway.'),
    ], next: 'f5-return' },
    'f5-return': { title: b('医院的转运警报', 'The Hospital Transfer Alarm'), art: 'awakening', lines: [
      n('奶豆在广播里喊出医院的楼层，我沿信标奔向那道白光，再睁眼时已经回到病房。门开着，床边只剩监护线和半页日记。楼下的货梯正在下降，香蕉猫把出口摄像头转向了墙。', 'Naidou called out the hospital floor over the speaker. I ran toward the white light at the end of the beacon’s trail and opened my eyes back in the ward. The door stood open. Only monitor leads and half a journal page remained. The service elevator was descending, and Banana Cat had turned the exit camera toward the wall.'),
      s('banana-cat', '摄像头没有坏。我只是让你暂时看不见那辆车。', 'The camera is not broken. I only made sure you could not see the van for a moment.'),
      s('me', '你可以把镜头转回来。把记录交出来，让医院的人自己决定要不要配合你们。', 'You can turn it back. Give up the recording and let the hospital decide whether it will cooperate with you.'),
    ], next: 'f5-transfer' },
    'f5-transfer': { title: b('病床驶向哪里', 'Where the Bed Is Going'), art: 'pursuit', lines: [
      n('地下通道分了三岔：货梯通转运车，护理通道回急诊，最窄的那条亮着——是旧照片上那只白铃的记号。', 'The service tunnel split three ways: the freight lift to the transfer van, the care corridor back to emergency, and the narrowest one lit by the bell mark from the old photograph.'),
      s('me', '不猜。日记里存着什么，我就照着走。', 'No guessing. Whatever the journal holds, I follow it.'),
    ], choices: [
      c('f5-follow-van', '追上货梯，拦住转运车', 'Take the lift and intercept the van', '需要消耗精神力赶在电梯前到达。', 'Cost spirit to reach the lift in time.', 'f5-ending-taken', { spirit: -28 }),
      c('f5-follow-care', '沿护理通道通知医院并追车', 'Alert the hospital staff, then pursue the van', '拒绝空白授权，保留医院的独立记录。', 'Reject blank authorization and preserve the hospital’s independent record.', 'f5-ending-escape', { requires: ['flag:f5-refused'], sets: ['f5-hospital-alerted'] }),
      c('f5-follow-cradle', '按白铃图案走旧安抚室通道', 'Follow the white bell into the former comfort room', '仅在深渊找到摇篮线索后可选；先保留这条隐秘通路。', 'Available only if you found the cradle clue in the Deep. This route does not decide the final chapter’s ending.', 'f5-ending-escape', { requires: ['clue:f5-cradle-map'], sets: ['f5-cradle-route'] }),
      c('f5-accept-van', '把转运交给组织，先保住自己的位置', 'Let the institute transfer Naiwa while you stay behind', '若已签过同意书，组织会按附加条款继续抽取。', 'If you signed, the institute will continue extraction under the added clause.', 'f5-ending-bargain', { requires: ['flag:f5-sacrificed'], spirit: -10 }),
    ] },
    'f5-ending-escape': { title: finaleEndingNames['f5-escape'], art: 'dawn', lines: [
      n('医院值班人员带着独立病历赶到货梯。转运暂时被拦下，组织不得不撤走设备。奶蛙仍在昏迷中；我和奶豆拿着原始记录，追踪病床被送往的下一处地点。', 'Hospital staff arrived with an independent chart and stopped the transfer for now. The institute had to remove its equipment. Naiwa remained unconscious. Naidou and I followed the original records to the next location where the bed was being taken.'),
      s('me', '先把这些记录交给医院。下一处转运地点，我自己去。', 'Give these records to the hospital. I will go to the next transfer site myself.'),
    ], ending: 'f5-escape' },
    'f5-ending-taken': { title: finaleEndingNames['f5-taken'], art: 'aftermath', lines: [
      n('电梯门合上的一瞬，我只来得及把日记塞给一个护理员。转运车开出了医院。监护信号还在，目的地却被他们从屏幕上删掉了。', 'The elevator doors closed while I was still pushing the journal into a nurse’s hands. The van left the hospital. The monitor signal was still there. They had wiped its destination off the screen.'),
      s('me', '还没完。拿着这些记录，我照样能找到它们真正的核心。', 'This is not over. With these records, I can still find their real Core.'),
    ], ending: 'f5-taken' },
    'f5-ending-bargain': { title: finaleEndingNames['f5-bargain'], art: 'aftermath', lines: [
      n('我留在门外，手上只有一张空白同意书的复印件。他们说这是合作证明。那几个空栏是什么意思，我心里清楚。', 'I stayed outside with nothing but a copy of the blank consent form. They called it proof of cooperation. I knew what those empty fields meant.'),
      s('me', '签过字，不等于我答应你们接着抽。找到奶蛙，这一条我会一条一条问。', 'A signature does not mean I agreed to what came after. When I find Naiwa, I will go through every clause of this.'),
    ], ending: 'f5-bargain' },
    'f5-exhausted': { title: finaleEndingNames['f5-exhausted'], art: 'abyss', lines: [
      n('精神力耗尽，眼前的光一点点灭下去。日记从手里掉了。面前的人影，我已经看不清。耳机里的呼吸声越走越远，意识又沉回了无光深渊。', 'My spirit ran out and the light went down by degrees. The journal slipped from my hand. I could no longer make out the figure in front of me. The breathing in my headset drifted away, and my awareness sank back into the dark.'),
      s('feidudu', '先停下来。黑暗里什么也追不上。', 'Stop for now. Nothing can be caught in the dark.'),
      n('这次没能带着奶蛙走出去。', 'This time, I could not bring Naiwa out with me.'),
    ], ending: 'f5-exhausted' },
  },
  6: {
    'f6-entry': { title: b('研究楼 · 病房外', 'Outside the Institute Ward'), art: 'awakening', lines: [
      n('转运记录把我带到城郊一栋旧研究楼。楼下停着医院的备用救护车，顶楼却亮着冷白灯。我把日记的副本塞进衣服里，从门口摄像头底下绕过去。楼道尽头，有轮床碾过留下的水印。', 'The transfer record led me to an old research building on the edge of the city. A hospital backup ambulance sat below. Cold white light burned on the top floor. I tucked a copy of the journal inside my coat and slipped past the entrance camera. At the end of the corridor, wet wheel marks.'),
      s('me', '轮子印还没干。奶蛙就在这栋楼里。', 'The wheel marks are still wet. Naiwa is in this building.'),
      s('journal', '转运单：顶层病区。核心权限：三项记录核验。', 'Transfer form: top-floor ward. Core access: three record checks.'),
    ], next: 'f6-ward' },
    'f6-ward': { title: b('病床与空出来的床位', 'The Bed and the Empty Slot'), art: 'awakening', lines: [
      n('楼上的病区空着一张床，床头写着奶蛙的名字。监护记录显示，它送进来以后一直没醒；泵上的计数却一直在涨。旁边三扇柜子，分别标着病情、波形、道路监控。', 'Upstairs the ward had an empty bed with Naiwa’s name on the headboard. The monitor showed no waking since arrival. The pump counter kept climbing. Three cabinets beside it were labeled condition, waveforms, road surveillance.'),
      s('me', '床上还是热的。刚走不久。', 'The bed is still warm. They only just moved it.'),
    ], next: 'f6-investigation' },
    'f6-investigation': { title: b('研究楼现场调查', 'Final Chapter Investigation'), art: 'archive', lines: [
      n('奶豆留下的门卡能打开资料柜，却打不开核心室。走廊尽头的终端停在三项核验上：医疗状态、双波形、事故时间线。柜门上的编号各缺一段，只能从原始记录里补齐。', 'Naidou’s access card opened the cabinets but not the Core room. The terminal at the end of the corridor awaited three checks: medical condition, paired waveforms, and the crash timeline. Each cabinet’s serial was incomplete; the missing pieces had to come from the original records.'),
      s('me', '先核对这三份记录。墙后那个白铃记号……我好像在照片上见过。', 'Check the three records first. That white bell behind the wall… I think I saw it in a photograph.'),
    ], choices: [
      c('f6-open-medical', '查医疗记录柜', 'Open the medical record cabinet', '确认抽取对奶蛙造成的实际影响。', 'Check the actual effect extraction had on Naiwa.', 'f6-medical'),
      c('f6-open-waveform', '查精神波形柜', 'Open the waveform cabinet', '找出“核心”装置追踪的对象。', 'Identify what the Core device is tracking.', 'f6-waveform'),
      c('f6-open-accident', '恢复道路监控原片', 'Recover the original road recording', '核实事故发生前后完整的操作记录。', 'Verify the full sequence of actions around the crash.', 'f6-accident-log'),
      c('f6-open-cradle', '调查墙后的白色摇篮记号', 'Inspect the white cradle mark behind the wall', '可选隐藏调查；深渊里找到的图案只能帮助定位，仍要在这里查验。', 'Optional hidden investigation. The abyss pattern helps locate it, but it must still be verified here.', 'f6-cradle'),
      c('f6-test-core', '检查核心门', 'Check the Core door', '必须有这里医疗、波形和事故三份线索。深渊档案不会代替它们。', 'Requires the medical, waveform, and crash clues from this facility. older evidence cannot replace them.', 'f6-core-door', { requires: ['clue:f6-medical-log', 'clue:f6-waveform', 'clue:f6-car-log'] }),
    ] },
    'f6-medical': { title: b('表格里的“稳定”', 'The Word “Stable” in the Chart'), art: 'archive', lines: [
      n('记录表上，每一次抽取都有时间、精神值和心率。所谓的“稳定”，只在泵停了那一小会儿出现过。泵一重新开起来，奶蛙的反应就一次比一次弱。', 'Every extraction had a time, a spirit reading, a pulse. The word stable showed up only in the short gaps when the pump was off. The moment it restarted, Naiwa answered weaker than the time before.'),
      s('me', '这不是在治它。原始数值我得留下。', 'This is not treatment. I am keeping the original readings.'),
    ], choices: [
      c('f6-save-medical', '拍下完整医疗日志', 'Photograph the complete medical log', '保留泵重启前后的全部数值。', 'Keep every reading before and after the pump restarted.', 'f6-medical-kept', { clue: 'f6-medical-log' }),
      c('f6-take-summary', '只看墙上的治疗摘要', 'Read only the treatment summary on the wall', '摘要避开了泵重启后的数据。', 'The summary omits the readings after the pump restarted.', 'f6-investigation', { spirit: -14 }),
    ] },
    'f6-medical-kept': { title: b('病历原件已留存', 'The Original Medical Log Is Saved'), art: 'archive', lines: [
      n('我拍下原始数值，抄下编号的第一段。最早那行旁边，奶豆用力划掉过两个字：正常。笔尖把纸都划破了。', 'I photographed the readings and copied down the first part of the serial. Beside the earliest entry, Naidou had crossed out two words with force: normal. The pen had cut through the paper.'),
    ], next: 'f6-investigation' },
    'f6-waveform': { title: b('两道波形，一台抽取器', 'Two Waveforms, One Extractor'), art: 'archive', lines: [
      n('屏幕上两道波形，标着A和B。它们不是同时开始的，可每次抽取，两条线一起起、一起落。旁边的说明只有一句话：互相牵引的信号。没说是什么在牵引什么。', 'Two waveforms on the screen, labeled A and B. They did not start at the same time. But every extraction, they rose and fell together. The note beside them said only: mutually linked signals. It did not say what was linked to what.'),
      s('me', '至少能确定，它在同时追两道信号。至于A和B是什么，我不猜。', 'At least it is clear the device tracks two signals at once. As for what A and B are, I am not guessing.'),
    ], choices: [
      c('f6-save-waveform', '保留两道波形和原始标注', 'Save both waveforms and their original labels', '保留两道意识的响应，避免误删。', 'Keep both responses without erasing either.', 'f6-waveform-kept', { clue: 'f6-waveform' }),
      c('f6-accept-lab-label', '照实验室标注把B当成噪声', 'Accept the lab label and treat B as noise', '被删去的那道波形会让判断失去依据。', 'Ignoring the second waveform leaves the record incomplete.', 'f6-investigation', { spirit: -14 }),
    ] },
    'f6-waveform-kept': { title: b('第二道信号没有被删掉', 'The Second Signal Is Not Erased'), art: 'archive', lines: [
      n('两条曲线我都存了，没把哪一条当成杂音。清单上第二格亮了。', 'I saved both traces and marked neither one as noise. The second box on the checklist lit up.'),
    ], next: 'f6-investigation' },
    'f6-accident-log': { title: b('事故前后的完整时间线', 'The Full Crash Timeline'), art: 'archive', lines: [
      n('道路记录器恢复了车前的完整数据。奶霸动过那辆车，事故也是他造成的。制动指令在撞击之前，车头最后一刻偏向了护栏。这两件事，都改不了已经发生的事。', 'The road recorder restored the full sequence before the crash. Naiba did touch that car. He did cause the crash. The brake command came before the impact, and the car turned toward the barrier at the last moment. Neither changes what had already happened.'),
      s('me', '两样都留着。事故是他造成的。最后那一秒的动作，也是真的。', 'Both stay. He caused the crash. And that last-second move really happened.'),
    ], choices: [
      c('f6-save-car-log', '保存事故原片、制动指令和时间戳', 'Save the original footage, brake command, and timestamps', '留下完整经过，继续追查事故。', 'Preserve the full sequence to investigate the crash.', 'f6-accident-kept', { clue: 'f6-car-log' }),
      c('f6-save-crash-only', '只保存奶霸操作车辆的一帧', 'Save only the frame showing Naiba at the controls', '只留指认画面会丢失时间顺序。', 'A single identifying frame loses the sequence of events.', 'f6-investigation', { spirit: -14 }),
    ] },
    'f6-accident-kept': { title: b('原片不删', 'The Original Stays'), art: 'archive', lines: [
      n('完整的时间线存进了日记。为什么这么做，可以慢慢问；那场事故，不会因此从记录里消失。第三格亮了。', 'The full timeline went into the journal. Why he did it can be asked later. The crash does not leave the record for it. The third box lit up.'),
    ], next: 'f6-investigation' },
    'f6-cradle': { title: b('墙后的白色安抚室', 'The White Comfort Room Behind the Wall'), art: 'cradle', lines: [
      n('墙后藏着一间很窄的白色屋子。照片上的压痕，正好对上门边那只圆铃。深渊里抄的那张图只带到了门口，真正的记录还在抽屉里。', 'Behind the wall was a narrow white room. The indentation in the old photograph matched the round bell by the door. The sketch I had copied in the Deep only led me to the door. The real record was in a drawer.'),
      n('抽屉里的纸写着：这间屋用来让核心安静下来——不抽取，也不强迫合并。纸的下半页，抄着一段很短的摇篮曲。', 'The paper in the drawer said the room was used to let the Core settle — no extraction, no forced merge. The lower half of the page held a short lullaby.'),
      s('journal', '找到屋子，标记不会自己掉。先弄清它怎么把抽取停下来。', 'Finding the room does not lift the mark. First work out how it stops the extraction.'),
    ], choices: [
      c('f6-save-cradle', '抄下摇篮曲和安抚步骤', 'Copy the lullaby and the settling instructions', '获得终章本地隐藏线索；若有深渊图案，可在记录中核对。', 'Gain the local hidden clue for this facility. The abyss pattern can be checked against the record.', 'f6-cradle-kept', { clue: 'f6-cradle-memory', sets: ['f6-cradle-ready'] }),
      c('f6-leave-cradle', '关上抽屉，继续查核心门', 'Close the drawer and return to the Core door', '不进入摇篮隐藏路线。', 'Leave without entering the cradle route.', 'f6-investigation'),
    ] },
    'f6-cradle-kept': { title: b('抽屉里的半页纸', 'Half a Page in the Drawer'), art: 'cradle', lines: [
      n('我抄下来的是安抚的步骤，不是让谁听话的口令。先断开抽取器，剩下的，等奶蛙自己答。', 'What I copied down was a way to settle him, not an order for anyone to obey. Disconnect the extractor first. The rest waits for Naiwa’s own answer.'),
    ], next: 'f6-investigation' },
    'f6-core-door': { title: b('三份本地证据齐了', 'Three Local Records Are Ready'), art: 'laboratory', lines: [
      n('医疗日志、两道波形、事故原片，三份都在这栋楼里核对过了。缺的三段编号拼到一起，锁响了一声。', 'The medical log, the two waveforms, the crash original. All three checked inside this building. The three missing serial segments came together, and the lock clicked.'),
      s('me', '门后面就是它。再拖，他们可能又要转走。', 'Naiwa is behind that door. Delay any longer and they will move him again.'),
    ], choices: [
      c('f6-enter-core', '用三份记录打开核心门', 'Use the three records to open the Core', '记录这里已完成本地核验。', 'Record that this facility’s local checks are complete.', 'f6-core', { sets: ['f6-local-evidence-ready'] }),
      c('f6-review-records', '回去再核对一遍', 'Go back and review the records', '回到调查桌，不丢失已取得的线索。', 'Return to the investigation table without losing your clues.', 'f6-investigation'),
    ] },
    'f6-core': { title: b('奶之核心', 'The Milk Core'), art: 'core', lines: [
      n('核心室底下就是城市的屋顶。透明地板映着夜里的楼群，抽取线从病床一路连上天台。墙上是一枚我没见过的组织标记。刚才那三份记录，终于说明它在追什么。', 'Under the Core room were the city rooftops. The transparent floor showed the buildings at night. Extraction lines ran from the bed all the way up to the roof. On the wall, an institute mark I had never seen. The three records I had just checked finally explained what it was tracking.'),
      s('naiba', '先停一下。这件事，我一次说完。', 'Wait. I will say all of it once.'),
      s('me', '别替我决定该怎么听。记录归记录，你自己说一遍。', 'Do not decide how I am supposed to listen. The records say one thing. You say it in your own words.'),
    ], next: 'f6-origin' },
    'f6-origin': { title: b('同一颗心里的第二个我', 'Another Self Within the Same Heart'), art: 'core', lines: [
      n('奶蛙的记忆里，出现了一个紫色的身影。不是组织造出来的复制品，也不是第二层那个冷酷碎片。它是奶蛙很早就分出去的另一个人格，叫奶霸。', 'Inside Naiwa’s memory stood a purple figure. Not a copy the institute had made. Not the cold fragment from the second layer either. A personality Naiwa had split off long ago. Naiba.'),
      s('naiba', '我本来就是奶蛙的一部分。为了让你活着走出那天，我留在外面，替你们挡着他们。', 'I was always part of Naiwa. To get you out of that day alive, I stayed outside and held them off.'),
      s('me', '你可以说为什么。可你没有权，把怎么决定、出了什么事，一起拿走。', 'You can tell me why. You had no right to take the decision away, and everything that came after with it.'),
      n('奶蛙站在记忆的另一头。它没有替奶霸说话，也没有要我原谅。', 'Naiwa stood on the other side of the memory. It did not speak for Naiba. It did not ask me to forgive him.'),
    ], next: 'f6-crash-truth' },
    'f6-crash-truth': { title: b('没有被抹掉的事故', 'The Crash Is Not Erased'), art: 'core', lines: [
      s('naiba', '车是我导过去的。我想逼出能护住你的那一下，刹车和避让，我都留了。可奶蛙的力气比我想的大。它倒下，就再没醒。', 'I steered the car. I wanted to force out the thing that would protect you. I left room to brake and pull away. Naiwa was stronger than I counted on. He went down and never woke.'),
      s('me', '车是你造成的。你想护我，也不能让奶蛙受的那些伤，变成没发生过。', 'You caused it. Wanting to protect me does not make what Naiwa went through un-happen.'),
      s('naiba', '我知道。我还把真相藏了这么久，替你们挑好了哪种风险可以担。这笔也记在我头上。', 'I know. And I kept it hidden this long, choosing for you which risks were worth it. That counts against me too.'),
      s('naiwa', '我的记忆，我的路，也该算我的。等醒了，我不想再让别人替我做主。', 'My memories, my road — those are mine too. When I wake up, I do not want anyone deciding for me again.'),
    ], next: 'f6-organization' },
    'f6-organization': { title: b('牛来要把抽取继续下去', 'Niulai Wants Extraction to Continue'), art: 'laboratory', lines: [
      s('niulai', '你们知道真相也一样。核心标记还在，抽取器只要继续运行，奶蛙就会醒。把日记和记录交出来，我可以让你们离开。', 'Knowing the truth changes nothing. The Core mark is still active. If extraction continues, Naiwa will wake. Hand over the journal and records, and I can let you leave.'),
      s('banana-cat', '屋顶已经封住。你们带不走那张病床。', 'The roof is sealed. You will not take that bed away.'),
      s('naidou', '我能关掉外部泵，但核心线路还连着。接下来要先决定怎么断开。', 'I can shut down the outer pump, but the Core line is still connected. We must decide how to disconnect it.'),
      s('me', '所有人都要承担自己做过的事。先停止抽取，再讨论怎么面对后果。', 'Everyone must answer for what they did. Stop extraction first; then we can face what comes next.'),
    ], next: 'f6-core-blockade' },
    'f6-accountability': { title: b('道歉不等于结清', 'An Apology Does Not Settle the Account'), art: 'core', lines: [
      n('奶霸把手放在控制台前，却没有碰下去。奶蛙没有把手伸过去。我也没有说原谅。机器的倒数仍在继续。', 'Naiba placed a hand near the console but did not touch it. Naiwa did not reach for him. I did not say I forgave him. The machine continued counting down.'),
      s('me', '先处理正在发生的事。之后每个人都要面对自己的选择。', 'We deal with what is happening now. Afterward, each person faces their own choices.'),
    ], choices: [
      c('f6-face-responsibility', '要求奶霸留下事故原片并承担后果', 'Require Naiba to preserve the crash record and face the consequences', '不以保护动机免除责任。', 'Do not let a protective motive erase responsibility.', 'f6-rooftop', { sets: ['f6-responsibility-faced', 'f6-no-forgiveness'] }),
      c('f6-hear-naiba', '听完奶霸的解释，再决定关系', 'Hear Naiba out before deciding the relationship', '听取解释不等于立即原谅。', 'Listening does not mean immediate forgiveness.', 'f6-rooftop', { sets: ['f6-responsibility-faced', 'f6-heard-explanation'] }),
      c('f6-refuse-contact', '现在不与奶霸和解，先救奶蛙', 'Do not reconcile with Naiba now; save Naiwa first', '保留愤怒和边界，继续处理核心。', 'Keep your anger and boundaries while dealing with the Core.', 'f6-rooftop', { sets: ['f6-responsibility-faced', 'f6-no-forgiveness'] }),
    ] },
    'f6-rooftop': { title: b('城市屋顶的抽取线路', 'Extraction Lines on the City Roof'), art: 'city', lines: [
      n('我走到天台。蓝色线路从设备盘延伸到屋檐，指示灯还在跳。城市楼顶之间传来脚步声，黑化的肥嘟嘟就在前方。', 'I stepped onto the roof. Blue lines ran from the control panel to the edge, and their indicators still pulsed. Footsteps crossed the city rooftops. Dark Feidudu stood ahead.'),
      s('feidudu', '你知道奶蛙是谁了。那你也该知道，停下抽取就等于放弃他。', 'Now you know who Naiwa is. You should also know that stopping extraction means giving it up.'),
      s('naiwa', '我想醒来，但不是靠机器把我抽空。把选择留给我。', 'I want to wake, but not through a machine draining me. Leave the choice to me.'),
      n('楼下还是晚归的车流。香蕉猫把天台门锁上，奶豆却趁它转身，将继电器图纸塞进我手里。只要停下抽取，奶蛙的意识就有机会回到楼内的身体。', 'Evening traffic still moved below. Banana Cat locked the rooftop door, but Naidou slipped the relay diagram into my hand when it turned away. Stopping extraction could let Naiwa’s awareness return to its body inside the tower.'),
    ], choices: [
      c('f6-cut-relay', '按原理图切断抽取继电器', 'Cut the extraction relay using the diagram', '让奶豆关泵，保住奶蛙的意识。', 'Have Naidou stop the pump and protect Naiwa’s awareness.', 'f6-cut-ready', { requires: ['flag:f6-responsibility-faced', 'flag:f6-local-evidence-ready'], sets: ['fight-ready', 'extraction-cut'] }),
      c('f6-rush-relay', '不查线路，直接拔掉最近的导线', 'Pull the nearest wire without checking the diagram', '冒险操作会消耗精神力，可能触发零精神力失败。', 'A reckless attempt costs spirit and may trigger the zero-spirit failure.', 'f6-cut-ready', { spirit: -100, sets: ['extraction-cut'] }),
      c('f6-take-deal', '把日记交给牛来，换取暂时放行', 'Give Niulai the journal for temporary passage', '牛来答应唤醒奶蛙，却仍握着装置的控制权。', 'Niulai promises to wake Naiwa while retaining control of the device.', 'f6-body-awake', { sets: ['f6-deal-made'] }),
      c('f6-play-cradle', '按这里摇篮记录先安抚核心', 'Use this facility’s cradle record to settle the Core first', '需要在终章自己取得摇篮曲和安抚步骤。', 'Requires finding the lullaby and settling steps in this facility.', 'f6-cradle-prepare', { requires: ['clue:f6-cradle-memory'], sets: ['f6-cradle-ready', 'extraction-cut'] }),
    ] },
    'f6-cut-ready': { title: b('抽取停止，屋顶仍有人', 'Extraction Stops, but the Rooftop Remains'), art: 'city', lines: [
      n('我先断开了抽取继电器。蓝色线路的灯逐段熄下去，床边的计数停止。肥嘟嘟仍站在屋顶另一端，战斗还没有开始。', 'I disconnected the extraction relay first. Blue indicators went dark one by one, and the counter by the bed stopped. Feidudu remained across the roof. The battle had not begun.'),
      s('me', '如果要保护奶蛙，就别让机器继续把它当成能源。', 'If we are protecting Naiwa, we cannot let the machine keep treating it as a power source.'),
      s('naiwa', '我听见你了。我会自己决定怎么回应。', 'I hear you. I will decide how to respond.'),
    ], next: 'f6-body-awake' },
    'f6-cradle-prepare': { title: b('摇篮曲里的停机步骤', 'The Shutdown Step in the Lullaby'), art: 'cradle', lines: [
      n('我按记录先停止外部抽取，再念出奶蛙自己留下的摇篮曲。它没有替任何人下令，只让核心的警报慢了下来。奶蛙仍要亲自选择是否醒来。', 'I stopped the external extraction first and then read Naiwa’s own lullaby from the record. It did not command anyone; it only slowed the Core alarm. Naiwa still had to choose whether to wake.'),
      s('me', '安抚不是替你决定。我在这里等你回答。', 'Settling the Core does not decide for you. I am here to wait for your answer.'),
      s('naiwa', '我会尽力醒来。先让我自己走完这一步。', 'I will try to wake. Let me take this step myself.'),
    ], next: 'f6-body-awake' },
    'f6-body-awake': { title: b('奶蛙本体醒来', 'Naiwa Wakes in Its Own Body'), art: 'awakening', lines: [
      n('耳机里的呼吸忽然断了一拍。病房门被从里面推开，奶蛙扶着门框，脚边拖着脱落的监护线。它的眼睛终于对上我的目光——这次站在面前的是现实里的本体。', 'The breathing in my headset skipped a beat. The ward door opened from inside. Naiwa held the frame, loose monitor leads trailing at its feet. Its eyes finally met mine. This was its physical body, here in the real world.'),
      s('naiwa', '等了这么久，这次该我走过来了。', 'You waited so long. This time I will walk to you.'),
      n('肥嘟嘟跃上对面的楼顶。仍是镜馆里那张熟悉的脸，眼周的黑印却已连成一片，紫光从它身后的城市中升起。奶蛙把我推向楼梯间，独自走到天台边缘。', 'Feidudu leapt onto the opposite roof. The face was the one I remembered from the mirror hall, but dark marks now joined around its eyes. Violet light rose from the city behind it. Naiwa guided me toward the stairwell and stepped to the rooftop edge.'),
      s('feidudu', '你醒了也没用。这里已经没有回去的路。', 'Waking changes nothing. There is no way back from here.'),
      s('naiwa', '那就先把路打出来。', 'Then I will make a way.'),
    ], next: 'f6-battle-film' },
    'f6-battle-film': { title: b('城市决战', 'The City Battle'), art: 'city', kind: 'film', lines: [], next: 'f6-post-film' },
    'f6-post-film': { title: b('城市已成废墟', 'The City in Ruins'), art: 'aftermath', lines: [
      n('紫色爆光吞掉最后一栋楼的轮廓。再睁开眼时，城市已经变成一片废墟。高楼从中间折断，整条街埋在混凝土下，刚才亮着的万家灯火只剩零星火点。', 'The violet blast swallowed the outline of the last tower. When I opened my eyes, the city had become a field of ruins. Skyscrapers had snapped in half, concrete buried the streets, and the thousands of lit windows were gone. Only scattered fires remained.'),
      n('我被困在半截楼梯里，耳鸣盖住了所有声音。灰尘落在日记的空白页上。我喊了一声奶蛙，没有回答；第二声出口时，脚下才传来碎石滚动的响动。', 'I was trapped in a broken stairwell, ringing ears drowning out every sound. Dust settled on a blank journal page. I called Naiwa’s name. No answer. On the second call, I heard stones shift below me.'),
      s('naiwa', '别下来……那块板还在晃。我撑着，你往有光的地方走。', 'Stay there… that slab is moving. I will hold it. Walk toward the light.'),
      n('它跪在坍塌的楼板下，肩膀顶住横梁。决战结束了，可我从没见过奶蛙这么安静。', 'It knelt beneath the fallen floor, its shoulder braced against a beam. The battle was over, but I had never seen Naiwa so quiet.'),
    ], next: 'f6-ruin-search' },
    'f6-ruin-search': { title: b('废墟里的呼救', 'Calls Beneath the Rubble'), art: 'aftermath', lines: [
      n('城市的方向全变了。研究楼大门只剩一段门框，奶豆的应急灯从断墙后晃过来，另一边传来香蕉猫的哭声。警报仍在废墟深处鸣叫。', 'Every landmark was gone. Only a fragment of the institute entrance remained. Naidou’s emergency light flickered behind a broken wall, and Banana Cat cried out from the other side. An alarm still sounded deep beneath the rubble.'),
      s('me', '先找到活着的人，再去关掉那台东西。', 'Find the survivors first. Then shut that thing down.'),
    ], choices: [
      c('f6-search-survivors', '跟着应急灯搜救', 'Follow the emergency light to the survivors', '找到奶豆、香蕉猫和倒下的肥嘟嘟。', 'Find Naidou, Banana Cat, and the fallen Feidudu.', 'f6-ruin-rescue'),
      c('f6-record-destruction', '保留现场与装置的记录', 'Record the ruins and the device', '保存城市被毁与组织装置的证据。', 'Preserve evidence of the destruction and the institute’s device.', 'f6-ruin-record', { clue: 'f6-ruin-record' }),
      c('f6-stop-beacon', '带幸存者离开，寻找警报源', 'Lead the survivors out and trace the alarm', '先确认被困者已经脱险。', 'Make sure the trapped survivors are safe first.', 'f6-ruin-relay', { requires: ['clue:f6-survivors'] }),
    ] },
    'f6-ruin-rescue': { title: b('把敌人也拉出来', 'Pulling an Enemy Free'), art: 'aftermath', lines: [
      n('奶豆用外套压住伤口，仍在给香蕉猫指路。肥嘟嘟躺在它们身后的凹坑里，紫光已经散去，呼吸很轻。压住它的钢梁还在冒烟。', 'Naidou pressed a coat against a wound while guiding Banana Cat. Feidudu lay in a crater behind them. The violet light was gone and its breathing was faint. The beam pinning it still smoked.'),
      s('banana-cat', '我打不开……我以前只会把门锁上。', 'I cannot open it… I only ever locked doors before.'),
      n('奶蛙没有再挥拳。它握住钢梁，慢慢抬起。我和香蕉猫把肥嘟嘟拖出来，奶豆立刻摸到它的脉搏。直到我们全部退开，奶蛙才松手。', 'Naiwa did not raise a fist again. It gripped the beam and slowly lifted it. Banana Cat and I pulled Feidudu free; Naidou immediately checked its pulse. Only when everyone was clear did Naiwa let go.'),
      s('naiwa', '别让它死在这里。', 'Do not let it die here.'),
      s('naidou', '还有呼吸。南边的广场能落救援飞机，我带它们过去。', 'It is breathing. A rescue helicopter can land in the square to the south. I will take them there.'),
    ], choices: [
      c('f6-confirm-rescue', '协助转移伤员，确认无人被困', 'Move the injured and check no one is left trapped', '奶豆护送伤员，奶蛙留下处理警报。', 'Naidou escorts the injured while Naiwa stays to trace the alarm.', 'f6-ruin-search', { clue: 'f6-survivors' }),
    ] },
    'f6-ruin-record': { title: b('不能被删掉的这一夜', 'A Night That Must Not Be Erased'), art: 'aftermath', lines: [
      n('我拍下倒塌的街道和半埋在地里的装置，把事故原片与实验日志一并送出。信号时断时续，进度条终于走完。组织再也不能只留下它想让人看见的一帧。', 'I photographed the collapsed streets and half-buried device, then sent them with the crash original and experiment logs. The signal kept failing, but the transfer finally finished. The institute could no longer preserve only the frame it wanted people to see.'),
      s('me', '这一夜伤了多少人，我们都得记住。', 'We must remember how many people this night has hurt.'),
    ], next: 'f6-ruin-search' },
    'f6-ruin-relay': { title: b('最后一盏红灯', 'The Last Red Light'), art: 'aftermath', lines: [
      n('警报来自装置的备用电池。城市毁了，抽取标记却还在奶蛙胸口闪动。牛来从坍塌的控制室爬出来，手里仍抓着遥控器。', 'The alarm came from the device’s backup battery. The city was destroyed, yet the extraction mark still flickered on Naiwa’s chest. Niulai crawled from the collapsed control room, still clutching a remote.'),
      s('niulai', '装置没全坏。我有车，有药，也有让它稳定下来的办法。把记录给我。', 'The device is not entirely broken. I have transport, medicine, and a way to stabilize it. Give me the records.'),
      n('奶霸的声音从奶蛙意识深处传来。它很疲惫，第一次没有替任何人按下按钮。奶蛙低头看着自己的手，等我把日记翻到最后一页。', 'Naiba’s voice came from deep within Naiwa’s awareness. It sounded exhausted. For the first time, it pressed no button on anyone’s behalf. Naiwa looked at its own hands as I opened the journal to its final page.'),
    ], next: 'f6-resolution' },
    'f6-resolution': { title: b('战后要怎么做', 'What Happens After the Battle'), art: 'aftermath', lines: [
      n('奶蛙本体已经醒来，胸口的标记却还牵着两道意识。强行把它们分开，能立刻停止共振；保留它们，就必须由奶蛙亲自承受、慢慢修复。远处的救援灯开始扫过废墟。', 'Naiwa was awake in its own body, but the mark still bound two minds together. Separating them would stop the resonance immediately. Keeping them meant Naiwa would have to bear it and recover slowly. Rescue lights began sweeping the ruins in the distance.'),
      s('naiwa', '打完这一架，我才知道醒来不是结束。我想活下去，也想知道我自己是谁。', 'After this fight, I know waking is not the end. I want to live, and I want to know who I am.'),
      s('me', '日记在这里。你选哪一页，我都陪你走出去。', 'The journal is here. Whichever page you choose, I will walk out with you.'),
    ], choices: [
      c('f6-reconcile-choice', '一起面对记忆，但不抹去奶霸的责任', 'Face the memories together without erasing Naiba’s responsibility', '只有先断开抽取并让奶蛙保有选择权，才会进入共同修复。', 'Shared recovery requires stopping extraction and preserving Naiwa’s choice.', 'f6-ending-reconcile', { requires: ['flag:fight-ready', 'flag:extraction-cut', 'flag:f6-responsibility-faced'], sets: ['f6-merge-consent'] }),
      c('f6-sever-choice', '保住本体，暂时隔开奶霸的意识', 'Protect Naiwa’s body and separate Naiba’s awareness for now', '停止共振，但奶蛙会暂时失去那部分记忆。', 'Stop the resonance, at the cost of temporarily losing those memories.', 'f6-ending-sever', { requires: ['flag:f6-responsibility-faced', 'flag:extraction-cut'], sets: ['f6-separation-chosen'] }),
      c('f6-captured-choice', '接受牛来的交换条件', 'Accept Niulai’s exchange', '把记录和选择权交给组织，进入被夺路线。', 'Hand the records and choice to the institute, entering the captured route.', 'f6-ending-captured'),
      c('f6-cradle-choice', '让奶蛙按摇篮记录自行回应', 'Let Naiwa respond on its own using the cradle record', '需要这里隐藏调查、先切断抽取，并由奶蛙亲自回应。', 'Requires the hidden investigation in this facility, a prior shutdown, and Naiwa’s own response.', 'f6-ending-cradle', { requires: ['clue:f6-cradle-memory', 'flag:extraction-cut', 'flag:f6-cradle-ready', 'flag:f6-responsibility-faced'], sets: ['f6-merge-consent'] }),
    ] },
    'f6-ending-reconcile': { title: finaleEndingNames['f6-reconcile'], art: 'dawn', lines: [
      s('naiwa', '我愿意听奶霸把剩下的话说完。之后我们要一起面对我倒下的那天，也要面对他做的决定。', 'I am willing to hear the rest of what Naiba has to say. Then we will face the day I fell and the choice he made.'),
      s('naiba', '我不会要求你们替我减轻责任。该留下的证据都留下。', 'I will not ask either of you to lessen my responsibility. Keep every piece of evidence that matters.'),
      n('奶蛙握住我的手，胸口的两道光不再互相撕扯。牛来的遥控器被踩碎，备用装置彻底熄灭。我们在临时医疗帐篷里等到天亮，伤员不断被送来，肥嘟嘟也在其中。', 'Naiwa held my hand. The two lights in its chest stopped tearing at each other. Niulai’s remote was crushed, and the backup device went dark for good. We waited for sunrise in a relief tent as the injured kept arriving. Feidudu was among them.'),
      n('窗外没有恢复原样的城市。重建需要很久，事故的追问也还没有结束。奶蛙把日记放回我手里，在最后一页画了一个歪歪扭扭的太阳。', 'Beyond the tent, the city had not returned to normal. Rebuilding would take a long time, and questions about the crash remained. Naiwa returned the journal to me. On its last page, it had drawn a crooked sun.'),
      s('me', '那我们就从今天开始。', 'Then we start today.'),
    ], ending: 'f6-reconcile' },
    'f6-ending-sever': { title: finaleEndingNames['f6-sever'], art: 'aftermath', lines: [
      n('奶豆远程指导我切开共振线路。奶蛙胸口只剩一道光，腿却忽然软了下去。我扶着它走到救援帐篷，它认得日记和我，却已经想不起奶霸最后说过什么。', 'Following Naidou’s instructions over the radio, I severed the resonance line. Only one light remained in Naiwa’s chest, but its legs gave way. I supported it to the rescue tent. It recognized the journal and me, but could no longer remember Naiba’s last words.'),
      s('naiwa', '现在先让我自己待一会儿。我还没准备好把那部分接回来。', 'Let me be on my own for a while. I am not ready to take that part back.'),
      n('我把事故原片留在日记的夹层，没有让那段空白替任何人开脱。废墟里第一条通路被清理出来时，我们跟着救援队离开。奶蛙回头看了很久，最后还是握紧了我的手。', 'I kept the crash original inside the journal; a blank memory would excuse no one. When rescuers cleared the first path through the rubble, we followed them out. Naiwa looked back for a long time, then tightened its grip on my hand.'),
    ], ending: 'f6-sever' },
    'f6-ending-captured': { title: finaleEndingNames['f6-captured'], art: 'aftermath', lines: [
      n('牛来给奶蛙戴上新的监护环，把它扶进印着医院标志的车。药剂让共振暂时平静，仪表上的抽取计数却再次亮起。车窗外，全城的废墟缓缓向后退去。', 'Niulai fitted Naiwa with a new monitoring band and helped it into a van bearing a hospital emblem. Medication briefly settled the resonance, but the extraction counter lit again. Through the window, the ruined city slowly receded.'),
      s('naiwa', '不是说……可以回家了吗？', 'You said… we could go home.'),
      n('牛来没有回答。我贴着车窗，看见救援灯消失在拐角。奶蛙终于醒了，我们却走进了另一条通道。', 'Niulai did not answer. I pressed against the window as the rescue lights vanished around a corner. Naiwa had finally awakened, yet we were entering another conduit.'),
    ], ending: 'f6-captured' },
    'f6-ending-cradle': { title: finaleEndingNames['f6-cradle'], art: 'dawn', lines: [
      n('奶蛙把那段短短的摇篮曲轻轻哼完。胸口的标记一寸寸褪去，备用电池上的红灯跟着熄灭。它保住了两份记忆，也终于不再被装置追踪。', 'Naiwa softly hummed the short lullaby. The mark faded from its chest, and the red backup light went out with it. Both sets of memories remained, but the device could no longer track them.'),
      s('naiba', '我会留下来回答。你们不必现在原谅我。', 'I will stay and answer for what I did. You do not have to forgive me now.'),
      s('naiwa', '这回是真的可以回去了。等伤好了，我想去帮他们把房子搭起来。', 'This time we can really go home. When I am healed, I want to help them rebuild.'),
      n('天亮时，救援队在瓦砾间铺好第一条通路。香蕉猫抱着急救包跟上奶豆，肥嘟嘟被送进医疗帐篷，牛来也被救援人员带走。没有人能把城市一夜复原，但已经有人开始搬第一块砖。', 'At dawn, rescuers laid the first path through the rubble. Banana Cat followed Naidou with a medical kit. Feidudu was taken to the relief tent, and rescue personnel escorted Niulai away. No one could restore the city overnight, but someone was already moving the first brick.'),
      n('我合上日记。封面被灰尘磨花了，奶蛙的小手却仍搭在上面。它问我，回去以后能不能一起吃早饭。', 'I closed the journal. Dust had worn its cover, yet Naiwa’s small hand still rested on it. It asked whether we could have breakfast together when we got home.'),
    ], ending: 'f6-cradle' },
    'f6-exhausted': { title: finaleEndingNames['f6-exhausted'], art: 'core', lines: [
      n('精神力归零，屏幕上的两道波形一起沉了下去。没查完的记录，替不了我回答。核心门重新锁上。', 'My spirit hit zero and both waveforms sank together on the monitor. The records I had not finished could not answer for me. The Core door locked again.'),
      s('naiwa', '先停下来。我还在这里等你。', 'Stop for now. I am still here, waiting.'),
    ], ending: 'f6-exhausted' },
  },
}

// One continuous final chapter. The original act-six table remains available solely
// for migrating saves created before the two acts were joined.
const confrontationScenes: Record<string, FinaleNode> = {
  'f5-cat-ambush': { title: b('香蕉猫封死退路', 'Banana Cat Seals the Escape'), art: 'pursuit', lines: [
    n('探照灯突然扫到脸上。香蕉猫蹲在高处，爪子按住闸门开关。我后退一步，脚边的栈道被铁门截成两段。', 'A searchlight swept over my face. Banana Cat crouched above, its paw on the gate switch. I stepped back as an iron shutter split the walkway behind me.'),
    s('banana-cat', '站在光里。再动一下，我就让桥掉下去。', 'Stay in the light. Move again and I will drop the bridge.'),
    n('镜头每扫过左边的柱子，就会停半秒。桥板已经开始倾斜。', 'Each time the camera passed the pillar on the left, it paused for half a second. The bridge was already tilting.'),
  ], choices: [
    c('f5-cat-cover', '趁镜头停顿，滑进柱子背后', 'Slide behind the pillar during the camera pause', '避开追踪，把信标留在灯下。', 'Evade tracking and leave the beacon under the light.', 'f5-cat-counter'),
    c('f5-cat-charge', '顶着探照灯冲向闸门', 'Rush the gate through the searchlight', '闸门会撞伤你，消耗 22 精神力。', 'The gate strikes you. Costs 22 spirit.', 'f5-cat-counter', { spirit: -22 }),
    c('f5-cat-wait', '停在原地，赌它不会动手', 'Stay still and gamble it will not attack', '桥板正在脱落，可能再也站不起来。', 'The bridge is falling; you may not get up again.', 'f5-cat-counter', { spirit: -100 }),
  ] },
  'f5-cat-counter': { title: b('把追踪转回去', 'Turning the Tracker Back'), art: 'pursuit', lines: [
    n('铁门砸下，灯柱跟着震了一下。我趴在护栏外，抓住信标的线。香蕉猫还在盯着灯下那团影子，没有发现身后备用门的锁已经亮了。', 'The gate slammed down and the light shook. Hanging outside the railing, I caught the beacon wire. Banana Cat kept watching the shadow beneath the lamp, missing the backup door unlocking behind it.'),
    s('me', '你追的不是我了。', 'You are tracking the wrong target now.'),
  ], choices: [
    c('f5-cat-decoy', '把信标甩向另一条通路，趁机翻过门', 'Throw the beacon down the other passage and climb over', '诱走探照灯，夺回前往档案室的路。', 'Draw off the spotlight and reach the archive.', 'f5-trace', { sets: ['f5-camera-evaded'] }),
    c('f5-cat-break-light', '砸掉灯，硬拉备用门', 'Break the lamp and wrench open the backup door', '强行脱身，消耗 12 精神力。', 'Force an escape. Costs 12 spirit.', 'f5-trace', { spirit: -12, sets: ['f5-camera-evaded'] }),
  ] },
  'f5-feidudu-clash': { title: b('第一拳砸穿实验台', 'The First Punch Breaks the Bench'), art: 'laboratory', lines: [
    n('肥嘟嘟忽然扑过来。第一拳擦着我的肩膀砸碎实验台，玻璃飞过耳边。它身后的管线越绷越紧，下一拳已经亮起蓝光。', 'Feidudu lunged. Its first punch grazed my shoulder and shattered the bench, glass flying past my ear. The lines behind it tightened as its next fist lit blue.'),
    s('feidudu', '他们说你只会骗我！', 'They said all you do is lie!'),
    n('它每次蓄力，墙上的抽取灯都会先亮。柜子后面只有半个人宽的空隙。', 'Before each strike, the extraction light on the wall flashed. Behind the cabinet was a gap barely wide enough for me.'),
  ], choices: [
    c('f5-clash-dodge', '盯住抽取灯，在亮起时侧身躲开', 'Watch the extraction light and dodge when it flashes', '借它的冲势把管线拉到极限。', 'Use its momentum to stretch the lines to their limit.', 'f5-feidudu-counter'),
    c('f5-clash-shield', '举起金属托盘硬挡', 'Raise a metal tray as a shield', '护住要害，但冲击消耗 26 精神力。', 'Protect your vital areas. The impact costs 26 spirit.', 'f5-feidudu-counter', { spirit: -26 }),
    c('f5-clash-attack', '迎着蓝光冲上去，正面反击', 'Charge straight into the blue strike', '力量差距太大，这一拳可能耗尽精神力。', 'The force is overwhelming; the blow may drain all spirit.', 'f5-feidudu-counter', { spirit: -100 }),
  ] },
  'f5-feidudu-counter': { title: b('切断它的后手', 'Cutting Off the Next Strike'), art: 'laboratory', lines: [
    n('肥嘟嘟踩上碎玻璃，管线卡住了它的肩。墙侧插头暴露出来，牛来的声音却催它继续蓄力。再拖下去，装置会连它一起抽空。', 'Feidudu stepped onto broken glass and a line caught its shoulder. The wall plug was exposed, but Niulai’s voice urged it to charge again. If this continued, the device would drain it too.'),
    s('me', '看清楚，拉住你的是谁！', 'Look at who is holding you back!'),
  ], choices: [
    c('f5-counter-unplug', '从侧面滑过去，拔掉墙侧插头', 'Slide past its flank and pull the wall plug', '解除外接抽取，让它失去下一拳的增幅。', 'Stop external extraction and weaken its next strike.', 'f5-break-lines'),
    c('f5-counter-pull', '抓住管线，连同支架一起扯下来', 'Pull the line and its bracket down together', '冒险靠近，消耗 16 精神力。', 'A risky close approach. Costs 16 spirit.', 'f5-break-lines', { spirit: -16 }),
  ] },
  'f6-core-blockade': { title: b('牛来的最后一道封锁', 'Niulai’s Last Blockade'), art: 'core', lines: [
    n('牛来一掌拍下紧急开关。蓝色栅网从地面升起，把我和奶豆隔在两侧；地板上的金属导轨开始发红。', 'Niulai slammed the emergency switch. A blue lattice rose between Naidou and me; metal rails in the floor began glowing red.'),
    s('niulai', '知道了就更不能走。把日记扔过来！', 'Now you know, you cannot leave. Throw me the journal!'),
    s('naidou', '每两次脉冲中间会停一下！右边有接地杆！', 'There is a pause between every two pulses! The grounding rod is on your right!'),
  ], choices: [
    c('f6-barrier-ground', '等第二次脉冲结束，用接地杆压住导轨', 'After the second pulse, ground the rail with the rod', '利用波形节律反制封锁。', 'Use the waveform rhythm to counter the blockade.', 'f6-breaker'),
    c('f6-barrier-force', '把柜子推向栅网，撞出通道', 'Push the cabinet through the lattice', '高温与冲击消耗 24 精神力。', 'Heat and impact cost 24 spirit.', 'f6-breaker', { spirit: -24 }),
    c('f6-barrier-touch', '直接抓住导轨，抢走开关', 'Grab the live rail and reach for the switch', '导轨仍然带电，可能耗尽精神力。', 'The rail is still live and may drain all spirit.', 'f6-breaker', { spirit: -100 }),
  ] },
  'f6-breaker': { title: b('在核心面前夺回开关', 'Taking Back the Switch'), art: 'core', lines: [
    n('栅网闪了两下，露出一道缺口。奶豆踢开电源罩，我扑向控制台，牛来却从侧面抓住日记。纸页在我们之间绷紧。', 'The lattice flickered twice, leaving a gap. Naidou kicked off the power cover. I lunged for the console, but Niulai grabbed the journal from the side. Its pages stretched between us.'),
    s('me', '松手。它不是你们的许可书。', 'Let go. This is not your permission slip.'),
  ], choices: [
    c('f6-breaker-decoy', '松开空白封套，抓住真正的停机键', 'Release the empty cover and reach the shutdown key', '让牛来抢到封套，保住记录与控制台。', 'Let Niulai take the cover while you keep the records and console.', 'f6-accountability', { sets: ['f6-blockade-broken'] }),
    c('f6-breaker-wrestle', '夺回日记，用身体挡住控制台', 'Wrest back the journal and shield the console', '肉搏消耗 18 精神力，仍能保住记录。', 'The struggle costs 18 spirit but preserves the records.', 'f6-accountability', { spirit: -18, sets: ['f6-blockade-broken'] }),
  ] },
}
finaleStories[5] = { ...finaleStories[5], ...finaleStories[6], ...confrontationScenes }
finaleStories[6]['f6-core-blockade'] = confrontationScenes['f6-core-blockade']
finaleStories[6]['f6-breaker'] = confrontationScenes['f6-breaker']
delete finaleStories[5]['f6-exhausted']
for (const id of ['f5-ending-escape', 'f5-ending-taken', 'f5-ending-bargain']) {
  finaleStories[5][id] = { ...finaleStories[5][id], ending: undefined, next: 'f6-entry' }
}
finaleEndingIds[5] = [...finaleEndingIds[6].filter(id => id !== 'f6-exhausted'), 'f5-exhausted']

// Current production story: arguments before the film, then injury and sacrifice.
// Replace nodes immutably; the old act-six table remains only for save migration.
const live = finaleStories[5]
const linear = (id: string, next: string, onEnter?: FinaleNode['onEnter']) => {
  live[id] = { ...live[id], choices: undefined, next, onEnter }
}
const revise = (id: string, titleZh: string, titleEn: string, lines: FinaleLine[]) => {
  live[id] = { ...live[id], title: b(titleZh, titleEn), lines }
}

live['f5-trace'] = { ...live['f5-trace'], choices: [
  c('f5-follow-records', '顺着转运记录读下去', 'Follow the transfer records', '账本、录像和值班表按时间顺序自动展开。', 'The ledger, footage and roster unfold in order.', 'f5-ledger'),
  c('f5-open-cradle', '先看夹在档案里的旧照片', 'Look at the old photograph first', '只多停留一段旧安抚室的往事，随后继续主线。', 'A brief optional memory of the comfort room, then back to the story.', 'f5-cradle'),
] }
linear('f5-ledger', 'f5-ledger-kept')
linear('f5-ledger-kept', 'f5-film', { clues: ['f5-ledger-proof'], flags: ['f5-evidence'] })
linear('f5-film', 'f5-film-kept')
linear('f5-film-kept', 'f5-roster', { clues: ['f5-film-proof'] })
linear('f5-roster', 'f5-roster-kept')
linear('f5-roster-kept', 'f5-lab-entry', { clues: ['f5-members-proof'] })
linear('f5-cradle', 'f5-cradle-kept')
linear('f5-cradle-kept', 'f5-ledger', { clues: ['f5-cradle-map'] })
delete live['f5-fog']
revise('f5-trace', '一条完整的转运记录', 'The Complete Transfer Record', [
  n('档案室的屏幕自己亮了。账页、录像、值班表排在同一条时间轴上，那三个名字一遍遍出现在奶蛙床边。', 'The archive screen came on by itself. Ledger pages, footage and a roster lined up on one timeline. The same three names kept turning up at Naiwa’s bedside.'),
  s('me', '不用再一扇柜门一扇柜门地翻了。他们做过什么，都在这条线上。', 'No more opening one cabinet after another. Whatever they did, it is all on this line.'),
  n('纸页之间夹着一张烧焦的照片，上面是一只白色摇篮。它跟转运没关系，倒是留下了另一条路。', 'A burned photograph was tucked between the pages: a white cradle. Nothing to do with the transfer, but it marked another way in.'),
])
revise('f5-film', '被剪掉的四分钟', 'The Four Missing Minutes', [
  n('录像里，香蕉猫先动了镜头，接着牛来签下转运单，最后奶豆把抽取泵接回病床。剪掉的那四分钟，自己补了回来。', 'In the footage Banana Cat moved the camera first, then Niulai signed the transfer form, and last Naidou hooked the extraction pump back to the bed. The four missing minutes restored themselves.'),
  s('me', '一个转镜头，一个签字，一个把泵接回去。你们是一伙的。', 'One turns the camera. One signs. One hooks the pump back up. You were all in it together.'),
  n('日记保存了完整画面，屏幕继续翻到同一夜的值班表。', 'The journal saved the complete clip. The screen moved on to that night’s roster.'),
])
revise('f5-film-kept', '同一夜，三个签名', 'Three Signatures, One Night', [n('奶豆停的那一秒，是在看抽取量够没够。够了。她亲手关掉公开日志，把另一份数据发给牛来。', 'The second Naidou paused was to check whether the extraction target had been met. It had. She closed the public log herself and sent a second set of readings to Niulai.')])
revise('f5-roster-kept', '表格最下面那一行', 'The Last Line of the Chart', [n('最后一栏是奶豆的签名：按计划完成。没人被骗，也没人打算救它。实验区的位置跟着记录一起显了出来。', 'The last column was Naidou’s signature: completed as planned. Nobody had been lied to. Nobody had meant to save him. The lab’s location appeared with the record.')])
linear('f5-encounter', 'f5-feidudu-clash', { flags: ['f5-showed-original'] })
revise('f5-lab-entry', '实验区的广播', 'The Laboratory Broadcast', [
  n('档案上的位置指向一扇大门。门一开，广播里就响起牛来的声音，像是一直等着我读完那份记录。', 'The archive pointed to a door. The moment it opened, Niulai’s voice came over the speaker, as if he had been waiting for me to finish reading.'),
  s('niulai', '看完了，就该明白了。奶蛙活着，项目才能做下去。我们不会让它死。', 'You have read it. So you understand. The project needs Naiwa alive. We will not let him die.'),
  s('me', '活着，和给你们当材料，是两回事。你们要的是后面那个。', 'Alive, and kept as material, are two different things. You want the second one.'),
])
revise('f5-encounter', '肥嘟嘟坚持的说法', 'Feidudu’s Conviction', [
  s('feidudu', '他们至少一直在照顾他。你呢，把记忆一块块拿走，还说自己来救人。', 'At least they have been looking after him. You take his memories away piece by piece, and call it rescue.'),
  s('me', '照顾能越照顾越虚吗？原片在这儿。你自己看一眼，行不行。', 'Does care leave him weaker every time? The original is right here. Look at it yourself.'),
  n('肥嘟嘟没动手。它盯着屏幕看了一会儿，怎么也不肯承认，那上面的东西和它信的不一样。', 'Feidudu did not strike. It stared at the screen a while. It would not admit that what was on it differed from what it believed.'),
])
revise('f5-cat-ambush', '香蕉猫的“保护”', 'Banana Cat’s “Protection”', [
  n('香蕉猫出现在栈道上方的屏幕里。出口的标记被它换成了一个回医院的箭头。旁边那扇门还锁着。', 'Banana Cat appeared on the screen above the walkway. It had swapped the exit marker for an arrow back to the hospital. The door beside it was still locked.'),
  s('banana-cat', '回去陪着奶蛙吧。知道那么多，对你们没好处。', 'Go back and sit with Naiwa. Knowing this much does you no good.'),
  s('me', '先把路藏了，再说这是为我们好。你是怕我看见什么？', 'You hide the way first, then say it is for our good. What are you afraid I will see?'),
])
live['f5-cat-ambush'].choices = [
  c('f5-cat-question', '追问它为什么篡改路线', 'Ask why it changed the route', '把话题留在它实际做过的事上。', 'Keep the argument on what it actually did.', 'f5-cat-counter'),
  c('f5-cat-believe', '暂时相信“回去就安全”', 'Trust “going back is safe” for now', '绕路消耗 18 精神力，随后发现出口仍被封锁。', 'The detour costs 18 spirit before the locked exit reveals the lie.', 'f5-cat-counter', { spirit: -18 }),
]
revise('f5-cat-counter', '谁替谁决定', 'Who Gets to Decide', [
  s('banana-cat', '你们再走下去，项目就完了。我给你们挑条稳当的路，有错吗？', 'Keep going like this and the project is finished. I picked you a safe road. What is wrong with that?'),
  s('me', '你说的稳当，是项目稳当。我们自己怎么走，你一次都没让过。', 'Safe for the project. You have never once let us choose how to walk it.'),
  n('画面断了。我照着日记里原来的标记往下走，门后面是档案室那道冷光。', 'The feed cut. I followed the original marks in the journal. Past the door, the cold light of the archive.'),
])
linear('f5-cat-counter', 'f5-trace', { flags: ['f5-camera-evaded'] })
revise('f5-feidudu-clash', '原片也说服不了它', 'Even the Original Cannot Convince Him', [
  s('feidudu', '你找来的每一份记录都替你说话。我凭什么信？', 'Every record you bring speaks for you. Why should I believe it?'),
  s('me', '你不用信我。你看奶蛙就行。抽得越久，它越弱。', 'You do not have to believe me. Look at Naiwa. The longer they draw, the weaker it gets.'),
  s('feidudu', '要是停下来，他就再也醒不过来呢？你敢说不会吗？', 'And if stopping means he never wakes again? Can you promise me it will not?'),
  n('它盯着我看。它要的不是记录真假，是要有个人告诉它，它信了这么久的东西没有错。', 'It stared at me. It did not want the record checked. It wanted someone to tell it that what it had believed all along was not wrong.'),
])
live['f5-feidudu-clash'].choices = [
  c('f5-clash-answer', '承认没有保证，但拒绝继续伤害', 'Admit there is no guarantee, but reject further harm', '把风险说清楚，不许诺做不到的事。', 'Explain the risk without making an impossible promise.', 'f5-feidudu-counter'),
  c('f5-clash-promise', '为了让它让路，承诺一定能救活', 'Promise a cure to persuade him', '承诺被追问时消耗 20 精神力。', 'Being pressed on that promise costs 20 spirit.', 'f5-feidudu-counter', { spirit: -20 }),
]
revise('f5-feidudu-counter', '它拒绝听完的话', 'What He Refuses to Hear', [
  s('me', '没法保证，就能一直抽下去？你口口声声说保护，你问过它一句吗？', 'No guarantee, so you keep draining him? You keep saying protection. Have you asked him once?'),
  s('feidudu', '等他醒了，他会明白的。到时候我亲自问他。', 'When he wakes, he will understand. Then I will ask him myself.'),
  n('它转身走了。话没说完，就这么撂下。墙上的开关，我这下够得到了。', 'It turned and walked off. Nothing settled. The wall switch was finally within reach.'),
])
linear('f5-feidudu-counter', 'f5-break-lines')
revise('f5-break-lines', '停下外接抽取', 'Stopping the External Extraction', [
  n('我按下墙上的停机键。外接的灯一段一段灭了。肥嘟嘟看着黑下去的屏幕，没回头。', 'I pressed the wall shutdown key. The external lights went out, one run after another. Feidudu watched the screen go dark and did not turn around.'),
  s('feidudu', '你自己选的。出了事别赖别人。', 'You chose this. When it goes wrong, do not blame anyone else.'),
  s('me', '我选的，我认。你也记着，奶蛙从来没答应过你们那套安排。', 'I chose it. I will own it. And remember: Naiwa never agreed to your arrangements.'),
  n('另一道门开了。奶豆站在里面，手里一份临床摘要，干净得不像话。', 'Another door opened. Naidou stood inside, a clinical summary in her hand, clean in a way that did not sit right.'),
])
revise('f5-naidou', '奶豆不肯承认的伤害', 'The Harm Naidou Refuses to Admit', [
  s('naidou', '每一次抽取我都确认过。他没死，就说明数值在允许范围里。', 'I signed off on every extraction. He is not dead, so the readings were within range.'),
  s('me', '“还没死”，到你笔下就成了“正常”。它不是让你改的一行数。', '“Not dead,” and in your report it becomes “normal.” He is not a row of numbers for you to edit.'),
  s('naidou', '情绪帮不了项目。许可归牛来，监控归香蕉猫，机器归我。我们谁都不欠你解释。', 'Sentiment does not make a project work. Permits are Niulai’s. Surveillance is Banana Cat’s. The machines are mine. We owe you no explanation.'),
  n('她把摘要塞回怀里。她身后的终端自己刷出了维护日志，病情恶化和抽取达标，排在同一行。', 'She tucked the summary back inside her coat. Behind her the terminal refreshed the maintenance log on its own: worsening condition, extraction target met, on the same line.'),
])
linear('f5-naidou', 'f5-bargain', { clues: ['f5-maintenance-log'] })
revise('f5-refusal', '把拒绝说清楚', 'Making the Refusal Clear', [
  s('me', '奶蛙不是你们的材料。签个字，也不会把你们做过的事变成治疗。', 'Naiwa is not your material. A signature will not turn what you did into treatment.'),
  s('naidou', '那就当未授权样本处理。牛来，转运不用等了。', 'Then log him as an unauthorized sample. Niulai, no reason to hold the transfer.'),
  n('广播里传来香蕉猫的声音：公开摄像头已经清空。三个人还是站在同一边。', 'Banana Cat came over the speaker: the public camera feed has been cleared. The three of them were still on the same side of the room.'),
])
revise('f5-return', '病房已经空了', 'The Ward Is Empty', [
  n('广播里的转运提示和信标对上了。我沿着那道白光回到医院。病房里只剩掉在地上的监护线。楼下的货梯在往下走，香蕉猫把出口的摄像头转向了墙。', 'The transfer announcement matched the beacon. I followed the white light back to the hospital. Only loose monitor leads were left on the floor. The service lift was going down, and Banana Cat had turned the exit camera toward the wall.'),
  s('banana-cat', '摄像头没坏。看不见，你就赶不上。', 'The camera is not broken. If you cannot see it, you cannot get there in time.'),
  s('me', '屏幕上的位置你们能删。轮床刚压出来的印子，你们删不掉。', 'Erase the location off the screen if you want. You cannot erase the tracks the bed just left.'),
])
revise('f5-ending-escape', '赶上下一处病房', 'Reaching the Next Ward', [
  n('我把记录交给了值班的医护，转运临时停了下来。人群围上来的时候，牛来换了一辆备用车。日记里的信标还亮着，指着城郊那栋研究楼。', 'I handed the records to the duty medics, and the transfer stalled. While the crowd gathered, Niulai switched to a backup van. The beacon in the journal was still lit, pointing at the research tower on the edge of the city.'),
  s('me', '奶豆没带我走，也没人给我开门。我顺着这道信号，自己去找奶蛙。', 'Naidou did not walk me out. Nobody opened a door for me. I followed the signal to Naiwa by myself.'),
])

live['f6-investigation'] = { ...live['f6-investigation'], choices: [
  c('f6-follow-timeline', '继续看研究楼的完整记录', 'Continue through the institute timeline', '三段记录依次展开，直接接入核心剧情。', 'Three linked records unfold directly into the Core story.', 'f6-medical'),
  c('f6-open-cradle', '听一听白铃后的旧摇篮曲', 'Listen to the old lullaby behind the white bell', '一段可选回忆，听完继续主线。', 'A brief optional memory, then the main story continues.', 'f6-cradle'),
] }
revise('f6-investigation', '研究楼留下的真相', 'What the Institute Left Behind', [
  n('终端认出了日记里的转运编号，一段接一段地铺开：病情、波形、事故原片。这一次不用再翻一排排柜子，三段画面自己接上了。', 'The terminal recognized the transfer serial in the journal and laid the records out one after another: condition, waveforms, the crash original. No row of cabinets this time. The three of them linked up on their own.'),
  s('me', '先看完。要的东西都在这儿，不用再绕回同一张桌子。', 'Let me finish watching. What I need is here. No point circling back to the same desk.'),
])
linear('f6-medical', 'f6-medical-kept')
linear('f6-medical-kept', 'f6-waveform', { clues: ['f6-medical-log'] })
linear('f6-waveform', 'f6-waveform-kept')
linear('f6-waveform-kept', 'f6-accident-log', { clues: ['f6-waveform'] })
linear('f6-accident-log', 'f6-accident-kept')
linear('f6-accident-kept', 'f6-core-door', { clues: ['f6-car-log'] })
linear('f6-cradle', 'f6-cradle-kept')
linear('f6-cradle-kept', 'f6-medical', { clues: ['f6-cradle-memory'], flags: ['f6-cradle-ready'] })
linear('f6-core-door', 'f6-core', { flags: ['f6-local-evidence-ready'] })
revise('f6-organization', '三个人都没有退让', 'None of the Three Backs Down', [
  s('niulai', '拿到真相就算赢了？标记还在，奶蛙就是项目的。', 'You think having the truth means you won? The mark is still there. Naiwa belongs to the project.'),
  s('banana-cat', '公开的录像我删了。你就是走出去，谁会信一本日记。', 'I deleted the public footage. Walk out of here and who is going to believe a journal.'),
  s('naidou', '病情能重新解释，抽取换个名字就行。等他醒了，我们照样能接着做。', 'His condition can be rewritten. Extraction can be renamed. Once he wakes, we carry on the same way.'),
  s('me', '你们要的不是它好起来。是它永远走不掉。', 'You never wanted him well. You wanted him unable to leave.'),
])
revise('f6-core-blockade', '牛来的最后一次辩解', 'Niulai’s Last Defense', [
  s('niulai', '这座城市要这个核心。为了一个奶蛙把项目停了，你担得起吗？', 'This city needs the Core. Stop the project over one Naiwa, and can you carry what follows?'),
  s('me', '需要它，问过它愿不愿意吗？整座城市压下来，一次都不许它说不。', 'You need him. Did you ever ask if he agrees? The whole city on his back, and never once allowed to say no.'),
  s('naidou', '同意可以后补。先把结果做出来，过程慢慢解释。', 'Consent can be signed afterward. Get the result first. Explain the process later.'),
  n('牛来等着我先让一步。奶豆把新的抽取计划放上了控制台。香蕉猫举起镜头，准备给这场争吵留下另一个版本。', 'Niulai waited for me to give ground. Naidou set a new extraction plan on the console. Banana Cat raised its camera, ready to keep another version of the argument.'),
])
live['f6-core-blockade'].choices = [
  c('f6-argue-consent', '指出没有同意的“保护”就是控制', 'Call protection without consent what it is: control', '让他们正面回答奶蛙有没有拒绝权。', 'Make them answer whether Naiwa can refuse.', 'f6-breaker'),
  c('f6-argue-result', '质问所谓成功为什么让奶蛙更虚弱', 'Ask why their success leaves Naiwa weaker', '从他们自己的数值反驳“结果至上”。', 'Use their own readings to challenge the result they claim.', 'f6-breaker', { spirit: -10 }),
]
revise('f6-breaker', '他们回答不了的一个问题', 'The Question They Cannot Answer', [
  s('me', '要是奶蛙亲口说不。你们停不停？', 'If Naiwa says no, out loud. Do you stop?'),
  n('牛来没答。奶豆把计划又往前推了推。香蕉猫提前关了录像。他们谁都没说话，可这比刚才每一句都清楚。', 'Niulai did not answer. Naidou pushed the plan a little closer. Banana Cat stopped the recording early. None of them said a word. It was clearer than everything they had said before it.'),
  s('naiwa', '那就听好。我不愿意。', 'Then hear it. I do not agree.'),
])
linear('f6-breaker', 'f6-accountability', { flags: ['f6-blockade-broken'] })
revise('f6-accountability', '先救人，再面对过去', 'Save Him, Then Face the Past', [
  s('naiba', '车祸是我做的。我不拿“为了保护”当借口，也不要你去替我说原谅。', 'I caused the crash. I will not hide behind protecting you. And I am not asking you to say the word for me.'),
  s('me', '我没忘。先让它醒过来。剩下的，等它自己能答了再说。', 'I have not forgotten. First let Naiwa wake. The rest waits until he can answer on his own.'),
  n('奶霸留下了事故原片，把停机的线路指给我看。这一次，他没有替我按下任何一个按钮。', 'Naiba left the crash original and pointed out the shutdown circuit. This time he did not press a single button for me.'),
])
linear('f6-accountability', 'f6-rooftop', { flags: ['f6-responsibility-faced'] })
revise('f6-rooftop', '最后一场争论', 'The Last Argument', [
  n('屋顶底下还是晚归的车流。肥嘟嘟站在对面楼顶，城市的灯映着它眼周那圈黑印。奶豆守抽取盘，香蕉猫把天台门关上了。', 'Late traffic still moved below. Feidudu stood on the roof opposite, the city lights caught in the dark ring around its eyes. Naidou stood over the extraction panel. Banana Cat shut the rooftop door.'),
  s('feidudu', '奶蛙，你要是跟他们走，我做的这一切就都不算了。', 'Naiwa. Walk out with them, and everything I did counts for nothing.'),
  s('naiwa', '我会记得你。但我不能为了证明你没错，一直躺回去挨。', 'I will remember you. But I cannot keep going back under just to prove you were right.'),
  s('naidou', '身体快醒了。现在加大抽取，还赶得上下一轮。', 'The body is close to waking. Push the extraction now, and there is still time for another cycle.'),
  s('me', '没有下一轮。停机线路在这儿，就在我手边。', 'There is no next cycle. The shutdown circuit is here, right under my hand.'),
])
live['f6-rooftop'].choices = [
  c('f6-cut-relay', '停下抽取，让奶蛙自己醒来', 'Stop extraction and let Naiwa wake himself', '关闭线路，把决定留给奶蛙。', 'Disconnect the line and leave the choice to Naiwa.', 'f6-cut-ready', { requires: ['flag:f6-responsibility-faced', 'flag:f6-local-evidence-ready'], sets: ['fight-ready', 'extraction-cut'] }),
  c('f6-take-deal', '接受牛来提出的暂时停机', 'Accept Niulai’s temporary shutdown offer', '机器会暂停，但组织保留重新启动的权力。', 'The machine pauses, but the institute retains restart control.', 'f6-body-awake', { sets: ['f6-deal-made'] }),
  c('f6-play-cradle', '用旧摇篮曲陪奶蛙走完苏醒', 'Use the old lullaby to accompany his awakening', '可选回忆带来的另一种安抚方式。', 'Another way to settle him, found in the optional memory.', 'f6-cradle-prepare', { requires: ['clue:f6-cradle-memory'], sets: ['fight-ready', 'f6-cradle-ready', 'extraction-cut'] }),
]
// Naidou is pictured operating the pump AGAINST the player, never helping them.
revise('f6-cut-ready', '这次谁也不能重启', 'No One Will Restart It This Time', [
  n('奶豆伸手去开备用泵。蓝灯刚亮起来，就让我断掉的总线路掐灭了。她还在往临床记录里写“异常”。我懒得再等她解释。', 'Naidou reached for the backup pump. The blue light came on and died against the main circuit I had cut. She was still writing abnormal into the chart. I stopped waiting for her to explain.'),
  s('me', '那张表你接着改。奶蛙不会再躺回你的床上。', 'Keep editing the chart. Naiwa is not going back into your bed.'),
  s('naiwa', '我听见了。往后这段路，我自己走。', 'I hear you. The next stretch of road, I walk it myself.'),
])
revise('f6-cradle-prepare', '旧歌声里的停机', 'Shutdown Within the Old Song', [
  n('奶豆试着去重启备用泵。我照记录断开总线路，又念起那段短短的摇篮曲。警报声一点点慢了下来。', 'Naidou tried the backup pump again. I cut the main circuit as the record said, then read the short lullaby out loud. The alarm slowed, a little at a time.'),
  s('me', '这首歌就唱给你一个人听。醒不醒，往哪走，你自己答。', 'This song is only for you. Wake or not, which way to go — your answer.'),
  s('naiwa', '我想回去。想回到你旁边。', 'I want to come back. Back to where you are.'),
])
revise('f6-body-awake', '走上屋顶的是奶蛙本体', 'Naiwa’s Own Body Walks Onto the Roof', [
  n('病房门从里面被推开了。奶蛙扶着门框，掉下来的监护线拖在脚边。绿眼睛终于对上我。站在我面前的，是现实里的奶蛙本体。', 'The ward door opened from the inside. Naiwa stood against the frame, loose monitor leads trailing at his feet. The green eyes finally found mine. This was Naiwa’s body, here in the real world.'),
  s('naiwa', '你等了那么久。这一次，换我走过来。', 'You waited so long. This time, I walk to you.'),
  n('奶蛙走到天台边。肥嘟嘟在对面的楼上站着。中间隔着一座还亮着灯的城市。奶霸留在奶蛙意识的最深处，没有出来替它打这一场。', 'Naiwa walked to the rooftop edge. Feidudu stood on the tower across from it. Between them, a city still lit. Naiba stayed deep inside Naiwa. He did not come out to fight this one for him.'),
  s('feidudu', '为了他们，你真要跟我走到这一步？', 'For them. You would really take it this far with me?'),
  s('naiwa', '为了我自己。要说的，我说完了。', 'For myself. What I had to say, I have said.'),
])
revise('f6-post-film', '灯火之后，只剩废墟', 'After the Lights, Only Ruins', [
  n('紫色的光吞掉了最后一栋楼。再睁眼，城市已经是一片废墟。整条街压在混凝土底下，刚才的万家灯火，只剩几点零散的火。', 'Violet light swallowed the last tower. When I opened my eyes the city was rubble. The street was under concrete. Of all those lit windows, only scattered fires were left.'),
  n('我从半截楼梯里爬出来，喊了两声奶蛙。没人应。日记掉在碎石边上，一只灰色的小手压着封面。', 'I crawled out of a broken stairwell and called Naiwa’s name twice. Nothing. The journal had fallen by the rubble, a small grey hand resting on its cover.'),
  s('me', '奶蛙……我找到你了。看着我，别睡。', 'Naiwa… I found you. Look at me. Do not go to sleep.'),
])
linear('f6-post-film', 'f6-injury-reveal')
live['f6-injury-reveal'] = { title: b('断在腰间的身体', 'A Body Severed at the Waist'), art: 'aftermath', lines: [
  n('走近了我才看清，那不是它跪在瓦砾里。最后那一下把它从腰上截断了。上半身靠着断墙，下半身在几步外，中间什么都没有。', 'Only up close did I see it was not kneeling in the rubble. The last impact had cut Naiwa in half at the waist. His upper body rested against a broken wall. The lower half lay a few steps away. Between them, nothing.'),
  n('它的手还压在日记上。到最后，它大概还想把那一页交回我手里。', 'His hand was still pressed to the journal. To the end, he must have been trying to hand that page back to me.'),
  n('我蹲下去喊它的名字。喊到第二遍，它的嘴动了一下。', 'I knelt and said his name. On the second try, his mouth moved.'),
  s('naiwa', '你……没事就好。', 'You… are safe. That is good.'),
  s('me', '别说这个。你才刚醒，我们还没一起回家。', 'Do not say that. You just woke up. We have not gone home together yet.'),
  s('naiwa', '日记……别弄丢了。', 'The journal… do not lose it.'),
  n('奶蛙的声音停了。胸口那一点光，在我眼前一点一点暗下去。', 'Naiwa went quiet. The last bit of light in his chest dimmed, a little at a time, right in front of me.'),
], next: 'f6-ruin-search' }
revise('f6-ruin-search', '废墟里的最后通牒', 'An Ultimatum in the Ruins', [
  s('niulai', '把奶蛙给我。修复设备我还有，只有我们接得回他的身体。', 'Give me Naiwa. I still have the repair equipment. Only we can put his body back together.'),
  s('me', '都别过来。', 'Stay back. All of you.'),
  s('naidou', '先把泵接回去，生命体征以后再算。这个状态，正好做下一轮。', 'Reconnect the pump first. Vital signs can be worked out later. In this state he is ideal for the next round.'),
  n('香蕉猫的哭声停了，它悄悄把镜头又对准了奶蛙。我还没答话，牛来已经掏出一副新的监护环。', 'Banana Cat stopped crying and quietly turned its camera back onto Naiwa. Before I said a word, Niulai had another monitoring band out.'),
  s('me', '都到这一步了，你们眼里还是个样本。', 'Even now, all you see is a sample.'),
  n('我挡在奶蛙前面。他们三个，谁都没有后退。', 'I put myself in front of Naiwa. Not one of them stepped back.'),
])
linear('f6-ruin-search', 'f6-ruin-rescue')
revise('f6-ruin-rescue', '还有一个人没有离开', 'One Person Has Not Left', [
  n('奶蛙胸口亮起一点很淡的紫光。奶霸从那道光里浮出来，膝盖落在瓦砾上。他右手那副金属护腕，已经裂了。', 'A faint purple light came up in Naiwa’s chest. Naiba rose out of it and dropped to his knees in the rubble. The gauntlet on his right hand was cracked.'),
  s('naiba', '还有我。别把他交出去。', 'You still have me. Do not hand him over.'),
  s('me', '你……你还在？', 'You… you are still here?'),
  s('naiba', '我不在，他就没了。先听我说完。', 'If I were gone, he would be too. Hear me out first.'),
  s('me', '你能救他？说怎么做，我来。', 'You can save him? Tell me what to do. I will do it.'),
  s('naiba', '我和他来自同一个核心。那道断口，我全部的意识能填回去，把他的身体接上。但要全部。', 'He and I come from the same Core. That break — my whole awareness can fill it and put his body back together. All of it, though.'),
  n('他低头看了一眼自己那只手。指尖已经开始透了。我这才明白，“全部”是什么意思——以后再没有一个人，能替他回答我们。', 'He looked down at his hand. The fingertips had already gone see-through. That was when I understood what all of it meant. There would be no one left to answer us.'),
])
linear('f6-ruin-rescue', 'f6-naiba-farewell')
live['f6-naiba-farewell'] = { title: b('这一笔，我自己还', 'This One I Pay Myself'), art: 'aftermath', lines: [
  s('me', '不行。再找找，肯定还有别的办法。你和他才刚说上话……', 'No. Look again. There has to be another way. You and he only just started talking…'),
  s('naiba', '没有别的办法。那本日记你翻过，你比我清楚。', 'There is no other way. You have read that journal. You know better than I do.'),
  s('naiba', '以前风险是我替你们挑的，账都记在奶蛙身上。今天这一笔，我自己还。', 'Before, I picked the risks and left Naiwa holding the bill. This one I pay myself.'),
  s('me', '你就这么还？一句话说完就走，连句道歉都不留给他？', 'That is how you pay it? One sentence and you go, without even leaving him an apology?'),
  s('naiba', '道歉是我的事，不是他的债。他醒了，不用替我还。', 'The apology is mine to carry, not his debt. When he wakes, he does not owe it for me.'),
  s('naiba', '这不抵那场车祸。原片留着，日记也留着。别因为今天我救了他，就把我做过的错事抹掉。', 'This does not settle the crash. Keep the original. Keep the journal. Do not wipe out what I did wrong because I saved him today.'),
  s('me', '那他醒了问我，你去哪了，我怎么说？', 'And when he wakes up and asks where you went. What do I say?'),
  s('naiba', '就跟他说，最后这一段，我没替他走。我只是把能让他接着走下去的东西，还给他了。', 'Tell him I did not take his last stretch for him. I only gave back the part he needs to keep walking.'),
  s('me', '……你还有什么要我带给他的？', '…Is there anything else you want me to give him?'),
  s('naiba', '让他把那本日记写完。', 'Tell him to finish the journal.'),
  n('奶霸抬起右手，把手心按在奶蛙胸口上。那副护腕的光，照亮了旁边沾满灰的日记。', 'Naiba lifted his right hand and laid his palm on Naiwa’s chest. The gauntlet’s light fell across the dusty journal beside them.'),
], next: 'f6-naiba-sacrifice' }
live['f6-naiba-sacrifice'] = { title: b('紫色身影，最后一次发光', 'The Purple Figure’s Last Light'), art: 'aftermath', lines: [
  n('护腕上的光全流进了奶蛙。断开的身体被金色的线一点点接回去。停下的呼吸，重新响了起来。', 'All the light in the gauntlet poured into Naiwa. Golden threads drew his severed body back together, one piece at a time. The breath that had stopped started again.'),
  n('奶霸的轮廓从指尖开始散。先是手，然后是肩膀。', 'Naiba’s outline began to come apart at the fingertips. First the hand. Then the shoulder.'),
  s('naiba', '别给我留备份。我留下一点，他就回不来。', 'Do not keep a spare of me. If any of me stays, he cannot come back.'),
  s('me', '奶霸，等等——就一句，让我说完。', 'Naiba, wait — one sentence. Let me finish it.'),
  s('naiba', '我听见了。', 'I heard you.'),
  s('me', '你还没听我——', 'You have not even heard—'),
  s('naiba', '带他回家。', 'Take him home.'),
  n('最后一粒紫光落进奶蛙胸口。护腕掉在碎石上，成了没有光的空壳。奶霸的样子，他的声音，都没了。一丝能再叫回来的意识，也没留下。', 'The last purple mote sank into Naiwa’s chest. The gauntlet dropped onto the rubble, a shell with no light left in it. Naiba’s shape and his voice were gone. Nothing of him remained to call back.'),
], next: 'f6-revival' }
live['f6-revival'] = { title: b('奶蛙回来了', 'Naiwa Returns'), art: 'aftermath', onEnter: { flags: ['f6-naiba-sacrificed', 'f6-revived'] }, lines: [
  n('奶蛙的手指动了一下。绿眼睛慢慢睁开，腰上的断口合上了，身体重新连成一片。我抱着它，一直到心跳声稳下来。', 'Naiwa’s fingers moved. The green eyes opened slowly. The break at his waist had closed, and his body was one piece again. I held him until the heartbeat settled.'),
  s('naiwa', '奶霸呢？刚才……我听见他的声音了。', 'Where is Naiba? Just now… I heard his voice.'),
  n('我没答。它又问了一遍。', 'I did not answer. He asked again.'),
  n('我把空掉的护腕放在它面前。奶蛙看着那副东西，看了很久。', 'I put the empty gauntlet in front of him. Naiwa looked at it for a long time.'),
  s('naiwa', '他在里面。我找得到他。你等我一下。', 'He is in there. I can find him. Give me a moment.'),
  n('它闭上眼，等了很久。意识里那声熟悉的回应，一直没有来。', 'He closed his eyes and waited a long time. The familiar answer inside him never came.'),
  s('me', '他把全部都给你了。他最后让我带你回家。', 'He gave you everything he had. He told me to take you home.'),
  s('naiwa', '可我还没跟他说上话……我也想让他一起回家。', 'But I never got to tell him… I wanted him to come home too.'),
  n('奶蛙把护腕抱在怀里，抱得很紧。身后的城市回不到昨晚了。往后的日子还能过，只是里面少了一个声音。', 'Naiwa hugged the gauntlet against his chest and would not let go. The city behind him would not go back to last night. Life could go on from here. It would just be missing a voice.'),
], next: 'f6-ruin-record' }
linear('f6-ruin-record', 'f6-ruin-relay', { clues: ['f6-survivors', 'f6-ruin-record'] })
revise('f6-ruin-record', '救援灯终于到了', 'The Rescue Lights Arrive', [
  n('救援队的灯照进了废墟。我把奶蛙交给赶来的医护，把日记里存好的完整记录发了出去。不用再回头翻一份又一份物证了。', 'Rescue lights came into the ruins. I handed Naiwa to the medics and sent out the complete records already saved in the journal. There was no need to go back for another piece of evidence.'),
  n('伤员往南边的广场转移。肥嘟嘟也被从塌楼底下挖出来，一直没再看奶蛙一眼。三个组织成员还想把这一夜说成意外，那些记录比他们先到了救援终端。', 'The injured were carried toward the square in the south. Feidudu was pulled from the fallen tower too, and never looked at Naiwa again. The three of them were still calling it an accident. The records had reached the rescue terminal before they did.'),
])
revise('f6-ruin-relay', '他们仍不肯放手', 'They Still Refuse to Let Go', [
  n('奶蛙被救回来了，可组织留下的备用标记还亮着。牛来拿着遥控器追到救援车边上，奶豆跟在他身后，香蕉猫悄悄把摄像头又接上了。', 'Naiwa had been brought back, but the institute’s backup mark was still lit. Niulai reached the ambulance with a remote in his hand. Naidou stood behind him. Banana Cat quietly reconnected its camera.'),
  s('niulai', '把他交给我们。我能让你们少受点罪。剩下的记录，不必让外人看见。', 'Give him to us. I can spare you some of the pain. The rest of those records do not need outsiders seeing them.'),
  s('naiwa', '奶霸都没了。你们连我剩下的这点，也要拿？', 'Naiba is gone. And you want what little I have left?'),
])
revise('f6-resolution', '带着缺席继续走', 'Going On With Someone Missing', [
  n('奶霸用他自己换回了奶蛙。城市没有跟着复原，那句没说完的告别，也重来不了。奶蛙抱着没有光的护腕，抬头看我。剩下要决定的只有一件事：往后的日子，还交不交给他们。', 'Naiba traded himself back for Naiwa. The city did not come back with him, and the goodbye left unfinished would not be said again. Naiwa held the unlit gauntlet and looked up at me. One thing was left to decide: whether the days ahead went back into their hands.'),
  s('naiwa', '他留下的那些事，我想慢慢看。但往后怎么活，我想自己定。', 'What he left behind, I want to take my time with. But how I live from here, I want to decide myself.'),
  s('me', '我陪你。日记和他那副护腕，都带走。', 'I am with you. The journal and his gauntlet, we take them both.'),
])
live['f6-resolution'].choices = [
  c('f6-reconcile-choice', '保留全部记忆，和奶蛙一起离开', 'Keep every memory and leave with Naiwa', '记住奶霸的献祭，也保留事故的真相。', 'Remember Naiba’s sacrifice without erasing the crash.', 'f6-ending-reconcile', { requires: ['flag:fight-ready', 'flag:extraction-cut', 'flag:f6-responsibility-faced'], sets: ['f6-merge-consent'] }),
  c('f6-sever-choice', '让奶蛙暂时封存告别，先去治疗', 'Let Naiwa set the farewell aside and seek treatment', '奶霸不会回来；只是给奶蛙一点面对失去的时间。', 'Naiba will not return. Naiwa needs time to face the loss.', 'f6-ending-sever', { requires: ['flag:extraction-cut', 'flag:f6-responsibility-faced'], sets: ['f6-separation-chosen'] }),
  c('f6-captured-choice', '接受组织提出的后续治疗', 'Accept the institute’s follow-up treatment', '牛来、奶豆和香蕉猫仍握着备用装置。', 'Niulai, Naidou and Banana Cat still control the backup device.', 'f6-ending-captured'),
  c('f6-cradle-choice', '让奶蛙唱完旧歌，解除备用标记', 'Let Naiwa finish the old song and release the mark', '先前听过的可选回忆，让奶蛙有另一种告别方式。', 'The optional memory offers Naiwa another way to say goodbye.', 'f6-ending-cradle', { requires: ['clue:f6-cradle-memory', 'flag:extraction-cut', 'flag:f6-cradle-ready', 'flag:f6-responsibility-faced'], sets: ['f6-merge-consent'] }),
]
revise('f6-ending-reconcile', '把他留下的话带回去', 'Carry His Words Home', [
  s('naiwa', '他做错的事，我会记着。他最后救了我，我也记着。哪一件我都不想删。', 'What he did wrong, I will keep. That he saved me at the end, I will keep that too. I am not erasing either one.'),
  n('奶蛙把日记和空掉的护腕摆在一起。备用标记断了，牛来的遥控器再也没有回应。奶霸没有回来。胸口那第二道光，也没有再亮。', 'Naiwa set the journal beside the empty gauntlet. The backup mark went dark. Niulai’s remote got no answer. Naiba did not come back. The second light in Naiwa’s chest did not come on again.'),
  n('我们在临时医疗帐篷里等到了天亮。城市得重建，组织要面对那些被公开的记录。奶蛙在日记最后一页画了两只小手，一只涂成了紫色。', 'We waited in a relief tent until dawn. The city would have to be rebuilt. The institute would have to face the records now out in the open. On the last page of the journal, Naiwa drew two small hands and colored one of them purple.'),
  s('me', '走吧。回家。', 'Come on. Let us go home.'),
])
revise('f6-ending-sever', '没能说出口的告别', 'The Farewell Left Unsaid', [
  n('奶蛙让医护把告别那段记忆先放好。身体是奶霸救回来的，伤还得治。它只是还做不到，一遍遍去想起那道散掉的身影。', 'Naiwa asked the medics to set the farewell aside for now. His body had been restored, but the wounds still needed treating. He just could not yet stand to remember that figure coming apart.'),
  s('naiwa', '我知道他没了。那一晚的事，先别让我讲。等我想好了，我自己会去翻那本日记。', 'I know he is gone. Not yet. Let me not talk about it. When I am ready, I will open the journal myself.'),
  n('事故原片和那晚的经过，我都存好了。护腕装进袋子，我陪它上了救援车。没说出口的告别，不该变成被撕掉的一页。', 'I saved the crash original and the account of that night, both. I packed the gauntlet away and got into the rescue vehicle with him. A goodbye left unsaid should not become a page torn out.'),
])
revise('f6-ending-captured', '新的通道', 'A New Conduit', [
  n('奶霸拿全部意识换回来的那具身体，被奶豆重新扣上了监护环。香蕉猫把车窗拍成“治疗转运”。牛来在那张抽取许可上补了个日期。', 'Naidou fastened a monitoring band back onto the body Naiba had paid everything to restore. Banana Cat filmed the van and called it a medical transfer. Niulai added a date to the extraction permit.'),
  s('naiwa', '不是……说好回家的吗？', 'You said… that we were going home.'),
  n('牛来没答话。新的计数又亮了起来。空护腕留在救援帐篷里。奶蛙是回来了，可我们把它又送回了那条通道。', 'Niulai did not answer. The extraction counter came on again. The empty gauntlet stayed behind in the rescue tent. Naiwa had come back, and we had put him back into the conduit.'),
])
revise('f6-ending-cradle', '摇篮之外的清晨', 'Morning Beyond the Cradle', [
  n('奶蛙把那段短短的摇篮曲哼完了。备用标记一寸寸褪下去，牛来的遥控器彻底没了动静。这首歌没能把奶霸叫回来，可它让奶蛙把告别说完了。', 'Naiwa hummed the short lullaby to the end. The backup mark faded, inch by inch, and Niulai’s remote went dead. The song could not bring Naiba back. It let Naiwa finish saying goodbye.'),
  s('naiwa', '谢谢你让我回来。这一次，我自己走。', 'Thank you for bringing me back. This time, I walk it myself.'),
  n('天亮的时候，救援队把三个组织成员带走了。奶豆还在说设备合规。香蕉猫想把镜头藏起来。牛来攥着早就没用的遥控器。他们谁也没变成我们这边的人。', 'At dawn the rescuers took the three of them off the site. Naidou was still saying the equipment was compliant. Banana Cat was trying to hide its camera. Niulai was gripping a remote that had stopped working. None of them had ended up on our side.'),
  n('奶蛙把空护腕和日记放在一起，跟着我走第一条清出来的路。它问我，回去以后，能不能一起吃早饭。', 'Naiwa set the empty gauntlet beside the journal and followed me along the first path cleared through the rubble. It asked whether we could have breakfast together when we got home.'),
  s('me', '能啊。慢慢走。', 'We can. Let us take our time.'),
])

const initialNode = (chapter: FinaleChapter): string => chapter === 5 ? 'f5-descent' : 'f6-entry'
const carryableFiveClues = ['f5-signal', 'f5-ledger-proof', 'f5-film-proof', 'f5-members-proof', 'f5-maintenance-log', 'f5-cradle-map']
const clueIds: Record<FinaleChapter, string[]> = {
  5: ['f5-signal', 'f5-ledger-proof', 'f5-film-proof', 'f5-members-proof', 'f5-maintenance-log', 'f5-cradle-map'],
  6: ['f6-medical-log', 'f6-waveform', 'f6-car-log', 'f6-cradle-memory', 'f6-survivors', 'f6-ruin-record'],
}
const flagIds: Record<FinaleChapter, string[]> = {
  5: ['f5-called', 'f5-evidence', 'f5-showed-original', 'f5-naidou-trust', 'f5-refused', 'f5-sacrificed', 'f5-hospital-alerted', 'f5-cradle-route'],
  6: ['f6-blockade-broken', 'f6-local-evidence-ready', 'fight-ready', 'extraction-cut', 'f6-responsibility-faced', 'f6-no-forgiveness', 'f6-heard-explanation', 'f6-cradle-ready', 'f6-merge-consent', 'f6-separation-chosen', 'f6-deal-made', 'film-completed'],
}
clueIds[5] = uniqueIds([...clueIds[5], ...clueIds[6]])
flagIds[5] = uniqueIds([...flagIds[5], ...flagIds[6], 'f5-camera-evaded', 'f6-blockade-broken', 'f6-naiba-sacrificed', 'f6-revived'])
function uniqueIds(values: string[]) { return [...new Set(values)] }
const nodeRequirements: Record<string, string[]> = {
  'f5-lab-entry': ['clue:f5-ledger-proof', 'clue:f5-film-proof'],
  'f5-ending-bargain': ['flag:f5-sacrificed'],
  'f6-core-door': ['clue:f6-medical-log', 'clue:f6-waveform', 'clue:f6-car-log'],
  'f6-core': ['flag:f6-local-evidence-ready'],
  'f6-origin': ['flag:f6-local-evidence-ready'],
  'f6-crash-truth': ['flag:f6-local-evidence-ready'],
  'f6-organization': ['flag:f6-local-evidence-ready'],
  'f6-accountability': ['flag:f6-local-evidence-ready'],
  'f6-core-blockade': ['flag:f6-local-evidence-ready'],
  'f6-breaker': ['flag:f6-local-evidence-ready'],
  'f6-rooftop': ['flag:f6-responsibility-faced'],
  'f6-cut-ready': ['flag:extraction-cut'],
  'f6-cradle-prepare': ['clue:f6-cradle-memory', 'flag:f6-cradle-ready'],
  'f6-post-film': ['flag:film-completed'],
  'f6-ruin-search': ['flag:film-completed'],
  'f6-ruin-rescue': ['flag:film-completed'],
  'f6-ruin-record': ['flag:film-completed'],
  'f6-ruin-relay': ['flag:film-completed', 'clue:f6-survivors'],
  'f6-resolution': ['flag:film-completed'],
  'f6-ending-reconcile': ['flag:fight-ready', 'flag:extraction-cut', 'flag:f6-responsibility-faced'],
  'f6-ending-sever': ['flag:extraction-cut', 'flag:f6-responsibility-faced'],
  'f6-ending-cradle': ['clue:f6-cradle-memory', 'flag:extraction-cut', 'flag:f6-cradle-ready', 'flag:f6-responsibility-faced'],
}
const nodeRequirementAlternatives: Record<string, string[][]> = {
  'f6-body-awake': [
    ['flag:fight-ready', 'flag:extraction-cut'],
    ['flag:f6-deal-made'],
    ['flag:f6-cradle-ready', 'flag:extraction-cut'],
  ],
  'f6-battle-film': [
    ['flag:fight-ready', 'flag:extraction-cut'],
    ['flag:f6-deal-made'],
    ['flag:f6-cradle-ready', 'flag:extraction-cut'],
  ],
}
const failNode = (chapter: FinaleChapter): string => chapter === 5 ? 'f5-exhausted' : 'f6-exhausted'
const clamp = (value: number, max: number): number => Math.max(0, Math.min(max, Math.floor(value)))
const unique = (items: string[]): string[] => [...new Set(items)]
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const meetsRequirement = (save: Pick<FinaleSave, 'spirit' | 'clues' | 'flags'>, requirement: string): boolean => {
  if (requirement.startsWith('clue:')) return save.clues.includes(requirement.slice(5))
  if (requirement.startsWith('flag:')) return save.flags.includes(requirement.slice(5))
  const spirit = requirement.match(/^spirit>=(\d+)$/)
  if (spirit) return save.spirit >= Number(spirit[1])
  return save.flags.includes(requirement) || save.clues.includes(requirement)
}
const meetsAll = (save: Pick<FinaleSave, 'spirit' | 'clues' | 'flags'>, requirements: string[] = []): boolean => requirements.every(item => meetsRequirement(save, item))
const canEnter = (chapter: FinaleChapter, id: string, save: Pick<FinaleSave, 'spirit' | 'clues' | 'flags'>): boolean => {
  if (save.spirit <= 0 && id !== failNode(chapter) && !finaleStories[chapter][id]?.ending) return false
  if (chapter === 5) {
    if (['f6-injury-reveal', 'f6-naiba-farewell', 'f6-naiba-sacrifice', 'f6-revival'].includes(id) && !save.flags.includes('film-completed')) return false
    if (['f6-ruin-record', 'f6-ruin-relay', 'f6-resolution', 'f6-ending-reconcile', 'f6-ending-sever', 'f6-ending-captured', 'f6-ending-cradle'].includes(id) && !meetsAll(save, ['flag:film-completed', 'flag:f6-naiba-sacrificed', 'flag:f6-revived'])) return false
  }
  const alternatives = nodeRequirementAlternatives[id]
  if (alternatives && !alternatives.some(requirements => meetsAll(save, requirements))) return false
  return meetsAll(save, nodeRequirements[id])
}

export function newFinaleSave(chapter: FinaleChapter, endings: string[] = [], carry: string[] = []): FinaleSave {
  const validEndings = finaleEndingIds[chapter]
  const carried = chapter === 6 ? unique(carry.filter(id => carryableFiveClues.includes(id))) : []
  return {
    version: 1, chapter, node: initialNode(chapter), line: 0, spirit: 100,
    clues: carried, flags: carried.map(id => 'carry:' + id),
    endings: unique(endings.filter(id => validEndings.includes(id))), visited: [initialNode(chapter)], history: [],
  }
}

export function finaleCarryFromFive(raw: string | unknown): string[] {
  let source: unknown = raw
  if (typeof raw === 'string') {
    try { source = JSON.parse(raw) as unknown } catch { return [] }
  }
  const save = normalizeFinaleSave(5, source)
  return unique(save.clues.filter(id => carryableFiveClues.includes(id)))
}

export function normalizeFinaleSave(chapter: FinaleChapter, raw: unknown): FinaleSave {
  const fresh = newFinaleSave(chapter)
  if (!isRecord(raw) || raw.version !== 1 || (raw.chapter !== undefined && raw.chapter !== chapter)) return fresh
  const nodes = finaleStories[chapter]
  const clues = Array.isArray(raw.clues)
    ? unique(raw.clues.filter((id): id is string => typeof id === 'string' && (clueIds[chapter].includes(id) || (chapter === 6 && carryableFiveClues.includes(id)))))
    : []
  const flags = Array.isArray(raw.flags)
    ? unique(raw.flags.filter((id): id is string => typeof id === 'string' && (
      flagIds[chapter].includes(id) || (chapter === 6 && id.startsWith('carry:') && carryableFiveClues.includes(id.slice(6)))
    )))
    : []
  const endings = Array.isArray(raw.endings) ? unique(raw.endings.filter((id): id is string => typeof id === 'string' && finaleEndingIds[chapter].includes(id))) : []
  const visited = Array.isArray(raw.visited) ? unique(raw.visited.filter((id): id is string => typeof id === 'string' && Object.hasOwn(nodes, id))) : []
  const history = Array.isArray(raw.history) ? raw.history.filter((item): item is { node: string; line: number } => isRecord(item) && typeof item.node === 'string' && Object.hasOwn(nodes, item.node) && Number.isInteger(item.line) && Number(item.line) >= 0 && Number(item.line) < Math.max(1, nodes[item.node].lines.length)).map(item => ({ node: item.node, line: item.line })) : []
  const spirit = typeof raw.spirit === 'number' && Number.isFinite(raw.spirit) ? clamp(raw.spirit, 100) : 100
  let node = typeof raw.node === 'string' && Object.hasOwn(nodes, raw.node) ? raw.node : initialNode(chapter)
  const state = { spirit, clues, flags }
  if (spirit <= 0 && node !== failNode(chapter)) node = failNode(chapter)
  else if (!canEnter(chapter, node, state)) node = initialNode(chapter)
  const maxLine = Math.max(0, nodes[node].lines.length - 1)
  const line = typeof raw.line === 'number' && Number.isFinite(raw.line) ? clamp(raw.line, maxLine) : 0
  const safeVisited = unique([...visited, initialNode(chapter), node])
  const currentEnding = nodes[node].ending
  const safeEndings: string[] = currentEnding && !endings.includes(currentEnding) ? [...endings, currentEnding] : endings
  return { version: 1, chapter, node, line, spirit, clues, flags, endings: safeEndings, visited: safeVisited, history: history.slice(-200) }
}

const enterFinaleNode = (save: FinaleSave, requested: string): FinaleSave => {
  if (save.spirit <= 0 && requested !== failNode(save.chapter)) return enterFinaleNode(save, failNode(save.chapter))
  const node = finaleStories[save.chapter][requested]
  if (!node || !canEnter(save.chapter, requested, save)) return save
  const history = [...save.history, { node: save.node, line: save.line }].slice(-200)
  return {
    ...save, clues: unique([...save.clues, ...(node.onEnter?.clues ?? [])]), flags: unique([...save.flags, ...(node.onEnter?.flags ?? [])]), node: requested, line: 0, visited: unique([...save.visited, requested]), history,
    endings: node.ending ? unique([...save.endings, node.ending]) : save.endings,
  }
}

export function finaleChoiceAvailable(save: FinaleSave, choice: FinaleChoice): boolean {
  const node = finaleStories[save.chapter][save.node]
  if (!node || node.ending || !(node.choices ?? []).some(item => item.id === choice.id)) return false
  if (save.line < node.lines.length - 1) return false
  if (!meetsAll(save, choice.requires)) return false
  const spirit = clamp(save.spirit + (choice.spirit ?? 0), 100)
  if (spirit <= 0) return true
  const projected = {
    spirit,
    clues: choice.clue ? unique([...save.clues, choice.clue]) : save.clues,
    flags: unique([...save.flags, ...(choice.sets ?? [])]),
  }
  return canEnter(save.chapter, choice.next, projected)
}

export function applyFinaleChoice(save: FinaleSave, id: string): FinaleSave {
  const node = finaleStories[save.chapter][save.node]
  if (!node || save.line < node.lines.length - 1) return save
  const choice = (node.choices ?? []).find(item => item.id === id)
  if (!choice || !finaleChoiceAvailable(save, choice)) return save
  const spirit = clamp(save.spirit + (choice.spirit ?? 0), 100)
  const clues = choice.clue ? unique([...save.clues, choice.clue]) : [...save.clues]
  const flags = unique([...save.flags, ...(choice.sets ?? [])])
  const changed = { ...save, spirit, clues, flags }
  if (spirit <= 0) return enterFinaleNode(changed, failNode(save.chapter))
  return enterFinaleNode(changed, choice.next)
}

export function advanceFinale(save: FinaleSave): FinaleSave {
  const node = finaleStories[save.chapter][save.node]
  if (save.spirit <= 0 && save.node !== failNode(save.chapter)) return enterFinaleNode(save, failNode(save.chapter))
  if (!node || node.kind === 'film') return save
  if (save.line < node.lines.length - 1) return { ...save, line: save.line + 1 }
  if (node.ending) return save
  return node.next ? enterFinaleNode(save, node.next) : save
}

export function completeFinaleFilm(save: FinaleSave): FinaleSave {
  const node = finaleStories[save.chapter][save.node]
  if (save.spirit <= 0 && save.node !== failNode(save.chapter)) return enterFinaleNode(save, failNode(save.chapter))
  if (!node || node.kind !== 'film' || save.line !== 0 || !node.next || !nodeRequirements[node.next]?.includes('flag:film-completed')) return save
  const changed = { ...save, flags: unique([...save.flags, 'film-completed']) }
  return enterFinaleNode(changed, node.next)
}
