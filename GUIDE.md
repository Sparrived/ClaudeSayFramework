# ClaudeSay 视频制作指南

一支 ClaudeSay 视频就是一个网页：Claude Code 的橙色像素小人 **Clawd** 站在终端的输入框上，用讲解气泡说台词（没有配音），
台词、画面、音效、配乐全部排在**同一条 GSAP 时间轴**上。网页里可以拖进度条预览；导出时无头浏览器逐帧 seek + 截图，FFmpeg 编成 MP4。

这份指南是框架的一部分（`npm run engine` 会同步它），写新片、改引擎之前先读一遍。

---

## 0. 先读这一段：引擎是起点，不是终点

框架省掉的只是“每期都要重搭一遍”的部分：时间轴和导出、Clawd 和终端界面、气泡和配乐、片头片尾，再加上前两期攒下来的一些图元。
它**不规定**一期视频该长什么样，更不应该让新片变得千篇一律、越做越省事也越做越像。

- **画面从题目里长出来。** 写场景之前，先想清楚“这个概念用什么画面讲最直观、最有意思”，再去引擎里找零件；没有合适的，就为这一期专门做。
  不要为了用上现成的组件，把内容硬塞进去；也不要照搬示例片的四章结构、版式和节奏——示例片只是演示 API 怎么调用。
- **每一期都该有只属于它的画面。** 前两期最出彩的画面，引擎里原本都没有，全是为题目专门做的：
  RNN 逐词展开、正弦位置编码的波形、BERT 与 GPT 分家（Transformer）；四张真算出来的注意力热力图对上公式、
  Frobenius 内积的几何读数、蒙特卡洛直方图里方差的收拢（MixA）。新片也应该有这样的画面。
- **引擎要越用越丰富。** 鼓励每一期都给引擎添东西：新的图元和可视化、新的动画手法、Clawd 的新表情 / 动作 / 道具、
  新的音效和配器、新的成套画面、新的版式。只要能按时间轴的当前时刻画出来（`d.hook`），新技术也可以引进来：Canvas、WebGL / 3D、物理模拟（可以像 MixA 那期的蒙特卡洛一样，先用脚本算好结果再画）……
  做法：先在 `src/video/` 里做出来；觉得别的题目也用得上，就整理成通用的接口搬进 `src/engine/`，用 `npm run engine -- push` 还给框架（第 9 节），
  下一期就能直接用。引擎现有的功能不好用、不好看，也可以改，改完让示例片和其他项目 pull 之后照样能跑就行。
- **需要守住的只有两样。** 一是第 3 节的技术规矩（一切排在可以 seek 的时间轴上、结果确定可复现——拖进度条和逐帧导出都靠它）；
  二是系列感（Clawd 和终端界面的样子，敲 `claude` 开场、`/exit` 收尾的套路；套路里面的内容每期都可以不一样）。
  除此之外，版式、颜色的含义、节奏、画面风格，都可以按题目重新设计。

## 1. 目录

```
src/
├── main.ts / cover.ts      入口：把 src/video 交给引擎（不用改）
├── engine/                 引擎：所有片子共用的部分。欢迎给它添功能（第 0 节）；只和这一期有关的东西别放进来，通用的改进还给框架（第 9 节）
│   ├── boot.ts             启动：搭舞台和演员 → 按顺序执行场景 → 配乐 → 播放器 / 导出模式
│   ├── director.ts         导演：时间游标 d.t、chapter / say / beat / end / cue / hook
│   ├── layout.ts           舞台坐标常数（1920×1080）
│   ├── types.ts            VideoConfig、Scene
│   ├── clawd/              Clawd 的精灵图和动作
│   ├── ui/                 讲解气泡（bubble）、终端界面（terminal）、ANSI Shadow 大字（banner）
│   ├── audio/              音效（sfx）、配乐（score，含配器预设 MOOD）、WAV 编码
│   ├── lib/                dom · colors · viz · tex · heat · chart · panel · blocks · linalg（见第 5 节）
│   ├── kit/                成套画面：片头 opening、片名卡 titleCard、片尾 ending、论文首页 paperPage
│   ├── cover/              封面
│   └── player.ts           网页播放器（进度条、章节、快捷键）
└── video/                  这一期的内容
    ├── config.ts           片名、导出文件名、进度标尺、配乐编排、封面
    └── scenes/             一章一个 .ts（+ 同名 .css），index.ts 按播放顺序登记
scripts/                    render · audio · snap · sheet · score-report · cover · engine（new 只在框架里有）
```

