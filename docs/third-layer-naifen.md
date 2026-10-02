# 第三位面 · 奶粉

第三章《血色交易》已制作成独立可玩的中英双语章节。**奶粉**是用户指定的第三位面主角，承载奶蛙精神世界的破坏冲动。奶粉被反复重演的受伤场景困在血肉剧场，玩家通过真实生活细节帮助它脱离剧本，允许它表达愤怒并自主选择离开。

## 角色约束

- 用户原图：`references/naifen-character-turnaround.png`，完整保留。
- 粉色、圆润的梨形身体；浅奶白色椭圆肚皮；绿色圆眼与黑色瞳孔；小嘴；短粗手臂；手脚末端偏深紫。
- 无衣服、尾巴、耳朵。原立绘采用温和但不安的表情，向玩家伸出一只手；新增愤怒、害怕、委屈、警惕、释然和开心六种神态，保持一致的身体比例、镜头和渲染风格。
- 原声直接复用 `src/character-voice.ts` 的奶蛙四段录音，与奶霸使用同一个轮换池。四段播过一遍再重新打乱，轮次交界不连续重复，刷新保留轮换进度。第三章每句只播放一段，避免长台词不断重复短录音。
- 录音是用户原声片段，不与新增台词逐字对应。新章节的旁白、主角和研究员目前以文本呈现。
- 奶粉属于第三层心理碎片；奶霸属于另一个完整人格，两者不混同。第三章不揭晓奶霸身份，不免除其车祸责任。

## 玩法与存档

医院邀约 → 初见奶粉 → 插画舞台调查 → 奶霸对质 → 碎片交易 → 落幕。

三幕可按任意顺序调查。雨夜选歪斜的伞；早餐选焦掉的松饼；车祸保留操控和最后转向的完整片段。正确辨认后归入记忆日记。错误选择会导致重演，消耗精神力、增加污染；精神力为零会进入失败结局。

幕后路线为额外调查：用真实生活道具核对手绘路线，走侧门获取替代容器。未核对时替代交易选项锁定，玩家可以暂缓交易，回舞台调查。所有交互都有可点击按钮，支持键盘操作、触屏、全屏及减少动态效果偏好。

三个结局：

1. **落幕之后**：保护真实记忆，听奶粉表达愤怒，让它自己松手；第三层成功安抚。
2. **掌声里的空位**：交出真碎片换取治疗，短暂出现恢复迹象，但记忆有了空缺、污染更高；组织目的仍留作后续悬念。
3. **无人谢幕**：精神力耗尽。

独立存档键：`naiwa-chapter-three-v1`。保存节点、台词位置、精神力、污染、三幕记忆、路线核对、交易选择、访问节点、回顾和解锁结局。重玩第三章保留结局记录。中英文共用同一存档，切换语言不改变选择。可使用 `?chapter=3` 直接打开本章。

## 界面布局

用户反馈改版不如原版后，已恢复原来的沉浸式布局：桌面采用全屏场景背景、叠加奶粉立绘和底部对白框，恢复原标题、状态栏、探索按钮及常驻工具栏。手机继续保留新增分镜时的完整横幅画面。新增分镜、六种神态、语音轮换、剧情和存档均保留。

构建和章节路线检查通过；遵循用户偏好，不主动打开浏览器验收。

## 素材与生成

使用 **Codex 内置 imagegen** 生成，没有使用 CLI/API 回退。PNG 原图保存在 `assets/images/`，网页使用 WebP；透明立绘保留 alpha。

| 文件 | 用途 |
| --- | --- |
| `assets/images/chapter-03-naifen.png` | 奶粉立绘原图 |
| `public/images/chapter-03-naifen.webp` | 游戏透明立绘 |
| `assets/images/chapter-03-theatre.png` | 剧场背景原图 |
| `public/images/chapter-03-theatre.webp` | 游戏舞台背景及章节卡片 |

真实回忆仍穿插现有雨夜、早餐和事故插画；新增分镜与旧素材并存，不改动旧素材。

## 新增分镜与神态

此次新增 **9 张剧情分镜、6 张奶粉神态立绘**，全章实际接入 16 张场景图片。分镜和表情细化到具体台词，在 `src/chapter-three-visuals.ts` 中配置，读取存档、切换语言不会改变画面对应关系。探索总览保持原构图，调查标记仍对应原舞台道具。手机剧情界面新增完整横幅画面区域，展示整张分镜及对应神态。

PNG 原图统一保存至 `assets/images/`，保留原文件；网页 WebP 保存至 `public/images/`，六种神态保留透明通道。全部使用 **Codex 内置 imagegen**；精确提示词、参考图片和逐张保存路径见 [新增图片提示词清单](chapter-03-image-prompts.json)。

