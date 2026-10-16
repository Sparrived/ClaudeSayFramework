import { gsap } from 'gsap'

type Attrs = Record<string, string | number | boolean | null | undefined>
type Child = Node | string | null | undefined | false

const SVG_NS = 'http://www.w3.org/2000/svg'

function apply(el: Element, attrs: Attrs, children: Child[]) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue
    if (k === 'text') el.textContent = String(v)
    else if (k === 'html') el.innerHTML = String(v)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue
    el.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
}

/** 创建 HTML 元素：h('div', { class: 'chip', text: '小猫' }) */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  apply(el, attrs, children)
  return el
}

/** 创建 SVG 元素 */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  apply(el, attrs, children)
  return el
}

/** 绝对定位到舞台坐标（左上角） */
export function at<T extends HTMLElement | SVGElement>(el: T, x: number, y: number): T {
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  return el
}

/**
 * 时间轴上的“瞬间设置”。显式关闭 immediateRender，
 * 保证往回拖动进度条时能正确还原。
 */
export function set(tl: gsap.core.Timeline, targets: gsap.TweenTarget, vars: gsap.TweenVars, time: number) {
  return tl.set(targets, { ...vars, immediateRender: false }, time)
}

/** 构建期把元素设为隐藏（opacity 0 + visibility hidden） */
export function hide(...targets: gsap.TweenTarget[]) {
  for (const t of targets) gsap.set(t, { autoAlpha: 0 })
}

/**
 * 把 CSS 的 translate（常用来居中：translate: -50% -50%）交给 GSAP 的 xPercent / yPercent 管。
 *
 * GSAP 第一次接管元素的 transform 时，会把 CSS translate 折算成像素的 x / y，
 * 只有“半个宽 / 高恰好是整数像素”时才认得出那是 -50%。文字、公式的尺寸常带小数，认不出来的话，
 * 之后补间 y（fadeIn 默认就带 y）会把居中的偏移冲掉，整个元素下沉半个高度。
 * 凡是带 translate 又要补间 x / y 的元素，在插进页面之后过一遍这里（fadeIn 会自动做）。
 * 元素还没插进页面时读不到样式，什么也不做。
 */
export function pin<T extends HTMLElement>(el: T): T {
  const tr = getComputedStyle(el).translate
  if (!tr || tr === 'none') return el
  const [x = '0', y = '0'] = tr.split(' ')
  const pct = (v: string) => (v.endsWith('%') ? parseFloat(v) : 0)
  el.style.translate = 'none'
  gsap.set(el, { xPercent: pct(x), yPercent: pct(y) })
  return el
}

/** 一个确定性的伪随机数（同一 seed 每次结果相同，保证动画可复现） */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
