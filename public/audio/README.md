# Poolrooms 本地音效素材清单

已接入用户提供的 ElevenLabs 入水与脚步素材，开发和生产环境均使用实际文件，不是 DEV 占位声。两段入水 MP3 仅复制和重命名；走路与跑步素材分别裁成单步片段。没有下载外部素材，下载目录中的原文件保留。发布授权以用户的素材许可为准。

- `water/splash/walk_entry.mp3`：来自 `ElevenLabs_Soft_splash_sounds,_calming_and_soothing.mp3`，约 2.09 秒、33,481 bytes。用于走入/跑入水，SPLASH_SMALL / SPLASH_MEDIUM 共享同一缓存。
- `water/splash/dive.mp3`：来自 `ElevenLabs_Loud_water_splash,_dramatic_impact.mp3`，约 1.07 秒、17,181 bytes。用于跳水/跌落入水，SPLASH_LARGE 使用。

两者仅在已有玩家状态从不在水中变为入水时单次触发，不循环、不作为每步涉水声。音频只读观察已有 grounded / swimming / velocity 和未叠加镜头摆动的 `baseEyeHeight`：本次离地过程中出现上升速度（`water.entryJumpRiseSpeed`，默认 0.2m/s）表示实际起跳；或累计从本次最高点落下至少 `water.entryHighFallDistance`（默认 2m），才选跳水。普通走下/跑下池沿即使下落速度很快也用柔和版，不再仅按入水速度判断。着地、入水、暂停重置和传送清理本次离地记录，防止影响下一次走入水。继续经过 WATER bus、水下过滤和房间混响。

湿瓷砖脚步使用两个独立素材池，每池 8 个不同片段：

- `footsteps/wet_tile/walk_01.mp3` 至 `walk_08.mp3`：来自 `ElevenLabs_Footsteps_splashing_in_a_puddle,_playful_vibe.mp3`。原文件约 4.08 秒，备份为 `footsteps/sources/walk.mp3`。
- `footsteps/wet_tile/run_01.mp3` 至 `run_08.mp3`：来自用户提供的“夜晚城市人行道上年轻女性奔跑特写声…” MP3。原文件约 4.28 秒，备份为 `footsteps/sources/run.mp3`。

单步片段根据原文件的落脚能量峰裁切，加短淡入/淡出，不归一化音量、不增加混响；并未做人声/街道背景分离，原录音在所选片段中的其他声音可能保留。仅在 WET_TILE 且已有 `running` 状态为真时使用 RUN_STEPS，普通走路使用 WET_TILE_STEPS。**浅水、深涉水均保留原有声池，即使按住跑步也不会换成新跑步素材。** 游泳、入水和跳水声音不受影响。

脚步仍按实际 XZ 移动距离触发，不循环播放原始整段；随机避免同池连续重复，音量和音高维持轻微变化。原始备份不在运行时加载。可用 `node scripts/prepare-footstep-audio.mjs walk public/audio/footsteps/sources/walk.mp3`（或 `run`）离线重制；脚本使用 ffmpeg / libmp3lame 并拒绝覆盖已有片段。项目运行不需要 ffmpeg。

其余声音仍待补齐。滴水已有 8–35 秒随机间隔、附近固定水面点位、距离衰减和房间混响，音量在 `AudioConfig.js` 的 `ambience.dripGain` 调节。目前尚未提供正式滴水文件；`scripts/generate-drip-audio.mjs` 为待完成验证的离线制作脚本，不参与运行时。

`npm run dev` 缺少素材时使用内存生成的 `DEV_ONLY_AUDIO_PLACEHOLDER`，用于验证触发、路由和生命周期，**不是最终 Poolcore 音效**。可在 `src/audio/AudioConfig.js` 设置 `devPlaceholder: false` 禁用。`npm run build` / `npm run preview` 不启用这些占位声：缺失的声池静音，但不阻断项目运行。

## 必备文件

以下路径均相对于本目录；编号均补零。将文件放入后刷新参考版即可，正式文件自动优先于占位声。若格式/命名不同，在 `src/audio/AudioManifest.js` 一处修改。

