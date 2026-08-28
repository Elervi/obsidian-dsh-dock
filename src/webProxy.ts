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
 * 访问控制（C1）：代理自身是一条「打开即得已认证会话」的门户，任何本机进程 /
 * DNS-rebinding 页面都能 `curl http://127.0.0.1:<代理端口>/` 拿到完整 agent。
 * 本代理在转发之外加两道入口校验，谁都不能绕过：
 *   1) Host 头校验（对齐 bridgeServer.ts:160-170）：只接受 `127.0.0.1/<localhost>/[::1]:<端口>`，
 *      挡掉 DNS-rebinding 与非回环 Host（浏览器对 127.0.0.1 的请求 Host 一定是回环）。
 *   2) 面板 cookie 门：每次 `createWebProxy` 生成一个随机 `dsh-dock-panel` token
 *      （经 `WebProxyHandle.panelToken` 交给插件，再拼进面板 iframe 的 src，见
 *      main.ts `baseUrl`）。无有效 cookie 的请求，只有携带正确 `?panel=<token>`
 *      的首次引导导航才被放行（302 到去掉带 token 的干净地址 + 下发 cookie），
 *      其余一律 403。token 是 24 字节随机，且只出现在插件控制的 iframe src 里，
 *      本机进程/第三方页面拿不到 —— 两者合起来同时挡掉 DNS-rebinding 与冒用。
 *      cookie 必须用 SameSite=None; Secure（见 panelSetCookie 注释）：SameSite=Lax/Strict
 *      在跨站子 frame 里不会被发送，否则跨站 iframe 永远 403。
 *
 * 纯 Node、零 Obsidian 依赖，可被 scripts/smoke.mjs 直接 require 验证。
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as net from 'node:net'
import type { Duplex } from 'node:stream'

const COOKIE_PREFIX = 'dsh-auth-'
const COOKIE_PAYLOAD_VERSION = 1
const SECRET_BYTES = 32
const AUTH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/

/** 面板门 cookie 的名字前缀（与上游 dsh-auth-* cookie 隔离，互不覆盖）。
 *  真实名在 panelCookieName() 里按端口打后缀——cookie 按(名,域,路径)区分、不含端口，
 *  同一 127.0.0.1 上若跑多个代理（多 vault 并存），同名 cookie 会互相覆盖，必须按端口隔离。 */
const PANEL_COOKIE_PREFIX = 'dsh-dock-panel'
const PANEL_PARAM = 'panel'

/** 面板门 cookie 名：`dsh-dock-panel_<port>`。端口在代理绑定后唯一，且 Cookie 域不含端口，
 *  故用端口后缀保证同一 host 上多个代理的 panel cookie 互不冲突。 */
function panelCookieName(port: number): string {
  return `${PANEL_COOKIE_PREFIX}_${port}`
}

/** 鉴权探测的缓存时长：代理创建时一次性探测可能因 dsh web 尚未就绪而误判为「无需鉴权」，
 *  之后永不注入 cookie（上游 401）。每 PROBE_TTL_MS 探一次，若探测到需鉴权则自动切换为注入。 */
const PROBE_TTL_MS = 5000

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

/** 常量时间比较（对齐 bridgeServer.tokenEquals）：长度不同或内容不同都返回 false */
function tokenEquals(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    return ab.length === bb.length && timingSafeEqual(ab, bb)
  } catch {
    return false
  }
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
  /** 面板门 cookie 的随机 token（插件拿来拼进 iframe src，见 main.ts baseUrl） */
  panelToken: string
  /** 本代理的 panel cookie 名（`dsh-dock-panel_<port>`，多代理并存时互不冲突） */
  cookieName: string
  close(): Promise<void>
}

