# 古堡逃脱音效 · 来源与接入

版本：`2026-10-18-naiwa-andy-v4`。共 78 段本地音频：77 段原有 CC0 音效，加上用户视频中的一段“安迪”叫声，正式 WAV 共 2149062 bytes。这段叫声按用户本次明确要求接入，是先前不使用角色人声规则的特定例外；不添加其他角色对白、笑声或背景音乐。

## 用户提供的抓捕叫声（v29）

- 原附件：`066f3fd56dfe0573a2774408a4bb6ba0.mp4`，2.304 秒、48kHz 双声道 AAC；完整源视频保存在 `assets/audio/frog-escape/naiwaAndy-source.mp4`，解码原音保存在 `naiwaAndy-source.wav`。正式 `public/audio/frog-escape/naiwaAndy.wav` 为 32kHz 单声道 16-bit PCM，共 78470 bytes、1.225406 秒，来自视频约 0.614—1.839406 秒。只去直流、裁首尾空白、峰值留余量与 5ms 淡入淡出，不合成或改变音调。
- manifest 逐文件记录源视频、解码源 WAV、正式 WAV 的哈希与裁切时间，标明 `User-provided; not CC0`，不把它冒充原有 CC0 音效。素材和发布目录均保留 `user-provided-audio-NOTICE.txt`。`scripts/prepare-frog-escape-andy.py` 可使用保留视频离线重制，需本地 ffmpeg；只有首次导入时用 `--source` 指定附件。在基础／补充／进食音效导入后最后运行此脚本。
- 实际进入 `grab` 时播放，床底直接进入 `caught` 时补充一次；同一抓捕到晕厥结算不重复。播放速率固定 1、局部音量 0.75，沿用总音量、静音、解码缓存与混音限幅。音源可跨越本次抓捕的起点重置／结算，连尚未完成解码的请求也保留；普通暂停、地图、静音、醒来、重开及销毁均停止并取消旧请求。掉落／举砸等非抓捕死亡不播放叫声。
- 新增 `check:frog-escape-atmosphere`，实际运行三种难度的抱住→结算路径，检查一次播放、原速、普通抓捕／致命抓捕的重置与结算不截断、解码延迟、暂停／静音／醒来取消。原有音效检查继续验证所有源与发布文件哈希、PCM、许可区分和旧事件。

## 来源与许可

此前 v3 新增 5 段无对白进食音效，原始包、选中的原始录音与许可均保留。实际动作在 0.30／0.68／1.06 秒触发脆咬／咀嚼／吞咽，这些进食录音不包含说话、笑声或角色配音：

