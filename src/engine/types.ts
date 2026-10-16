import type { Director } from './director'
import type { MusicPlan } from './audio/score'
import type { TerminalOptions } from './ui/terminal'
import type { CoverOptions } from './cover/cover'

/** 一个场景：往导演的时间轴上排一章的台词和画面 */
export type Scene = (d: Director) => void

/** 一期视频的设置（写在 src/video/config.ts） */
export interface VideoConfig {
  /** 片名：浏览器标签页的标题 */
  title: string
  /** 导出文件名：npm run render → out/<slug>.mp4 */
  slug: string
  /** 终端界面：顶部进度标尺的各站、输入框里的占位提示 */
  terminal: TerminalOptions
  /** 配乐编排：哪一章用哪套配器（见 engine/audio/score.ts 的 MOOD） */
  music: MusicPlan
  /** 语速系数：>1 变慢，<1 变快（默认 1） */
  tempo?: number
  /** 封面（npm run cover） */
  cover: CoverOptions
}