interface ProxyRuntime {
  authority: string
  targetHost: string
  targetPort: number
  /** 浏览器会话签名密钥；null = 暂判无需 cookie 鉴权（旧版 dsh web），直接透传。
   *  由 ensureInjectReady 按 PROBE_TTL_MS 惰性复查，探测到需鉴权即改为注入。 */
  secret: Buffer | null
  /** 凭证库候选路径（供 ensureInjectReady 惰性重新解析密钥） */
  credentialPaths: readonly string[]
  /** 上次鉴权探测时间戳（0 = 尚未探测），用于 PROBE_TTL_MS 惰性复查 */
  authProbedAt: number
  /** 面板门 cookie token（每次 createWebProxy 随机生成） */
  panelToken: string
  host: string
  port: number
  /** 本代理的 panel cookie 名（按端口后缀，多代理并存时不冲突），绑定后由 panelCookieName 生成 */
  cookieName: string
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
 * 惰性刷新「是否注入 dsh-auth cookie」的决定。创建时一次性探测可能因 dsh web 尚未就绪
 * 而误判（返回 false → 永不注入 → 上游 401）。此函数按 PROBE_TTL_MS 复查：若探测到目标
 * 现在需要鉴权，则重新解析密钥并切换到注入模式，自愈该竞态。
 */
async function ensureInjectReady(runtime: ProxyRuntime): Promise<void> {
  const now = Date.now()
  if (now - runtime.authProbedAt < PROBE_TTL_MS) return
  runtime.authProbedAt = now
  const requiresAuth = await probeRequiresAuth(runtime.targetHost, runtime.targetPort)
  if (requiresAuth) {
    const secret = resolveBrowserSecret(runtime.credentialPaths)
    runtime.secret = secret ?? null
  } else {
    runtime.secret = null
  }
}

// ---------------------------------------------------------------------------
// 面板门：Host 头校验 + panel cookie 门（C1）。只在入口挡住无关客户端，不改变
// 上游鉴权注入决定（secret === null 透传 / 注入 dsh-auth cookie 的分支原样保留）。
// ---------------------------------------------------------------------------

function hostOk(runtime: ProxyRuntime, req: http.IncomingMessage): boolean {
  const hostHeader = (req.headers.host ?? '').toLowerCase()
  return (
    hostHeader === `127.0.0.1:${runtime.port}` ||
    hostHeader === `localhost:${runtime.port}` ||
    hostHeader === `[::1]:${runtime.port}`
  )
}

function hasPanelCookie(runtime: ProxyRuntime, req: http.IncomingMessage): boolean {
  const cookie = req.headers.cookie
  if (cookie === undefined) return false
  for (const part of cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    if (key === runtime.cookieName) {
      return tokenEquals(part.slice(eq + 1).trim(), runtime.panelToken)
    }
  }
  return false
}

/** 若请求携带正确 `?panel=<token>`，返回去掉该参数的干净路径，用于引导（302 + 下发 cookie） */
function bootstrapLocation(runtime: ProxyRuntime, req: http.IncomingMessage): string | null {
  if (req.url === undefined) return null
  const url = new URL(req.url, `http://${runtime.host}:${runtime.port}`)
  const token = url.searchParams.get(PANEL_PARAM)
  if (token === null) return null
  return tokenEquals(token, runtime.panelToken) ? stripPanelParam(req.url) : null
}

/**
 * 去掉 URL 查询串里的 `panel` 参数，返回干净路径（对上游隐藏面板 token）。
 * 必须用原始字符串处理而非 URLSearchParams —— URL API 会把查询串重新百分号编码，
 * 破坏前端资源加载用的 Vite 多包查询（如 `/plugins/??@deepseek-ai/x.js&rev=...`），
 * 导致上游 404。无 `panel` 参数时按原样返回（避免任何重排）。
 */
function stripPanelParam(reqUrl: string): string {
  const qIdx = reqUrl.indexOf('?')
  if (qIdx === -1) return reqUrl
  // 判断是否存在 `panel=<...>` 段（首个段可能以前导 '?' 开头，如 `??@`）
  const query = reqUrl.slice(qIdx) // 含前导 '?'
  const hasPanel = query.split('&').some((segment) => {
    const key = segment.replace(/^\?/u, '').split('=')[0].trim()
    return key === PANEL_PARAM
  })
  if (!hasPanel) return reqUrl
  const pathPart = reqUrl.slice(0, qIdx)
  const kept = query
    .split('&')
    .map((s) => s.replace(/^\?/u, ''))
    .filter((s) => s.split('=')[0].trim() !== PANEL_PARAM)
  return kept.length > 0 ? `${pathPart}?${kept.join('&')}` : pathPart
}

/** 入站 cookie 头可能是数组（多个同名头），统一成字符串 */
function cookieString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v.join('; ')
  return v
}

/** 去掉 cookie 头里的本代理面板 cookie（上游不该看到 panel token），按运行时 cookie 名匹配 */
function stripPanelCookie(cookieHeader: string | undefined, panelCookieName: string): string | undefined {
  if (cookieHeader === undefined) return undefined
  const kept = cookieHeader.split(';').filter((part) => {
    const eq = part.indexOf('=')
    const key = eq === -1 ? part : part.slice(0, eq)
    return key.trim() !== panelCookieName
  })
  return kept.length > 0 ? kept.map((p) => p.trim()).join('; ') : undefined
}

function panelSetCookie(runtime: ProxyRuntime): string {
  // C1 修复点：面板门 cookie 必须用 SameSite=None 才能被 Obsidian 的跨站 iframe
  // （app://obsidian.md → http://127.0.0.1:<port>）在跳转跟随与 /api、WS 请求里真正
  // 发送。SameSite=Lax/Strict 只在顶层跨站导航时发，跨站子 frame 永不发送，会被面板门
  // 403（webProxy: 缺少面板鉴权 cookie）。Chromium 把回环地址视为潜在可信来源，允许在
  // http://127.0.0.1 上存储并发送 Secure cookie，故取 None; Secure。安全不变：token 仍
  // 是 24 字节随机且只能经 `?panel=` 引导获得，本机进程/curl 拿不到；Host 头校验仍挡
  // DNS-rebinding。
  return `${runtime.cookieName}=${runtime.panelToken}; HttpOnly; SameSite=None; Secure; Path=/`
}

