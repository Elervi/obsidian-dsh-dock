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
  const msg = err instanceof Error ? err.message : String(err)
  sendJson(res, 500, { error: { code: BridgeErrorCode.INTERNAL, message: `桥内部错误: ${msg}` } })
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new BridgeError(BridgeErrorCode.TOO_LARGE, `请求体超过 ${maxBytes} 字节上限`, 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', (err) => reject(err))
  })
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new BridgeError(BridgeErrorCode.BAD_REQUEST, '请求体不是合法 JSON', 400)
  }
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

  const server = createServer(async (req, res) => {
    try {
      // ---- 鉴权（所有端点） ----
      const header = req.headers.authorization ?? ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : ''
      if (!tokenEquals(token, opts.token)) {
        sendJson(res, 401, { error: { code: BridgeErrorCode.UNAUTHORIZED, message: '无效或缺失的桥 token（DSH_OBSIDIAN_BRIDGE_TOKEN）' } })
        return
      }

      const url = new URL(req.url ?? '/', `http://${opts.host}:${opts.port}`)
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
          sendJson(res, 200, service.listNotes({
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
          sendJson(res, 200, await service.writeNote(parseJson<import('./bridgeTypes.js').BridgeWriteRequest>(raw)))
          return
        }
        if (path === '/v1/edit') {
          sendJson(res, 200, await service.editNote(parseJson<import('./bridgeTypes.js').BridgeEditRequest>(raw)))
          return
        }
        if (path === '/v1/frontmatter') {
          sendJson(res, 200, await service.updateFrontmatter(parseJson<import('./bridgeTypes.js').BridgeFrontmatterUpdateRequest>(raw)))
          return
        }
        if (path === '/v1/rename') {
          sendJson(res, 200, await service.rename(parseJson<import('./bridgeTypes.js').BridgeRenameRequest>(raw)))
          return
        }
        if (path === '/v1/trash') {
          sendJson(res, 200, await service.trash(parseJson<import('./bridgeTypes.js').BridgeTrashRequest>(raw)))
          return
        }
        if (path === '/v1/open') {
          sendJson(res, 200, await service.openNote(parseJson<import('./bridgeTypes.js').BridgeOpenRequest>(raw)))
          return
        }
        if (path === '/v1/link') {
          sendJson(res, 200, await service.noteLink(parseJson<import('./bridgeTypes.js').BridgeLinkRequest>(raw)))
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
          resolve()
        })
      })
      return {
        port,
        close: () => new Promise<void>((resolve) => server.close(() => resolve())),
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
