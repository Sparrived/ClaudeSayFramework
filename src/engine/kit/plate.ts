import './plate.css'
import { gsap } from 'gsap'
import { h, hide, s } from '../lib/dom'
import { fadeIn, fadeOut, label } from '../lib/viz'
import { rich } from '../ui/bubble'
import { C } from '../lib/colors'
import { STAGE } from '../layout'

/**
 * 全幅图版：一块覆盖画面可用区的圆角“实验台”，里面放可推拉的 cam 组，
 * 上面盖一层不随镜头缩放的 hud 组；标注、比例尺、印章默认都是构建期隐藏，
 * 由场景把显示/隐藏排进时间轴。
 *
 * 这套东西来自「吃菠萝为什么舌头痛」那期：四章共用一块图版，
 * 镜头围绕图版中心推拉，HUD 和引线保持固定大小。
 */

const DEFAULT_PAPER = '#FFFDF7'
const DEFAULT_INK = '#1B2140'

/** 默认图版：铺满 STAGE 的可用区域，四周留 64px，和全片的对话壳对齐 */
export const DEFAULT_PLATE = {
  x: STAGE.left,
  y: STAGE.top,
  w: STAGE.right - STAGE.left,
  h: STAGE.bottom - STAGE.top,
  r: 24,
} as const

export interface PlateOptions {
  /** 每块图版一个唯一 id，用来生成 clipPath */
  id: string
  x?: number
  y?: number
  w?: number
  h?: number
  r?: number
  fill?: string
  stroke?: string
  /** 是否在图版后面加 HTML 投影；默认 true */
  shadow?: boolean
}

export interface Plate {
  svg: SVGSVGElement
  /** 图版底、边框、clip 与 hud */
  plate: SVGGElement
  /** 镜头组：只装画面，不装 HUD */
  cam: SVGGElement
  /** 固定在图版上的 HUD（比例尺、角标、引线） */
  hud: SVGGElement
  /** HTML 投影；shadow=false 时没有 */
  under?: HTMLElement
  clipId: string
  /** 图版在舞台坐标里的矩形，camera 以它的中心为原点 */
  box: { x: number; y: number; w: number; h: number; r: number }
}

let uid = 0

