import { gsap } from 'gsap'
import { rand, s, set } from '../lib/dom'
import { Actor, type ActorOptions, type ActorSizes, type Expr, type Look } from './actor'
import { Frames, paint } from './pixel'
import { WHALE_ART, WHALE_H, WHALE_PALETTE, WHALE_W, type PixelPart } from './whale-art'

type TL = gsap.core.Timeline
type EyeFrame = 'normal' | 'happy' | 'wide' | 'closed'
type MouthFrame = 'closed' | 'open' | 'smile'
type ArmFrame = 'down' | 'up' | 'wave'

/** DeepSeek 的品牌蓝：小鲸的代表色（多人对话时她的气泡边框、名牌） */
export const WHALE_BLUE = '#4D6BFE'

const part = (p: PixelPart) => paint(p.rows, WHALE_PALETTE, p.x, p.y)

function frames<K extends string>(src: Record<K, PixelPart>, initial: NoInfer<K>, cls?: string) {
  const out = {} as Record<K, SVGGElement>
  for (const k of Object.keys(src) as K[]) out[k] = part(src[k])
  return new Frames(out, initial, cls)
}

/** 每种表情用哪一帧眼睛、哪一帧嘴 */
const FACES: Record<Expr, { eyes: EyeFrame; mouth: MouthFrame }> = {
  normal: { eyes: 'normal', mouth: 'closed' },
  happy: { eyes: 'happy', mouth: 'smile' },
  wide: { eyes: 'wide', mouth: 'open' },
  closed: { eyes: 'closed', mouth: 'smile' },
}

/**
 * 小鲸 —— DS 系列的讲解员：DeepSeek 的拟人形象（蓝色长发、呆毛、鲸鱼耳鳍、女仆装，围裙上有一只小鲸鱼）。
 * 36×54 的多色像素画（点阵在 whale-art.ts），头发、呆毛、耳鳍、眼睛、嘴、手、腿都是分开的部件：
 *
 *   说话 = 嘴一张一合（Clawd 是摆手）· 开心时耳鳍扑两下 · 吃惊时呆毛弹一下 · 待机时呆毛偶尔晃、耳鳍偶尔扑
 *   专属动作：flap（扑耳鳍）、spring（呆毛弹起来）
 */
export class Whale extends Actor {
  /** 在家（输入框上）4 → 144×216；片头迷你版 2；片尾卡上和在家一样大；封面 8 */
  static readonly SIZES: ActorSizes = { home: 4, mini: 2, end: 4, cover: 8 }

  readonly sizes = Whale.SIZES
  readonly upper: SVGGElement
  readonly legL: SVGGElement
  readonly legR: SVGGElement
  readonly ahoge: SVGGElement
  readonly finL: SVGGElement
  readonly finR: SVGGElement
  /** 眼睛：看向某处时整体挪一格；里面是表情帧和眨眼那一下 */
  readonly eyes: SVGGElement
  readonly eyeFrames: Frames<EyeFrame>
  readonly eyelid: SVGGElement
  /** 嘴：表情帧 + 说话时盖上去的张嘴 */
  readonly mouthFrames: Frames<MouthFrame>
  readonly talkMouth: SVGGElement
  readonly armL: Frames<ArmFrame>
  readonly armR: Frames<ArmFrame>

  constructor(parent: HTMLElement, opts: ActorOptions) {
    super(parent, opts, {
      name: '小鲸',
      color: WHALE_BLUE,
      w: WHALE_W,
      h: WHALE_H,
      shadow: [26, 2.2],
      propScale: 2,
      props: { sweat: [31, 9], bang: [24, -7], ask: [23, -10], heart: [25, -6], note: [26, -10] },
    })
    const A = WHALE_ART
    this.legL = part(A.legL)
    this.legR = part(A.legR)
    this.ahoge = part(A.ahoge)
    this.finL = part(A.finL)
    this.finR = part(A.finR)

    // blink 不是表情，是眨眼时临时盖上去的一条线
    const { blink, ...eyeArt } = A.eyes
    this.eyeFrames = frames(eyeArt, 'normal')
    this.eyelid = part(blink)
    gsap.set(this.eyelid, { autoAlpha: 0 })
    this.eyes = s('g', { class: 'whale-eyes' }, [this.eyeFrames.el, this.eyelid])

    this.mouthFrames = frames(A.mouth, 'closed')
    this.talkMouth = part(A.mouth.open)
    gsap.set(this.talkMouth, { autoAlpha: 0 })
    this.armL = frames(A.armL, 'down')
    this.armR = frames(A.armR, 'down')

    this.upper = s('g', { class: 'whale-upper' }, [
      part(A.hairBack),
      this.ahoge,
      part(A.body),
      part(A.face),
      this.eyes,
      s('g', {}, [this.mouthFrames.el, this.talkMouth]),
      part(A.bangs),
      this.armL.el,
      this.armR.el,
      part(A.headband),
      this.finL,
      this.finR,
    ])
    this.art.append(s('g', {}, [this.legL, this.legR]), this.upper)
  }

