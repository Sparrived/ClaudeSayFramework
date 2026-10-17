import './sky.css'
import { gsap } from 'gsap'
import type { Director } from '../../engine/director'
import { Clawd } from '../../engine/actors/clawd'
import { h, hide, s } from '../../engine/lib/dom'
import { C, mix } from '../../engine/lib/colors'
import { formula, glow, unglow } from '../../engine/lib/tex'
import { drawLine, growBars, plot, setBars, showPlot, vbars } from '../../engine/lib/chart'
import { arrow, drawArrow, fadeIn, fadeOut, fx, label, popIn } from '../../engine/lib/viz'
import { SEM } from '../config'

/** 五种色光：从短波长到长波长 */
const LIGHTS = [
  { name: '紫', nm: 400, color: SEM.violet },
  { name: '蓝', nm: 450, color: SEM.blue },
  { name: '绿', nm: 530, color: SEM.green },
  { name: '黄', nm: 580, color: SEM.yellow },
  { name: '红', nm: 680, color: SEM.red },
]
/** 瑞利散射：强度 ∝ 1/λ⁴，以蓝光为 1 */
const SCATTER = LIGHTS.map((l) => (450 / l.nm) ** 4)

// ── 版面 ──────────────────────────────────────────
const SUN = { x: 300, y: 330, r: 78 }
const AIR = { x0: 900, x1: 1500 }
const MOLECULES: [number, number][] = [
  [980, 250],
  [1090, 410],
  [1200, 300],
  [1320, 450],
  [1380, 230],
  [1470, 360],
]
const CHART = { x: 820, y: 230, w: 640, h: 360 }

