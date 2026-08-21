/**
 * smoke.mjs —— 端到端冒烟测试（无需 Obsidian）。
 *
 * 验证 launcher.ts 的核心链路：
 * 1. resolveDshBin 能从本机定位官方 dsh CLI；
 * 2. spawn `dsh web --host 127.0.0.1 --port <随机端口>`（独立 DSH_HOME）；
 * 3. waitForReady 探测 HTTP 就绪；
 * 4. 抓取首页确认返回的是 DSH Web（含 html/script）；
 * 5. stopProcess 干净退出。
 *
 * 用法: node scripts/smoke.mjs
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// launcher.cjs 的 timer 已改用 globalThis.setTimeout/clearTimeout，
// Node 环境无需 window shim。

const { resolveDshBin, launchDsh, waitForReady, stopProcess, isPortUp } = require('../lib/launcher.cjs')

const port = 3099
const host = '127.0.0.1'

async function main() {
  console.log('[smoke] 1) 定位官方 dsh CLI')
  const found = resolveDshBin(undefined)
  if (!found) {
    console.error('[smoke] FAIL: 未找到 dsh（先 npm install -g @deepseek-ai/dsh）')
    process.exit(1)
  }
  console.log('[smoke]   ->', found.bin, `(${found.notes.join('; ')})`)

  console.log('[smoke] 2) 启动前端口状态（应为空闲）')
  if (await isPortUp(host, port)) {
    console.error(`[smoke] FAIL: 端口 ${port} 已被占用`)
    process.exit(1)
  }

  console.log('[smoke] 3) spawn 官方 dsh web（独立 DSH_HOME）')
  const dshHome = mkdtempSync(join(tmpdir(), 'dsh-smoke-home-'))
  const proc = launchDsh({
    dshBin: found.bin,
    nodeBin: process.execPath,
    useElectronAsNode: false,
    port,
    host,
    dshHome,
  })
  proc.stdout.on('data', (d) => process.stdout.write(`[dsh] ${d}`))
  proc.stderr.on('data', (d) => process.stderr.write(`[dsh:err] ${d}`))
  proc.once('error', (err) => {
    console.error('[smoke] FAIL: spawn 错误', err)
    process.exit(1)
  })

  console.log(`[smoke] 4) 等待 http://${host}:${port} 就绪（首次启动需初始化 profile，最多 120s）`)
  const ready = await waitForReady(host, port, 120_000)
  if (!ready) {
    console.error('[smoke] FAIL: 就绪超时')
    proc.kill('SIGKILL')
    process.exit(1)
  }
  console.log('[smoke]   -> ready')

  console.log('[smoke] 5) 抓取首页内容')
  const res = await fetch(`http://${host}:${port}/`)
  const html = await res.text()
  console.log(`[smoke]   -> HTTP ${res.status}, ${html.length} bytes`)
  if (!/html|script/i.test(html)) {
    console.error('[smoke] FAIL: 首页不是 HTML 页面')
    proc.kill('SIGKILL')
    process.exit(1)
  }

  console.log('[smoke] 6) 停止子进程')
  await stopProcess(proc, 5000)
  if (!(await isPortUp(host, port))) {
    console.log('[smoke]   -> 端口已释放')
  } else {
    console.warn('[smoke]   -> 警告: 端口仍在监听（可能有残留）')
  }

  await bridgeSmoke()

  console.log('[smoke] PASS ✅ 官方 dsh web 可被 launcher 拉起、就绪、服务、停止；Obsidian API 桥协议可用')
}

// ---------------------------------------------------------------------------
// 桥冒烟：用内存假服务起真实 bridgeServer，逐端点 curl 验证路由/鉴权/错误映射
// ---------------------------------------------------------------------------

async function bridgeSmoke() {
  const { createBridgeServer } = require('../lib/bridgeServer.cjs')
  const TOKEN = 'smoke-token-123'
  const fake = {
    info: { name: 'FakeVault', path: '/tmp/fake-vault', version: '0.3.0' },
    current: () => ({ name: 'FakeVault', path: '/tmp/fake-vault', activeFile: 'a.md', updatedAt: 1 }),
    listNotes: (opts) => {
      const all = [{ path: 'a.md', size: 10 }, { path: 'sub/c.md', size: 20 }]
      const folder = opts.folder?.replace(/\/+$/, '')
      const notes = folder ? all.filter((n) => n.path.startsWith(folder + '/')) : all
      return { total: notes.length, notes }
    },
    listFolders: () => ({ total: 2, folders: [{ path: '', notes: 2 }, { path: 'sub', notes: 1 }] }),
    readNote: async (rel) => ({ path: rel, content: '# hello\n', size: 9, mtime: 1 }),
    writeNote: async (req) => ({ path: req.path, operation: 'create', bytes: Buffer.byteLength(req.content, 'utf8') }),
    editNote: async (req) => ({ path: req.path, before: 'x', after: 'y', matches: 1 }),
    metadata: async (rel) => ({
      path: rel, size: 9, mtime: 1,
      frontmatter: { present: true, fields: [{ key: 'tags', value: '[a, b]' }] },
      tags: ['a', 'b'], aliases: [], wikilinks: [{ body: 'b', embedded: false }], markdown: [], unresolved: 0,
    }),
    backlinks: async (req) => ({ total: 1, backlinks: [{ path: 'a.md', snippet: '见 [[b]]' }], target: req.path ?? req.title }),
    search: async (req) => ({ total: 1, hits: [{ path: 'a.md', snippet: `命中 ${req.q}` }] }),
    searchTags: async (req) => ({ total: 1, hits: [{ path: 'b.md', tags: [req.tag] }] }),
    frontmatter: async (rel) => ({ path: rel, present: true, valid: true, fields: [], issues: [] }),
    updateFrontmatter: async (req) => ({ path: req.path, created: false, changes: [], before: [], after: [], issues: [] }),
    rename: async (req) => ({ old_path: req.old_path, new_path: req.new_path, totalLinks: 0, updated: [], old_handling: 'kept' }),
    trash: async (req) => ({ path: req.path, trashed: true }),
    openNote: async (req) => ({ path: req.path, opened: true }),
    allTags: async () => ({ total: 2, tags: [{ tag: 'a', count: 1 }, { tag: 'b', count: 2 }] }),
    noteLink: async (req) => ({ path: req.path, link: `[[${req.path.replace(/\.md$/, '')}]]`, format: 'wikilink' }),
  }
  const handle = await createBridgeServer({ host: '127.0.0.1', port: 18888, token: TOKEN, service: fake })
  const base = `http://127.0.0.1:${handle.port}`
  const auth = { Authorization: `Bearer ${TOKEN}` }
  let failed = 0
  const check = (name, cond, extra = '') => {
    console.log(`[桥] ${cond ? '✓' : '✗ FAIL'} ${name}${extra ? ` ${extra}` : ''}`)
    if (!cond) failed++
  }
  const json = async (path, init) => {
    const res = await fetch(base + path, init)
    const body = await res.json()
    return { status: res.status, body }
  }

  console.log(`\n[smoke] 7) Obsidian API 桥协议（端口 ${handle.port}）`)
  // 鉴权
  const noAuth = await fetch(base + '/health')
  check('无 token 请求被拒 (401)', noAuth.status === 401)
  const badAuth = await fetch(base + '/health', { headers: { Authorization: 'Bearer wrong' } })
  check('错误 token 被拒 (401)', badAuth.status === 401)
  // 健康
  const health = await json('/health', { headers: auth })
  check('/health 返回 ok + vault', health.status === 200 && health.body.ok === true && health.body.vault.name === 'FakeVault')
  // 只读端点
  const cur = await json('/v1/current', { headers: auth })
  check('/v1/current', cur.status === 200 && cur.body.activeFile === 'a.md')
  const notes = await json('/v1/notes?folder=sub', { headers: auth })
  check('/v1/notes 过滤 folder', notes.status === 200 && notes.body.notes.length === 1 && notes.body.notes[0].path === 'sub/c.md')
  const folders = await json('/v1/folders', { headers: auth })
  check('/v1/folders', folders.status === 200 && folders.body.total === 2)
  const note = await json('/v1/note?path=a', { headers: auth })
  check('/v1/note', note.status === 200 && note.body.content.startsWith('# hello'))
  const meta = await json('/v1/metadata?path=a.md', { headers: auth })
  check('/v1/metadata frontmatter', meta.status === 200 && meta.body.frontmatter.fields[0].key === 'tags')
  const fm = await json('/v1/frontmatter?path=a.md', { headers: auth })
  check('/v1/frontmatter', fm.status === 200 && fm.body.present === true)
  const bl = await json('/v1/backlinks?path=b.md&format=all', { headers: auth })
  check('/v1/backlinks', bl.status === 200 && bl.body.total === 1)
  const search = await json('/v1/search?q=甲乙&limit=5', { headers: auth })
  check('/v1/search', search.status === 200 && search.body.hits[0].snippet.includes('甲乙'))
  const tags = await json('/v1/tags?tag=foo', { headers: auth })
  check('/v1/tags', tags.status === 200 && tags.body.hits[0].tags[0] === 'foo')
  // 写端点
  const write = await json('/v1/write', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'new/note', content: '# n\n' }),
  })
  check('/v1/write create', write.status === 200 && write.body.operation === 'create')
  const edit = await json('/v1/edit', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'a.md', old_string: 'x', new_string: 'y' }),
  })
  check('/v1/edit', edit.status === 200 && edit.body.matches === 1)
  const fmUpdate = await json('/v1/frontmatter', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'a.md', set: { status: 'done' }, delete: ['old'] }),
  })
  check('/v1/frontmatter update', fmUpdate.status === 200)
  const rename = await json('/v1/rename', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_path: 'a.md', new_path: 'moved/a.md', keep_old: 'stub' }),
  })
  check('/v1/rename', rename.status === 200 && rename.body.old_handling === 'kept')
  const trash = await json('/v1/trash', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'a.md' }),
  })
  check('/v1/trash', trash.status === 200 && trash.body.trashed === true)
  const open = await json('/v1/open', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'a.md' }),
  })
  check('/v1/open', open.status === 200 && open.body.opened === true)
  const allTags = await json('/v1/all-tags', { headers: auth })
  check('/v1/all-tags', allTags.status === 200 && allTags.body.total === 2 && allTags.body.tags[1].tag === 'b')
  const link = await json('/v1/link', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'a.md' }),
  })
  check('/v1/link', link.status === 200 && link.body.format === 'wikilink' && link.body.link.includes('a'))
  // 错误映射：服务抛 BridgeError → 结构化 error body
  const errSvc = { ...fake, readNote: async () => { throw new (require('../lib/bridgeServer.cjs').BridgeError)('VAULT_NOTE_NOT_FOUND', '笔记不存在', 404) } }
  const errHandle = await createBridgeServer({ host: '127.0.0.1', port: 18889, token: TOKEN, service: errSvc })
  const errRes = await fetch(`http://127.0.0.1:${errHandle.port}/v1/note?path=missing.md`, { headers: auth })
  const errBody = await errRes.json()
  check('错误映射 { error: { code, message } }', errRes.status === 404 && errBody.error.code === 'VAULT_NOTE_NOT_FOUND')
  await errHandle.close()
  const unknown = await fetch(base + '/v1/nope', { headers: auth })
  check('未知端点 404', unknown.status === 404)
  await handle.close()
  if (failed > 0) {
    console.error(`[smoke] 桥冒烟 ${failed} 项失败`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke] FAIL', err)
  process.exit(1)
})