| 文件 | 数量 | 录制/设计方向 |
| --- | ---: | --- |
| `footsteps/wet_tile/walk_01.mp3` 至 `walk_08.mp3` | 8，已提供 | 用户走路素材裁出的单步片段 |
| `footsteps/wet_tile/run_01.mp3` 至 `run_08.mp3` | 8，已提供 | 用户跑步素材裁出的单步片段 |
| `water/shallow/step_01.ogg` 至 `step_04.ogg` | 4 | 脚踝浅水 small splash / light slosh |
| `water/wading/step_01.ogg` 至 `step_04.ogg` | 4 | 更厚实、低频更多的膝/腰部涉水 |
| `water/wading/movement.ogg` | 1 loop | 很低音量的持续水位移；不要带规则脚步节奏 |
| `water/swim/movement.ogg` | 1 loop | 近身游泳水运动，无音乐、无明显重复节拍 |
| `water/swim/stroke_01.ogg` 至 `stroke_03.ogg` | 3 | 加速/转向时轻划水 accent |
| `water/splash/walk_entry.mp3` | 1，已提供 | 用户提供的柔和版，走入/跑入水 |
| `water/splash/dive.mp3` | 1，已提供 | 用户提供的冲击版，跳落入水 |
| `water/surface/water_exit_01.ogg` 至 `water_exit_02.ogg` | 2 | 离水/爬岸后微弱滴落 |
| `water/surface/enter_01.ogg` 至 `enter_02.ogg` | 2 | 镜头没入水面，短而柔和的 cover / bubble |
| `water/surface/exit_01.ogg` 至 `exit_02.ogg` | 2 | 镜头出水的轻微水膜声 |
| `ambience/ventilation/loop.ogg` | 1 loop | 建筑通风，推荐 30–60 秒无缝片段，无人声 |
| `ambience/pool/loop.ogg` | 1 loop | 空旷室内泳池底噪，无配乐、pad 或旋律 |
| `ambience/fluorescent/loop.ogg` | 1 loop | 极轻灯具 hum，不刺耳、无夸张电流音 |
| `ambience/underwater/bed.ogg` | 1 loop | 水下极轻水体/低频建筑底噪，不做潜艇电影风格 |
| `ambience/distant_water/loop.ogg` | 1 loop | 温和远处水运动，用于位置声源 |
| `environment/drip/drip_01.ogg` 至 `drip_04.ogg` | 4 | 克制的单滴水声，不自带长混响 |

其余文件可以逐批准备；缺少部分文件不会影响已有文件播放。程序会从该声池中可用的样本随机选择。当前湿瓷砖走路与跑步各有 8 个 variation，涉水素材保留原来的命名约定与缺失回退策略。

## 可选真实混响 IR

可不提供。程序已有可用于运行的轻量合成 IR，它不是声音素材的开发占位器。

```text
impulse/small_tile.wav
impulse/pool_room.wav
impulse/large_pool_hall.wav
impulse/long_corridor.wav
impulse/deep_chamber.wav
impulse/underwater.wav
```

真实 IR 加入后自动通过平滑交叉淡化替换。建议控制长度在约 0.5–3.2 秒，并避免过响低频和过长尾音。

## 格式与循环

- 普通声音默认 `.ogg`；如果目标浏览器不能解码所选编码，可在 manifest 改用该浏览器支持的 `.mp3` / `.m4a` 等，不必改引擎。
- 位置音效（滴水、远处水）优先 mono；全局氛围可 mono 或克制的 stereo。避免把人工大混响预先烘进近身步声，再叠加引擎混响。
- loop 素材应原生首尾无缝。manifest 的 sample 可填 `loopStart` / `loopEnd`（秒），引擎会使用它们；未填则循环完整文件。仅首尾同一数值不能保证自然循环听感。
- 不要一律峰值最大化。保持自然动态和余量，之后用集中配置调 bus / send / gain。
- 解码后的内存约为 `秒数 × 采样率 × 通道数 × 4 bytes`；ogg 小文件不等于低 PCM 内存。每 URL 只请求/解码一次。
- 浏览器缺失文件可能返回 HTML；加载器会识别并输出带具体 URL 的警告，避免把 HTML 当音频解码。

完整架构、审计与运行限制见 `docs/AUDIO-SYSTEM.md`。最终听感由用户运行参考版后自行验收。