/** 天空为什么是蓝的：白光里的五种色光、空气分子的散射、λ⁴ 的柱子；Clawd 来串门追问“为什么不是紫色” */
export function sky(d: Director) {
  const { tl, host, sfx } = d
  const L = d.layer('sky')

  // 散射图和柱状图各用一张铺满舞台的 svg，换画面时整张收起
  const svg = fx(L)
  const chartSvg = fx(L, { top: true })
  // 天空：一层淡淡的蓝，垫在最底下，最后才铺满
  const tint = h('div', { class: 'sk-tint' })
  L.prepend(tint)
  hide(tint)

  // ── 太阳 ──
  const sun = s('g', {}, [
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4
      const r0 = SUN.r + 18
      const r1 = SUN.r + 44
      return s('line', {
        x1: SUN.x + Math.cos(a) * r0,
        y1: SUN.y + Math.sin(a) * r0,
        x2: SUN.x + Math.cos(a) * r1,
        y2: SUN.y + Math.sin(a) * r1,
        stroke: SEM.yellow,
        'stroke-width': 8,
        'stroke-linecap': 'round',
      })
    }),
    s('circle', { cx: SUN.x, cy: SUN.y, r: SUN.r, fill: mix(SEM.yellow, C.ink, 0.45), stroke: SEM.yellow, 'stroke-width': 6 }),
  ])
  svg.append(sun)
  gsap.set(sun, { transformOrigin: `${SUN.x}px ${SUN.y}px` })
  hide(sun)
  const sunCap = label(L, '阳光', SUN.x, SUN.y + SUN.r + 70, { cls: 'sk-cap' })
  hide(sunCap)

  // ── 五种色光：从太阳射到空气里；长波长的直直穿过去 ──
  const ray = (x1: number, x2: number, y: number, color: string) => {
    const p = s('path', { d: `M${x1},${y}L${x2},${y}`, fill: 'none', stroke: color, 'stroke-width': 7, 'stroke-linecap': 'round' })
    svg.append(p)
    gsap.set(p, { drawSVG: '0%' })
    return p
  }
  const ys = LIGHTS.map((_, i) => SUN.y - 34 + i * 17)
  const rays = LIGHTS.map((l, i) => ray(SUN.x + SUN.r + 30, AIR.x0, ys[i], l.color))
  const through = LIGHTS.map((l, i) => (i >= 2 ? ray(AIR.x0, 1780, ys[i], l.color) : null))

  // ── 空气分子，和被它们弹开的蓝光、紫光 ──
  const dots = MOLECULES.map(([x, y]) => s('circle', { cx: x, cy: y, r: 11, fill: C.dim }))
  svg.append(...dots)
  hide(dots)
  const airCap = label(L, '空气分子', 1230, 560, { cls: 'sk-cap' })
  hide(airCap)
  const bounces = MOLECULES.flatMap(([x, y], k) =>
    [0, 1, 2].map((j) => {
      const a = ((k * 3 + j) * 2.4) % (2 * Math.PI)
      const len = 70 + ((k + j) % 3) * 18
      return arrow(svg, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, {
        color: (k + j) % 3 === 0 ? SEM.violet : SEM.blue,
        width: 4,
        head: 11,
      })
    }),
  )

  // ── 公式和柱子 ──
  const f = formula(L, String.raw`I \;\propto\; \frac{1}{\lambda^{4}}`, 450, 380, { size: 76 })
  hide(f)
  const fCap = label(L, '散射强度 · 波长', 450, 500, { cls: 'sk-cap' })
  hide(fCap)
  const p = plot(chartSvg, CHART, { x: [0.5, 5.5], y: [0, 1.8], xTicks: [], yTicks: [], noYAxis: true })
  gsap.set(p.g, { autoAlpha: 0 })
  const bars = vbars(
    p,
    LIGHTS.map((_, i) => i + 1),
    SCATTER,
    { width: 84, color: (i) => LIGHTS[i].color },
  )
  const names = LIGHTS.map((l, i) => {
    const [x] = p.px(i + 1, 0)
    return label(L, `${l.name}
${l.nm} nm`, x, CHART.y + CHART.h + 46, { cls: 'sk-bar' })
  })
  hide(names)
  /** 紫光的柱子缩到这么高（阳光里本来就少） */
  const VIOLET = 0.62
  const [vx, vy] = p.px(1, VIOLET)
  const eyeNote = label(L, '人眼不太敏感', vx, vy - 34, { cls: 'sk-note' })
  hide(eyeNote)

  // ── Clawd 来串门（DS 主题里 d.host 是小鲸；客串的 Clawd 自己建、自己登记） ──
  const guest = d.actor(new Clawd(L, { px: 10, x: 2060, y: 740 }))

  d.chapter({ id: 'sky', title: '天空为什么是蓝的', step: '天空', question: '天空为什么是蓝色的？', thought: '嗯，用户问天空的颜色，得从阳光说起……', layer: L })

  d.say(
    '阳光看着是白的，其实是{purple:紫}、{blue:蓝}、{k:绿}、{v:黄}、{r:红}好几种光混在一起。',
    (t, w) => {
      popIn(tl, sun, t + 0.1, { from: 0.7 })
      fadeIn(tl, sunCap, t + 0.3, { y: 8 })
      sfx.at(t + 0.1, 'pop')
      LIGHTS.forEach((l, i) => drawLine(tl, rays[i], w(l.name), { dur: 0.45 }))
    },
    { min: 5.2 },
  )

  d.say(
    '它们穿过大气时，会被空气分子撞得到处乱跑——这叫{b:散射}。',
    (t, w) => {
      popIn(tl, dots, t + 0.2, { stagger: 0.07 })
      fadeIn(tl, airCap, t + 0.5, { y: 8 })
      const hit = w('散射')
      bounces.forEach((a, i) => drawArrow(tl, a, hit + (i % 6) * 0.05, 0.3))
      through.forEach((r) => r && drawLine(tl, r, hit, { dur: 0.6 }))
      host.look(tl, 'r', t + 0.4)
      host.look(tl, 'c', hit + 1.2)
    },
    { min: 5.0 },
  )

  // 换画面：散射图收起，换成公式和柱子
  d.beat(0.5, (t) => {
    fadeOut(tl, [svg, sunCap, airCap], t, { dur: 0.35 })
  })

  d.say(
    '波长越短，散射越厉害：强度和波长的四次方成反比。',
    (t, w) => {
      fadeIn(tl, f, t + 0.1, { y: 10 })
      fadeIn(tl, fCap, t + 0.4, { y: 8 })
      showPlot(tl, p, w('四次方') - 0.2)
      growBars(tl, bars, w('四次方'), { stagger: 0.09 })
      fadeIn(tl, names, w('四次方') + 0.2, { stagger: 0.06, y: 6 })
      glow(tl, f, w('反比'), { color: C.clawd })
    },
    { min: 5.0 },
  )

  d.say(
    '所以{blue:蓝光}被散得满天都是，抬头一看，天空就成了蓝色。',
    (_, w) => {
      unglow(tl, f, w('蓝光'))
      tl.to(tint, { autoAlpha: 1, duration: 1.2, ease: 'power1.inOut' }, w('满天'))
      host.face(tl, 'happy', w('天空'))
      host.face(tl, 'normal', w('天空') + 2.2)
    },
    { min: 4.6 },
  )

  // ── Clawd 跳进来追问 ──
  d.say(
    '等等！{purple:紫光}的波长更短，天空怎么不是紫色的？',
    (t, w) => {
      let tt = guest.hopTo(tl, 1880, 740, t, { dur: 0.4, height: 120 })
      sfx.at(tt - 0.39, 'thud')
      tt = guest.hopTo(tl, 1700, 740, tt - 0.1, { dur: 0.4, height: 110 })
      sfx.at(tt - 0.39, 'thud')
      guest.prop(tl, 'ask', w('怎么'), 2.2)
      host.lookAt(tl, guest, t + 0.3)
      host.face(tl, 'wide', w('紫色的'))
      host.face(tl, 'normal', w('紫色的') + 1.0)
    },
    { by: guest, min: 4.6 },
  )

  d.say(
    '好问题！阳光里的紫光本来就少，人眼对紫色也不太敏感。',
    (t, w) => {
      host.face(tl, 'happy', t + 0.2)
      host.face(tl, 'normal', t + 1.4)
      setBars(tl, p, [bars[0]], [VIOLET], w('本来就少'), { dur: 0.6 })
      tl.to(bars[0], { opacity: 0.35, duration: 0.4 }, w('不太敏感'))
      fadeIn(tl, eyeNote, w('不太敏感'), { y: 8 })
      guest.look(tl, 'l', t)
    },
    { min: 5.2 },
  )

  d.say(
    '原来如此，谢谢小鲸！',
    (t) => {
      guest.face(tl, 'happy', t + 0.2)
      guest.prop(tl, 'heart', t + 0.3, 1.8)
      host.face(tl, 'happy', t + 0.5)
      host.wave(tl, t + 0.5, 3)
      guest.face(tl, 'normal', t + 2.2)
      host.face(tl, 'normal', t + 2.2)
      host.look(tl, 'c', t + 2.2)
    },
    { by: guest, min: 3.0 },
  )
  d.end(L)
}
