import type { Director } from '../director'
import { at, h, hide, pin, set } from '../lib/dom'
import { HEADING_Y, MARGIN, STAGE_CX } from '../layout'
import { rich } from '../ui/bubble'
import { fadeIn, fadeOut } from '../lib/viz'
import { shellPrompt } from './opening'
import { Terminal } from '../ui/terminal'

export interface EndingOptions {
  /** 终端的当前目录（和片头一致） */
  cwd: string
  /** 片尾卡的大字，默认「谢谢观看」；可以带 {o:…} 着色标记 */
  thanks?: string
  /** 大字下面的一行小字（出处 / 引用），可以带 {o:…} 着色标记 */
  cite?: string
  /** 敲 /exit 时一起淡出的画面（这一章里还留在舞台上的东西） */
  clear?: gsap.TweenTarget
}

/**
 * 系列统一的片尾（约 7 秒）：输入框里敲 /exit → 终端界面淡出 → Clawd 跳到舞台中央变大（cue: land）→
 * 片尾卡（大字 + 出处 + 左上角的 shell 提示符），Clawd 挥手。
 *
 * 在最后一句台词之后调用；layer 是这一章的图层。必须是最后一个场景的最后一步。
 */
export function ending(d: Director, layer: HTMLElement, o: EndingOptions) {
  const { tl, host, term, sfx } = d
  if (!(term instanceof Terminal)) throw new Error('ending() 要配终端外壳（主题 CLAUDE）；DS 系列用 chatEnding()')

  const thanks = rich(o.thanks ?? '谢谢观看', at(h('div', { class: 'end-thanks' }), STAGE_CX, 330))
  const cite = o.cite ? rich(o.cite, at(h('div', { class: 'end-cite' }), STAGE_CX, 412)) : null
  const shell = at(shellPrompt(o.cwd, h('span', { class: 'cursor' })), MARGIN, HEADING_Y)
  layer.append(thanks, shell)
  if (cite) layer.append(cite)
  pin(thanks)
  if (cite) pin(cite)
  hide(thanks, shell)
  if (cite) hide(cite)

  d.hush()
  let t = d.t + 0.2
  host.look(tl, 'd', t)
  t = term.ask(tl, '/exit', t)
  host.look(tl, 'c', t)
  // 等 "> /exit" 的淡入（0.35s，从 ask 内部 submit+0.04 开始）走完再淡出：
  // 两个 tween 若重叠，淡入的收尾渲染会盖掉淡出，标题会一直留在片尾卡上压住 shell 提示符。
  term.clearHeading(tl, t + 0.45)
  tl.to([term.rulerEl, term.prompt, term.footerEl], { autoAlpha: 0, duration: 0.5, stagger: 0.06 }, t + 0.2)
  if (o.clear) fadeOut(tl, o.clear, t + 0.1, { dur: 0.4 })
  t = host.hopTo(tl, STAGE_CX, 650, t + 0.3, { dur: 0.7, height: 160, scale: host.sizes.end / host.px })
  sfx.at(t - 0.39, 'thud')
  d.cue('land', t - 0.39)
  fadeIn(tl, thanks, t + 0.1, { y: 16 })
  if (cite) fadeIn(tl, cite, t + 0.6, { y: 8 })
  set(tl, shell, { autoAlpha: 1 }, t + 0.8)
  host.wave(tl, t + 1.0, 4)
  host.face(tl, 'happy', t + 1.0)
  d.t = t + 4.2
}
