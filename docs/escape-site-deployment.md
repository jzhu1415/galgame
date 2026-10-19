# 奶蛙致死的爱 · 独立站

- 独立站：<https://naiwa-deadly-love.starrymule6.chatgpt.site>
- Galgame 首页：<https://galgame-ashy.vercel.app>
- Sites project ID：`appgprj_6ad58d8337808191bfca41b4d173bdbe`
- 用户选择公开访问。首页入口的简介为“奶蛙致死的爱”，英文为 “Naiwa’s Deadly Love”。

## 共享代码与独立产物

运行 `npm run build:escape`，使用原有 `frog-escape-map.html` 和 `src/frog-escape-*`，输出 `sites/naiwa-escape/dist/index.html`。地图、游玩、设置和更新说明在独立站完整保留，返回主页入口指向 Galgame。

构建关闭 Vite 的整站 public 复制，只保留逃脱游戏需要的 GLB、脚本、样式和 `public/audio/frog-escape`（包含许可证）。不会复制视觉小说的图片、影片和对白录音。`npm run check:escape-site` 检查产物资源完整性与双语首页链接。

Sites 的源仓库保留这个静态产物快照和 `.openai/hosting.json`；原始实现与构建脚本由本 GitHub 仓库维护，避免两套游戏实现分叉。`sites/escape-hosting.json` 保留站点身份，构建时会恢复缺失的本地 manifest，拒绝覆盖其他站点身份。`sites/naiwa-escape/` 为独立的、已忽略的 Sites checkout，不作为本仓库的 Git 子模块提交。

## 更新发布

1. 同步 GitHub 主线，修改共享游戏代码与中英文更新说明。
2. 运行相关功能检查、`npm run build`、`npm run build:escape`、`npm run check:escape-site`。
3. 复用 checkout 中 `.openai/hosting.json` 的 project ID，使用 Sites source workflow 同步快照并打包。
4. 用 helper 返回的原样 `commit_sha` 和 archive 保存版本，再公开部署；只有部署成功才能宣称上线。

按项目规范，本次不主动开启浏览器或进行截图验收。构建、资源和功能逻辑使用无浏览器检查。
