import type { Scene } from '../../engine/types'
import { intro } from './intro'
import { sky } from './sky'
import { outro } from './outro'

/** 按播放顺序排列的场景（DS 系列：第一个用 chatOpening() 开头，最后一个用 chatEnding() 收尾） */
export const SCENES: Scene[] = [
  intro, // 开场：对话页首页 → 小鲸从鲸鱼图标里蹦出来 → 自我介绍 + 片名卡
  sky, // 天空为什么是蓝的：散射、λ⁴、Clawd 来串门追问
  outro, // 片尾：发一句谢谢，回到首页
]
