/**
 * DshDockPlugin —— Obsidian 侧生命周期管理。
 *
 * onload: 加载设置 → 注册视图/命令/状态栏/设置页 → （autostart 时）启动 DSH。
 * 启动: launcher.ensureDshRunning()（端口占用则挂接已有服务）。
 * 卸载: SIGTERM 子进程。
 */

import { Plugin, Notice, WorkspaceLeaf } from 'obsidian'
import type { ChildProcess } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import {
  embeddedNodeVersion,
  ensureDshRunning,
  resolveDshBin,
  resolveNodeBin,
  safeVaultName,
  stableHash,
  stopProcess,
  type ServerStatus,
} from './launcher'
import { DshDockSettingsTab, DEFAULT_SETTINGS, type DshDockSettings } from './settings'
import { DshWebView, DSH_WEB_VIEW_TYPE } from './view'
import { currentVaultInfo, writeCurrentVaultMarker } from './currentVault'

/**
 * 计算 DSH_HOME：
 * - shared（默认）：~/.dsh —— 与官方 dsh CLI 完全一致，复用已有配置/会话；
 * - per-vault：~/.dsh/vaults/<可读名>-<hash6> —— 每 vault 独立（hash 消歧，中文名不碰撞）；
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

export default class DshDockPlugin extends Plugin {
  settings: DshDockSettings = DEFAULT_SETTINGS
  private proc: ChildProcess | null = null
  private status: ServerStatus = { kind: 'stopped' }
  private starting = false
  private statusBarEl: HTMLElement | null = null
  private statusListeners = new Set<() => void>()
  /** 标记文件写入防抖 timer（窗口 focus 可能高频触发） */
  private markerTimer: ReturnType<typeof setTimeout> | null = null

  // ------------------------------------------------------------------ 生命周期

  override async onload(): Promise<void> {
    await this.loadSettings()

    this.registerView(DSH_WEB_VIEW_TYPE, (leaf) => new DshWebView(leaf, this))

    // 把"当前焦点 vault"跨进程告诉 DSH 侧：本窗口打开（onload）与每次获得
    // 焦点时刷新标记文件。多窗口场景下每个窗口都独立加载本插件，最后获得
    // 焦点的窗口写入，即"用户当前正在看的 vault"。
    this.refreshCurrentVaultMarker()
    const onWindowFocus = () => this.refreshCurrentVaultMarker()
    window.addEventListener('focus', onWindowFocus)
    this.register(() => window.removeEventListener('focus', onWindowFocus))
    // 补充信号：用户在窗口内切换文件/布局必然触发 active-leaf-change，
    // 覆盖 window focus 事件不派发的场景。防抖共用一个 timer，互不干扰。
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.refreshCurrentVaultMarker()))

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

    this.statusBarEl = this.addStatusBarItem()
    this.renderStatusBar()
    this.addSettingTab(new DshDockSettingsTab(this.app, this))

    if (this.settings.autostart) {
      void this.start()
    } else {
      this.setStatus({ kind: 'stopped' })
    }
  }

  override async onunload(): Promise<void> {
    await this.stop()
    this.statusListeners.clear()
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

  /** 当前 vault 根目录（无则 undefined） */
  private vaultRoot(): string | undefined {
    return (this.app.vault.adapter as { getBasePath?: () => string }).getBasePath?.()
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

  /** 读取当前 vault 并写标记文件（防抖 300ms，避免 focus 高频触发反复写盘） */
  refreshCurrentVaultMarker(): void {
    if (this.markerTimer) clearTimeout(this.markerTimer)
    this.markerTimer = setTimeout(() => {
      this.markerTimer = null
      const info = currentVaultInfo(this.app)
      if (info) writeCurrentVaultMarker(info.name, info.path)
    }, 300)
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
      const vaultInfo = currentVaultInfo(this.app)
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port,
        host: this.settings.host,
        dshHome,
        useEmbeddedNode: this.settings.useEmbeddedNode,
        // 启动时把当前 vault 一并注入子进程 env，作为标记文件之外的第二通道
        // （服务刚拉起、标记尚未刷新时兜底）。
        env: vaultInfo
          ? {
              DSH_OBSIDIAN_VAULT_NAME: vaultInfo.name,
              DSH_OBSIDIAN_VAULT_PATH: vaultInfo.path,
            }
          : {},
      })
      this.proc = result.proc ?? null
      if (result.status.kind === 'running' && result.proc) {
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
    this.setStatus({ kind: 'stopped' })
  }

  private hookChildLogs(proc: ChildProcess): void {
    proc.stdout?.on('data', (d: Buffer) => console.info('[dsh]', d.toString().trimEnd()))
    proc.stderr?.on('data', (d: Buffer) => console.warn('[dsh]', d.toString().trimEnd()))
    proc.once('exit', (code, signal) => {
      if (this.proc === proc) {
        this.proc = null
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

  private async loadSettings(): Promise<void> {
    const data = await this.loadData()
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {})
    // 旧版（dsh-host V0.1）设置迁移：dshHome 字符串 → custom 模式
    const legacy = data as { dshHome?: string } | undefined
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
      leaf = workspace.getRightLeaf(false)
      if (!leaf) return
      await leaf.setViewState({ type: DSH_WEB_VIEW_TYPE, active: true })
    }
    workspace.setActiveLeaf(leaf)
  }

  async openInBrowser(): Promise<void> {
    const { shell } = require('electron') as { shell: { openExternal(url: string): Promise<void> } }
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
