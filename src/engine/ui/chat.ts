import './chat.css'
import { gsap } from 'gsap'
import { h, s, set, at } from '../lib/dom'
import { C } from '../lib/colors'
import { BUBBLE, FOOTER_Y, HEADING_Y, MARGIN, PROMPT, W } from '../layout'
import { typeset } from './bubble'
import { Ruler } from './ruler'
import type { Shell, ShellOptions, ThinkOptions } from './shell'
import type { Sfx } from '../audio/sfx'

type TL = gsap.core.Timeline

/** 没给心里话时，深度思考里流出来的那一句 */
const THOUGHT = '嗯，让我想想该从哪里讲起……'

// 胶囊按钮和发送键上的小图标（24×24，线条用 currentColor）
const icon = (...parts: SVGElement[]) =>
  s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parts)
const orbit = (deg: number) => s('ellipse', { cx: 12, cy: 12, rx: 10, ry: 4, transform: `rotate(${deg} 12 12)` })
/** 深度思考：一个原子 */
export const atom = () => icon(s('circle', { cx: 12, cy: 12, r: 1.8, fill: 'currentColor', stroke: 'none' }), orbit(0), orbit(60), orbit(120))
/** 联网搜索：一个地球 */
export const globe = () => icon(s('circle', { cx: 12, cy: 12, r: 9 }), s('ellipse', { cx: 12, cy: 12, rx: 4, ry: 9 }), s('path', { d: 'M3 12h18' }))
/** 发送：向上的箭头 */
export const arrowUp = () => icon(s('path', { d: 'M12 19V5M5.5 11.5L12 5l6.5 6.5' }))

/**
 * 对话页（DS 系列的外壳）：致敬 DeepSeek 网页版的亮色对话界面，不照抄官方界面和标志。
 *   输入框：大圆角卡片，“深度思考”“联网搜索”两颗胶囊和圆形发送键；观众的问题发出去之后，变成右上角的用户气泡。
 *   思考：一块“深度思考”——转圈的小环 + 左边带竖线的灰色心里话逐字流出，最后收成“已深度思考（用时 N 秒）”。
 *   底栏：左边“内容由 AI 生成，请仔细甄别”，右边章节名。
 * 版面和终端一样（标尺、问题、舞台、讲解气泡、输入框，坐标见 layout.ts），讲解员同样站在输入框的上沿。
 */
export class Chat implements Shell {
  readonly root: HTMLDivElement
  readonly prompt: HTMLDivElement
  readonly rulerEl: HTMLDivElement
  readonly footerEl: HTMLDivElement
  /** “深度思考”胶囊、发送键（片头片尾要按它们） */
  readonly deep: HTMLDivElement
  readonly send: HTMLDivElement
  private readonly ruler: Ruler
  private readonly field: HTMLDivElement
  private readonly caret: HTMLSpanElement
  private readonly placeholder: HTMLSpanElement
  private readonly footRight: HTMLDivElement
  private headingCur: HTMLElement | null = null
  private footCur: HTMLElement | null = null

  constructor(
    parent: HTMLElement,
    private readonly sfx: Sfx,
    o: ShellOptions,
  ) {
    this.root = h('div', { class: 'chrome chat' })
    parent.append(this.root)

    // ── 进度标尺（圆点标记） ────────────────────
    this.ruler = new Ruler(o.stops)
    this.rulerEl = this.ruler.el
    this.rulerEl.classList.add('ruler-round')
    this.root.append(this.rulerEl)

    // ── 输入框 ─────────────────────────────────
    this.caret = h('span', { class: 'cp-caret' })
    this.placeholder = h('span', { class: 'placeholder', text: o.placeholder ?? '给小鲸发送消息' })
    this.field = h('div', { class: 'cp-field' }, [this.caret, this.placeholder])
    this.deep = h('div', { class: 'cp-pill on' }, [atom(), h('span', { text: '深度思考' })])
    this.send = h('div', { class: 'cp-send' }, [arrowUp()])
    const web = h('div', { class: 'cp-pill' }, [globe(), h('span', { text: '联网搜索' })])
    this.prompt = h('div', { class: 'chat-prompt' }, [this.field, h('div', { class: 'cp-tools' }, [this.deep, web, this.send])])
    Object.assign(this.prompt.style, {
      left: `${PROMPT.left}px`,
      top: `${PROMPT.top}px`,
      width: `${PROMPT.right - PROMPT.left}px`,
      height: `${PROMPT.height}px`,
    })
    this.root.append(this.prompt)

    // ── 底部提示栏 ─────────────────────────────
    this.footRight = h('div', { class: 'foot-right' })
    this.footerEl = at(h('div', { class: 'footer chat-footer' }, [h('span', { text: '内容由 AI 生成，请仔细甄别' }), this.footRight]), MARGIN + 22, FOOTER_Y)
    this.footerEl.style.width = `${W - 2 * MARGIN - 44}px`
    this.root.append(this.footerEl)
  }

