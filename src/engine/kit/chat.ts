import { gsap } from 'gsap'
import type { Director } from '../director'
import { at, h, hide, pin, s, set } from '../lib/dom'
import { fadeIn, fadeOut, popIn } from '../lib/viz'
import { HOST_HOME, PROMPT, STAGE_CX } from '../layout'
import { rich } from '../ui/bubble'
import { Chat } from '../ui/chat'
import { paint } from '../actors/pixel'
import { WHALE_ICON, WHALE_PALETTE } from '../actors/whale-art'

/** 首页正中的像素鲸鱼图标：水花单独一组（好让它喷一下） */
export function whaleIcon(px: number) {
  const SPOUT = 3
  const spout = paint(WHALE_ICON.rows.slice(0, SPOUT), WHALE_PALETTE)
  const body = paint(WHALE_ICON.rows.slice(SPOUT), WHALE_PALETTE, 0, SPOUT)
  const el = s(
    'svg',
    {
      class: 'ch-icon',
      viewBox: `0 0 ${WHALE_ICON.w} ${WHALE_ICON.h}`,
      width: WHALE_ICON.w * px,
      height: WHALE_ICON.h * px,
      'shape-rendering': 'crispEdges',
      overflow: 'visible',
    },
    [body, spout],
  )
  return { el, spout, body, w: WHALE_ICON.w * px, h: WHALE_ICON.h * px }
}

/** 鲸鱼喷一下水：水花往上蹿两格再落回来 */
function squirt(tl: gsap.core.Timeline, spout: SVGGElement, t: number) {
  set(tl, spout, { y: -1 }, t)
  set(tl, spout, { y: -2 }, t + 0.08)
  set(tl, spout, { y: -1 }, t + 0.2)
  set(tl, spout, { y: 0 }, t + 0.3)
}

const asChat = (d: Director, kit: string) => {
  if (!(d.term instanceof Chat)) throw new Error(`${kit}() 要配对话页外壳（主题 DEEPSEEK）；Claude 系列用 opening() / ending()`)
  return d.term
}

/** 首页的版面：图标、问候语、小字、居中的输入框 */
const ICON_PX = 7
const ICON_TOP = 210
const HELLO_Y = 400
const SUB_Y = 470
const HOME_BOX = { left: 400, top: 548, width: 1120 }

export interface ChatOpeningOptions {
  /** 观众的第一个问题，比如 '天空为什么是蓝色的？' */
  question: string
  /** 首页的问候语，可以带 {o:…} 着色标记（默认「嗨，我是{o:小鲸}，很高兴见到你！」） */
  greeting?: string
  /** 问候语下面的一行小字（默认「今天想了解点什么？」） */
  sub?: string
  /** 第一次深度思考里流出来的心里话 */
  thought?: string
  /** 开场这一章的 id / 章节名（默认 'intro' / '开场'） */
  id?: string
  title?: string
  /** 进度标尺的第一站 */
  step?: string
}

/**
 * DS 系列统一的片头（约 8 秒）：对话页的首页——像素鲸鱼图标喷个水花、问候语、居中的输入框 →
 * 观众打出第一个问题、发送 → 首页收成对话布局（输入框落到底部、问题变成右上角的用户气泡、标尺和底栏出现）→
 * 深度思考 → 小鲸从鲸鱼图标里蹦出来，落到输入框上（cue: hop）。
 *
 * 必须是第一个场景（主题 DEEPSEEK）。返回开场这一章的图层：片头之后的台词和画面接着往里放，讲完 d.end(layer)。
 */
