# ClaudeSay 视频制作指南

一支 ClaudeSay 视频就是一个网页：像素小人讲解员站在输入框上，用讲解气泡说台词（没有配音），
台词、画面、音效、配乐全部排在**同一条 GSAP 时间轴**上。网页里可以拖进度条预览；导出时无头浏览器逐帧 seek + 截图，FFmpeg 编成 MP4。

框架里有两个系列（主题，第 5 节「主题」）：

| 系列 | 讲解员 | 外壳 | 片头 / 片尾 | 用来讲 |
| :--- | :--- | :--- | :--- | :--- |
| Claude 系列（`CLAUDE`，默认） | Claude Code 的橙色像素小人 **Clawd** | 深色 Claude Code 终端 | 敲 `claude` 开场、`/exit` 收尾 | 进阶知识（小克学AI / 小克读论文） |
| DS 系列（`DEEPSEEK`） | DeepSeek 的拟人形象 **小鲸**（多色像素画） | 亮色对话页（致敬 DeepSeek 网页版） | 首页鲸鱼图标里蹦出小鲸、发一句谢谢回到首页 | 科普百科 |

这份指南是框架的一部分（`npm run engine` 会同步它），写新片、改引擎之前先读一遍。

---

## 0. 先读这一段：引擎是起点，不是终点

框架省掉的只是“每期都要重搭一遍”的部分：时间轴和导出、讲解员和外壳（终端 / 对话页）、气泡和配乐、片头片尾，再加上前两期攒下来的一些图元。
它**不规定**一期视频该长什么样，更不应该让新片变得千篇一律、越做越省事也越做越像。

- **画面从题目里长出来。** 写场景之前，先想清楚“这个概念用什么画面讲最直观、最有意思”，再去引擎里找零件；没有合适的，就为这一期专门做。
  不要为了用上现成的组件，把内容硬塞进去；也不要照搬示例片的四章结构、版式和节奏——示例片只是演示 API 怎么调用。
- **每一期都该有只属于它的画面。** 前两期最出彩的画面，引擎里原本都没有，全是为题目专门做的：
  RNN 逐词展开、正弦位置编码的波形、BERT 与 GPT 分家（Transformer）；四张真算出来的注意力热力图对上公式、
  Frobenius 内积的几何读数、蒙特卡洛直方图里方差的收拢（MixA）。新片也应该有这样的画面。
- **引擎要越用越丰富。** 鼓励每一期都给引擎添东西：新的图元和可视化、新的动画手法、演员（Clawd、小鲸）的新表情 / 动作 / 道具、新的角色、
  新的音效和配器、新的成套画面、新的版式。只要能按时间轴的当前时刻画出来（`d.hook`），新技术也可以引进来：Canvas、WebGL / 3D、物理模拟（可以像 MixA 那期的蒙特卡洛一样，先用脚本算好结果再画）……
  做法：先在 `src/video/` 里做出来；觉得别的题目也用得上，就整理成通用的接口搬进 `src/engine/`，用 `npm run engine -- push` 还给框架（开 PR 等人工审阅合并，第 9 节），
  合并之后下一期就能直接用。引擎现有的功能不好用、不好看，也可以改，改完让示例片和其他项目 pull 之后照样能跑就行。
- **需要守住的只有两样。** 一是第 3 节的技术规矩（一切排在可以 seek 的时间轴上、结果确定可复现——拖进度条和逐帧导出都靠它）；
  二是系列感（讲解员和外壳的样子、片头片尾的套路：Claude 系列敲 `claude` 开场、`/exit` 收尾，DS 系列从对话页首页开场、发一句谢谢回到首页；套路里面的内容每期都可以不一样）。
  除此之外，版式、颜色的含义、节奏、画面风格，都可以按题目重新设计。

## 1. 目录

```
src/
├── main.ts / cover.ts      入口：把 src/video 交给引擎（不用改）
├── engine/                 引擎：所有片子共用的部分。欢迎给它添功能（第 0 节）；只和这一期有关的东西别放进来，通用的改进还给框架（第 9 节）
│   ├── boot.ts             启动：搭舞台和演员 → 按顺序执行场景 → 配乐 → 播放器 / 导出模式
│   ├── director.ts         导演：时间游标 d.t、chapter / say / beat / end / cue / hook
│   ├── layout.ts           舞台坐标常数（1920×1080）
│   ├── types.ts            VideoConfig、Scene、defineVideo
│   ├── themes.ts           主题：CLAUDE / DEEPSEEK（讲解员 + 外壳 + 配色），applyTheme
│   ├── actors/             演员：Actor 基类、像素画工具 pixel、Clawd、小鲸 Whale（点阵在 whale-art.ts）
│   ├── ui/                 讲解气泡（bubble）、外壳接口（shell）：终端（terminal）/ 对话页（chat）、进度标尺（ruler）、ANSI Shadow 大字（banner）
│   ├── audio/              音效（sfx）、配乐（score，含配器预设 MOOD）、WAV 编码
│   ├── lib/                dom · colors · viz · tex · heat · chart · panel · blocks · linalg · noise · canvas（见第 5 节）
│   ├── kit/                成套画面：片头片尾 opening / ending（终端）、chatOpening / chatEnding（对话页），片名卡 titleCard、论文首页 paperPage、全幅图版 plate、出处角标 Sources
│   ├── cover/              封面
│   └── player.ts           网页播放器（进度条、章节、快捷键）
├── video/                  这一期的内容
│   ├── config.ts           片名、导出文件名、主题、进度标尺、配乐编排、封面
│   └── scenes/             一章一个 .ts（+ 同名 .css），index.ts 按播放顺序登记
└── video-deepseek/         （只在框架里有）DS 系列的示例片：DEMO=deepseek 预览，npm run new --theme deepseek 时拷成新项目的 video/
scripts/                    render · audio · snap · sheet · score-report · cover · engine（new 只在框架里有）
```

