# 章节详情宣传页

2026-10-02：将三个章节的单屏详情页改为可滚动的宣传页。布局与介绍在 `src/chapter-promo.ts`，样式在 `src/chapter-promo.css`，`src/main.ts` 保留原有章节入口、确认重开、剧情树预览和番外解锁逻辑。

## 页面与文案

- 页首使用章节场景大图、章名和开始／继续按钮。随后依次介绍故事、三个场景片段、角色与操作方式，页尾再次提供进入章节与切换章节的入口。
- 第一章使用雨夜与暖色日常；第二章使用冰蓝镜馆；第三章使用红色剧场。角色介绍延续对应场景，不使用功能卡片或空泛的卖点标题。
- 中文写具体相处和调查情境，英文独立改写。角色引语取自已有对白；不展示结局图和后台解谜路线，不在宣传页说明交易结局。
- 第一章海边番外使用已有海岸素材。解锁状态、视频次数和约会进度由现有模块传入，不由宣传页推算或修改。

## 复用素材

本次没有生成新图。所有图片均来自 `public/images/` 的既有 WebP，PNG 原图与角色参考保持原样。

| 用途 | 图片 |
| --- | --- |
| 第一章 | `P02.webp`、`R02_KITCHEN.webp`、`M03.webp`、`R03_PHOTO.webp` |
| 第二章 | `chapter-02-ice-hall.webp`、`chapter-02-cg-three-mirrors.webp`、`chapter-02-cg-film-fragment.webp`、`chapter-02-cg-cold-mirror.webp` |
| 第三章 | `chapter-03-cg-entrance.webp`、`chapter-03-cg-breakfast.webp`、`chapter-03-cg-offer.webp`、`chapter-03-naifen-guarded.webp` |
| 海边番外 | `dlc-coastal-shore-smile.webp` |

## 滚动与状态

大屏幕上，场景图在文字旁保持定位，读到下一段时切换图片。页首与部分图片做轻微位移，文字进入可视区后出现。手机和矮屏直接将每张图与对应段落排在一起；系统减少动态效果时，使用静态图文布局。

页面使用自己的滚动容器，支持原生滚轮、触摸和全屏。滚动事件合并到动画帧中；离开详情页时取消动画帧并断开观察器、移除监听。切换语言保留本次浏览的位置，离开章节后重新进入从页首开始。滚动不调用音频、章节控制器或存档。

顶部保留剧情树与语言按钮，更多选项收纳返回、设置、图鉴和全屏。Esc 先收起更多选项，再返回章节选择。原生弹窗仍挂在稳定的 `#app` 根节点。章节介绍、角色与开始区域可通过页内链接定位，按钮保留键盘焦点。

## 检查

- `npm run check:chapter-promo`：中英文新开／继续与番外状态，锚点和素材、滚动无存档／音频副作用、场景切换、动画帧合并、减少动态效果、焦点、滚动位置恢复、监听清理。
- `npm run check:route-preview`、`check:release-notes`、`check:site`：保留原有预览、更新弹窗与章节加载行为。
- `npm run check:story`、`check:chapter-three`、`check:romance-dlc`、`check:dlc-unlock`：剧情与番外检查。
- `npm run build`：类型检查与生产构建。

按项目约定，不主动打开浏览器验收。由用户刷新页面，查看桌面与手机布局和滚动效果。