- Tito / StarNinjas：[7 Eating Crunches](https://opengameart.org/content/7-eating-crunches)，页面标注 CC0；使用 `crunch.1.ogg`、`crunch.3.ogg`、`crunch.6.ogg`，本地裁短、淡入淡出并调整频谱。苹果、面包、番茄与芝士选不同录音或速率。
- qubodup：[Liquid Bottle Drink Set](https://opengameart.org/content/liquid-bottle-drink-set)，页面标注 CC0；使用 `swallow-01.flac`、`swallow-03.flac` 的短吞咽片段，牛奶、酒与果酱使用不同速率和音量。保留源 `.7z` 以及对应 FLAC，抽取时只读指定成员到内存，不直接解压归档路径。
- 新增 `food-CC0-LICENSE.txt`，manifest 保存源页面、包 URL、成员名、源文件／正式 WAV 哈希。`scripts/prepare-frog-escape-food-audio.py --offline` 可从保留的包重制；在基础导入与 `refine-frog-escape-audio.py` 后运行，最终为 77 段 32kHz 单声道 PCM WAV。

进食声音也发出独立玩法声音事件：饮用响度 0.18、固体食物 0.25，静音不影响奶蛙的听觉。中断后不再触发后续咬／喝，暂停与地图照常清理正在发声的音源。挣扎使用原有轻衣料声。

作者：Kenney / Kenney Vleugels（kenney.nl）。两套原作页面均标注 **Creative Commons Zero / CC0**，随包原始许可明确允许个人与商业项目使用：

- [Impact Sounds 1.0](https://kenney.nl/assets/impact-sounds)：材质撞击、拳击接触与木／石／草脚步。
- [RPG Audio](https://kenney.nl/assets/rpg-audio)：门开关、木轴摩擦、金属锁扣、布料与挥动。
- 实际下载的 [GitHub 镜像](https://github.com/GeorgeQLe/assets-sfx-combat)，固定提交 `9662dc1bed3b06ae753045915f9accfac044c7ce`。路径为 `assets/kenney/impact-sounds/Audio/` 与 `assets/kenney/rpg-audio/Audio/`。
- 原始许可逐字保存在 `assets/audio/frog-escape/impact-sounds-LICENSE.txt`、`rpg-audio-LICENSE.txt`，发布目录 `public/audio/frog-escape/` 也携带相同文本。

补充录音也全部采用 **CC0**，逐文件保留作者、原作页面与下载 URL：

- Benjamin Burnes / Abstraction：[Organic Wooshes 的 GitHub 镜像与原始说明](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/f2b6264f9ab89fabc266914c3654685d68c5a39b/Micro%20Pack%20-%20Organic%20Wooshes)，使用 Classic Swish 1、2。原说明明确标注 CC0，保存在 `organic-wooshes-LICENSE.txt`。
- rubberduck：[75 CC0 breaking, falling, hit SFX](https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx)。使用金属 hit 01、02、03、05、06、falling 01、02 与玻璃 breaking 01、02、04、05、06。实际下载自同一 GitHub 镜像，固定提交 `f2b6264f9ab89fabc266914c3654685d68c5a39b`；仓库 CC0 文本保存在 `supplemental-CC0-LICENSE.txt`。
- Fission9：[Tile Breaking](https://freesound.org/people/Fission9/sounds/583310/)，原作页面标注 CC0，包含真实瓷砖、陶瓷杯破碎的组合录音，下载公开 HQ MP3 预览。
- Brsjak：[Ceramic_Break.wav](https://freesound.org/people/Brsjak/sounds/623130/)，原作页面标注 CC0，实际陶瓷撞击碎裂的现场录音，下载公开 HQ MP3 预览后裁出一次破碎。

`assets/audio/frog-escape/manifest.json` 逐文件保存下载 URL、原始文件 SHA-256、转换后 WAV SHA-256、时长与 CC0 标记；补充文件另记作者、原作页面、用途、裁切区间与最强声段时间。原始 OGG／WAV／MP3 全部保留，补充录音使用 `sourceFile` 指定文件名。`public/audio/frog-escape/manifest.json` 为相同发布记录。游戏从本地路径加载 WAV，不依赖在线服务。

转换包括单声道混合、去直流、头尾静音裁切、淡入／淡出、峰值余量与 32 kHz / 16-bit PCM WAV 输出，保证浏览器兼容。补充录音做温和高低通与均衡：挥杆加强中低频厚度，金属减弱约 3.7 kHz 的尖锐共鸣，陶瓷保留较厚碎块声，玻璃保留较亮的碎屑细节。新增录音峰值留约 2.4 dB 余量。破碎直接使用完整的真实裂响与碎片尾音，不再重复叠加普通碰撞采样。

## 触发与混音

运行模块：`src/frog-escape-audio.js`。Web Audio 只在“进入／继续探索”的用户手势中解锁，统一缓存解码；不可用、下载／解码失败或浏览器拒绝启动时安静回退，不影响操作。

| 事件 | 声音处理 |
| --- | --- |
| 真实物理碰撞 | 按材质与碰撞能量选样、调音量；小餐具保持短促金属轻响，重工具区分撞墙共鸣与落地滚落，同一物品至少间隔 0.14 秒 |
| 撬棍砸击 | 破风声峰值对齐 0.39 秒砸击阶段；命中任何目标，包括奶蛙、石墙、木桌、门柜和已碎物品，固定使用 `metalClang_03` 以约 0.9 倍播放形成短促金属“棒”声，每次只播放一次，空挥没有金属接触声 |
| 撬棍碰到奶蛙 | 真实近战接触即有同一金属声，即使本次伤害处于冷却；投掷命中及被格挡走独立事件路径，避免与近战重复。正常受击保留身体反馈，被挡住时不播放受伤声；易碎目标仍独立播放完整碎裂录音 |
| E 放置、拾取、丢弃、投掷 | 轻放低音量材质接触，短时跳过初次物理接触以免重复；放置后的翻倒仍能产生真实落地声；拾取与释放加入轻微操作反馈 |
| 物品／窗户破碎 | 杯、瓶、窗玻璃与真正的瓷器碎裂分开选样；每次只播放一段完整裂响和自然散落，碎片物理体不重复触发，也不叠加普通撞击声；鸡蛋破壳另行处理 |
| 门／抽屉／柜子／箱子 | 观察真实 `amount` 变化，开合有不同木轴／滑动／锁扣声音，结束时轻响；玩家和奶蛙操作使用同一逻辑，锁住或原地卡住不持续播放 |
| 奶蛙技能、受击与倒地 | 布料与挥动、拳头接触、较重落地，均为非人声音；拽拉与抱住使用布料动作声 |
| 左手格挡与遮光 | 格挡动作带轻微布料声；手电直照眼睛开始抬手时只触发一次轻微布料声，持续照光不反复播放 |
| 玩家着地与晕厥 | 真实落地速度与高度区分轻落脚和摔落；晕厥提示框只保留一次短促的身体落地声 |
| 玩家脚步 | 按实际水平距离累计，每 1.45 米一声，基础增益 0.04；蹲行、藏身、被抱住、腾空、贴墙静止与传送无行走声 |
| 奶蛙脚步 | 按现有 Walk／Run 元数据与模型前向比例计算实际落脚距离，基础增益 0.055；停步、受击、倒地与抓捕时无假脚步 |

木／石／草脚步有不同采样，声池避免连续重复，音高仅做小幅变化。位置声源按距离衰减、左右方向与几何遮挡处理；隔墙衰减为原值 30%，低通约 1.1 kHz。普通声最远约 24 米、脚步 13 米，破窗最多 30 米。最多同时 16 个声源，低优先级脚步可被重要受击声替换；尾部有短包络，总线轻限幅防止大量碰撞叠加过载。

暂停菜单提供原生静音复选框和 0–100 音量滑杆，默认 65%。仅写 `naiwa-escape-sfx-v1` 设置键；禁用存储也能操作。暂停、地图与回起点取消活动及待解码播放，继续时不会堆积补播；本模块只观察玩法事件，不参与警觉、生命、AI 听力或章节进度结算。

## 2026-10-17 · 举砸与玩法听觉

举砸前摇使用现有 CC0 厚实挥动录音，峰值对齐出拳前段；命中使用接近原速的重拳录音，叠加低音量、短促的软体撞击，取代原来降速刀刃挥动声。砸空保留地面材质重击，不加入角色人声。没有新增网络素材或许可证变化。

玩法听觉由独立的 `frog-escape-noise.js` 和追捕感知处理，不依赖本混音器。听觉观察实际行走、门柜运动、碰撞动能、落地与破碎，静音设置只影响玩家听到的声音。新增床底撑地与伸手的轻微衣料动作声。

## 2026-10-17 · 跨椅与木椅断裂（跨椅音效已由 v16 移除）

v16 删除跨椅抬腿／落地的事件与声音，改为普通阶段凭重量挤开椅子，碰撞继续按真实接触发声。踹椅与高速撞击继续按实际事件发声；木椅断成零件时播放现有 CC0 木材裂响，替代通用湿物破碎音。零件保留各自的材质碰撞声音，并沿用空间衰减、冷却、静音和暂停处理，没有新增角色人声或网络素材。

## 重制与检查

`scripts/prepare-frog-escape-audio.py` 为一次性导入工具，不在构建时联网。需要 numpy、soundfile；可把 soundfile 临时安装至忽略目录 `tmp/audio-tools`。使用 `--commit 9662dc1bed3b06ae753045915f9accfac044c7ce` 重制本批素材；默认显式运行时查询仓库当前 main 提交。

随后运行 `scripts/refine-frog-escape-audio.py` 导入／重制本次 16 段补充录音；`--offline` 直接复用保留的原始文件，无需联网。先重制基础包，再运行补充工具，得到最终 72 段及统一 manifest。补充工具固定 GitHub 提交与 Freesound 编号，不在构建时执行。

`npm run check:frog-escape-audio` 检查全部源文件／WAV 哈希、时长、单声道编码与非静音无削波 PCM；不同挥动采样的峰值时刻、金属轻／重／落地选样、完整碎裂单次触发；真实场景的门柜开合、放置、玻璃跌落与玩家摔落；25／60／144 FPS 下的安静脚步与蹲行静音；方向／距离／遮挡、冷却、声源上限、用户手势、缓存、暂停取消、设置隔离及无音频设备／离线回退。配合撬棍、更新说明检查与构建。按项目偏好由用户刷新验收听感，不主动打开浏览器。
