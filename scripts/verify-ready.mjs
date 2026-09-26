// verify-ready.mjs —— 就绪判定的回归测试（纯 Node，不需要 dsh CLI）。
//
// 背景（CI smoke 变红根因）：dsh web 的端口先于前端/鉴权路由挂载，冷启动期 `/`
// 会先返回 404 / 0 字节。旧 waitForReady 只判「端口能连」就会提前返回，调用方
// 紧接着抓首页只拿到 404。这里用一个「先 404、后 401」的假上游锁死该窗口。
//
// 用法: node scripts/verify-ready.mjs
import http from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { waitForReady, isPortUp } = require('../lib/launcher.cjs')

let failed = 0
function check(name, cond, extra = '') {
  console.log(`${cond ? '✓' : '✗ FAIL'} ${name}${extra ? `  ${extra}` : ''}`)
  if (!cond) failed++
}

/**
 * 起一个可控假上游：
 * - respond: (req, res) => void，由各用例决定行为。
 */
function startServer(respond) {
  return new Promise((resolve) => {
    const server = http.createServer(respond)
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, close: () => new Promise((r) => server.close(r)) }))
  })
}

async function main() {
  // 1) 端口先开、路由后挂：前 2500ms 返回 404，之后返回 401（真实 dsh web 冷启动形态）
  let mountedAt = 0
  const late = await startServer((_req, res) => {
    if (mountedAt === 0) mountedAt = Date.now()
    const elapsed = Date.now() - mountedAt
    if (elapsed < 2500) {
      res.writeHead(404)
      res.end()
      return
    }
    res.writeHead(401, { 'content-type': 'text/plain' })
    res.end('dsh web authentication required; reopen the URL printed by dsh web.\n')
  })
  const t0 = Date.now()
  const ready = await waitForReady('127.0.0.1', late.port, 10_000)
  const waited = Date.now() - t0
  check('冷启动期(404)不判就绪、挂载后(401)判就绪', ready === true, `ready=${ready} waited=${waited}ms`)
  check('确实等过了 404 窗口(>=2000ms)', waited >= 2000, `waited=${waited}ms`)
  check('isPortUp 在 404 阶段仍为 true(挂接语义不变)', (await isPortUp('127.0.0.1', late.port)) === true)
  await late.close()

  // 2) 永远 404：超时必须为 false（不得把 404 当就绪）
  const always404 = await startServer((_req, res) => {
    res.writeHead(404)
    res.end()
  })
  const ready404 = await waitForReady('127.0.0.1', always404.port, 2000)
  check('一直 404 时超时返回 false', ready404 === false, `ready=${ready404}`)
  await always404.close()

  // 3) 旧版无鉴权首页(200) 立刻判就绪
  const old = await startServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<html><title>DeepSeek Harness</title></html>')
  })
  const t1 = Date.now()
  const ready200 = await waitForReady('127.0.0.1', old.port, 5000)
  check('旧版 200 首页立刻判就绪', ready200 === true, `ready=${ready200} waited=${Date.now() - t1}ms`)
  await old.close()

  console.log(`\n${failed === 0 ? 'ALL PASS ✅' : `${failed} 项失败 ✗`}`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('verify-ready FAIL', err)
  process.exit(1)
})