## 2. 开一期新片

1. 在框架目录里：`npm run new -- ClaudeSayXxx --title "片名" --slug clawd-xxx`。
   新项目建在框架旁边（`../ClaudeSayXxx`），装好依赖，自带一支约 90 秒的示例片，`npm run dev` 就能看。
2. 改 `src/video/config.ts`：片名、slug、进度标尺的各站、配乐编排、封面文字。
3. 先为题目设计画面（第 0 节），再把 `src/video/scenes/` 里的示例章节换成自己的：**第一章用 `opening()` 开头，最后一章用 `ending()` 收尾**，
   中间每章用 `d.chapter()` 开头。示例片的四章（intro / timeline / math / outro）只是 API 写法的范本，不是新片的结构或版式；
   前两期的完整场景在 `../ClaudeSayTransformer`（科普，13 章）和 `../ClaudeSayPaper`（论文精读，数学可视化），可以看看它们怎样为题目专门造画面。
4. 边写边看：`npm run dev`（URL 加 `?ch=章节id` 直接跳到那一章）；`npm run snap` 截图核对版面；`npm run typecheck`。
5. 收尾：`npm run score`（配乐自检）→ `npm run render`（成片）→ `npm run cover`（封面）→ 补 README 的章节表。
6. 回顾这一期新做的画面和工具：别的题目也用得上的，整理进 `src/engine/`，`npm run engine -- push` 还给框架（第 9 节）。

## 3. 一章怎么写

```ts
import './bottleneck.css'
import type { Director } from '../../engine/director'
import { hide } from '../../engine/lib/dom'
import { chip, fadeIn, popIn } from '../../engine/lib/viz'

export function bottleneck(d: Director) {
  const { tl, clawd, sfx } = d
  const L = d.layer('bottleneck') // 本章图层：先隐藏，chapter() 的提问结束后显示

  // ① 构建：本章要用的元素全部建好、定位、隐藏（这时候还没有“时间”）
  const q = chip(L, 'Query', 640, 400, { cls: 'mono' })
  const k = chip(L, 'Key', 1280, 400, { cls: 'mono' })
  hide(q, k)

  // ② 开章：观众提问 → Claude Code 式的思考动画 →（可选）ANSI Shadow 大字
  d.chapter({ id: 'bottleneck', title: '瓶颈', step: '瓶颈', question: '为什么这么慢？', verb: 'Profiling', layer: L })

  // ③ 一句一句排：画面写在 say 的回调里，用 w('词') 踩在台词的字上
  d.say('每个 {q:Query} 都要和每个 {k:Key} 比一遍。', (t, w) => {
    popIn(tl, q, w('Query'))
    popIn(tl, k, w('Key'))
    sfx.at(w('Key'), 'pop')
  })
  d.say('长度翻一倍，计算量就翻四倍。', (t) => {
    clawd.prop(tl, 'sweat', t + 1.2, 2)
  }, { min: 4 })
  d.end(L) // 收起气泡，图层淡出
}
```

写完在 `scenes/index.ts` 的 `SCENES` 里按顺序登记。

### 时间怎么走

- `d.t` 是时间游标。`d.chapter()`、`d.say()`、`d.beat()` 各自把游标往后推，所以场景代码按播放顺序写就行。
- `d.say(text, fn?, opts?)`：一句台词 = 逐字打出来的时间 + 停留时间（按字数算）。`fn(t, w)` 在这句开始时被调用：
  `t` 是开始时刻，`w('某个词')` 是这个词开始被打出来的时刻（找不到这个词会报错，改台词时能发现画面没跟上）。
  - `{ min: 秒 }`：这句至少持续多久。画面动画比台词长时一定要给，不然下一句的画面会和它抢时间。
  - `{ hold }` 停留时间、`{ after }` 句后空白、`{ talk: false }` Clawd 不摆手（要挥手 / 举手时用）。
