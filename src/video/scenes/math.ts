import './math.css'
import type { Director } from '../../engine/director'
import { hide, s } from '../../engine/lib/dom'
import { C, heat } from '../../engine/lib/colors'
import { formula, glow, part, unglow } from '../../engine/lib/tex'
import { heatmap, hideHeat, paint, revealHeat } from '../../engine/lib/heat'
import { map, randn, softmaxRows } from '../../engine/lib/linalg'
import { drawLine, line, marks, plot, showPlot } from '../../engine/lib/chart'
import { fadeIn, fadeOut, fx, label, popIn } from '../../engine/lib/viz'
import { beam, beamMask, halo, motes } from '../../engine/lib/canvas'
import { paperPage, sweep } from '../../engine/kit'

const F_SOFTMAX = String.raw`\mathrm{softmax}(\mathbf{x})_i=\frac{\hl{num}{e^{x_i}}}{\hl{den}{\sum_{j} e^{x_j}}}`

/** 5×5 的打分矩阵：带种子的随机数，每次打开、每次导出都一样；保留一位小数，格子里写的就是真值 */
const LOGITS = map(randn(7, 5, 5), (v) => Math.round(v * 12) / 10)
const PROBS = softmaxRows(LOGITS)

/** 温度那一段：一行分数，softmax(x / τ) 随 τ 变化 */
const ROW = [2.0, 1.0, 0.4, -0.3, -1.0]
const softmaxT = (tau: number) => softmaxRows([ROW.map((x) => x / tau)])[0]

// ── 版面 ──────────────────────────────────────────
const HEAT = { x: 520, y: 548, cell: 72 }
const CHART = { x: 1080, y: 390, w: 600, h: 290 }
const BARS = { cx: 960, base: 690, gap: 170, w: 96, max: 330 }
/** 负号用真正的减号 −（比连字符 - 长，和公式里的一致） */
const num = (v: number) => v.toFixed(1).replace('-', '−')