  look(tl: TL, dir: Look, t: number) {
    const [x, y] = { c: [0, 0], l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir]
    set(tl, this.eyes, { x, y }, t)
    return t
  }

  face(tl: TL, kind: Expr, t: number) {
    const f = FACES[kind]
    this.eyeFrames.show(tl, f.eyes, t)
    this.mouthFrames.show(tl, f.mouth, t)
    if (kind === 'happy') this.flap(tl, t, 2)
    if (kind === 'wide') this.spring(tl, t)
    return t
  }

  blink(tl: TL, t: number) {
    set(tl, this.eyeFrames.el, { autoAlpha: 0 }, t)
    set(tl, this.eyelid, { autoAlpha: 1 }, t)
    set(tl, this.eyeFrames.el, { autoAlpha: 1 }, t + 0.12)
    set(tl, this.eyelid, { autoAlpha: 0 }, t + 0.12)
    return t + 0.12
  }

  /** 说话：嘴一张一合（快慢带一点随机，像在念字） */
  talk(tl: TL, t: number, dur: number) {
    let tt = t
    let i = 0
    while (tt < t + dur - 0.08) {
      set(tl, this.mouthFrames.el, { autoAlpha: 0 }, tt)
      set(tl, this.talkMouth, { autoAlpha: 1 }, tt)
      tt += 0.1 + rand(this.seed * 1000 + 500 + i) * 0.05
      set(tl, this.mouthFrames.el, { autoAlpha: 1 }, tt)
      set(tl, this.talkMouth, { autoAlpha: 0 }, tt)
      tt += 0.07 + rand(this.seed * 1000 + 700 + i++) * 0.06
    }
    return tt
  }

  /** 右手举到脸颊旁边，手腕来回摆 */
  wave(tl: TL, t: number, cycles = 3) {
    const dt = 0.15
    for (let i = 0; i < cycles * 2; i++) this.armR.show(tl, i % 2 ? 'wave' : 'up', t + i * dt)
    const end = t + cycles * 2 * dt
    this.armR.show(tl, 'down', end)
    return end
  }

  /** 两只手都举起来 */
  cheer(tl: TL, t: number, dur = 1) {
    this.armL.show(tl, 'up', t)
    this.armR.show(tl, 'up', t)
    this.armL.show(tl, 'down', t + dur)
    this.armR.show(tl, 'down', t + dur)
    return t + dur
  }

  /** 两条腿交替抬起一格 */
  steps(tl: TL, t: number, dur: number, step = 0.1) {
    const n = Math.max(2, Math.round(dur / step))
    const dt = dur / n
    for (let i = 0; i < n; i++) {
      set(tl, this.legL, { y: i % 2 ? 0 : -1 }, t + i * dt)
      set(tl, this.legR, { y: i % 2 ? -1 : 0 }, t + i * dt)
    }
    set(tl, [this.legL, this.legR], { y: 0 }, t + dur)
  }

  /** 封面：笑着，右手举到脸颊旁边打招呼 */
  pose() {
    for (const [k, g] of Object.entries(this.eyeFrames.frames)) gsap.set(g, { autoAlpha: k === 'happy' ? 1 : 0 })
    for (const [k, g] of Object.entries(this.mouthFrames.frames)) gsap.set(g, { autoAlpha: k === 'smile' ? 1 : 0 })
    for (const [k, g] of Object.entries(this.armR.frames)) gsap.set(g, { autoAlpha: k === 'up' ? 1 : 0 })
  }

  /** 扑耳鳍：两只鳍一起往上扑 n 下 */
  flap(tl: TL, t: number, n = 2) {
    const dt = 0.09
    for (let i = 0; i < n; i++) {
      set(tl, [this.finL, this.finR], { y: -1 }, t + i * 2 * dt)
      set(tl, [this.finL, this.finR], { y: 0 }, t + (i * 2 + 1) * dt)
    }
    return t + n * 2 * dt
  }

  /** 呆毛弹起来：猛地一翘，再落回去 */
  spring(tl: TL, t: number) {
    set(tl, this.ahoge, { y: -2 }, t)
    set(tl, this.ahoge, { y: -1, x: 1 }, t + 0.08)
    set(tl, this.ahoge, { y: 0, x: 0 }, t + 0.2)
    return t + 0.2
  }

  /** 待机：呼吸、眨眼之外，呆毛偶尔晃一下、耳鳍偶尔扑一下 */
  idle(tl: TL, from: number, to: number) {
    super.idle(tl, from, to)
    const o = this.seed * 1000 + 300
    let t = from + 3 + rand(o) * 2
    let i = 0
    while (t < to - 1) {
      if (rand(o + i + 50) > 0.5) {
        set(tl, this.ahoge, { x: -1 }, t)
        set(tl, this.ahoge, { x: 0 }, t + 0.3)
      } else this.flap(tl, t, 1)
      t += 3.5 + rand(o + i++) * 4
    }
  }
}
