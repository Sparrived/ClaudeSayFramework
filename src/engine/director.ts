import { gsap } from 'gsap'
import { h, hide, set } from './lib/dom'
import { C } from './lib/colors'
import { STAGE_CY, W } from './layout'
import type { Actor } from './actors/actor'
import type { Bubble } from './ui/bubble'
import type { Shell } from './ui/shell'
import type { Sfx } from './audio/sfx'
import { createBanner, hideBanner, revealBanner, type Banner } from './ui/banner'
import { canvas } from './lib/canvas'

/** 元素自己或任何一层祖先被 autoAlpha 藏起来了（GSAP 把 visibility 写在行内样式里，seek 之后立刻就是新值） */
function hidden(el: HTMLElement) {
  for (let e: HTMLElement | null = el; e; e = e.parentElement) if (e.style.visibility === 'hidden') return true
  return false
}

export interface Chapter {
  id: string
  title: string
  time: number
}

export interface ChapterOptions {
  id: string
  /** 播放器和底栏里显示的章节名 */
  title: string
  /** 顶部进度标尺移到哪一站（必须是 config.terminal.stops 里的一项） */
  step?: string
  /** 观众在输入框里提的问题 */
  question?: string
  /** 思考动画里的动词（终端，Claude Code 风格），比如 'Profiling' */
  verb?: string
  /** 思考动画里的一句心里话（对话页，DeepSeek “深度思考”风格），比如 '嗯，用户问的是……' */
  thought?: string
  /** ANSI Shadow 大字 */
  banner?: string
  color?: string
  /** 本章的画面图层，提问结束后显示 */
  layer?: HTMLElement
  /** 大字停留多久后收起；false 表示由场景自己收 */
  bannerHold?: number | false
}

export interface SayOptions {
  /** 谁说这句（默认讲解员）。别人说话时，气泡换成他的颜色、亮出名牌；演员要先用 d.actor() 登记 */
  by?: Actor
  /** 打完之后停留多久（默认按字数算） */
  hold?: number
  /** 说话时要不要配小动作（Clawd 摆手、小鲸张嘴；默认要） */
  talk?: boolean
  /** 这句结束后再空多久才轮到下一句 */
  after?: number
  /** 这句至少持续多久：画面动画比台词本身长的时候用，免得下一句的画面和它抢时间 */
  min?: number
}

/** 台词里某个词开始被打出来的时刻（时间轴上的绝对时间）；找不到这个词会直接报错 */
export type WordClock = (word: string) => number

export interface Cast {
  layers: HTMLElement
  /** 讲解员：站在输入框上、默认由它说台词（Claude 系列是 Clawd，DS 系列是小鲸） */
  host: Actor
  bubble: Bubble
  /** 外壳：终端 / 对话页 */
  term: Shell
  sfx: Sfx
}

/**
 * 导演：维护一根主时间轴和一个“当前时间”游标。
 * 场景脚本按顺序调用 chapter() / say() / beat()，台词和画面就依次排进时间轴。
 */
export class Director {
  readonly tl = gsap.timeline({ paused: true })
  readonly chapters: Chapter[] = []
  /** 关键时刻的标记（名字 → 秒），配乐靠它对准画面。片头片尾自带 hop / title / land */
  readonly cues: Record<string, number> = {}
  /**
   * 重绘钩子：有些画面（旋转的向量、滑动的切线、实时读数）不是单纯的补间，
   * 而是“由几个数算出来的图”。这些数放在普通对象里交给 GSAP 补间，
   * 钩子负责按当前的数把图画出来。时间轴每次 seek / 播放推进之后都会调用 redraw()，
   * 所以拖动进度条、逐帧导出都能还原（GSAP 在 seek 时不触发 onUpdate，不能靠它）。
   */
  private readonly hooks: (() => void)[] = []
  /** 客串演员（讲解员之外的） */
  private readonly guests: Actor[] = []
  /** 时间游标（秒） */
  t = 0
  private bubbleOpen = false

  constructor(readonly cast: Cast) {}

  /** 讲解员 */
  get host() {
    return this.cast.host
  }
  /** 讲解员的老名字：Claude 系列里讲解员就是 Clawd，场景里照样可以写 d.clawd */
  get clawd() {
    return this.cast.host
  }
  get term() {
    return this.cast.term
  }
  get sfx() {
    return this.cast.sfx
  }

  /** 登记一个重绘钩子（见 hooks 的说明），并立即画一次初始状态 */
  hook(draw: () => void) {
    this.hooks.push(draw)
    draw()
  }

  /** 按时间轴的当前状态重画所有钩子 */
  redraw() {
    for (const draw of this.hooks) draw()
  }

  /**
   * 在图层里铺一张 Canvas（1920×1080，舞台坐标），按时间轴的当前时刻 t 重画——重绘钩子的 Canvas 版：
   *   d.canvas(L, (ctx, t) => motes(ctx, t, { n: 200, area: [200, 150, 1700, 760] }))
   * 每次重画前自动清空；图层（或画布所在的任何一层）被隐藏时直接跳过，不在看不见的章节上花时间。
   * draw 必须只由 t 和场景里的数决定（种子噪声用 lib/noise），拖进度条、逐帧导出才对得上。
   * 默认垫在图层最底下，top: true 盖在图层最上面。返回画布（el 可以拿去补间 autoAlpha）。
   */
  canvas(layer: HTMLElement, draw: (ctx: CanvasRenderingContext2D, t: number) => void, o: { top?: boolean } = {}) {
    const cv = canvas(layer, o)
    let dirty = false
    this.hook(() => {
      if (hidden(cv.el)) {
        if (dirty) cv.clear()
        dirty = false
        return
      }
      cv.clear()
      draw(cv.ctx, this.tl.time())
      dirty = true
    })
    return cv
  }

