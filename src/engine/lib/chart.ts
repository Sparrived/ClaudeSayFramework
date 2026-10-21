import { gsap } from 'gsap'
import * as d3 from 'd3'
import { s, set } from './dom'
import { C } from './colors'

type TL = gsap.core.Timeline

/** 绘图区（舞台坐标）：左上角 + 宽高 */
export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

export interface Plot {
  svg: SVGSVGElement
  /** 这张图的所有元素都放在这个组里，整体淡入淡出用它 */
  g: SVGGElement
  /** 坐标轴、刻度、网格、轴标题（不含数据） */
  axes: SVGGElement
  f: Frame
  sx: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>
  sy: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>
  /** 数据坐标 → 舞台坐标 */
  px(x: number, y: number): [number, number]
}

export interface PlotOptions {
  x: [number, number]
  y: [number, number]
  xTicks?: number[]
  yTicks?: number[]
  xFmt?: (v: number) => string
  yFmt?: (v: number) => string
  xLabel?: string
  yLabel?: string
  /** 横轴用对数刻度 */
  xLog?: boolean
  /** 纵轴用对数刻度（跨好几个数量级的量：增长倍数、计算量、显存……）；y 的范围必须大于 0 */
  yLog?: boolean
  grid?: boolean
  /** 只画横轴（柱状图常用） */
  noYAxis?: boolean
}

const fmtDefault = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''))

/**
 * 一张二维坐标图（用 d3 的比例尺算位置，元素都是 SVG，动画交给 GSAP）。
 * svg 一般是 viz.fx(layer) 返回的那张铺满舞台的画布。
 */
export function plot(svg: SVGSVGElement, f: Frame, o: PlotOptions): Plot {
  const sx = o.xLog ? d3.scaleLog().domain(o.x).range([f.x, f.x + f.w]) : d3.scaleLinear().domain(o.x).range([f.x, f.x + f.w])
  const sy = o.yLog ? d3.scaleLog().domain(o.y).range([f.y + f.h, f.y]) : d3.scaleLinear().domain(o.y).range([f.y + f.h, f.y])
  const g = s('g', { class: 'plot' })
  const axes = s('g', { class: 'plot-axes' })
  g.append(axes)
  svg.append(g)
  const xFmt = o.xFmt ?? fmtDefault
  const yFmt = o.yFmt ?? fmtDefault
  const xTicks = o.xTicks ?? sx.ticks(6)
  const yTicks = o.yTicks ?? sy.ticks(5)

  if (o.grid !== false) {
    for (const v of yTicks) axes.append(s('line', { class: 'grid-line', x1: f.x, x2: f.x + f.w, y1: sy(v), y2: sy(v) }))
  }
  axes.append(s('line', { class: 'axis-line', x1: f.x, x2: f.x + f.w, y1: f.y + f.h, y2: f.y + f.h }))
  if (!o.noYAxis) axes.append(s('line', { class: 'axis-line', x1: f.x, x2: f.x, y1: f.y, y2: f.y + f.h }))
  for (const v of xTicks) {
    const x = sx(v)
    axes.append(s('line', { class: 'axis-line', x1: x, x2: x, y1: f.y + f.h, y2: f.y + f.h + 8 }))
    axes.append(s('text', { class: 'tick-text', x, y: f.y + f.h + 32, 'text-anchor': 'middle', text: xFmt(v) }))
  }
  if (!o.noYAxis)
    for (const v of yTicks) {
      axes.append(s('text', { class: 'tick-text', x: f.x - 14, y: sy(v) + 7, 'text-anchor': 'end', text: yFmt(v) }))
    }
  if (o.xLabel) axes.append(s('text', { class: 'axis-title', x: f.x + f.w / 2, y: f.y + f.h + 70, 'text-anchor': 'middle', text: o.xLabel }))
  if (o.yLabel) axes.append(s('text', { class: 'axis-title', x: f.x, y: f.y - 22, 'text-anchor': 'start', text: o.yLabel }))
  return { svg, g, axes, f, sx, sy, px: (x, y) => [sx(x), sy(y)] }
}

export type Curve = 'linear' | 'monotone' | 'natural' | 'step'
const CURVES: Record<Curve, d3.CurveFactory> = {
  linear: d3.curveLinear,
  monotone: d3.curveMonotoneX,
  natural: d3.curveNatural,
  step: d3.curveStepAfter,
}

/** 一条折线 / 曲线；初始是“没画出来”的（drawSVG 0%），用 drawLine 画出来 */
export function line(
  p: Plot,
  pts: [number, number][],
  { color = C.fg as string, width = 4, curve = 'linear' as Curve, dash = '', cls = '' } = {},
) {
  const gen = d3
    .line<[number, number]>()
    .x((d) => p.sx(d[0]))
    .y((d) => p.sy(d[1]))
    .curve(CURVES[curve])
  const path = s('path', {
    d: gen(pts) ?? '',
    fill: 'none',
    stroke: color,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-dasharray': dash || null,
    class: cls,
  })
  p.g.append(path)
  if (!dash) gsap.set(path, { drawSVG: '0%' })
  return path
}

