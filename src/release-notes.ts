import type { Language } from './story'

export const previousRelease = {
  id: '2026-10-18-home-cast-refinement',
  date: '2026-10-18',
  title: { zh: '角色介绍 · 先见一面', en: 'Meet the cast' },
  intro: {
    zh: '保留主页新版角色介绍：大幅立绘、姓名与淡紫色的奶霸档案。章节预览、制作时间线和页尾恢复原来的布局与动效，此前的镜馆优化继续保留。',
    en: 'The home keeps its new character portraits, names and lavender Naiba spread. Chapter previews, the production timeline and closing section return to their earlier layouts and motion. Earlier mirror hall improvements are retained.',
  },
  items: [
    { tag: 'CHARACTER PORTRAITS', title: { zh: '保留这两张新的角色页', en: 'Keep the new character spreads' }, body: { zh: '奶蛙与奶霸使用大幅立绘、姓名和英文底字，切换入口收进标题旁。角色文字直接可读，立绘采用简短入场；支持键盘切换、查看小档案和定位章节预览。', en: 'Naiwa and Naiba have large portraits, names and English lettering, with their switches beside the heading. Character copy is immediately readable and portraits use a brief entrance. Keyboard switching, notes and links to chapter previews remain available.' } },
    { tag: 'FAMILIAR HOME', title: { zh: '其余部分回到熟悉的样子', en: 'The familiar page returns' }, body: { zh: '章节恢复横向标签与图文分栏，制作区恢复原来的时间线与工作台，页尾恢复原有排版和入场。封面、故事介绍及各章节独立介绍页保持原样。', en: 'Chapters return to horizontal tabs and a split image-and-copy view. The production timeline, workbench and closing section recover their earlier layout and motion. The cover, story introduction and separate chapter pages are retained.' } },
    {"tag": "MIRROR HALL PERFORMANCE", "title": {"zh": "镜面少算一次，画面照常跟随", "en": "Fewer repeat captures, mirrors that keep up"}, "body": {"zh": "同一帧、同一视角的折射背景与最终画面复用物证镜面采样，下一帧继续刷新。静态地图块不再随每个反射视角重复计算变换，保留水晶细节、灯光和探索路线。", "en": "The transmission background and final view share evidence-mirror captures within a frame, with a fresh capture on the next frame. Static map chunks no longer recompute transforms for every reflection view. Crystal detail, lighting and the exploration route are retained."}},
    {"tag": "FRAME PACING & CLEANUP", "title": {"zh": "极低档调度与重玩资源释放", "en": "Very low frame pacing and replay cleanup"}, "body": {"zh": "修正极低画质在不同刷新率下的帧调度漂移；菜单继续降低渲染频率，后台继续跳过画面。退出镜馆时补齐浮空水晶与物证实例缓冲释放，减少重复进入时的资源残留。", "en": "Fixed frame-scheduling drift in Very low graphics across display refresh rates. Menus retain a smaller rendering budget, and hidden pages skip drawing. Leaving the hall now releases floating-crystal and evidence instance buffers, reducing leftover resources on repeated visits."}},
    { tag: 'STORY JOURNAL', title: { zh: '每一页，有不同的读法', en: 'Each page has its own rhythm' }, body: { zh: '主页标题采用实心与描边排字，故事介绍加入首字放大、引言与页边批注。角色名字、章节编号和制作日期采用不同的层次，让长页更容易浏览。', en: 'Solid and outlined cover lettering leads into drop caps, introductions and margin notes. Character names, chapter numbers and production dates have distinct hierarchies, making the long page easier to browse.' } },
    { tag: 'PRINT & INK', title: { zh: '故事开场的字句与墨迹', en: 'Print and ink for the opening pages' }, body: { zh: '封面与故事介绍保留标题落位和重点词划线；角色区使用单次立绘过渡，其余区域延续原有动效。系统开启减少动态效果时静态展示。', en: 'The cover and story introduction retain their title and ink-stroke entrances. The cast uses a single portrait transition; other sections retain their earlier motion. Reduced-motion settings show the content statically.' } },
    { tag: 'ICE & EVIDENCE', title: { zh: '靠近后看得见的细节', en: 'Details to see up close' }, body: { zh: '平衡与高画质增加水晶端面、托盘卷边与固定螺钉，胶片有真实齿孔，镜片有厚度和倒角，录音盘补上分层边缘。物证位置与探索路线保持原样。', en: 'Balanced and High add crystal tip facets, rolled tray rims and small screws, physical film perforations, beveled glass thickness and stepped recording-disc edges. Evidence stays in place along the same exploration route.' } },
    { tag: 'VERY LOW GRAPHICS', title: { zh: '给较弱手机再留一档', en: 'A lighter option for less powerful phones' }, body: { zh: '新增“极低画质 · 省电”：进一步减少水晶与模型细节，关闭折射、实时镜面和雾粒子，保留简化的房间反光与路线照明，画面最高 30 帧。浮空水晶暂停运动；随时切回其他档位可恢复细节，不影响线索进度。', en: 'Very low · Battery saver further reduces crystals and model detail, disables refraction, live mirrors and mist particles, and keeps simpler room reflections and route lighting. Rendering is capped at 30 fps and floating crystals stop moving. Switch back to restore detail without changing clue progress.' } },
    {"tag":"READING PAUSE","title":{"zh":"切到后台，故事等你回来","en":"The story waits when you leave"},"body":{"zh":"第一章自动和快进在后台暂停，返回前台后从原位置继续。逐字对白在菜单打开时保持暂停，语音结束后的界面刷新不会让文字偷偷继续。","en":"Chapter-one Auto and Skip pause in the background and resume from the same position. Typed dialogue stays paused in menus, including when a finished voice clip refreshes the screen."}},
    { tag: 'CHECKPOINT REPLAY', title: { zh: '回到那一幕，也回到当时的镜馆', en: 'Return to the scene and its mirror hall' }, body: { zh: '第二章确认剧情树回放后，镜馆按首次抵达时的线索重新加载，不同结局显示对应分支的对白。取消回放保留现场，语言切换不重置探索；关闭面板或切换语言后，对白按当前前后台状态继续，累计解锁保留。', en: 'Confirmed chapter-two replay reloads the hall with its first-arrival clues, and endings show their own dialogue. Canceling replay keeps the scene; switching language keeps exploration. After panel closure or a language change, reading follows foreground and background state. Cumulative unlocks are preserved.' } },
    {"tag":"MIRROR HALL RETURN","title":{"zh":"返回网页时保留镜馆交互","en":"Keep hall interactions when returning"},"body":{"zh":"调整浏览器缓存导航时的镜馆处理，保留物证、画质设置和触控操作，清除离开前的按住状态；永久离开页面时仍清理资源。","en":"Cached browser navigation preserves hall evidence, quality settings and touch controls, while clearing held input. Resources are still released when the page is permanently left."}},
    {"tag":"VIOLET DETAILS","title":{"zh":"奶霸的淡紫档案","en":"Naiba’s lavender dossier"},"body":{"zh":"主页奶霸介绍加强淡紫底色、边框、姓名与选中状态。照片上的紫色胶带已移除，黄白主页与原有章节入口保持一致。","en":"Naiba’s home card has stronger lavender fills, borders, name accents and selection states. Violet tape has been removed from the photographs; the yellow-and-white home and chapter entrances remain consistent."}},
    { tag: 'CHAPTER TWO TOOLS', title: { zh: '长章节可以按自己的节奏读', en: 'Read a long chapter at your pace' }, body: { zh: '第二章加入存档／读档、自动、快进、设置与图鉴入口，菜单内也能找到。自动和快进支持碎片回忆，在选项、探索和结尾处停下，不替你作出选择。', en: 'Chapter two now offers Save / Load, Auto, Skip, Settings and Gallery in the toolbar and menu. Auto and Skip also support fragment memories and stop at choices, exploration and endings.' } },
    { tag: 'MANUAL SAVES', title: { zh: '三个独立手动存档', en: 'Three independent manual slots' }, body: { zh: '自动保存持续生效，手动存档可以保留指定对白或碎片进度。覆盖和读档需要确认，读档保留累计解锁的剧情树与图鉴。', en: 'Autosave remains active while manual slots retain a chosen dialogue or fragment position. Overwriting and loading require confirmation; loading keeps cumulative story-map and gallery unlocks.' } },
    { tag: 'READING SETTINGS', title: { zh: '文字速度和对白音量', en: 'Text speed and dialogue volume' }, body: { zh: '第一、第二章设置加入实际生效的文字显示速度和对白音量。默认立即显示全文；逐字显示时，第一次点继续显示整句，再点进入下一句。设置单独保存。', en: 'Chapters one and two now share working text-speed and dialogue-volume controls. Instant text is the default; when typing is enabled, Continue first reveals the line, then advances. Settings are saved separately.' } },
    { tag: 'CHAPTER INTRODUCTIONS', title: { zh: '进入第二章前，回想上一段旅程', en: 'Recall the journey before chapter two' }, body: { zh: '第二章介绍页补上前情提要，衔接雨夜相遇、事故和第一层探索。第四章导航状态改为清楚的“已开放”。', en: 'The chapter-two introduction now recaps the rainy meeting, accident and first-layer investigation. Chapter-four navigation uses the clearer Available label.' } },
    { tag: 'KEYBOARD & FOCUS', title: { zh: '按 Esc，先处理眼前的操作', en: 'Escape handles the current action first' }, body: { zh: '选中或拖动拼片时，Esc 先取消操作；视频全屏时先退出播放器，继续留在剧情。修复关闭镜馆面板、切换语言和返回主页后焦点落到不可见按钮的问题。', en: 'Escape cancels a selected or dragged puzzle piece first. In fullscreen video, it exits the player without leaving the story. Focus now returns to a visible control after closing mirror hall panels, switching languages or returning home.' } },
    { tag: 'PAGE LINKS', title: { zh: '页内入口避开顶部栏', en: 'Page links clear the header' }, body: { zh: '首页的章节与角色入口按顶部栏实际高度定位，适应手机安全区域和较高的工具栏，介绍标题更容易看清。', en: 'Homepage chapter and character links now account for the header’s actual height, including phone safe areas and taller toolbars, so the introduction remains visible.' } },
    { tag: 'VIDEO WATCHING', title: { zh: '切到后台，回来接着看', en: 'Return and finish watching' }, body: { zh: '番外解锁视频切到后台时暂停，回来后可继续观看。修复浏览器延迟视频事件时，把后台未观看的部分计入完整观看次数的问题。', en: 'The DLC unlock video pauses in the background and can resume when you return. Delayed browser events no longer count unseen background playback as a complete viewing.' } },
    { tag: 'MUSIC & MOTION', title: { zh: '音乐开关与动态效果', en: 'Music and motion controls' }, body: { zh: '修复快速关闭再打开主题曲后没有声音的问题，之前的播放错误也不会影响后续播放。终章宣传页退出后停止待执行的动效，系统减少动态效果的切换立即生效。', en: 'The theme stays audible when switched off and back on quickly, and an earlier playback error cannot interfere with a later attempt. Leaving the finale page stops pending effects; changes to reduced motion settings apply immediately.' } },
    { tag: 'SAVE COMPATIBILITY', title: { zh: '损坏的历史字段不再挡住终章', en: 'Damaged fields no longer block the finale' }, body: { zh: '补齐终章旧存档迁移时的字段检查。个别场景或路线字段损坏时可继续打开章节和剧情树预览，不会凭空补出旧回放检查点。', en: 'Added checks to legacy finale save migration. Damaged scene or route fields no longer stop the chapter or its map preview from opening, and no historical replay checkpoints are invented.' } },
    { tag: 'NARRATION REPAIR', title: { zh: '恢复原来的旁白声音', en: 'The original narration voices return' }, body: { zh: '修复语音合成连接，将黑化过程的十二段中英文临时朗读重新生成为原有旁白声线。字幕、逐句朗读和回放重新保持一致。', en: 'Speech synthesis connects successfully again. The twelve temporary Chinese and English recordings for the transformation sequence are regenerated with the original narration voices, keeping subtitles, line readings and replay aligned.' } },
    { tag: 'CLOSE-UP SEQUENCE', title: { zh: '看见肥嘟嘟逐渐变化', en: 'Watch Fat Dudu gradually change' }, body: { zh: '新增四张连续眼部特写，从原貌、淡灰眼周、扩散暗色到完整黑色眼眶，随重逢、动摇和争论逐步切换。调整提前黑化的旧画面与对应旁白，逐句回放会恢复该时刻的外观。六句相关旁白已恢复原有中英文声线，角色原声保持一致。', en: 'Four continuous eye close-ups progress from the original appearance through faint gray and spreading darkness to complete black eye surrounds. They follow the reunion, hesitation and argument. Prematurely dark earlier frames and corresponding narration are adjusted; replay restores the appearance for that moment. Six corresponding narration lines use the original Chinese and English voices again; character recordings remain consistent.' } },
    { tag: 'CURTAIN CALL', title: { zh: '留给结局一段余韵', en: 'A moment to stay with the ending' }, body: { zh: '终章各结局新增全屏渐黑与片尾字幕，字幕停留后才出现返回按钮。连续点击不会跳过谢幕，支持键盘、手机与全屏，并照顾减少动态效果的偏好。结局解锁与回放检查点照常保留。', en: 'Each finale ending now fades to a fullscreen black frame with closing titles. A return button appears after a short pause. Repeated clicks cannot skip the curtain. Keyboard, mobile, fullscreen and reduced motion are supported; ending unlocks and replay checkpoints remain intact.' } },
    { tag: 'CHAPTER COLORS', title: { zh: '日记、冰镜、剧场与金色画框', en: 'A journal, ice, theatre and a gilded frame' }, body: { zh: '第一章用暖黄日记纸页，第二章用冰蓝晶面，第三章用酒红票券，第四章用金色油画框。最终章保留深蓝金色与战后破损，海岸番外用青绿色旅行卡；姓名牌与回应按钮也随章节变化。降低背景填充和画面遮罩的不透明度，文字、焦点和操作保持清晰。', en: 'Chapter one uses warm journal paper, two icy facets, three wine-red tickets and four a golden painting frame. The finale keeps midnight blue, gold and post-battle scars; the coastal story has a teal travel card. Nameplates and response buttons follow each chapter. More translucent fills and lighter shading preserve clear text, focus and controls.' } },
    { tag: 'FAT DUDU', title: { zh: '把黑化过程接成一段经历', en: 'A clearer progression for Fat Dudu' }, body: { zh: '第二章增加离别时的担忧与组织接触；终章通过查看原片、请求暂停、面对读数和亲口回应，补足情绪与行为递进。停机、苏醒和影片前的对白衔接更清楚，中英文与相关朗读同步。', en: 'Chapter Two adds anxiety at parting and contact with the institute. Finale scenes develop through checking the original footage, requesting a pause, facing the readings and answering directly. Shutdown, awakening and pre-film dialogue connect more clearly, with bilingual text and corresponding readings updated.' } },
    { tag: 'FINALE STORY MAP', title: { zh: '剧情树也留下同一场雨后的痕迹', en: 'A story map that shares the same scars' }, body: { zh: '最终章剧情树的标题、图例、缩放工具、节点和结局图鉴跟随对白配色。影片后外框出现裂痕与磨损，分支画布保持完整可读；回放战前节点恢复深蓝外框。介绍页预览与游戏内使用同一套主题判断，不改动解锁和存档。', en: 'The finale map’s heading, legend, zoom controls, nodes and ending gallery follow the dialogue palette. After the film, the exterior gains cracks and wear while the canvas stays fully readable. Pre-battle replay restores the blue frame. Previews and gameplay use the same theme rules without changing unlocks or saves.' } },
    { tag: 'EARLIER STORY', title: { zh: '先在病房认识他们', en: 'Meet them first in the ward' }, body: { zh: '第二章补入三人的病房交班、设备记录与电梯签单；第三章再次接触，并把探针、同意书和后台交接连起来。前章通过实际操作认识人物，终章以重逢对白回应之前的经历。', en: 'Chapter Two introduces all three through ward handover, equipment records and lift forms. Chapter Three reconnects them through the probe, consent form and backstage handoff. Their actions establish them before finale reunions recall those encounters.' } },
    { tag: 'NEW FRAMES', title: { zh: '重新绘制前章角色分镜', en: 'New earlier-chapter character frames' }, body: { zh: '使用角色原始三视图与场景参考，新绘病房交班、香蕉猫调阅监控、剧场后台交接三张画面。终章在认出旧人的句子切入对应前章画面，再返回现场；中英文与相关朗读同步。', en: 'Three new frames use original character turnarounds and scene references: ward handover, Banana Cat at the monitor, and the backstage handoff. Finale recognition lines briefly recall their earlier frames before returning to the present, with bilingual text and corresponding readings aligned.' } },
    { tag: 'FINALE DIALOGUE', title: { zh: '完整的外框，与城市留下的裂痕', en: 'An intact frame, then the city’s scars' }, body: { zh: '最终章采用冷蓝半透明对白框、独立姓名牌、金色继续按钮与编号回应。影片结束后外框切换为灰烬暖色，边角出现缺口、细裂纹与磨损；正文、焦点和操作区保持完整。回放战前节点会恢复原有完整外框，这种破损变化用于最终章。', en: 'The finale uses cool-blue translucent dialogue, separate nameplates, gold continue buttons and numbered responses. After the film, the frame turns ash-warm with chips, fine cracks and wear while text, focus and controls stay intact. Replaying a pre-battle node restores the intact frame. This damage treatment belongs to the finale.' } },
    { tag: 'SHARED INTERFACE', title: { zh: '剧情树与更新内容一起焕新', en: 'Refreshed story maps and update notes' }, body: { zh: '剧情树采用黄白档案弹窗、清晰状态图例、回放数量与当前节点定位，五章保持同一套画布。更新说明改为黄白分栏、编号条目和固定关闭区，支持手机与键盘操作。主页移除第一章专属的剧情树、结局图鉴和重玩菜单；对应功能仍在章节内保留。', en: 'Story maps use a yellow-and-white archive, a status legend, replay counts and current-node centering, with the same canvas across all five chapters. Update notes have numbered entries and a fixed dismissal area for phones and keyboards. First-chapter map, ending-gallery and restart shortcuts are removed from the home and remain inside the chapter.' } },
    { tag: 'WHOLE-GAME RECORDS', title: { zh: '看见整个游戏的规模', en: 'See the scale of the whole game' }, body: { zh: '制作记录扩展为全作中文剧情字数、剧情节点、对白与旁白、剧情画面与立绘四项。共享画面去重，终章只统计一次；大字排版和千位分隔更易读，减少动态时直接显示完整数字。', en: 'Production records now cover Chinese story characters, story nodes, dialogue and narration entries, and story images and portraits across the whole game. Shared images are deduplicated and the merged finale counts once. Large type and thousands separators improve readability; reduced motion shows complete totals immediately.' } },
    { tag: 'EARLIER ENCOUNTERS', title: { zh: '病房值班台与入院接待', en: 'The ward desk and reception' }, body: { zh: '第二章中，香蕉猫作为监控与门禁工作人员帮忙开门、调阅录像并报上名字；第三章回到病房时再次碰面。沿用完整香蕉壳的角色立绘，后续相遇通过对白认出同一个人。', en: 'In chapter two, Banana Cat introduces itself as the cameras-and-access attendant, opens a door and retrieves footage. You meet again on returning to the ward in chapter three. Its intact-peel portrait accompanies these scenes, and later dialogue recognizes the same person.' } },
    { tag: 'FIRST ENCOUNTERS', title: { zh: '认识眼前的人', en: 'Meet the person in front of you' }, body: { zh: '牛来和奶豆在初遇中说明姓名与工作，香蕉猫重逢时补上更完整的职责；玩家会追问身份与来意。肥嘟嘟补上镜馆旧识的关系。出场时显示简短姓名、职务与现场说明，面对面再接上先前广播或录像中的人，不透露后续经历。', en: 'Niulai and Naidou introduce their names and work. Banana Cat explains its broader role at the reunion, and the player asks about authority and intentions. Fat Dudu’s mirror-hall connection is explained. Brief name, role and scene notes accompany their dialogue; later meetings connect to the earlier broadcast or recording without revealing future events.' } },
    { tag: 'INVESTIGATION FRAMES', title: { zh: '让记录变成看得见的画面', en: 'Records you can see' }, body: { zh: '新增六张非对战调查分镜：档案时间轴、烧焦照片、走廊监控、签名值班表、实验区入口与抽取读数。逐句切换画面，沿用连续阅读与“看图”，减少同一背景长时间停留。', en: 'Six new noncombat investigation frames show the archive timeline, burned photograph, corridor monitor, signed roster, laboratory entrance and extraction readings. Frames change with dialogue, retaining continuous reading and View art.' } },
    { tag: 'ENTRANCE FIX', title: { zh: '镜头接通后的相遇', en: 'An encounter after the feed connects' }, body: { zh: '终章与香蕉猫重逢前先交代信标、异常路标和监控镜头，玩家接通后才看见操作室里的它。修复立绘提前显示与战前误用战后背景图片的问题，并同步这段中英文朗读。', en: 'The finale reunion with Banana Cat establishes the beacon, altered sign and tracking camera before the player connects its control-room feed. Portraits no longer appear ahead of their dialogue, post-battle art stays out of pre-battle scenes, and both language readings are updated.' } },
    { tag: 'CHARACTER ENTRANCES', title: { zh: '先听见，再见到', en: 'Hear them before meeting them' }, body: { zh: '补充广播、监控和录像中的露面，再衔接组织成员的现场出场；人物分工通过各自的操作呈现。肥嘟嘟增加信任、迟疑与固执的递进对白，以及一张争论中的神态特写。', en: 'Broadcast, surveillance and recorded appearances lead into institute members arriving in person, with their roles shown through what they do. Fat Dudu gains dialogue progressing through trust, doubt and stubbornness, plus an expression close-up during an argument.' } },
    { tag: 'MEMORY & VOICES', title: { zh: '回忆与英文名称同步', en: 'Memories and English naming aligned' }, body: { zh: '“回忆 · 记忆画廊”改用当前第四章的拼图画廊画面。肥嘟嘟英文名统一为 Fat Dudu；相关英文朗读及新增旁白、玩家和组织成员对白同步更新。', en: 'Memory · The memory gallery now uses the current chapter-four puzzle gallery. The English name is consistently Fat Dudu, with updated English readings and new narration, player and institute dialogue.' } },
    { tag: 'PROJECT INTRODUCTION', title: { zh: '从一场雨，走到最后一页', en: 'From the rain to the last page' }, body: { zh: '黄色纸页、白色留白和奶蛙立绘组成新开场，故事照片可以展开。五章改为图文分栏预览，支持点按、方向键和手机横向滑动；展开玩法介绍，再进入对应章节。', en: 'Yellow paper, white space and Naiwa introduce the story, with stills that open at full size. Five split-image chapter previews support buttons, arrow keys and horizontal phone swipes. Open the gameplay notes, then enter a chapter.' } },
    { tag: 'MAKING OF', title: { zh: '看见制作的每一步', en: 'See how it was made' }, body: { zh: '保留七个依据提交与制作记录整理的节点。工作台新增时间滑杆、前后切换、场景与手记双视图和大图查看，时间线可以一键展开或收起。', en: 'Seven milestones follow repository history and production notes. A date slider, previous and next controls, scene and notebook views, and full-size images make the workbench interactive. Expand or collapse the entire timeline at once.' } },
    { tag: 'HOME INTERACTIONS', title: { zh: '随阅读展开的画面', en: 'Frames that unfold as you read' }, body: { zh: '点击奶蛙可以打招呼，角色介绍只保留奶蛙与奶霸，支持点按和方向键，文案避免透露后续身份与经历。档案里的入口可以定位对应章节预览。切换语言或返回主页保留章节、角色、时间节点与阅读位置；浏览这些内容不会改动存档或播放对白。支持手机、全屏、键盘与减少动态效果。', en: 'Tap Naiwa to say hello, switch between brief, spoiler-conscious Naiwa and Naiba cards with buttons or arrow keys, and use a card to find its chapter preview. Language changes and returns preserve the chapter, character, milestone and reading position. Browsing leaves saves and dialogue audio untouched. Phone, fullscreen, keyboard and reduced-motion support remain.' } },
    { tag: 'EMOTIONAL SEQUENCE', title: { zh: '逐句展开的近景分镜', en: 'A close-up sequence across dialogue' }, body: { zh: '为后半段的重要时刻再补六张非对战特写，镜头从手部与身体细节移向眼神，再回到眼前的场景。沿用原始角色形象与废墟环境，可随时点击“看图”查看完整画面。', en: 'Six more noncombat close-ups expand a key late sequence, moving from hands and body details to the eyes and back to the scene. Original character designs and the ruined setting are retained. View art opens the complete frame.' } },
    { tag: 'CLOSE-UPS & MEMORIES', title: { zh: '更近的表情，更清楚的回忆', en: 'Closer expressions, clearer memories' }, body: { zh: '新增六张非对战特写，补足表情、手部与日记细节。八张前章旧图随对应对白切入，标注“回忆”，再切回眼前的场景；“看图”可查看完整画面。', en: 'Six new noncombat close-ups add expressions, hands and journal details. Eight earlier chapter images appear with matching lines and a Memory label, then return to the present. View art opens the complete frame.' } },
    { tag: 'AFTERMATH MUSIC', title: { zh: '战后的轻声配乐', en: 'Quiet music after the battle' }, body: { zh: '影片结束后的剧情沿用宣传页主题曲，轻声淡入，对白播放时再降低音量。逐句阅读时音乐连续播放，声音开关可以一并关闭；打开面板或切到后台会暂停。', en: 'After-film scenes use the campaign theme with a quiet fade-in and a lower level during dialogue. Music continues across lines and follows the audio switch. Panels and background tabs pause playback.' } },
    { tag: 'FRAMING', title: { zh: '前半段角色更靠近你', en: 'Closer character framing' }, body: { zh: '放大无光深渊与实验区的角色立绘，向画面中部移动。手机竖屏与横屏同步调整，表情更清楚，保留底部对白与常驻工具栏。', en: 'Larger sprites move toward the center in the deep and laboratory. Portrait and landscape phone layouts follow suit, with clearer expressions and the dialogue and toolbar retained.' } },
    { tag: 'STORY', title: { zh: '争论与战后分镜衔接', en: 'Arguments and aftermath continuity' }, body: { zh: '视频前的交锋以争论展开，档案阅读改为连续推进，减少重复调查选项。补齐战后分镜及剧情树中的对应节点，城市决战继续使用提供的完整影片。', en: 'Pre-film confrontations unfold through arguments, and records advance consecutively with fewer repeated investigation choices. New aftermath shots and their map nodes are connected; the city battle uses the complete supplied film.' } },
    { tag: 'CAMPAIGN', title: { zh: '一条往下读的路线', en: 'One page, one descent' }, body: { zh: '页首是雨夜城市与缓慢视差，往下依次是序章、照片墙、五章回顾、未公开段落和开始区域。标题逐字出现，画面随滚动位移；中英文内容一致，手机与全屏都能读。', en: 'A rainy skyline opens the page with slow parallax, followed by the prologue, a still wall, the five chapters, a withheld section and the start area. The title arrives character by character and the plates drift as you scroll. Both languages and phone layouts are covered.' } },
    { tag: 'STILLS', title: { zh: '会循环的照片墙', en: 'A still wall that loops' }, body: { zh: '八张不剧透的终章画面做成相纸，首尾相接循环滚动，一直往同一个方向拖也不会划到头。点开可以看完整大图，也支持键盘方向键和页内左右按钮；照片进入视野后才显影。', en: 'Eight spoiler-free finale frames are laid out as prints that join end to end, so the wall never runs out however far you drag. Open one to see it full size, or use the arrow keys and the on-page buttons. Each print develops as it enters view.' } },
    { tag: 'THEME', title: { zh: '终章主题曲', en: 'A theme for the finale page' }, body: { zh: '中文版宣传页配上背景音乐，默认开启，标题栏里可以随时关掉。音乐淡入开始，接近结尾时淡出再接回开头循环，读得久也不会突然断在半句上。浏览器拦住自动播放时，第一次滚动或点按就会接上。', en: 'The Chinese campaign page now has a theme, on by default, with a switch in the header. It fades in, fades out towards the end and loops back to the top, so a long read never cuts mid-phrase. If the browser blocks autoplay, the first scroll or tap picks it up.' } },
    { tag: 'GATE', title: { zh: '拉到底，才解锁开始', en: 'The end of the page opens the chapter' }, body: { zh: '进入终章、重新开始和剧情树在读完这一页之前保持锁定，右下角显示阅读进度。滚到底部会自动解锁，同一个浏览器里不必再读一次。', en: 'Enter the finale, Restart and Story map stay locked until the page is read; a reading ring in the corner shows how far you are. Reaching the end unlocks them, and the same browser does not ask again.' } },
    { tag: 'NO SPOILERS', title: { zh: '这一页不讲结局', en: 'This page does not tell the ending' }, body: { zh: '宣传页只使用环境与角色画面，不放结局图、后台解谜路线和对抗画面；未公开段落只留下问号，等你到游戏里填。', en: 'Only environment and character art appears here: no ending frames, no puzzle solutions, no confrontation shots. The withheld section leaves question marks for the game to answer.' } },
    { tag: 'ACCESSIBILITY', title: { zh: '键盘、静态模式与轻量加载', en: 'Keyboard, quiet mode and light loading' }, body: { zh: '按钮和链接可以键盘操作并保留焦点样式；系统开启减少动态效果时改为静态图文。打开、拖动和看大图都不会推进剧情或写入存档；只想安静看画面，就在标题栏关掉音乐。', en: 'Every control is keyboard reachable with visible focus, and reduced-motion systems get a static layout. Opening, dragging and viewing art never advance the story or write a save; turn the theme off in the header if you would rather read in silence.' } },
  ],
}

