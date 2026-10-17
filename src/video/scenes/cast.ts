import './cast.css'
import type { Director } from '../../engine/director'
import { Whale } from '../../engine/actors/whale'
import { arrow, drawArrow, fadeIn, fadeOut, fx, hideArrow, label } from '../../engine/lib/viz'
import { hide } from '../../engine/lib/dom'
import { C } from '../../engine/lib/colors'

/** 同事：小鲸来串门——客串演员（d.actor）、谁说话（say 的 by）、多色像素画的部件、两个演员同台 */
export function cast(d: Director) {
  const { tl, clawd, sfx } = d
  const L = d.layer('cast')

  // 小鲸站在舞台中间偏右；先藏在舞台右边外面，跳进来
  const X = 1180
  const Y = 720
  const PX = 5
  const xj = d.actor(new Whale(L, { px: PX, x: 2120, y: Y }))
  /** 精灵坐标 → 舞台坐标（她站定之后） */
  const at = (sx: number, sy: number) => [X - (xj.w * PX) / 2 + sx * PX, Y - xj.h * PX + sy * PX] as const

  // 讲到哪个部件，就在旁边标出来
  const svg = fx(L)
  const parts = [
    { word: '呆毛', text: '呆毛', to: at(14, 2), from: [930, 430] },
    { word: '耳鳍', text: '耳鳍', to: at(34, 20), from: [1460, 500] },
    { word: '眼睛', text: '眼睛', to: at(11, 21), from: [930, 560] },
    { word: '嘴', text: '嘴', to: at(17.5, 27), from: [930, 660] },
  ].map((p) => ({
    ...p,
    label: label(L, p.text, p.from[0], p.from[1], { cls: 'ca-part', anchor: p.from[0] < X ? 'r' : 'l' }),
    arrow: arrow(svg, p.from[0] + (p.from[0] < X ? 14 : -14), p.from[1], p.to[0], p.to[1], { color: C.blue, width: 3, head: 10 }),
  }))
  hide(parts.map((p) => p.label))

  d.chapter({ id: 'cast', title: '同事', step: '同事', question: '只有你一个演员吗？', verb: 'Casting', layer: L })

  d.say(
    '当然不是。给你介绍一位新同事——',
    (_, w) => {
      const t0 = w('新同事')
      clawd.look(tl, 'r', t0)
      let tt = xj.hopTo(tl, 1640, Y, t0, { dur: 0.45, height: 150 })
      sfx.at(tt - 0.39, 'thud')
      tt = xj.hopTo(tl, X, Y, tt - 0.1, { dur: 0.5, height: 170 })
      sfx.at(tt - 0.39, 'thud')
      xj.face(tl, 'happy', tt)
    },
    { min: 3.6 },
  )

  d.say(
    '大家好呀，我是{blue:小鲸}！以后的科普百科就交给我啦～',
    (t) => {
      xj.wave(tl, t + 0.2, 4)
      xj.look(tl, 'l', t + 2.4)
      xj.look(tl, 'c', t + 3.4)
      xj.face(tl, 'normal', t + 3.4)
    },
    { by: xj, min: 4.2 },
  )

  d.say(
    '她是一张多色像素画：呆毛、耳鳍、眼睛、嘴，都能单独动。',
    (_, w) => {
      for (const p of parts) {
        const tw = w(p.word)
        fadeIn(tl, p.label, tw, { y: 0, dur: 0.25 })
        drawArrow(tl, p.arrow, tw + 0.05, 0.25)
      }
      xj.spring(tl, w('呆毛'))
      xj.flap(tl, w('耳鳍'), 3)
      xj.blink(tl, w('眼睛'))
      xj.look(tl, 'u', w('眼睛') + 0.3)
      xj.look(tl, 'c', w('眼睛') + 0.8)
      xj.talk(tl, w('嘴'), 0.9)
      const off = w('单独动') + 1.4
      fadeOut(tl, parts.map((p) => p.label), off)
      for (const p of parts) hideArrow(tl, p.arrow, off)
    },
    { min: 5.6 },
  )

  d.say(
    '台词加上 {o:by}，就能指定是谁在说话。',
    (t) => {
      xj.face(tl, 'closed', t + 0.2)
      xj.face(tl, 'normal', t + 2.4)
    },
    { by: xj, min: 3.4 },
  )

  d.say(
    '同一条时间轴上，我们还能一起演！',
    (t, w) => {
      const go = w('一起演')
      clawd.lookAt(tl, xj, t)
      xj.lookAt(tl, clawd, t + 0.3)
      clawd.cheer(tl, go, 1.4)
      xj.cheer(tl, go, 1.4)
      xj.face(tl, 'happy', go)
      clawd.face(tl, 'happy', go)
      clawd.prop(tl, 'heart', go + 0.2, 1.8)
      xj.prop(tl, 'note', go + 0.3, 1.8)
      clawd.face(tl, 'normal', go + 2.0)
      clawd.look(tl, 'c', go + 2.0)
    },
    { min: 4.0 },
  )
  d.end(L)
}
