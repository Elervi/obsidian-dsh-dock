/**
 * DshDockPlugin —— Obsidian 侧生命周期管理。
 *
 * onload: 加载设置 → 注册视图/命令/状态栏/设置页 → （autostart 时）启动 DSH。
 * 启动: launcher.ensureDshRunning()（端口占用则挂接已有服务）。
 * 卸载: SIGTERM 子进程。
 */

import { Plugin, Notice, WorkspaceLeaf, requestUrl, FileSystemAdapter } from 'obsidian'
import { shell } from 'electron'
import { randomBytes } from 'crypto'
import type { ChildProcess } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import {
  embeddedNodeVersion,
  ensureDshRunning,
  removeDshPidFile,
  resolveDshBin,
  resolveNodeBin,
  safeVaultName,
  stableHash,
  stopProcess,
  sweepOrphanDsh,
  writeDshPidFile,
  type ServerStatus,
} from './launcher'
import { DshDockSettingsTab, DEFAULT_SETTINGS, type DshDockSettings } from './settings'
import { DshWebView, DSH_WEB_VIEW_TYPE } from './view'
import { currentVaultInfo, writeCurrentVaultMarker } from './currentVault'
import { createBridgeServer, BridgeError, type BridgeServerHandle } from './bridgeServer'
import { ObsidianBridgeService } from './obsidianService'

/**
 * Obsidian API 桥端口基准（per-vault 派生，与 dsh web 端口域不相交）：
 * dsh web 在 settings.port(默认 3080) + hash%4096 → 3080–7175；
 * 桥在 18080 + hash%4096 → 18080–22175，绝无重叠。
 */
export const BRIDGE_PORT_BASE = 18080

/** 计算本 vault 的桥端口（per-vault 哈希派生，与 dsh web 端口各自独立） */
export function computeBridgePort(vaultRoot: string | undefined): number {
  if (vaultRoot) {
    const offset = parseInt(stableHash(`${vaultRoot}:bridge`), 36) % 4096
    return BRIDGE_PORT_BASE + offset
  }
  return BRIDGE_PORT_BASE
}

/**
 * 计算 DSH_HOME：
 * - per-vault（默认）：~/.dsh/vaults/<可读名>-<hash6> —— 每 vault 独立（hash 消歧，中文名不碰撞）；
 * - shared：~/.dsh —— 与官方 dsh CLI 完全一致，复用已有配置/会话；
 * - custom：用户填写的绝对路径。
 */
export function computeDshHome(s: Pick<DshDockSettings, 'dshHomeMode' | 'dshHome'>, vaultRoot: string | undefined): string {
  const home = os.homedir()
  if (s.dshHomeMode === 'custom') {
    return s.dshHome.trim() || path.join(home, '.dsh')
  }
  if (s.dshHomeMode === 'per-vault') {
    const name = vaultRoot ? `${safeVaultName(vaultRoot)}-${stableHash(vaultRoot)}` : 'vault'
    return path.join(home, '.dsh', 'vaults', name)
  }
  return path.join(home, '.dsh')
}

/**
 * 计算本 vault 的监听端口。
 * - shared / custom：settings.port（默认 3080）—— 所有 vault 共用同一服务与会话；
 * - per-vault：settings.port + (stableHash % 4096) —— 每个 vault 独占端口，各自
 *   spawn 独立的 dsh 进程；配合独立的 DSH_HOME（会话存储根），不同 vault 的
 *   会话完全隔离，互不可见。端口冲突概率 ~1/4096，可接受。
 */
export function computePort(s: Pick<DshDockSettings, 'dshHomeMode' | 'port'>, vaultRoot: string | undefined): number {
  if (s.dshHomeMode === 'per-vault' && vaultRoot) {
    const offset = parseInt(stableHash(vaultRoot), 36) % 4096
    return s.port + offset
  }
  return s.port
}

/**
 * per-vault 模式下的共享配置根（模型/密钥/主题共用一份，只隔离会话）。
 * - shared：dshHome 自身即配置根，无需共享层；
 * - custom：用户指定路径即配置根，无需共享层；
 * - per-vault：返回共享 `~/.dsh`，让每个 vault 的 settings/credentials
 *   指回它 —— 配一次全 vault 生效。
 */
export function computeSharedConfigRoot(s: Pick<DshDockSettings, 'dshHomeMode'>, vaultRoot: string | undefined): string | undefined {
  if (s.dshHomeMode === 'per-vault' && vaultRoot) {
    return path.join(os.homedir(), '.dsh')
  }
  return undefined
}

