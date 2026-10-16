/**
 * 配色取自 Claude Code 自己的深色主题。框架里只有“颜色名”；
 * 每一期给颜色赋予的含义（比如“粉色 = 梯度”）写在 src/video/ 里，并在片中保持一致。
 * 同名的 CSS 变量在 styles.css 的 :root 里（--clawd、--q、--pink…）。
 */
export const C = {
  ink: '#1F1E1D', // 终端底色（Claude 深色界面）
  ink2: '#292826',
  ink3: '#34322F',
  line: '#46433E',
  fg: '#EEEAE2',
  dim: '#9A958B',
  faint: '#625E57',
  clawd: '#D77757', // Clawd 本体的橙色（claude 色）
  clawdHi: '#EB9F7F', // claudeShimmer
  q: '#B1B9F9', // 淡紫蓝（permission 色）；Transformer 那期用作 Query
  k: '#4EBA65', // 绿（success 色）；Key
  v: '#FFC107', // 琥珀（warning 色）；Value
  red: '#FF6B80',
  pink: '#FD5DB1',
  purple: '#AF87FF',
  blue: '#56B6F7',
  teal: '#48968C',
  prompt: '#888888',
} as const

/** 发散色带：负数 → 蓝，0 → 底色，正数 → 粉；v 取 [-1, 1] */
export function diverge(v: number) {
  return diverge2(v, C.pink, C.blue)
}

/** 自选两端颜色的发散色带：v 取 [-1, 1]，负数 → neg，0 → 底色，正数 → pos */
export function diverge2(v: number, pos: string, neg: string) {
  const x = Math.max(-1, Math.min(1, v))
  return x < 0 ? mix(C.ink3, neg, -x) : mix(C.ink3, pos, x)
}

/** 顺序色带：0 → 底色，1 → 亮橙黄（注意力权重之类的非负量）；v 取 [0, 1] */
export function heat(v: number) {
  const x = Math.max(0, Math.min(1, v))
  return x < 0.6 ? mix(C.ink3, C.clawd, x / 0.6) : mix(C.clawd, '#FFE3A3', (x - 0.6) / 0.4)
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
