// 在视频项目里，和框架同步“引擎”部分（src/engine、scripts、入口文件、GUIDE.md……）：
//   npm run engine                      列出和框架不一样的文件（默认）
//   npm run engine -- diff [文件…]       逐行对比（git diff --no-index）
//   npm run engine -- pull [文件…]       框架 → 本项目：框架有更新，拿过来
//   npm run engine -- push [文件…]       本项目 → 框架：给引擎做的通用改进，开一个 PR 等人工审阅
//   npm run engine -- pr                 看还开着的引擎 PR
//   --from <路径>                       框架的位置（默认读 package.json 的 claudeSay.framework）
//
// push 默认不把代码直接并进框架：在框架仓库里从 <远端>/<默认分支> 拉一个临时 worktree，
// 把差异提交到 engine/<项目名>-<时间> 分支、推到 GitHub，再用 gh 开一个 PR；
// 人工审阅合并之后，其他项目 npm run engine -- pull --fetch 就能拿到（--fetch 会顺手把框架的默认分支快进到远端）。
// 加 --local 才回到老行为（直接覆盖框架里的文件），留给“框架不是 git 仓库 / 离线”的情况。
// 你这边比框架旧的文件（没 pull 过）会被跳过，免得 PR 把框架后来的改动删掉；--force 可以硬推。
// 两边都改过同一个文件时拦不住，但会把“PR 要删掉框架现有几行”提醒出来（PR 正文里也带一句）。
//
// 只覆盖有差异的文件，不删除任何文件（一边有、另一边没有的会列出来，自己决定）。
// 比较时忽略换行符（CRLF / LF）的差别。src/video/ 是每一期自己的内容，永远不碰。
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { flag, opt, positional } from './common.mjs'

/** 属于引擎的路径（目录会递归） */
const ENGINE = ['src/engine', 'src/main.ts', 'src/cover.ts', 'scripts', 'index.html', 'cover.html', 'tsconfig.json', 'public/clawd.svg', 'GUIDE.md', '.gitignore', '.gitattributes']
/** 只在框架里有的文件 */
const FRAMEWORK_ONLY = new Set(['scripts/new.mjs'])
/** 带值的命令行参数（positional 要跳过它们的值） */
const VALUE_FLAGS = ['from', 'base', 'remote', 'repo', 'type', 'title', 'gh']

const here = process.cwd()
const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'))
const fwPath = opt('from', pkg.claudeSay?.framework)
if (!fwPath) {
  console.error('package.json 里没有 claudeSay.framework：这里是框架本身，或者不是用 npm run new 开出来的项目。可以用 --from 指定框架的位置')
  process.exit(1)
}
const fw = resolve(fwPath)
if (!existsSync(join(fw, 'src/engine'))) {
  console.error(`${fw} 看起来不是 ClaudeSayFramework（没有 src/engine）：检查 package.json 的 claudeSay.framework，或者用 --from 指定`)
  process.exit(1)
}
/** 这一期的名字，用来命名分支和提交信息 */
const project = pkg.name || basename(here)
const remote = opt('remote', 'origin')
const ghCmd = opt('gh', 'gh')
/** 这次 push 已经写进 PR 的依赖，最后列依赖差异时不再重复唠叨 */
const inPushedDeps = new Set()

/** 拼成 shell 命令行：带空格和特殊字符的参数加引号（Windows 上走 cmd，路径有空格也不怕） */
const q = (s) => (/^[\w@+=:,./\\-]+$/.test(String(s)) ? String(s) : `"${String(s).replace(/(["\\])/g, '\\$1')}"`)
const line = (name, args = []) => [name, ...args].map(q).join(' ')

