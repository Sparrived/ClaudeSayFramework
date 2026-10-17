import { gsap } from 'gsap'
import { h, s, set, rand } from '../lib/dom'
import { C } from '../lib/colors'
import { paint } from './pixel'

export type Expr = 'normal' | 'happy' | 'wide' | 'closed'
export type Prop = 'sweat' | 'bang' | 'ask' | 'heart' | 'note'
export type Look = 'c' | 'l' | 'r' | 'u' | 'd'

type TL = gsap.core.Timeline

// 头顶小道具的点阵（'#' 为实心）。颜色在建演员时按当前主题取，亮底上也看得清
const PROP_ART: Record<Prop, { color: () => string; art: string[] }> = {
  sweat: { color: () => '#8FC6EC', art: ['.#', '##', '##'] },
  bang: { color: () => C.v, art: ['##', '##', '##', '..', '##'] },
  ask: { color: () => C.q, art: ['.##.', '#..#', '...#', '..#.', '....', '..#.'] },
  heart: { color: () => C.red, art: ['.#.#.', '#####', '.###.', '..#..'] },
  note: { color: () => C.purple, art: ['..#..', '..##.', '..#.#', '..#..', '###..', '###..'] },
}

export interface ActorOptions {
  /** 一个精灵像素对应多少舞台像素（用整数，像素边缘才清楚；各角色的常用值见它的 SIZES） */
  px: number
  /** 初始位置：脚底中心 */
  x: number
  y: number
  scale?: number
  /** 名牌上的名字（默认用角色自己的名字） */
  name?: string
}

/** 一个角色在各种场合的像素大小（一个精灵像素 = 几个舞台像素）。片头片尾按它的比例缩放，缩完仍是整数，像素才不糊 */
export interface ActorSizes {
  /** 站在输入框上（讲解员的家） */
  home: number
  /** 片头里的迷你版 */
  mini: number
  /** 片尾卡上 */
  end: number
  /** 封面上 */
  cover: number
}

/** 子类交给基类的外形信息 */
export interface Figure {
  /** 默认名字、代表色（多人对话时气泡边框和名牌用） */
  name: string
  color: string
  /** 精灵点阵的宽高（精灵像素） */
  w: number
  h: number
  /** 脚下影子的宽、高（精灵像素） */
  shadow: [number, number]
  /** 每种道具画在哪：道具点阵左上角的位置（精灵像素，可以是负数，画在头顶上方） */
  props: Record<Prop, [number, number]>
  /** 道具放大几倍：精灵像素很细的角色，道具画大一点才看得清 */
  propScale?: number
}

/** 建过几个演员：每个演员的随机数错开一点，几个演员同台时不会整齐划一地眨眼 */
let created = 0

/**
 * 可以被时间轴驱动的像素演员（Clawd、小鲸……都是它的子类）。
 *
 * 所有动作方法都是 “在时间 t 往时间轴 tl 里加补间”，并返回动作结束的时间；
 * 位置等状态在构建时按调用顺序记录，所以同一个演员的动作要按时间先后调用。
 * 动作全部写进同一条时间轴，拖动进度条、逐帧导出视频都能精确还原。
 *
 * 基类管和长相无关的部分：位置、跳跃、走路的位移、影子、头顶道具、呼吸和眨眼的节奏；
 * 子类管长相：往 this.art 里画部件，实现 look / face / blink / talk / wave / cheer / steps。
 */
export abstract class Actor {
  readonly root: HTMLDivElement
  readonly hop: HTMLDivElement
  readonly shadow: HTMLDivElement
  readonly svg: SVGSVGElement
  readonly props: Record<Prop, SVGGElement>
  readonly name: string
  readonly color: string
  readonly px: number
  /** 精灵点阵的宽高（精灵像素） */
  readonly w: number
  readonly h: number
  /** 各种场合的像素大小 */
  abstract readonly sizes: ActorSizes
  /** 跟着呼吸起伏的部分（子类建好） */
  abstract readonly upper: SVGGElement
  /** 角色的像素画（子类往里加部件）；道具在它上面一层 */
  protected readonly art: SVGGElement
  /** 第几个建出来的演员：随机数的偏移 */
  protected readonly seed: number

  x: number
  y: number
  scale: number

