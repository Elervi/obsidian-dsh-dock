/**
 * webProxy.ts —— 本机反向代理，把官方 dsh web 以「顶层上下文能用的鉴权」喂给
 * Obsidian 跨站 iframe。
 *
 * 为什么需要：官方 dsh web 用 `SameSite=Strict` 的签名 cookie 做浏览器鉴权
 * （deepseek-harness/packages/client/connection/src/browser-auth.ts）。Obsidian
 * 侧栏面板的 iframe 运行在 `app://obsidian.md` 这个跨站源里，Strict cookie
 * 不会被浏览器存储/随 /api 请求发送，所以 iframe 永远无法认证（实测复现）。
 * 本代理把鉴权接管过来：读取 dsh web 凭证库里的
 * `client-connection/browser-session` HMAC 签名密钥（明文存在目标 DSH_HOME 的
 * .credentials.yaml，per-vault 共享配置下即 ~/.dsh/.credentials.yaml），按官方
 * 格式签发一个有效 cookie，转发到上游（127.0.0.1:<port>）的每个请求/WebSocket
 * 握手时注入，并重写 Host/Origin 通过官方 /api 信任围栏。iframe 全程不碰
 * cookie，SameSite=Strict 不再碍事。无需 launch token，对新起/已存在的实例
 * 一视同仁 —— 打开面板即显示。
 *
 * 兼容旧版：若目标 dsh web 无需鉴权（对裸 `/` 返回 200、没有浏览器会话密钥），
 * 代理直接透传、不注入 cookie —— 新旧版本都能用。
 *
 * 纯 Node、零 Obsidian 依赖，可被 scripts/smoke.mjs 直接 require 验证。
 */

import { createHash, createHmac } from 'node:crypto'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as net from 'node:net'
import type { Duplex } from 'node:stream'

const COOKIE_PREFIX = 'dsh-auth-'
const COOKIE_PAYLOAD_VERSION = 1
const SECRET_BYTES = 32
const AUTH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/

/** 转发到上游时要剔除的逐跳头（保持 HTTP/WS 语义由 Node 管理） */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'te',
  'trailer',
])

function encodeBase64Url(input: Uint8Array): string {
  return Buffer.from(input).toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function decodeBase64Url(value: string): Buffer | undefined {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) return undefined
  const pad = '='.repeat((4 - (value.length % 4)) % 4)
  const decoded = Buffer.from(value.replaceAll('-', '+').replaceAll('_', '/') + pad, 'base64')
  return encodeBase64Url(decoded) === value ? decoded : undefined
}

/** 规范化 authority（与官方 requestAuthority 一致）：`new URL('http://<host>:<port>').host` */
function authorityOf(host: string, port: number): string {
  return new URL(`http://${host}:${String(port)}`).host
}

function cookieName(authority: string): string {
  return COOKIE_PREFIX + encodeBase64Url(createHash('sha256').update(authority).digest())
}

/** 官方 cookie 值：`v1.<base64url(JSON)>.<base64url(HMAC-SHA256(secret, body))>` */
function mintCookieValue(secret: Buffer, authority: string, now: number): string {
  const payload = {
    version: COOKIE_PAYLOAD_VERSION,
    authority,
    issuedAt: now,
    expiresAt: now + AUTH_MAX_AGE_MS,
  }
  const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const sig = createHmac('sha256', secret).update(body).digest()
  return `v1.${body}.${encodeBase64Url(sig)}`
}

function cookieHeader(secret: Buffer, authority: string): string {
  return `${cookieName(authority)}=${mintCookieValue(secret, authority, Date.now())}`
}

/** 从单个凭证库文件读取浏览器会话签名密钥；不存在/格式不对返回 undefined */
function readSecretFrom(credentialPath: string): Buffer | undefined {
  try {
    const text = fs.readFileSync(credentialPath, 'utf8')
    const m = /client-connection\/browser-session:[\s\S]*?secret:\s*([A-Za-z0-9_-]+)/.exec(text)
    if (!m) return undefined
    const secret = decodeBase64Url(m[1])
    return secret !== undefined && secret.byteLength === SECRET_BYTES ? secret : undefined
  } catch {
    return undefined
  }
}