/** 建一块图版。所有场景都从这一句开始。 */
export function plate(L: HTMLElement, o: PlateOptions): Plate {
  const box = {
    x: o.x ?? DEFAULT_PLATE.x,
    y: o.y ?? DEFAULT_PLATE.y,
    w: o.w ?? DEFAULT_PLATE.w,
    h: o.h ?? DEFAULT_PLATE.h,
    r: o.r ?? DEFAULT_PLATE.r,
  }
  const fill = o.fill ?? DEFAULT_PAPER
  const stroke = o.stroke ?? DEFAULT_INK
  const clipId = `plate-clip-${o.id}-${++uid}`

  const svg = s('svg', { class: 'fx plate-fx', width: 1920, height: 1080, viewBox: '0 0 1920 1080' })
  const defs = s('defs', {}, [
    s('clipPath', { id: clipId }, [s('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: box.r })]),
  ])
  const base = s('rect', {
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    rx: box.r,
    fill,
    stroke,
    'stroke-width': 4,
  })
  const clip = s('g', { 'clip-path': `url(#${clipId})` })
  const cam = s('g', { class: 'cam' })
  clip.append(cam)
  const hud = s('g', { class: 'hud' })
  const outline = s('rect', {
    x: box.x + 1,
    y: box.y + 1,
    width: box.w - 2,
    height: box.h - 2,
    rx: box.r - 1,
    fill: 'none',
    stroke: 'rgba(255,255,255,0.55)',
    'stroke-width': 2,
  })
  const plate = s('g', { class: 'plate' }, [base, clip, hud, outline])
  svg.append(defs, plate)

  let under: HTMLElement | undefined
  if (o.shadow !== false) {
    under = h('div', { class: 'plate-under' })
    Object.assign(under.style, {
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${box.w}px`,
      height: `${box.h}px`,
      borderRadius: `${box.r}px`,
    })
    L.append(under)
  }

  L.append(svg)
  gsap.set(cam, { svgOrigin: `${box.x + box.w / 2} ${box.y + box.h / 2}`, scale: 1 })
  return { svg, plate, cam, hud, under, clipId, box }
}

/** 图版入场：图版和投影一起从下方轻轻升起 */
export function enterPlate(tl: gsap.core.Timeline, st: Plate, t: number, dur = 0.5) {
  tl.fromTo(st.plate, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: dur, ease: 'power2.out', immediateRender: false }, t)
  if (st.under) {
    tl.fromTo(st.under, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: dur, ease: 'power2.out', immediateRender: false }, t)
  }
}

/** 推拉镜头。pivot 固定在图版中心，避免每章各算一套原点。 */
export function camera(
  tl: gsap.core.Timeline,
  cam: SVGGElement,
  { from, to, at, dur = 0.7, ease = 'power2.inOut' }: { from?: number; to: number; at: number; dur?: number; ease?: string },
) {
  const vars = { scale: to, duration: dur, ease, immediateRender: false }
  if (from !== undefined) tl.fromTo(cam, { scale: from }, vars, at)
  else tl.to(cam, vars, at)
}

export interface Callout {
  root: HTMLElement
  line: SVGLineElement
  dot: SVGCircleElement
  anchorDot: SVGCircleElement
}

/**
 * 引线标注：端点小圆 + 细线 + 白底标签。
 * side='r' 标签在目标右侧；side='l' 在左侧。坐标是舞台坐标。
 * 用 calloutShow(tl, c, t) / calloutHide(tl, c, t) 控制出现和消失。
 */
export function callout(
  L: HTMLElement,
  st: Plate,
  o: {
    at: [number, number]
    to: [number, number]
    text: string
    tone?: string
    side?: 'l' | 'r'
    onDark?: boolean
    cls?: string
  },
): Callout {
  const tone = o.tone ?? DEFAULT_INK
  const side = o.side ?? 'r'
  const root = label(L, '', o.to[0], o.to[1], { cls: `callout ${o.onDark ? 'on-dark' : ''} ${o.cls ?? ''}`, anchor: side === 'r' ? 'l' : 'r' })
  rich(o.text, root)
  root.style.borderColor = tone
  root.style.color = o.onDark ? '#FFFFFF' : DEFAULT_INK
  root.style.background = o.onDark ? 'rgba(11,23,41,0.92)' : 'rgba(255,253,247,0.96)'
  hide(root)

  const dot = s('circle', { cx: o.at[0], cy: o.at[1], r: 6, fill: tone, stroke: DEFAULT_PAPER, 'stroke-width': 2 })
  st.hud.append(dot)
  hide(dot)

  // 量出标签在舞台坐标系里的边缘，引线才能正好停在标签边上。
  // 用图版自己的 rect，而不是写死 #stage：图版可以在任意容器里。
  const sb = st.svg.getBoundingClientRect()
  const scale = sb.width / 1920 || 1
  const lb = root.getBoundingClientRect()
  const edgeX = side === 'r' ? (lb.left - sb.left) / scale - 4 : (lb.right - sb.left) / scale + 4
  const edgeY = (lb.top + lb.height / 2 - sb.top) / scale
  const line = s('line', {
    x1: o.at[0],
    y1: o.at[1],
    x2: edgeX,
    y2: edgeY,
    stroke: tone,
    'stroke-width': 2.5,
    'stroke-linecap': 'round',
    opacity: 0.8,
  })
  st.hud.append(line)
  gsap.set(line, { drawSVG: '0%', autoAlpha: 0 })
  const anchorDot = s('circle', { cx: edgeX, cy: edgeY, r: 4, fill: tone })
  st.hud.append(anchorDot)
  hide(anchorDot)

  return { root, line, dot, anchorDot }
}

/** 引出标注：画线、弹点、标签淡入 */
export function calloutShow(tl: gsap.core.Timeline, c: Callout, t: number, { dur = 0.35 } = {}) {
  // 必须把“显示”排进时间轴，不能在构建期直接 gsap.set，否则所有标注在片头就全亮了。
  tl.set([c.line, c.dot, c.anchorDot], { autoAlpha: 1 }, t)
  tl.to(c.line, { drawSVG: '100%', duration: dur, ease: 'power1.inOut', immediateRender: false }, t)
  tl.fromTo(c.dot, { scale: 0.2 }, { scale: 1, duration: 0.22, ease: 'back.out(3)', immediateRender: false }, t)
  tl.fromTo(c.anchorDot, { scale: 0.2 }, { scale: 1, duration: 0.18, ease: 'back.out(3)', immediateRender: false }, t + 0.05)
  fadeIn(tl, c.root, t + 0.08, { y: 6, dur: 0.3 })
  return t + dur
}

export function calloutHide(tl: gsap.core.Timeline, c: Callout, t: number) {
  fadeOut(tl, c.root, t, { dur: 0.2 })
  tl.to([c.line, c.dot, c.anchorDot], { autoAlpha: 0, duration: 0.2 }, t)
  return t + 0.2
}

/** 图版左上角的 HUD 小牌 */
export function hudChip(
  L: HTMLElement,
  text: string,
  x: number,
  y: number,
  { onDark = false, cls = '' }: { onDark?: boolean; cls?: string } = {},
) {
  const el = h('div', { class: `hud-chip ${onDark ? 'on-dark' : ''} ${cls}` })
  Object.assign(el.style, { left: `${x}px`, top: `${y}px` })
  rich(text, el)
  L.append(el)
  hide(el)
  return el
}

/** 图版里的小标签 */
export function tag(
  L: HTMLElement,
  text: string,
  x: number,
  y: number,
  { color = DEFAULT_INK, filled = false, onDark = false, cls = '' }: { color?: string; filled?: boolean; onDark?: boolean; cls?: string } = {},
) {
  const el = h('div', { class: `tag ${onDark ? 'on-dark' : ''} ${cls}` })
  Object.assign(el.style, {
    left: `${x}px`,
    top: `${y}px`,
    color: filled ? '#fff' : color,
    background: filled ? color : onDark ? 'rgba(11,23,41,0.8)' : 'rgba(255,253,247,0.9)',
    borderColor: color,
  })
  rich(text, el)
  L.append(el)
  hide(el)
  return el
}

/** 印章：“物理攻击”“不可逆”这类落在图版上的短语 */
export function stamp(
  L: HTMLElement,
  text: string,
  x: number,
  y: number,
  { color = C.red, rotate = -7 }: { color?: string; rotate?: number } = {},
) {
  const el = h('div', { class: 'stamp', text })
  Object.assign(el.style, { left: `${x}px`, top: `${y}px`, color, borderColor: color, transform: `rotate(${rotate}deg)` })
  L.append(el)
  hide(el)
  return el
}

/** 比例尺：一条有端点的短线 + 单位 */
export function scaleBar(
  L: HTMLElement,
  { x, y, w, text, color = DEFAULT_INK }: { x: number; y: number; w: number; text: string; color?: string },
) {
  const root = h('div', { class: 'scalebar' })
  Object.assign(root.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, color })
  const line = h('div', { class: 'scalebar-line' })
  line.style.background = color
  root.append(line, h('div', { class: 'scalebar-cap l' }), h('div', { class: 'scalebar-cap r' }), h('div', { class: 'scalebar-text', text }))
  L.append(root)
  hide(root)
  return root
}

/** 一句画面旁白（不是台词）：放在图版里 */
export function note(
  L: HTMLElement,
  text: string,
  x: number,
  y: number,
  { onDark = false, cls = '' }: { onDark?: boolean; cls?: string } = {},
) {
  const el = label(L, '', x, y, { cls: `plate-note ${onDark ? 'on-dark' : ''} ${cls}`, anchor: 'c' })
  rich(text, el)
  hide(el)
  return el
}

/** 构建期把路径藏起来，之后用 draw() 画出来 */
export function path(el: SVGPathElement) {
  gsap.set(el, { drawSVG: '0%' })
  return el
}

/** 把一段 SVG 路径画出来 */
export function draw(tl: gsap.core.Timeline, el: SVGPathElement, t: number, dur = 0.6) {
  tl.to(el, { drawSVG: '100%', duration: dur, ease: 'power1.inOut', immediateRender: false }, t)
  return t + dur
}
