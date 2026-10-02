# 奶之救赎 · naiwa

一场雨夜的相遇，一段逐渐靠近的关系，和一个等待被找回的内心世界。**《奶之救赎》**是一款中英双语网页视觉小说，将恋爱日常、分支选择和探索解谜串成一段关于信任与记忆的故事。

**[在线试玩](https://galgame-ashy.vercel.app)** · [English overview](#english-overview) · [本地运行](#运行)

![奶之救赎场景插画](public/images/P02.webp)

## 故事与玩法

第一章 **《缘起》**从雨夜遇见奶蛙开始。玩家经历相处与约会，再走进迷雾游乐园，寻找散落的回忆。你的选择会影响关系、精神力和最终抵达的结局。

第二章 **《冰镜疑凶》**接续医院里的异样线索。穿过冰封的镜馆，收取入口便笺，沿导航寻找镜片与物证，让每一块碎片中的记忆补上真相的一角。

第三章 **《血色交易》**走进血肉剧场，与粉色角色**奶粉**一起辨认雨夜、早餐和车灯三幕记忆，核对幕后路线，面对奶霸的自白，并决定是否用真碎片换取组织的治疗。包含安抚成功、危险交易和精神力耗尽三种结局。

- **双语剧情**：中文与英文可随时切换，保留当前剧情位置。
- **分支与回顾**：剧情树记录已解锁节点，可回看对话、重玩章节与探索不同结局。
- **3D 镜馆**：基于 Three.js 的第一人称探索，结合小地图、通路探索和拾取后的碎片剧情；手机端只保留左上角小地图及必要操作。
- **插画与声音**：场景 CG、角色录音，以及中英文主角与旁白语音。
- **桌面与触屏**：支持键鼠、触屏摇杆、全屏显示和浏览器本地存档。

项目持续开发中，本地版本目前可游玩前三章；后续位面的故事仍在扩展。第三章此次在本地完成，线上版本以实际部署为准。

## English overview

**naiwa — The Redemption** is a bilingual browser visual novel about trust, memory, and finding a way back to someone you love. A meeting on a rainy night grows into a relationship, then leads into Naiwa’s inner world.

In **Chapter One: Origin**, follow the couple’s everyday moments and search a mistbound fairground for lost memories. In **Chapter Two: The Culprit in the Ice**, explore a frozen mirror hall, follow the minimap, and uncover the memories held inside each fragment.

The local version now includes **Chapter Three: The Crimson Bargain**. Meet **Naifen**, the pink performer in the Flesh Theatre. Recover three true memories, investigate a backstage route, confront Naiba, and choose what to trade. Three endings respond to your choices and remaining spirit.

The game includes branching choices, a story map, dialogue history, illustrated scenes, Chinese and English voice tracks, and a Three.js exploration level. Progress is saved locally in your browser. Desktop and touch controls are supported.

**[Play in your browser](https://galgame-ashy.vercel.app)**. The first two chapters are available; the project is still in development.

Built with **TypeScript, Vite, and Three.js**.

## 运行

需要 Node.js 20.19+。

```bash
npm install
npm run dev
```

在 macOS 上也可以双击项目中的 `打开游戏.command` 自动启动本地服务并打开网页。**不要直接双击 `index.html`**；Vite 的源文件需要通过本地服务加载。发布构建使用 `npm run build`；剧情和图片完整性检查使用 `npm run check:story`。构建结果位于 `dist/`，可部署到支持静态网站的平台。

## 游玩

- 大更新首次打开时会展示中英文更新说明；关闭后同一版本不再自动弹出。首页和各章详情页底部的“更新内容”可随时重看，不影响剧情进度。
- 恋爱 DLC 可完整观看解锁视频 3 遍，或在解锁页底部输入密钥后进入；视频支持暂停，跳到片尾不计数，完整观看次数保存在当前浏览器。原始视频保留在 `assets/video/romance-dlc-unlock-source.mov`，网页使用转码后的 MP4。
- 第一章详情页新增独立 DLC《潮汐写给你的信》：相恋期间的一次两天一夜海边旅行，按顺序解锁末班列车、海岸寻迹、雨夜观星和日出信件四幕全新剧情，使用四张专属场景与十张按角色三视图制作的近景、表情特写和互动图，画面随台词与分支切换，约会手账封面也展示角色。玩家整理两件行李、按线索点击海岸路标、决定雨夜约会计划；行李和经历共同决定「潮汐之约」「能听见的旅行」「下一场雨，也一起」三种结尾。独立存档，不需要主线通关，可重玩已完成章节收集其他结尾，支持中英文、原声笑声、男主／旁白神经语音、对话回顾及 ESC 返回。运行 `npm run check:romance-dlc` 检查路线、结尾条件和素材。

- 首页可选第一章《缘起》、第二章《冰镜疑凶》或第三章《血色交易》；三章分别保存进度。
- 第三章采用插画舞台调查：点击雨窗、餐桌和放映机的标记，或下方对应按钮，辨认三幕真实记忆。首次调查未找回的记忆消耗 4 点精神力，误判会增加污染并消耗更多精神力；找齐三幕后可进入奶霸对质。调查幕后路线可获得替代容器，交易时决定保留或交出真碎片。按空格／Enter 或点击继续推进，分支处点击选项；可随时查看记忆日记、剧情树和对话回顾。地址加 `?chapter=3` 可直接进入第三章。
- 奶粉采用用户提供的粉色三视图，绿色眼睛、浅色肚皮，语音与奶蛙相同。第三章新增 9 张剧情分镜，以及愤怒、害怕、委屈、警惕、释然和开心 6 种神态，按当前台词切换；手机以完整横幅显示分镜。角色台词自动播放共享原声片段，支持跳过／重播；浏览器拦截时可手动播放。片段不逐字对应新台词，第三章暂未合成新的主角或旁白 TTS。
- 第二章先调查医院里的紫色身影，再选择追影、拼镜片或安抚碎片的进入方式。冰晶世界直接复用本地 pool 项目的参考版地图，加入冰晶、三处记忆线索和镜心。用 WASD 移动、鼠标转向，靠近线索按 E 收取；触屏使用原地图的摇杆与触控视角。沿小地图走完两段探索路线，收集三件物证；无需输入密码；首次拾取会播放对应的碎片记忆，完成探索后进入镜心继续剧情。
- 第二章奶鼠出场时会尝试自动播放原声片段，浏览器拦截播放时可点击按钮重试。录音已裁掉开头和结尾的静音；因没有可靠转写，片段作为独立试听，不与页面文字逐字对应。
- 点击画面或按空格／Enter 推进对话；在分支处点击选项。
- 雨夜里，玩家循着奶蛙的笑声找到它。奶蛙开心的片段会播放用户提供的笑声，可以点击“跳过”或直接继续剧情。主角与旁白会自动播放对应语言的神经语音；主角保留男声，旁白使用另一种沉稳男声。若浏览器阻止播放，可点击“重新播放”。
- 奶蛙、奶霸和奶粉的台词共用四段说话音频，四段全部轮换后再重新打乱，轮次交界也不连续重复；轮换进度会保留到刷新后。第三章每句只播放一段；前两章较长台词仍连续播放两段不同音频。可以跳过，也可以重新播放。
- 终幕会以较低音量循环播放奶蛙笑声，进入终幕后持续播放，直到点击画面右上角的“关闭笑声”；也可以重新开启。
- 左上角可返回标题，右上角可查看对话回顾、剧情树、切换中英文、进入全屏和打开菜单。
- 思维导图式剧情树会保留已解锁的分支与结局；可拖动、缩放地图，点击已到达的节点从该节点重新开始。解锁记录与当前存档分开保存。
- 进度自动保存在当前浏览器。首次打开时按系统首选语言显示：中文系统用中文，其他系统语言用英文；游戏内仍可手动切换，手动选择会优先保留。语言切换不会改变剧情位置、选择和结局。
- 告白后新增集市约会、一起做早餐、窗边合照和各自的夜晚；其中三段有可选择的相处方式，之后再进入晚归与事故剧情。玩家形象为男性。
- 进入精神世界后，可在木马、礼物摊、照相亭和日记亭之间探索。移动消耗精神力；误认物品会消耗更多精神力并提高玩偶警戒。玩偶逼近时需要作出应对。找齐三件回忆物才能安抚奶蛙碎片；精神力耗尽会进入失败结局。
- 旋转木马、礼物摊和照相亭都在同一张场景图中展示两件候选物。将鼠标移到画面中的物品上点击；手机可直接点选。
- 当前故事包含五种结局：体面错过、贸然拥抱、转身逃离、精神力耗尽、第一层归位。

## 项目内容

- 角色：奶蛙是主角的恋人；**奶霸**在现实世界被视为反派，体型与奶蛙相同。[奶霸三视图](references/naiba-character-turnaround.png)已完成。[作者视角的后续剧情草案](docs/naiba-arc-draft.md)包含他的身份与车祸真相，阅读会剧透大结局。
- `src/story.ts`：中英文剧情、选择及场景关系。
- `src/main.ts`：对话、分支、存档、语言切换及游戏界面。
- `src/chapter-two.ts`：第二章双语剧情与独立存档；`ice-map.html`、`src/ice-pool/`：基于 pool 参考版的冰晶地图副本，原 pool 项目未改动。
- `src/chapter-three-story.ts`：第三章双语剧情、状态与选择；`src/chapter-three-visuals.ts`：逐句分镜和奶粉神态；`src/chapter-three.ts`、`src/chapter-three.css`：血肉剧场调查、角色立绘、原声与独立存档。`npm run check:chapter-three` 检查剧情图、全部结局、存档恢复、选择门槛和全部分镜／神态的接入。
- `assets/images/`：原始 PNG 插画及新增的恋爱日常、礼物摊、旋转木马、照相亭场景；`public/images/`：网页加载用 WebP 图片。原版 `M03.png` 和 `M06.png` 保留未覆盖。
- `assets/audio/`：用户提供的原始音频，包括从两段视频提取的音轨；`public/audio/`：网页播放音频，`public/audio/tts/` 包含主角与两章旁白的中英文预生成语音。视频画面没有加入项目。
- `npm run generate:tts`：重新生成神经语音前，先用 Python 安装 `scripts/requirements-tts.txt`。生成过程需要联网，游戏运行不需要联网合成；正常运行也无需执行此命令。
- `docs/world-bible.md`：世界观设定；`docs/origin-storyboard-prompts.md`：第一作分镜文档；[奶霸角色资料](docs/naiba-character.md)：参考图、三视图与生成提示词；[奶霸后续剧情](docs/naiba-arc-draft.md)：三章误认、伏笔与终局反转。
- [第二位面形态参考](docs/second-layer-form.md)：用户提供的黄色形态与新生成的三视图；`public/images/chapter-02-*`：第二章医院、冰厅和关键剧情 CG。
- [第三位面奶粉资料](docs/third-layer-naifen.md)：角色形态、共享语音、玩法、素材位置和生图提示词；`public/images/chapter-03-*`：奶粉透明立绘与血肉剧场背景。

分镜文档记述了制作图片前的预案，因此其中的“尚未生图”和“待确定”描述仅反映该文档编写时的阶段。网页中的正式对话、英文文本和轻量玩法已在本版实现。后续层级与组织动机仍是故事伏笔。

本版未添加背景音乐；已加入奶蛙笑声、说话声，以及主角和旁白的中英文 TTS。图片与用户提供音频的来源和对外发布授权由素材提供方确认。

## 项目规范

[AGENTS.md](AGENTS.md) 记录开发约定。各章节剧情树统一采用第一章的连线画布，支持拖动、缩放、当前节点定位、已解锁节点回放和结局图鉴。第三章已接入共享画布交互与独立检查点存档，章节详情页预览也使用相同剧情树。

以后每次大更新都必须同步维护 `src/release-notes.ts` 的唯一版本 ID 与中英文更新总结。`src/release-notes.css` 沿用项目弹窗风格；运行 `npm run check:release-notes` 检查首次显示、新版本提示、已读持久化、手动重看、禁用存储回退与存档隔离。