function writeDenied(res: http.ServerResponse, message: string): void {
  res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(`webProxy: ${message}`)
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
  // 只在「目标确实需要鉴权」时才注入 cookie；无鉴权目标一律透传（不注入，
  // 避免覆盖客户端透传的其它 cookie）。若需鉴权但没密钥，上面已抛错。
  const injectSecret: Buffer | null = requiresAuth ? (secret as Buffer) : null

  const panelToken = randomBytes(24).toString('base64url')
  const runtime: ProxyRuntime = {
    authority,
    targetHost: opts.targetHost,
    targetPort: opts.targetPort,
    secret: injectSecret,
    credentialPaths: opts.credentialPaths,
    // 初始探测仅作 fail-fast；authProbedAt=0 让首个请求重新探测，自愈「创建时误判无需鉴权」
    authProbedAt: 0,
    panelToken,
    host: opts.host,
    port: 0,
    cookieName: '', // 绑定后由 panelCookieName(port) 赋值；请求只会在绑定后到达
    sockets: new Set(),
    agent: new http.Agent({ keepAlive: true, maxSockets: 256 }),
  }

  const server = http.createServer(async (req, res) => {
    try {
      await ensureInjectReady(runtime)
    } catch {
      writeDenied(res, '鉴权探测失败')
      return
    }
    if (!hostOk(runtime, req)) {
      writeDenied(res, '拒绝非本机 Host 请求')
      return
    }
    const path = stripPanelParam(req.url ?? '/')
    if (hasPanelCookie(runtime, req)) {
      proxyToUpstream(runtime, req, res, path)
      return
    }
    const location = bootstrapLocation(runtime, req)
    if (location !== null) {
      // 首次引导：放行 + 下发 panel cookie + 302 到干净地址（token 不进上游/地址栏）
      res.writeHead(302, { Location: location, 'Set-Cookie': panelSetCookie(runtime), 'Cache-Control': 'no-store' })
      res.end()
      return
    }
    writeDenied(res, '缺少面板鉴权 cookie')
  })
  server.on('upgrade', (req, socket, head) => {
    void ensureInjectReady(runtime).then(() => handleUpgrade(runtime, req, socket, head))
      .catch(() => socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n'))
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(opts.port, opts.host, () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? address.port : opts.port
  runtime.port = port
  runtime.cookieName = panelCookieName(port)

  return {
    host: opts.host,
    port,
    url: `http://${opts.host}:${String(port)}/`,
    panelToken,
    cookieName: runtime.cookieName,
    close: () => closeProxy(server, runtime),
  }
}

// ---------------------------------------------------------------------------
// HTTP 转发
// ---------------------------------------------------------------------------

function proxyToUpstream(runtime: ProxyRuntime, req: http.IncomingMessage, res: http.ServerResponse, path: string): void {
  const headers = buildUpstreamHeaders(runtime, req.headers)
  const upstream = http.request(
    {
      host: runtime.targetHost,
      port: runtime.targetPort,
      method: req.method,
      path,
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
  if (runtime.secret !== null) {
    // 鉴权目标：注入官方签名 cookie（覆盖入站 cookie，避免透传 client 的 cookie）
    headers.cookie = cookieHeader(runtime.secret, runtime.authority)
  } else {
    // 无鉴权目标：透传入站 cookie，但剥掉面板门 cookie（token 不进上游）
    const stripped = stripPanelCookie(cookieString(headers.cookie), runtime.cookieName)
    if (stripped === undefined) delete headers.cookie
    else headers.cookie = stripped
  }
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
  if (runtime.secret !== null) {
    headers.cookie = cookieHeader(runtime.secret, runtime.authority)
  } else {
    const stripped = stripPanelCookie(cookieString(headers.cookie), runtime.cookieName)
    if (stripped === undefined) delete headers.cookie
    else headers.cookie = stripped
  }
  if (headers.origin !== undefined) headers.origin = `http://${runtime.authority}`
  headers['sec-fetch-site'] = 'same-origin'
  return headers
}

// ---------------------------------------------------------------------------
// WebSocket 隧道
// ---------------------------------------------------------------------------

function handleUpgrade(runtime: ProxyRuntime, req: http.IncomingMessage, socket: Duplex, head: Buffer): void {
  // 面板门：WS 握手在文档加载后发生（panel cookie 已下发），只按 cookie 鉴权，无 ?panel 引导。
  if (!hostOk(runtime, req) || !hasPanelCookie(runtime, req)) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n')
    socket.destroy()
    return
  }
  const cleanUrl = stripPanelParam(req.url ?? '/')
  runtime.sockets.add(socket)
  socket.on('close', () => runtime.sockets.delete(socket))

  const headers = buildUpgradeHeaders(runtime, req.headers)

  const lines: string[] = [`${req.method} ${cleanUrl} HTTP/1.1`]
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
