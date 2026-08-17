/**
 * launcher.ts —— 纯启动逻辑（零 Obsidian 依赖，可独立冒烟测试）。
 *
 * 职责：定位官方 dsh CLI → 选择 Node 运行时 → spawn `dsh web`
 * （127.0.0.1:<port>）→ 等待 HTTP 就绪 → 停止。
 *
 * 关键事实（已在官方 @deepseek-ai/dsh@0.1.0-rc.6 上验证）：
 * - `node <dsh>/lib/bin.js web --host 127.0.0.1 --port <port>` 即官方 Web UI；
 * - 默认 host=127.0.0.1、port=3080（可覆盖）；
 * - 首次启动自动初始化 $DSH_HOME/profiles/web（bundles = dsh-base + dsh-web-app），
 *   模块解析走 $DSH_HOME/profiles/node_modules 平面符号链接，无需 pnpm/联网；
 * - 默认配置下 SQLite（node:sqlite，需 Node ≥22.5）不会打开（openAt: never），
 *   因此 Node 20+ 也能跑默认 web profile；启用全文搜索时才需要 Node ≥22.5。
 */

import { spawn, spawnSync, type ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as http from 'http'
import * as os from 'os'
import * as path from 'path'

export const DSH_RELATIVE_BIN = path.join('@deepseek-ai', 'dsh', 'lib', 'bin.js')

/** Node 主版本号比较：node:sqlite 需要 ≥22.5（仅全文搜索功能用到） */
export const NODE_SQLITE_MIN_MAJOR = 22

/** 稳定短哈希（djb2），用于 vault 目录名消歧，避免中文名清洗碰撞 */
export function stableHash(input: string, len = 6): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  return h.toString(36).padStart(len, '0').slice(0, len)
}

/** 可读的 vault 目录名（保留 Unicode 字母数字，其余转 -）；空则 'vault' */
export function safeVaultName(vaultRoot: string): string {
  const cleaned = path
    .basename(vaultRoot)
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return (cleaned || 'vault').slice(0, 40)
}

export interface LaunchOptions {
  /** dsh CLI 入口（bin.js 的绝对路径，或 dsh 包目录）；空则自动探测 */
  dshBin?: string
  /** Node 可执行文件；空则自动选择 */
  nodeBin?: string
  /** 监听端口（默认 3080） */
  port?: number
  /** 监听 host（默认 127.0.0.1，仅本机） */
  host?: string
  /** $DSH_HOME（会话/密钥/模型配置根目录；默认 <vault>/.dsh） */
  dshHome: string
  /**
   * 共享配置根（per-vault 模式下的 `~/.dsh`）：模型/密钥/主题等配置类文件
   * 指向此目录，所有 vault 共用一份；sessions 等数据仍在 `dshHome` 隔离。
   * 留空 = 不启用配置共享（dshHome 自身即配置根）。
   */
  sharedConfigRoot?: string
  /** 是否允许用 ELECTRON_RUN_AS_NODE 复用 Obsidian 内置 Node（默认关闭：实测不可靠） */
  useEmbeddedNode?: boolean
  /** 就绪等待上限（默认 120s） */
  timeoutMs?: number
  /** 附加环境变量 */
  env?: NodeJS.ProcessEnv
}

export interface ResolvedNode {
  /** 用于 spawn 的 node 可执行文件 */
  nodeBin: string
  /** 是否用 ELECTRON_RUN_AS_NODE 把 Obsidian 的 Electron 二进制当 Node 用 */
  useElectronAsNode: boolean
  /** 该 Node 的 major 版本（探测失败为 0） */
  nodeMajor: number
  /** 探测/决策说明（供设置页展示） */
  notes: string[]
}

export type ServerStatus =
  | { kind: 'stopped' }
  | { kind: 'starting' }
  | { kind: 'running'; port: number; host: string; url: string; attached: boolean }
  | { kind: 'error'; message: string }

// ---------------------------------------------------------------------------
// 路径定位
// ---------------------------------------------------------------------------

/** 把用户填写的入口规范化：指向 bin.js 或 dsh 包目录都接受 */
export function normalizeDshBin(input: string | undefined | null): string | null {
  if (!input) return null
  const p = input.trim()
  if (!p) return null
  const expanded = p.replace(/^~(?=$|\/|\\)/, os.homedir())
  const abs = path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(expanded)
  try {
    const st = fs.statSync(abs)
    if (st.isDirectory()) {
      const candidate = path.join(abs, 'lib', 'bin.js')
      return fs.existsSync(candidate) ? candidate : null
    }
    if (st.isFile()) return abs
  } catch {
    return null
  }
  return null
}