/** 跑一条命令；inherit 让输出直接进终端（进度、报错都看得见） */
function run(cmd, cwd = process.cwd(), inherit = false) {
  const r = spawnSync(cmd, { cwd, stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'], shell: true, encoding: 'utf8', maxBuffer: 16 << 20 })
  if (r.error) return { ok: false, code: -1, out: '', err: String(r.error.message) }
  return { ok: r.status === 0, code: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() }
}

/** 在某个目录里跑 git；gitOut 在命令失败时返回 null（比如那个 ref 不存在） */
const git = (cwd, ...args) => run(line('git', args), cwd)
function gitOut(cwd, ...args) {
  const r = git(cwd, ...args)
  return r.ok ? r.out : null
}

// ── 比较：本项目 ↔ 框架 ──────────────────────────────────────────
function walk(root, rel, out) {
  const p = join(root, rel)
  if (!existsSync(p)) return out
  if (statSync(p).isDirectory()) for (const f of readdirSync(p)) walk(root, `${rel}/${f}`, out)
  else if (!FRAMEWORK_ONLY.has(rel)) out.add(rel)
  return out
}
const read = (root, rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n') : null)

/** 扫一遍：本项目 ↔ 框架有哪些文件不一样（pull --fetch 把框架快进过之后要重扫一次） */
function scan() {
  const files = new Set()
  for (const e of ENGINE) {
    walk(here, e, files)
    walk(fw, e, files)
  }
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
  return { changed, onlyHere, onlyFw }
}
let { changed, onlyHere, onlyFw } = scan()

const copy = (from, to, rel) => {
  mkdirSync(dirname(join(to, rel)), { recursive: true })
  copyFileSync(join(from, rel), join(to, rel))
  console.log('  ' + rel)
}

// ── 框架仓库的状态（push 走 PR 要用）──────────────────────────────
/** 框架是不是一个（有远端的）git 仓库；是的话给出远端、当前分支和 GitHub 坐标 */
function fwRepo() {
  if (gitOut(fw, 'rev-parse', '--is-inside-work-tree') !== 'true') return null
  const url = gitOut(fw, 'remote', 'get-url', remote)
  if (!url) return null
  const m = /github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url)
  return {
    url,
    slug: opt('repo') ?? (m ? `${m[1]}/${m[2]}` : null),
    branch: gitOut(fw, 'rev-parse', '--abbrev-ref', 'HEAD') || 'HEAD',
    head: gitOut(fw, 'rev-parse', '--short', 'HEAD') || '',
  }
}

/** PR 的目标分支：远端的默认分支 */
function defaultBranch() {
  const sym = gitOut(fw, 'symbolic-ref', '--short', `refs/remotes/${remote}/HEAD`)
  if (sym) return sym.replace(`${remote}/`, '')
  const cur = gitOut(fw, 'rev-parse', '--abbrev-ref', 'HEAD')
  return cur && cur !== 'HEAD' ? cur : 'main'
}

/** 框架本地落后远端多少个提交（只看本地已有的远端记录，不联网） */
const behind = () => Number(gitOut(fw, 'rev-list', '--count', `HEAD..${remote}/${defaultBranch()}`) ?? 0) || 0
/** 框架工作区里没提交的引擎改动（每行是 git status 的 "XY 路径"，已经去掉首尾空白） */
const dirtyEngine = () => (gitOut(fw, 'status', '--porcelain', '--', ...ENGINE) ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
/** 从 "M src/engine/x.ts" / "?? src/y.ts" 里取出路径 */
const dirtyPath = (s) => s.replace(/^\S+\s+/, '')

const deps = (p) => ({ ...p.dependencies, ...p.devDependencies })
/** 项目里有、框架里完全没有的依赖：要跟着这次改动一起进 PR，否则框架跑不起来 */
function newDeps(fwPkg) {
  const out = {}
  for (const field of ['dependencies', 'devDependencies']) {
    const add = Object.entries(pkg[field] ?? {}).filter(([k]) => !(k in (fwPkg[field] ?? {})))
    if (add.length) out[field] = Object.fromEntries(add)
  }
  return out
}
/** 两边都有但版本不一样的依赖：只列出来，人工决定 */
const depVersions = (fwPkg) => [...new Set([...Object.keys(deps(pkg)), ...Object.keys(deps(fwPkg))])].filter((k) => deps(pkg)[k] !== deps(fwPkg)[k] && !inPushedDeps.has(k)).map((k) => `  ${k}: 本项目 ${deps(pkg)[k] ?? '—'} · 框架 ${deps(fwPkg)[k] ?? '—'}`)

/** 把项目里有、框架里没有的新依赖写进指定的 package.json（push 走 PR 和 --local 都要），返回人类看的清单 */
function mergeNewDeps(pkgPath) {
  const fwPkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const added = newDeps(fwPkg)
  const list = Object.entries(added).flatMap(([field, dep]) => Object.entries(dep).map(([k, v]) => `${k}@${v}（${field === 'dependencies' ? 'dependencies' : 'devDependencies'}）`))
  if (list.length) {
    for (const [field, dep] of Object.entries(added)) Object.assign((fwPkg[field] ??= {}), dep)
    writeFileSync(pkgPath, JSON.stringify(fwPkg, null, 2) + '\n')
    Object.values(added).forEach((dep) => Object.keys(dep).forEach((k) => inPushedDeps.add(k)))
  }
  return list
}

const stamp = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

// ── 子命令 ────────────────────────────────────────────────────────
const [cmd = 'status', ...only] = positional(VALUE_FLAGS)
const pick = (list) => (only.length ? list.filter((f) => only.includes(f)) : list)

if (cmd === 'status') {
  const repo = fwRepo()
  console.log(`框架：${fw}`)
  if (repo) {
    console.log(`  分支 ${repo.branch} @ ${repo.head} · 远端 ${repo.url}${repo.slug ? `（${repo.slug}）` : ''} · ${ghCmd} ${run(line(ghCmd, ['--version'])).ok ? '可用' : '不可用'}`)
    console.log('  push 会开一个 PR 等人工审阅（--local 才是直接改框架里的文件）')
    if (behind()) console.log(`  注意：框架本地 ${defaultBranch()} 落后 ${remote}/${defaultBranch()} ${behind()} 个提交，先在框架目录 git pull，再 pull（或者 pull --fetch）`)
  } else {
    console.log(`  不是 git 仓库（或者没有 ${remote} 远端）：push 只能用 --local 直接覆盖文件`)
  }
  const dirty = dirtyEngine()
  if (dirty.length) console.log(`  注意：框架工作区有未提交的引擎改动，push 的 PR 以 ${remote}/${defaultBranch()} 为基础，不会带上它们：\n` + dirty.map((f) => '  ' + f).join('\n'))
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
  if (flag('fetch')) {
    const f = git(fw, 'fetch', remote)
    if (!f.ok) console.warn(`git fetch ${remote} 失败（离线？），用本地已有的记录比：${f.err}`)
    else {
      // fetch 只更新远端记录，框架工作区里的文件还是旧的：顺手把本地默认分支快进过去，
      // 不然别人刚合并回来的 PR 在这一步看不到。只在框架停在默认分支上时动它。
      const base = defaultBranch()
      const cur = gitOut(fw, 'rev-parse', '--abbrev-ref', 'HEAD')
      if (cur !== base) console.warn(`框架当前在 ${cur} 分支上（不是 ${base}），没动它：先在框架目录切回 ${base} 再 pull，或者自己 git pull`)
      else {
        const m = git(fw, 'merge', '--ff-only', `${remote}/${base}`)
        console.log(m.ok ? `框架本地 ${base} 已经跟上 ${remote}/${base}` : `框架本地 ${base} 没能快进到 ${remote}/${base}（分叉了？工作区有冲突的改动？）自己在框架目录看一眼：\n${m.err || m.out}`)
        if (m.ok) ({ changed, onlyHere, onlyFw } = scan()) // 框架的文件变了，差异要重算
      }
    }
  }
  const list = pick([...changed, ...onlyFw])
  console.log(list.length ? `框架 → 本项目（${list.length} 个文件）：` : '没有需要拿过来的文件')
  for (const rel of list) copy(fw, here, rel)
  if (onlyHere.length) console.log('\n这些引擎文件只有本项目有（没动）：\n' + onlyHere.map((f) => '  ' + f).join('\n'))
  const drafts = list.filter((rel) => dirtyEngine().some((s) => dirtyPath(s) === rel))
  if (drafts.length) console.warn(`\n注意：上面这些是从框架工作区里还没提交的草稿拿过来的（不是已合并的版本）：\n` + drafts.map((f) => '  ' + f).join('\n') + '\n想只拿已合并的版本，先在框架目录把改动提交或收起来，再用 --fetch。')
  if (behind()) console.log(`\n注意：框架本地 ${defaultBranch()} 落后 ${remote}/${defaultBranch()} ${behind()} 个提交（别人刚合并回来的 PR 可能还没拉下来）：先在框架目录 git pull，再 pull --fetch`)
} else if (cmd === 'push') {
  push()
} else if (cmd === 'pr') {
  const repo = fwRepo()
  if (!repo?.slug) {
    console.error(`看 PR 需要 GitHub 远端（当前 ${repo?.url ?? '没有远端'}），可以用 --repo owner/name 指定`)
    process.exit(1)
  }
  const r = run(line(ghCmd, ['pr', 'list', '--repo', repo.slug, '--state', flag('all') ? 'all' : 'open', '--limit', '50', '--json', 'number,title,headRefName,url,state,isDraft,createdAt']))
  let prs = []
  try {
    prs = (JSON.parse(r.ok ? r.out || '[]' : '[]') ?? []).filter((p) => p.headRefName?.startsWith('engine/'))
  } catch {
    console.error(`${ghCmd} pr list 的输出看不懂：\n${r.out || r.err}`)
    process.exit(1)
  }
  if (!r.ok) {
    console.error(`${ghCmd} pr list 失败：\n${r.err || r.out}`)
    process.exit(1)
  }
  if (!prs.length) {
    console.log(flag('all') ? '还没有从作品推回来的引擎 PR' : '没有开着待审阅的引擎 PR（加 --all 看已合并 / 已关闭的）')
  } else {
    console.log(`${prs.length} 个从作品推回来的引擎 PR：`)
    for (const p of prs) console.log(`  #${p.number} [${p.isDraft ? 'draft ' : ''}${p.state}] ${p.title}\n      ${p.headRefName} · ${p.url}`)
    if (flag('web')) run(line(ghCmd, ['pr', 'view', String(prs[0].number), '--repo', repo.slug, '--web']))
  }
} else {
  console.error(`不认识的子命令：${cmd}（可以用 status / diff / pull / push / pr）`)
  process.exit(1)
}

// 依赖也比一下：引擎用到的新库要两边的 package.json 都有
if (cmd !== 'diff') {
  const diff = depVersions(JSON.parse(readFileSync(join(fw, 'package.json'), 'utf8')))
  if (diff.length) console.log('\n依赖版本不一致（需要的话手动改 package.json 再 npm install）：\n' + diff.join('\n'))
}

// ── push：把差异提到框架仓库的分支上，开 PR 等人工审阅 ──────────────
function push() {
  try {
    pushFlow()
  } catch (e) {
    console.error(`\npush 失败：${e.message}`)
    process.exitCode = 1
  }
}

function pushFlow() {
  const list = pick([...changed, ...onlyHere])
  if (!list.length) {
    console.log('没有需要还回去的文件')
    return
  }
  if (flag('local')) {
    console.log(`本项目 → 框架（${list.length} 个文件，--local 直接覆盖）：`)
    for (const rel of list) copy(here, fw, rel)
    const added = mergeNewDeps(join(fw, 'package.json'))
    if (added.length) console.log('  新依赖一并写进框架的 package.json：' + added.join('、'))
    if (onlyFw.length) console.log('\n这些引擎文件只有框架有（没动）：\n' + onlyFw.map((f) => '  ' + f).join('\n'))
    console.log('\n--local 绕过了人工审阅，框架里的文件已经被直接改了；正常做法是不加 --local，让 push 开一个 PR。')
    return
  }

  const repo = fwRepo()
  if (!repo) {
    throw new Error(`框架 ${fw} 不是 git 仓库，或者没有 ${remote} 远端：推不成 PR。\n要么先在框架里 git remote add origin <GitHub 地址>，要么用 --local 直接覆盖文件。`)
  }

  // 1. 以远端默认分支为基础（框架工作区里的东西一概不动）
  const base = opt('base') ?? defaultBranch()
  const baseRef = `${remote}/${base}`
  if (!flag('no-fetch')) {
    const f = git(fw, 'fetch', remote)
    if (!f.ok) console.warn(`git fetch ${remote} 失败（离线？），用本地已有的 ${baseRef}：${f.err}`)
  }
  if (gitOut(fw, 'rev-parse', '--verify', '--quiet', baseRef) === null) {
    throw new Error(`框架里没有 ${baseRef}：先 git fetch，或者用 --base <分支> 指定目标分支`)
  }
  const dirty = dirtyEngine().filter((l) => list.includes(dirtyPath(l)))
  if (dirty.length) console.warn(`警告：框架工作区里这些文件有未提交的改动，PR 以 ${baseRef} 为基础，不会带上它们；先提交 / 推送再 push：\n` + dirty.map((f) => '  ' + f).join('\n'))

  // 1.5 本项目比框架旧的文件不能推：照它推会在 PR 里把框架后加的改动删掉。
  // 判断办法：这个文件的内容等于它在这条分支的历史上的某个版本（blob 可达），又不是最新版本
  // —— 那就是「没 pull 过的旧拷贝」，不是「在框架基础上改出来的」。
  // 只认从 PR 基础分支可达的 blob（不能只看本地有没有这个对象：push 过一次就会留下游离对象）。
  const stale = flag('force') ? [] : list.filter((rel) => {
    const mine = gitOut(fw, 'hash-object', '--', join(here, rel))
    if (mine === null || mine === gitOut(fw, 'rev-parse', `${baseRef}:${rel}`)) return false
    const hist = gitOut(fw, 'rev-list', '--objects', baseRef, '--', rel) ?? ''
    return hist.split('\n').some((l) => l.split(' ')[0] === mine)
  })
  const pushList = list.filter((f) => !stale.includes(f))
  if (stale.length) console.warn(`警告：这些文件你这边还是框架的旧版本（没 pull 过），推上去会把框架后来的改动删掉，先跳过它们：\n` + stale.map((f) => '  ' + f).join('\n') + `\n先 npm run engine -- pull --fetch 拿最新的，再 push；确定要覆盖就加 --force。`)
  if (!pushList.length) {
    console.log('\n没有别的东西要推了')
    return
  }

  // 1.6 上面那条只认「整份都是旧版本」。你这边基于旧版本、又自己改了一笔时 blob 是全新的，查不出来，
  // 推上去照样会把框架后来的改动删掉。这里用个便宜的近似分辨真假：
  // 把文件在框架历史里最近几版都拿来比，你这份「缺行最少」的那一版就是它长出来的那一版。
  // 基础版本（PR 的目标版本）就是缺行最少的那一版 → 正常 push，不吵人；
  // 更早的某一版才是 → 框架后来改过这个文件，而你这边基于更早的版本，值得提醒一句（PR 正文里也带）。
  const lineSet = (s) => new Set(s.split('\n').map((l) => l.trim()).filter(Boolean))
  const gone = (from, have) => {
    const H = lineSet(have)
    return [...lineSet(from)].filter((l) => !H.has(l))
  }
  // 「少了一行」也可能是你把它改写了（框架刚加的那行，你同步过来之后改了写法）。
  // 这种在你这份里能找到长得很像的行，就不算「框架的改动被删掉」，别拿它吵人。
  const flat = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const looksRewritten = (a, b) => {
    const [s, l] = a.length < b.length ? [a, b] : [b, a]
    if (s.length >= 8 && l.includes(s)) return true // 短的整段出现在长的里（后面补了注释之类）
    let i = 0
    while (i < s.length && s[i] === l[i]) i++
    return i >= Math.max(12, Math.ceil(s.length * 0.6)) // 开头大半截一样
  }
  const losing = []
  for (const rel of pushList) {
    const mine = read(here, rel)
    const theirs = gitOut(fw, 'show', `${baseRef}:${rel}`)
    if (mine === null || theirs === null) continue
    const lost = gone(theirs, mine)
    if (!lost.length) continue // 没删框架的行，不用看
    const myLines = [...lineSet(mine)].map(flat)
    const real = lost.filter((l) => !myLines.some((m) => looksRewritten(flat(l), m)))
    if (!real.length) continue // 缺的行在你这份里都能找到长得像的：是改写，不是旧版本
    const shas = (gitOut(fw, 'rev-list', '--objects', baseRef, '--', rel) ?? '')
      .split('\n')
      .map((l) => l.split(' '))
      .filter(([, p]) => p === rel)
      .map(([sha]) => sha)
      .slice(0, 6)
    const vers = shas.map((sha) => gitOut(fw, 'cat-file', 'blob', sha)).filter((t) => t !== null)
    // 基础版本放最后：并列时算「就是从基础版本改出来的」，不吵人
    const counts = [...vers, theirs].map((t) => gone(t, mine).length)
    if (counts[counts.length - 1] === Math.min(...counts)) continue
    losing.push({ rel, n: lost.length, sample: real.slice(0, 3) })
  }
  if (losing.length)
    console.warn(
      `注意：这些文件在框架现有版本里有、你这边没有的行，PR 会把它们删掉——如果你这边没 pull 过、或者两边都改过同一个文件，先 npm run engine -- pull --fetch 合一次更稳妥；确属有意删的就照推：\n` +
        losing.map((x) => `  ${x.rel}（少 ${x.n} 行，例如 ${x.sample.map((l) => JSON.stringify(l.slice(0, 60))).join('、')}）`).join('\n')
    )

  // 2. 分支名：engine/<项目名>-<时间>（重名就往后加 -2 / -3；本地和远端都要看，
  //    推成功之后本地分支会被删掉，只看本地的话同一分钟里第二次 push 会撞上远端那个分支）
  const slug = project.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'video'
  const t = stamp()
  const taken = (name) => gitOut(fw, 'show-ref', '--verify', '--quiet', `refs/heads/${name}`) !== null || gitOut(fw, 'show-ref', '--verify', '--quiet', `refs/remotes/${remote}/${name}`) !== null
  let branch = `engine/${slug}-${t}`
  for (let i = 2; taken(branch); i++) branch = `engine/${slug}-${t}-${i}`

  // 3. 临时 worktree：在框架仓库里开一个干净的工作区，提交完就删掉
  const wt = join(tmpdir(), `claudesay-engine-${slug}-${t}-${process.pid}`)
  const msgFile = `${wt}.commit.txt`
  const bodyFile = `${wt}.pr.md`
  // 'no' = 没推出去（分支要删掉）；'pushed' = 推上去了；'failed' = 推失败，分支留着人工重推
  let state = 'no'
  const clean = () => {
    for (const f of [msgFile, bodyFile]) rmSync(f, { force: true })
    if (flag('keep')) console.log(`\n--keep：临时 worktree 留在 ${wt}（分支 ${branch}）`)
    else {
      if (!git(fw, 'worktree', 'remove', '--force', wt).ok) console.warn(`临时 worktree 没删掉，手动清一下：git -C "${fw}" worktree remove --force "${wt}"`)
      // 推失败的分支留着人工重推；其它情况（--dry、没东西可提交、推成功了）本地都不留分支
      if (state !== 'failed') {
        const deleted = git(fw, 'branch', '-D', branch).ok
        if (deleted && state === 'pushed') console.log(`框架里的临时分支删掉了（远端留着 ${branch}，PR 上还能看到）`)
      }
    }
  }
  rmSync(wt, { recursive: true, force: true })
  const add = git(fw, 'worktree', 'add', '--quiet', '-b', branch, wt, baseRef)
  if (!add.ok) {
    git(fw, 'branch', '-D', branch)
    throw new Error(`在框架里开临时 worktree 失败：\n${add.err || add.out}`)
  }

  try {
    console.log(`本项目 → 框架的分支 ${branch}（基于 ${baseRef}）：`)
    for (const rel of pushList) copy(here, wt, rel)

    // 引擎用到的新依赖跟着一起进 PR，不然框架那边跑不起来
    const addedList = mergeNewDeps(join(wt, 'package.json'))
    if (addedList.length) console.log('  新依赖一并写进 package.json：' + addedList.join('、'))

    git(wt, 'add', '-A')
    if (!gitOut(wt, 'status', '--porcelain')) {
      console.log(`\n这些改动和 ${baseRef} 完全一致（框架那边已经合过了？），没有要提交的东西`)
      return
    }
    const stat = gitOut(wt, 'diff', '--stat', '--cached') ?? ''
    const title = opt('title') ?? `${opt('type', 'feat')}(engine): 从 ${project} 还回引擎改进`
    const body = [
      `由 ${project} 的 \`npm run engine -- push\` 生成，人工审阅后并入。`,
      '',
      ...pushList.map((f) => `- ${onlyHere.includes(f) ? '新增' : '修改'} ${f}`),
      ...(addedList.length ? ['', `新依赖（已写进 package.json，合并后 npm install）：${addedList.map((d) => '`' + d + '`').join('、')}`] : []),
      ...(losing.length ? ['', `注意：这次改动会删掉框架现有版本里的一些行（${losing.map((x) => `${x.rel} 少 ${x.n} 行`).join('、')}），审阅时确认是不是有意的。`] : []),
      '',
      `来源：${here}`,
    ].join('\n')
    writeFileSync(msgFile, `${title}\n\n${body}\n`)
    const commit = git(wt, 'commit', '--quiet', '-F', msgFile, '--no-verify')
    if (!commit.ok) throw new Error(`提交失败：\n${commit.err || commit.out}`)
    console.log(`\n${stat}\n`)
    if (flag('dry')) {
      console.log(`--dry：没有推送（分支和提交已丢掉）。提交信息会是：\n\n${title}\n\n${body}\n`)
      return
    }

    // 4. 推分支
    console.log(`推送分支到 ${remote}…`)
    const pushRes = git(wt, 'push', '--quiet', '-u', remote, branch)
    if (!pushRes.ok) {
      state = 'failed' // 分支留在框架仓库里，人工重推
      const err = pushRes.err || pushRes.out
      // 撞名（同一分钟里推过两次、又用了 --no-fetch）和权限 / 网络是两回事，给的下一步也不一样
      const hint = /non-fast-forward|fetch first|\[rejected\]/i.test(err)
        ? `远端已经有一个同名分支 ${branch}（同一分钟里推过两次、又加了 --no-fetch？）。等下换个时间再 push 就会自动换名字，或者先把远端那个删掉：\n  git -C "${fw}" push ${remote} --delete ${branch}`
        : `改动提交在了框架仓库的分支 ${branch} 上，修好权限 / 网络后可以自己重推一次：\n  git -C "${fw}" push ${remote} ${branch}`
      throw new Error(`推送失败：\n${err}\n${hint}`)
    }
    state = 'pushed'

    // 5. 开 PR（远端不是 GitHub / 没有 gh 就给出链接，人工点一下）
    const compare = repo.slug ? `https://github.com/${repo.slug}/compare/${base}...${branch}?expand=1` : null
    writeFileSync(bodyFile, `${body}\n\n---\n\n审阅时顺手跑一遍（框架的示例片同时是引擎的回归测试）：\n\n- [ ] \`npm run typecheck\`\n- [ ] \`npm run score\`\n- [ ] \`npm run snap -- <几个时刻>\` 看截图\n- [ ] 动到导出流程时 \`npm run render\`\n- [ ] 新功能在示例片 \`src/video/\` 里用了一次\n${stat ? '\n```\n' + stat + '\n```\n' : ''}`)
    if (flag('no-pr')) {
      console.log(`分支已推送（--no-pr）。自己开 PR：${compare ?? `${remote} ${branch}`}`)
      return
    }
    if (!repo.slug) {
      console.log(`分支已推送，但远端 ${repo.url} 不是 GitHub：自己去开 PR（--repo owner/name 可以告诉它 GitHub 坐标）。`)
      return
    }
    const pr = run(line(ghCmd, ['pr', 'create', '--repo', repo.slug, '--base', base, '--head', branch, '--title', title, '--body-file', bodyFile, ...(flag('draft') ? ['--draft'] : [])]), wt)
    if (pr.ok && pr.out) {
      console.log(`PR 开好了：${pr.out}\n人工审阅合并之后，其他项目 npm run engine -- pull --fetch 就能拿到这些改动。`)
    } else {
      process.exitCode = 1 // 分支推上去了，但 PR 没开出来：别让它悄悄地过
      console.warn(`没能自动开 PR（${ghCmd} 出错），分支已经推上去了，点这个链接开 PR：\n  ${compare}\n${pr.err || pr.out}`)
    }
  } finally {
    clean()
  }
}
