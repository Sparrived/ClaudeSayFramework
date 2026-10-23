import { h } from './dom'
import { C, rgba } from './colors'
import { H, W } from '../layout'
import { hash, noise } from './noise'

/**
 * Canvas 2D 画布和几种按时间画出来的光效、粒子：光晕、光束、漂浮的尘埃、雨和涟漪、景深光斑、星星。
 *
 * 画布不进时间轴，靠重绘钩子：d.canvas(L, (ctx, t) => …) 每次 seek / 播放推进之后，
 * 按时间轴的当前时刻 t 把整张图重画一遍（见 Director.canvas）。所以这里的每个效果都是
 * “t + 种子 → 画面”的纯函数：不存状态、不用 Math.random，拖进度条和逐帧导出得到同一帧。
 * 几百个粒子一帧也就零点几毫秒，不拖慢导出。
 *
 * 颜色一律传 #rrggbb（要拆成 rgba）；不传就用当前主题的颜色（在函数里读 C，不在模块顶层存）。
 * 合成方式 op 只作用在画布内部（两团光叠在一起变亮），画布整体仍按普通的透明度盖在下面的 DOM 上；
 * 亮色主题（DS 系列）的白底上，浅色的光几乎看不出来，换深一点的颜色、把 alpha 调高。
 */

type Ctx = CanvasRenderingContext2D
/** 范围：[x0, y0, x1, y1]，舞台坐标 */
export type Area = [number, number, number, number]
/** 遮罩：给一个点，返回 0–1 的亮度（比如只在光束里亮）；beamMask() 能现做一个 */
export type Mask = (x: number, y: number) => number

const TAU = Math.PI * 2
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const FULL: Area = [0, 0, W, H]

export interface Canvas {
  el: HTMLCanvasElement
  ctx: Ctx
  /** 清空整张画布（变换、透明度、合成方式一并复位） */
  clear(): void
}

/**
 * 铺满舞台的 Canvas 2D 画布（1920×1080，坐标就是舞台坐标）。默认垫在图层最底下，top: true 放到最上面。
 * 一般不直接用它，用 d.canvas(layer, draw)：建画布 + 登记重绘钩子一步到位。
 */
export function canvas(layer: HTMLElement, { top = false } = {}): Canvas {
  const el = h('canvas', { class: 'cv', width: W, height: H })
  if (top) layer.append(el)
  else layer.prepend(el)
  const ctx = el.getContext('2d')!
  const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.filter = 'none'
    ctx.clearRect(0, 0, W, H)
  }
  return { el, ctx, clear }
}

// ── 光 ──────────────────────────────────────────

export interface HaloOptions {
  color?: string
  alpha?: number
  /** 压扁成椭圆：竖直半径 = r × squash（地上的一摊灯光用 0.25 左右） */
  squash?: number
  op?: GlobalCompositeOperation
}

/** 光晕：以 (x, y) 为中心、半径 r 的一团径向渐变的光，中心最亮，边缘淡到透明 */
export function halo(ctx: Ctx, x: number, y: number, r: number, o: HaloOptions = {}) {
  const { color = C.clawd, alpha = 1, squash = 1, op = 'lighter' } = o
  if (alpha <= 0 || r <= 0) return
  ctx.save()
  ctx.globalCompositeOperation = op
  ctx.translate(x, y)
  if (squash !== 1) ctx.scale(1, squash)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  g.addColorStop(0, rgba(color, alpha))
  g.addColorStop(0.25, rgba(color, alpha * 0.45))
  g.addColorStop(0.6, rgba(color, alpha * 0.12))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.restore()
}

export interface BeamOptions {
  /** 光束末端的宽度 */
  spread?: number
  /** 光源处的宽度（0 = 一个点） */
  start?: number
  color?: string
  alpha?: number
  /** 边缘的模糊（像素） */
  blur?: number
  op?: GlobalCompositeOperation
}

/** 光束的四个角：光源两侧、末端两侧 */
function beamQuad(from: [number, number], to: [number, number], spread: number, start: number) {
  const [x0, y0] = from
  const [x1, y1] = to
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const nx = -(y1 - y0) / len
  const ny = (x1 - x0) / len
  return [
    [x0 + (nx * start) / 2, y0 + (ny * start) / 2],
    [x1 + (nx * spread) / 2, y1 + (ny * spread) / 2],
    [x1 - (nx * spread) / 2, y1 - (ny * spread) / 2],
    [x0 - (nx * start) / 2, y0 - (ny * start) / 2],
  ]
}

