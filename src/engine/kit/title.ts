import type { Director } from '../director'
import { at, h, hide, pin } from '../lib/dom'
import { C } from '../lib/colors'
import { STAGE_CX, STAGE_CY } from '../layout'
import { createBanner, hideBanner, revealBanner } from '../ui/banner'
import { rich } from '../ui/bubble'
import { fadeIn } from '../lib/viz'

export interface TitleCardOptions {
  /** ANSI Shadow 大字。只能用 figlet 画得出的字符：英文、数字、常用符号 */
  word: string
  /** 大字下面的中文副题，可以带 {o:…} 着色标记 */
  sub?: string
  /** 字符格的宽度（px）：越大字越大，默认 18；太宽时会自动缩到 1560px 以内 */
  cell?: number
  color?: string
}

export interface TitleCard {
  /** 在 t 时刻像打印机一样扫出大字，副题随后浮现；记下 cue「title」。返回大字完全出现的时刻 */
  reveal(t: number, dur?: number): number
  /** 在 t 时刻收起，返回收完的时刻 */
  hide(t: number): number
}

/**
 * 片名卡：和 Claude Code 启动画面同款的 ANSI Shadow 大字 + 一行副题，放在舞台正中。
 *
 *   const title = titleCard(d, L, { word: 'MIXA', sub: '{o:注意力重要性分数} × SteLLA' })
 *   d.say('今天……', (t) => { const shown = title.reveal(t + 0.8); title.hide(shown + 2) }, { min: 4.6 })
 */
export function titleCard(d: Director, layer: HTMLElement, o: TitleCardOptions): TitleCard {
  const { tl, sfx } = d
  const banner = createBanner(o.word, { cell: o.cell ?? 18, maxWidth: 1560, color: o.color ?? C.clawd })
  const top = STAGE_CY - banner.height / 2 - 40
  at(banner.el, STAGE_CX - banner.width / 2, top)
  layer.append(banner.el)
  let sub: HTMLElement | null = null
  if (o.sub) {
    sub = rich(o.sub, at(h('div', { class: 'title-sub' }), STAGE_CX, top + banner.height + 36))
    layer.append(sub)
    pin(sub)
    hide(sub)
  }
  return {
    reveal(t, dur = 1.0) {
      sfx.at(t, 'whoosh')
      const shown = revealBanner(tl, banner, t, dur)
      d.cue('title', shown)
      if (sub) fadeIn(tl, sub, shown - 0.2, { y: 16, dur: 0.5 })
      return shown
    },
    hide(t) {
      const done = hideBanner(tl, banner, t, 0.5)
      if (sub) tl.to(sub, { autoAlpha: 0, duration: 0.4 }, t + 0.1)
      return done
    },
  }
}
