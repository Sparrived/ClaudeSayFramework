/**
 * 调色板。默认值取自 Claude Code 自己的深色主题；DS 系列的亮色主题在 themes.ts 里覆盖它们。
 * 框架里只有“颜色名”；每一期给颜色赋予的含义（比如“粉色 = 梯度”）写在 src/video/ 里，并在片中保持一致。
 *
 * 全部是 #rrggbb（mix / rgba 要拆它）。applyTheme() 会把每个键写成 :root 上的同名 CSS 变量
 * （ink2 → --ink-2、clawdHi → --clawd-hi），所以 CSS 里用 var(--clawd)、var(--q)…，颜色只在这里写一份。
 */
const CLAUDE_PALETTE = {
  ink: '#1F1E1D', // 底色（Claude 深色终端）
  ink2: '#292826',
  ink3: '#34322F',
  line: '#46433E',
  fg: '#EEEAE2',
  dim: '#9A958B',
  faint: '#625E57',
  clawd: '#D77757', // 主色：讲解员的颜色（Claude 系列是 Clawd 的橙，DS 系列是鲸鱼蓝）
  clawdHi: '#EB9F7F', // 主色的亮版（claudeShimmer）
  q: '#B1B9F9', // 淡紫蓝（permission 色）；Transformer 那期用作 Query
  k: '#4EBA65', // 绿（success 色）；Key
  v: '#FFC107', // 琥珀（warning 色）；Value
  red: '#FF6B80',
  pink: '#FD5DB1',
  purple: '#AF87FF',
  blue: '#56B6F7',
  teal: '#48968C',
  prompt: '#888888',
  // ↓ 界面零件的颜色（原来写死在各处，亮色主题要换掉）
  bubble: '#282725', // 讲解气泡的底
  shimmer: '#FFD2BD', // 思考动词上扫过的高光
  heatHi: '#FFE3A3', // 顺序色带（heat）最热的一端
  onAccent: '#1F1E1D', // 主色块上的字
  shade: '#1F1E1D', // ANSI 大字的阴影线：主色和它对半混
  scan: '#EEEAE2', // ANSI 大字扫出来时前面那道光
  sweat: '#8FC6EC', // 头顶的汗滴
  titleShadow: '#6F3B2C', // 封面副题的硬投影
}

export type Palette = Record<keyof typeof CLAUDE_PALETTE, string>

/** 当前主题的颜色（片子开始时由 applyTheme 定下来，之后不再变） */
export const C: Palette = { ...CLAUDE_PALETTE }

/** Claude 深色主题的原始颜色（主题只写和它不同的那些） */
export const BASE_PALETTE: Readonly<Palette> = CLAUDE_PALETTE

/** 调色板的键 → CSS 变量名：ink2 → --ink-2，clawdHi → --clawd-hi */
export const cssVar = (key: string) => `--${key.replace(/([A-Z]|\d+)/g, '-$1').toLowerCase()}`

/** 发散色带：负数 → 蓝，0 → 底色，正数 → 粉；v 取 [-1, 1] */
export function diverge(v: number) {
  return diverge2(v, C.pink, C.blue)
}

/** 自选两端颜色的发散色带：v 取 [-1, 1]，负数 → neg，0 → 底色，正数 → pos */
export function diverge2(v: number, pos: string, neg: string) {
  const x = Math.max(-1, Math.min(1, v))
  return x < 0 ? mix(C.ink3, neg, -x) : mix(C.ink3, pos, x)
}

/** 顺序色带：0 → 底色，1 → heatHi（深色主题是亮橙黄，亮色主题是深蓝）——注意力权重之类的非负量；v 取 [0, 1] */
export function heat(v: number) {
  const x = Math.max(0, Math.min(1, v))
  return x < 0.6 ? mix(C.ink3, C.clawd, x / 0.6) : mix(C.clawd, C.heatHi, (x - 0.6) / 0.4)
}

/** 相对亮度（0 黑 … 1 白），只看 #rrggbb */
export function luma(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

/** 线性混合两个 #rrggbb 颜色 */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (p: number, shift: number) => (p >> shift) & 255
  const out = [16, 8, 0].map((sh) => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * t))
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** #rrggbb → rgba(r,g,b,a) */
export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
