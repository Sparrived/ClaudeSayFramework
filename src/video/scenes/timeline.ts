import './timeline.css'
import { gsap } from 'gsap'
import type { Director } from '../../engine/director'
import { at, h, hide, s, set } from '../../engine/lib/dom'
import { arrow, chip, countTo, drawArrow, fadeIn, fadeOut, fx, hideArrow, label, popIn } from '../../engine/lib/viz'
import { SEM } from '../config'

// ── 版面（舞台像素）──────────────────────────────
const X0 = 260
const X1 = 1660
/** 轨道的中线 */
const TY = 400
/** 两条车道：台词、画面 */
const LANE = { say: TY + 90, beat: TY + 160 }
/** 胶片：一格格画面 */
const FR = { y: 664, w: 100, h: 56, gap: 22, n: 10 }
const px = (p: number) => X0 + (X1 - X0) * p

/** 轨道上的四章（示意的比例），第二章就是“现在” */
const SEGS: [string, number, number][] = [
  ['开场', 0, 0.2],
  ['时间轴', 0.2, 0.45],
  ['公式', 0.45, 0.78],
  ['片尾', 0.78, 1],
]
/** 车道上的一段段：[开始, 长度]（占整条轨道的比例） */
const SAYS: [number, number][] = [
  [0.09, 0.05],
  [0.15, 0.04],
  [0.23, 0.06],
  [0.31, 0.05],
  [0.38, 0.05],
  [0.48, 0.07],
  [0.57, 0.06],
  [0.66, 0.05],
  [0.81, 0.05],
  [0.88, 0.04],
]
const BEATS: [number, number][] = [
  [0.02, 0.06],
  [0.12, 0.03],
  [0.22, 0.02],
  [0.25, 0.08],
  [0.36, 0.04],
  [0.47, 0.03],
  [0.5, 0.09],
  [0.62, 0.04],
  [0.69, 0.07],
  [0.8, 0.03],
  [0.86, 0.08],
  [0.95, 0.04],
]

