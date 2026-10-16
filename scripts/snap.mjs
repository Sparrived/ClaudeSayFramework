// 截取指定时刻的画面，存到 shots/：
//   npm run snap -- 4.2 12 30.5              按秒
//   npm run snap -- ch:math+3 ch:outro       按章节：math 章开始后第 3 秒、outro 章开头
//   npm run snap                             不给时刻：只列出章节表
// 自己起一个临时的开发服务器，不用先开着 npm run dev；想连已经开着的服务器，设 URL=http://localhost:5170/。
// 截图目录可以用 OUT=… 换掉。
import { mkdirSync } from 'node:fs'
import { openMovie } from './browser.mjs'
import { positional, startServer } from './common.mjs'

const out = process.env.OUT ?? 'shots'
mkdirSync(out, { recursive: true })

const local = process.env.URL ? null : await startServer()
const base = process.env.URL ?? local.url
let movie
try {
  movie = await openMovie(`${base}?render`)
  const { page, duration, chapters, errors } = movie
  if (errors.length) console.warn(`注意：有 ${errors.length} 个场景构建失败（截图里会缺东西）`)
  console.log(`时长 ${duration.toFixed(1)}s，共 ${chapters.length} 章`)
  for (const c of chapters) console.log(`  ${c.time.toFixed(1).padStart(6)}s  ${c.id}  ${c.title}`)

  for (const arg of positional()) {
    let t = Number(arg)
    const m = /^ch:([\w-]+)(?:\+([\d.]+))?$/.exec(arg)
    if (m) {
      const c = chapters.find((x) => x.id === m[1])
      if (!c) throw new Error(`没有 id 为「${m[1]}」的章节`)
      t = c.time + Number(m[2] ?? 0)
    }
    if (!Number.isFinite(t)) throw new Error(`看不懂的时刻：${arg}`)
    await page.evaluate((x) => window.__movie.seek(x), t)
    const file = `${out}/t${t.toFixed(2).padStart(7, '0')}.png`
    await page.screenshot({ path: file })
    console.log('→', file)
  }
} finally {
  await movie?.browser.close().catch(() => {})
  await local?.server.close()
}
