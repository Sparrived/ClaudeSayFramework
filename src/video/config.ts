import { MOOD } from '../engine/audio/score'
import { C } from '../engine/lib/colors'
import type { VideoConfig } from '../engine/types'

/**
 * 这一期的设置。开新片时先改这里：片名、导出文件名、进度标尺、配乐、封面。
 * 场景（台词和画面）在 scenes/ 里，按播放顺序登记在 scenes/index.ts。
 */
export const VIDEO: VideoConfig = {
  title: 'Clawd 的片场：用代码拍一支动画',
  slug: 'clawd-demo',

  terminal: {
    // 每一章用 d.chapter({ step }) 把标尺上的方块移到对应的一站
    stops: ['开场', '时间轴', '公式', '片尾'],
    placeholder: 'Try "用代码拍一支动画"',
  },

  music: {
    // 段落 id = 章节 id；开场和片尾各在一个 cue 处一分为二
    moods: {
      'intro-a': MOOD.calm,
      'intro-b': MOOD.welcome,
      timeline: { ...MOOD.arrival, boom: true },
      math: MOOD.think,
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
    tag: '小克的片场',
    badge: '框架示例',
    banner: 'CLAUDE SAY',
    title: '用代码拍动画',
    question: '这支动画是怎么做出来的？',
  },
}

/** 这一期里有固定含义的颜色（台词里用 {o:…}，公式里用 \cO{…}，画面里用 C.clawd，三处保持一致） */
export const SEM = {
  say: C.q, // d.say()：台词
  beat: C.k, // d.beat()：只放画面
  playhead: C.clawd, // 时间游标 / 播放头
}
