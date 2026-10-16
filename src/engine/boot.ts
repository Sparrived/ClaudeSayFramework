import '@fontsource/maple-mono/400.css'
import '@fontsource/maple-mono/600.css'
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/500.css'
import '@fontsource/noto-sans-sc/700.css'
import 'katex/dist/katex.min.css'
import './styles.css'
import './lib/viz.css'
import './lib/math.css'
import './kit/kit.css'
import './player.css'

import { gsap } from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { TextPlugin } from 'gsap/TextPlugin'
import { h } from './lib/dom'
import { encodeWav, toBase64 } from './audio/wav'
import { CLAWD_HOME, CLAWD_PX, H, W } from './layout'
import { Clawd } from './clawd/clawd'
import { Bubble, setTempo } from './ui/bubble'
import { Terminal } from './ui/terminal'
import { Sfx } from './audio/sfx'
import { ECHO_TAIL, SCORE_PREROLL, Score } from './audio/score'
import { Director } from './director'
import { createPlayer } from './player'
import type { Scene, VideoConfig } from './types'

// DrawSVG：箭头、曲线一笔画出来；MotionPath：沿路径移动；Text：换文字（数字字符串原样保留，往回拖能还原）
gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin, TextPlugin)

/**
 * 导出前的字体屏障。@fontsource 的中文字体按 unicode-range 切成上百个子集，只有真正
 * 参与排版时才会去请求对应文件；若不等它们到齐就逐帧截图，开头若干帧会用回退字体渲染，
 * 字体到货后字形和字宽跳变（多段并行导出时每个分段开头都会重演一次）。
 * 只在渲染模式调用，必须在 window.__movie 暴露之前完成。
 */
async function fontBarrier() {
  const text = document.body.textContent ?? ''
  // 1) 强制一次 layout，让 DOM 里所有文字的 @font-face 请求真的发出（含 KaTeX 字体）
  void document.body.offsetHeight
  // 2) 拿全片真实文本，把实际用到的每个字重下的 unicode-range 子集一次性拉全
  const specs = [
    'normal 400 40px "Noto Sans SC"',
    'normal 500 40px "Noto Sans SC"',
    'normal 700 40px "Noto Sans SC"',
    'normal 400 30px "Maple Mono"',
    'normal 600 30px "Maple Mono"',
  ]
  await Promise.all(specs.map((s) => document.fonts.load(s, text)))
  // 3) 等 loading 全部收敛，并对覆盖率做个兜底断言（漏载时在导出日志里能看见）
  await document.fonts.ready
  const missing = specs.filter((s) => !document.fonts.check(s, text))
  if (missing.length) console.warn('[render] 字体未完全就绪：', missing.join(' / '))
}

/**
 * 启动一期视频：搭好舞台和演员，按顺序执行场景脚本把整片排进时间轴，
 * 然后进入网页播放器，或者（URL 带 ?render 时）进入导出模式，把 window.__movie 交给导出脚本。
 *
 * URL 参数：?render 导出模式 · ?music=0 关掉配乐 · ?sfx=0 导出时去掉音效 · ?t=秒 / ?ch=章节id 跳转 · ?autoplay
 */
export async function boot(video: VideoConfig, scenes: Scene[]) {
  document.title = video.title
  const stage = document.getElementById('stage')!
  const params = new URLSearchParams(location.search)
  const renderMode = params.has('render')

  // 1920×1080 的舞台等比缩放、居中
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H)
    stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`
  }
  fit()
  addEventListener('resize', fit)

  // 字体加载完再排版，避免逐字动画的位置跳动
  await document.fonts.load('500 40px "Noto Sans SC"', `${video.title}小克`)
  await document.fonts.load('400 30px "Maple Mono"', 'Clawd claude 0123456789')
  await document.fonts.ready

  if (video.tempo) setTempo(video.tempo)
  const layers = h('div', { class: 'layers' })
  const sfx = new Sfx()
  stage.append(layers)
  const term = new Terminal(stage, sfx, video.terminal)
  const actors = h('div', { class: 'actors' })
  stage.append(actors)
  const clawd = new Clawd(actors, { px: CLAWD_PX, x: CLAWD_HOME.x, y: CLAWD_HOME.y })
  const bubble = new Bubble(actors)

  const d = new Director({ layers, clawd, bubble, term, sfx })
  const errors: string[] = []
  for (const scene of scenes) {
    // 开发时某一章写坏了，不要连累其他章：记一笔错误，接着排后面的章节（导出脚本看到错误会中止）
    try {
      scene(d)
    } catch (e) {
      const msg = `[scene ${scene.name}] ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`
      console.error(msg)
      errors.push(msg)
    }
  }
  const duration = d.finish()
  // 背景音乐：?music=0 可以关掉（对比、或者只想要音效时用）
  const score = params.get('music') !== '0' ? new Score(d.chapters, d.cues, duration, video.music) : null
  if (score) {
    sfx.score = score
    for (const w of score.warnings) console.warn('[配乐]', w)
  }
  // 论文页和公式用到的衬线字体，在场景搭好之后才开始加载
  await document.fonts.ready

  const movie = { tl: d.tl, chapters: d.chapters, duration, sfx, redraw: () => d.redraw() }
  if (renderMode) {
    // 给导出脚本用：逐帧 seek，再截图
    document.body.classList.add('render-mode')
    await fontBarrier()
    let wav = new Uint8Array()
    Object.assign(window, {
      __movie: {
        title: video.title,
        slug: video.slug,
        duration,
        chapters: d.chapters,
        cues: d.cues,
        errors,
        seek: (t: number) => {
          d.tl.seek(t, true)
          d.redraw()
        },
        // 音轨先在页面里离线渲染成 WAV，再分块取走，避免一次传输过大
        prepareAudio: async () => {
          wav = encodeWav(await sfx.render(duration, 48000, { sfx: params.get('sfx') !== '0' }))
          return wav.length
        },
        audioChunk: (offset: number, size: number) => toBase64(wav.subarray(offset, offset + size)),
        // 配乐的音符表和结构，给 npm run score 做自检
        score: () =>
          score && {
            notes: score.notes,
            bars: score.bars,
            sections: score.sections.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1, boom: !!s.mood.boom })),
            warnings: score.warnings,
            maxFootprint: score.maxFootprint,
            preroll: SCORE_PREROLL,
            echoTail: ECHO_TAIL,
          },
      },
    })
    d.tl.seek(0, true)
    d.redraw()
  } else {
    createPlayer(document.getElementById('player')!, stage, movie)
  }
  Object.assign(window, { __tl: d.tl, __sfx: sfx, __d: d })
}