  protected constructor(parent: HTMLElement, opts: ActorOptions, fig: Figure) {
    this.name = opts.name ?? fig.name
    this.color = fig.color
    this.px = opts.px
    this.x = opts.x
    this.y = opts.y
    this.scale = opts.scale ?? 1
    this.w = fig.w
    this.h = fig.h
    this.seed = created++
    const w = fig.w * opts.px
    const hgt = fig.h * opts.px

    // 道具：外层定位（和放大），内层给时间轴做上下飘的动画
    const k = fig.propScale ?? 1
    this.props = {} as Record<Prop, SVGGElement>
    const propLayer = s('g')
    for (const [kind, p] of Object.entries(PROP_ART) as [Prop, (typeof PROP_ART)[Prop]][]) {
      const [x, y] = fig.props[kind]
      const g = paint(p.art, { '#': p.color() })
      this.props[kind] = g
      propLayer.append(s('g', { transform: `translate(${x} ${y}) scale(${k})` }, [g]))
    }

    this.art = s('g')
    this.svg = s(
      'svg',
      {
        class: 'actor-svg',
        viewBox: `0 0 ${fig.w} ${fig.h}`,
        width: w,
        height: hgt,
        'shape-rendering': 'crispEdges',
        overflow: 'visible',
        'aria-hidden': 'true',
      },
      [this.art, propLayer],
    )

    this.shadow = h('div', { class: 'actor-shadow' })
    this.hop = h('div', { class: 'actor-hop' }, [this.svg])
    this.root = h('div', { class: 'actor' }, [this.shadow, this.hop])
    this.root.style.width = `${w}px`
    this.root.style.height = `${hgt}px`
    this.shadow.style.width = `${fig.shadow[0] * opts.px}px`
    this.shadow.style.height = `${fig.shadow[1] * opts.px}px`
    parent.append(this.root)

    gsap.set(this.root, { xPercent: -50, yPercent: -100, x: this.x, y: this.y, scale: this.scale, transformOrigin: '50% 100%' })
    gsap.set(this.hop, { transformOrigin: '50% 100%' })
    for (const g of Object.values(this.props)) gsap.set(g, { autoAlpha: 0 })
  }

  // ── 长相相关：子类实现 ──────────────────────────

  /** 眼睛看向某个方向 */
  abstract look(tl: TL, dir: Look, t: number): number
  /** 换表情 */
  abstract face(tl: TL, kind: Expr, t: number): number
  /** 眨一下眼 */
  abstract blink(tl: TL, t: number): number
  /** 说话时的小动作（Clawd 摆手，小鲸张嘴） */
  abstract talk(tl: TL, t: number, dur: number): number
  /** 挥手 */
  abstract wave(tl: TL, t: number, cycles?: number): number
  /** 双手举高 */
  abstract cheer(tl: TL, t: number, dur?: number): number
  /** 走路时腿的交替 */
  abstract steps(tl: TL, t: number, dur: number, step?: number): void
  /** 封面上的定格姿势（举手打招呼）：直接设好，不经过时间轴 */
  abstract pose(): void

  // ── 和长相无关的动作 ────────────────────────────

  /** 瞬移 */
  place(tl: TL, x: number, y: number, t: number, scale = this.scale) {
    set(tl, this.root, { x, y, scale }, t)
    this.x = x
    this.y = y
    this.scale = scale
    return t
  }

  show(tl: TL, t: number, visible = true) {
    set(tl, this.root, { autoAlpha: visible ? 1 : 0 }, t)
    return t
  }

  /** 迈着小碎步走到 x */
  walkTo(tl: TL, x: number, t: number, speed = 460) {
    const dist = Math.abs(x - this.x)
    if (dist < 1) return t
    const dur = dist / speed
    this.look(tl, x > this.x ? 'r' : 'l', t)
    tl.to(this.root, { x, duration: dur, ease: 'none' }, t)
    this.steps(tl, t, dur)
    this.look(tl, 'c', t + dur)
    this.x = x
    return t + dur
  }

