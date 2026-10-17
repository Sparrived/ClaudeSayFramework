import { BASE_PALETTE, C, cssVar, type Palette } from './lib/colors'
import type { Actor, ActorSizes } from './actors/actor'
import { Clawd } from './actors/clawd'
import { Whale } from './actors/whale'
import { Terminal } from './ui/terminal'
import { Chat } from './ui/chat'
import type { Shell, ShellOptions } from './ui/shell'
import type { Sfx } from './audio/sfx'

/** 只给 CSS 用的样式值（带透明度的颜色、阴影）：写成同名 CSS 变量（paperShadow → --paper-shadow） */
export interface StyleVars {
  /** 播放器里舞台外面的底色（不进视频） */
  page: string
  /** 演员脚下的影子 */
  shadow: string
  /** 论文首页（paperPage）的投影 */
  paperShadow: string
  /** 彩色块上文字的光晕（矩阵形状块的名字） */
  onAccentGlow: string
}

const BASE_VARS: StyleVars = {
  page: '#121110',
  shadow: 'rgba(0, 0, 0, 0.4)',
  paperShadow: '0 34px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  onAccentGlow: 'rgba(255, 255, 255, 0.35)',
}

/**
 * 主题：一个系列的样子——讲解员、外壳、配色。
 * 一期视频在 config.ts 里用 defineVideo({ theme: … }) 选主题；新主题照着下面的 CLAUDE 写一个对象就行，不用改 boot。
 */
export interface Theme {
  /** 写到 <html data-theme="…">：少量版式差异的 CSS 按它区分 */
  id: string
  /** 外壳是哪一类界面：终端 / 对话页（封面跟着它出两种版式） */
  ui: 'terminal' | 'chat'
  /** 和默认调色板（Claude 深色，lib/colors.ts）不同的颜色 */
  palette?: Partial<Palette>
  /** 和默认不同的 CSS 样式值 */
  vars?: Partial<StyleVars>
  /** 请出讲解员：at 是脚底中心；size 是场合（home 在家 / cover 封面…），决定像素大小 */
  host(parent: HTMLElement, at: { x: number; y: number }, size?: keyof ActorSizes): Actor
  /** 搭外壳 */
  shell(parent: HTMLElement, sfx: Sfx, o: ShellOptions): Shell
}

/** Claude 系列（默认）：Clawd 当讲解员，Claude Code 深色终端 */
export const CLAUDE: Theme = {
  id: 'claude',
  ui: 'terminal',
  host: (parent, at, size = 'home') => new Clawd(parent, { ...at, px: Clawd.SIZES[size] }),
  shell: (parent, sfx, o) => new Terminal(parent, sfx, o),
}

/**
 * DS 系列：小鲸当讲解员，亮色对话页（致敬 DeepSeek 网页版）。
 * 白底、鲸鱼蓝主色；各种着色都换成在白底上看得清的深色版（对比度大多在 3:1 以上）。
 */
export const DEEPSEEK: Theme = {
  id: 'deepseek',
  ui: 'chat',
  palette: {
    ink: '#FFFFFF',
    ink2: '#F3F5FA',
    ink3: '#E6EAF2',
    line: '#D3D9E6',
    fg: '#1F2433',
    dim: '#5F6880',
    faint: '#9BA3B5',
    clawd: '#4D6BFE', // 鲸鱼蓝（DeepSeek 的品牌色）
    clawdHi: '#7F96FF',
    q: '#5B5BD6',
    k: '#16A34A',
    v: '#D97706',
    red: '#E5484D',
    pink: '#DB2777',
    purple: '#8B5CF6',
    blue: '#0EA5E9', // 天蓝：和主色的鲸鱼蓝分开
    teal: '#0F9488',
    prompt: '#98A1B3',
    bubble: '#F4F7FF',
    shimmer: '#C3CEFF',
    heatHi: '#1C2B7A', // 亮底上热度色带越热越深
    onAccent: '#FFFFFF',
    shade: '#1B2140',
    scan: '#AFC0FF',
    sweat: '#3A9BDC',
    titleShadow: '#C7D2FE',
  },
  vars: {
    page: '#E9EDF5',
    shadow: 'rgba(28, 38, 80, 0.16)',
    paperShadow: '0 16px 40px rgba(20, 30, 60, 0.14), 0 0 0 1px rgba(20, 30, 60, 0.08)',
    onAccentGlow: 'rgba(0, 0, 0, 0)',
  },
  host: (parent, at, size = 'home') => new Whale(parent, { ...at, px: Whale.SIZES[size] }),
  shell: (parent, sfx, o) => new Chat(parent, sfx, o),
}

/**
 * 把主题定下来：改写 C、把调色板和样式值写成 :root 上的 CSS 变量、挂 data-theme。
 * defineVideo() 在 config.ts 求值时就调用它，所以之后各个模块读到的 C 都已经是主题色；boot / 封面会再调一次（同一个主题重复调用没有副作用）。
 */
export function applyTheme(theme: Theme) {
  Object.assign(C, BASE_PALETTE, theme.palette)
  const root = document.documentElement
  for (const [k, v] of Object.entries(C)) root.style.setProperty(cssVar(k), v)
  for (const [k, v] of Object.entries({ ...BASE_VARS, ...theme.vars })) root.style.setProperty(cssVar(k), v)
  root.dataset.theme = theme.id
}
