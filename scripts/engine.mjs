// 在视频项目里，和框架同步“引擎”部分（src/engine、scripts、入口文件、GUIDE.md……）：
//   npm run engine                  列出和框架不一样的文件（默认）
//   npm run engine -- diff [文件…]   逐行对比（git diff --no-index）
//   npm run engine -- pull          框架 → 本项目：框架有更新，拿过来
//   npm run engine -- push          本项目 → 框架：这一期给引擎做了通用的改进，还回去
//   --from <路径>                    框架的位置（默认读 package.json 的 claudeSay.framework）
//
// 只覆盖有差异的文件，不删除任何文件（一边有、另一边没有的会列出来，自己决定）。
// 比较时忽略换行符（CRLF / LF）的差别。src/video/ 是每一期自己的内容，永远不碰。
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { opt, positional } from './common.mjs'

/** 属于引擎的路径（目录会递归） */
const ENGINE = ['src/engine', 'src/main.ts', 'src/cover.ts', 'scripts', 'index.html', 'cover.html', 'tsconfig.json', 'public/clawd.svg', 'GUIDE.md', '.gitignore', '.gitattributes']
/** 只在框架里有的文件 */
const FRAMEWORK_ONLY = new Set(['scripts/new.mjs'])

const here = process.cwd()
const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'))
const fwPath = opt('from', pkg.claudeSay?.framework)
if (!fwPath) {
  console.error('package.json 里没有 claudeSay.framework：这里是框架本身，或者不是用 npm run new 开出来的项目。可以用 --from 指定框架的位置')
  process.exit(1)
}
const fw = resolve(fwPath)
if (!existsSync(join(fw, 'src/engine'))) throw new Error(`${fw} 看起来不是 ClaudeSayFramework`)

function walk(root, rel, out) {
  const p = join(root, rel)
  if (!existsSync(p)) return out
  if (statSync(p).isDirectory()) for (const f of readdirSync(p)) walk(root, `${rel}/${f}`, out)
  else if (!FRAMEWORK_ONLY.has(rel)) out.add(rel)
  return out
}
const files = new Set()
for (const e of ENGINE) {
  walk(here, e, files)
  walk(fw, e, files)
}
const read = (root, rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n') : null)

const changed = []
const onlyHere = []
const onlyFw = []
for (const rel of [...files].sort()) {
  const a = read(here, rel)
  const b = read(fw, rel)
  if (a === null) onlyFw.push(rel)
  else if (b === null) onlyHere.push(rel)
  else if (a !== b) changed.push(rel)
}

const copy = (from, to, rel) => {
  mkdirSync(dirname(join(to, rel)), { recursive: true })
  copyFileSync(join(from, rel), join(to, rel))
  console.log('  ' + rel)
}

const [cmd = 'status', ...only] = positional(['from'])
const pick = (list) => (only.length ? list.filter((f) => only.includes(f)) : list)

if (cmd === 'status') {
  console.log(`框架：${fw}`)
  if (!changed.length && !onlyHere.length && !onlyFw.length) console.log('引擎和框架完全一致')
  if (changed.length) console.log(`\n内容不同（${changed.length}）：\n` + changed.map((f) => '  ' + f).join('\n'))
  if (onlyFw.length) console.log(`\n框架里有、本项目没有（pull 会拿过来）：\n` + onlyFw.map((f) => '  ' + f).join('\n'))
  if (onlyHere.length) console.log(`\n本项目里有、框架没有（push 会还回去）：\n` + onlyHere.map((f) => '  ' + f).join('\n'))
} else if (cmd === 'diff') {
  for (const rel of pick([...changed, ...onlyFw, ...onlyHere])) {
    const a = existsSync(join(fw, rel)) ? join(fw, rel) : '/dev/null'
    const b = existsSync(join(here, rel)) ? join(here, rel) : '/dev/null'
    // 左边是框架，右边是本项目
    spawnSync('git', ['--no-pager', 'diff', '--no-index', '--ignore-cr-at-eol', '--', a, b], { stdio: 'inherit' })
  }
} else if (cmd === 'pull') {
  const list = pick([...changed, ...onlyFw])
  console.log(list.length ? `框架 → 本项目（${list.length} 个文件）：` : '没有需要拿过来的文件')
  for (const rel of list) copy(fw, here, rel)
  if (onlyHere.length) console.log('\n这些引擎文件只有本项目有（没动）：\n' + onlyHere.map((f) => '  ' + f).join('\n'))
} else if (cmd === 'push') {
  const list = pick([...changed, ...onlyHere])
  console.log(list.length ? `本项目 → 框架（${list.length} 个文件）：` : '没有需要还回去的文件')
  for (const rel of list) copy(here, fw, rel)
  if (onlyFw.length) console.log('\n这些引擎文件只有框架有（没动）：\n' + onlyFw.map((f) => '  ' + f).join('\n'))
} else {
  console.error(`不认识的子命令：${cmd}（可以用 status / diff / pull / push）`)
  process.exit(1)
}

// 依赖也比一下：引擎用到的新库要两边的 package.json 都有
if (cmd !== 'diff') {
  const fwPkg = JSON.parse(readFileSync(join(fw, 'package.json'), 'utf8'))
  const deps = (p) => ({ ...p.dependencies, ...p.devDependencies })
  const a = deps(pkg)
  const b = deps(fwPkg)
  const diff = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).map((k) => `  ${k}: 本项目 ${a[k] ?? '—'} · 框架 ${b[k] ?? '—'}`)
  if (diff.length) console.log('\n依赖版本不一致（需要的话手动改 package.json 再 npm install）：\n' + diff.join('\n'))
}