/** 公式与图：KaTeX 公式分段高亮、真算出来的热力图、D3 比例尺 + GSAP 画曲线、重绘钩子 */
export function math(d: Director) {
  const { tl, clawd, sfx } = d
  const L = d.layer('math')
  const svg = fx(L)

  // ── 论文首页（一篇虚构的论文，只为演示组件）──
  const page = paperPage(L, {
    x: 460,
    y: 210,
    h: 370,
    stamp: 'ClaudeSay Framework · Demo · 2026',
    title: 'ClaudeSay: Explaining Ideas with an [[Animated Terminal]]',
    authors: ['Clawd'],
    affil: 'Claude Code · ~/claude-say',
    abstract:
      'We present a framework in which every line of narration, every visual and every note of music lives on [[a single seekable timeline]], so that an explainer can be previewed in the browser and exported frame by frame.',
    colors: [C.clawd, C.blue],
  })
  hide(page.el)

  // ── 公式 ──
  const fSoft = formula(L, F_SOFTMAX, 960, 250, { size: 54 })

  // ── 热力图：先是打分，再一行行变成概率 ──
  const hm = heatmap(L, LOGITS, { x: HEAT.x, y: HEAT.y, cell: HEAT.cell, gap: 4, signed: true, numbers: num })
  hideHeat(hm)
  const capA = label(L, '打分 x：每行 5 个数', HEAT.x, HEAT.y - hm.h / 2 - 30, { cls: 'ma-cap' })
  const capB = label(L, 'softmax 之后：每行加起来是 1', HEAT.x, HEAT.y - hm.h / 2 - 30, { cls: 'ma-cap seg-o' })

  // ── 曲线：y = eˣ ──
  const p = plot(svg, CHART, { x: [-2, 2], y: [0, 8], xTicks: [-2, -1, 0, 1, 2], yTicks: [0, 2, 4, 6, 8], xLabel: 'x', yLabel: 'eˣ' })
  const pts: [number, number][] = Array.from({ length: 41 }, (_, i) => {
    const x = -2 + i * 0.1
    return [x, Math.exp(x)]
  })
  const curve = line(p, pts, { color: C.clawd, width: 5, curve: 'monotone' })
  const dots = marks(
    p,
    [-2, -1, 0, 1, 2].map((x) => [x, Math.exp(x)]),
    { color: C.clawd, r: 8 },
  )
  hide(p.g)

  // ── 温度：五根柱子跟着 τ 变（重绘钩子）──
  const st = { tau: 1 }
  const barX = (i: number) => BARS.cx + (i - 2) * BARS.gap
  const bars = ROW.map((_, i) => s('rect', { x: barX(i) - BARS.w / 2, width: BARS.w, rx: 6, fill: C.clawd }))
  const vals = ROW.map((_, i) => s('text', { x: barX(i), 'text-anchor': 'middle', class: 'ma-val' }))
  const xs = ROW.map((x, i) => s('text', { x: barX(i), y: BARS.base + 40, 'text-anchor': 'middle', class: 'ma-x', text: num(x) }))
  const base = s('line', { x1: barX(0) - 90, x2: barX(4) + 90, y1: BARS.base, y2: BARS.base, class: 'ma-base' })
  const temp = s('g', {}, [base, ...bars, ...vals, ...xs])
  svg.append(temp)
  const readout = label(L, '', BARS.cx, 250, { cls: 'ma-tau mono' })
  d.hook(() => {
    const pr = softmaxT(st.tau)
    pr.forEach((v, i) => {
      const hh = Math.max(2, v * BARS.max)
      bars[i].setAttribute('y', String(BARS.base - hh))
      bars[i].setAttribute('height', String(hh))
      vals[i].setAttribute('y', String(BARS.base - hh - 14))
      vals[i].textContent = v.toFixed(2)
    })
    readout.textContent = `τ = ${st.tau.toFixed(2)}`
  })
  hide(fSoft, capA, capB, temp, readout)

  // ── Canvas：一束追光，光里飘着尘埃（也是重绘钩子：每一帧按时间轴的当前时刻现画）──
  const light = { on: 0 }
  const LAMP: [number, number] = [960, 175]
  const FLOOR: [number, number] = [960, 700]
  const cone = { spread: 760, start: 60 }
  const inCone = beamMask(LAMP, FLOOR, cone)
  d.canvas(L, (ctx, t) => {
    if (light.on <= 0) return
    beam(ctx, LAMP, FLOOR, { ...cone, color: C.clawdHi, alpha: 0.32 * light.on, blur: 10 })
    halo(ctx, FLOOR[0], FLOOR[1], 420, { color: C.clawd, alpha: 0.4 * light.on, squash: 0.18 })
    halo(ctx, LAMP[0], LAMP[1], 70, { color: C.shimmer, alpha: 0.8 * light.on })
    motes(ctx, t, { seed: 7, n: 240, area: [500, 150, 1420, 720], color: C.shimmer, alpha: light.on, size: 2.6, mask: (x, y) => 0.15 + inCone(x, y) * 1.6 })
  })
  const code = label(L, 'motes(ctx, t, { seed: 7, n: 240 })', 960, 735, { cls: 'ma-code mono' })
  hide(code)

  d.chapter({
    id: 'math',
    title: '公式与图表',
    step: '公式',
    question: '能讲数学吗？',
    verb: 'Computing',
    layer: L,
  })

  // ── 0. 论文首页：荧光笔扫过标题和摘要里的关键短语 ──
  d.say(
    '讲论文也方便：论文首页、公式、图表，都有现成的组件。',
    (t, w) => {
      fadeIn(tl, page.el, t + 0.2, { y: 40, dur: 0.6 })
      sweep(tl, page.marks[0], w('论文首页'), 0.7)
      sweep(tl, page.marks[1], w('现成的组件'), 1.0)
    },
    { min: 4.6 },
  )

  // ── 1. 公式：讲到哪一项，哪一项亮 ──
  d.say('公式用 {o:KaTeX} 排版：讲到分子，分子就亮；讲到分母，分母就亮。', (t, w) => {
    fadeOut(tl, page.el, t + 0.05, { dur: 0.35 })
    fadeIn(tl, fSoft, Math.max(t + 0.4, w('KaTeX')), { y: 14, dur: 0.5 })
    const num = part(fSoft, 'num')
    const den = part(fSoft, 'den')
    glow(tl, num, w('分子'), { color: C.clawd })
    unglow(tl, num, w('分母'), { color: C.clawd })
    glow(tl, den, w('分母'), { color: C.blue })
  })

  // ── 2. 热力图：真算出来的打分 → 每行 softmax ──
  d.say(
    '矩阵画成热力图，数字在构建时就真算出来：每一行做 softmax，就成了概率。',
    (t, w) => {
      unglow(tl, part(fSoft, 'den'), t + 0.1, { color: C.blue })
      revealHeat(tl, hm, w('热力图'), { mode: 'diag', dur: 0.8 })
      fadeIn(tl, capA, w('热力图') + 0.3, { y: 8 })
      const r0 = w('每一行')
      paint(tl, hm, PROBS, r0, { dur: 0.5, stagger: 0.07, color: (v) => heat(v / 0.8) })
      fadeOut(tl, capA, r0, { dur: 0.25 })
      fadeIn(tl, capB, r0 + 0.3, { y: 8 })
      sfx.at(r0, 'whoosh')
    },
    { min: 5.6 },
  )

  // ── 3. 曲线：D3 的比例尺算位置，GSAP 一笔画出来 ──
  d.say('曲线交给 {o:D3} 的比例尺来算位置，GSAP 负责一笔画出来。', (_, w) => {
    showPlot(tl, p, w('D3'))
    const c0 = w('一笔')
    drawLine(tl, curve, c0, { dur: 1.2 })
    dots.forEach((m, i) => popIn(tl, m, c0 + 0.2 + i * 0.22))
  })

  // ── 4. 重绘钩子：柱子由 τ 算出来，拖进度条也能还原 ──
  d.say(
    '会跟着数变的图，用{o:重绘钩子}来画：拖动进度条，读数也能对上。',
    (t, w) => {
      fadeOut(tl, [hm.el, capB, p.g, fSoft], t + 0.1, { dur: 0.35 })
      fadeIn(tl, [temp, readout], t + 0.5, { y: 0 })
      const k0 = w('重绘钩子')
      tl.to(st, { tau: 0.35, duration: 1.3, ease: 'power1.inOut' }, k0)
      tl.to(st, { tau: 2.6, duration: 1.5, ease: 'power1.inOut' }, k0 + 1.5)
      tl.to(st, { tau: 1, duration: 1.0, ease: 'power1.inOut' }, k0 + 3.2)
      clawd.look(tl, 'r', k0 + 0.2)
      clawd.look(tl, 'c', k0 + 3.6)
    },
    { min: 6.4 },
  )

  // ── 5. Canvas：光束里的尘埃，位置全由时间和种子算出来 ──
  d.say(
    '{o:Canvas} 也一样：光束里几百颗尘埃，位置全由时间和种子算出来。',
    (t, w) => {
      fadeOut(tl, [temp, readout], t + 0.1, { dur: 0.35 })
      const c0 = Math.max(t + 0.5, w('光束'))
      tl.to(light, { on: 1, duration: 0.9, ease: 'power2.out' }, c0)
      sfx.at(c0, 'whoosh')
      fadeIn(tl, code, w('时间'), { y: 8 })
      clawd.look(tl, 'u', c0 + 0.2)
      clawd.face(tl, 'happy', w('种子'))
      clawd.face(tl, 'normal', w('种子') + 1.6)
      clawd.look(tl, 'c', w('种子') + 1.6)
    },
    { min: 5.0 },
  )
  d.end(L)
}
