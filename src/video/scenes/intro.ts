import type { Director } from '../../engine/director'
import { opening, titleCard } from '../../engine/kit'

/** 开场：系列统一的片头（敲下 claude，Clawd 跳出欢迎框）→ 自我介绍 → 片名卡 */
export function intro(d: Director) {
  const { tl, clawd } = d
  const L = opening(d, { cwd: '~/claude-say', question: '你是谁？', verb: 'Waking up', step: '开场' })
  const title = titleCard(d, L, { word: 'CLAUDE SAY', sub: '用{o:代码}拍一支讲解动画' })

  d.say('嗨！我是 {o:Clawd}，住在 Claude Code 终端里的那只橙色小家伙。', (t) => {
    clawd.wave(tl, t + 0.2, 4)
  })

  d.say(
    '这段小片子演示：怎样用代码，拍一支讲解动画。',
    (_, w) => {
      // 说到“用代码”的时候扫出片名
      const shown = title.reveal(w('用代码'))
      clawd.face(tl, 'happy', shown)
      clawd.face(tl, 'normal', shown + 2.2)
      title.hide(shown + 2.2)
    },
    // 片名要放完（扫出 1.0 + 停留 2.2 + 收起 0.5），这句不能比它短
    { min: 4.8 },
  )
  d.end(L, 0.3)
}
