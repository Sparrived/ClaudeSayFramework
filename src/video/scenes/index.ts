import type { Scene } from '../../engine/types'
import { intro } from './intro'
import { cast } from './cast'
import { timeline } from './timeline'
import { math } from './math'
import { outro } from './outro'

/** 按播放顺序排列的场景（第一个必须用 opening() 开头，最后一个必须用 ending() 收尾） */
export const SCENES: Scene[] = [
  intro, // 开场：片头 + 自我介绍 + 片名卡
  cast, // 同事：小鲸来串门（客串演员、谁在说话、多色像素画的部件）
  timeline, // 一条时间轴：d.say / d.beat / seek / 逐帧导出
  math, // 公式与图表：KaTeX 分段高亮、热力图、D3 曲线、重绘钩子
  outro, // 片尾：npm run new / npm run render，然后 /exit
]
