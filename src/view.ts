/**
 * DshWebView —— 把官方 DSH Web (127.0.0.1:<port>) 停靠进 Obsidian 面板。
 * 带完整过程状态：加载动画 / 错误卡片（含重试）/ 未启动空状态。
 * iframe 指向官方服务，UI 只是"船坞"外壳；工具栏动作走 Obsidian 原生
 * 标题栏（ItemView.addAction）与右键菜单（onPaneMenu）。
 */

import { ItemView, WorkspaceLeaf, setIcon, type Menu } from 'obsidian'
import type DshDockPlugin from './main'

export const DSH_WEB_VIEW_TYPE = 'dsh-dock-web'

type UiState = 'running' | 'starting' | 'error' | 'stopped'

export class DshWebView extends ItemView {
  private iframeEl: HTMLIFrameElement | null = null
  private pillEl: HTMLElement | null = null
  private overlayEl: HTMLElement | null = null
  /** 标题栏"启动/停止"动作按钮（addAction 返回的元素，图标随状态切换） */
  private toggleActionEl: HTMLElement | null = null
  private current: UiState = 'stopped'

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: DshDockPlugin,
  ) {
    super(leaf)
  }

  override getViewType(): string {
    return DSH_WEB_VIEW_TYPE
  }

  override getDisplayText(): string {
    return 'DSH Dock'
  }

  override getIcon(): string {
    return 'anchor'
  }

  override async onOpen(): Promise<void> {
    const root = this.contentEl.createDiv({ cls: 'dsh-dock' })

    // ---- 头部：仅保留 logo + 标题 + 状态 pill（动作全部走标题栏/右键菜单） ----
    const header = root.createDiv({ cls: 'dsh-dock-header' })
    const logo = header.createDiv({ cls: 'dsh-dock-logo' })
    setIcon(logo, 'anchor')
    header.createSpan({ cls: 'dsh-dock-title', text: 'DSH Dock' })
    this.pillEl = header.createSpan({ cls: 'dsh-dock-pill' })
    header.createDiv({ cls: 'dsh-dock-spacer' })

    // D5：工具栏动作进 Obsidian 原生标题栏（ItemView.addAction, obsidian.d.ts:3604），
    // 多面板自动获得；addAction 返回按钮元素，启动/停止图标随状态切换。
    this.toggleActionEl = this.addAction('play', '启动', () => void this.onToggle())
    this.addAction('refresh-cw', '刷新', () => this.reload())
    this.addAction('maximize-2', '弹出独立窗口（独立进程，性能等同浏览器）', () => void this.plugin.openPopout())
    this.addAction('external-link', '在系统浏览器中打开', () => void this.plugin.openInBrowser())

    // ---- 主体：iframe + 状态覆盖层 ----
    const body = root.createDiv({ cls: 'dsh-dock-body' })
    // D4：显式 sandbox 白名单（allow-scripts + allow-same-origin 供 SPA 用
    // localStorage，allow-forms/modals/popups 覆盖登录/弹窗场景；仅回环可信
    // 服务，但显式声明是规范要求，Custom Frames 同款）。
    this.iframeEl = body.createEl('iframe', {
      cls: 'dsh-dock-frame',
      attr: { sandbox: 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups' },
    })
    this.overlayEl = body.createDiv({ cls: 'dsh-dock-overlay' })

    // 状态联动
    this.plugin.onStatusChange(() => this.refresh())
    this.refresh()

    // 兜底：打开面板时若服务未启动且端口可用，尝试拉起
    void this.ensureStarted()

    // 打开面板时刷新一次当前 vault 标记：用户此刻正打开 DSH 面板的窗口
    // 就是"当前 vault"，无需等 focus/active-leaf-change 事件。
    this.plugin.refreshCurrentVaultMarker()
  }

  override onClose(): Promise<void> {
    return Promise.resolve()
  }

  /** D5：右键菜单（View.onPaneMenu, obsidian.d.ts:7709）——多面板/标签头右键自动获得 */
  override onPaneMenu(menu: Menu, _source: 'more-options' | 'tab-header' | string): void {
    menu.addItem((item) =>
      item
        .setTitle(this.current === 'running' || this.current === 'starting' ? '停止 DSH 服务' : '启动 DSH 服务')
        .setIcon(this.current === 'running' || this.current === 'starting' ? 'square' : 'play')
        .onClick(() => void this.onToggle()),
    )
    menu.addItem((item) => item.setTitle('刷新').setIcon('refresh-cw').onClick(() => this.reload()))
    menu.addItem((item) =>
      item.setTitle('弹出独立窗口').setIcon('maximize-2').onClick(() => void this.plugin.openPopout()),
    )
    menu.addItem((item) =>
      item.setTitle('在系统浏览器中打开').setIcon('external-link').onClick(() => void this.plugin.openInBrowser()),
    )
  }

  private async onToggle(): Promise<void> {
    const s = this.plugin.getStatus()
    if (s.kind === 'running' || s.kind === 'starting') {
      await this.plugin.stop()
    } else {
      await this.plugin.start()
    }
    this.refresh()
  }

  /** 面板打开时确保服务在跑（已在跑则挂接） */
  private async ensureStarted(): Promise<void> {
    const s = this.plugin.getStatus()
    if (s.kind === 'stopped' || s.kind === 'error') {
      await this.plugin.start()
      this.refresh()
    }
  }

  private refresh(): void {
    const s = this.plugin.getStatus()
    let ui: UiState
    let pillText = ''
    let pillCls = ''

    if (s.kind === 'running') {
      ui = 'running'
      pillText = `● ${s.port}${s.attached ? ' · 挂接已有服务' : ''}`
      pillCls = 'is-running'
    } else if (s.kind === 'starting') {
      ui = 'starting'
      pillText = '◌ 启动中…'
      pillCls = 'is-starting'
    } else if (s.kind === 'error') {
      ui = 'error'
      pillText = '✕ 启动失败'
      pillCls = 'is-error'
    } else {
      ui = 'stopped'
      pillText = '○ 未运行'
      pillCls = 'is-stopped'
    }

    this.current = ui
    if (this.pillEl) {
      this.pillEl.setText(pillText)
      this.pillEl.className = `dsh-dock-pill ${pillCls}`
    }
    // 标题栏动作按钮图标随状态切换（addAction 返回的元素可被 setIcon 重绘）
    const running = s.kind === 'running' || s.kind === 'starting'
    if (this.toggleActionEl) {
      this.toggleActionEl.empty()
      setIcon(this.toggleActionEl, running ? 'square' : 'play')
      this.toggleActionEl.title = running ? '停止' : '启动'
      this.toggleActionEl.setAttribute('aria-label', running ? '停止' : '启动')
    }

    // iframe 与覆盖层
    if (ui === 'running') {
      if (this.iframeEl && this.iframeEl.src !== this.plugin.baseUrl) {
        this.iframeEl.src = this.plugin.baseUrl
      }
      this.showOverlay(null)
    } else if (ui === 'starting') {
      this.showOverlay(this.renderStarting())
    } else if (ui === 'error') {
      this.showOverlay(this.renderError(s.kind === 'error' ? s.message : '未知错误'))
    } else {
      this.showOverlay(this.renderStopped())
    }
  }

  // ---------- 覆盖层渲染 ----------

  private showOverlay(content: HTMLElement | null): void {
    if (!this.overlayEl) return
    this.overlayEl.empty()
    if (content) {
      this.overlayEl.appendChild(content)
      this.overlayEl.removeAttribute('hidden')
    } else {
      // 运行中：显式隐藏覆盖层（否则空的绝对定位层会挡住 iframe）
      this.overlayEl.setAttribute('hidden', '')
    }
  }

  private renderStarting(): HTMLElement {
    const box = createDiv({ cls: 'dsh-dock-state' })
    box.createDiv({ cls: 'dsh-dock-spinner' })
    box.createDiv({ cls: 'dsh-dock-state-title', text: '正在启动官方 DSH Web…' })
    box.createDiv({
      cls: 'dsh-dock-state-sub',
      text: '首次启动需初始化 profile（约 10 秒）；端口被占用时将自动挂接已有服务',
    })
    return box
  }

  private renderError(message: string): HTMLElement {
    const box = createDiv({ cls: 'dsh-dock-state' })
    const icon = box.createDiv({ cls: 'dsh-dock-state-icon' })
    setIcon(icon, 'alert-triangle')
    box.createDiv({ cls: 'dsh-dock-state-title', text: 'DSH 启动失败' })
    box.createDiv({ cls: 'dsh-dock-state-msg', text: message })
    const retry = box.createEl('button', { cls: 'dsh-dock-state-btn', text: '重试' })
    retry.onclick = () => {
      void this.plugin.start().then(() => this.refresh())
    }
    return box
  }

  private renderStopped(): HTMLElement {
    const box = createDiv({ cls: 'dsh-dock-state' })
    const icon = box.createDiv({ cls: 'dsh-dock-state-icon' })
    setIcon(icon, 'anchor')
    box.createDiv({ cls: 'dsh-dock-state-title', text: 'DSH 未运行' })
    box.createDiv({ cls: 'dsh-dock-state-sub', text: '点击启动，把官方 DeepSeek Harness 停靠进来' })
    const start = box.createEl('button', { cls: 'dsh-dock-state-btn mod-cta', text: '启动 DSH' })
    start.onclick = () => {
      void this.plugin.start().then(() => this.refresh())
    }
    return box
  }

  private reload(): void {
    if (this.iframeEl && this.current === 'running') {
      this.iframeEl.src = this.plugin.baseUrl
    }
  }
}
