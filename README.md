# ClaudeSay Framework

<div align="center">

![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.15-88CE02?style=flat-square&logo=greensock&logoColor=white)
![KaTeX](https://img.shields.io/badge/KaTeX-Math-007A78?style=flat-square)
![D3](https://img.shields.io/badge/D3-7.9-F9A03C?style=flat-square&logo=d3dotjs&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-Core-40B5A4?style=flat-square&logo=puppeteer&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)

**用纯代码拍讲解动画的框架**
Claude Code 的橙色像素小人 **Clawd** 当讲解员：台词、画面、配乐、导出全部由代码完成。

</div>

从《Transformer 的前世今生》（[claude-say-transformer](https://github.com/Sparrived/claude-say-transformer)）和 MixA 论文精读（ClaudeSayPaper）
两期视频里抽出来的通用部分：导演时间轴、Clawd、Claude Code 终端界面、片头片尾、公式 / 热力图 / 坐标图、Web Audio 配乐、
并行逐帧导出、封面。开新的一期只需要一条命令，然后专心写台词和画面。

---

## 开一期新片

```bash
npm install                 # 第一次用框架时
npm run new -- ClaudeSayResNet --title "ResNet 为什么要走捷径" --slug clawd-resnet
```

在框架旁边生成 `../ClaudeSayResNet`：引擎、脚本、一支可以直接播放的示例片都在里面，依赖也装好了。接下来：

1. 改 `src/video/config.ts`：片名、导出文件名、进度标尺、配乐编排、封面文字；
2. 把 `src/video/scenes/` 里的示例章节换成自己的；
3. `npm run dev` 边写边看，`npm run render` 导出成片，`npm run cover` 导出封面。

写法、API、规矩和踩过的坑都在 **[GUIDE.md](GUIDE.md)**。

> **引擎是起点，不是终点。** 框架只省掉每期都要重搭的部分，不规定一期视频该长什么样：
> 每一期都应该为题目专门设计画面，引擎里没有的就自己做；做出来的通用零件再还给框架，让引擎越用越丰富（[GUIDE.md](GUIDE.md) 第 0 节）。

## 示例片

![示例片分镜总览](shots/sheet-01.png)

框架自带一支约 90 秒的示例片（`src/video/`），把框架的功能都用了一遍，也是新项目的起点：

| 章节 | 演示的功能 |
| :--- | :--- |
| 开场 | 系列片头 `opening()`（敲下 claude、欢迎框、Clawd 跳出来）、片名卡 `titleCard()` |
| 一条时间轴 | 章节大字、`d.say()` 的逐词对时 `w('…')`、词块 / 箭头 / 数字滚动 |
| 公式与图表 | 论文首页 + 荧光笔、KaTeX 公式分段高亮、真算出来的热力图、D3 坐标图 + 一笔画出的曲线、重绘钩子（拖进度条也能还原的实时读数） |
| 开新的一期 | 终端面板、逐字打出命令、系列片尾 `ending()` |

```bash
npm run dev        # http://localhost:5170
npm run render     # → out/clawd-demo.mp4
```

播放器快捷键：`空格` 播放/暂停，`←/→` 切换章节，`Shift + ←/→` 快退/快进 5 秒，`M` 静音，`F` 全屏。

## 结构

```
src/
├── engine/          引擎：所有片子共用（导演、Clawd、终端界面、气泡、配乐、播放器、成套画面、可视化工具箱）
├── video/           这一期的内容：config.ts + scenes/
├── main.ts          入口：boot(VIDEO, SCENES)
└── cover.ts         封面入口
scripts/
├── new.mjs          开新片（只在框架里有）
├── engine.mjs       视频项目和框架之间同步引擎（status / diff / pull / push）
├── render.mjs       并行逐帧导出 MP4
├── audio.mjs        只重做音轨
├── snap.mjs · sheet.mjs · score-report.mjs · cover.mjs
└── browser.mjs · common.mjs
```

每个视频项目里都有一份完整的引擎拷贝，所以项目能单独运行、单独发布；某一期给引擎做了通用的改进，
用 `npm run engine -- push` 还给框架，其他项目再 `pull` 过去。

## 环境

- Node.js 18+（开发时用的是 24）
- FFmpeg（`ffmpeg`、`ffprobe` 在 PATH 里）
- 本机的 Edge 或 Chrome（导出、截图用；找不到时用环境变量 `BROWSER` 指定路径）

## 致谢

- Clawd 与 Claude Code 终端风格致敬 Anthropic；本项目与 Anthropic 官方无关。

## 许可证

[MIT](LICENSE)
