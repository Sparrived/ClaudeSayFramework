import '@fontsource/maple-mono/400.css'
import '@fontsource/maple-mono/600.css'
import '@fontsource/noto-sans-sc/500.css'
import '@fontsource/noto-sans-sc/900.css'
import '../styles.css'
import './cover.css'

import { gsap } from 'gsap'
import { h } from '../lib/dom'
import { C } from '../lib/colors'
import { Clawd } from '../clawd/clawd'
import { createBanner } from '../ui/banner'
import { typeset } from '../ui/bubble'

export interface CoverOptions {
  /** 左上角的系列标签，比如 '小克学AI'、'小克读论文' */
  tag: string
  /** 右上角的小牌子：时长或出处，比如 '7 分钟'、'ICCV 2025' */
  badge: string
  /** ANSI Shadow 大字（英文），和片头同一套字符画 */
  banner: string
  /** 大字的字符格宽度（px），默认 17；大字最宽 bannerMaxWidth（默认 1700） */
  bannerCell?: number
  bannerMaxWidth?: number
  /** 大字右边的几行关键词（可选：大字短、右边空着的时候用），每行可以指定颜色 */
  keys?: { text: string; color?: string }[]
  /** 白色粗体的中文副题 */
  title: string
  /** 副题字号（px），默认 220；字多、会碰到 Clawd 时自动缩小 */
  titleSize?: number
  /** 输入框里的钩子问题 */
  question: string
  /** Clawd 站在输入框上沿的横坐标（px），默认 1400；别挡住问题的文字 */
  clawdX?: number
}

const DESIGN_H = 1200
/** 内容（从标签行顶到输入框底）占的高度和它在 16:10 版里的起点，用来算其他比例的版本该平移多少 */
const STACK_H = 864
const STACK_TOP = 150
/** 底部的 “? for shortcuts” 在 16:10 版里离画布底边多远 */
const FOOT_BOTTOM = 52
/** 副题的底边：离输入框 100px */
const TITLE_BOTTOM = 790
/** 副题的左边，以及它和 Clawd 之间至少要留的空（前两期的封面都是这个间距） */
const TITLE_LEFT = 112
const TITLE_GAP = 56
/** Clawd 的坐标是相对输入框（left 120 + 边框 3）的；精灵宽 16 格 × 30px，左边缘在中心左边 240px */
const clawdLeft = (x: number) => 123 + x - 240

/**
 * 封面：定格在“提出问题”的那一刻的 Claude Code 终端。
 * 输入框里是钩子问题，Clawd 站在输入框上沿，上面是和片头同款的 ANSI Shadow 大字，再加一行白色粗体的中文副题。
 *
 * 版面按 1920×1200（16:10）设计，宽度永远是 1920，换比例只改画布高度、把整块内容上下平移，不缩放：
 *   ?h=1200 → 16:10，B 站电脑端的比例。底部约 16% 不放关键内容：卡片会在那里叠播放数据和时长
 *   ?h=1080 → 16:9，内容整体上移
 *   ?h=1440 → 4:3，B 站现在投稿上传的比例（据 UP 主的经验帖，2023 年底起；手机首页按 4:3 显示，
 *             其他页面再从中裁出 16:9 / 16:10）。就是 16:9 版上下各加 180px 的边：内容全在中间的 16:9 范围里，
 *             裁成哪种比例都不丢关键内容，裁出来的 16:9 和 16:9 版完全一样
 */