- `d.beat(dur, fn?)`：不说话，只放画面。
- `d.chapter({...})` 带 `banner` 时，大字在舞台正中停留约 1 秒；之后第一句的前 0.9 秒画面中央还被大字占着，
  中央的画面从 `Math.max(t + 0.9, w('…'))` 开始。
- `d.cue(name, t?)`：给某个时刻起名字，配乐的拆分和铃音靠它对准画面。片头片尾自带 `hop`、`title`、`land`。
- `d.hook(draw)`：重绘钩子，见下面的规矩 6。

### 必须守的规矩（不守的话，拖进度条或逐帧导出时画面会错）

1. **一切动画都排在 `d.tl` 上**，用绝对时刻定位。不要用 `setTimeout`、`requestAnimationFrame`、CSS transition / animation。
2. 瞬间的变化用 `set(tl, el, vars, t)`（`lib/dom`，自带 `immediateRender: false`）；时间轴里的 `fromTo` 一律加 `immediateRender: false`。
3. 初始状态在构建时设好：`hide(...)`、`gsap.set(...)`，不要写进时间轴。
4. 用 CSS `translate: -50% -50%` 居中、之后又要补间 x / y 的元素，插进页面后过一遍 `pin(el)`（`fadeIn` 会自动做）。
   否则 GSAP 认不出带小数的尺寸，补间 y 会让元素下沉半个高度。
5. 同一个元素的同一个属性，两段补间不要在时间上重叠（重叠时后渲染的会盖掉前一个的收尾）。
6. **由数算出来的图**（旋转的向量、实时读数、随参数变化的柱子）：把数放进普通对象交给 GSAP 补间，
   用 `d.hook(() => { 按当前的数重画 })` 画图。GSAP 在 seek 时不触发 `onUpdate`，不能靠它。示例片 math 章的温度 τ 就是这么做的。
7. 随机数一律带种子：`rand(seed)`（`lib/dom`）、`rng` / `gauss` / `randn`（`lib/linalg`）。不要用 `Math.random()`。
8. 随时间换文字：`set(tl, el, { text: '0.10' }, t)`（TextPlugin，往回拖能还原，`'0.0'` 这种字符串原样保留）；
   数字滚动用 `countTo`。不要用 `textContent` 换数字字符串（GSAP 会把 `'0.0'` 当成数字 0 写回去）。
9. 构建时别依赖文字宽度（中文字体是按需加载的子集，构建时可能还没到）；居中交给 CSS translate。
10. 每章的 CSS 放在同名 `.css` 里，选择器前面加 `.scene-<章节id>`，类名带本章前缀（`tl-`、`ma-`…），免得串味。
11. 一种颜色在一期里只表示一种东西：台词标记、公式宏、画面颜色三处一致（在 `config.ts` 的 `SEM` 里写清楚）。

## 4. 舞台和台词

### 舞台坐标（`engine/layout.ts`）

| 区域 | 位置 |
| :--- | :--- |
| 舞台 | 1920 × 1080，所有坐标都是舞台像素 |
| 顶部进度标尺 | y = 46（`RULER_Y`） |
| 对话记录里的问题 “> …” | y = 92（`HEADING_Y`） |
| **画面可用区域** | x 64–1856，y 150–760（`STAGE`，中心 `STAGE_CX` = 960、`STAGE_CY` = 455） |
| 讲解气泡 | x 344–1856，y 786–920（`BUBBLE`） |
| 输入框 / Clawd 的家 | 输入框 y 934–1000；Clawd 脚底中心在 (196, 934)（`CLAWD_HOME`） |

### 台词

- 一句台词最多两行（一行约 35 个汉字宽，超过一行会在最靠近中间的标点处断开）；20–35 个字最舒服。
- 英文和数字自动换成等宽字体。标点后会停顿一下，像在说话。
- 着色标记 `{代号:文字}`（台词、提问、`rich()` 都认）：

