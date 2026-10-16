// 各个脚本共用的小工具：命令行参数、临时的 Vite 服务器、ffmpeg
import { spawn } from 'node:child_process'
import { createServer } from 'vite'

const args = process.argv.slice(2)

/** --name value 形式的参数；没给就用 fallback */
export function opt(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

/** --name 开关 */
export const flag = (name) => args.includes(`--${name}`)

/** 不带 -- 的参数（跳过 --name value 里的 value） */
export function positional(valueFlags = []) {
  const out = []
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (valueFlags.includes(args[i].slice(2))) i++
    } else out.push(args[i])
  }
  return out
}

/**
 * 起一个临时的开发服务器（端口被占就自动换一个），返回 { server, url }。
 * 中间产物写在 out/、截图写在 shots/，别让 vite 的 watcher 去盯（会刷 EBUSY 报错）。
 */
export async function startServer() {
  const server = await createServer({
    server: { port: 5199, strictPort: false, watch: { ignored: ['**/out/**', '**/shots/**', '**/.work/**'] } },
    logLevel: 'warn',
  })
  await server.listen()
  return { server, url: server.resolvedUrls.local[0] }
}

/** 跑一次 ffmpeg，失败就抛错 */
export function ffmpeg(argv, o = {}) {
  const p = spawn('ffmpeg', argv, { stdio: 'inherit', ...o })
  return new Promise((res, rej) => {
    p.on('error', rej)
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg 退出码 ${code}`))))
  })
}

/** 场景构建时出过错就中止（--force 可以硬着头皮继续） */
export function assertNoSceneErrors(errors) {
  if (!errors?.length) return
  console.error(`\n有 ${errors.length} 个场景构建失败：\n` + errors.join('\n\n'))
  if (!flag('force')) throw new Error('场景有错误，先修好再导出（或者加 --force 硬导出）')
}