/** 一条时间轴：所有台词和画面都排在同一条 GSAP 时间轴上，所以能 seek、能逐帧导出 */
export function timeline(d: Director) {
  const { tl, clawd, sfx } = d
  const L = d.layer('timeline')
  const svg = fx(L)

  // ── 轨道和四章 ──
  const track = at(h('div', { class: 'tl-track' }), X0, TY)
  track.style.width = `${X1 - X0}px`
  L.append(track)
  gsap.set(track, { transformOrigin: '0% 50%' })
  const segs = SEGS.map(([name, a, b], i) => {
    const now = i === 1 ? 'now' : ''
    const seg = at(h('div', { class: `tl-seg ${now}` }), px(a), TY)
    seg.style.width = `${px(b) - px(a) - 4}px`
    L.append(seg)
    return [seg, label(L, name, (px(a) + px(b)) / 2, TY - 40, { cls: `tl-seg-l ${now}` })]
  })

  // ── 两条车道 ──
  const lane = (y: number, name: string) => {
    const line = s('line', { x1: X0, x2: X1, y1: y, y2: y, class: 'tl-lane' })
    svg.append(line)
    return [line, label(L, name, X0 - 28, y, { anchor: 'r', cls: 'tl-lane-l' })]
  }
  const laneSay = lane(LANE.say, '台词')
  const laneBeat = lane(LANE.beat, '画面')
  const bars = (list: [number, number][], y: number, cls: string) =>
    list.map(([a, len]) => {
      const el = at(h('div', { class: cls }), px(a), y)
      el.style.width = `${(X1 - X0) * len}px`
      L.append(el)
      return el
    })
  const says = bars(SAYS, LANE.say, 'tl-say')
  const beats = bars(BEATS, LANE.beat, 'tl-beat')

  // ── 播放头（时间游标）──
  const head = at(h('div', { class: 'tl-head' }, [h('i')]), X0, TY - 70)
  head.style.height = `${LANE.beat + 46 - (TY - 70)}px`
  L.append(head)

  // ── d.say() / d.beat() 和指向车道的箭头 ──
  const sayChip = chip(L, 'd.say(…)', 640, 236, { cls: 'mono tl-code tl-code-say' })
  const beatChip = chip(L, 'd.beat(…)', 1200, 236, { cls: 'mono tl-code tl-code-beat' })
  const aSay = arrow(svg, 640, 276, 640, LANE.say - 22, { color: SEM.say, head: 14 })
  const aBeat = arrow(svg, 1200, 276, 1200, LANE.beat - 22, { color: SEM.beat, head: 14 })

  // ── 胶片：逐帧导出，每一格里的小方块往前挪一点 ──
  const frames = Array.from({ length: FR.n }, (_, i) => {
    const dot = h('i')
    const k = i / (FR.n - 1)
    Object.assign(dot.style, { left: `${10 + (FR.w - 36) * k}px`, top: `${FR.h / 2 - 9 - Math.sin(k * Math.PI) * 14}px` })
    const f = at(h('div', { class: 'tl-frame' }, [dot]), X0 + i * (FR.w + FR.gap), FR.y)
    L.append(f)
    return f
  })
  const counter = at(h('div', { class: 'tl-count', text: '0' }), 1580, FR.y - 6)
  L.append(counter)
  const counterL = label(L, '帧 = 1 秒', 1580, FR.y + 74, { cls: 'tl-count-l' })

  hide(track, segs.flat(), laneSay, laneBeat, says, beats, head, sayChip, beatChip, frames, counter, counterL)

  d.chapter({
    id: 'timeline',
    title: '一条时间轴',
    step: '时间轴',
    question: '动画是怎么排出来的？',
    verb: 'Scheduling',
    banner: 'TIMELINE',
    layer: L,
  })

  // ── 1. 轨道、四章、两条车道依次出现 ──
  d.say('整支片子只有一条 {o:GSAP 时间轴}：每句台词、每个画面，都排在上面。', (t, w) => {
    const t0 = Math.max(w('GSAP'), t + 0.9) // 等章节大字收起
    set(tl, track, { autoAlpha: 1 }, t0)
    tl.fromTo(track, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.out', immediateRender: false }, t0)
    sfx.at(t0, 'whoosh')
    segs.forEach(([seg, lab], i) => {
      popIn(tl, seg, t0 + 0.3 + i * 0.12, { from: 0.6 })
      fadeIn(tl, lab, t0 + 0.35 + i * 0.12, { y: 8 })
    })
    const s0 = Math.max(w('每句台词'), t0 + 0.8)
    fadeIn(tl, laneSay, s0, { y: 0 })
    popIn(tl, says, s0 + 0.1, { stagger: 0.05 })
    const b0 = Math.max(w('每个画面'), s0 + 0.5)
    fadeIn(tl, laneBeat, b0, { y: 0 })
    popIn(tl, beats, b0 + 0.1, { stagger: 0.04 })
    fadeIn(tl, head, b0 + 0.8, { y: 0 })
  })

  // ── 2. d.say() 排台词，d.beat() 排画面，游标一步步往后走 ──
  d.say(
    '场景按顺序调用 {q:d.say()} 和 {k:d.beat()}，时间游标就一路往后走。',
    (_, w) => {
      popIn(tl, sayChip, w('d.say()'))
      drawArrow(tl, aSay, w('d.say()') + 0.25)
      popIn(tl, beatChip, w('d.beat()'))
      drawArrow(tl, aBeat, w('d.beat()') + 0.25)
      const m0 = w('时间游标')
      ;[0.1, 0.2, 0.31, 0.45].forEach((p, i) => {
        tl.to(head, { x: px(p) - X0, duration: 0.28, ease: 'power2.out' }, m0 + i * 0.42)
        sfx.at(m0 + i * 0.42, 'tick', i)
      })
    },
    { min: 4.6 },
  )

  // ── 3. 随便 seek；逐帧截图，一秒 30 帧 ──
  d.say(
    '任何一刻都能 {o:seek} 过去：拖进度条、逐帧导出 MP4，画面都分毫不差。',
    (t, w) => {
      fadeOut(tl, [sayChip, beatChip], t + 0.1)
      hideArrow(tl, aSay, t + 0.1)
      hideArrow(tl, aBeat, t + 0.1)
      const k0 = w('seek')
      ;[0.82, 0.2, 0.64, 0.38].forEach((p, i) => {
        tl.to(head, { x: px(p) - X0, duration: 0.22, ease: 'power3.inOut' }, k0 + i * 0.32)
        sfx.at(k0 + i * 0.32, 'tick', i + 4)
      })
      const f0 = w('逐帧导出')
      frames.forEach((f, i) => {
        popIn(tl, f, f0 + i * 0.09, { from: 0.7 })
        sfx.at(f0 + i * 0.09, 'tick', i)
      })
      fadeIn(tl, [counter, counterL], f0, { y: 0 })
      countTo(tl, counter, 30, f0, { dur: 0.09 * FR.n + 0.2 })
      clawd.face(tl, 'happy', w('分毫不差'))
      clawd.face(tl, 'normal', w('分毫不差') + 1.6)
    },
    { min: 5.2 },
  )
  d.end(L)
}