## 2. 开一期新片

1. 在框架目录里：`npm run new -- ClaudeSayXxx --title "片名" --slug clawd-xxx`（Claude 系列），
   或者 `npm run new -- WhaleSayXxx --theme deepseek --title "片名"`（DS 系列，导出名默认 `whale-xxx`）。
   新项目建在框架旁边（`../ClaudeSayXxx`），装好依赖，自带这个系列的示例片（Claude 约 110 秒，DS 约 65 秒），`npm run dev` 就能看。
2. 改 `src/video/config.ts`：片名、slug、进度标尺的各站、配乐编排、封面文字（主题 `theme` 已经按系列写好）。
3. 先为题目设计画面（第 0 节），再把 `src/video/scenes/` 里的示例章节换成自己的：**第一章用 `opening()`（DS 系列 `chatOpening()`）开头，
   最后一章用 `ending()`（DS 系列 `chatEnding()`）收尾**，中间每章用 `d.chapter()` 开头。
   示例片的章节（Claude：intro / cast / timeline / math / outro；DS：intro / sky / outro）只是 API 写法的范本，不是新片的结构或版式；
   前两期的完整场景在 `../ClaudeSayTransformer`（科普，13 章）和 `../ClaudeSayPaper`（论文精读，数学可视化），可以看看它们怎样为题目专门造画面。
4. 边写边看：`npm run dev`（URL 加 `?ch=章节id` 直接跳到那一章）；`npm run snap` 截图核对版面——写完一章先拍一张总览
   `npm run snap -- --chapter <章节id> --n 12`，几秒钟看完整章的走向，有问题的格子再按格子上的 `<章节id>+秒` 截全尺寸；`npm run typecheck`。
5. 收尾：`npm run score`（配乐自检）→ `npm run render`（成片）→ `npm run cover`（封面）→ 补 README 的章节表。
6. 回顾这一期新做的画面和工具：别的题目也用得上的，整理进 `src/engine/`，`npm run engine -- push` 还给框架——push 会开一个 PR 等人工审阅合并（第 9 节）。

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

  // ② 开章：观众提问 → 思考动画（终端：Claude Code 式的动词；对话页：深度思考里的心里话 thought）→（可选）ANSI Shadow 大字
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
  - `{ hold }` 停留时间、`{ after }` 句后空白、`{ talk: false }` 不配说话的小动作（Clawd 摆手、小鲸张嘴；要挥手 / 举手时用）。
  - `{ by: 演员 }`：这句由谁来说（默认讲解员）。说话人不是讲解员时，气泡边框换成他的颜色、左上角嵌一个名牌、尾巴藏起来。见第 5 节「多个演员同台」。
- `d.beat(dur, fn?)`：不说话，只放画面。
- `d.chapter({...})` 带 `banner` 时，大字在舞台正中停留约 1 秒；之后第一句的前 0.9 秒画面中央还被大字占着，
  中央的画面从 `Math.max(t + 0.9, w('…'))` 开始。
- `d.cue(name, t?)`：给某个时刻起名字，配乐的拆分和铃音靠它对准画面。`opening` / `chatOpening` 自带 `hop`，`ending` / `chatEnding` 自带 `land`；`title` 由 `titleCard.reveal()` 发出。自己用 `createBanner` / `revealBanner` 做片名时，在片名完全出现的时刻手动 `d.cue('title', shown)`，否则 `music.sparkles.title` 会找不到 cue。
- `d.hook(draw)`：重绘钩子，见下面的规矩 6。
- `d.canvas(layer, (ctx, t) => …, { top? })`：在图层里铺一张 1920×1080 的 Canvas，每次 seek / 播放推进后按当前时刻 `t` 重画，见下面的规矩 16。

### 必须守的规矩（不守的话，拖进度条或逐帧导出时画面会错）