  /** 抛物线跳到 (x, y)，可顺便改变大小；带起跳蓄力和落地压扁 */
  hopTo(
    tl: TL,
    x: number,
    y: number,
    t: number,
    { dur = 0.6, height = 120, scale = this.scale }: { dur?: number; height?: number; scale?: number } = {},
  ) {
    const lift = t + 0.12
    tl.to(this.hop, { scaleY: 0.8, scaleX: 1.14, duration: 0.12, ease: 'power2.out' }, t)
    tl.to(this.hop, { scaleY: 1.12, scaleX: 0.92, duration: 0.14, ease: 'power2.out' }, lift)
    tl.to(this.hop, { scaleY: 1, scaleX: 1, duration: 0.2, ease: 'power1.inOut' }, lift + 0.14)
    tl.to(this.root, { x, y, scale, duration: dur, ease: 'power1.inOut' }, lift)
    tl.to(this.hop, { y: -height, duration: dur / 2, ease: 'power2.out' }, lift)
    tl.to(this.hop, { y: 0, duration: dur / 2, ease: 'power2.in' }, lift + dur / 2)
    // 影子跟着变小变淡（影子的浓淡由主题的 --shadow 决定，这里只是相对它的比例）
    tl.to(this.shadow, { scale: 0.45, opacity: 0.3, duration: dur / 2, ease: 'power2.out' }, lift)
    tl.to(this.shadow, { scale: 1, opacity: 1, duration: dur / 2, ease: 'power2.in' }, lift + dur / 2)
    const land = lift + dur
    tl.to(this.hop, { scaleY: 0.78, scaleX: 1.16, duration: 0.07, ease: 'power1.out' }, land)
    tl.to(this.hop, { scaleY: 1, scaleX: 1, duration: 0.32, ease: 'back.out(3)' }, land + 0.07)
    this.x = x
    this.y = y
    this.scale = scale
    return land + 0.39
  }

  /** 原地蹦一下 */
  bounce(tl: TL, t: number, height = 46) {
    return this.hopTo(tl, this.x, this.y, t, { dur: 0.42, height })
  }

  /** 左右抖动（困惑 / 摇头） */
  shake(tl: TL, t: number) {
    tl.to(this.hop, { x: 6, duration: 0.05, ease: 'steps(1)', repeat: 5, yoyo: true }, t)
    set(tl, this.hop, { x: 0 }, t + 0.32)
    return t + 0.32
  }

  /** 看向另一个演员（或者舞台上的某个横坐标） */
  lookAt(tl: TL, target: Actor | number, t: number) {
    const x = typeof target === 'number' ? target : target.x
    return this.look(tl, x < this.x - 1 ? 'l' : x > this.x + 1 ? 'r' : 'c', t)
  }

  /** 头顶在舞台上的位置（按构建时记录的位置和大小算）：名牌、头顶的东西用它定位 */
  headTop() {
    return { x: this.x, y: this.y - this.h * this.px * this.scale }
  }

  /** 头顶冒出小道具（汗滴、感叹号、问号……） */
  prop(tl: TL, kind: Prop, t: number, dur = 1.6) {
    const g = this.props[kind]
    set(tl, g, { autoAlpha: 1, y: 1 }, t)
    set(tl, g, { y: 0 }, t + 0.08)
    if (kind === 'sweat' || kind === 'note') {
      // 慢慢往下滴 / 往上飘
      tl.to(g, { y: kind === 'sweat' ? 2 : -2, duration: dur, ease: 'steps(3)' }, t + 0.1)
    }
    set(tl, g, { autoAlpha: 0, y: 0 }, t + dur)
    return t + dur
  }

  /** 贯穿整段时间的待机动作：呼吸起伏 + 随机眨眼。子类可以再加自己的小动作 */
  idle(tl: TL, from: number, to: number) {
    const period = 0.62
    // 几个演员同台时呼吸错开半拍，眨眼的随机数也错开
    const phase = this.seed % 2 ? period : 0
    const n = Math.max(2, Math.floor((to - from - phase) / period / 2) * 2)
    tl.to(this.upper, { y: 1, duration: period, ease: 'steps(1)', repeat: n - 1, yoyo: true }, from + phase)
    const o = this.seed * 1000
    let t = from + 1.4 + this.seed * 0.9
    let i = 0
    while (t < to) {
      this.blink(tl, t)
      // 偶尔连眨两下
      if (rand(o + i + 99) > 0.8) this.blink(tl, t + 0.26)
      t += 2.4 + rand(o + i++) * 2.6
    }
  }
}
