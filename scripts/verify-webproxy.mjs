// verify-webproxy.mjs —— 独立验证 src/webProxy.ts 的访问控制 + 两种鉴权模式
// 用法: node scripts/verify-webproxy.mjs（用构建出的 lib/webProxy.cjs）
import http from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createWebProxy } = require('../lib/webProxy.cjs')

// ---------- 构造一个 base64url 32 字节 secret + 凭证库文件 ----------
const secretBytes = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'base64') // 48 bytes -> 取前32
const secret = secretBytes.slice(0, 32)
const secretB64url = secret.toString('base64url')
const credDir = mkdtempSync(join(tmpdir(), 'wp-cred-'))
const credPath = join(credDir, '.credentials.yaml')
writeFileSync(credPath, `client-connection/browser-session:\n  secret: ${secretB64url}\n`)

// ---------- mock 上游 ----------
// authMode: true => 裸 / 返 401；请求带 dsh-auth-* cookie 才放行(200)。false => 全程 200。
function startUpstream({ authMode }) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cookie = req.headers.cookie ?? ''
      if (authMode) {
        const authed = cookie.includes('dsh-auth-') && /^dsh-auth-/u.test(cookie)
        if (!authed) {
          res.writeHead(401, { 'content-type': 'text/plain' })
          res.end('dsh web authentication required; reopen the URL printed by dsh web.')
          return
        }
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end(`<html><title>DeepSeek Harness</title>AUTH_OK path=${req.url}</html>`)
        return
      }
      // 无鉴权:直接 200
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`<html><title>DeepSeek Harness</title>NOAUTH_OK path=${req.url} cookie=${cookie}</html>`)
    })
    // 支持 WS 升级:代理会把握手转发到这;带回 101 说明握手成功
    server.on('upgrade', (req, socket) => {
      const cookie = req.headers.cookie ?? ''
      if (authMode && !(cookie.includes('dsh-auth-') && /^dsh-auth-/u.test(cookie))) {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n')
      socket.end()
    })
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      resolve({ server, port, close: () => new Promise((r) => server.close(r)) })
    })
  })
}

