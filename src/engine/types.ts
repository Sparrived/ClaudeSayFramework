import type { Director } from './director'
import type { MusicPlan } from './audio/score'
import type { ShellOptions } from './ui/shell'
import type { CoverOptions } from './cover/cover'
import { applyTheme, CLAUDE, type Theme } from './themes'

/** 一个场景：往导演的时间轴上排一章的台词和画面 */
export type Scene = (d: Director) => void

/** 一期视频的设置（写在 src/video/config.ts） */
export interface VideoConfig {
  /** 片名：浏览器标签页的标题 */
  title: string
  /** 导出文件名：npm run render → out/<slug>.mp4 */
  slug: string
  /** 主题：讲解员 + 外壳 + 配色。默认 CLAUDE（Clawd、深色终端）；DS 系列用 DEEPSEEK（小鲸、亮色对话页） */
  theme?: Theme
  /** 外壳（终端 / 对话页）：顶部进度标尺的各站、输入框里的占位提示 */
  terminal: ShellOptions
  /** 配乐编排：哪一章用哪套配器（见 engine/audio/score.ts 的 MOOD） */
  music: MusicPlan
  /** 语速系数：>1 变慢，<1 变快（默认 1） */
  tempo?: number
  /** 封面（npm run cover） */
  cover: CoverOptions
}

/**
 * 定义这一期的设置，并当场应用主题。config.ts 写成 export const VIDEO = defineVideo({ … })：
 * 这样 config.ts 里（比如 SEM）、各章模块顶层读到的 C 都已经是主题的颜色。
 */
export function defineVideo(video: VideoConfig): VideoConfig {
  applyTheme(video.theme ?? CLAUDE)
  return video
}