1. **一切动画都排在 `d.tl` 上**，用绝对时刻定位。不要用 `setTimeout`、`requestAnimationFrame`、CSS transition / animation。
2. 瞬间的变化用 `set(tl, el, vars, t)`（`lib/dom`，自带 `immediateRender: false`）；时间轴里的 `fromTo` 一律加 `immediateRender: false`。
3. 初始状态在构建时设好：`hide(...)`、`gsap.set(...)`，不要写进时间轴。
4. 用 CSS `translate: -50% -50%` 居中、之后又要补间 x / y 的元素，插进页面后过一遍 `pin(el)`（`fadeIn` 会自动做）。
   否则 GSAP 认不出带小数的尺寸，补间 y 会让元素下沉半个高度。
5. 同一个元素的同一个属性，两段补间不要在时间上重叠（重叠时后渲染的会盖掉前一个的收尾）。
6. **由数算出来的图**（旋转的向量、实时读数、随参数变化的柱子）：把数放进普通对象交给 GSAP 补间，
   用 `d.hook(() => { 按当前的数重画 })` 画图。GSAP 在 seek 时不触发 `onUpdate`，不能靠它。示例片 math 章的温度 τ 就是这么做的。
7. 随机数一律带种子：`rand(seed)`（`lib/dom`）、`rng` / `gauss` / `randn`（`lib/linalg`）、`hash` / `noise` / `noise2` / `fbm`（`lib/noise`）。不要用 `Math.random()`。
   构建时一次性抽好的数据用 `rng`；在钩子里按时刻 `t` 现算的晃动、漂移用 `noise(t * 频率, 种子)`——同样的输入永远得到同样的值。
8. 随时间换文字：`set(tl, el, { text: '0.10' }, t)`（TextPlugin，往回拖能还原，`'0.0'` 这种字符串原样保留）；
   数字滚动用 `countTo`。不要用 `textContent` 换数字字符串（GSAP 会把 `'0.0'` 当成数字 0 写回去）。
9. 构建时别依赖文字宽度（中文字体是按需加载的子集，构建时可能还没到）；居中交给 CSS translate。
10. 每章的 CSS 放在同名 `.css` 里，选择器前面加 `.scene-<章节id>`，类名带本章前缀（`tl-`、`ma-`…），免得串味。
11. 一种颜色在一期里只表示一种东西：台词标记、公式宏、画面颜色三处一致（在 `config.ts` 的 `SEM` 里写清楚）。
12. **SVG 的 `<g>` 在构建期带 `transform` 时，先过一遍 `wrapTransform(g, transform)`**（`lib/svg`），把平移挪到内层组。否则 GSAP 补间 `autoAlpha` 会重写外层 transform，整个图层跳回原点。
13. **按时间出现的标注**：构建期只设初始态（`hide` / `gsap.set`），真正显示要排进时间轴，用 `tl.set([line, dot], { autoAlpha: 1 }, t)` 再补间；不要只 `hide()` 后在时间轴里直接补间——线、点会在片头就亮。
14. **裁切和 transform 不要挂在同一个元素上**：`clip-path` 用的是元素自己的坐标系，会跟着元素的 transform 一起动。给同一个 `<g>` 设 `clip-path`、又补间它的 `x` / `y` / `scale`，裁切框会跟着一起平移，等于没裁（表现为“门板滑出了门框”“叶片滑出了图版”）。正确做法是外层 `<g>` 只带 `clip-path`，补间内层——`plate()` 的 `clip` / `cam` 两层就是按这个结构写的。
15. **隐藏一整组时，逐个隐藏子元素，别给父级设 `autoAlpha: 0`**：父级的 `visibility: hidden` 会通过 `visibility: inherit` 传给子元素，之后再单独让某个子元素显形也不会出现（表现为“这组东西怎么都不亮”）。构建期对子元素用 `hide(...children)`，时间轴上再分别 `set` / `fadeIn` 每个子元素。
16. **Canvas 也走重绘钩子**：成百上千个粒子、光效不适合一个个建 DOM，画在 Canvas 上。Canvas 不进时间轴，所以每一帧都要按时刻**整张重画**：
    `d.canvas(L, (ctx, t) => { … })`（就是 `d.hook` 外加自动清空，`t` 取自 `d.tl.time()`）；自己用 `canvas(L)` + `d.hook` 时，在钩子里先 `clear()`、再读 `d.tl.time()`。
    画什么只能由 `t`、种子和场景里的数决定：粒子的位置写成 `t` 的函数（`hash(i)` 定起点，`noise(t * 0.2 + i)` 定漂移），不要在钩子里累加状态（“上一帧的位置 + 速度”往回拖就错了）；
    要淡入淡出、开关的量放进普通对象交给 GSAP 补间，钩子里读它（示例片 math 章的追光：`tl.to(light, { on: 1 }, t)`，钩子里 `alpha: 0.32 * light.on`）。
    图层或画布被 `autoAlpha` 藏起来时 `d.canvas` 自动跳过不画，不用为看不见的章节操心导出速度。

## 4. 舞台和台词

### 舞台坐标（`engine/layout.ts`）

