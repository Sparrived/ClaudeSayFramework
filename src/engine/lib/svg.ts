import { s } from './dom'

let uid = 0

/** 生成一个页面内唯一的 id（clipPath、渐变、滤镜都用得上） */
export function nextId(prefix = 'id') {
  return `${prefix}-${++uid}`
}

/**
 * 把 `<g>` 自带的 transform 挪到内层组，外层留给 GSAP。
 *
 * GSAP 补间 `autoAlpha` / `x` / `y` 时会重写元素的 transform；
 * 如果 `<g>` 在构建期已经有 `transform="translate(...)"`，这个平移会直接被冲掉。
 * 在 append 到 DOM 之后、把 `<g>` 交给 GSAP 之前调用一次：
 *
 *   const g = s('g', { transform: 'translate(480 260)' })
 *   wrapTransform(g, g.getAttribute('transform') ?? '')
 *
 * 内层保留原来的坐标变换，外层只负责动画，两边互不覆盖。
 * `defs` 留在外层：它不参与绘制，也不应该被 transform 影响。
 */
export function wrapTransform(g: SVGGElement, transform: string) {
  if (!transform) return g
  const inner = s('g', { transform })
  for (const child of [...g.childNodes]) {
    if (child.nodeType === 1 && (child as Element).tagName.toLowerCase() === 'defs') continue
    inner.append(child)
  }
  g.removeAttribute('transform')
  g.append(inner)
  return g
}
