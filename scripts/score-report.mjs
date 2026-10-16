// 打印配乐的结构（每一段的时间、小节数、和弦、各乐器的音符数），并检查音符表有没有明显的错。
//   npm run score
//
// 在导出模式下打开页面，取出页面里真正用到的音符表（和 npm run render 渲染的是同一份），不出声。
import { openMovie } from './browser.mjs'
import { startServer } from './common.mjs'

const { server, url } = await startServer()
let movie
let data
try {
  movie = await openMovie(`${url}?render`)
  data = await movie.page.evaluate(() => ({
    chapters: window.__movie.chapters,
    cues: window.__movie.cues,
    duration: window.__movie.duration,
    score: window.__movie.score(),
  }))
} finally {
  await movie?.browser.close().catch(() => {})
  await server.close()
}
const { chapters, cues, duration, score } = data
if (!score) throw new Error('页面里没有配乐')

const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`
console.log(`全片 ${duration.toFixed(1)}s，共 ${score.notes.length} 个音符，${score.bars.length} 个小节`)
console.log('cue：', Object.entries(cues).map(([k, v]) => `${k}=${v.toFixed(2)}s`).join('  ') || '（无）')
console.log()

// ── 结构 ──
const VOICES = ['pad', 'bass', 'arp', 'lead', 'bell', 'kick', 'snare', 'hat']
const sections = []
for (const b of score.bars) {
  const last = sections[sections.length - 1]
  if (last && last.id === b.section) last.bars.push(b)
  else sections.push({ id: b.section, bars: [b] })
}
const width = Math.max(10, ...sections.map((s) => s.id.length + 1))
console.log('段落'.padEnd(width - 1) + '起止'.padEnd(14) + '小节  BPM   和弦 / 乐器（音符数）')
for (const s of sections) {
  const t0 = s.bars[0].t
  const t1 = s.bars.at(-1).t + s.bars.at(-1).len
  const bpm = 240 / s.bars[0].len
  const chords = [...new Set(s.bars.map((b) => b.chord))].join(' ')
  const inSec = score.notes.filter((n) => n.t >= t0 - 1e-6 && n.t < t1)
  const counts = VOICES.map((v) => [v, inSec.filter((n) => n.voice === v).length]).filter(([, c]) => c)
  console.log(`${s.id.padEnd(width)} ${fmt(t0)}–${fmt(t1)}  ${String(s.bars.length).padStart(3)}  ${bpm.toFixed(0).padStart(3)}   ${chords}`)
  console.log(`${' '.repeat(width + 30)}${counts.map(([v, c]) => `${v}×${c}`).join(' ')}`)
}

// ── 检查 ──
const problems = [...score.warnings.map((w) => `编排：${w}`)]
const barAt = (t) => score.bars.find((b) => t >= b.t - 0.02 && t < b.t + b.len - 0.02)
const MAJOR = new Set([0, 2, 4, 5, 7, 9, 11])
const RANGE = { pad: [50, 70], bass: [38, 62], arp: [60, 90], lead: [60, 90], bell: [72, 100] }
for (const n of score.notes) {
  if (n.t < 0 || n.t >= duration) problems.push(`音符超出片长：${n.voice} @ ${n.t.toFixed(2)}`)
  const r = RANGE[n.voice]
  if (r && (n.midi < r[0] || n.midi > r[1])) problems.push(`${n.voice} 音高 ${n.midi} 超出 ${r} @ ${n.t.toFixed(2)}`)
  const bar = barAt(n.t)
  if (!bar) {
    if (n.voice !== 'swell' && n.voice !== 'bell') problems.push(`找不到所属小节：${n.voice} @ ${n.t.toFixed(2)}`)
    continue
  }
  const pc = n.midi % 12
  if (['pad', 'arp'].includes(n.voice) && !bar.pcs.includes(pc)) problems.push(`${n.voice} 的 ${n.midi} 不在 ${bar.chord} 里 @ ${n.t.toFixed(2)}`)
  if (n.voice === 'bass' && !(pc === bar.pcs[0] || pc === (bar.pcs[0] + 7) % 12)) problems.push(`bass 的 ${n.midi} 不是 ${bar.chord} 的根音 / 五度 @ ${n.t.toFixed(2)}`)
  if (n.voice === 'lead' && !MAJOR.has(pc)) problems.push(`lead 的 ${n.midi} 不在 C 大调里 @ ${n.t.toFixed(2)}`)
}
// 小节必须首尾相接（开头那段静音除外）
score.bars.forEach((b, i) => {
  const nx = score.bars[i + 1]
  if (nx && Math.abs(b.t + b.len - nx.t) > 1e-6 && i > 0) problems.push(`小节没有首尾相接：${b.section} @ ${b.t.toFixed(2)} → ${nx.section} @ ${nx.t.toFixed(2)}`)
})
// 每段的最后一小节都应该落在 G 上（最后一段除外）
for (const s of sections.slice(0, -1)) if (s.bars.length > 1 && s.bars.at(-1).chord !== 'G') problems.push(`${s.id} 的最后一小节不是 G`)
// 章节开头必须正好是小节线
for (const c of chapters.slice(1)) if (!score.bars.some((b) => Math.abs(b.t - c.time) < 1e-6)) problems.push(`章节 ${c.id}（${c.time.toFixed(2)}s）开头不在小节线上`)
// 带 boom 的段落开头必须有重音
for (const s of score.sections) {
  if (s.boom && !score.notes.some((n) => n.voice === 'boom' && Math.abs(n.t - s.t0) < 1e-6)) problems.push(`${s.id} 开头没有重音`)
}
// 预卷必须盖住最长的音符 + 回声尾巴（回声只加在琶音 / 主旋律 / 铃音上）
const echoed = score.notes.filter((n) => ['arp', 'lead', 'bell'].includes(n.voice))
const worst = Math.max(score.maxFootprint, ...echoed.map((n) => (n.voice === 'arp' ? n.dur * 1.3 + 0.15 : n.voice === 'bell' ? 1.05 : n.dur + 0.12) + score.echoTail))
console.log(`\n最长音符 ${score.maxFootprint.toFixed(2)}s，连回声尾巴最长约 ${worst.toFixed(2)}s，预卷 ${score.preroll}s`)
if (worst > score.preroll) problems.push(`预卷 ${score.preroll}s 不够：最长约 ${worst.toFixed(2)}s`)

console.log(problems.length ? `\n发现 ${problems.length} 个问题：\n` + problems.slice(0, 30).join('\n') : '\n检查全部通过')
process.exitCode = problems.length ? 1 : 0
