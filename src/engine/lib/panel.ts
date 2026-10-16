import { h } from './dom'

/**
 * 终端风格的面板：圆角边框，左上角的边框上嵌一个标题（和 Claude Code 欢迎框同款）。
 * (x, y) 是面板中心；高度由内容决定（也可以用 height 固定）。
 */
export function panel(
  parent: HTMLElement,
  {
    x,
    y,
    w,
    height,
    title = '',
    color = 'var(--line)',
    cls = '',
    children = [] as (Node | string)[],
  }: { x: number; y: number; w: number; height?: number; title?: string; color?: string; cls?: string; children?: (Node | string)[] },
) {
  const el = h('div', { class: `panel ${cls}` }, [title ? h('div', { class: 'panel-title', text: title }) : null, ...children])
  Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, borderColor: color })
  if (height) el.style.height = `${height}px`
  const t = el.querySelector<HTMLElement>('.panel-title')
  if (t) t.style.color = color
  parent.append(el)
  return el
}

export interface Table {
  el: HTMLDivElement
  rows: HTMLDivElement[]
  /** cells[r][c]：第 r 行（含表头）第 c 列 */
  cells: HTMLDivElement[][]
}

/**
 * 简洁的数据表：第一行是表头。(x, y) 是表格中心。
 * widths 是每列宽度（px）；align 是每列的对齐方式（默认第一列左对齐，其余右对齐）。
 */
export function table(
  parent: HTMLElement,
  data: (string | number)[][],
  { x, y, widths, align, cls = '' }: { x: number; y: number; widths: number[]; align?: ('l' | 'c' | 'r')[]; cls?: string },
): Table {
  const al = align ?? widths.map((_, i) => (i === 0 ? 'l' : 'r'))
  const cells: HTMLDivElement[][] = []
  const rows = data.map((r, ri) => {
    const cs = r.map((v, ci) => {
      const c = h('div', { class: `tc tc-${al[ci]}`, text: String(v) })
      c.style.width = `${widths[ci]}px`
      return c
    })
    cells.push(cs)
    return h('div', { class: `tr ${ri === 0 ? 'th' : ''}` }, cs)
  })
  const el = h('div', { class: `table ${cls}` }, rows)
  Object.assign(el.style, { left: `${x}px`, top: `${y}px` })
  parent.append(el)
  return { el, rows, cells }
}