export function chatOpening(d: Director, o: ChatOpeningOptions) {
  const { tl, host, sfx } = d
  const chat = asChat(d, 'chatOpening')
  const id = o.id ?? 'intro'
  const L = d.layer(id)
  gsap.set(L, { autoAlpha: 1 })

  // ── 首页 ──
  const icon = whaleIcon(ICON_PX)
  at(icon.el, STAGE_CX - icon.w / 2, ICON_TOP)
  const hello = rich(o.greeting ?? '嗨，我是{o:小鲸}，很高兴见到你！', at(h('div', { class: 'ch-hello' }), STAGE_CX, HELLO_Y))
  const sub = at(h('div', { class: 'ch-sub', text: o.sub ?? '今天想了解点什么？' }), STAGE_CX, SUB_Y)
  L.append(icon.el, hello, sub)
  pin(hello)
  pin(sub)
  hide(icon.el, hello, sub)
  gsap.set(icon.el, { transformOrigin: '50% 100%' })

  // 输入框先摆在首页的位置（居中、窄一些），提问之后再落到底部；讲解员这时还没出现
  gsap.set(chat.prompt, { left: HOME_BOX.left, top: HOME_BOX.top, width: HOME_BOX.width })
  hide(chat.rulerEl, chat.prompt, chat.footerEl, host.root)
  d.chapter({ id, title: o.title ?? '开场', step: o.step })

  // ── 图标、问候语、输入框依次出现 ──
  let t = d.t + 0.4
  popIn(tl, icon.el, t, { from: 0.6 })
  sfx.at(t, 'pop')
  squirt(tl, icon.spout, t + 0.45)
  fadeIn(tl, hello, t + 0.5, { y: 14 })
  fadeIn(tl, sub, t + 0.75, { y: 10 })
  tl.fromTo(chat.prompt, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', immediateRender: false }, t + 0.95)
  squirt(tl, icon.spout, t + 1.9)

  // ── 观众提问 ──
  t = chat.ask(tl, o.question, t + 2.3)

  // ── 首页收成对话布局 ──
  tl.to([hello, sub], { autoAlpha: 0, y: -12, duration: 0.3, ease: 'power1.in' }, t - 0.1)
  tl.to(
    chat.prompt,
    { left: PROMPT.left, top: PROMPT.top, width: PROMPT.right - PROMPT.left, duration: 0.6, ease: 'power3.inOut' },
    t,
  )
  tl.to([chat.rulerEl, chat.footerEl], { autoAlpha: 1, duration: 0.4, stagger: 0.08 }, t + 0.35)
  t = chat.think(tl, t + 0.5, 1.2, { thought: o.thought ?? '嗯，用户想认识我，先打个招呼吧……' })

  // ── 小鲸从鲸鱼图标里蹦出来 ──
  tl.to(icon.el, { scaleY: 0.72, scaleX: 1.12, duration: 0.12, ease: 'power2.out' }, t)
  tl.to(icon.el, { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.12)
  squirt(tl, icon.spout, t + 0.05)
  sfx.at(t + 0.1, 'pop')
  host.place(tl, STAGE_CX, ICON_TOP + icon.h * 0.6, t + 0.1, host.sizes.mini / host.px)
  tl.fromTo(host.root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, immediateRender: false }, t + 0.1)
  host.face(tl, 'wide', t + 0.1)
  t = host.hopTo(tl, HOST_HOME.x, HOST_HOME.y, t + 0.25, { dur: 0.85, height: 260, scale: 1 })
  sfx.at(t - 0.39, 'thud')
  d.cue('hop', t - 0.39)
  tl.to(icon.el, { autoAlpha: 0, y: -10, duration: 0.35, ease: 'power1.in' }, t - 0.8)
  host.face(tl, 'happy', t)
  host.face(tl, 'normal', t + 1.0)
  d.t = t + 0.15
  return L
}

export interface ChatEndingOptions {
  /** 观众最后发的一句（默认「谢谢小鲸，下次见！」） */
  farewell?: string
  /** 片尾卡的大字，默认「谢谢观看」；可以带 {o:…} 着色标记 */
  thanks?: string
  /** 大字下面的一行小字（出处 / 引用），可以带 {o:…} 着色标记 */
  cite?: string
  /** 一起淡出的画面（这一章里还留在舞台上的东西） */
  clear?: gsap.TweenTarget
}

/**
 * DS 系列统一的片尾（约 7 秒）：观众在输入框里发一句“谢谢小鲸，下次见！”→ 对话界面淡出、回到首页 →
 * 鲸鱼图标重新出现，问候语的位置换成“谢谢观看”和出处，小鲸跳到中间挥手（cue: land）。
 * 首尾都落在首页，对应 Claude 系列 shell 提示符的首尾呼应。
 *
 * 在最后一句台词之后调用；layer 是这一章的图层。必须是最后一个场景的最后一步。
 */
export function chatEnding(d: Director, layer: HTMLElement, o: ChatEndingOptions = {}) {
  const { tl, host, sfx } = d
  const chat = asChat(d, 'chatEnding')

  const icon = whaleIcon(ICON_PX)
  at(icon.el, STAGE_CX - icon.w / 2, ICON_TOP - 30)
  const thanks = rich(o.thanks ?? '谢谢观看', at(h('div', { class: 'end-thanks' }), STAGE_CX, HELLO_Y - 10))
  const cite = o.cite ? rich(o.cite, at(h('div', { class: 'end-cite' }), STAGE_CX, SUB_Y + 4)) : null
  layer.append(icon.el, thanks)
  if (cite) layer.append(cite)
  pin(thanks)
  if (cite) pin(cite)
  hide(icon.el, thanks)
  if (cite) hide(cite)

  d.hush()
  let t = d.t + 0.2
  host.look(tl, 'd', t)
  t = chat.ask(tl, o.farewell ?? '谢谢小鲸，下次见！', t)
  host.look(tl, 'c', t)
  host.face(tl, 'happy', t)
  // 等用户气泡淡入（0.35s）走完再收，两段补间不重叠
  chat.clearHeading(tl, t + 0.45)
  tl.to([chat.rulerEl, chat.prompt, chat.footerEl], { autoAlpha: 0, duration: 0.5, stagger: 0.06 }, t + 0.25)
  if (o.clear) fadeOut(tl, o.clear, t + 0.1, { dur: 0.4 })

  // ── 回到首页：鲸鱼图标、谢谢观看，小鲸跳到中间 ──
  popIn(tl, icon.el, t + 0.7, { from: 0.6 })
  sfx.at(t + 0.7, 'pop')
  squirt(tl, icon.spout, t + 1.1)
  t = host.hopTo(tl, STAGE_CX, 790, t + 0.4, { dur: 0.75, height: 200, scale: host.sizes.end / host.px })
  sfx.at(t - 0.39, 'thud')
  d.cue('land', t - 0.39)
  fadeIn(tl, thanks, t + 0.1, { y: 16 })
  if (cite) fadeIn(tl, cite, t + 0.6, { y: 8 })
  host.wave(tl, t + 0.9, 4)
  squirt(tl, icon.spout, t + 2.2)
  d.t = t + 4.2
}
