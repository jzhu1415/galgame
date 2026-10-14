# 旁白服务修复（2026-10-12）

## 根因与修复

Edge TTS 7.2.8 的旧合成主机 `speech.platform.bing.com` 持续返回 WebSocket HTTP 403，语音列表仍能正常读取。上游 2026-10-12 的 [修复提案 #491](https://github.com/rany2/edge-tts/pull/491) 确认微软将合成迁移到 `api.msedgeservices.com/tts/cognitiveservices/websocket/v1`，旧公共客户端令牌在新请求中需使用 `Ocp-Apim-Subscription-Key` 参数名。此前只换主机、仍使用 `TrustedClientToken` 参数的测试因此未成功。

项目增加 `scripts/edge-speech-compat.py`，仅在依赖仍指向旧合成地址时修正模块实际读取的地址及参数名；语音列表地址保持正常。同时使用标准 HTTP 日期解析器，避免系统语言影响服务时间校准。修复同时接入 `generate-neural-tts.py` 与 `generate-finale-tts.py`，不依赖对虚拟环境中的第三方包做手动修改。未来依赖本身提供新版地址时不覆盖它。

## 已恢复的声音

- 六句旁白，十二段中英文 MP3，已通过在线合成重新生成。
- 中文 `zh-CN-YunyangNeural`，英文 `en-US-BrianNeural`，语速均为 `-5%`。
- 恢复原语音索引计算，不再读取本地声线覆盖；生成脚本移除 `say` 回退分支。
- `docs/finale-speech-fallbacks.json` 留作历史来源记录，已标记 resolved，不再参与当前生成。
- 玩家与组织成员声线、奶蛙／奶霸／肥嘟嘟原声、剧情节点和存档保持原样。

## 验证

中文和英文短句在新接口真实合成成功；生成脚本报告 422 个片段，12 个重新生成、410 个缓存命中。兼容测试覆盖正确参数名、语音列表不变、未来地址不被覆盖，以及英文 HTTP 日期、数字时区、无时区与无效日期。完整终章检查验证字幕与朗读哈希；构建和更新说明检查在恢复之后运行。