/** 常见 npm 全局 node_modules 根（按平台） */
export function globalModuleRoots(): string[] {
  const roots: string[] = []
  if (process.env.DSH_GLOBAL_MODULES) roots.push(process.env.DSH_GLOBAL_MODULES)
  const npmRoot = spawnSync('npm', ['root', '-g'], {
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
  })
  if (npmRoot.status === 0 && npmRoot.stdout) {
    const line = npmRoot.stdout.trim().split(/\r?\n/)[0]
    if (line) roots.push(line)
  }
  if (process.platform === 'darwin') {
    roots.push('/opt/homebrew/lib/node_modules', '/usr/local/lib/node_modules')
  } else if (process.platform === 'linux') {
    roots.push('/usr/lib/node_modules', '/usr/local/lib/node_modules', path.join(os.homedir(), '.local', 'lib', 'node_modules'))
  } else if (process.platform === 'win32') {
    const appData = process.env.APPDATA
    if (appData) roots.push(path.join(appData, 'npm', 'node_modules'))
  }
  // 去重保序
  return [...new Set(roots)]
}

/**
 * 定位官方 dsh CLI 入口。优先级：
 * 1. 显式传入（设置页）→ 2. 环境变量 DSH_BIN → 3. npm root -g → 4. 常见全局根。
 * 未找到时 bin 为 null，notes 说明原因。
 */
export function resolveDshBin(explicit?: string): { bin: string | null; notes: string[] } {
  const notes: string[] = []
  const explicitBin = normalizeDshBin(explicit ?? process.env.DSH_BIN)
  if (explicitBin && fs.existsSync(explicitBin)) {
    return { bin: explicitBin, notes: [`使用显式路径: ${explicitBin}`] }
  }
  if (explicit) notes.push(`显式路径不存在: ${explicit}`)

  for (const root of globalModuleRoots()) {
    const candidate = path.join(root, DSH_RELATIVE_BIN)
    if (fs.existsSync(candidate)) {
      return { bin: candidate, notes: [...notes, `从全局模块根发现: ${candidate}`] }
    }
  }
  notes.push('未找到 dsh 安装。请先执行: npm install -g @deepseek-ai/dsh，或在设置中填写 dsh 路径')
  return { bin: null, notes }
}

/**
 * 常见 Node 可执行文件绝对路径（按平台，探测用）。
 * Obsidian 作为 GUI 应用从 Finder 启动时，PATH 通常只有系统目录
 * （/usr/bin:/bin:/usr/sbin:/sbin），不含 Homebrew 等用户安装目录，
 * 因此 spawn('node') 会直接 ENOENT。这里把常见安装位置补齐：
 * - PATH 中的 node（shell 里运行时存在）；
 * - macOS: /opt/homebrew/bin/node（Apple Silicon）、/usr/local/bin/node（Intel）；
 * - Linux: /usr/bin/node、/usr/local/bin/node、~/.local/bin/node；
 * - Windows: 通过 `where node` 解析。
 */
export function commonNodeBins(): string[] {
  const bins: string[] = []
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(path.delimiter)) {
    if (dir.trim()) bins.push(path.join(dir, 'node'))
  }
  if (process.platform === 'darwin') {
    bins.push('/opt/homebrew/bin/node', '/usr/local/bin/node')
  } else if (process.platform === 'linux') {
    bins.push('/usr/bin/node', '/usr/local/bin/node', path.join(os.homedir(), '.local', 'bin', 'node'))
  } else if (process.platform === 'win32') {
    try {
      const where = spawnSync('where', ['node'], { encoding: 'utf8', timeout: 10_000, windowsHide: true })
      if (where.status === 0 && where.stdout) {
        for (const line of where.stdout.trim().split(/\r?\n/)) {
          if (line.trim()) bins.push(line.trim())
        }
      }
    } catch {
      /* ignore */
    }
  }
  // 去重保序，保留第一个存在的
  return [...new Set(bins)]
}

/**
 * 选择 Node 运行时。
 * 默认顺序：显式路径 → 系统 `node`（PATH + 常见安装路径，返回绝对路径，
 * 避免 Obsidian GUI 环境 PATH 缺失导致 spawn ENOENT）→ 找不到时给出明确错误。
 * ELECTRON_RUN_AS_NODE 复用 Obsidian 内置 Node 实测会挂起（Obsidian 二进制
 * 不按普通 Electron 语义响应），因此仅当 useEmbeddedNode 显式开启时才尝试。
 */