export const mainlineOctoberRelease = {
  "id": "2026-10-20-mobile-ui-home-entry",
  "date": "2026-10-20",
  "title": {
  "zh": "手机阅读与便捷开始入口",
  "en": "Mobile reading and easier Play entrances"
},
  "intro": {
  "zh": "手机对白和工具栏给画面让出更多空间，电脑与手机也更容易找到开始游戏。此前的独立逃生游戏、镜馆分区加载与冰封奶蛙继续保留。",
  "en": "Compact phone dialogue and tools leave more room for the scene, while Play is easier to reach on desktop and mobile. The standalone escape game, mirror-hall streaming and Frozen Naiwa are retained."
},
  "items": [
    { tag: 'MOBILE SCENES', title: { zh: '少一点遮挡，多看见画面', en: 'Less UI, more of the scene' }, body: { zh: '手机与小屏横屏下，章节工具收入菜单，压缩对白标题、状态条和底部间距。长对白、人物介绍与选项可以滚动阅读；镜馆阅读工具保留在原有菜单中。第一章、剧场、金笼、终章和海岸番外支持一键收起界面看图，再点击恢复。看图时停止自动与快进，点击画面不会推进剧情，桌面布局保持原样。', en: 'On phones and short landscape screens, chapter tools move into a menu and dialogue headings, status bars and footer spacing become compact. Long lines, introductions and choices remain scrollable. Mirror-hall reading tools stay available in its menu. Chapter one, the theatre, gilded cage, finale and coastal story can hide the interface for art viewing and restore it with one button. Art view stops Auto and Skip; tapping the image cannot advance the story. Desktop layouts are retained.' } },
    {"tag":"QUICK START","title":{"zh":"随时找到开始游戏","en":"An entrance always within reach"},"body":{"zh":"顶部导航和首屏提供醒目的开始游戏入口，电脑右下角另有常驻按钮，可直接定位章节选择。手机把故事、角色、逃脱游戏和制作过程收进更多菜单，保留已存进度与章节介绍。","en":"The header and cover have prominent Play entrances, with an additional persistent button at the lower right on desktop. They lead directly to chapter selection. On phones, story, cast, escape-game and production links move into More. Existing saves and chapter introductions are retained."}},
    {
      "tag": "CRYSTAL STREAMING",
      "title": { "zh": "走近时加载，离开后释放", "en": "Load nearby, release when distant" },
      "body": {
        "zh": "地面、墙面和浮空水晶沿用地图的分块范围，提前准备附近房间；远处区域不再一次性创建全部模型。返回时恢复相同的位置、朝向和房间密度，卸载时同时释放几何与实例缓冲。",
        "en": "Ground, wall and floating crystals use the map’s chunk window to prepare nearby rooms. Distant regions no longer create every model on entry. Returning restores the same positions, directions and room density; unloading releases geometry and instance buffers."
      }
    },
    {
      "tag": "QUALITY & RETURN",
      "title": { "zh": "继续探索时也能接上", "en": "Ready when exploration resumes" },
      "body": {
        "zh": "新进入的区域采用当前画质，切回高画质恢复完整细节。嵌入灯光与环境反光随区域正确接续，读档和剧情回放会先准备对应位置的水晶，线索与路线进度保持原样。",
        "en": "Newly loaded regions use the current graphics preset, and High restores full detail. Embedded lights and environment reflections follow the loaded crystals. Loading a save or replay prepares crystals at the resumed location while keeping clue and route progress."
      }
    },
    {
      "tag": "FROZEN NAIWA",
      "title": {
        "zh": "水晶里的奶蛙",
        "en": "Naiwa inside the crystal"
      },
      "body": {
        "zh": "核心水晶加入彩色三维角色，保留黄色身体、奶白腹部与绿色眼睛，以静止姿态封存在淡蓝冰晶中。水晶与底座具有碰撞范围，可贴边绕行并在外侧触发核心，物证顺序与存档进度不变。",
        "en": "The core crystal now holds a coloured 3D character with a yellow body, cream belly and green eyes, frozen still inside pale blue ice. The crystal and base have collision boundaries: walk around them and interact from outside. Evidence order and save progress are unchanged."
      }
    },
    {
      "tag": "STANDALONE ESCAPE",
      "title": {
        "zh": "逃离奶蛙",
        "en": "Escape Naiwa"
      },
      "body": {
        "zh": "在双层别墅、地下室和庭院中寻找线索、收集工具，躲避奶蛙的追捕。独立站仅加载逃脱游戏资源，支持中英文、手机触控、全屏和三档画质。",
        "en": "Search a two-storey house, basement and courtyard for clues and tools while evading Naiwa. The separate site loads only escape assets, with Chinese and English, touch controls, fullscreen and three graphics settings."
      }
    },
    {
      "tag": "HOME ENTRANCE",
      "title": {
        "zh": "从主页进入逃脱游戏",
        "en": "Enter Escape from the home page"
      },
      "body": {
        "zh": "奶蛙 galgame 主页新增独立游戏窗口，简介为“逃离奶蛙”。入口附有玩法简介，原有章节、角色与制作时间线继续保留。",
        "en": "The galgame home now has a separate Escape card, introduced as “Escape Naiwa”, with a gameplay summary. Existing chapters, cast and production timeline remain available."
      }
    },
    {
      "tag": "SURVIVE & ESCAPE",
      "title": {
        "zh": "四种难度，寻找出路",
        "en": "Four difficulties and a way out"
      },
      "body": {
        "zh": "提供四档难度、生命与体力、七格物品栏、进食效果、工具与钥匙、隐藏和搜索，以及多种警觉形态。声音、光线与障碍会影响奶蛙的追踪。",
        "en": "Four difficulties include health and stamina, seven inventory slots, food effects, tools and keys, hiding and searches, and multiple alertness forms. Sound, light and obstacles affect Naiwa’s pursuit."
      }
    },
    {
      "tag": "POSE & PERFORMANCE",
      "title": {
        "zh": "忍者姿势与轻量渲染",
        "en": "Hand-walking poses and lighter rendering"
      },
      "body": {
        "zh": "唐王与通透模式保留双手爬行、左脚技能及左六右五的扇形脚趾，修正折叠右腿与手部的衔接。合并静态装饰和门柜绘制，低画质降低分辨率与阴影开销，灯光氛围保留。",
        "en": "Ninja and Transcendent retain hand walking, left-foot skills and fanned six-left/five-right toes, with improved folded-leg and hand connections. Batched details and panels reduce rendering work; low graphics lowers resolution and shadow cost while preserving the lighting atmosphere."
      }
    },
    {
      "tag": "CAST & READING",
      "title": {
        "zh": "保留主线新版角色与阅读设置",
        "en": "Updated cast and reading settings retained"
      },
      "body": {
        "zh": "同步 GitHub 主线的大幅奶蛙与奶霸角色档案、键盘切换和阅读工具修复。章节预览、制作工作台和剧情进度继续沿用现有交互。",
        "en": "Includes the latest GitHub cast spreads for Naiwa and Naiba, keyboard switching and reading-tool fixes. Chapter previews, the production workbench and story progress retain their existing interactions."
      }
    },
    {
      "tag": "MIRROR HALL",
      "title": {
        "zh": "镜馆性能与重玩清理",
        "en": "Mirror-hall performance and replay cleanup"
      },
      "body": {
        "zh": "保留主线的镜面采样复用、静态变换优化、极低画质帧调度与退出清理；阅读和探索页面在退出后停止不再需要的后台工作。",
        "en": "Retains shared mirror captures, static-transform optimizations, Very low frame pacing and exit cleanup. Reading and exploration pages stop unnecessary background work after leaving."
      }
    }
  ]
}

