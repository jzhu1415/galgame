# Context7 项目审查 · 2026-10-14

**修复状态（同日更新）**：用户要求修复后，以下四个问题及缓存条件问题已接入修复，并补上原生弹窗异步关闭的回归保护。最新全部 **35 个项目检查**及生产构建通过。原始发现保留在下文，修复细节与验证范围见文末；历史行号对应审查基线。

审查基线：`a2e73ca6470bf10cbf5b0211b08ba7ae298ee21c`，包括当时未提交的主页紫色样式调整。运行依赖：Three.js 0.185.1、Vite 7.3.6、TypeScript 5.9.3。最初只读审查与复现未修改游戏实现、存档、Git 索引或提交历史；后续授权修复保留原有主页 CSS 修改。

结论：现有检查和构建通过，但发现 **4 个可复现问题**，以及 **1 个依赖浏览器缓存命中的条件问题**。应优先修复第二章回放的探索状态同步，再修复第一章后台推进和第二章对白身份判断。没有把构建成功当作所有交互正确的证据。

## 1. [P1] 第二章剧情树回放沿用旧的镜馆现场

位置：[chapter-two.ts:450](/Users/claw/Documents/galgame-naiwa/src/chapter-two.ts:450)，相关复用路径：[chapter-two.ts:336](/Users/claw/Documents/galgame-naiwa/src/chapter-two.ts:336)。

触发：正在镜馆探索并已收齐线索，打开剧情树，确认回放较早的探索或物证检查点。

确认后的代码只替换父控制器的 `save`，没有清理地图。`render()` 发现已有地图后只发送语言更新，保留原 iframe。于是存档中的旧线索与 iframe 中的已收集物证不一致：物证仍隐藏，玩家不能重新收集；镜心发出的完成事件又被父控制器的线索门槛拒绝。

真实 `mountChapterTwo`、`mountPoolIceWorld` 和章节图层探针结果：

```text
父存档 clues=[]；iframe 仍持有六条已收集线索
iframeCount=1；iframeRemoved=false；没有第二次 init
可再次收集的 clue 消息=[]；可见物证组=0
镜心发出 core，但父控制器 phaseAfterCore="map"
```

修复方向：在确认回放时重置当前探索和对白的临时状态，再恢复检查点并重新初始化地图。可以复用手动读档路径已有的 `stopPlayback()`、`clearMap()` 顺序；普通语言切换仍保留现场，不应因此重建地图。补上“探索中回放旧节点，再收集物证并离开镜馆”的控制器联动测试。

## 2. [P2] 第一章 Auto/Skip 在后台继续推进并改写进度

位置：[main.ts:805](/Users/claw/Documents/galgame-naiwa/src/main.ts:805)，定时器条件从 802 行开始。

触发：第一章开启自动或快进，然后切换标签页或把浏览器切到后台。

创建定时器及回调都没有检查 `document.hidden`，第一章控制器也没有可见性暂停逻辑。真实 `renderGame()`、`advance()`、`enter()`、存档和检查点函数探针，在隐藏状态运行三个回调后确认：

```text
Auto：p01:0 → p01:1 → p02:0 → p02:1
Skip：p01:0 → p01:1 → p02:0 → p02:1
各发生三次自动存档写入、一次累计进度写入，并建立 p02 检查点
仍有后续定时器排队
```

玩家返回后会错过台词，刷新也恢复到已经推进的位置。浏览器后台定时器节流只能延迟推进，不能保证暂停。

修复方向：统一处理第一章的可见性状态，后台清除自动推进计时器、暂停逐字显示和媒体；回到前台按阅读模式恢复，并在回调中再次检查隐藏状态。第二章已有可见性暂停可作为项目内参考。

## 3. [P2] 第二章回放另一种结局时可能显示原结局台词

位置：[chapter-two.ts:192](/Users/claw/Documents/galgame-naiwa/src/chapter-two.ts:192)、[reading-settings.ts:63](/Users/claw/Documents/galgame-naiwa/src/reading-settings.ts:63)，回放入口仍为第 450 行。

触发：当前处于信任结局首句，确认回放质疑结局首句。

`readingKey()` 只包含 phase、line、fragment 和 language，不包含决定正文的 `response`。两种结局均为 `ending:0`，key 相同；回放又没有清空 reader，`bind()` 因而沿用旧字符。存档已经正确恢复到质疑分支，显示仍是信任分支的台词。

真实 `restartIceFrom()`、对白解析器、`readingKey()` 与 `createDialogueReader()` 的中英文探针都复现了 key 相同、正文保留旧分支的问题。

修复方向：为对白构造包含实际分支身份的 key，并在回放时重置 reader。补上同一 phase/line、不同 response 的结局切换测试；手动读档已调用 `stopPlayback()` 清理 reader。