| 区域 | 位置 |
| :--- | :--- |
| 舞台 | 1920 × 1080，所有坐标都是舞台像素 |
| 顶部进度标尺 | y = 46（`RULER_Y`） |
| 对话记录里的问题 | y = 92（`HEADING_Y`）。终端是左上角的 “> …”；对话页是右上角的用户气泡 |
| **画面可用区域** | x 64–1856，y 150–760（`STAGE`，中心 `STAGE_CX` = 960、`STAGE_CY` = 455） |
| 讲解气泡 | x 344–1856，y 786–920（`BUBBLE`） |
| 输入框 / 讲解员的家 | 输入框 y 934–1000；讲解员脚底中心在 (196, 934)（`HOST_HOME`）。Clawd 在家是 224×140；小鲸是 144×216，头顶到 y ≈ 718，舞台左下角那一小块会被她挡住 |

### 台词

- 一句台词最多两行（一行约 35 个汉字宽，超过一行会在最靠近中间的标点处断开）；20–35 个字最舒服。
- 英文和数字自动换成等宽字体。标点后会停顿一下，像在说话。
- 着色标记 `{代号:文字}`（台词、提问、`rich()` 都认）：

| 标记 | 颜色 | 标记 | 颜色 |
| :--- | :--- | :--- | :--- |
| `{o:…}` | 主色（Claude 系列是 Clawd 橙，DS 系列是鲸鱼蓝） | `{pink:…}` | 粉 |
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
| `opening(d, { cwd, question, verb?, model?, step? })` | Claude 系列片头（约 7 秒，cue `hop`）。必须是第一个场景的第一步，返回开场图层 |
| `ending(d, layer, { cwd, thanks?, cite?, clear? })` | Claude 系列片尾：`/exit` → Clawd 跳到中央（cue `land`）→ 片尾卡。必须是最后一步 |
| `chatOpening(d, { question, greeting?, sub?, thought?, step? })` | DS 系列片头（约 8 秒，cue `hop`）：对话页首页、鲸鱼图标喷水花、问候语 → 提问 → 首页收成对话布局 → 深度思考 → 小鲸从图标里蹦出来落到输入框上 |
| `chatEnding(d, layer, { farewell?, thanks?, cite?, clear? })` | DS 系列片尾：发一句“谢谢小鲸，下次见！”→ 回到首页，问候语的位置换成谢谢观看，小鲸跳到中间挥手（cue `land`） |
| `titleCard(d, layer, { word, sub?, cell? })` | 片名卡（两个系列都能用）：`.reveal(t)` 扫出大字（cue `title`）、`.hide(t)` 收起。`word` 只能是英文 / 数字 |
| `paperPage(parent, { x, y, w?, h?, stamp?, title, authors, affil?, abstract?, colors? })` | 论文首页。标题 / 摘要里用 `[[…]]` 圈出的短语可以用 `sweep(tl, page.marks[i], t)` 荧光笔扫亮 |
| `plate(parent, { id, x?, y?, w?, h?, r?, fill?, stroke?, shadow? })` | 全幅圆角图版：返回 `plate` / `cam` / `hud` / `under`。`enterPlate(tl, st, t)` 升起图版与投影，`camera(tl, st.cam, { from, to, at })` 推拉镜头；配套 `callout` / `calloutShow` / `calloutHide`、`hudChip`、`tag`、`stamp`、`scaleBar`、`note`、`path` / `draw`。坐标是舞台坐标，默认铺满 `STAGE` 可用区 |
| `new Sources(layer, tl, pos?)` | 出处角标（两个系列都能用）：画面右下角挂一行出处，`.show(text, t, kind?)` 换一条（上一条自动淡出；`kind` 是左边的小标签，默认“论文”，也可以写“文档”“官网”“代码”），`.clear(t)` 收起。讲论文、引用数字时，每个关键说法都挂上出处 |

**画面（`engine/lib`）**

