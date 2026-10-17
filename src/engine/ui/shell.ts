type TL = gsap.core.Timeline

export interface ShellOptions {
  /**
   * 顶部进度标尺的各站（按顺序）：可以是年代（'2014'、'2017'…），也可以是章节（'开场'、'瓶颈'…）。
   * 章节用 d.chapter({ step }) 把标记移过去；空数组表示不要标尺。
   */
  stops: readonly string[]
  /** 输入框里的灰色占位提示，比如 'Try "讲讲 Transformer 的前世今生"'（对话页默认是“给小鲸发送消息”） */
  placeholder?: string
}

export interface ThinkOptions {
  /** 终端：思考指示器后面的动词（Claude Code 风格），比如 'Pondering' */
  verb?: string
  /** 对话页：“深度思考”里流出来的一句心里话，比如 '嗯，用户问的是天空为什么是蓝的……' */
  thought?: string
}

/**
 * 外壳：讲解员所在的“软件界面”。Claude 系列是 Claude Code 终端（ui/terminal.ts），DS 系列是对话页（ui/chat.ts）。
 * 两种外壳的版面一样（顶部标尺、问题、舞台、讲解气泡、底部输入框和提示栏，坐标见 layout.ts），
 * 导演和 kit 只通过这个接口和外壳打交道。
 */
export interface Shell {
  /** 外壳的根元素（章节大字没有图层时挂在这里） */
  readonly root: HTMLDivElement
  /** 底部输入框（讲解员站在它的上沿） */
  readonly prompt: HTMLDivElement
  /** 顶部进度标尺 */
  readonly rulerEl: HTMLDivElement
  /** 底部提示栏 */
  readonly footerEl: HTMLDivElement
  /** 输入框里光标的闪烁：贯穿全片的补间 */
  blinkCursor(tl: TL, from: number, to: number): void
  /** 把进度标尺的标记移到 name 这一站 */
  step(tl: TL, name: string, t: number): number
  /** 观众在输入框里打出问题并发送，问题随即出现在顶部；返回发送完的时刻 */
  ask(tl: TL, question: string, t: number): number
  /** 顶部显示一个问题（ask 会自动调用） */
  heading(tl: TL, text: string, t: number): HTMLElement
  /** 收起顶部的问题 */
  clearHeading(tl: TL, t: number): void
  /** 思考动画，大约 dur 秒（外壳可以按自己的样子略长一点）；返回结束的时刻 */
  think(tl: TL, t: number, dur: number, o?: ThinkOptions): number
  /** 右下角的章节名 */
  footer(tl: TL, text: string, t: number): void
}
