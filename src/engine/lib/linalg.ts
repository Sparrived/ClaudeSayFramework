/**
 * 一个够用的小线性代数库：可视化里的矩阵、梯度、采样全部在构建时用它“真算”出来。
 * 随机数一律走带种子的生成器，每次打开页面、每次导出视频，画面都完全一样。
 */
export type Mat = number[][]

/** mulberry32：带种子的 [0, 1) 均匀分布 */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 标准正态分布（Box–Muller），同样带种子 */
export function gauss(seed: number) {
  const u = rng(seed)
  let spare: number | null = null
  return () => {
    if (spare !== null) {
      const s = spare
      spare = null
      return s
    }
    let a = 0
    while (a <= 1e-12) a = u()
    const b = u()
    const r = Math.sqrt(-2 * Math.log(a))
    spare = r * Math.sin(2 * Math.PI * b)
    return r * Math.cos(2 * Math.PI * b)
  }
}

export const zeros = (n: number, m: number): Mat => Array.from({ length: n }, () => new Array(m).fill(0))
export const map = (a: Mat, f: (v: number, i: number, j: number) => number): Mat => a.map((r, i) => r.map((v, j) => f(v, i, j)))

/** n×m 的标准正态矩阵 */
export function randn(seed: number, n: number, m: number): Mat {
  const g = gauss(seed)
  return Array.from({ length: n }, () => Array.from({ length: m }, g))
}

export function matmul(a: Mat, b: Mat): Mat {
  const n = a.length
  const k = b.length
  const m = b[0].length
  const out = zeros(n, m)
  for (let i = 0; i < n; i++)
    for (let p = 0; p < k; p++) {
      const v = a[i][p]
      if (v === 0) continue
      for (let j = 0; j < m; j++) out[i][j] += v * b[p][j]
    }
  return out
}

export const transpose = (a: Mat): Mat => a[0].map((_, j) => a.map((r) => r[j]))
export const scale = (a: Mat, s: number) => map(a, (v) => v * s)
export const add = (a: Mat, b: Mat) => map(a, (v, i, j) => v + b[i][j])
export const sub = (a: Mat, b: Mat) => map(a, (v, i, j) => v - b[i][j])
export const hadamard = (a: Mat, b: Mat) => map(a, (v, i, j) => v * b[i][j])
export const relu = (a: Mat) => map(a, (v) => Math.max(0, v))
export const sum = (a: Mat) => a.reduce((s, r) => s + r.reduce((x, y) => x + y, 0), 0)
export const maxAbs = (a: Mat) => a.reduce((s, r) => Math.max(s, ...r.map(Math.abs)), 0)
export const rowSums = (a: Mat) => a.map((r) => r.reduce((x, y) => x + y, 0))
export const flat = (a: Mat) => a.flat()

/** 每一行做 softmax */
export function softmaxRows(a: Mat): Mat {
  return a.map((r) => {
    const mx = Math.max(...r)
    const e = r.map((v) => Math.exp(v - mx))
    const s = e.reduce((x, y) => x + y, 0)
    return e.map((v) => v / s)
  })
}

/** Frobenius 内积 ⟨A, B⟩_F = Σᵢⱼ AᵢⱼBᵢⱼ = Tr(AᵀB) */
export const frob = (a: Mat, b: Mat) => sum(hadamard(a, b))
/** Frobenius 范数 ‖A‖_F */
export const norm = (a: Mat) => Math.sqrt(frob(a, a))

/** 迹 */
export function trace(a: Mat) {
  let s = 0
  for (let i = 0; i < Math.min(a.length, a[0].length); i++) s += a[i][i]
  return s
}

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
export function std(xs: number[]) {
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
}

/** 等宽分箱：返回每个箱子里的样本比例（总和为 1，落在区间外的样本不计） */
export function histogram(xs: number[], lo: number, hi: number, bins: number) {
  const out = new Array(bins).fill(0)
  const w = (hi - lo) / bins
  for (const x of xs) {
    const k = Math.floor((x - lo) / w)
    if (k >= 0 && k < bins) out[k]++
  }
  return out.map((c) => c / xs.length)
}