| 模块 | 函数 |
| :--- | :--- |
| `dom` | `h` 建元素 · `s` 建 SVG · `at` 定位 · `set` 时间轴上的瞬间设置 · `hide` · `pin` · `rand` |
| `svg` | `nextId(prefix?)` 页面内唯一 id · `wrapTransform(g, transform)` 把 `<g>` 的构建期 transform 挪到内层，外层交给 GSAP |
| `viz` | `fx` 铺满舞台的 SVG · `chip` 词块 · `box` 方框 · `label` 文字 · `arrow` / `drawArrow` / `hideArrow` · `popIn` · `fadeIn` · `fadeOut` · `countTo` 数字滚动 · `typeText` 逐字打出 · `chipRow` 一排词块 |
| `tex` | `formula(parent, tex, x, y, { size })` 放公式 · `\hl{名字}{…}` + `part(el, 名字)` 取出一段 · `glow` / `unglow` 高亮 · `texColor('\\cG', C.pink)` 注册颜色宏。内置 `\cO \cQ \cK \cV \cR \cP \cU \cB \cT \cM` |
| `heat` | `heatmap` 热力图（可写数字，亮格子自动用深色字）· `paint` 补间到新矩阵 · `revealHeat` · `hideHeat` |
| `chart` | `plot` 坐标系（D3 比例尺，`xLog` / `yLog` 对数轴）· `line` / `drawLine` · `marks` · `vbars` / `growBars` / `setBars` · `histBars` · `hbar` / `growH` · `curvePath` · `showPlot` |
| `panel` | `panel` 终端风格面板（标题嵌在边框上）· `table` 数据表 |
| `blocks` | `mblock` 矩阵“形状块”（N×d 之类） |
| `linalg` | `rng` · `gauss` · `randn` · `matmul` · `transpose` · `softmaxRows` · `relu` · `frob` · `norm` · `trace` · `mean` · `std` · `histogram`… |
| `noise` | `hash(n)` / `hash2(a, b)` 整数 → [0, 1) · `noise(x, seed)` 一维值噪声 [-1, 1] · `noise2(x, y, seed)` 二维 · `fbm(x, seed, octaves?)` 分形噪声（大起伏带小抖动：烛光、手持感） |
| `canvas` | `canvas(layer, { top? })` 铺满舞台的画布，返回 `{ el, ctx, clear }`（一般用 `d.canvas`）· `halo(ctx, x, y, r, { color, alpha, squash })` 径向光晕（`squash` 压扁成地上的一摊光）· `beam(ctx, from, to, { spread, start, blur })` 体积光束 · `beamMask(from, to, …)` 同形状的遮罩 · `motes(ctx, t, { n, area, drift, rise, twinkle, mask })` 漂浮的尘埃 / 光点 · `rain(ctx, t, { n, area, speed, angle, depth, mask })` 雨（裁在 `area` 里）· `ripples(ctx, t, { area, rate, flat })` 地上的涟漪 · `bokeh(ctx, t, { colors, size })` 景深光斑 · `stars(ctx, t, { n, area, twinkle })` 星空 |
| `colors` | `C`（当前主题的颜色，和 CSS 变量 `--clawd`、`--q`… 对应）· `mix` · `rgba` · `luma` · `diverge` / `diverge2` 发散色带 · `heat` 顺序色带 |

`canvas` 里的效果都是“`t` + 种子 → 画面”的纯函数，`area` 是 `[x0, y0, x1, y1]`、`mask(x, y)` 返回 0–1 的亮度（`motes(…, { mask: beamMask(…) })` 就是光束里的尘埃）。
颜色传 `#rrggbb`，不传就用主题色。合成方式 `op`（默认 `'lighter'`，两团光叠在一起变亮）只在画布内部生效，画布整体按普通透明度盖在 DOM 上：
深色终端上浅色的光很好看；亮色主题（DS 系列）的白底上要换深一点的颜色、调高 alpha（DS 示例片 sky 章太阳的光晕、满天的蓝点就是这么调的）。
光晕和 `tex` 的公式高亮 `glow` 是两回事，所以 Canvas 版叫 `halo`。胶片颗粒、暗角、遮幅这类整片的后期效果故意没有收进来，它们会和终端 / 对话页的外壳打架。

**演员（`engine/actors`）**

所有演员都是 `Actor` 的子类，动作接口一样。每个动作都在时刻 t 往时间轴里加补间，并返回动作结束的时刻；同一个演员的动作按时间先后调用。

- 讲解员 `d.host`（Claude 系列是 Clawd，DS 系列是小鲸；`d.clawd` 是它的老名字，**在 DS 主题里 `d.clawd` 也是小鲸**）。呼吸和眨眼是自动的。
- 共同的动作：`look(tl, 'l'|'r'|'u'|'d'|'c', t)` · `lookAt(tl, 另一个演员或 x, t)` · `face(tl, 'normal'|'happy'|'wide'|'closed', t)` ·
  `prop(tl, 'sweat'|'bang'|'ask'|'heart'|'note', t, dur)` · `wave` · `cheer` · `talk` · `bounce` · `shake` · `blink` ·
  `hopTo(tl, x, y, t, { dur, height, scale })` · `walkTo` · `place` · `show` · `headTop()`（头顶在舞台上的位置）。
- `Clawd`（`actors/clawd.ts`）：16×10 单色点阵，由 Claude Code 欢迎界面的四分块字符画解码而来。说话时摆手。`Clawd.SIZES`：在家 14、迷你 6、片尾 10、封面 30（一个精灵像素 = 几个舞台像素）。
- `Whale` 小鲸（`actors/whale.ts`，点阵在 `whale-art.ts`）：36×54、二十来种颜色的像素画，后发、呆毛、耳鳍、眼睛（四种表情 + 眨眼）、嘴（闭 / 张 / 笑）、
  两只手（垂下 / 举到脸颊旁 / 挥手）、两条腿都是分开的部件。说话时嘴一张一合；`happy` 时耳鳍扑两下，`wide` 时呆毛弹一下；待机时呆毛偶尔晃、耳鳍偶尔扑。
  专属动作：`flap(tl, t, n)` 扑耳鳍 · `spring(tl, t)` 呆毛弹起来（在 DS 主题里要用的话：`const xj = d.host as Whale`）。`Whale.SIZES`：在家 4、迷你 2、片尾 4、封面 8。
