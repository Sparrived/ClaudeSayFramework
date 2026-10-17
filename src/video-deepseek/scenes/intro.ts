import type { Director } from '../../engine/director'
import { chatOpening, titleCard } from '../../engine/kit'

/** 开场：DS 系列统一的片头（对话页首页，小鲸从鲸鱼图标里蹦出来）→ 自我介绍 → 片名卡 */
export function intro(d: Director) {
  const { tl, host } = d
  const L = chatOpening(d, { question: '你是谁？', step: '开场' })
  const title = titleCard(d, L, { word: 'WHALEPEDIA', sub: '小鲸的{o:百科}小课堂' })

  d.say('嗨！我是{o:小鲸}，以后由我来讲科普百科。', (t) => {
    host.wave(tl, t + 0.2, 4)
  })

  d.say(
    '这段小片子演示 DS 系列的样子：亮色的对话页，和会动的我。',
    (_, w) => {
      // 说到“亮色”的时候扫出片名
      const shown = title.reveal(w('亮色'))
      host.face(tl, 'happy', shown)
      host.face(tl, 'normal', shown + 2.2)
      title.hide(shown + 2.2)
    },
    // 片名要放完（扫出 1.0 + 停留 2.2 + 收起 0.5），这句不能比它短
    { min: 4.8 },
  )
  d.end(L, 0.3)
}
