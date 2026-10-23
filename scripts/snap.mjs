// 截取指定时刻的画面，存到 shots/：
//   npm run snap -- 4.2 12 30.5              按秒，全尺寸 PNG
//   npm run snap -- ch:math+3 ch:outro       按章节：math 章开始后第 3 秒、outro 章开头
//   npm run snap                             不给时刻：只列出章节表
// 总览图（缩略图拼成一张，每格标上时刻和章节，一次看几十帧）：
//   npm run snap -- --chapter math,outro --n 8    每章均匀取 8 帧 → shots/sheet-math+outro.png
//   npm run snap -- --sheet 10:40:2,60:70:1       从 10 到 40 秒每 2 秒一帧，再从 60 到 70 秒每秒一帧
//   npm run snap -- --sheet 10:40 --n 12          一段里均匀取 12 帧（不写步长时）
//   --cols 4 每行几格 · --scale 0.25 缩略图相对 1920×1080 的比例
//   --out 名字：输出文件名的前缀（总览图就是 <名字>.png，单张是 <名字>-t0012.00.png），几个人 / 几个代理同时截图时不会互相覆盖
// 自己起一个临时的开发服务器，不用先开着 npm run dev；想连已经开着的服务器，设 URL=http://localhost:5170/。
// 截图目录可以用 OUT=… 换掉。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { openMovie } from './browser.mjs'
import { opt, positional, startServer } from './common.mjs'

const dir = process.env.OUT ?? 'shots'
const prefix = opt('out')
const sheetSpec = opt('sheet')
const chapterSpec = opt('chapter')
const n = Number(opt('n', 8))
const cols = Number(opt('cols', 4))
const scale = Number(opt('scale', 0.25))
const times = positional(['out', 'sheet', 'chapter', 'n', 'cols', 'scale'])
if (!(n >= 1) || !(cols >= 1) || !(scale > 0 && scale <= 1)) throw new Error('--n、--cols 要是正整数，--scale 在 (0, 1] 之间')

/** 输出文件的完整路径（前缀里可以带子目录：--out review/a） */
function target(name) {
  const file = `${dir}/${name}`
  mkdirSync(dirname(file), { recursive: true })
  return file
}
const stamp = (t) => `t${t.toFixed(2).padStart(7, '0')}`