| 标记 | 颜色 | 标记 | 颜色 |
| :--- | :--- | :--- | :--- |
| `{o:…}` | Clawd 橙 | `{pink:…}` | 粉 |
| `{q:…}` | 淡紫蓝 | `{purple:…}` | 紫 |
| `{k:…}` | 绿 | `{blue:…}` | 蓝 |
| `{v:…}` | 琥珀 | `{teal:…}` | 青 |
| `{r:…}` | 红（警示） | `{d:…}` | 灰（注释） |
| `{b:…}` | 加粗 | | |

  一期里有固定含义的颜色可以加自己的代号：在 CSS 里写 `.seg-g { color: var(--pink); }`，台词里就能用 `{g:梯度}`。
- 语速整体偏快 / 偏慢：`config.ts` 里的 `tempo`（> 1 变慢）。

## 5. 工具箱速查

**成套画面（`engine/kit`）**

| 函数 | 用途 |
| :--- | :--- |
| `opening(d, { cwd, question, verb?, model?, step? })` | 系列片头（约 7 秒，cue `hop`）。必须是第一个场景的第一步，返回开场图层 |
| `titleCard(d, layer, { word, sub?, cell? })` | 片名卡：`.reveal(t)` 扫出大字（cue `title`）、`.hide(t)` 收起。`word` 只能是英文 / 数字 |
| `ending(d, layer, { cwd, thanks?, cite?, clear? })` | 系列片尾：`/exit` → Clawd 跳到中央（cue `land`）→ 片尾卡。必须是最后一步 |
| `paperPage(parent, { x, y, w?, h?, stamp?, title, authors, affil?, abstract?, colors? })` | 论文首页。标题 / 摘要里用 `[[…]]` 圈出的短语可以用 `sweep(tl, page.marks[i], t)` 荧光笔扫亮 |

**画面（`engine/lib`）**

| 模块 | 函数 |
| :--- | :--- |
| `dom` | `h` 建元素 · `s` 建 SVG · `at` 定位 · `set` 时间轴上的瞬间设置 · `hide` · `pin` · `rand` |
| `viz` | `fx` 铺满舞台的 SVG · `chip` 词块 · `box` 方框 · `label` 文字 · `arrow` / `drawArrow` / `hideArrow` · `popIn` · `fadeIn` · `fadeOut` · `countTo` 数字滚动 · `typeText` 逐字打出 · `chipRow` 一排词块 |
| `tex` | `formula(parent, tex, x, y, { size })` 放公式 · `\hl{名字}{…}` + `part(el, 名字)` 取出一段 · `glow` / `unglow` 高亮 · `texColor('\\cG', C.pink)` 注册颜色宏。内置 `\cO \cQ \cK \cV \cR \cP \cU \cB \cT \cM` |
| `heat` | `heatmap` 热力图（可写数字，亮格子自动用深色字）· `paint` 补间到新矩阵 · `revealHeat` · `hideHeat` |
| `chart` | `plot` 坐标系（D3 比例尺）· `line` / `drawLine` · `marks` · `vbars` / `growBars` / `setBars` · `histBars` · `hbar` / `growH` · `curvePath` · `showPlot` |
| `panel` | `panel` 终端风格面板（标题嵌在边框上）· `table` 数据表 |
| `blocks` | `mblock` 矩阵“形状块”（N×d 之类） |
| `linalg` | `rng` · `gauss` · `randn` · `matmul` · `transpose` · `softmaxRows` · `relu` · `frob` · `norm` · `trace` · `mean` · `std` · `histogram`… |
| `colors` | `C`（颜色名，和 CSS 变量 `--clawd`、`--q`… 对应）· `mix` · `rgba` · `diverge` / `diverge2` 发散色带 · `heat` 顺序色带 |

**演员**

- Clawd（`d.clawd`）：`look(tl, 'l'|'r'|'u'|'d'|'c', t)` · `face(tl, 'normal'|'happy'|'wide'|'closed', t)` ·
  `prop(tl, 'sweat'|'bang'|'ask'|'heart'|'note', t, dur)` · `wave` · `cheer` · `talk` · `bounce` · `shake` · `blink` ·
  `hopTo(tl, x, y, t, { dur, height, scale })` · `walkTo` · `place` · `show`。呼吸和眨眼是自动的。
  每个动作都在时刻 t 往时间轴里加补间，并返回动作结束的时刻；同一只 Clawd 的动作按时间先后调用。
