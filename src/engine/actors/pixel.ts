import { gsap } from 'gsap'
import { s, set } from '../lib/dom'

type TL = gsap.core.Timeline

/** 调色板：点阵里的一个字符 → 一种颜色。'.' 和空格是透明 */
export type Palette = Record<string, string>

/**
 * 把字符点阵画成 SVG：每个字符是一个精灵像素，(x, y) 是点阵左上角在精灵坐标里的位置。
 * 同一行里连续的同色像素合并成一个 <rect>，几十乘几十的像素画也只有几百个节点。
 *
 *   paint(['.##.', '#oo#'], { '#': '#1B2A6B', o: '#4D6BFE' }, 3, 0)
 */
export function paint(rows: readonly string[], palette: Palette, x = 0, y = 0): SVGGElement {
  const g = s('g')
  rows.forEach((row, j) => {
    const cells = [...row]
    for (let i = 0; i < cells.length; ) {
      const c = cells[i]
      let k = i + 1
      while (k < cells.length && cells[k] === c) k++
      if (c !== '.' && c !== ' ') {
        const fill = palette[c]
        if (!fill) throw new Error(`调色板里没有「${c}」（点阵第 ${j} 行：${row}）`)
        g.append(s('rect', { x: x + i, y: y + j, width: k - i, height: 1, fill }))
      }
      i = k
    }
  })
  return g
}

/** 左右镜像：对称的部件只画一半，另一半镜像出来 */
export function mirror(rows: readonly string[]): string[] {
  return rows.map((r) => [...r].reverse().join(''))
}

/** 把一半点阵和它的镜像拼成完整的一行行（中间不重复） */
export function symmetric(half: readonly string[]): string[] {
  return half.map((r) => r + [...r].reverse().join(''))
}

/**
 * 多帧部件：每一帧一个 <g>，同一时刻只显示其中一帧。
 * 切帧用时间轴上的 autoAlpha，拖进度条、逐帧导出都能还原。
 */
export class Frames<K extends string> {
  readonly el: SVGGElement

  constructor(
    readonly frames: Record<K, SVGGElement>,
    initial: K,
    cls?: string,
  ) {
    this.el = s('g', cls ? { class: cls } : {}, Object.values(frames) as SVGGElement[])
    for (const [k, g] of Object.entries(frames) as [K, SVGGElement][]) gsap.set(g, { autoAlpha: k === initial ? 1 : 0 })
  }

  /** 在 t 时刻换成 name 这一帧 */
  show(tl: TL, name: K, t: number) {
    for (const [k, g] of Object.entries(this.frames) as [K, SVGGElement][]) set(tl, g, { autoAlpha: k === name ? 1 : 0 }, t)
    return t
  }
}
