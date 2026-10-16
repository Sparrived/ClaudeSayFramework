// 导出视频封面（PNG），三种比例，宽都是 1920：
//   npm run cover      → out/cover-16x10.png（1920×1200，B 站电脑端的比例）
//                        out/cover-16x9.png （1920×1080）
//                        out/cover-4x3.png  （1920×1440，B 站现在投稿上传的比例，手机首页按它显示；关键内容都在中间的 16:9 范围里）
//
// 封面是 cover.html（只存在于开发服务器里，不进视频），上面的字写在 src/video/config.ts 的 cover 里。
// 换比例只改画布高度、把内容上下平移，不缩放（见 src/engine/cover/cover.ts）。
import { mkdirSync } from 'node:fs'
import { launchBrowser } from './browser.mjs'
import { startServer } from './common.mjs'

const SIZES = [
  ['16x10', 1200],
  ['16x9', 1080],
  ['4x3', 1440],
]
mkdirSync('out', { recursive: true })

const { server, url } = await startServer()
let browser
try {
  browser = await launchBrowser({ width: 1920, height: 1200 })
  for (const [name, height] of SIZES) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height, deviceScaleFactor: 1 })
    page.on('pageerror', (e) => console.error('[page error]', e.message))
    page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()))
    await page.goto(`${url}cover.html?h=${height}`, { waitUntil: 'load', timeout: 60000 })
    // 无头浏览器里默认的 rAF 轮询不会触发，换成定时轮询
    await page.waitForFunction(() => window.__coverReady === true, { timeout: 60000, polling: 200 })
    const file = `out/cover-${name}.png`
    await page.screenshot({ path: file, type: 'png' })
    console.log(`→ ${file}  (1920×${height})`)
    await page.close()
  }
} finally {
  await browser?.close().catch(() => {})
  await server.close()
}