- 终端（`d.term`）：`ask` 提问 · `think` 思考动画 · `heading` / `clearHeading` 顶部的问题 · `step` 进度标尺 · `footer` 右下角章节名。
- 音效（`d.sfx.at(t, kind)`）：`blip` `key` `enter` `pop` `thud` `whoosh` `ding` `tick`。台词的“哔哔”声和打字声是自动的。

## 6. 配乐

全部用 Web Audio 现场合成，没有采样，没有版权问题。曲子跟着章节走：每章（段落）换一套配器，章节开头正好落在小节线上。
在 `config.ts` 的 `music` 里编排：

```ts
music: {
  moods: { 'intro-a': MOOD.calm, 'intro-b': MOOD.welcome, bottleneck: MOOD.tension, method: { ...MOOD.arrival, boom: true }, ... },
  splits: { intro: ['hop', 'intro-a', 'intro-b'], outro: ['land', 'outro-a', 'outro-b'] }, // 章节 → [cue, 前半段, 后半段]
  sparkles: { title: 0.8 },                                                                // 这些 cue 上加一串上行的铃音
}
```

配器预设（`engine/audio/score.ts` 的 `MOOD`，都来自前两期）：

| 预设 | 情绪 | 预设 | 情绪 |
| :--- | :--- | :--- | :--- |
| `calm` | 开场铺底（Clawd 落地前） | `build` | 搭积木，拼成完整结构 |
| `welcome` | 开场（落地后） | `buildup` | 一路蓄力，后面接 `drop` |
| `nostalgia` | 怀旧：历史、旧方法 | `drop` | 蓄力后爆发（带 boom） |
| `tension` | 小调：问题、瓶颈 | `climax` | 最热闹：实验结果（带 boom） |
| `unrest` | 小调带踩镲：“出事了” | `sparkle` | 铃音闪烁：列举 |
| `rise` | 转机、找到出路 | `light` | 轻快（默认 fallback） |
| `arrival` | 鼓点第一次进来：主角登场 | `windDown` | 总结前半段，渐渐收拢 |
| `groove` | 稳定律动：核心原理 | `final` | 落在 C 和弦：片尾卡 |
| `think` | ii–V–I：推导、细节 | | |

改完跑 `npm run score`：打印每段的小节、BPM、和弦、乐器，并检查音符表（编排里写错的 cue / 段落名也会列出来）。
开发时这些警告同时打印在浏览器控制台（`[配乐]`）。

## 7. 命令

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 开发服务器 + 播放器。`?ch=章节id` / `?t=秒` 跳转，`?music=0` 关配乐 |
| `npm run typecheck` | 类型检查 |
| `npm run snap -- 12.5 ch:math+3` | 截图到 `shots/`（按秒，或按章节 + 偏移）；不给时刻就只打印章节表。自己起临时服务器 |
| `npm run sheet` | `shots/` 里的截图每 4 张拼一张总览 |
| `npm run score` | 配乐结构报告与自检 |
| `npm run render` | 导出 `out/<slug>.mp4`（30fps，6 段并行）。`--fps 60` `--workers 8` `--from 120 --to 150 --out out/part.mp4` `--mute` `--keep-parts` |
| `npm run audio` | 只重做音轨、重新封装（视频时长和当前动画对不上会拒绝）。`--wav out/a.wav --only music` 只导出 WAV |
| `npm run cover` | 导出封面：`out/cover-4x3.png`（1920×1440，B 站投稿上传用）、`out/cover-16x10.png`（1920×1200）、`out/cover-16x9.png`（1920×1080） |
| `npm run engine` | 和框架对比引擎文件；`-- diff` / `-- pull` / `-- push` |
| `npm run new -- <目录>` | （只在框架里）开一个新的视频项目 |

场景构建出错时，`render` / `audio` 会列出错误并中止（`--force` 硬导出）；开发时错误只影响那一章，其他章照常排。

导出依赖：Node 18+、PATH 里的 `ffmpeg` / `ffprobe`、本机的 Edge 或 Chrome（找不到就用环境变量 `BROWSER` 指定路径）。

## 8. 踩过的坑

