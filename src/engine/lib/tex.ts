import katex from 'katex'
import { h } from './dom'
import { C, rgba } from './colors'

type TL = gsap.core.Timeline

/** 宏定义里的 # 是参数记号，颜色值里的 # 要写成 ## 才是字面量 */
const hex = (c: string) => c.replace('#', '##')
const colorMacro = (c: string) => `\\textcolor{${hex(c)}}{#1}`

/**
 * KaTeX 宏：公式里的颜色和台词、画面用同一套颜色。
 *   \cO{…} 橙   \cQ{…} 淡紫蓝   \cK{…} 绿   \cV{…} 琥珀   \cR{…} 红
 *   \cP{…} 粉   \cU{…} 紫       \cB{…} 蓝   \cT{…} 青     \cM{…} 灰
 *   \hl{名字}{…}  给一段公式起名字，之后用 part(el, '名字') 拿到它做高亮动画
 * 一期里有固定含义的颜色，可以再起个语义化的名字：texColor('\\cG', C.pink)（梯度）。
 * 宏在每次渲染时按当前主题的 C 生成（不在模块加载时定死），亮色主题里公式的颜色也跟着换。
 */
const custom: Record<string, string> = {}
const macros = (): Record<string, string> => ({
  '\\cO': colorMacro(C.clawd),
  '\\cQ': colorMacro(C.q),
  '\\cK': colorMacro(C.k),
  '\\cV': colorMacro(C.v),
  '\\cR': colorMacro(C.red),
  '\\cP': colorMacro(C.pink),
  '\\cU': colorMacro(C.purple),
  '\\cB': colorMacro(C.blue),
  '\\cT': colorMacro(C.teal),
  '\\cM': colorMacro(C.dim),
  '\\hl': '\\htmlClass{tp-#1}{#2}',
  ...custom,
})

/** 注册一个着色宏，比如 texColor('\\cG', C.pink) 之后公式里就能写 \cG{\nabla L}。在场景构建之前调用 */
export function texColor(name: string, color: string) {
  custom[name] = colorMacro(color)
}

/** 渲染一段 TeX，返回一个 div（还没有定位） */
export function tex(src: string, { display = true, cls = '' }: { display?: boolean; cls?: string } = {}) {
  const el = h('div', { class: `tex ${cls}` })
  katex.render(src, el, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
    trust: (ctx) => ctx.command === '\\htmlClass',
    macros: macros(),
  })
  return el
}

/**
 * 放一条公式到舞台上：(x, y) 是公式中心（anchor = 'l' 时是左边中点）。
 * size 是字号（px），KaTeX 的所有尺寸都按它缩放。
 */
export function formula(
  parent: HTMLElement,
  src: string,
  x: number,
  y: number,
  { size = 46, anchor = 'c', cls = '', display = true }: { size?: number; anchor?: 'c' | 'l' | 'r'; cls?: string; display?: boolean } = {},
) {
  const el = tex(src, { display, cls: `formula-at anchor-${anchor} ${cls}` })
  Object.assign(el.style, { left: `${x}px`, top: `${y}px`, fontSize: `${size}px` })
  parent.append(el)
  return el
}

/** 取出公式里用 \hl{name}{…} 标记的部分 */
export function part(el: HTMLElement, name: string) {
  return [...el.querySelectorAll<HTMLElement>(`.tp-${name}`)]
}

/**
 * 高亮公式的一部分：背后亮起一块半透明的底色（不改变排版）。
 * 用 box-shadow 而不是 padding，免得公式跳动。
 */
export function glow(tl: TL, els: HTMLElement | HTMLElement[], t: number, { color = C.clawd as string, dur = 0.3 } = {}) {
  tl.fromTo(
    els,
    { backgroundColor: rgba(color, 0), boxShadow: `0 0 0 0.12em ${rgba(color, 0)}` },
    { backgroundColor: rgba(color, 0.22), boxShadow: `0 0 0 0.12em ${rgba(color, 0.22)}`, borderRadius: '0.12em', duration: dur, ease: 'power1.out', immediateRender: false },
    t,
  )
  return t + dur
}

export function unglow(tl: TL, els: HTMLElement | HTMLElement[], t: number, { color = C.clawd as string, dur = 0.3 } = {}) {
  tl.to(els, { backgroundColor: rgba(color, 0), boxShadow: `0 0 0 0.12em ${rgba(color, 0)}`, duration: dur, ease: 'power1.in' }, t)
  return t + dur
}
