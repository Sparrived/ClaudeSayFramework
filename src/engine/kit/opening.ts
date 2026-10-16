import { gsap } from 'gsap'
import type { Director } from '../director'
import { at, h, hide, set } from '../lib/dom'
import { CLAWD_HOME, CLAWD_PX, HEADING_Y, MARGIN, STAGE_CX, STAGE_CY } from '../layout'

export interface OpeningOptions {
  /** 终端的当前目录：shell 提示符和欢迎框里都会显示，比如 '~/papers/iccv2025' */
  cwd: string
  /** 观众敲进输入框的第一个问题，比如 '你是谁？'、'今天读哪篇论文？' */
  question: string
  /** 思考动画里的动词（Claude Code 风格），比如 'Waking up'、'Reading PDF' */
  verb?: string
  /** 欢迎框里的模型名 */
  model?: string
  /** 开场这一章的 id / 章节名（默认 'intro' / '开场'） */
  id?: string
  title?: string
  /** 进度标尺的第一站 */
  step?: string
}

/** shell 提示符：`~/path ❯ ` 后面接上 rest */
export function shellPrompt(cwd: string, ...rest: Node[]) {
  return h('div', { class: 'shell' }, [h('span', { class: 'sh-path', text: cwd }), h('span', { class: 'sh-arrow', text: ' ❯ ' }), ...rest])
}

/**
 * 系列统一的片头（约 7 秒）：终端里敲下 claude → Claude Code 欢迎框和迷你 Clawd 出现、东张西望 →
 * 观众提出第一个问题 → Clawd 吃了一惊，跳出欢迎框落到输入框上（cue: hop）。
 *
 * 必须是第一个场景。返回开场这一章的图层：片头之后的台词和画面（片名卡等）接着往这个图层里放，
 * 讲完 d.end(layer)。
 */
export function opening(d: Director, o: OpeningOptions) {
  const { tl, clawd, term, sfx } = d
  const id = o.id ?? 'intro'
  const L = d.layer(id)
  gsap.set(L, { autoAlpha: 1 })

  // 终端里的 shell 提示符
  const typed = [...'claude'].map((c) => h('span', { text: c }))
  const cursor = h('span', { class: 'cursor' })
  const shell = at(shellPrompt(o.cwd, ...typed, cursor), MARGIN, HEADING_Y)
  gsap.set(typed, { display: 'none' })

  // Claude Code 的欢迎框
  const welcome = h('div', { class: 'welcome' }, [
    h('div', { class: 'welcome-title', text: ' Claude Code ' }),
    h('div', { class: 'welcome-hi', text: 'Welcome back!' }),
    h('div', { class: 'welcome-meta' }, [h('div', { text: o.model ?? 'Opus 5.5' }), h('div', { text: o.cwd })]),
  ])
  const WB = { w: 760, h: 420 }
  at(welcome, STAGE_CX - WB.w / 2, STAGE_CY - WB.h / 2 - 10)
  Object.assign(welcome.style, { width: `${WB.w}px`, height: `${WB.h}px` })
  hide(welcome)
  L.append(shell, welcome)

  // 一开始只有 shell；Claude Code 的界面和 Clawd 都还没出现
  hide(term.rulerEl, term.prompt, term.footerEl, clawd.root)
  d.chapter({ id, title: o.title ?? '开场', step: o.step })

  // ── 敲下 claude ──
  let t = d.t + 0.55
  typed.forEach((c, i) => {
    set(tl, c, { display: 'inline' }, t + i * 0.09)
    sfx.at(t + i * 0.09, 'key', i)
  })
  t += typed.length * 0.09 + 0.35
  sfx.at(t, 'enter')
  set(tl, cursor, { autoAlpha: 0 }, t)

  // ── 欢迎框 + 迷你 Clawd ──
  t += 0.25
  tl.fromTo(welcome, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out', immediateRender: false }, t)
  // 迷你版：一个精灵像素只有 6 个舞台像素，像终端里那么小
  clawd.place(tl, STAGE_CX, STAGE_CY + 46, t, 6 / CLAWD_PX)
  tl.fromTo(clawd.root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, t + 0.2)
  sfx.at(t + 0.2, 'pop')
  tl.to([term.rulerEl, term.prompt, term.footerEl], { autoAlpha: 1, duration: 0.4, stagger: 0.08 }, t + 0.3)

  // 东张西望
  clawd.look(tl, 'l', t + 1.1)
  clawd.look(tl, 'r', t + 1.6)
  clawd.look(tl, 'c', t + 2.1)
  clawd.blink(tl, t + 2.3)

  // ── 观众提问 ──
  t += 2.6
  tl.to(shell, { autoAlpha: 0, duration: 0.25 }, t)
  clawd.look(tl, 'd', t)
  t = term.ask(tl, o.question, t)
  clawd.look(tl, 'u', t)
  t = term.think(tl, t, 0.9, o.verb ?? 'Waking up')
  clawd.look(tl, 'c', t)

  // ── 吃惊，跳出欢迎框，落到输入框上 ──
  clawd.face(tl, 'wide', t)
  t = clawd.hopTo(tl, CLAWD_HOME.x, CLAWD_HOME.y, t + 0.1, { dur: 0.75, height: 220, scale: 1 })
  sfx.at(t - 0.39, 'thud')
  d.cue('hop', t - 0.39)
  tl.to(welcome, { autoAlpha: 0, scale: 0.94, duration: 0.3, ease: 'power2.in' }, t - 0.8)
  clawd.face(tl, 'normal', t)
  d.t = t + 0.15
  return L
}