/** 按候选路径依次尝试读取浏览器会话签名密钥 */
export function resolveBrowserSecret(candidates: readonly string[]): Buffer | undefined {
  for (const candidate of candidates) {
    const secret = readSecretFrom(candidate)
    if (secret !== undefined) return secret
  }
  return undefined
}

export interface WebProxyOptions {
  /** 代理监听 host（回环） */
  host: string
  /** 代理监听端口；0 = 由 OS 分配 */
  port: number
  /** 上游 dsh web 的 host（回环） */
  targetHost: string
  /** 上游 dsh web 的端口 */
  targetPort: number
  /** 凭证库候选路径（按顺序尝试读取浏览器会话签名密钥） */
  credentialPaths: readonly string[]
}

export interface WebProxyHandle {
  host: string
  /** 实际绑定端口（port=0 时由 OS 分配） */
  port: number
  url: string
  close(): Promise<void>
}

interface ProxyRuntime {
  authority: string
  targetHost: string
  targetPort: number
  /** 浏览器会话签名密钥；null = 目标无需 cookie 鉴权（旧版 dsh web），直接透传 */
  secret: Buffer | null
  sockets: Set<Duplex>
  agent: http.Agent
}

/**
 * 探测目标 dsh web 是否强制浏览器鉴权：新版对裸 `/`（无 token / 无 cookie）返回
 * 401；旧版无鉴权、直接 200。借此区分「需要注入 cookie」与「直接透传」。
 */
function probeRequiresAuth(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/', timeout: timeoutMs }, (res) => {
      res.resume()
      res.on('end', () => resolve(res.statusCode === 401))
    })
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.on('error', () => resolve(false))
  })
}

/**
 * 启动一个本机反向代理，把 `targetHost:targetPort` 的 dsh web 原样转发给
 * 浏览器（含 Cookie 注入与 Host/Origin 重写）。用于让 Obsidian 跨站 iframe
 * 能够无鉴权交互地加载官方 dsh web。
 */
export async function createWebProxy(opts: WebProxyOptions): Promise<WebProxyHandle> {
  const authority = authorityOf(opts.targetHost, opts.targetPort)
  // 旧版 dsh web 无鉴权（/ 直接 200），只需透传；新版强制鉴权（/ 401），需注入 cookie。
  const requiresAuth = await probeRequiresAuth(opts.targetHost, opts.targetPort)
  const secret = resolveBrowserSecret(opts.credentialPaths)
  if (requiresAuth && secret === undefined) {
    throw new Error(
      `webProxy: 目标 dsh web 需要浏览器鉴权，但未找到会话签名密钥（试过: ${JSON.stringify(opts.credentialPaths)}）。` +
      '请确认凭证库路径，或改用「在系统浏览器中打开」',
    )
  }

  const runtime: ProxyRuntime = {
    authority,
    targetHost: opts.targetHost,
    targetPort: opts.targetPort,
    secret: secret ?? null,
    sockets: new Set(),
    agent: new http.Agent({ keepAlive: true, maxSockets: 256 }),
  }

  const server = http.createServer((req, res) => handleRequest(runtime, req, res))
  server.on('upgrade', (req, socket, head) => handleUpgrade(runtime, req, socket, head))

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(opts.port, opts.host, () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? address.port : opts.port

  return {
    host: opts.host,
    port,
    url: `http://${opts.host}:${String(port)}/`,
    close: () => closeProxy(server, runtime),
  }
}

// ---------------------------------------------------------------------------
// HTTP 转发
// ---------------------------------------------------------------------------

function handleRequest(runtime: ProxyRuntime, req: http.IncomingMessage, res: http.ServerResponse): void {
  const headers = buildUpstreamHeaders(runtime, req.headers)
  const upstream = http.request(
    {
      host: runtime.targetHost,
      port: runtime.targetPort,
      method: req.method,
      path: req.url,
      headers,
      agent: runtime.agent,
    },
    (upstreamRes) => {
      const responseHeaders = { ...upstreamRes.headers }
      // 让 Node 客户端用自己的分帧/保持连接语义，不把上游逐跳头带下来
      for (const hop of HOP_BY_HOP) delete responseHeaders[hop]
      res.writeHead(upstreamRes.statusCode ?? 502, responseHeaders)
      if (req.method === 'HEAD') {
        upstreamRes.resume()
        upstreamRes.on('end', () => res.end())
        return
      }
      upstreamRes.pipe(res)
      upstreamRes.on('end', () => res.end())
      upstreamRes.on('error', () => res.destroy())
    },
  )
  upstream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(`webProxy: 上游转发失败: ${String(err)}`)
    } else {
      res.destroy()
    }
  })
  req.on('error', () => upstream.destroy())
  req.pipe(upstream)
}