export function drawLine(tl: TL, path: SVGPathElement, t: number, { dur = 1.2, ease = 'power1.inOut' } = {}) {
  tl.fromTo(path, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease, immediateRender: false }, t)
  return t + dur
}

/** 数据点（圆点），初始隐藏 */
export function marks(p: Plot, pts: [number, number][], { color = C.fg as string, r = 6, cls = '' } = {}) {
  const out = pts.map(([x, y]) => s('circle', { cx: p.sx(x), cy: p.sy(y), r, fill: color, class: cls }))
  p.g.append(...out)
  gsap.set(out, { autoAlpha: 0, transformOrigin: '50% 50%' })
  return out
}

/**
 * 竖直柱子：xs 是柱子中心的数据坐标，ys 是高度（数据坐标），width 是像素宽。
 * 初始高度为 0（scaleY 0），用 growBars 长出来。
 */
export function vbars(p: Plot, xs: number[], ys: number[], { width = 40, color = C.clawd as string | ((i: number) => string), cls = '' } = {}) {
  const base = p.sy(Math.max(p.sy.domain()[0], 0))
  const out = xs.map((x, i) => {
    const top = p.sy(ys[i])
    return s('rect', {
      x: p.sx(x) - width / 2,
      y: Math.min(top, base),
      width,
      height: Math.max(0.5, Math.abs(base - top)),
      rx: 3,
      fill: typeof color === 'function' ? color(i) : color,
      class: cls,
    })
  })
  p.g.append(...out)
  gsap.set(out, { scaleY: 0, transformOrigin: '50% 100%' })
  return out
}

export function growBars(tl: TL, rects: SVGRectElement[], t: number, { dur = 0.6, stagger = 0.06 } = {}) {
  tl.fromTo(rects, { scaleY: 0 }, { scaleY: 1, duration: dur, ease: 'power3.out', stagger, immediateRender: false }, t)
  return t + dur + stagger * (rects.length - 1)
}

/** 把柱子补间到新的高度（数据坐标）——直方图变形就靠它 */
export function setBars(tl: TL, p: Plot, rects: SVGRectElement[], ys: number[], t: number, { dur = 0.8, ease = 'power2.inOut' } = {}) {
  const base = p.sy(Math.max(p.sy.domain()[0], 0))
  rects.forEach((r, i) => {
    const top = p.sy(ys[i])
    tl.to(r, { attr: { y: Math.min(top, base), height: Math.max(0.5, Math.abs(base - top)) }, duration: dur, ease }, t)
  })
  return t + dur
}

/**
 * 直方图：在 [lo, hi] 上等宽分成 bins 份，props[k] 是第 k 个箱子的高度（数据坐标）。
 * 柱子之间留 1px 缝。返回柱子数组，初始高度为 0。
 */
export function histBars(p: Plot, lo: number, hi: number, props: number[], { color = C.clawd as string, cls = '' } = {}) {
  const bw = (hi - lo) / props.length
  const pxW = Math.abs(p.sx(lo + bw) - p.sx(lo)) - 1
  return vbars(
    p,
    props.map((_, k) => lo + (k + 0.5) * bw),
    props,
    { width: Math.max(1, pxW), color, cls },
  )
}

/** 水平条形图的一根条（左端对齐在 x0），长度用 scaleX 动画；返回 rect */
export function hbar(svg: SVGSVGElement | SVGGElement, x0: number, y: number, len: number, thick: number, color: string, cls = '') {
  const r = s('rect', { x: x0, y: y - thick / 2, width: Math.max(0.5, len), height: thick, rx: 4, fill: color, class: cls })
  svg.append(r)
  gsap.set(r, { scaleX: 0, transformOrigin: '0% 50%' })
  return r
}

export function growH(tl: TL, rects: SVGRectElement | SVGRectElement[], t: number, { dur = 0.7, stagger = 0.08 } = {}) {
  tl.fromTo(rects, { scaleX: 0 }, { scaleX: 1, duration: dur, ease: 'power3.out', stagger, immediateRender: false }, t)
  return t + dur
}

/** 一段平滑曲线的 path（给钟形曲线、损失曲线这类“函数图像”用），返回 d 字符串 */
export function curvePath(p: Plot, f: (x: number) => number, lo: number, hi: number, n = 120) {
  const pts: [number, number][] = d3.range(n + 1).map((i) => {
    const x = lo + ((hi - lo) * i) / n
    return [p.sx(x), p.sy(f(x))]
  })
  return d3.line().curve(d3.curveLinear)(pts) ?? ''
}

/** 整张图（坐标轴 + 数据）一起淡入 */
export function showPlot(tl: TL, p: Plot, t: number, dur = 0.4) {
  set(tl, p.g, { autoAlpha: 1 }, t)
  tl.fromTo(p.axes, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur, immediateRender: false }, t)
  return t + dur
}