## 4. [P3] 第一章菜单中的逐字暂停会被音频结束重绘解除

位置：[main.ts:792](/Users/claw/Documents/galgame-naiwa/src/main.ts:792)，相关音频结束回调在第 303–311 行，菜单暂停入口在第 434 行。

触发：设置逐字显示，文字未显示完时打开菜单，然后当前音频结束或报错。

菜单入口暂停 reader，但音频回调调用 `renderGame()`，无条件 `reader.bind()` 又重新安排逐字计时器。探针确认菜单依然打开、原本零个计时器变为一个，200ms 后继续显出字符；剧情索引和存档没有推进。因此这是菜单暂停表现的问题，优先级低于前三项。

修复方向：重绘后保留 reader 的暂停状态，或根据菜单、弹窗及后台状态决定是否恢复。覆盖真实音频回调与菜单组合，而不是只测试手动调用 `reader.pause()`。

## 条件问题 [P2] 浏览器缓存恢复后镜馆图层已被销毁

位置：[reference-map.js:2812](/Users/claw/Documents/galgame-naiwa/src/ice-pool/reference-map.js:2812)、长按按钮清理：[reference-map.js:2479](/Users/claw/Documents/galgame-naiwa/src/ice-pool/reference-map.js:2479)。

触发条件：离开整个网页，通过浏览器返回，并成功命中 BFCache。

`pagehide` 无条件永久销毁章节图层、画质选择器和长按按钮监听，包含 `persisted=true` 的缓存导航；没有对应的 `pageshow` 重建。生命周期探针中，传入真实条件后物证组从四个变成零、长按监听清空，恢复事件没有重建处理。MDN 明确说明，`pagehide` 的 `persisted=true` 表示页面可能被保留供后续复用，应与永久销毁区分。[MDN pagehide 文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)

修复方向：缓存导航采用暂停／恢复，永久离开时销毁，或恢复时完整重建。**本轮未打开浏览器，尚未验证当前浏览器及这组 iframe/WebGL 的实际 BFCache 资格**；不把条件探针写成已发生的真机故障。

## Context7 官方文档核对