/** 构造转发到上游的请求头：Host 指向上游、注入 cookie、Origin 对齐上游 */
function buildUpstreamHeaders(runtime: ProxyRuntime, incoming: http.IncomingHttpHeaders): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = {}
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    // 头名用小写即可（HTTP 头大小写不敏感）；Node 会自动规范化
    headers[lower] = value
  }
  headers.host = runtime.authority
  if (runtime.secret !== null) headers.cookie = cookieHeader(runtime.secret, runtime.authority)
  // 信任围栏：Origin 必须恰好等于 Host 的 authority，否则 403
  if (headers.origin !== undefined) headers.origin = `http://${runtime.authority}`
  // 跨站标志：把上游视作 same-origin，避免 sec-fetch-site=cross-site 被拒
  headers['sec-fetch-site'] = 'same-origin'
  return headers
}

/** 构造 WebSocket 升级请求头：与 HTTP 版相同，但保留 connection/upgrade/sec-websocket-*（握手靠它们） */
function buildUpgradeHeaders(runtime: ProxyRuntime, incoming: http.IncomingHttpHeaders): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = {}
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    if (lower === 'proxy-connection') continue
    headers[lower] = value
  }
  headers.host = runtime.authority
  if (runtime.secret !== null) headers.cookie = cookieHeader(runtime.secret, runtime.authority)
  if (headers.origin !== undefined) headers.origin = `http://${runtime.authority}`
  headers['sec-fetch-site'] = 'same-origin'
  return headers
}

// ---------------------------------------------------------------------------
// WebSocket 隧道
// ---------------------------------------------------------------------------

function handleUpgrade(
  runtime: ProxyRuntime,
  req: http.IncomingMessage,
  socket: Duplex,
  head: Buffer,
): void {
  runtime.sockets.add(socket)
  socket.on('close', () => runtime.sockets.delete(socket))

  const headers = buildUpgradeHeaders(runtime, req.headers)

  const lines: string[] = [`${req.method} ${req.url} HTTP/1.1`]
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    lines.push(`${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
  }
  const rawRequest = lines.join('\r\n') + '\r\n\r\n'

  const upstream = net.connect({ host: runtime.targetHost, port: runtime.targetPort }, () => {
    upstream.write(rawRequest)
    if (head !== undefined && head.length > 0) upstream.write(head)
    upstream.pipe(socket)
    socket.pipe(upstream)
  })
  runtime.sockets.add(upstream)
  upstream.on('close', () => {
    runtime.sockets.delete(upstream)
    socket.destroy()
  })
  upstream.on('error', () => socket.destroy())
  socket.on('close', () => upstream.destroy())
  socket.on('error', () => upstream.destroy())
}

// ---------------------------------------------------------------------------
// 关闭
// ---------------------------------------------------------------------------

function closeProxy(server: http.Server, runtime: ProxyRuntime): Promise<void> {
  return new Promise((resolve) => {
    for (const sock of runtime.sockets) {
      try {
        sock.destroy()
      } catch {
        /* ignore */
      }
    }
    runtime.sockets.clear()
    runtime.agent.destroy()
    server.closeAllConnections?.()
    server.close(() => resolve())
  })
}