const local = process.env.URL ? null : await startServer()
const base = process.env.URL ?? local.url
let movie
try {
  movie = await openMovie(`${base}?render`)
  const { browser, page, duration, chapters, errors } = movie
  if (errors.length) console.warn(`注意：有 ${errors.length} 个场景构建失败（截图里会缺东西）`)
  console.log(`时长 ${duration.toFixed(1)}s，共 ${chapters.length} 章`)
  for (const c of chapters) console.log(`  ${c.time.toFixed(1).padStart(6)}s  ${c.id}  ${c.title}`)

  const seek = (t) => page.evaluate((x) => window.__movie.seek(x), t)
  /** 第 i 章的 [开始, 结束) */
  const span = (i) => [chapters[i].time, chapters[i + 1]?.time ?? duration]
  const chapterAt = (t) => {
    let i = 0
    while (i + 1 < chapters.length && chapters[i + 1].time <= t + 1e-3) i++
    return i
  }
  /** [a, b) 里均匀取 n 帧：取每一小段的中点，避开章节交界处的淡入淡出 */
  const spread = (a, b) => Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 0.5)) / n)

  // ── 单张：全尺寸 PNG ──
  for (const arg of times) {
    let t = Number(arg)
    const m = /^ch:([\w-]+)(?:\+([\d.]+))?$/.exec(arg)
    if (m) {
      const c = chapters.find((x) => x.id === m[1])
      if (!c) throw new Error(`没有 id 为「${m[1]}」的章节`)
      t = c.time + Number(m[2] ?? 0)
    }
    if (!Number.isFinite(t)) throw new Error(`看不懂的时刻：${arg}`)
    await seek(t)
    const file = target(`${prefix ? `${prefix}-` : ''}${stamp(t)}.png`)
    await page.screenshot({ path: file })
    console.log('→', file)
  }

  // ── 总览图：每个时刻截一张缩略图，再排成带标注的网格 ──
  if (sheetSpec || chapterSpec) {
    const list = []
    let name
    if (chapterSpec) {
      for (const id of chapterSpec.split(',')) {
        const i = chapters.findIndex((x) => x.id === id)
        if (i < 0) throw new Error(`没有 id 为「${id}」的章节`)
        list.push(...spread(...span(i)))
      }
      name = `sheet-${chapterSpec.replace(/,/g, '+')}`
    }
    if (sheetSpec) {
      for (const part of sheetSpec.split(',')) {
        const [a, b, step] = part.split(':').map(Number)
        if (!Number.isFinite(a) || (b !== undefined && !Number.isFinite(b)) || (step !== undefined && !(step > 0)))
          throw new Error(`看不懂的区间：${part}（写成 秒、开始:结束 或 开始:结束:步长）`)
        if (b === undefined) list.push(a)
        else if (step === undefined) list.push(...spread(a, b))
        else for (let t = a; t <= b + 1e-6; t += step) list.push(t)
      }
      name = [name, `sheet-${sheetSpec.replace(/[:,]/g, '_')}`].filter(Boolean).join('+')
    }
    const ts = list.map((t) => Math.min(duration, Math.max(0, +t.toFixed(2))))

    const w = Math.round(1920 * scale)
    const hh = Math.round(1080 * scale)
    const t0 = Date.now()
    const cells = []
    for (const t of ts) {
      await seek(t)
      // clip.scale：浏览器直接按缩小的尺寸出图，比截全尺寸再缩快得多
      const img = await page.screenshot({ type: 'jpeg', quality: 88, optimizeForSpeed: true, encoding: 'base64', clip: { x: 0, y: 0, width: 1920, height: 1080, scale } })
      const c = chapters[chapterAt(t)]
      cells.push({ img, time: `${t.toFixed(2)}s`, ch: c ? `${c.id}+${(t - c.time).toFixed(2)}` : '' })
    }

    // 拼图：在同一个浏览器里开一张空白页，用 HTML 排网格、写标注，再整页截下来（不依赖 ffmpeg 的字体）
    const rows = Math.ceil(cells.length / cols)
    const LABEL = 30
    const sheet = await browser.newPage()
    await sheet.setViewport({ width: cols * w, height: rows * (hh + LABEL), deviceScaleFactor: 1 })
    const esc = (s) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch])
    await sheet.setContent(
      `<!doctype html><meta charset="utf-8"><style>
        body { margin: 0; display: grid; grid-template-columns: repeat(${cols}, ${w}px); background: #111; }
        figure { margin: 0; width: ${w}px; }
        img { display: block; width: ${w}px; height: ${hh}px; }
        figcaption { height: ${LABEL}px; padding: 0 8px; display: flex; gap: 12px; align-items: center;
          font: ${Math.max(13, Math.round(15 * scale / 0.25))}px/1 Consolas, 'Cascadia Mono', monospace; color: #ddd; white-space: nowrap; overflow: hidden; }
        figcaption b { color: #f0a070; font-weight: 600; }
      </style>` +
        cells.map((c) => `<figure><img src="data:image/jpeg;base64,${c.img}"><figcaption><b>${c.time}</b><span>${esc(c.ch)}</span></figcaption></figure>`).join(''),
      { waitUntil: 'load' },
    )
    await sheet.evaluate(() => Promise.all([...document.images].map((im) => im.decode())))
    const file = target(`${prefix ?? name}.png`)
    writeFileSync(file, await sheet.screenshot({ type: 'png' }))
    await sheet.close()
    console.log(`→ ${file}（${cells.length} 格，${cols} 列，${((Date.now() - t0) / 1000).toFixed(1)}s）`)
  }
} finally {
  await movie?.browser.close().catch(() => {})
  await local?.server.close()
}
