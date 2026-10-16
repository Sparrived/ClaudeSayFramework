import { h } from './dom'

export interface Block {
  el: HTMLDivElement
  /** 中心点与尺寸（舞台坐标） */
  x: number
  y: number
  w: number
  h: number
}

/**
 * 矩阵的“形状块”（仿论文图 4）：一个画着网格线的彩色长方形，代表一个 rows×cols 的矩阵。
 * rows / cols 是示意的格数（比如 N 画 8 格、d 画 2 格），unit 是每格的像素。
 * name 写在块的中间（Q、Kᵀ、V…），dims 写在块的下方（N×d…）。
 */
export function mblock(
  parent: HTMLElement,
  {
    x,
    y,
    rows,
    cols,
    unit = 16,
    color,
    name = '',
    dims = '',
    cls = '',
  }: { x: number; y: number; rows: number; cols: number; unit?: number; color: string; name?: string; dims?: string; cls?: string },
): Block {
  const w = cols * unit
  const hh = rows * unit
  const el = h('div', { class: `mblock ${cls}` })
  Object.assign(el.style, {
    left: `${x - w / 2}px`,
    top: `${y - hh / 2}px`,
    width: `${w}px`,
    height: `${hh}px`,
    backgroundColor: color,
    backgroundSize: `${unit}px ${unit}px`,
  })
  if (name) el.append(h('div', { class: 'mb-name', text: name }))
  if (dims) el.append(h('div', { class: 'mb-dims', text: dims }))
  parent.append(el)
  return { el, x, y, w, h: hh }
}
