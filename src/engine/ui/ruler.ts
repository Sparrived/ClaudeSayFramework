import { gsap } from 'gsap'
import { at, h, set } from '../lib/dom'
import { C } from '../lib/colors'
import { RULER_Y, W } from '../layout'

type TL = gsap.core.Timeline

/** 顶部的进度标尺（两种外壳共用）：一条线、各站的刻度和站名、一个跟着章节走的标记 */
export class Ruler {
  readonly el: HTMLDivElement
  private readonly stopX: number[]
  private readonly stopLabels: HTMLDivElement[]
  private readonly marker: HTMLDivElement
  private readonly fill: HTMLDivElement
  private stepIdx = -1

  constructor(private readonly stops: readonly string[]) {
    const x0 = 132
    const x1 = W - 132
    const n = stops.length
    this.stopX = stops.map((_, i) => (n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : (x0 + x1) / 2))
    this.el = h('div', { class: 'ruler' })
    const base = at(h('div', { class: 'ruler-line' }), x0, RULER_Y)
    base.style.width = `${x1 - x0}px`
    this.fill = at(h('div', { class: 'ruler-fill' }), x0, RULER_Y)
    this.fill.style.width = `${x1 - x0}px`
    this.marker = at(h('div', { class: 'ruler-marker' }), 0, RULER_Y)
    this.stopLabels = stops.map((y, i) => {
      this.el.append(at(h('div', { class: 'ruler-tick' }), this.stopX[i], RULER_Y))
      const label = at(h('div', { class: 'ruler-label', text: y }), this.stopX[i], RULER_Y + 12)
      this.el.append(label)
      return label
    })
    if (n) {
      this.el.prepend(base, this.fill)
      this.el.append(this.marker)
    }
    gsap.set(this.fill, { scaleX: 0, transformOrigin: '0% 50%' })
    gsap.set(this.marker, { x: this.stopX[0] ?? x0, xPercent: -50, yPercent: -50, autoAlpha: 0 })
  }

  /** 把标记移到 name 这一站 */
  step(tl: TL, name: string, t: number) {
    const i = this.stops.indexOf(name)
    if (i < 0) throw new Error(`进度标尺上没有「${name}」这一站（现有：${this.stops.join(' / ') || '无'}）`)
    if (i === this.stepIdx) return t
    const last = Math.max(1, this.stops.length - 1)
    const dur = this.stepIdx < 0 ? 0.01 : Math.min(1.4, 0.45 + Math.abs(i - this.stepIdx) * 0.16)
    if (this.stepIdx < 0) set(tl, this.marker, { autoAlpha: 1 }, t)
    tl.to(this.marker, { x: this.stopX[i], duration: dur, ease: 'power2.inOut' }, t)
    tl.to(this.fill, { scaleX: i / last, duration: dur, ease: 'power2.inOut' }, t)
    if (this.stepIdx >= 0) set(tl, this.stopLabels[this.stepIdx], { color: C.faint, fontWeight: 400 }, t)
    set(tl, this.stopLabels[i], { color: C.clawd, fontWeight: 600 }, t + dur * 0.6)
    this.stepIdx = i
    return t + dur
  }
}