- **Three.js**：解析为 `/mrdoob/three.js`。核对了 renderer 与几何、材质、纹理、render target 的资源责任。移除场景对象并不自动释放其资源，但本项目章节图层已有显式清理；没有仅凭“没有统一 renderer.dispose”就认定 GPU 泄漏。[Three.js 资源释放手册](https://github.com/mrdoob/three.js/blob/dev/manual/pages/how-to-dispose-of-objects.html)
- **Vite**：解析为 `/vitejs/vite`，查阅 7.3.5 版本文档（与安装的 7.3.6 相邻补丁版本）。文档说明 Vite 负责转译，类型检查需单独执行。本项目 `tsc --noEmit && vite build` 符合该用法；`tsconfig.json` 没启用 JavaScript 检查，镜馆 JS 的跨模块事件行为仍需专项测试。[Vite TypeScript 文档](https://github.com/vitejs/vite/blob/v7.3.5/docs/guide/features.md)
- **浏览器 dialog**：解析为 `/mdn/content`。核对了可取消的关闭请求与直接 `close()` 的区别；全局 Escape 保留原生取消流程，终章谢幕的取消防护没有被绕过。[MDN dialog requestClose 文档](https://github.com/mdn/content/blob/main/files/en-us/web/api/htmldialogelement/requestclose/index.md)
- 同时参照了当前可访问性、焦点、减少动态效果与媒体规范，没有把纯排版偏好列成阻断问题。[Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)

## 已运行的验证与范围

- `package.json` 中全部 **31 个 `check:*` 命令通过**：30 个只读检查以四个并发执行，统计刷新检查单独运行，避免与生成文件写入竞争。
- 另运行 `node scripts/check-reading-tools.mjs` 通过，共 **32 个不同检查**。该脚本目前没有登记在 npm 命令中；建议登记，并增加上述控制器组合案例。
- `npm run build` 通过；`npm audit --json` 报告 **0 个已知依赖漏洞**；`git diff --check` 通过。
- 镜馆 3D 分包为约 1,054.60 kB，gzip 328.78 kB，构建仍有体积提示。没有实测加载时长或 GPU 帧率，不将该提示直接当作性能故障。
- 另运行两个从当前源码提取真实控制器／模块的临时复现脚本。DOM、媒体呈现与部分浏览器事件使用替身；状态、对白、检查点和章节控制器采用实际代码。这些探针通过表示上文的缺陷被复现，**不是缺陷已经修复**。
- 未进行浏览器视觉验收、真机触控、WebGL GPU 编译或实际 BFCache 恢复验收。没有自动修改或上传修复。

## 排除的候选与复现文件

设置菜单 Esc 误退出的初始候选已排除：正确模拟 `preventDefault()` 后，`defaultPrevented=true`，`isIceControlEvent()` 的现有保护阻止再次退出。选项处保留 Auto 模式、等待玩家选择后继续是合理行为，不单独列为缺陷。未验证的通用资源泄漏猜测没有进入问题清单。

临时复现命令（文件在 `/private/tmp`，不承诺长期保留）：

```sh
node /private/tmp/naiwa-review-reading-repro.mjs
node /private/tmp/naiwa-review-three-repro.mjs
```

完整普通检查输出：`/private/tmp/naiwa-context7-review-checks.json`。

## 授权修复与最终验证 · 2026-10-14

| 原始问题 | 已接入的修复与回归 |
| --- | --- |
| 第二章回放沿用旧现场 | 确认回放后清理阅读、声音和旧 iframe，再按首次抵达快照初始化镜馆；回归实际控制器、桥接与章节图层，重新收集全部物证并成功进入镜心。取消确认和普通语言切换保留现场，累计解锁保留。 |
| 第一章后台 Auto/Skip | 统一前后台及弹窗暂停状态，定时器创建和执行都验证当前状态。后台暂停文字与正在播放的声音，前台恢复当前位置；主动暂停、静音、结束与离开章节不会被自动恢复。 |
| 第二章错误分支对白 | 阅读身份纳入 approach、response；回放同时清理旧阅读状态。中英文、同一 phase/line 的不同回应与路线均覆盖。 |
| 第一章菜单暂停被重绘解除 | 阅读器明确保存暂停状态；音频结束、报错和设置重绘不会重新安排菜单中的逐字显示。 |
| 缓存导航永久销毁镜馆 | 缓存隐藏时清除键盘、长按、摇杆、视角和跳跃的临时输入，保留图层、画质及触控监听；永久离开才销毁。验证重复缓存隐藏后仍能执行永久清理，并保留剧情和菜单操作门槛。 |

修复期间的独立复核还发现：第二章面板打开时切换语言，`dialog.close()` 已移除 `open`，但关闭事件尚未到达；渲染先清空旧面板引用，原来的关闭回调会跳过阅读恢复。采用跨重绘持久暂停后，这个边界会表现为新对白保持暂停。因此第二章现在主动同步当前后台、面板、原生弹窗及碎片状态，不依赖旧引用的关闭回调；地图和碎片对白保留各自的操作门槛。隐藏时的语言重绘不会播放新声音，延迟关闭也不会恢复后台声音或文字。

Context7 核对了原生 `close` 事件不冒泡；同时参照 HTML 官方算法：`close()` 先移除 `open`，再排入任务触发 `close`。测试替身已改成排队关闭事件，不再把同步派发当作浏览器语义。[HTML dialog 关闭算法](https://html.spec.whatwg.org/multipage/interactive-elements.html#close-the-dialog)

验证结果：

- 第一章新增生命周期检查 **20/20**，修复前为 4 通过、12 失败；额外覆盖主动暂停、静音、旧播放请求与离章行为后共 20 项。
- 第二章回放与面板生命周期检查 **16/16**。最初回放检查修复前为 6/8；异步关闭扩展后原有 8 项通过、新增 7 项失败，修复后全部通过，再补上显式关闭按钮已处后台的声音延后恢复用例。
- 镜馆页面生命周期检查 **5/5**，涵盖缓存复用、暂时输入、画质、剧情及菜单门槛和最终资源清理。
- `package.json` 已登记上述三个新增检查及既有阅读工具检查，最新全部 **35/35** 项目检查通过；统计刷新单独运行，生产构建与 `git diff --check` 通过。
- 中英文更新说明使用新的唯一版本 `2026-10-14-reading-and-replay-lifecycle`；首次显示、旧版本已读、新版本提示、禁用存储和存档隔离检查通过。
- 原有主页紫色修改的内容指纹保持一致。未暂存、提交、推送或改写 Git 历史。
- 独立代码复核未发现剩余可证明缺陷；另外用独立计时队列复验异步关闭、语言恢复、后台暂停与音频当前位置保留，未仅依赖新增 helper 的实现。

本次验证采用真实章节控制器、阅读器、检查点、iframe 桥接与章节图层代码；DOM 呈现、媒体解码、计时器和原生弹窗任务队列采用测试替身。遵照项目约定，未打开浏览器验收，实际 BFCache 资格、真机触控和 WebGL GPU 表现仍未实测。构建仍有既有镜馆分包体积提示，本轮没有更改依赖或打包策略。

新增检查已保存在项目 `scripts/` 中；文中最初的临时复现探针是历史缺陷断言，不再用作修复后的通过标准。最新完整检查输出：`/private/tmp/naiwa-repair-checks.json`；构建输出：`/private/tmp/naiwa-repair-build.log`。