- **无头 Edge 自己重新拉起**：新版 Edge 启动后可能立刻以 0 退出、换个进程继续跑，`puppeteer.launch` 会误报
  “Failed to launch the browser process: Code: 0”。`scripts/browser.mjs` 改成自己启动浏览器、固定调试端口、`puppeteer.connect`。
  清理残留的无头浏览器时，只杀命令行里带 `clawd-render-` 的进程，别碰用户自己开着的 Edge。
- **同一个浏览器开多个标签页并行截图会被后台节流**（实测直接卡死），所以并行导出是每段一个独立浏览器进程。
- **字体**：中文字体按 unicode-range 切成上百个子集。导出模式会先把全片用到的字都加载完（字体屏障）再截图，否则每段开头会闪一下回退字体。
- **章节大字和片名卡**用 figlet 的 ANSI Shadow 字体，只能写英文、数字和常用符号。
- **`/exit` 的标题淡入淡出不能重叠**，否则 “> /exit” 会一直留在片尾卡上（`ending()` 已经处理好）。
- **离线渲染音轨**按时间窗分块，窗口起点要落在 128 帧的 render quantum 边界上，回声不能接成反馈环（细节见 `sfx.ts`、`score.ts` 的注释）。
- **封面**：三种比例都不靠缩放得到（字符画的方块之间会出现细缝），宽度固定 1920，只改画布高度、把内容上下平移；
  16:10 版底部约 16% 会被 B 站卡片的播放数据盖住，不放关键内容。
  4:3 版就是 16:9 版上下各加 180px 的边：据 UP 主的经验帖，B 站 2023 年底起投稿封面改成 4:3，手机首页按 4:3 显示，
  其他页面再从中裁出 16:9 / 16:10，所以关键内容必须全在中间的 16:9 范围里（这样裁出来的正好就是 16:9 版）。
  这是经验不是官方说明，上传时以投稿页的裁剪预览为准。
  Clawd 只举右手（保住“两侧各一个小突起”的轮廓）；副题太长时会自动缩小，不会撞上 Clawd。

## 9. 引擎的同步

每个视频项目里都有一份完整的引擎拷贝（项目自己能跑、能单独发布）。属于引擎的是：
`src/engine/`、`src/main.ts`、`src/cover.ts`、`scripts/`、`index.html`、`cover.html`、`tsconfig.json`、`public/clawd.svg`、`GUIDE.md`、`.gitignore`、`.gitattributes`。
`src/video/`、`package.json`、`vite.config.ts`、README、CLAUDE.md 是每个项目自己的，永远不同步。

- `npm run engine`：列出和框架不一样的文件（框架位置记在 `package.json` 的 `claudeSay.framework`）。
- `npm run engine -- pull`：框架有更新，拿过来。只覆盖有差异的文件，不删除任何文件。
- `npm run engine -- push`：这一期给引擎做了**通用的**改进（新的图元、新的动画手法、修了 bug），还给框架。每一期都应该有东西可以还回去（第 0 节）。
  只和这一期内容有关的东西（专用的颜色、只讲这个题目的组件）留在 `src/video/` 里，不要放进引擎。
- push 之后回到框架目录检查一遍：`npm run typecheck`、`npm run score`、`npm run snap` 看几个时刻；
  新功能最好在框架的示例片里用一次，示例片同时是引擎的回归测试。引擎用到新的依赖时，两边的 `package.json` 都要加。

## 10. 发布（系列的约定）

- 系列：科普向的叫【小克学AI】（Transformer 的前世今生），论文精读叫【小克读论文】（MixA）。封面左上角的标签就是系列名。
- 前两期的简介按 B 站的格式写（时间戳、`#话题#`），结构：钩子 → 本期内容 → 章节时间戳 → 关于这支视频 → 延伸阅读 → 系列一句话 → 话题标签。
- 固定保留三条声明：含 AI 生成内容；图中数据为示意（真实数字取自公开论文）；Clawd 是按终端图案重绘的二次创作，与 Anthropic 官方无关。
- 参考文献的 arXiv 编号写之前先核对。简介里不要用“他 / 她”指代小克，直接写“小克”。
- 封面：B 站投稿上传 `out/cover-4x3.png`，再看一眼投稿页的裁剪预览（第 8 节）；其他平台按需要用 16:10 / 16:9 版。