// ---------- 测试助手 ----------
let failed = 0
function check(name, cond, extra = '') {
  console.log(`${cond ? '✓' : '✗ FAIL'} ${name}${extra ? `  ${extra}` : ''}`)
  if (!cond) failed++
}
function rawReq(port, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

// 裸 TCP 握手:发送一个 WS upgrade 请求,返回响应首行(用于验证代理的 WS 门)
function wsHandshake(port, { cookie, host } = {}) {
  return new Promise((resolve, reject) => {
    const net = require('net')
    const socket = net.connect({ host: '127.0.0.1', port }, () => {
      let req = `GET / HTTP/1.1\r\nHost: ${host ?? `127.0.0.1:${port}`}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n`
      if (cookie) req += `Cookie: ${cookie}\r\n`
      req += `\r\n`
      socket.write(req)
    })
    let buf = ''
    socket.on('data', (d) => {
      buf += d.toString()
      // 拿到响应首行(或完整 403/101 响应)即判定
      if (/\r\n\r\n/u.test(buf) || / 101 /u.test(buf) || / 403 /u.test(buf)) {
        socket.destroy()
        const status = /^HTTP\/1\.1 (\d{3})/u.exec(buf)?.[1]
        resolve(status)
      }
    })
    socket.on('error', reject)
    socket.on('close', () => {
      const status = /^HTTP\/1\.1 (\d{3})/u.exec(buf)?.[1]
      resolve(status ?? 'closed')
    })
  })
}

async function main() {
  const upstreamAuth = await startUpstream({ authMode: true })
  const upstreamNoauth = await startUpstream({ authMode: false })

  // ---------- 带认证上游 ----------
  const authProxy = await createWebProxy({
    host: '127.0.0.1', port: 0,
    targetHost: '127.0.0.1', targetPort: upstreamAuth.port,
    credentialPaths: [credPath],
  })
  const at = authProxy.panelToken
  const aPort = authProxy.port
  console.log(`\n=== 带认证上游 (${upstreamAuth.port}) / 代理 :${aPort} ===`)

  // 1. 裸请求(无 panel cookie、无 panel 参数) -> 403(C1 修复)
  let r = await rawReq(aPort, { path: '/' })
  check('无 token 裸请求被拒 403', r.status === 403, `status=${r.status}`)

  // 2. Host 伪造:DNS-rebinding / 本机仿冒 -> 403(即使带 panel 参数也不行)
  r = await rawReq(aPort, { path: `/?panel=${at}`, headers: { Host: `evil.example:${aPort}` } })
  check('伪造 Host(eyil.example) 被拒 403', r.status === 403, `status=${r.status}`)

  // 3. 错误的 panel 参数 -> 403
  r = await rawReq(aPort, { path: '/?panel=WRONG' })
  check('错误 panel 参数被拒 403', r.status === 403, `status=${r.status}`)

  // 4. 引导:正确 ?panel=<token> 且无 cookie -> 302 + Set-Cookie(dsh-dock-panel)
  r = await rawReq(aPort, { path: `/?panel=${at}` })
  check('引导 ?panel=token -> 302', r.status === 302, `status=${r.status}`)
  check('引导下发 panel cookie', /dsh-dock-panel=/.test(r.headers['set-cookie'] ?? ''), `set-cookie=${r.headers['set-cookie']}`)
  check('引导 302 到干净地址(不带 token)', (r.headers.location ?? '').indexOf('panel') === -1, `location=${r.headers.location}`)

  // 5. 带 panel cookie 的正常请求 -> 转发到上游(注入 dsh-auth cookie => 200 且 content 为 AUTH_OK)
  r = await rawReq(aPort, { path: '/', headers: { Cookie: `dsh-dock-panel=${at}` } })
  check('带 panel cookie 访问 / -> 200', r.status === 200, `status=${r.status}`)
  check('上游收到注入的 dsh-auth cookie(返回 AUTH_OK)', r.body.includes('AUTH_OK'), `body=${r.body.slice(0,60)}`)

  // 6. 带 panel cookie 的 /api 请求 -> 200,且上游收到的路径不含 panel 参数
  r = await rawReq(aPort, { path: `/api/foo?panel=${at}&x=1`, headers: { Cookie: `dsh-dock-panel=${at}` } })
  check('/api 转发时剥掉 panel 参数', r.body.includes('path=/api/foo?x=1'), `body=${r.body.slice(0,80)}`)

  // 7. WebSocket 门:无 cookie -> 403;带 cookie -> 101(且上游收到注入的 dsh-auth cookie)
  let ws = await wsHandshake(aPort, {})
  check('WS 无 panel cookie 被拒 403', ws === '403', `status=${ws}`)
  ws = await wsHandshake(aPort, { host: `evil.example:${aPort}`, cookie: `dsh-dock-panel=${at}` })
  check('WS 伪造 Host 被拒 403', ws === '403', `status=${ws}`)
  ws = await wsHandshake(aPort, { cookie: `dsh-dock-panel=${at}` })
  check('WS 带 panel cookie -> 101(注入 dsh-auth cookie 后握手成功)', ws === '101', `status=${ws}`)

  // ---------- 不带认证上游 ----------
  const naProxy = await createWebProxy({
    host: '127.0.0.1', port: 0,
    targetHost: '127.0.0.1', targetPort: upstreamNoauth.port,
    credentialPaths: [credPath],
  })
  const nt = naProxy.panelToken
  const nPort = naProxy.port
  console.log(`\n=== 不带认证上游 (${upstreamNoauth.port}) / 代理 :${nPort} ===`)

  // 1. 裸请求 403
  r = await rawReq(nPort, { path: '/' })
  check('无 token 裸请求被拒 403', r.status === 403, `status=${r.status}`)

  // 2. 引导 302
  r = await rawReq(nPort, { path: `/?panel=${nt}` })
  check('引导 ?panel=token -> 302', r.status === 302, `status=${r.status}`)
  check('引导下发 panel cookie', /dsh-dock-panel=/.test(r.headers['set-cookie'] ?? ''))

  // 3. 带 panel cookie 正常请求 -> 200 (NOAUTH_OK),且上游看不到 panel cookie
  r = await rawReq(nPort, { path: '/', headers: { Cookie: `dsh-dock-panel=${nt}; other=1` } })
  check('带 panel cookie 访问 / -> 200', r.status === 200, `status=${r.status}`)
  check('上游响应 NOAUTH_OK', r.body.includes('NOAUTH_OK'), `body=${r.body.slice(0,60)}`)
  check('上游看不到面板 cookie(dsh-dock-panel 被剥掉)', !r.body.includes('dsh-dock-panel'), `cookie=${(r.body.match(/cookie=(.*?)</)||[])[1]}`)
  check('上游仍收到其他 cookie(other=1)', r.body.includes('other=1'))

  // 4. WebSocket 门(无鉴权上游):无 cookie -> 403;带 cookie -> 101
  let nws = await wsHandshake(nPort, {})
  check('WS 无 panel cookie 被拒 403', nws === '403', `status=${nws}`)
  nws = await wsHandshake(nPort, { cookie: `dsh-dock-panel=${nt}` })
  check('WS 带 panel cookie -> 101(无鉴权上游透传)', nws === '101', `status=${nws}`)

  console.log(`\n${failed === 0 ? 'ALL PASS ✅' : `${failed} 项失败 ✗`}`)
  await Promise.all([authProxy.close(), naProxy.close(), upstreamAuth.close(), upstreamNoauth.close()])
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('verify FAIL', err)
  process.exit(1)
})
