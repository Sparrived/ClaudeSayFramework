/**
 * 带种子的哈希和平滑噪声：画面里“随时间轻轻晃动”的东西（漂浮的尘埃、呼吸的光、手持感的抖动）都用它。
 *
 * rng / gauss（lib/linalg）是“一个接一个地抽”，适合构建时一次性算好的数据；
 * 这里的函数是“给一个坐标、直接查出一个数”——同样的 (x, seed) 永远得到同样的值，
 * 所以可以在重绘钩子里按时间轴的当前时刻 t 现算，拖进度条、逐帧导出都一模一样。
 */

/** 整数 → [0, 1) 的哈希（murmur3 的收尾混合）。同一个 n 永远得到同一个数 */
export function hash(n: number) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

/** 两个整数 → [0, 1) 的哈希 */
export const hash2 = (a: number, b: number) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663))

/** 0 → 1 的平滑过渡（smoothstep 的核心：两端导数为 0） */
const smooth = (k: number) => k * k * (3 - 2 * k)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/**
 * 一维值噪声，输出 [-1, 1]：每个整数点上一个随机值，中间平滑插值。
 * x 每走 1 换一个“随机目标”，所以 noise(t * 0.5) 大约两秒换一次方向。
 */
export function noise(x: number, seed = 0) {
  const i = Math.floor(x)
  const f = x - i
  const a = hash(i + seed * 7919) * 2 - 1
  const b = hash(i + 1 + seed * 7919) * 2 - 1
  return lerp(a, b, smooth(f))
}

/** 二维值噪声，输出 [-1, 1]：平面上一张起伏的“地形”，适合按位置变化的东西（云、水面、光斑的明暗） */
export function noise2(x: number, y: number, seed = 0) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smooth(x - ix)
  const fy = smooth(y - iy)
  const s = seed * 131
  const v = (i: number, j: number) => hash2(i + s, j - s) * 2 - 1
  return lerp(lerp(v(ix, iy), v(ix + 1, iy), fx), lerp(v(ix, iy + 1), v(ix + 1, iy + 1), fx), fy)
}

/**
 * 分形噪声（fbm），输出约 [-1, 1]：几层频率翻倍、幅度减半的噪声叠在一起，
 * 大起伏上带着小抖动，比单层 noise 更像自然的晃动（烛光、手持镜头）。
 */
export function fbm(x: number, seed = 0, octaves = 3) {
  let sum = 0
  let amp = 1
  let norm = 0
  let freq = 1
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, seed + o) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.03 // 不取整数倍，免得各层的格点对齐
  }
  return sum / norm
}