export async function renderCover(o: CoverOptions) {
  document.title = `【${o.tag}】封面`
  const H = Number(new URLSearchParams(location.search).get('h') ?? DESIGN_H)
  const root = document.getElementById('cover')!
  root.style.height = `${H}px`

  // 左上：系列标签；右上：时长 / 出处
  const top = h('div', { class: 'top' }, [h('div', { class: 'tag', text: o.tag }), h('div', { class: 'badge', text: o.badge })])

  // 主角一：ANSI Shadow 大字，和片头是同一套矢量字符画
  const banner = createBanner(o.banner, { cell: o.bannerCell ?? 17, maxWidth: o.bannerMaxWidth ?? 1700, color: C.clawd })
  gsap.set(banner.cols, { autoAlpha: 1 })
  const bannerBox = h('div', { class: 'banner-box' }, [banner.el as unknown as Node])
  const parts: HTMLElement[] = [top, bannerBox]
  if (o.keys?.length) {
    const keys = h(
      'div',
      { class: 'keys' },
      o.keys.map((k) => {
        const el = h('div', { text: k.text })
        el.style.color = k.color ?? C.fg
        return el
      }),
    )
    // 和大字的“字身”对齐：字符画最后一行几乎只有阴影线，按上面 5/6 的高度居中
    const keysH = o.keys.length * 76 + (o.keys.length - 1) * 18
    Object.assign(keys.style, { left: `${120 + banner.width + 70}px`, top: `${330 + (banner.height * 5) / 6 / 2 - keysH / 2}px` })
    parts.push(keys)
  }

  const size = o.titleSize ?? 220
  const title = h('h1', { class: 'title', text: o.title })
  Object.assign(title.style, { top: `${TITLE_BOTTOM - size}px`, fontSize: `${size}px` })

  // 输入框：里面是钩子问题
  const question = h('span', { class: 'q' })
  typeset(o.question, question)
  const prompt = h('div', { class: 'prompt' }, [
    h('div', { class: 'prompt-line' }, [h('span', { class: 'gt', text: '>' }), question, h('span', { class: 'cursor' })]),
  ])

  // 主角二：Clawd 站在输入框的上沿，直视观众，举起右手打招呼。
  // 它的辨识度来自“身体两侧中段各一个小突起 + 竖长的眼睛”，所以只抬一只手，保住这个轮廓
  const actors = h('div', { class: 'cover-actors' })
  prompt.append(actors)
  const clawd = new Clawd(actors, { px: 30, x: o.clawdX ?? 1400, y: 0 })
  gsap.set(clawd.armR, { y: -3 })

  const design = h('div', { class: 'design' }, [...parts, title, prompt])
  // 换比例不缩放（字符画的方块是整数像素，一缩放相邻方块之间就会出现细缝），只是把整块内容上下平移，让上下留白相等
  const shift = H === DESIGN_H ? 0 : (H - STACK_H) / 2 - STACK_TOP
  if (shift) design.style.transform = `translateY(${shift}px)`
  // 比 16:10 更高的画布（4:3），只是在 16:9 版的上下各加一条边：底部的提示行和背景点阵也对齐中间那块 1920×1080，
  // 这样 B 站从 4:3 裁出 16:9 时，得到的和 16:9 版一模一样
  const band = H > DESIGN_H ? (H - 1080) / 2 : 0
  const grid = h('div', { class: 'grid' })
  grid.style.backgroundPosition = `24px ${24 + band}px`
  const foot = h('div', { class: 'foot', text: '? for shortcuts' })
  foot.style.bottom = `${FOOT_BOTTOM + band}px`
  root.append(grid, design, foot)

  // 字体加载完再放行（导出脚本等这个标志）。无头浏览器里 rAF 不可靠，所以不用它
  const text = root.textContent ?? ''
  await Promise.all([
    document.fonts.load('900 220px "Noto Sans SC"', text),
    document.fonts.load('500 60px "Noto Sans SC"', text),
    document.fonts.load('600 60px "Maple Mono"', text),
    document.fonts.load('400 28px "Maple Mono"', text),
  ])
  await document.fonts.ready

  // 副题太长会撞上 Clawd：按实际宽度把字号缩到放得下为止（字体加载完才量得准）
  const avail = clawdLeft(o.clawdX ?? 1400) - TITLE_GAP - TITLE_LEFT
  const width = title.getBoundingClientRect().width
  if (width > avail) {
    const fit = Math.floor((size * avail) / width)
    Object.assign(title.style, { top: `${TITLE_BOTTOM - fit}px`, fontSize: `${fit}px` })
    console.info(`[cover] 副题太长，字号从 ${size}px 缩到 ${fit}px`)
  }
  Object.assign(window, { __coverReady: true })
}