  /** 竖线光标的闪烁：贯穿全片的补间 */
  blinkCursor(tl: TL, from: number, to: number) {
    const n = Math.max(2, Math.floor((to - from) / 0.53 / 2) * 2)
    tl.to(this.caret, { opacity: 0, duration: 0.53, ease: 'steps(1)', repeat: n - 1, yoyo: true }, from)
  }

  step(tl: TL, name: string, t: number) {
    return this.ruler.step(tl, name, t)
  }

  /** 字打进输入框（发送键随即变蓝）→ 点发送 → 问题变成右上角的用户气泡 */
  ask(tl: TL, question: string, t: number) {
    const q = h('span', { class: 'q' })
    const chars = typeset(question, q)
    this.field.insertBefore(q, this.caret)
    gsap.set(chars, { display: 'none' })
    set(tl, this.placeholder, { display: 'none' }, t)
    let tt = t + 0.15
    set(tl, this.send, { backgroundColor: C.clawd }, tt)
    chars.forEach((c, i) => {
      set(tl, c, { display: 'inline' }, tt)
      this.sfx.at(tt, 'key', i)
      const ch = c.textContent ?? ''
      tt += /[一-鿿]/.test(ch) ? 0.062 : /[A-Za-z0-9 ]/.test(ch) ? 0.038 : 0.05
    })
    const submit = tt + 0.32
    this.sfx.at(submit, 'enter')
    tl.fromTo(this.send, { scale: 0.86 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, submit)
    set(tl, q, { display: 'none' }, submit + 0.04)
    set(tl, this.placeholder, { display: 'inline' }, submit + 0.04)
    set(tl, this.send, { backgroundColor: C.line }, submit + 0.2)
    this.heading(tl, question, submit + 0.04)
    return submit + 0.12
  }

  /** 右上角的用户气泡 */
  heading(tl: TL, text: string, t: number) {
    const el = h('div', { class: 'chat-q' })
    typeset(text, el)
    // 标尺的站名在 y 58–82，气泡从它下面开始（终端的问题在左上角，碰不到；这里在右上角，要让开）
    Object.assign(el.style, { right: `${MARGIN}px`, top: `${HEADING_Y}px` })
    this.root.append(el)
    gsap.set(el, { autoAlpha: 0 })
    this.clearHeading(tl, t)
    tl.fromTo(el, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, t)
    this.headingCur = el
    return el
  }

  clearHeading(tl: TL, t: number) {
    if (this.headingCur) tl.to(this.headingCur, { autoAlpha: 0, duration: 0.2 }, t)
    this.headingCur = null
  }

  /** 深度思考：转圈 + 心里话逐字流出，最后收成“已深度思考（用时 N 秒）”。心里话长就多想一会儿 */
  think(tl: TL, t: number, dur: number, { thought = THOUGHT }: ThinkOptions = {}) {
    const ring = s('svg', { class: 'ct-ring', viewBox: '0 0 24 24' }, [
      s('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-dasharray': '40 17', 'stroke-linecap': 'round' }),
    ])
    const label = h('span', { text: '思考中…' })
    const body = h('div', { class: 'ct-body' })
    const chars = typeset(thought, body)
    const el = at(h('div', { class: 'chat-think' }, [h('div', { class: 'ct-head' }, [ring, label]), body]), BUBBLE.left + 10, BUBBLE.top + 2)
    this.root.append(el)
    gsap.set(el, { autoAlpha: 0 })
    gsap.set(chars, { visibility: 'hidden' })

    const each = 0.034
    const end = t + Math.max(dur, 0.25 + chars.length * each + 0.6)
    set(tl, el, { autoAlpha: 1 }, t)
    tl.fromTo(ring, { rotation: 0 }, { rotation: 360 * (end - t) * 1.2, duration: end - t, ease: 'none', immediateRender: false }, t)
    chars.forEach((c, i) => set(tl, c, { visibility: 'inherit' }, t + 0.25 + i * each))
    // 想完：圈不转了，标题换成用时
    set(tl, ring, { autoAlpha: 0 }, end - 0.45)
    set(tl, label, { text: `已深度思考（用时 ${Math.max(1, Math.round(end - t))} 秒）` }, end - 0.45)
    tl.to(el, { autoAlpha: 0, duration: 0.15 }, end - 0.15)
    return end
  }

  footer(tl: TL, text: string, t: number) {
    const el = h('span', { class: 'foot-title', text })
    this.footRight.append(el)
    gsap.set(el, { autoAlpha: 0 })
    if (this.footCur) set(tl, this.footCur, { autoAlpha: 0 }, t)
    set(tl, el, { autoAlpha: 1 }, t)
    this.footCur = el
  }
}