export function resolveNodeBin(explicit?: string, embeddedNodeVersion?: string, useEmbedded = false): ResolvedNode {
  const notes: string[] = []
  const explicitBin = explicit?.trim() || process.env.DSH_NODE
  if (explicitBin) {
    notes.push(`使用显式 Node: ${explicitBin}`)
    return { nodeBin: explicitBin, useElectronAsNode: false, nodeMajor: 0, notes }
  }
  if (useEmbedded && process.execPath && embeddedNodeVersion) {
    const major = Number(embeddedNodeVersion.split('.')[0]) || 0
    if (major >= NODE_SQLITE_MIN_MAJOR) {
      notes.push(`使用 Obsidian 内置 Node ${embeddedNodeVersion}（ELECTRON_RUN_AS_NODE）`)
      return { nodeBin: process.execPath, useElectronAsNode: true, nodeMajor: major, notes }
    }
    notes.push(`Obsidian 内置 Node ${embeddedNodeVersion} < ${NODE_SQLITE_MIN_MAJOR}，无法启用`)
  }
  for (const candidate of commonNodeBins()) {
    if (fs.existsSync(candidate)) {
      notes.push(`使用系统 Node: ${candidate}`)
      return { nodeBin: candidate, useElectronAsNode: false, nodeMajor: 0, notes }
    }
  }
  notes.push('未找到 Node。请安装 Node（https://nodejs.org），或在设置中填写 Node 可执行文件路径')
  return { nodeBin: '', useElectronAsNode: false, nodeMajor: 0, notes }
}

// ---------------------------------------------------------------------------
// 端口探测与等待
// ---------------------------------------------------------------------------

/** 当前运行环境（Obsidian 渲染进程）自带的 Node 版本；无则 undefined */
export function embeddedNodeVersion(): string | undefined {
  try {
    const v = (process.versions as { node?: string } | undefined)?.node
    return v || undefined
  } catch {
    return undefined
  }
}

/**
 * 端口是否已有服务。
 * 用 node:http 而非浏览器 fetch：Obsidian 渲染进程的 CSP 会拦截
 * 对 http://127.0.0.1 的 fetch，导致"已有服务"误判为"没有"。
 * Node 的 http 模块不受页面 CSP 约束。
 */
export function isPortUp(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/', timeout: timeoutMs }, (res) => {
      res.resume()
      resolve(true)
    })
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.on('error', () => resolve(false))
  })
}

/** 轮询等待 HTTP 就绪；超时返回 false */
export async function waitForReady(host: string, port: number, timeoutMs = 120_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (await isPortUp(host, port, 1500)) return true
    if (Date.now() > deadline) return false
    await new Promise((r) => setTimeout(r, 500))
  }
}

// ---------------------------------------------------------------------------
// 启动 / 停止
// ---------------------------------------------------------------------------

export interface LaunchedServer {
  proc: ChildProcess
  url: string
  /** true = 端口上已有服务，未新起进程 */
  attached: boolean
}

/**
 * per-vault 模式下的"配置共享"：把 per-vault DSH_HOME 的模型/密钥/主题配置
 * 指回共享 `~/.dsh`，只隔离会话数据。
 *
 * 原理：dsh 的 `settings`（@deepseek-ai/dsh-settings-file）与 `credentials`
 * （@deepseek-ai/dsh-credentials-local）插件都支持 `path` 覆盖，默认路径是
 * `<dshHome>/settings.yaml` / `<dshHome>/.credentials.yaml`。通过在 per-vault
 * profile 的 `cordis.patch.yml` 里把这两个插件指向共享根的文件，模型选择、
 * API 密钥、主题等配一次（在任意 vault 的 DSH 面板或直接改 ~/.dsh）即可全
 * vault 生效；sessions/profiles/storages 仍留在 per-vault dshHome，会话隔离
 * 不受影响。
 *
 * 幂等：每次启动都重写为同一份内容（原子写），profile 不存在时先建目录；
 * 共享根文件缺失（从未配过 shared）也没关系，dsh 按空配置启动。
 */
export function ensureSharedConfigPatch(dshHome: string, sharedRoot: string): void {
  if (!sharedRoot || dshHome === sharedRoot) return
  try {
    const profileDir = path.join(dshHome, 'profiles', 'web')
    const patchFile = path.join(profileDir, 'cordis.patch.yml')
    const settingsPath = path.join(sharedRoot, 'settings.yaml')
    const credentialsPath = path.join(sharedRoot, '.credentials.yaml')
    const patch = `# dsh-dock 自动维护：per-vault 配置共享（模型/密钥/主题指向共享 ~/.dsh，会话仍隔离）
- update:
    - id: settings
      config:
        path: ${settingsPath}
    - id: credentials
      config:
        path: ${credentialsPath}
`
    fs.mkdirSync(profileDir, { recursive: true })
    fs.writeFileSync(patchFile, patch)
    console.info(`[dsh-host] per-vault 配置共享: settings/credentials -> ${sharedRoot}`)
  } catch (err) {
    console.warn('[dsh-host] 写入配置共享 patch 失败（将按 per-vault 独立配置启动）', err)
  }
}