export const latestRelease = {
  "id": "2026-10-22-galgame-escape-naiwa-name",
  "date": "2026-10-22",
  "title": {
    "zh": "奶之救赎 · 镜馆优化与独立游戏入口",
    "en": "Naiwa · Mirror hall improvements and a separate escape game"
  },
  "intro": {
    "zh": "保留最新镜馆光影、音效加载与手机阅读改进。逃离奶蛙独立维护，仍可从主页介绍窗口进入。",
    "en": "The latest mirror-hall rendering, progressive audio and mobile reading improvements are retained. Escape Naiwa is maintained separately and remains accessible from the home introduction."
  },
  "items": [
    {
      "tag": "ICE HALL",
      "title": {
        "zh": "按屏幕分配渲染开销",
        "en": "Rendering sized to your screen"
      },
      "body": {
        "zh": "各档画质新增大屏像素预算，平衡档使用更轻的泛光；全屏与旋转屏幕后重新匹配反射尺寸，保留原有四档画质。",
        "en": "Each graphics preset now caps large-screen rendering work. Balanced uses lighter bloom, and reflections resize after fullscreen or screen rotation. All four presets remain available."
      }
    },
    {
      "tag": "LIGHT & SOUND",
      "title": {
        "zh": "远景过渡与渐进音效",
        "en": "Distant haze and progressive audio"
      },
      "body": {
        "zh": "同步天窗天空的遮挡处理与远景雾边界。脚步和水花音效优先加载，已就绪的音效可以先播放；保留水晶按区域加载。",
        "en": "Skylight skies now respect room occlusion, with a fog boundary behind distant openings. Footsteps and splashes load first, and ready sounds can play while others load. Crystals continue to stream by area."
      }
    },
    {
      "tag": "ESCAPE ENTRANCE",
      "title": {
        "zh": "从主页进入独立逃脱游戏",
        "en": "Enter the standalone escape game from home"
      },
      "body": {
        "zh": "主页保留逃离奶蛙的介绍与进入按钮，点击前往独立游戏网站。原有章节、镜馆、番外与存档继续保留。",
        "en": "The home retains the Escape Naiwa introduction and Play link, leading to its separate website. Chapters, the mirror hall, DLC and saves remain available."
      }
    },
    {
      "tag": "MOBILE SCENES",
      "title": {
        "zh": "少一点遮挡，多看见画面",
        "en": "Less UI, more of the scene"
      },
      "body": {
        "zh": "手机与小屏横屏下，章节工具收入菜单，压缩对白标题、状态条和底部间距。长对白、人物介绍与选项可以滚动阅读；镜馆阅读工具保留在原有菜单中。第一章、剧场、金笼、终章和海岸番外支持一键收起界面看图，再点击恢复。看图时停止自动与快进，点击画面不会推进剧情，桌面布局保持原样。",
        "en": "On phones and short landscape screens, chapter tools move into a menu and dialogue headings, status bars and footer spacing become compact. Long lines, introductions and choices remain scrollable. Mirror-hall reading tools stay available in its menu. Chapter one, the theatre, gilded cage, finale and coastal story can hide the interface for art viewing and restore it with one button. Art view stops Auto and Skip; tapping the image cannot advance the story. Desktop layouts are retained."
      }
    },
    {
      "tag": "QUICK START",
      "title": {
        "zh": "随时找到开始游戏",
        "en": "An entrance always within reach"
      },
      "body": {
        "zh": "顶部导航和首屏提供醒目的开始游戏入口，电脑右下角另有常驻按钮，可直接定位章节选择。手机把故事、角色、逃脱游戏和制作过程收进更多菜单，保留已存进度与章节介绍。",
        "en": "The header and cover have prominent Play entrances, with an additional persistent button at the lower right on desktop. They lead directly to chapter selection. On phones, story, cast, escape-game and production links move into More. Existing saves and chapter introductions are retained."
      }
    },
    {
      "tag": "CRYSTAL STREAMING",
      "title": {
        "zh": "走近时加载，离开后释放",
        "en": "Load nearby, release when distant"
      },
      "body": {
        "zh": "地面、墙面和浮空水晶沿用地图的分块范围，提前准备附近房间；远处区域不再一次性创建全部模型。返回时恢复相同的位置、朝向和房间密度，卸载时同时释放几何与实例缓冲。",
        "en": "Ground, wall and floating crystals use the map’s chunk window to prepare nearby rooms. Distant regions no longer create every model on entry. Returning restores the same positions, directions and room density; unloading releases geometry and instance buffers."
      }
    },
    {
      "tag": "QUALITY & RETURN",
      "title": {
        "zh": "继续探索时也能接上",
        "en": "Ready when exploration resumes"
      },
      "body": {
        "zh": "新进入的区域采用当前画质，切回高画质恢复完整细节。嵌入灯光与环境反光随区域正确接续，读档和剧情回放会先准备对应位置的水晶，线索与路线进度保持原样。",
        "en": "Newly loaded regions use the current graphics preset, and High restores full detail. Embedded lights and environment reflections follow the loaded crystals. Loading a save or replay prepares crystals at the resumed location while keeping clue and route progress."
      }
    },
    {
      "tag": "FROZEN NAIWA",
      "title": {
        "zh": "水晶里的奶蛙",
        "en": "Naiwa inside the crystal"
      },
      "body": {
        "zh": "核心水晶加入彩色三维角色，保留黄色身体、奶白腹部与绿色眼睛，以静止姿态封存在淡蓝冰晶中。水晶与底座具有碰撞范围，可贴边绕行并在外侧触发核心，物证顺序与存档进度不变。",
        "en": "The core crystal now holds a coloured 3D character with a yellow body, cream belly and green eyes, frozen still inside pale blue ice. The crystal and base have collision boundaries: walk around them and interact from outside. Evidence order and save progress are unchanged."
      }
    },
    {
      "tag": "STANDALONE ESCAPE",
      "title": {
        "zh": "逃离奶蛙",
        "en": "Escape Naiwa"
      },
      "body": {
        "zh": "在双层别墅、地下室和庭院中寻找线索、收集工具，躲避奶蛙的追捕。独立站仅加载逃脱游戏资源，支持中英文、手机触控、全屏和三档画质。",
        "en": "Search a two-storey house, basement and courtyard for clues and tools while evading Naiwa. The separate site loads only escape assets, with Chinese and English, touch controls, fullscreen and three graphics settings."
      }
    },
    {
      "tag": "HOME ENTRANCE",
      "title": {
        "zh": "从主页进入逃脱游戏",
        "en": "Enter Escape from the home page"
      },
      "body": {
        "zh": "奶蛙 galgame 主页新增独立游戏窗口，简介为“逃离奶蛙”。入口附有玩法简介，原有章节、角色与制作时间线继续保留。",
        "en": "The galgame home now has a separate Escape card, introduced as “Escape Naiwa”, with a gameplay summary. Existing chapters, cast and production timeline remain available."
      }
    },
    {
      "tag": "SURVIVE & ESCAPE",
      "title": {
        "zh": "四种难度，寻找出路",
        "en": "Four difficulties and a way out"
      },
      "body": {
        "zh": "提供四档难度、生命与体力、七格物品栏、进食效果、工具与钥匙、隐藏和搜索，以及多种警觉形态。声音、光线与障碍会影响奶蛙的追踪。",
        "en": "Four difficulties include health and stamina, seven inventory slots, food effects, tools and keys, hiding and searches, and multiple alertness forms. Sound, light and obstacles affect Naiwa’s pursuit."
      }
    },
    {
      "tag": "POSE & PERFORMANCE",
      "title": {
        "zh": "忍者姿势与轻量渲染",
        "en": "Hand-walking poses and lighter rendering"
      },
      "body": {
        "zh": "唐王与通透模式保留双手爬行、左脚技能及左六右五的扇形脚趾，修正折叠右腿与手部的衔接。合并静态装饰和门柜绘制，低画质降低分辨率与阴影开销，灯光氛围保留。",
        "en": "Ninja and Transcendent retain hand walking, left-foot skills and fanned six-left/five-right toes, with improved folded-leg and hand connections. Batched details and panels reduce rendering work; low graphics lowers resolution and shadow cost while preserving the lighting atmosphere."
      }
    },
    {
      "tag": "CAST & READING",
      "title": {
        "zh": "保留主线新版角色与阅读设置",
        "en": "Updated cast and reading settings retained"
      },
      "body": {
        "zh": "同步 GitHub 主线的大幅奶蛙与奶霸角色档案、键盘切换和阅读工具修复。章节预览、制作工作台和剧情进度继续沿用现有交互。",
        "en": "Includes the latest GitHub cast spreads for Naiwa and Naiba, keyboard switching and reading-tool fixes. Chapter previews, the production workbench and story progress retain their existing interactions."
      }
    },
    {
      "tag": "MIRROR HALL",
      "title": {
        "zh": "镜馆性能与重玩清理",
        "en": "Mirror-hall performance and replay cleanup"
      },
      "body": {
        "zh": "保留主线的镜面采样复用、静态变换优化、极低画质帧调度与退出清理；阅读和探索页面在退出后停止不再需要的后台工作。",
        "en": "Retains shared mirror captures, static-transform optimizations, Very low frame pacing and exit cleanup. Reading and exploration pages stop unnecessary background work after leaving."
      }
    }
  ]
}

