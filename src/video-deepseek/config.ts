import { MOOD } from '../engine/audio/score'
import { C } from '../engine/lib/colors'
import { DEEPSEEK } from '../engine/themes'
import { defineVideo } from '../engine/types'

/**
 * DS 系列的示例片（框架里用 DEMO=deepseek 预览；npm run new -- … --theme deepseek 开新片时拷成新项目的 src/video/）。
 * 开新片时先改这里：片名、导出文件名、进度标尺、配乐、封面。场景在 scenes/ 里，按播放顺序登记在 scenes/index.ts。
 * theme: DEEPSEEK —— 小鲸当讲解员、亮色对话页；defineVideo 当场应用主题，所以下面 SEM 读到的 C 已经是亮色主题的颜色。
 */
export const VIDEO = defineVideo({
  title: '小鲸的百科小课堂：天空为什么是蓝的',
  slug: 'whale-demo',
  theme: DEEPSEEK,

  terminal: {
    // 每一章用 d.chapter({ step }) 把标尺上的圆点移到对应的一站；输入框的占位提示默认是“给小鲸发送消息”
    stops: ['开场', '天空', '片尾'],
  },

  music: {
    moods: {
      'intro-a': MOOD.calm,
      'intro-b': MOOD.welcome,
      sky: MOOD.light,
      'outro-a': MOOD.windDown,
      'outro-b': MOOD.final,
    },
    splits: {
      intro: ['hop', 'intro-a', 'intro-b'],
      outro: ['land', 'outro-a', 'outro-b'],
    },
    sparkles: { title: 0.8 },
  },

  cover: {
    tag: '小鲸百科',
    badge: '框架示例',
    banner: 'WHALEPEDIA',
    title: '天空为什么是蓝的',
    question: '天空为什么是蓝色的？',
    // 小鲸比 Clawd 高，往右站一点，别碰到上面的大字
    clawdX: 1590,
  },
})

/** 这一期里有固定含义的颜色（台词、画面保持一致） */
export const SEM = {
  red: C.red, // 红光（波长最长）
  yellow: C.v, // 黄光
  green: C.k, // 绿光
  blue: C.blue, // 蓝光：天空的颜色
  violet: C.purple, // 紫光（波长最短）
}
