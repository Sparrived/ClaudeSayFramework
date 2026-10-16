// 用本机已安装的 Edge / Chrome（无头模式）打开动画页面
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const ARGS = [
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-extensions',
  '--disable-sync',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  '--autoplay-policy=no-user-gesture-required',
  '--mute-audio',
]

/** 向系统要一个空闲端口 */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 启动无头浏览器；viewport 是新标签页的默认大小。
 *
 * 不用 puppeteer.launch：新版 Edge 启动时可能会把自己重新拉起一次——最初的进程立刻以 0 退出，
 * 真正的浏览器换了个进程继续跑，puppeteer 会把这当成“启动失败”。所以这里自己启动浏览器、
 * 固定一个调试端口，等端口能连上之后再 puppeteer.connect，不管浏览器有没有重新拉起自己都能用。
 */
export async function launchBrowser(viewport = { width: 1920, height: 1080 }) {
  const executablePath = CANDIDATES.find((p) => existsSync(p))
  if (!executablePath) throw new Error('找不到 Edge / Chrome，可以用环境变量 BROWSER 指定浏览器路径')
  const port = await freePort()
  const profile = mkdtempSync(join(tmpdir(), 'clawd-render-'))
  const child = spawn(executablePath, [...ARGS, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  child.on('error', () => {})

  const browserURL = `http://127.0.0.1:${port}`
  const t0 = Date.now()
  for (;;) {
    try {
      if ((await fetch(`${browserURL}/json/version`)).ok) break
    } catch {
      // 端口还没起来
    }
    if (Date.now() - t0 > 30000) throw new Error(`浏览器 30 秒内没有在端口 ${port} 上就绪`)
    await sleep(150)
  }
  const browser = await puppeteer.connect({ browserURL, defaultViewport: { ...viewport, deviceScaleFactor: 1 } })

  // 关闭时顺手删掉临时的用户目录（浏览器退出之后文件才会释放，删不掉就算了）
  const close = browser.close.bind(browser)
  browser.close = async () => {
    await close().catch(() => {})
    for (let i = 0; i < 20; i++) {
      try {
        rmSync(profile, { recursive: true, force: true })
        break
      } catch {
        await sleep(250)
      }
    }
  }
  return browser
}

/**
 * 以导出模式（?render）打开动画页面，等 window.__movie 就绪。
 * 返回 { browser, page, title, slug, duration, chapters, cues, errors }；errors 是构建失败的场景。
 */
export async function openMovie(url) {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error('[page error]', e.message))
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()))
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })
  await page.waitForFunction(() => window.__movie, { timeout: 60000, polling: 200 })
  const info = await page.evaluate(() => {
    const m = window.__movie
    return { title: m.title, slug: m.slug, duration: m.duration, chapters: m.chapters, cues: m.cues, errors: m.errors }
  })
  return { browser, page, ...info }
}