- **多个演员同台**：讲解员之外的演员自己建、用 `d.actor()` 登记（登记过的才会自动呼吸眨眼、才能当 `say` 的 `by`）：

  ```ts
  const xj = d.actor(new Whale(L, { px: 5, x: 1180, y: 720 }))   // 放在本章图层里，脚底中心 (1180, 720)
  d.say('大家好呀，我是{blue:小鲸}！', (t) => xj.wave(tl, t, 4), { by: xj })
  d.say('同一条时间轴上，我们还能一起演！', (_, w) => { d.host.lookAt(tl, xj, w('一起')); xj.cheer(tl, w('一起'), 1.4) })
  ```

  同框时要不要统一像素大小由场景决定：px 一样，像素网格就一样（Clawd 会显得像只小宠物）；也可以各用各的。
- **加一个新角色**：照着 `whale.ts` 写一个 `Actor` 的子类——点阵用 `actors/pixel.ts` 的 `paint(rows, palette, x, y)` 画（调色板字符点阵，同色横向合并成一个 `<rect>`），
  会换帧的部件用 `Frames`（`show(tl, 帧名, t)`），对称的部件用 `mirror` / `symmetric` 只画一半；在构造函数里把部件按由后往前的顺序加进 `this.art`，
  实现 `look / face / blink / talk / wave / cheer / steps / pose`，给出 `SIZES` 和道具位置。眨眼、说话最好做成“叠加层”（临时盖上去），不要去改表情帧，免得和 `face()` 打架。
- 外壳（`d.term`，终端或对话页，接口在 `ui/shell.ts`）：`ask` 提问 · `think` 思考动画 · `heading` / `clearHeading` 顶部的问题 · `step` 进度标尺 · `footer` 右下角章节名。
- 音效（`d.sfx.at(t, kind)`）：`blip` `key` `enter` `pop` `thud` `whoosh` `ding` `tick`。台词的“哔哔”声和打字声是自动的。

**主题（`engine/themes.ts`）**

一期视频的样子（讲解员 + 外壳 + 配色）由主题决定，在 `config.ts` 里选：

```ts
export const VIDEO = defineVideo({ title: '…', slug: '…', theme: DEEPSEEK, … })   // 不写 theme 就是 CLAUDE
```

- `defineVideo` 当场应用主题（改写 `C`、把颜色写成 `:root` 上的 CSS 变量、挂 `<html data-theme>`），所以 `config.ts` 里的 `SEM`、各章模块顶层读到的 `C` 都已经是主题色。
- 颜色只在 TS 里写一份：调色板在 `lib/colors.ts`（Claude 深色的默认值），主题只写和默认不同的键；CSS 里一律用变量（`var(--clawd)`、`var(--bubble)`…，`ink2` → `--ink-2`、`clawdHi` → `--clawd-hi`）。
  除了 `ink … teal` 这些，还有界面零件的颜色：`bubble`（气泡底）、`shimmer`（思考动词的高光）、`heatHi`（热度色带最热端）、`onAccent`（主色块上的字）、`shade` / `scan`（ANSI 大字的阴影线和扫描光）、`sweat`、`titleShadow`（封面副题的投影）；
  只给 CSS 用的样式值（带透明度的影子等）在主题的 `vars` 里：`page`、`shadow`、`paperShadow`、`onAccentGlow`。
- DS 系列是亮色：白底、鲸鱼蓝 `#4D6BFE` 主色，`q k v red pink purple blue teal` 都换成白底上看得清的深色版，`{blue:…}` 是天蓝（和主色分开）。热度色带亮底上越热越深，格子里的数字会自动挑深浅。
- 引擎代码里别在模块顶层把 `C` 的值存起来（比如 `const X = C.clawd` 写在函数外面）——那时主题可能还没应用；在函数里读。
- 新主题：照着 `CLAUDE` / `DEEPSEEK` 写一个 `Theme`（`id`、`ui: 'terminal' | 'chat'`、`palette`、`vars`、`host`、`shell`），boot 和封面不用改。

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
| `npm run snap -- --chapter math,outro --n 8` | 总览图：每章均匀取 n 帧缩略图，拼成一张带标注的网格（每格写着时刻和 `章节id+秒`）→ `shots/sheet-math+outro.png`，几十帧几秒钟 |
| `npm run snap -- --sheet 10:40:2,60:70` | 总览图，按区间取帧：`开始:结束:步长`，不写步长就在区间里均匀取 `--n` 帧，单写一个数就是一帧，逗号隔开多段。`--cols 4` 每行几格、`--scale 0.25` 缩略图比例 |
| `npm run snap -- … --out review/a` | 输出文件名的前缀（可以带子目录）：总览图存成 `shots/review/a.png`，单张存成 `shots/review/a-t0012.50.png`。几个人 / 几个代理同时截图时各用各的前缀，互不覆盖 |
| `npm run sheet` | `shots/` 里的截图每 4 张拼一张总览 |
| `npm run score` | 配乐结构报告与自检 |
| `npm run render` | 导出 `out/<slug>.mp4`（30fps，6 段并行）。`--fps 60` `--workers 8` `--from 120 --to 150 --out out/part.mp4` `--mute` `--keep-parts` |
| `npm run audio` | 只重做音轨、重新封装（视频时长和当前动画对不上会拒绝）。`--wav out/a.wav --only music` 只导出 WAV |
| `npm run cover` | 导出封面：`out/cover-4x3.png`（1920×1440，B 站投稿上传用）、`out/cover-16x10.png`（1920×1200）、`out/cover-16x9.png`（1920×1080） |
| `npm run engine` | 和框架对比引擎文件：不给子命令就列出不一样的文件 + 框架仓库状态；`-- diff` / `-- pull [--fetch]` / `-- push`（默认开 PR，`--local` 直接改框架） / `-- pr [--all] [--web]` |
| `npm run new -- <目录> [--theme deepseek]` | （只在框架里）开一个新的视频项目；`--theme deepseek` 开 DS 系列 |
| `DEMO=deepseek npm run …` | （只在框架里）换成 DS 系列的示例片 `src/video-deepseek/`：`dev` / `snap` / `score` / `cover` / `render` 都认（PowerShell：`$env:DEMO='deepseek'; npm run dev`） |