/** 启动官方 dsh web。调用方负责监听 proc 的 exit/error。 */
export function launchDsh(opts: LaunchOptions & { dshBin: string; nodeBin: string; useElectronAsNode: boolean }): ChildProcess {
  const port = opts.port ?? 3080
  const host = opts.host ?? '127.0.0.1'
  const args = [opts.dshBin, 'web', '--host', host, '--port', String(port)]
  const env: NodeJS.ProcessEnv = {
    ...(opts.env ?? process.env ?? {}),
    DSH_HOME: opts.dshHome,
  }
  if (opts.useElectronAsNode) env.ELECTRON_RUN_AS_NODE = '1'
  console.info(`[dsh-host] spawn ${opts.nodeBin} ${args.join(' ')}`)
  console.info(`[dsh-host] DSH_HOME=${opts.dshHome}`)
  return spawn(opts.nodeBin, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

/**
 * 一键"确保运行"：
 * 1. 端口已有服务 → 直接挂接（attached，不新起进程）；
 * 2. 否则定位 dsh → 选择 Node → spawn → 等待就绪；
 * 3. 子进程秒退（如端口被占 EADDRINUSE）→ 立即返回真实错误，不再盲等。
 * 返回 ServerStatus。
 */
export async function ensureDshRunning(opts: LaunchOptions): Promise<{ status: ServerStatus; proc?: ChildProcess }> {
  const port = opts.port ?? 3080
  const host = opts.host ?? '127.0.0.1'
  const url = `http://${host}:${port}/`

  if (await isPortUp(host, port)) {
    return { status: { kind: 'running', port, host, url, attached: true } }
  }

  const found = resolveDshBin(opts.dshBin)
  if (!found.bin) {
    return { status: { kind: 'error', message: found.notes[found.notes.length - 1] ?? '无法定位 dsh CLI' } }
  }
  const node = resolveNodeBin(opts.nodeBin, embeddedNodeVersion(), opts.useEmbeddedNode)
  if (!node.nodeBin) {
    return { status: { kind: 'error', message: node.notes[node.notes.length - 1] ?? '无法定位 Node 运行时' } }
  }
  // per-vault 配置共享：spawn 前把 settings/credentials 指回共享根（仅 per-vault 模式传入）。
  if (opts.sharedConfigRoot) {
    ensureSharedConfigPatch(opts.dshHome, opts.sharedConfigRoot)
  }
  const proc = launchDsh({ ...opts, dshBin: found.bin, nodeBin: node.nodeBin, useElectronAsNode: node.useElectronAsNode })

  // 收集 stderr 尾部：子进程秒退时给出真实原因（如 EADDRINUSE）
  let stderrTail = ''
  proc.stderr?.on('data', (d: Buffer) => {
    stderrTail = (stderrTail + d.toString()).slice(-4000)
  })

  const childDied = new Promise<boolean>((resolve) => {
    proc.once('exit', () => resolve(true))
    proc.once('error', () => resolve(true))
  })

  const ready = await Promise.race([
    waitForReady(host, port, opts.timeoutMs ?? 120_000).then(() => true),
    childDied.then(() => false),
  ])

  if (ready) {
    return { status: { kind: 'running', port, host, url, attached: false }, proc }
  }

  // 子进程已退出：再探一次端口（可能被别的实例抢跑绑定），否则给出真实错误
  if (await isPortUp(host, port)) {
    return { status: { kind: 'running', port, host, url, attached: true }, proc }
  }
  return { status: { kind: 'error', message: summarizeChildError(stderrTail) }, proc }
}

/** 从 stderr 尾部提炼可读错误 */
function summarizeChildError(stderrTail: string): string {
  const lines = stderrTail.split(/\r?\n/).filter(Boolean)
  const addrLine = lines.find((l) => l.includes('EADDRINUSE'))
  const errLine = lines.find((l) => l.includes('Error:'))
  if (addrLine) {
    return '端口已被占用（EADDRINUSE）。请换一个端口，或先停掉占用该端口的服务后重试'
  }
  if (errLine) {
    const cleaned = errLine.trim().slice(0, 300)
    return `dsh 启动失败: ${cleaned}`
  }
  return 'DSH 进程退出（无详细错误）。请查看 Obsidian 控制台 [dsh] 日志'
}

/** 停止子进程（SIGTERM，等待退出；超时后 SIGKILL） */
export function stopProcess(proc: ChildProcess | null | undefined, timeoutMs = 5000): Promise<void> {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL')
      } catch {
        /* ignore */
      }
    }, timeoutMs)
    proc.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    try {
      proc.kill('SIGTERM')
    } catch {
      clearTimeout(timer)
      resolve()
    }
  })
}