| 新增分镜 | 网页文件 |
| --- | --- |
| 医院邀约：银色箱子、探针与同意书 | `public/images/chapter-03-cg-offer.webp` |
| 第三声铃：从帷幕走进剧场 | `public/images/chapter-03-cg-entrance.webp` |
| 雨夜：左侧歪伞与纸箱，右侧车灯排演 | `public/images/chapter-03-cg-rain.webp` |
| 早餐：星星杯、焦松饼与完美餐盘 | `public/images/chapter-03-cg-breakfast.webp` |
| 车灯：放映机与偏转的车辆 | `public/images/chapter-03-cg-film.webp` |
| 后台：手绘路线、正门与侧门容器 | `public/images/chapter-03-cg-backstage.webp` |
| 交易：奶霸交出容器并取回手机 | `public/images/chapter-03-cg-bargain.webp` |
| 落幕：平静剧场、日记与保留的碎片 | `public/images/chapter-03-cg-curtain.webp` |
| 失控：断线、倾倒的座椅与暗下的灯 | `public/images/chapter-03-cg-collapse.webp` |

| 新增奶粉神态 | 网页文件 | 主要出场位置 |
| --- | --- | --- |
| 愤怒 | `public/images/chapter-03-naifen-angry.webp` | 初见、车祸、扯断吊线 |
| 害怕 | `public/images/chapter-03-naifen-scared.webp` | 重演、正门陷阱、精神力耗尽 |
| 委屈 | `public/images/chapter-03-naifen-sad.webp` | 完美早餐压力、交易与错误命令 |
| 警惕 | `public/images/chapter-03-naifen-guarded.webp` | 初见、路线调查、保留车祸证据 |
| 释然 | `public/images/chapter-03-naifen-relieved.webp` | 找回真实记忆、允许表达愤怒 |
| 开心 | `public/images/chapter-03-naifen-happy.webp` | 雨夜和早餐归位、成功落幕 |

### 奶粉立绘最终提示词

参考图片为用户三视图。

```text
Use case: identity-preserve. Asset type: transparent visual novel character sprite for a browser game. Reference image is a three-view model sheet of the character Naifen (奶粉). Generate ONE full-body front three-quarter view of exactly this character, matching the pink pear-shaped rounded body, pale cream oval belly, green round eyes with black pupils, tiny smile, short chunky arms, dark mauve fingertips and feet, no clothes, no tail, no ears. Soft polished 3D animated-film rendering, subtle theatrical warm key light and pink rim light. Gentle slightly anxious expression, one hand raised toward viewer as if asking them to stay. Character centered, entire body visible, generous transparent margin around silhouette. Actual transparent background. No labels, no text, no floor, no props, no additional figures. Save the finished image as a local file and report its path.
```

### 剧场背景最终提示词

```text
Use case: stylized-concept. Asset type: wide background art for a psychological mystery visual novel browser game, third realm called Flesh Theatre. Render a single landscape 16:9 cinematic scene of an abandoned ornate theatre seen from the back of the auditorium toward its stage. Burgundy velvet curtains shaped subtly like living organic folds, tarnished gold arches, dark rose walls, empty seats, crimson thread-like rigging overhead; moody but no gore. On stage: a small domestic breakfast table with a cream mug on the left, a freestanding rainy street window in the middle, a vintage film projector on the right. Three separate pools of warm spotlight. A tiny pink glowing crystal in a glass display at stage front. Foreground and lower quarter fairly dark and uncluttered for game dialogue overlay. No characters, no words or signage, no lettering, no watermarks. Detailed polished 3D animated-film environment, cinematic soft volumetric lights, dusty atmosphere, cool rain glow contrasted with warm crimson and pale champagne, strong legible composition and tactile materials. Save local finished image and return path.
```

## 验证

`npm run check:chapter-three` 检查 23 个场景的中英文本、所有链接、24 种完整路线组合、三个结局、存档恢复、路线门槛、禁止重复恢复精神力，以及逐条台词的分镜／神态映射。全部 9 张新增分镜和 6 种神态必须实际接入，检查所有图片存在及镜头切换顺序。`npm run build` 进行 TypeScript 检查和正式构建。PNG 成品已逐张目视检查，六种神态的透明通道已检查；依据用户偏好，本次不主动做浏览器视觉验收，由用户刷新试玩。

## 剧情树与回放

按用户要求，第三章剧情树统一为第一章的蓝灰/金色分支连线画布，展示全部 23 个节点，包括三幕调查、幕后路线、失败分支、交易、回应与三种结局。游戏内与章节详情页使用同一个弹窗，支持拖动、缩放、当前节点高亮定位和结局图鉴；仅预览不修改存档。

独立进度键 `naiwa-chapter-three-progress-v1` 保存首次抵达的节点检查点、累计解锁节点及结局。确认节点跳转后，恢复当时的精神力、污染、记忆、路线核对和交易状态，台词与回顾重新开始。当前存档键 `naiwa-chapter-three-v1` 保持兼容。重玩保留剧情树解锁与结局。

旧存档只记录过访问、没有保存历史状态的节点，保留标题并提示“重访后可回放”，再次到达后记录检查点，不以当前状态伪造过去的进度。

项目规范见 [AGENTS.md](../AGENTS.md)。