场景构建出错时，`render` / `audio` 会列出错误并中止（`--force` 硬导出）；开发时错误只影响那一章，其他章照常排。

导出依赖：Node 18+、PATH 里的 `ffmpeg` / `ffprobe`、本机的 Edge 或 Chrome（找不到就用环境变量 `BROWSER` 指定路径）。

## 8. 踩过的坑

- **主题要在读颜色之前定下来**：`C` 是一个对象，主题应用时改写它。`config.ts` 用 `defineVideo({ theme })`，求值时就应用主题，
  后面的 `SEM`、各章模块读到的才是主题色；引擎里的颜色一律在函数里读（KaTeX 的 `\cO` 这些宏也改成每次渲染时现做）。
  早先有一版主题是在 boot 里才改 `C`，结果公式里的 `\cO` 永远是橙色——就是这个原因。
- **亮色主题的对比度**：为深色底挑的颜色（琥珀、淡紫蓝、天蓝）放到白底上只有 1.6–2.2:1，所以 DS 主题把 `q k v red pink purple blue teal` 全换成了深色版；
  热度色带亮底上要“越热越深”；格子里的数字按格子的亮度在 `C.fg` / `C.ink` 里挑。新画面在两个主题下都截一张看看。
- **小鲸的像素画**：参考设定图直接缩小会糊成一团（36 宽还认不出耳鳍、发箍、围裙上的鲸鱼），点阵是照着比例一格一格手画的。
  改长相直接改 `whale-art.ts` 的点阵；举起来的手要压在鬓发前面、袖口用白色，不然和蓝头发混在一起看不出来。
  刘海别画成两眼之间一个对称的倒三角（第一版就是这样，看着像“中间一个三角”）：下沿要高低不齐、尖朝不同方向；
  参考图里发缕交叉的感觉，在这个分辨率下靠“一缕亮一号的蓝斜着压过去 + 另一缕从它底下穿过、两头各露一截”来表现，
  发丝线别多（多了像格子布），也别用两条对称的斜线（上半截会围出一个三角）。

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
`src/video/`、`package.json`、`vite.config.ts`、README、CLAUDE.md 是每个项目自己的，永远不同步。框架里的 `src/video-deepseek/`（DS 系列的示例片）也不同步，只在 `npm run new --theme deepseek` 时拷成新项目的 `src/video/`。

- `npm run engine`：默认子命令。列出和框架不一样的文件，再打印框架仓库的状态：分支 @ 短 commit、远端 URL、`gh` 可不可用。
  框架本地落后远端、或者框架工作区里有未提交的引擎改动时，会额外提示一句。
  框架位置记在 `package.json` 的 `claudeSay.framework`。
- `npm run engine -- diff [文件…]`：逐行对比（左边框架，右边本项目）。
- `npm run engine -- pull [文件…]`：框架有更新，拿过来。只覆盖有差异的文件，不删除任何文件。
  不带 `--fetch` 时只和框架**工作区里的文件**比；框架本地落后远端时会提示先 `git pull`，或者用 `pull --fetch`。
  加 `--fetch`：先 `git fetch` 框架的远端；框架正停在远端默认分支上时，再顺手 `git merge --ff-only <远端>/<默认分支>` 让工作区跟上，
  别人刚合并回来的 PR 要这样才看得到、拿得到。fetch 失败只警告；框架不在默认分支上、或者快进不了，就提示人工处理。
  拿过来的文件如果在框架工作区里还是没提交的草稿，会额外提示一句「不是已合并的版本」：想只拿已合并的版本，先在框架目录把改动提交或收起来，再用 `--fetch`。
