// 从框架开一个新的视频项目（只在框架里有，不会拷进新项目）：
//   npm run new -- ClaudeSayResNet                          → 和框架并排的 ../ClaudeSayResNet
//   npm run new -- ClaudeSayResNet --title "ResNet 为什么要走捷径" --slug clawd-resnet
//   npm run new -- D:/somewhere/ClaudeSayXxx --no-install --git
//
// 新项目是框架的一份完整拷贝（引擎 + 脚本 + 示例片），自己就能跑、能单独发布到 GitHub；
// 以后框架有更新，在新项目里 npm run engine -- pull 拿过去（见 GUIDE.md「引擎的同步」）。
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flag, opt, positional } from './common.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [target] = positional(['title', 'slug', 'port'])
if (!target) {
  console.log('用法：npm run new -- <项目目录名或路径> [--title 片名] [--slug 导出文件名] [--port 端口] [--no-install] [--git]')
  process.exit(1)
}

const dest = isAbsolute(target) ? resolve(target) : resolve(ROOT, '..', target)
const inside = relative(ROOT, dest)
if (!inside || (!inside.startsWith('..') && !isAbsolute(inside))) throw new Error(`新项目不能建在框架目录里面：${dest}`)
if (existsSync(dest) && readdirSync(dest).length) throw new Error(`${dest} 已经存在，而且不是空目录`)
const name = basename(dest)
/** ClaudeSayResNet → claude-say-res-net */
const kebab = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
const pkgName = kebab(name) || 'claude-say-video'
const title = opt('title', name)
/** 导出文件名：ClaudeSayResNet → clawd-resnet（和前两期的 clawd-transformer、clawd-mixa 一个风格） */
const slug = opt('slug', `clawd-${name.replace(/^ClaudeSay/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video'}`)
/** 开发服务器端口：按项目名算一个 5200–5899 之间的数，几个项目同时开着也不打架 */
const port = Number(opt('port', 5200 + ([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 700)))
const fw = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

// ── 1. 拷贝：引擎、脚本、示例片，不要依赖、产物和本机配置 ──
const SKIP_TOP = new Set(['node_modules', 'out', 'shots', '.work', 'dist', '.git'])
const SKIP = new Set(['scripts/new.mjs', 'README.md', 'CLAUDE.md'])
cpSync(ROOT, dest, {
  recursive: true,
  filter: (src) => {
    const rel = relative(ROOT, src).replace(/\\/g, '/')
    if (!rel) return true
    if (SKIP_TOP.has(rel.split('/')[0]) || SKIP.has(rel)) return false
    return !/\.local(\.|$)/.test(basename(rel)) && !rel.endsWith('.log')
  },
})

const edit = (file, fn) => {
  const p = join(dest, file)
  writeFileSync(p, fn(readFileSync(p, 'utf8')))
}
const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

// ── 2. package.json / package-lock.json ──
edit('package.json', (src) => {
  const pkg = JSON.parse(src)
  pkg.name = pkgName
  pkg.version = '0.1.0'
  pkg.description = `${title}（用 ClaudeSayFramework 制作的讲解视频）`
  delete pkg.scripts.new
  pkg.scripts.engine = 'node scripts/engine.mjs'
  pkg.claudeSay = { framework: ROOT.replace(/\\/g, '/'), frameworkVersion: fw.version }
  return JSON.stringify(pkg, null, 2) + '\n'
})
if (existsSync(join(dest, 'package-lock.json'))) {
  edit('package-lock.json', (src) => {
    const lock = JSON.parse(src)
    lock.name = pkgName
    lock.version = '0.1.0'
    if (lock.packages?.['']) Object.assign(lock.packages[''], { name: pkgName, version: '0.1.0' })
    return JSON.stringify(lock, null, 2) + '\n'
  })
}

// ── 3. 端口、片名、导出文件名 ──
edit('vite.config.ts', (src) => src.replace(/\b5170\b/g, String(port)))
edit('.claude/launch.json', (src) => src.replace(/\b5170\b/g, String(port)))
edit('src/video/config.ts', (src) => {
  const out = src.replace(/^(\s*title: )'[^']*'/m, `$1${quote(title)}`).replace(/^(\s*slug: )'[^']*'/m, `$1${quote(slug)}`)
  if (out === src) console.warn('注意：没能在 src/video/config.ts 里改好 title / slug，请手动改')
  return out
})

// ── 4. 这个项目自己的 README / CLAUDE.md ──
writeFileSync(
  join(dest, 'README.md'),
  `# ${title}

用 ClaudeSayFramework 制作的讲解视频：Claude Code 的橙色像素小人 **Clawd** 当讲解员，
台词、画面、配乐和导出全部由代码完成（Vite + TypeScript + GSAP + KaTeX + D3，Puppeteer + FFmpeg 导出）。

## 快速上手

\`\`\`bash
npm install
npm run dev        # http://localhost:${port}
\`\`\`

播放器快捷键：\`空格\` 播放/暂停，\`←/→\` 切换章节，\`Shift + ←/→\` 快退/快进 5 秒，\`M\` 静音，\`F\` 全屏。
URL 参数：\`?ch=章节id\` 跳到某一章，\`?t=秒\` 跳到某一秒，\`?music=0\` 关掉配乐。

## 制作命令

\`\`\`bash
npm run typecheck                    # 类型检查
npm run snap -- ch:intro+5 30        # 截图到 shots/（按章节偏移或按秒）
npm run sheet                        # shots/ 里的截图每 4 张拼成一张总览
npm run score                        # 配乐结构报告与自检
npm run render                       # 导出 out/${slug}.mp4（30fps，6 段并行）
npm run audio                        # 只重做音轨并重新封装
npm run cover                        # 导出封面 out/cover-4x3.png（B 站上传用）、cover-16x10.png、cover-16x9.png
npm run engine                       # 和框架对比引擎文件；push 在框架仓库开 PR 等人工审阅，pull 拿框架的更新
\`\`\`

## 章节大纲

| 时间 | 章节 | 内容 |
| :---: | :--- | :--- |
| 00:00 | **开场** | （待补：npm run snap 会打印章节表） |

## 致谢

- Clawd 与 Claude Code 终端风格致敬 Anthropic；本片与 Anthropic 官方无关。
`,
)
writeFileSync(
  join(dest, 'CLAUDE.md'),
  `# ${title}

这是用 ClaudeSayFramework（${ROOT.replace(/\\/g, '/')}）开出来的视频项目。
框架的用法、API、约定和制作流程都在 GUIDE.md 里（下面整篇引入）。
src/engine/、scripts/、入口文件和 GUIDE.md 是框架的拷贝：通用的改进记得用 npm run engine -- push 还给框架（push 会开 PR，人工审阅合并）。
引擎只是起点（GUIDE.md 第 0 节）：这一期的画面按题目重新设计，引擎里没有的就自己做，做出来的通用零件还给框架。

@GUIDE.md

## 这一期

- 主题：（待定）
- 系列标签：（比如 小克学AI / 小克读论文）
- 颜色的固定含义：（写在 src/video/config.ts 的 SEM 里，也在这里记一笔）
`,
)

// ── 5. 安装依赖、建仓库 ──
if (!flag('no-install')) {
  console.log('安装依赖…')
  // 整条命令交给 shell（Windows 上 npm 是 .cmd，必须经过 shell；传参数数组会触发 DEP0190 警告）
  const r = spawnSync('npm install', { cwd: dest, stdio: 'inherit', shell: true })
  if (r.status !== 0) console.warn('npm install 没有成功，稍后在新项目里手动运行一次')
}
if (flag('git')) spawnSync('git', ['init', '-b', 'main'], { cwd: dest, stdio: 'inherit' })

console.log(`
新项目：${dest}
  片名 ${title} · 导出 out/${slug}.mp4 · 开发端口 ${port}

接下来：
  1. 改 src/video/config.ts：片名、进度标尺、配乐、封面
  2. 先为题目设计画面，再把 src/video/scenes/ 里的示例章节换成自己的（第一章用 opening()，最后一章用 ending()）
  3. npm run dev 边写边看；npm run render 导出成片
  4. 做完回顾一下：新做的通用零件 npm run engine -- push 还给框架——push 会在框架仓库开一个 PR，人工审阅合并后其他项目 pull --fetch 才能拿到（GUIDE.md 第 0、9 节）
`)
