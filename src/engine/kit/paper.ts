import { at, h } from '../lib/dom'
import { C, rgba } from '../lib/colors'

type TL = gsap.core.Timeline

export interface PaperPageOptions {
  /** 左上角的舞台坐标和尺寸 */
  x: number
  y: number
  w?: number
  h?: number
  /** 页面左边缘竖排的小字，比如 'arXiv:1706.03762v1 [cs.CL] 12 Jun 2017' */
  stamp?: string
  /** 标题。用 [[…]] 圈出之后要用荧光笔扫亮的短语 */
  title: string
  authors: string[]
  /** 作者单位（斜体） */
  affil?: string
  /** 摘要（斜体，两端对齐）。同样可以用 [[…]] 圈出要扫亮的句子 */
  abstract?: string
  /** 荧光笔的颜色，按 [[…]] 出现的顺序（标题在前、摘要在后）依次取，不够的用橙色 */
  colors?: string[]
}

export interface PaperPage {
  el: HTMLDivElement
  /** 所有 [[…]] 短语，按出现顺序 */
  marks: HTMLSpanElement[]
}

/**
 * 论文首页：按真实论文第一页的版式（Times 字体、居中的标题和作者、斜体摘要、左边缘的竖排戳）。
 * 讲论文、讲历史上的里程碑时都能用；标题和摘要里的关键短语可以用荧光笔扫亮（sweep）。
 */
export function paperPage(parent: HTMLElement, o: PaperPageOptions): PaperPage {
  const marks: HTMLSpanElement[] = []
  const withMarks = (text: string) =>
    text.split(/\[\[(.+?)\]\]/).map((piece, i) => {
      if (i % 2 === 0) return piece
      const m = h('span', { class: 'pp-hl', text: piece })
      m.style.setProperty('--hl', rgba(o.colors?.[marks.length] ?? C.clawd, 0.5))
      marks.push(m)
      return m
    })
  const el = h('div', { class: 'paper-page' }, [
    o.stamp ? h('div', { class: 'pp-stamp', text: o.stamp }) : null,
    h('div', { class: 'pp-title' }, withMarks(o.title)),
    h('div', { class: 'pp-authors', text: o.authors.join(' · ') }),
    o.affil ? h('div', { class: 'pp-affil', text: o.affil }) : null,
    o.abstract ? h('div', { class: 'pp-abs-h', text: 'Abstract' }) : null,
    o.abstract ? h('div', { class: 'pp-abs' }, withMarks(o.abstract)) : null,
  ])
  at(el, o.x, o.y)
  Object.assign(el.style, { width: `${o.w ?? 1000}px`, height: `${o.h ?? 470}px` })
  parent.append(el)
  return { el, marks }
}

/** 荧光笔从左到右扫过一个短语（跨行的短语会一行一行地扫） */
export function sweep(tl: TL, mark: HTMLElement, t: number, dur = 0.8) {
  tl.fromTo(mark, { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: dur, ease: 'power1.inOut', immediateRender: false }, t)
  return t + dur
}