export const releaseSeenKey = 'naiwa-release-notes-seen-v1'
let acknowledgedThisSession = false

export function shouldShowReleaseNotes(): boolean {
  if (acknowledgedThisSession) return false
  try { return localStorage.getItem(releaseSeenKey) !== latestRelease.id }
  catch { return true }
}

function acknowledgeRelease() {
  acknowledgedThisSession = true
  try { localStorage.setItem(releaseSeenKey, latestRelease.id) } catch { /* Session fallback for blocked storage. */ }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))

export function renderReleaseNotes(language: Language): string {
  const release = latestRelease
  return `<div class="release-intro"><p class="release-date">UPDATE / ${release.date.replaceAll('-', '.')}</p><h3>${escapeHtml(release.title[language])}</h3><p>${escapeHtml(release.intro[language])}</p></div>
    <ol class="release-list">${release.items.map((item, index) => `<li><span class="release-item-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="release-item-copy"><span class="release-tag">${item.tag}</span><h4>${escapeHtml(item.title[language])}</h4><p>${escapeHtml(item.body[language])}</p></div></li>`).join('')}</ol>`
}

export function showReleaseNotes(root: HTMLElement, language: Language, automatic = false): HTMLDialogElement | null {
  if (automatic && !shouldShowReleaseNotes()) return null
  // Avoid stacking native modal dialogs (including confirmations and route previews).
  if (root.querySelector('dialog[open]')) return null
  const focusBeforeOpen = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.className = 'app-dialog release-dialog'
  dialog.lang = language === 'zh' ? 'zh-CN' : 'en'
  dialog.setAttribute('aria-labelledby', 'release-dialog-title')
  dialog.innerHTML = `<header class="dialog-head"><div class="release-heading"><p class="release-eyebrow">NAIWA / RELEASE NOTES</p><h2 id="release-dialog-title">${language === 'zh' ? '更新内容' : 'What\'s new'}</h2></div><button class="small-btn" data-release-close type="button" autofocus aria-label="${language === 'zh' ? '关闭更新内容' : 'Close update notes'}">${language === 'zh' ? '关闭' : 'Close'} ×</button></header>
    <div class="release-body">${renderReleaseNotes(language)}</div>
    <footer class="release-footer"><p>${language === 'zh' ? '可随时在首页重新查看更新内容。' : 'You can read these notes again from the home page.'}</p><button class="primary-btn" data-release-close type="button">${language === 'zh' ? '知道了' : 'Got it'} ✓</button></footer>`
  dialog.querySelectorAll<HTMLButtonElement>('[data-release-close]').forEach(button => button.addEventListener('click', () => dialog.close()))
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  })
  dialog.addEventListener('close', () => {
    acknowledgeRelease()
    dialog.remove()
    if (focusBeforeOpen?.isConnected) focusBeforeOpen.focus()
  }, { once: true })
  root.append(dialog)
  dialog.showModal()
  return dialog
}
