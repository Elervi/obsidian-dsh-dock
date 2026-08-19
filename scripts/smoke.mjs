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

// launcher.cjs 的 timer 使用 window.setTimeout（Obsidian 弹窗兼容要求）；
// Node 环境下补 window shim，保证 smoke 可运行。
globalThis.window = { setTimeout, clearTimeout }

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

  console.log('[smoke] PASS ✅ 官方 dsh web 可被 launcher 拉起、就绪、服务、停止')
}

main().catch((err) => {
  console.error('[smoke] FAIL', err)
  process.exit(1)
})