/** 体积光：从光源 from 照向 to 的一束光，越往外越宽、越淡（窗缝里的阳光、舞台的追光、手电筒） */
export function beam(ctx: Ctx, from: [number, number], to: [number, number], o: BeamOptions = {}) {
  const { spread = 360, start = 0, color = C.clawdHi, alpha = 0.5, blur = 6, op = 'lighter' } = o
  if (alpha <= 0) return
  ctx.save()
  ctx.globalCompositeOperation = op
  const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1])
  g.addColorStop(0, rgba(color, alpha))
  g.addColorStop(0.5, rgba(color, alpha * 0.35))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  if (blur > 0) ctx.filter = `blur(${blur}px)`
  ctx.beginPath()
  for (const [x, y] of beamQuad(from, to, spread, start)) ctx.lineTo(x, y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * 和 beam() 同形状的遮罩：光束里是 1（边缘 soft 那一截渐渐变暗，越往末端越暗），光束外是 0。
 * 交给 motes / rain 的 mask，就只有落在光里的尘埃、雨丝会亮。
 */
export function beamMask(
  from: [number, number],
  to: [number, number],
  { spread = 360, start = 0, soft = 0.4 }: { spread?: number; start?: number; soft?: number } = {},
): Mask {
  const [x0, y0] = from
  const dx = to[0] - x0
  const dy = to[1] - y0
  const len2 = dx * dx + dy * dy || 1
  const len = Math.sqrt(len2)
  return (x, y) => {
    const u = ((x - x0) * dx + (y - y0) * dy) / len2
    if (u <= 0 || u >= 1) return 0
    const half = lerp(start, spread, u) / 2 || 1
    const dist = Math.abs((x - x0) * dy - (y - y0) * dx) / len
    const edge = clamp((1 - dist / half) / soft)
    return edge * (1 - u)
  }
}

// ── 粒子 ────────────────────────────────────────

export interface MotesOptions {
  seed?: number
  n?: number
  area?: Area
  color?: string
  alpha?: number
  /** 粒子半径（实际在 0.5–1.7 倍之间） */
  size?: number
  /** 左右上下飘的幅度（像素） */
  drift?: number
  /** 往上浮的速度（像素 / 秒；负数往下落），飘出 area 顶上就从底下再进来 */
  rise?: number
  /** 闪烁的程度：0 不闪，1 亮度在一半到全亮之间起伏 */
  twinkle?: number
  mask?: Mask
  op?: GlobalCompositeOperation
}

/** 漂浮的微粒：灰尘、光点、萤火虫。每颗的位置由种子定下，再随噪声慢慢漂；mask 决定哪里亮 */
export function motes(ctx: Ctx, t: number, o: MotesOptions = {}) {
  const { seed = 9, n = 120, area = FULL, color = C.clawdHi, alpha = 0.7, size = 2.2, drift = 18, rise = 6, twinkle = 1, mask, op = 'lighter' } = o
  const [x0, y0, x1, y1] = area
  const hh = y1 - y0
  ctx.save()
  ctx.globalCompositeOperation = op
  for (let i = 0; i < n; i++) {
    const id = seed * 131 + i
    const bx = lerp(x0, x1, hash(id))
    const by = y0 + ((((hash(id + 1) * hh - t * rise * (0.5 + hash(id + 2))) % hh) + hh) % hh)
    const x = bx + noise(t * 0.17 + i * 3.7, seed) * drift * 3
    const y = by + noise(t * 0.13 + i * 5.3, seed + 5) * drift * 2
    let a = alpha * (0.35 + 0.65 * hash(id + 3)) * (1 - twinkle * 0.5 + twinkle * 0.5 * Math.sin(t * (1 + 2 * hash(id + 4)) + i))
    if (mask) a *= clamp(mask(x, y))
    if (a <= 0.01) continue
    ctx.fillStyle = rgba(color, a)
    ctx.beginPath()
    ctx.arc(x, y, size * (0.5 + 1.2 * hash(id + 5)), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

export interface RainOptions {
  seed?: number
  n?: number
  /** 雨落在这个范围里（画布会裁到这个矩形） */
  area?: Area
  /** 下落速度（像素 / 秒） */
  speed?: number
  /** 雨丝长度 */
  len?: number
  /** 相对竖直方向的倾角（弧度，正数往右下斜） */
  angle?: number
  width?: number
  color?: string
  alpha?: number
  /** 分几层远近：越近越快、越长、越亮 */
  depth?: number
  mask?: Mask
}

/** 雨：一根根斜着落下的雨丝，分几层远近；mask 可以只画落在光里的雨（路灯下的雨丝） */
export function rain(ctx: Ctx, t: number, o: RainOptions = {}) {
  const { seed = 1, n = 400, area = FULL, speed = 1900, len = 46, angle = 0.12, width = 1.6, color = C.fg, alpha = 0.35, depth = 3, mask } = o
  const [x0, y0, x1, y1] = area
  const span = y1 - y0 + len * 2
  const tan = Math.tan(angle)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, x1 - x0, y1 - y0)
  ctx.clip()
  ctx.lineCap = 'round'
  const per = Math.floor(n / depth)
  for (let L = 0; L < depth; L++) {
    const k = (L + 1) / depth
    ctx.lineWidth = width * (0.5 + k * 0.8)
    ctx.strokeStyle = rgba(color, alpha * (0.35 + 0.65 * k))
    ctx.beginPath()
    for (let i = 0; i < per; i++) {
      const id = seed * 10007 + L * 1009 + i
      const s = (0.75 + 0.5 * hash(id + 7)) * speed * (0.55 + 0.45 * k)
      const ll = len * (0.5 + 0.7 * k) * (0.7 + 0.6 * hash(id + 11))
      const y = y0 - len + ((hash(id + 3) * span + t * s) % span)
      const x = x0 + hash(id) * (x1 - x0 + span * tan) - span * tan * 0.5 + (y - y0) * tan
      if (mask && mask(x, y) <= 0.02) continue
      ctx.moveTo(x, y)
      ctx.lineTo(x - ll * tan, y - ll)
    }
    ctx.stroke()
  }
  ctx.restore()
}

export interface RipplesOptions {
  seed?: number
  n?: number
  /** 地面的范围：越靠下（越近）的涟漪越大越亮 */
  area?: Area
  color?: string
  alpha?: number
  size?: number
  /** 每个点每秒溅起几次 */
  rate?: number
  /** 压扁的程度（透视）：竖直半径 = 水平半径 × flat */
  flat?: number
  lineWidth?: number
  mask?: Mask
}

/** 地上的涟漪：一圈圈压扁的椭圆从小扩大、淡去，每一轮换个位置，和 rain() 搭着用 */
export function ripples(ctx: Ctx, t: number, o: RipplesOptions = {}) {
  const { seed = 3, n = 40, area = [0, 900, W, 1000], color = C.fg, alpha = 0.5, size = 22, rate = 1.6, flat = 0.22, lineWidth = 1.4, mask } = o
  const [x0, y0, x1, y1] = area
  ctx.save()
  ctx.lineWidth = lineWidth
  for (let i = 0; i < n; i++) {
    const per = (1 / rate) * (0.7 + 0.6 * hash(seed * 31 + i))
    const ph = hash(seed * 17 + i) * per
    const cyc = Math.floor((t + ph) / per)
    const k = (((t + ph) % per) + per) % per / per
    const x = lerp(x0, x1, hash(seed * 97 + i * 13 + cyc * 7))
    const y = lerp(y0, y1, hash(seed * 59 + i * 29 + cyc * 3))
    const near = (y - y0) / Math.max(1, y1 - y0)
    const r = size * (0.4 + 0.8 * near) * (0.2 + k)
    let a = alpha * (1 - k) * (0.4 + 0.6 * near)
    if (mask) a *= clamp(mask(x, y))
    if (a < 0.01) continue
    ctx.strokeStyle = rgba(color, a)
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * flat, 0, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

export interface BokehOptions {
  seed?: number
  n?: number
  area?: Area
  /** 每个光斑从这几种颜色里挑一种 */
  colors?: string[]
  alpha?: number
  /** 半径范围 [最小, 最大] */
  size?: [number, number]
  drift?: number
  op?: GlobalCompositeOperation
}

/** 景深光斑：虚焦的灯，一个个边缘略亮的圆，慢慢漂移 */
export function bokeh(ctx: Ctx, t: number, o: BokehOptions = {}) {
  const { seed = 11, n = 30, area = FULL, colors = [C.clawd, C.blue, C.purple], alpha = 0.35, size = [20, 70], drift = 20, op = 'lighter' } = o
  const [x0, y0, x1, y1] = area
  ctx.save()
  ctx.globalCompositeOperation = op
  for (let i = 0; i < n; i++) {
    const id = seed * 71 + i
    const x = lerp(x0, x1, hash(id)) + noise(t * 0.1 + i * 3.7, seed) * drift
    const y = lerp(y0, y1, hash(id + 1)) + noise(t * 0.08 + i * 5.3, seed + 3) * drift * 0.5
    const r = lerp(size[0], size[1], hash(id + 2))
    const c = colors[Math.floor(hash(id + 3) * colors.length)]
    const a = alpha * (0.4 + 0.6 * hash(id + 4))
    const g = ctx.createRadialGradient(x, y, r * 0.75, x, y, r)
    g.addColorStop(0, rgba(c, a * 0.55))
    g.addColorStop(0.85, rgba(c, a))
    g.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

export interface StarsOptions {
  seed?: number
  n?: number
  area?: Area
  color?: string
  alpha?: number
  /** 闪烁的程度：0 不闪，1 亮度起伏最大 */
  twinkle?: number
}

/** 星空：大多是小星星、少数亮一点，越往下越稀，各自按自己的节奏闪 */
export function stars(ctx: Ctx, t: number, o: StarsOptions = {}) {
  const { seed = 21, n = 160, area = [0, 0, W, H * 0.6], color = C.fg, alpha = 0.8, twinkle = 0.3 } = o
  const [x0, y0, x1, y1] = area
  ctx.save()
  for (let i = 0; i < n; i++) {
    const id = seed * 17 + i
    const x = lerp(x0, x1, hash(id))
    const y = lerp(y0, y1, hash(id + 1) ** 1.3)
    const r = 0.6 + 1.6 * hash(id + 2) ** 3
    const a = alpha * (0.4 + 0.6 * hash(id + 3)) * (1 - twinkle + twinkle * Math.sin(t * (0.8 + hash(id + 4) * 2) + i))
    if (a <= 0.01) continue
    ctx.fillStyle = rgba(color, a)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}
