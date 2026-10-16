import './outro.css'
import { gsap } from 'gsap'
import type { Director } from '../../engine/director'
import { h, hide } from '../../engine/lib/dom'
import { panel } from '../../engine/lib/panel'
import { fadeIn, popIn, typeText } from '../../engine/lib/viz'
import { ending } from '../../engine/kit'

/** 终端里的一行命令：❯ 后面的命令逐字打出来 */
function cmdLine() {
  const cmd = h('span')
  const row = h('div', { class: 'ou-line' }, [h('span', { class: 'ou-gt', text: '❯ ' }), cmd])
  return { row, cmd }
}

const outLine = (ok: boolean, text: string) =>
  h('div', { class: 'ou-out' }, ['  ', h('span', { class: ok ? 'seg-k' : 'seg-o', text: ok ? '✓' : '→' }), ` ${text}`])

/** 片尾：怎么开新的一期（npm run new → 写场景 → npm run render），然后 /exit */
export function outro(d: Director) {
  const { tl, clawd, sfx } = d
  const L = d.layer('outro')

  // ── 一个终端窗口 ──
  const c1 = cmdLine()
  const out1 = [outLine(true, '复制框架和示例片'), outLine(true, '安装依赖'), outLine(false, '../ClaudeSayNext')]
  const c2 = cmdLine()
  const fill = h('i')
  const bar = h('div', { class: 'ou-out' }, ['  ', h('span', { class: 'ou-bar' }, [fill]), h('span', { class: 'ou-pct', text: ' 100%' })])
  const done = outLine(true, '完成：out/clawd-next.mp4')
  const term = panel(L, { x: 960, y: 440, w: 1120, title: ' PowerShell ', cls: 'ou-term', children: [c1.row, ...out1, c2.row, bar, done] })
  gsap.set(fill, { scaleX: 0, transformOrigin: '0% 50%' })
  hide(term, out1, c2.row, bar, done)

  d.chapter({
    id: 'outro',
    title: '开新的一期',
    step: '片尾',
    question: '怎么开始做新的一期？',
    verb: 'Scaffolding',
    layer: L,
  })

  /** 逐字打出命令，每个字配一下键盘声；返回打完的时刻 */
  const type = (el: HTMLElement, text: string, t: number) => {
    const dt = 0.035
    ;[...text].forEach((_, i) => sfx.at(t + i * dt, 'key', i))
    const end = typeText(tl, el, text, t, { dt })
    sfx.at(end + 0.1, 'enter')
    return end + 0.1
  }

  // ── 1. npm run new ──
  d.say(
    '在框架目录里敲 {o:npm run new}，就能得到一个新的视频项目。',
    (t, w) => {
      popIn(tl, term, t + 0.2, { from: 0.92 })
      const e = type(c1.cmd, 'npm run new -- ClaudeSayNext', Math.max(t + 0.5, w('npm')))
      fadeIn(tl, out1, e + 0.25, { stagger: 0.35, y: 6 })
    },
    { min: 4.6 },
  )

  // ── 2. npm run render ──
  d.say(
    '写好台词和画面，再 {o:npm run render}，成片就导出来了。',
    (t, w) => {
      fadeIn(tl, c2.row, t + 0.1, { y: 0 })
      const e = type(c2.cmd, 'npm run render', w('npm'))
      fadeIn(tl, bar, e + 0.15, { y: 0 })
      tl.to(fill, { scaleX: 1, duration: 1.3, ease: 'power1.inOut' }, e + 0.2)
      fadeIn(tl, done, e + 1.6, { y: 6 })
      sfx.at(e + 1.6, 'ding')
    },
    { min: 4.8 },
  )

  // ── 3. 下期见：前半句说话摆手，后半句挥手 ──
  d.say(
    '就这么简单。我们下一期见！',
    (t, w) => {
      clawd.talk(tl, t, w('我们') - t)
      clawd.face(tl, 'happy', w('我们'))
      clawd.prop(tl, 'heart', w('我们'), 2.2)
      clawd.wave(tl, w('我们'), 5)
    },
    { talk: false },
  )

  ending(d, L, { cwd: '~/claude-say', cite: 'Made with {o:ClaudeSayFramework}', clear: term })
}
