# 音频素材

| 项目内原始文件 | 用户提供的文件 | 用途 |
| --- | --- | --- |
| `naiwa-laugh-source.m4a` | `ScreenRecording_09-26-2026 20-06-41_1.m4a` | 奶蛙笑声，约 15.72 秒 |
| `naiwa-speech-source.m4a` | `ScreenRecording_09-26-2026 21-01-53_1.m4a` | 奶蛙普通说话，约 2.32 秒 |
| `naiwa-short-reply-source.m4a` | `ScreenRecording_09-26-2026 21-08-40_1.m4a` | 奶蛙简短回答，约 1.90 秒 |
| `character-voice-03-source.m4a` | `a7ba689f718e544ec92484a6e6a3803b.mp4` 的音轨 | 奶蛙和奶霸通用说话声，约 1.94 秒 |
| `character-voice-04-source.m4a` | `c615876d2d53d5dfabc8340b48673bd9.mp4` 的音轨 | 奶蛙和奶霸通用说话声，约 1.34 秒 |

`public/audio/` 保存网页播放文件，并包含预先生成的主角中英文男声 TTS。新增素材只提取音轨，未复制视频画面。重新生成主角语音可运行 `npm run generate:tts`。

## 说话音量校准 · 2026-10-07

后加入的两段录音原始响度约为 -53 LUFS，比最初两段说话声（-10.16 / -10.42 LUFS）低约 43 dB。网页播放版本已从原始音轨重新制作，采用两遍 `loudnorm`、目标 -10.5 LUFS、真峰值上限 -1.5 dBTP，再编码为 48 kHz / 128 kbps AAC。

| 网页文件 | 原始响度 | 编码后响度 | 编码后真峰值 | 时长 |
| --- | --- | --- | --- | --- |
| `character-voice-03.m4a` | -53.41 LUFS | -10.51 LUFS | -4.12 dBTP | 1.941 秒 |
| `character-voice-04.m4a` | -53.55 LUFS | -10.56 LUFS | -4.13 dBTP | 1.344 秒 |

`*-source.m4a` 保留原始音轨。两段网页文件的播放地址带有音量版本参数，刷新游戏后会重新加载校准版；四段原声的随机轮换逻辑不变。