  /**
   * 登记一个客串演员（讲解员不用登记）：片尾统一给它补上呼吸和眨眼，d.say() 也认得它。返回它本身。
   *   const xj = d.actor(new Whale(L, { px: 5, x: 1300, y: 720 }))
   */
  actor<A extends Actor>(a: A): A {
    this.guests.push(a)
    return a
  }

  /** 给当前时刻（或指定时刻）起个名字 */
  cue(name: string, t = this.t) {
    this.cues[name] = t
  }

  /** 新建一个场景图层（默认隐藏） */
  layer(id: string) {
    const el = h('div', { class: `scene scene-${id}` })
    this.cast.layers.append(el)
    hide(el)
    return el
  }

  /** 开始新的一章：提问 → 思考 → 大字标题 */
  chapter(o: ChapterOptions): Banner | null {
    this.hush()
    const t0 = this.t
    this.chapters.push({ id: o.id, title: o.title, time: t0 })
    this.tl.addLabel(o.id, t0)
    if (o.step) this.term.step(this.tl, o.step, t0)
    this.term.footer(this.tl, o.title, t0)
    let t = t0 + 0.25
    if (o.question) {
      this.host.look(this.tl, 'd', t)
      t = this.term.ask(this.tl, o.question, t)
      this.host.look(this.tl, 'u', t)
      t = this.term.think(this.tl, t, 1.0, { verb: o.verb, thought: o.thought })
      this.host.look(this.tl, 'c', t)
    }
    if (o.layer) set(this.tl, o.layer, { autoAlpha: 1 }, t)
    let banner: Banner | null = null
    if (o.banner) {
      banner = createBanner(o.banner, { cell: 17, maxWidth: 1560, color: o.color ?? C.clawd })
      banner.el.classList.add('chapter-banner')
      Object.assign(banner.el.style, {
        left: `${(W - banner.width) / 2}px`,
        top: `${STAGE_CY - banner.height / 2 - 24}px`,
      })
      ;(o.layer ?? this.term.root).append(banner.el)
      this.sfx.at(t, 'whoosh')
      const shown = revealBanner(this.tl, banner, t, 0.75)
      if (o.bannerHold !== false) hideBanner(this.tl, banner, shown + (o.bannerHold ?? 1.0))
      t = shown + 0.45
    }
    this.t = t
    return banner
  }

  /**
   * 一句台词。fn(t, w) 在台词开始的时刻被调用，用来安排同步的画面动画：
   * t 是这句开始的时刻，w('某个词') 是这个词开始被打出来的时刻——让画面踩在对应的字上。
   * 返回台词开始时间。
   */
  say(text: string, fn?: (t: number, w: WordClock) => void, o: SayOptions = {}) {
    let t = this.t
    const who = o.by ?? this.host
    if (who !== this.host && !this.guests.includes(who)) throw new Error(`说话的演员「${who.name}」还没有用 d.actor() 登记`)
    this.cast.bubble.speaker(this.tl, who === this.host ? null : who, t)
    if (!this.bubbleOpen) {
      t = this.cast.bubble.open(this.tl, t, this.sfx)
      this.bubbleOpen = true
    }
    const line = this.cast.bubble.line(text)
    this.cast.bubble.play(this.tl, line, t, this.sfx)
    if (o.talk !== false) who.talk(this.tl, t, line.typeDur)
    const plain = line.chars.map((c) => c.textContent ?? '').join('')
    const start = t
    const w: WordClock = (word) => {
      const i = plain.indexOf(word)
      if (i < 0) throw new Error(`台词「${plain}」里没有「${word}」`)
      return start + line.times[i]
    }
    fn?.(t, w)
    const end = Math.max(t + line.typeDur + (o.hold ?? line.hold), t + (o.min ?? 0))
    set(this.tl, line.el, { autoAlpha: 0 }, end)
    this.t = end + (o.after ?? 0)
    return t
  }

  /** 收起气泡 */
  hush() {
    if (!this.bubbleOpen) return
    this.cast.bubble.close(this.tl, this.t)
    this.bubbleOpen = false
  }

  /** 不说话，只放画面 */
  beat(dur: number, fn?: (t: number) => void) {
    const t = this.t
    fn?.(t)
    this.t += dur
    return t
  }

  /** 场景淡出 */
  end(layer: HTMLElement, dur = 0.5) {
    this.hush()
    this.tl.to(layer, { autoAlpha: 0, duration: dur, ease: 'power1.in' }, this.t)
    this.t += dur * 0.7
  }

  /** 全部场景排完后调用：补上贯穿全片的待机动作 */
  finish() {
    const end = this.t + 0.5
    this.tl.to({}, { duration: 0.01 }, end)
    for (const a of [this.host, ...this.guests]) a.idle(this.tl, 0, end)
    this.term.blinkCursor(this.tl, 0, end)
    this.sfx.finalize()
    return end
  }
}
