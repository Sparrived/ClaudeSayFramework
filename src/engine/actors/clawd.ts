import { gsap } from 'gsap'
import { s, set } from '../lib/dom'
import { Actor, type ActorOptions, type ActorSizes, type Expr, type Look } from './actor'

type TL = gsap.core.Timeline

/**
 * Clawd —— Claude Code 启动界面里的橙色像素小人。
 *
 * 在终端里，它是用 Unicode “四分块”字符拼出来的（取自 Claude Code 欢迎界面）：
 *
 *      ▐▛███▜▌
 *     ▝▜█████▛▘
 *       ▘▘ ▝▝
 *
 * 每个字符格被切成 2×2 个四分块；终端字符格大约是 1:2 的竖长方形，
 * 所以每个四分块相当于 1 个像素宽、2 个像素高。decodeQuadrants() 按这个规则
 * 把上面的字符画还原成正方形像素点阵，得到 16×10 的精灵图：
 * 12×8 的身体、两只竖长的眼睛、左右各一节短手臂、四条细腿。
 */
export const TERMINAL_ART = [' ▐▛███▜▌', '▝▜█████▛▘', '  ▘▘ ▝▝']

/** Claude Code 主题里的 “claude” 色：rgb(215,119,87) */
export const CLAWD_ORANGE = '#D77757'
/** 终端里眼睛其实是“镂空”的，露出深色背景 */
export const CLAWD_EYE = '#191817'

// 四分块字符 → [左上, 右上, 左下, 右下]
const QUADRANTS: Record<string, [number, number, number, number]> = {
  ' ': [0, 0, 0, 0],
  '▘': [1, 0, 0, 0],
  '▝': [0, 1, 0, 0],
  '▖': [0, 0, 1, 0],
  '▗': [0, 0, 0, 1],
  '▀': [1, 1, 0, 0],
  '▄': [0, 0, 1, 1],
  '▌': [1, 0, 1, 0],
  '▐': [0, 1, 0, 1],
  '▚': [1, 0, 0, 1],
  '▞': [0, 1, 1, 0],
  '▛': [1, 1, 1, 0],
  '▜': [1, 1, 0, 1],
  '▙': [1, 0, 1, 1],
  '▟': [0, 1, 1, 1],
  '█': [1, 1, 1, 1],
}

/** 把四分块字符画解码成正方形像素点阵（'#' 为实心，'.' 为空），并裁掉四周空白 */
export function decodeQuadrants(lines: string[]): string[] {
  const cols = Math.max(...lines.map((l) => [...l].length)) * 2
  const quad: number[][] = []
  lines.forEach((line, r) => {
    quad[2 * r] = new Array(cols).fill(0)
    quad[2 * r + 1] = new Array(cols).fill(0)
    ;[...line].forEach((ch, i) => {
      const q = QUADRANTS[ch] ?? QUADRANTS['█']
      quad[2 * r][2 * i] = q[0]
      quad[2 * r][2 * i + 1] = q[1]
      quad[2 * r + 1][2 * i] = q[2]
      quad[2 * r + 1][2 * i + 1] = q[3]
    })
  })
  // 四分块是 1:2 的竖长方形 → 每一行展开成两行正方形像素
  const square = quad.flatMap((row) => [row, row])
  const used = (row: number[]) => row.some(Boolean)
  const top = square.findIndex(used)
  const bottom = square.length - 1 - [...square].reverse().findIndex(used)
  const colUsed = (c: number) => square.some((row) => row[c])
  let left = 0
  while (!colUsed(left)) left++
  let right = cols - 1
  while (!colUsed(right)) right--
  return square.slice(top, bottom + 1).map((row) =>
    row
      .slice(left, right + 1)
      .map((v) => (v ? '#' : '.'))
      .join(''),
  )
}

export const SPRITE = decodeQuadrants(TERMINAL_ART)
export const SPRITE_W = SPRITE[0].length // 16
export const SPRITE_H = SPRITE.length // 10

// 下面是从点阵里拆出来的部件坐标（单位：精灵像素），用于分别做动画
export const PARTS = {
  body: { x: 2, y: 0, w: 12, h: 8 },
  armL: { x: 0, y: 4, w: 2, h: 2 },
  armR: { x: 14, y: 4, w: 2, h: 2 },
  /** 两组交替迈步的腿：每侧各取一条 */
  legsA: [3, 10],
  legsB: [5, 12],
  legY: 8,
  legH: 2,
  /** 眼睛所在的列 */
  eyes: [4, 11],
  eyeY: 2,
  eyeH: 2,
} as const

/** Clawd —— Claude 系列的讲解员（小克） */
export class Clawd extends Actor {
  /** 在家（输入框上）14，片头迷你版 6（和终端里一样小），片尾卡 10，封面 30 */
  static readonly SIZES: ActorSizes = { home: 14, mini: 6, end: 10, cover: 30 }

  readonly sizes = Clawd.SIZES
  readonly upper: SVGGElement
  readonly eyes: SVGGElement
  readonly armL: SVGRectElement
  readonly armR: SVGRectElement
  readonly legsA: SVGRectElement[]
  readonly legsB: SVGRectElement[]
  readonly exprs: Record<Expr, SVGGElement>