export default class DshDockPlugin extends Plugin {
  settings: DshDockSettings = DEFAULT_SETTINGS
  private proc: ChildProcess | null = null
  private status: ServerStatus = { kind: 'stopped' }
  private starting = false
  private statusBarEl: HTMLElement | null = null
  private statusListeners = new Set<() => void>()
  /** 标记文件写入防抖 timer（窗口 focus 可能高频触发） */
  private markerTimer: number | null = null
  /**
   * Obsidian API 桥（B1）：本窗口的 Obsidian 渲染进程内 HTTP 服务，把
   * app.vault / metadataCache / fileManager 的官方解析结果暴露给 DSH 侧
   * 工具插件。token 每次插件加载重新生成，经 env + 标记文件两个通道注入。
   */
  private bridge: BridgeServerHandle | null = null
  private readonly bridgeToken = randomBytes(24).toString('base64url')

  /** 桥的访问地址（运行中才有值） */
  get bridgeUrl(): string | null {
    return this.bridge ? `http://${this.settings.host}:${this.bridge.port}` : null
  }

  // ------------------------------------------------------------------ 生命周期

  override async onload(): Promise<void> {
    await this.loadSettings()

    this.registerView(DSH_WEB_VIEW_TYPE, (leaf) => new DshWebView(leaf, this))

    // 把"当前焦点 vault + 当前笔记"跨进程告诉 DSH 侧：本窗口打开（onload）与
    // 每次获得焦点时刷新标记文件。多窗口场景下每个窗口都独立加载本插件，
    // 最后获得焦点的窗口写入，即"用户当前正在看的 vault"。
    this.refreshCurrentVaultMarker()
    // D2：registerDomEvent 取代手工 addEventListener + register()，
    // 类型安全、卸载自动清理（Component.registerDomEvent, obsidian.d.ts:1892）。
    this.registerDomEvent(window, 'focus', () => this.refreshCurrentVaultMarker())
    // 补充信号：光标切换文件（file-open）、新窗口/弹窗打开（window-open）、
    // 布局/活动叶子变化（active-leaf-change）都刷一次 —— 覆盖 window focus
    // 不派发的场景；防抖共用一个 timer，互不干扰。事件版本门槛：
    // active-leaf-change/file-open 0.10.9+，window-open 0.15.3+，均 ≤ minAppVersion。
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.refreshCurrentVaultMarker()))
    this.registerEvent(this.app.workspace.on('file-open', () => this.refreshCurrentVaultMarker()))
    this.registerEvent(this.app.workspace.on('window-open', () => this.refreshCurrentVaultMarker()))

    // B1：Obsidian API 桥 —— 与 dsh web 服务独立，插件加载即起（不依赖 DSH 启动）。
    // 桥故障不阻塞插件主流程（工具侧自动回退文件模式），只记日志/提示。
    if (this.settings.bridgeEnabled) {
      void this.startBridge()
    }

    this.addRibbonIcon('bot', 'DSH Dock：打开面板', () => void this.openPanel())
    this.addCommand({
      id: 'open-dsh-panel',
      name: '打开 DSH 面板',
      callback: () => void this.openPanel(),
    })
    this.addCommand({
      id: 'start-dsh',
      name: '启动 DSH 服务',
      callback: () => void this.start(),
    })
    this.addCommand({
      id: 'stop-dsh',
      name: '停止 DSH 服务',
      callback: () => void this.stop(),
    })
    this.addCommand({
      id: 'open-dsh-browser',
      name: '在系统浏览器中打开 DSH',
      callback: () => void this.openInBrowser(),
    })

    // D6：注册 obsidian://dsh-dock 协议入口（Plugin.registerObsidianProtocolHandler,
    // obsidian.d.ts:5028）。DSH Web 侧/外部自动化可用
    // `obsidian://dsh-dock?action=open` 一键唤起面板 —— 配合品牌校验，
    // 「从浏览器回到 Obsidian」闭环。
    this.registerObsidianProtocolHandler('dsh-dock', (data) => {
      if (data.action === 'open') void this.openPanel()
    })

    // D7：退出前 flush。`workspace.on('quit')`（0.10.2+，Obsidian 尽力调用，
    // 不保证执行）里 await 停服务 + 落盘标记，补上 onunload 里
    // `void this.stop()` 不等结果的缺口（强退时 PID 文件/标记文件可能没落盘）。
    this.registerEvent(
      this.app.workspace.on('quit', async () => {
        await this.stop()
        this.refreshCurrentVaultMarker()
      }),
    )

    this.statusBarEl = this.addStatusBarItem()
    this.renderStatusBar()
    this.addSettingTab(new DshDockSettingsTab(this.app, this))

    if (this.settings.autostart) {
      void this.start()
    } else {
      this.setStatus({ kind: 'stopped' })
    }
  }

  override onunload(): void {
    void this.stop()
    void this.stopBridge()
    this.statusListeners.clear()
  }

  /**
   * D7：首次"用户手动启用"时只跑一次的钩子（Plugin.onUserEnable,
   * obsidian.d.ts:5073，Obsidian 1.7.2+ 调用；旧版本忽略该钩子，插件照常工作，
   * 因此无需抬 minAppVersion）。只做引导提示，不做任何初始化。
   */
  override onUserEnable(): void {
    new Notice('DSH Dock 已启用：点击左侧栏机器人图标打开 DSH 面板，或执行 obsidian://dsh-dock?action=open')
  }

  // ------------------------------------------------------------------ 状态

  getStatus(): ServerStatus {
    return this.status
  }

  get childProc(): ChildProcess | null {
    return this.proc
  }

  get baseUrl(): string {
    const vaultRoot = this.vaultRoot()
    const port = computePort(this.settings, vaultRoot)
    return `http://${this.settings.host}:${port}/`
  }

  /** 当前 vault 根目录（无则 undefined）。D1：instanceof 取代强转，类型安全 */
  private vaultRoot(): string | undefined {
    const adapter = this.app.vault.adapter
    return adapter instanceof FileSystemAdapter ? adapter.getBasePath() : undefined
  }

  onStatusChange(fn: () => void): () => void {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  private setStatus(status: ServerStatus): void {
    this.status = status
    this.renderStatusBar()
    for (const fn of this.statusListeners) {
      try {
        fn()
      } catch {
        /* ignore */
      }
    }
  }

  private renderStatusBar(): void {
    if (!this.statusBarEl) return
    const s = this.status
    if (s.kind === 'running') {
      this.statusBarEl.setText(`DSH: ${s.port}${s.attached ? '（挂接已有服务）' : ''}`)
      this.statusBarEl.addClass('is-running')
      this.statusBarEl.removeClass('is-stopped')
    } else if (s.kind === 'error') {
      this.statusBarEl.setText('DSH: 启动失败')
      this.statusBarEl.removeClass('is-running')
      this.statusBarEl.addClass('is-stopped')
    } else if (s.kind === 'starting') {
      this.statusBarEl.setText('DSH: 启动中…')
      this.statusBarEl.removeClass('is-running')
      this.statusBarEl.addClass('is-stopped')
    } else {
      this.statusBarEl.setText('DSH: 未运行')
      this.statusBarEl.removeClass('is-running')
      this.statusBarEl.addClass('is-stopped')
    }
  }

  // ------------------------------------------------------------------ 当前 vault 标记

  /** 读取当前 vault（含当前打开的笔记）并写标记文件（防抖 300ms，避免 focus 高频触发反复写盘） */
  refreshCurrentVaultMarker(): void {
    if (this.markerTimer) window.clearTimeout(this.markerTimer)
    this.markerTimer = window.setTimeout(() => {
      this.markerTimer = null
      const info = currentVaultInfo(this.app)
      if (info) {
        const bridge = this.bridgeUrl ? { url: this.bridgeUrl, token: this.bridgeToken } : undefined
        writeCurrentVaultMarker(info.name, info.path, info.activeFile, bridge)
      }
    }, 300)
  }

  // ------------------------------------------------------------------ Obsidian API 桥

  /** 启动本窗口的 Obsidian API 桥（127.0.0.1，token 鉴权）；失败静默降级（工具回退文件模式） */
  async startBridge(): Promise<void> {
    if (this.bridge) return
    try {
      const vaultRoot = this.vaultRoot()
      const port = computeBridgePort(vaultRoot)
      const service = new ObsidianBridgeService(this.app, this.manifest.version)
      this.bridge = await createBridgeServer({
        host: this.settings.host,
        port,
        token: this.bridgeToken,
        service,
      })
      console.info(`[dsh-dock] Obsidian API 桥已启动: http://${this.settings.host}:${this.bridge.port}（vault: ${service.info.name}）`)
      this.refreshCurrentVaultMarker()
    } catch (err) {
      const msg = err instanceof BridgeError || err instanceof Error ? err.message : String(err)
      console.warn('[dsh-dock] Obsidian API 桥启动失败（工具将回退文件模式）', err)
      new Notice(`DSH Dock: Obsidian API 桥启动失败（${msg}）。vault_* 工具将回退到文件直读模式`)
    }
  }

  /** 停止本窗口的 Obsidian API 桥 */
  async stopBridge(): Promise<void> {
    const bridge = this.bridge
    this.bridge = null
    if (bridge) {
      try {
        await bridge.close()
      } catch (err) {
        console.warn('[dsh-dock] 关闭 Obsidian API 桥失败', err)
      }
    }
  }

  // ------------------------------------------------------------------ 启动 / 停止

  /** 端口上已有服务 → 挂接；否则 spawn 官方 dsh web */
  async start(): Promise<ServerStatus> {
    if (this.starting) return this.status
    if (this.status.kind === 'running') return this.status
    this.starting = true
    this.setStatus({ kind: 'starting' })
    try {
      const vaultRoot = this.vaultRoot()
      const dshHome = computeDshHome(this.settings, vaultRoot)
      const port = computePort(this.settings, vaultRoot)
      const sharedConfigRoot = computeSharedConfigRoot(this.settings, vaultRoot)
      const vaultInfo = currentVaultInfo(this.app)
      // 孤儿清扫：上次 Obsidian 崩溃/强退残留的本端口 dsh web 先清掉再拉起，
      // 避免"挂接孤儿"让残留永久累积（多库/多窗口并发安全，见 launcher.ts）。
      const swept = await sweepOrphanDsh(dshHome, port)
      if (swept) {
        new Notice(`DSH: 已清理上次残留的服务 (端口 ${port})`)
      }
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port,
        host: this.settings.host,
        dshHome,
        // per-vault 配置共享：模型/密钥/主题指回共享 ~/.dsh，只隔离会话。
        ...(sharedConfigRoot ? { sharedConfigRoot } : {}),
        useEmbeddedNode: this.settings.useEmbeddedNode,
        // D3：端口已有服务时做品牌特征校验 —— 是 dsh web 才挂接，否则按
        // 「端口被非 DSH 服务占用」报错，把"误挂非 DSH 服务"从偶发变成不可能。
        // requestUrl 是 Obsidian 官方 CSP 豁免的 HTTP 助手（obsidian.d.ts:5442），
        // RequestUrlParam 没有 timeout 字段，所以 1.5s 快速存活探测仍走
        // node:http（launcher.ts isPortUp），这里只做慢速响应体特征校验。
        verifyBrand: (url) => this.verifyDshBrand(url),
        // per-vault 模式：注入本服务所属库 env（第二通道）。工具插件解析时
        // 优先用本 env 识别"本服务服务的库"，cwd 保持 dsh 进程默认工作目录
        // 不变 —— cwd 与 Obsidian 库是两个独立概念，不合并。
        // B1：桥地址/token 与 vault 注入同通道（shared/custom 模式也注入，
        // 供工具侧桥优先解析；无桥时不注入，工具回退文件模式）。
        env: {
          ...(sharedConfigRoot && vaultInfo
            ? {
                DSH_OBSIDIAN_VAULT_NAME: vaultInfo.name,
                DSH_OBSIDIAN_VAULT_PATH: vaultInfo.path,
              }
            : {}),
          ...(this.bridgeUrl
            ? {
                DSH_OBSIDIAN_BRIDGE_URL: this.bridgeUrl,
                DSH_OBSIDIAN_BRIDGE_TOKEN: this.bridgeToken,
              }
            : {}),
        },
      })
      this.proc = result.proc ?? null
      if (result.status.kind === 'running' && result.proc && !result.status.attached) {
        // 新起进程：写入 PID 文件，供下次启动清扫孤儿时识别归属。
        if (result.proc.pid != null) {
          writeDshPidFile(dshHome, port, result.proc.pid)
        }
        this.hookChildLogs(result.proc)
      }
      this.setStatus(result.status)
      if (result.status.kind === 'error') {
        new Notice(`DSH 启动失败: ${result.status.message}`)
      } else if (result.status.kind === 'running' && !result.status.attached) {
        new Notice(`DSH Web 已就绪: ${result.status.url}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.setStatus({ kind: 'error', message: msg })
      new Notice(`DSH 启动异常: ${msg}`)
    } finally {
      this.starting = false
    }
    return this.status
  }

  async stop(): Promise<void> {
    this.starting = false
    if (this.proc) {
      await stopProcess(this.proc)
      this.proc = null
    }
    removeDshPidFile(computeDshHome(this.settings, this.vaultRoot()))
    this.setStatus({ kind: 'stopped' })
  }

  /**
   * D3：品牌特征校验 —— GET 服务根路径，响应体含 "DeepSeek Harness"
   * （官方 dsh web 前端 index.html 的 <title>）才认定是 dsh web。
   * requestUrl 是渲染进程里 CSP 豁免的官方 HTTP 助手（obsidian.d.ts:5442）；
   * throw: false 让 4xx/5xx 也走正常返回路径，统一按特征判断。
   */
  private async verifyDshBrand(url: string): Promise<boolean> {
    try {
      const resp = await requestUrl({ url, method: 'GET', throw: false })
      return resp.status === 200 && resp.text.includes('DeepSeek Harness')
    } catch {
      return false
    }
  }

  private hookChildLogs(proc: ChildProcess): void {
    proc.stderr?.on('data', (d: Buffer) => console.warn('[dsh]', d.toString().trimEnd()))
    proc.once('exit', (code, signal) => {
      if (this.proc === proc) {
        this.proc = null
        removeDshPidFile(computeDshHome(this.settings, this.vaultRoot()))
        if (this.status.kind === 'running' && !this.status.attached) {
          this.setStatus({ kind: 'error', message: `DSH 进程退出: code=${code} signal=${signal ?? ''}` })
        }
      }
    })
    proc.once('error', (err) => {
      console.error('[dsh-dock] 子进程错误', err)
      if (this.proc === proc) {
        this.proc = null
        this.setStatus({ kind: 'error', message: `子进程错误: ${err.message}` })
      }
    })
  }

  /** 探测信息（设置页展示） */
  detectInfo(): { dshBin: string | null; dshNotes: string[]; nodeNotes: string[] } {
    const found = resolveDshBin(this.settings.dshBin)
    const node = resolveNodeBin(this.settings.nodeBin, embeddedNodeVersion(), this.settings.useEmbeddedNode)
    return {
      dshBin: found.bin,
      dshNotes: found.notes,
      nodeNotes: node.notes,
    }
  }

  /** 当前设置下生效的 DSH_HOME（设置页展示） */
  effectiveDshHome(): string {
    return computeDshHome(this.settings, this.vaultRoot())
  }

  /** 当前设置下生效的端口（per-vault 模式每 vault 独立） */
  effectivePort(): number {
    return computePort(this.settings, this.vaultRoot())
  }

  /** 当前设置下生效的共享配置根（per-vault 模式 = ~/.dsh，其余无） */
  effectiveSharedConfigRoot(): string | undefined {
    return computeSharedConfigRoot(this.settings, this.vaultRoot())
  }

  private async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<DshDockSettings> | null
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {})
    // 旧版（dsh-host V0.1）设置迁移：dshHome 字符串 → custom 模式
    const legacy: { dshHome?: string } | null = data
    if (legacy?.dshHome && typeof legacy.dshHome === 'string' && legacy.dshHome.trim()) {
      this.settings.dshHomeMode = 'custom'
      this.settings.dshHome = legacy.dshHome.trim()
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings)
  }

  // ------------------------------------------------------------------ UI

  async openPanel(): Promise<void> {
    const { workspace } = this.app
    const leaves = workspace.getLeavesOfType(DSH_WEB_VIEW_TYPE)
    let leaf: WorkspaceLeaf | null = leaves[0] ?? null
    if (!leaf) {
      // D8：getRightLeaf(false) 在 1.13.x 的 d.ts 与官方 docs 中均无
      // @deprecated 标记（检测报告 §5.1），语义即"右侧栏叶子"，可继续用；
      // ensureSideLeaf 需 Obsidian 1.7.2+，而 minAppVersion 保持 1.5.0，
      // 不引入额外版本门槛。
      leaf = workspace.getRightLeaf(false)
      if (!leaf) return
      await leaf.setViewState({ type: DSH_WEB_VIEW_TYPE, active: true })
    }
    workspace.setActiveLeaf(leaf)
  }

  async openInBrowser(): Promise<void> {
    await shell.openExternal(this.baseUrl)
  }

  /**
   * 弹出独立窗口（Obsidian popout）：DSH 面板进入独立 BrowserWindow =
   * 独立渲染进程，与 Obsidian 主窗口隔离，性能等同浏览器标签页。
   */
  async openPopout(): Promise<void> {
    try {
      const leaf = this.app.workspace.openPopoutLeaf()
      await leaf.setViewState({ type: DSH_WEB_VIEW_TYPE, active: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      new Notice(`弹出独立窗口失败: ${msg}`)
    }
  }
}
