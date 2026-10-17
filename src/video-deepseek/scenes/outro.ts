import type { Director } from '../../engine/director'
import { chatEnding } from '../../engine/kit'

/** 片尾：预告一下，然后观众发一句谢谢，回到首页 */
export function outro(d: Director) {
  const { tl, host } = d
  const L = d.layer('outro')
  d.chapter({ id: 'outro', title: '下期见', step: '片尾', question: '下期讲什么？', thought: '嗯，用户在问下一期……', layer: L })

  d.say('下期想听什么？在评论区告诉{o:小鲸}吧！', (t) => {
    host.face(tl, 'happy', t + 0.4)
    host.prop(tl, 'heart', t + 0.6, 2.2)
  })

  chatEnding(d, L, { cite: 'Made with {o:ClaudeSayFramework}' })
}