  constructor(parent: HTMLElement, opts: ActorOptions) {
    super(parent, opts, {
      name: 'Clawd',
      color: CLAWD_ORANGE,
      w: SPRITE_W,
      h: SPRITE_H,
      shadow: [PARTS.body.w + 2, 1.1],
      props: { sweat: [14, -1], bang: [7, -7], ask: [6, -8], heart: [11, -6], note: [12, -8] },
    })

    const leg = (x: number) => s('rect', { x, y: PARTS.legY, width: 1, height: PARTS.legH, fill: CLAWD_ORANGE })
    this.legsA = PARTS.legsA.map(leg)
    this.legsB = PARTS.legsB.map(leg)

    const b = PARTS.body
    const body = s('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: CLAWD_ORANGE })
    const arm = (p: { x: number; y: number; w: number; h: number }) =>
      s('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: CLAWD_ORANGE })
    this.armL = arm(PARTS.armL)
    this.armR = arm(PARTS.armR)

    const [e1, e2] = PARTS.eyes
    const eyeGroup = (rects: [number, number, number, number][]) => {
      const g = s('g', { fill: CLAWD_EYE })
      for (const [x, y, ww, hh] of rects) g.append(s('rect', { x, y, width: ww, height: hh }))
      return g
    }
    this.exprs = {
      normal: eyeGroup([
        [e1, PARTS.eyeY, 1, PARTS.eyeH],
        [e2, PARTS.eyeY, 1, PARTS.eyeH],
      ]),
      // ^ ^
      happy: eyeGroup(
        [e1, e2].flatMap((c) => [
          [c - 1, 3, 1, 1],
          [c, 2, 1, 1],
          [c + 1, 3, 1, 1],
        ]) as [number, number, number, number][],
      ),
      // 吃惊：眼睛拉长
      wide: eyeGroup([
        [e1, 1, 1, 3],
        [e2, 1, 1, 3],
      ]),
      // 眯眼 – –
      closed: eyeGroup([
        [e1 - 1, 3, 3, 1],
        [e2 - 1, 3, 3, 1],
      ]),
    }
    this.eyes = s('g', { class: 'clawd-eyes' }, Object.values(this.exprs))
    this.upper = s('g', { class: 'clawd-upper' }, [body, this.armL, this.armR, this.eyes])
    this.art.append(s('g', {}, [...this.legsA, ...this.legsB]), this.upper)

    gsap.set(this.eyes, { svgOrigin: '8 4' })
    for (const [k, g] of Object.entries(this.exprs)) gsap.set(g, { autoAlpha: k === 'normal' ? 1 : 0 })
  }

  /** 两组腿交替抬起 */
  steps(tl: TL, t: number, dur: number, step = 0.1) {
    const n = Math.max(2, Math.round(dur / step))
    const dt = dur / n
    for (let i = 0; i < n; i++) {
      set(tl, this.legsA, { attr: { height: i % 2 ? 2 : 1 } }, t + i * dt)
      set(tl, this.legsB, { attr: { height: i % 2 ? 1 : 2 } }, t + i * dt)
    }
    set(tl, [...this.legsA, ...this.legsB], { attr: { height: PARTS.legH } }, t + dur)
  }

  blink(tl: TL, t: number) {
    set(tl, this.eyes, { scaleY: 0.5 }, t)
    set(tl, this.eyes, { scaleY: 1 }, t + 0.12)
    return t + 0.12
  }

  look(tl: TL, dir: Look, t: number) {
    const [x, y] = { c: [0, 0], l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir]
    set(tl, this.eyes, { x, y }, t)
    return t
  }

  face(tl: TL, kind: Expr, t: number) {
    for (const [k, g] of Object.entries(this.exprs)) set(tl, g, { autoAlpha: k === kind ? 1 : 0 }, t)
    return t
  }

  /** 挥手 */
  wave(tl: TL, t: number, cycles = 3) {
    const dt = 0.15
    for (let i = 0; i < cycles * 2; i++) set(tl, this.armR, { y: i % 2 ? -1 : -3 }, t + i * dt)
    const end = t + cycles * 2 * dt
    set(tl, this.armR, { y: 0 }, end)
    return end
  }

  /** 双手举高 */
  cheer(tl: TL, t: number, dur = 1) {
    set(tl, [this.armL, this.armR], { y: -3 }, t)
    set(tl, [this.armL, this.armR], { y: 0 }, t + dur)
    return t + dur
  }

  /** 封面：直视观众，举起右手。它的辨识度来自“身体两侧中段各一个小突起 + 竖长的眼睛”，所以只抬一只手，保住这个轮廓 */
  pose() {
    gsap.set(this.armR, { y: -3 })
  }

  /** 说话时两只小手交替上下 */
  talk(tl: TL, t: number, dur: number) {
    const dt = 0.15
    const n = Math.floor(dur / dt)
    for (let i = 0; i < n; i++) {
      set(tl, this.armL, { y: i % 2 ? 0 : -1 }, t + i * dt)
      set(tl, this.armR, { y: i % 2 ? -1 : 0 }, t + i * dt)
    }
    set(tl, [this.armL, this.armR], { y: 0 }, t + n * dt)
    return t + n * dt
  }
}
