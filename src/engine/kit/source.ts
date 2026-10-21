import './source.css'
import { h, hide } from '../lib/dom'
import { fadeIn, fadeOut } from '../lib/viz'
import { rich } from '../ui/bubble'
import { STAGE } from '../layout'

type TL = gsap.core.Timeline

/**
 * 出处角标：画面右下角的一行小字，告诉观众“这个说法出自哪篇论文 / 哪份文档”。
 * 讲前沿研究、引用数字的片子，每个关键说法都挂上它，知识来源在画面上看得见。
 * 同一时间只挂一条：show() 换一条时，上一条先淡出。和演员的动作一样，要按时间先后调用。
 *
 *   const src = new Sources(L, tl)
 *   src.show('DeepSeek-V4.1-Flash · arXiv 2609.19969', w('890'))
 *   src.show('DeepInfer · doc/inference_deployment_qa.md', t, '文档')
 *   src.clear(t)
 */
export class Sources {
  private cur: HTMLElement | null = null

  constructor(
    private readonly parent: HTMLElement,
    private readonly tl: TL,
    /** 角标右边缘的中点（舞台坐标）：默认贴着画面可用区的右下角 */
    private readonly pos = { x: STAGE.right, y: STAGE.bottom + 2 },
  ) {}

  /** 在 t 时刻换成这一条出处。text 可以带 {代号:文字} 着色标记；kind 是左边的小标签（论文 / 文档 / 官网……） */
  show(text: string, t: number, kind = '论文') {
    this.clear(t)
    const el = h('div', { class: 'src-tag' }, [h('span', { class: 'src-kind', text: kind })])
    rich(text, el)
    Object.assign(el.style, { left: `${this.pos.x}px`, top: `${this.pos.y}px` })
    this.parent.append(el)
    hide(el)
    fadeIn(this.tl, el, t + 0.12, { y: 6, dur: 0.3 })
    this.cur = el
    return el
  }

  /** 收起当前这一条 */
  clear(t: number) {
    if (this.cur) fadeOut(this.tl, this.cur, t, { dur: 0.2 })
    this.cur = null
  }
}