- `npm run engine -- push [文件…]`：这一期给引擎做了**通用的**改进（新的图元、新的动画手法、修了 bug），还给框架。每一期都应该有东西可以还回去（第 0 节）。
  只和这一期内容有关的东西（专用的颜色、只讲这个题目的组件）留在 `src/video/` 里，不要放进引擎。
  **push 默认开 PR，不直接改框架**；`--local` 是逃生口：直接把文件覆盖进框架（新依赖也会写进框架的 `package.json`），跳过人工审阅，留给框架不是 git 仓库 / 离线的情况。
  其他参数：`--force`（文件还是框架的旧版本时也硬推，见下面第 2 步）、`--dry`（只准备分支和提交，打印 diffstat 和提交信息，不推送）、
  `--keep`（临时 worktree 留着不删）、`--no-fetch`（不先 fetch 框架的远端）、`--no-pr`（只推分支不开 PR）、`--draft`（draft PR）、
  `--base <分支>`、`--remote <名字>`、`--repo <owner/name>`、`--type <类型>`（默认 `feat`）、`--title <标题>`、`--gh <命令>`。
- `npm run engine -- pr [--all] [--web]`：看从作品推回来的引擎 PR，默认只列开着的；`--all` 连已合并 / 已关闭的一起看，`--web` 用浏览器打开。
- `--from <路径>`：所有子命令通用。不写就读 `package.json` 的 `claudeSay.framework`；用它临时指向别的框架位置（比如不是 `npm run new` 开出来的老项目）。

`push` 的流程：

1. 以 `<远端>/<默认分支>`（一般 `origin/main`）为基础，在框架仓库里开一个临时 worktree。框架当前的工作区和当前分支一概不动；
2. 有差异的引擎文件拷进 worktree。项目里有、框架里完全没有的新依赖会一并写进框架的 `package.json`，跟着 PR 一起审；
   某个文件在本项目里还是框架的旧版本（没 pull 过）时，会跳过它并警告——照它推上去会把框架后来的改动删掉；先 `pull --fetch` 再 push，确定要覆盖就加 `--force`；
   缺的框架行如果在你这份里能找到长得很像的行（被你改写了），就不算丢失、也不提醒；只有「缺行最少」的那一版明显早于 PR 的基础版本时才提醒，而且不跳过——打印「框架现有版本里有、你这边没有的行，PR 会把它们删掉」，PR 正文里也带一句（文件 少 N 行，审阅时确认是不是有意的）；先 `pull --fetch` 合一次更稳妥，确属有意删除就照推；
3. 提交到 `engine/<项目名>-<YYYYMMDD-HHmm>` 分支，中文 Conventional Commits（`feat(engine): 从 <项目名> 还回引擎改进`），正文列出文件清单和来源路径；
4. 推分支 + `gh pr create`。PR 正文含文件清单、diffstat 和审阅清单；
5. 远端不是 GitHub 或者 `gh` 不可用：分支照样推上去，打印 compare 链接让人工点。推送失败：分支和提交留在框架仓库里，并打印重推命令；
6. 结束后删掉临时 worktree；本地临时分支只留推送失败那一种（方便人工重推），推成功的只剩远端的，PR 上还能看到；
7. 人工在 GitHub 上合并之后，其他项目 `npm run engine -- pull --fetch` 就能拿到。

审阅 PR 时顺手跑一遍（框架的示例片同时是引擎的回归测试）：`npm run typecheck`、`npm run score`、`npm run snap -- <几个时刻>` 看截图（改动多的章拍一张总览 `--chapter <章节id>`）；
动到导出流程时 `npm run render`；新功能最好在框架的示例片 `src/video/` 里用一次。
引擎用到的新依赖 push 会自动写进框架的 `package.json`，不然框架那边跑不起来；两边版本号不一致的只列出来，人工决定。

## 10. 发布（系列的约定）

- 系列：Claude 系列讲进阶知识，科普向的叫【小克学AI】（Transformer 的前世今生），论文精读叫【小克读论文】（MixA）；
  DS 系列（小鲸）讲科普百科，系列名待定（示例片暂用【小鲸百科】）。封面左上角的标签就是系列名。
- 前两期的简介按 B 站的格式写（时间戳、`#话题#`），结构：钩子 → 本期内容 → 章节时间戳 → 关于这支视频 → 延伸阅读 → 系列一句话 → 话题标签。
- 固定保留三条声明：含 AI 生成内容；图中数据为示意（真实数字取自公开论文）；Clawd 是按终端图案重绘的二次创作，与 Anthropic 官方无关。
  DS 系列把第三条换成：小鲸是 DeepSeek 拟人形象的像素二次创作，对话页风格致敬 DeepSeek，与深度求索官方无关。
- 参考文献的 arXiv 编号写之前先核对。简介里不要用“他 / 她”指代小克，直接写“小克”；小鲸也直接写“小鲸”。
- 封面：B 站投稿上传 `out/cover-4x3.png`，再看一眼投稿页的裁剪预览（第 8 节）；其他平台按需要用 16:10 / 16:9 版。
