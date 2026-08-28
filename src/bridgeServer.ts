/**
 * bridgeServer.ts —— Obsidian API 桥的 HTTP 服务器（纯 Node，零 Obsidian 依赖，
 * 可被 scripts/smoke.mjs 直接加载冒烟）。
 *
 * 路由：/health + /v1/*（见 bridgeTypes.ts）。鉴权：除 /health 外全部要求
 * `Authorization: Bearer <token>`（/health 也要，客户端始终带 token）。
 * 错误统一 `{ error: { code, message } }`；body 默认上限 2MB。
 *
 * 端口冲突：createBridgeServer 从期望端口起顺延最多 10 个端口，全部失败才抛错
 * （Obsidian 多窗口/多库并发时桥端口偶发碰撞也能自动避开）。
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { BridgeErrorCode, type BridgeService } from './bridgeTypes.js'

export class BridgeError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'BridgeError'
    this.code = code
    this.status = status
  }
}

export interface BridgeServerOptions {
  host: string
  port: number
  token: string
  service: BridgeService
  /** 请求体上限（字节），默认 2MB */
  maxBodyBytes?: number
}

export interface BridgeServerHandle {
  port: number
  close(): Promise<void>
}

const MAX_PORT_TRIES = 10
const DEFAULT_MAX_BODY = 2 * 1024 * 1024

function tokenEquals(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    return ab.length === bb.length && timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

/** H4：只允许回环地址。桥的 Host 头校验可被伪造 Host 绕过，所以绑定地址本身必须是回环。 */
function isLoopbackHost(host: string): boolean {
  if (host === 'localhost' || host === '::1') return true
  // 127.0.0.0/8 都是回环；校验各段 ≤255
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  return m.slice(1).every((n) => Number(n) <= 255)
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(body)
}

function sendError(res: ServerResponse, err: unknown): void {
  if (err instanceof BridgeError) {
    sendJson(res, err.status, { error: { code: err.code, message: err.message } })
    return
  }
  // L7：非 BridgeError 的内部异常不向客户端泄漏原始文案（可能是 Obsidian/Node
  // 内部错误信息），只记日志，对外统一 INTERNAL。
  const detail = err instanceof Error ? err.message : String(err)
  console.warn('[dsh-dock] 桥内部错误', detail)
  sendJson(res, 500, { error: { code: BridgeErrorCode.INTERNAL, message: '桥内部错误' } })
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const fail = (err: unknown): void => {
      if (settled) return
      settled = true
      reject(err)
    }
    req.on('data', (chunk: Buffer) => {
      if (settled) return
      size += chunk.length
      if (size > maxBytes) {
        // M4：超限时只拒绝并继续 drain（不再 accumulate），不在此 destroy ——
        // 否则外层写 413 响应时会撞 ERR_STREAM_DESTROYED，丢响应/未处理异常。
        req.resume()
        fail(new BridgeError(BridgeErrorCode.TOO_LARGE, `请求体超过 ${maxBytes} 字节上限`, 413))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (err) => fail(err))
  })
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new BridgeError(BridgeErrorCode.BAD_REQUEST, '请求体不是合法 JSON', 400)
  }
}

/** M5：运行时字段校验 —— 把错误类型挡在服务层之前，返回明确 400 而非内部 TypeError */
function assertStr(v: unknown, field: string): string {
  if (typeof v !== 'string') {
    throw new BridgeError(BridgeErrorCode.INVALID_ARGS, `字段 ${field} 必须是字符串`, 400)
  }
  return v
}

function queryBool(v: string | null): boolean | undefined {
  if (v === null) return undefined
  return v === '1' || v === 'true' || v === 'yes'
}

