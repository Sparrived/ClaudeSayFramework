import { gsap } from 'gsap'
import { h, rand, set } from './dom'
import { C, diverge, heat, luma } from './colors'
import type { Mat } from './linalg'

type TL = gsap.core.Timeline

/** 格子里数字的颜色：亮格子（比如热度色带的亮黄端）用深色字，暗格子用浅色字。深色、亮色主题都成立 */
function inkOn(bg: string) {
  const [dark, light] = luma(C.ink) < luma(C.fg) ? [C.ink, C.fg] : [C.fg, C.ink]
  return luma(bg) > 0.62 ? dark : light
}

export interface HeatOptions {
  /** 位置：默认 (x, y) 是整个矩阵的中心；anchor = 'tl' 时是左上角 */
  x: number
  y: number
  anchor?: 'c' | 'tl'
  /** 格子边长与间隙（px） */
  cell?: number
  gap?: number
  /** 有正有负的矩阵（梯度、扰动）用发散色带，否则用顺序色带 */
  signed?: boolean
  /** 颜色归一化的分母；默认取矩阵里绝对值最大的数 */
  scale?: number
  /** 自定义取色（覆盖 signed / scale） */
  color?: (v: number) => string
  /** 在格子里写数字：true 用默认格式，也可以传格式化函数 */
  numbers?: boolean | ((v: number) => string)
  /** 两侧画上矩阵的方括号 */
  brackets?: boolean
  cls?: string
}

export interface Heat {
  el: HTMLDivElement
  cells: HTMLDivElement[][]
  rows: number
  cols: number
  cell: number
  gap: number
  /** 矩阵左上角与尺寸（舞台坐标） */
  left: number
  top: number
  w: number
  h: number
  /** 当前取色函数（paint 时沿用） */
  color: (v: number) => string
  fmt: ((v: number) => string) | null
  /** 第 i 行第 j 列格子中心的舞台坐标 */
  at(i: number, j: number): { x: number; y: number }
}

const defaultFmt = (v: number) => (Math.abs(v) < 1e-9 ? '0' : Number.isInteger(v) ? String(v) : v.toFixed(1))

function picker(vals: Mat, o: HeatOptions) {
  if (o.color) return o.color
  const s = o.scale ?? (vals.reduce((m, r) => Math.max(m, ...r.map(Math.abs)), 0) || 1)
  return o.signed ? (v: number) => diverge(v / s) : (v: number) => heat(v / s)
}

/**
 * 热力图：每个格子是一个 div，颜色、数字都能在时间轴上补间。
 * 用来画注意力矩阵 A、梯度 ∇𝓛、扰动 ΔA，以及 3×3 的小算例。
 */
export function heatmap(parent: HTMLElement, vals: Mat, o: HeatOptions): Heat {
  const rows = vals.length
  const cols = vals[0].length
  const cell = o.cell ?? 22
  const gap = o.gap ?? 2
  const w = cols * cell + (cols - 1) * gap
  const hh = rows * cell + (rows - 1) * gap
  const left = o.anchor === 'tl' ? o.x : o.x - w / 2
  const top = o.anchor === 'tl' ? o.y : o.y - hh / 2
  const color = picker(vals, o)
  const fmt = o.numbers ? (typeof o.numbers === 'function' ? o.numbers : defaultFmt) : null

  const el = h('div', { class: `heat ${o.brackets ? 'heat-br' : ''} ${o.cls ?? ''}` })
  Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${hh}px` })
  if (fmt) el.style.fontSize = `${Math.round(cell * 0.4)}px`
  const cells = vals.map((r, i) =>
    r.map((v, j) => {
      const c = h('div', { class: 'hc', text: fmt ? fmt(v) : null })
      Object.assign(c.style, {
        left: `${j * (cell + gap)}px`,
        top: `${i * (cell + gap)}px`,
        width: `${cell}px`,
        height: `${cell}px`,
        backgroundColor: color(v),
      })
      if (fmt) c.style.color = inkOn(color(v))
      el.append(c)
      return c
    }),
  )
  parent.append(el)
  return {
    el,
    cells,
    rows,
    cols,
    cell,
    gap,
    left,
    top,
    w,
    h: hh,
    color,
    fmt,
    at: (i, j) => ({ x: left + j * (cell + gap) + cell / 2, y: top + i * (cell + gap) + cell / 2 }),
  }
}

/** 把格子的颜色（和数字）补间到新的矩阵 vals；byRow 时一行一行地刷过去 */
export function paint(
  tl: TL,
  hm: Heat,
  vals: Mat,
  t: number,
  { dur = 0.6, stagger = 0, color = hm.color }: { dur?: number; stagger?: number; color?: (v: number) => string } = {},
) {
  hm.cells.forEach((r, i) =>
    r.forEach((c, j) => {
      const s = t + stagger * (i + j)
      const bg = color(vals[i][j])
      tl.to(c, { backgroundColor: bg, duration: dur, ease: 'power1.inOut' }, s)
      if (!hm.fmt) return
      tl.to(c, { color: inkOn(bg), duration: dur, ease: 'power1.inOut' }, s)
      // 用 TextPlugin 换数字：直接补间 textContent 的话，GSAP 会把 '0.0' 当成数字 0 写回去，尾巴上的 0 就丢了
      set(tl, c, { text: hm.fmt(vals[i][j]) }, s + dur / 2)
    }),
  )
  return t + dur + stagger * (hm.rows + hm.cols - 2)
}

/**
 * 格子依次出现。
 *  'diag'：从左上角沿对角线扫开；'rows'：一行一行；'random'：随机闪现；'all'：一起淡入
 */
export function revealHeat(
  tl: TL,
  hm: Heat,
  t: number,
  { mode = 'diag', dur = 0.7 }: { mode?: 'diag' | 'rows' | 'random' | 'all'; dur?: number } = {},
) {
  set(tl, hm.el, { autoAlpha: 1 }, t)
  const all = hm.cells.flat()
  const delay = (i: number, j: number) => {
    switch (mode) {
      case 'diag':
        return ((i + j) / Math.max(1, hm.rows + hm.cols - 2)) * dur
      case 'rows':
        return (i / Math.max(1, hm.rows - 1)) * dur
      case 'random':
        return rand(i * 131 + j * 17 + hm.rows) * dur
      default:
        return 0
    }
  }
  hm.cells.forEach((r, i) =>
    r.forEach((c, j) => {
      tl.fromTo(c, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)', immediateRender: false }, t + delay(i, j))
    }),
  )
  if (!all.length) return t
  return t + dur + 0.25
}

/** 构建期：把热力图整体（连同所有格子）设成隐藏，等 revealHeat 再出现 */
export function hideHeat(hm: Heat) {
  gsap.set(hm.el, { autoAlpha: 0 })
  gsap.set(hm.cells.flat(), { autoAlpha: 0 })
}