function queryNum(v: string | null): number | undefined {
  if (v === null || v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** 逗号分隔的 ignoreDirs（客户端把 config.ignoreDirs 拼进来） */
function queryList(v: string | null): string[] {
  if (!v) return []
  return v.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
}

function requireQuery(params: URLSearchParams, key: string): string {
  const v = params.get(key)
  if (!v || v.trim() === '') {
    throw new BridgeError(BridgeErrorCode.BAD_REQUEST, `缺少必填参数 ${key}`, 400)
  }
  return v.trim()
}

export async function createBridgeServer(opts: BridgeServerOptions): Promise<BridgeServerHandle> {
  const { service } = opts
  const maxBody = opts.maxBodyBytes ?? DEFAULT_MAX_BODY
  // H4：桥只能绑定回环（防调用方误传 0.0.0.0/:: 把 vault API 暴露到局域网）
  if (!isLoopbackHost(opts.host)) {
    throw new Error(`桥必须只绑定回环地址（127.0.0.1 / localhost / ::1），拒绝绑到 ${opts.host}`)
  }
  let boundPort = opts.port

  const server = createServer(async (req, res) => {
    try {
      // ---- 鉴权（所有端点） ----
      const header = req.headers.authorization ?? ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : ''
      if (!tokenEquals(token, opts.token)) {
        sendJson(res, 401, { error: { code: BridgeErrorCode.UNAUTHORIZED, message: '无效或缺失的桥 token（DSH_OBSIDIAN_BRIDGE_TOKEN）' } })
        return
      }

      // ---- Host 头校验（M2，防 DNS rebinding / 非回环 Host 探测） ----
      // 桥只服务本机回环，Host 必须是 127.0.0.1/localhost/[::1]:<实际端口>。
      const hostHeader = (req.headers.host ?? '').toLowerCase()
      const hostOk =
        hostHeader === `127.0.0.1:${boundPort}` ||
        hostHeader === `localhost:${boundPort}` ||
        hostHeader === `[::1]:${boundPort}`
      if (!hostOk) {
        sendJson(res, 403, { error: { code: BridgeErrorCode.FORBIDDEN, message: '拒绝非本机 Host 请求' } })
        return
      }

      const url = new URL(req.url ?? '/', `http://${opts.host}:${boundPort}`)
      const path = url.pathname
      const q = url.searchParams

      // ---- 健康检查 ----
      if (req.method === 'GET' && path === '/health') {
        sendJson(res, 200, { ok: true, version: service.info.version, vault: { name: service.info.name, path: service.info.path } })
        return
      }

      // ---- GET 端点 ----
      if (req.method === 'GET') {
        if (path === '/v1/current') {
          sendJson(res, 200, service.current())
          return
        }
        if (path === '/v1/notes') {
          sendJson(res, 200, await service.listNotes({
            folder: q.get('folder') ?? undefined,
            all: queryBool(q.get('all')) ?? false,
            ignoreDirs: queryList(q.get('ignore')),
          }))
          return
        }
        if (path === '/v1/folders') {
          sendJson(res, 200, await service.listFolders({
            folder: q.get('folder') ?? undefined,
            ignoreDirs: queryList(q.get('ignore')),
          }))
          return
        }
        if (path === '/v1/note') {
          sendJson(res, 200, await service.readNote(requireQuery(q, 'path')))
          return
        }
        if (path === '/v1/metadata') {
          sendJson(res, 200, await service.metadata(requireQuery(q, 'path')))
          return
        }
        if (path === '/v1/frontmatter') {
          sendJson(res, 200, await service.frontmatter(requireQuery(q, 'path')))
          return
        }
        if (path === '/v1/backlinks') {
          sendJson(res, 200, await service.backlinks({
            path: q.get('path') ?? undefined,
            title: q.get('title') ?? undefined,
            format: q.get('format') === 'markdown' ? 'markdown' : q.get('format') === 'all' ? 'all' : 'wikilink',
          }))
          return
        }        if (path === '/v1/search') {
          const qq = requireQuery(q, 'q')
          sendJson(res, 200, await service.search({
            q: qq,
            folder: q.get('folder') ?? undefined,
            limit: queryNum(q.get('limit')),
            regex: queryBool(q.get('regex')),
            case_sensitive: queryBool(q.get('case_sensitive')),
            match_all: queryBool(q.get('match_all')),
            ignoreDirs: queryList(q.get('ignore')),
          }))
          return
        }
        if (path === '/v1/tags') {
          sendJson(res, 200, await service.searchTags({
            tag: requireQuery(q, 'tag'),
            folder: q.get('folder') ?? undefined,
            limit: queryNum(q.get('limit')),
            ignoreDirs: queryList(q.get('ignore')),
          }))
          return
        }
        if (path === '/v1/all-tags') {
          sendJson(res, 200, await service.allTags({
            folder: q.get('folder') ?? undefined,
            ignoreDirs: queryList(q.get('ignore')),
          }))
          return
        }
        throw new BridgeError(BridgeErrorCode.NOT_FOUND, `未知端点 ${req.method} ${path}`, 404)
      }

      // ---- POST 端点 ----
      if (req.method === 'POST') {
        const raw = await readBody(req, maxBody)
        if (path === '/v1/write') {
          const body = parseJson<Record<string, unknown>>(raw)
          sendJson(res, 200, await service.writeNote({
            path: assertStr(body.path, 'path'),
            content: assertStr(body.content, 'content'),
            op: body.op === 'append' ? 'append' : 'write',
            unique: body.unique === true,
            overwrite: body.overwrite === true,
          }))
          return
        }
        if (path === '/v1/edit') {
          const body = parseJson<Record<string, unknown>>(raw)
          sendJson(res, 200, await service.editNote({
            path: assertStr(body.path, 'path'),
            old_string: assertStr(body.old_string, 'old_string'),
            new_string: assertStr(body.new_string, 'new_string'),
            replace_all: body.replace_all === true,
          }))
          return
        }
        if (path === '/v1/frontmatter') {
          const body = parseJson<Record<string, unknown>>(raw)
          sendJson(res, 200, await service.updateFrontmatter({
            path: assertStr(body.path, 'path'),
            set: typeof body.set === 'object' && body.set !== null ? (body.set as Record<string, string>) : undefined,
            delete: Array.isArray(body.delete) ? (body.delete as string[]) : undefined,
          }))
          return
        }
        if (path === '/v1/rename') {
          const body = parseJson<Record<string, unknown>>(raw)
          sendJson(res, 200, await service.rename({
            old_path: assertStr(body.old_path, 'old_path'),
            new_path: assertStr(body.new_path, 'new_path'),
            keep_old: body.keep_old === 'stub' ? 'stub' : 'keep',
          }))
          return
        }
        if (path === '/v1/trash') {
          const body = parseJson<Record<string, unknown>>(raw)
          sendJson(res, 200, await service.trash({ path: assertStr(body.path, 'path') }))
          return
        }
        if (path === '/v1/open') {
          const body = parseJson<Record<string, unknown>>(raw)
          sendJson(res, 200, await service.openNote({ path: assertStr(body.path, 'path') }))
          return
        }
        if (path === '/v1/link') {
          const body = parseJson<Record<string, unknown>>(raw)
          sendJson(res, 200, await service.noteLink({
            path: assertStr(body.path, 'path'),
            source: typeof body.source === 'string' ? body.source : undefined,
          }))
          return
        }
        throw new BridgeError(BridgeErrorCode.NOT_FOUND, `未知端点 ${req.method} ${path}`, 404)
      }

      throw new BridgeError(BridgeErrorCode.METHOD_NOT_ALLOWED, `不支持的请求方法 ${req.method}`, 405)
    } catch (err) {
      sendError(res, err)
    }
  })

  // 端口顺延绑定：EADDRINUSE 自动尝试下一个，最多 MAX_PORT_TRIES 次。
  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const port = opts.port + i
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, opts.host, () => {
          server.removeListener('error', reject)
          const addr = server.address()
          boundPort = typeof addr === 'object' && addr !== null ? addr.port : port
          resolve()
        })
      })
      // L1：绑定成功后挂常驻 error 监听 —— 运行期服务器错误只记日志，
      // 不再变成渲染进程未捕获异常。
      server.on('error', (err) => {
        console.warn('[dsh-dock] 桥服务器运行期错误', err)
      })
      // 请求接收超时，防 slowloris 式半开连接拖住本地桥
      server.requestTimeout = 60_000
      server.headersTimeout = 15_000
      server.keepAliveTimeout = 5_000

      // close 幂等 + 主动断开 keep-alive 连接（C2），避免 close 回调悬挂
      let closed = false
      return {
        port: boundPort,
        close: () =>
          new Promise<void>((resolve) => {
            if (closed) {
              resolve()
              return
            }
            closed = true
            server.closeAllConnections?.()
            server.close(() => resolve())
            const t = setTimeout(() => resolve(), 1000)
            if (typeof t === 'object' && t !== null && 'unref' in t) t.unref()
          }),
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'EADDRINUSE' && code !== 'EACCES') throw err
      if (i === MAX_PORT_TRIES - 1) {
        throw new BridgeError(BridgeErrorCode.INTERNAL, `桥端口 ${opts.port}–${opts.port + MAX_PORT_TRIES - 1} 均被占用，无法启动`, 500)
      }
    }
  }
  throw new BridgeError(BridgeErrorCode.INTERNAL, '桥启动失败', 500)
}
