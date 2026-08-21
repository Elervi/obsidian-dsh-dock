/**
 * 设置：字段 + 设置页 UI。
 * V0.2：DSH_HOME 三档模式（每 vault 隔离 / 官方共享 / 自定义），默认 per-vault。
 */

import { App, PluginSettingTab, Setting } from 'obsidian'
import type DshDockPlugin from './main'

export type DshHomeMode = 'shared' | 'per-vault' | 'custom'

export interface DshDockSettings {
  /** dsh CLI 入口（bin.js 或 dsh 包目录）；留空自动探测 */
  dshBin: string
  /** Node 可执行文件；留空自动选择（系统 node 优先） */
  nodeBin: string
  /** 监听 host（默认仅本机） */
  host: string
  /** 监听端口（官方默认 3080） */
  port: number
  /** DSH_HOME 模式：per-vault=每 vault 隔离（默认）；shared=官方共享 ~/.dsh；custom=自定义 */
  dshHomeMode: DshHomeMode
  /** 自定义 DSH_HOME 路径（仅 custom 模式生效） */
  dshHome: string
  /** 允许用 ELECTRON_RUN_AS_NODE 复用 Obsidian 内置 Node（默认关：实测不可靠） */
  useEmbeddedNode: boolean
  /** Obsidian 启动时自动拉起 DSH */
  autostart: boolean
  /**
   * Obsidian API 桥（B1）：插件加载即在 127.0.0.1 起一个本地 HTTP 桥，
   * 把 vault/metadataCache/fileManager 的官方解析结果喂给 DSH 侧
   * dsh-tool-obsidian-vault 工具（桥优先、文件回退）。默认开。
   */
  bridgeEnabled: boolean
}

export const DEFAULT_SETTINGS: DshDockSettings = {
  dshBin: '',
  nodeBin: '',
  host: '127.0.0.1',
  port: 3080,
  dshHomeMode: 'per-vault',
  dshHome: '',
  useEmbeddedNode: false,
  autostart: true,
  bridgeEnabled: true,
}

export class DshDockSettingsTab extends PluginSettingTab {
  private customHomeEl?: Setting

  constructor(
    app: App,
    private plugin: DshDockPlugin,
  ) {
    super(app, plugin)
  }

  override display(): void {
    const { containerEl } = this
    containerEl.empty()

    // ---------- 概览 ----------
    containerEl.createEl('p', {
      cls: 'dsh-dock-settings-desc',
      text: '把官方 DeepSeek Harness Web 停靠进 Obsidian：定位 dsh → 子进程运行 → 面板嵌入。官方原生，官方 UI 原样嵌入。',
    })
    containerEl.createEl('p', {
      cls: 'dsh-dock-settings-desc',
      text: '🤝 与 dsh-tool-obsidian-vault 珠联璧合：配合 DSH 侧的 16 个 vault_* 工具，开箱即用「Obsidian 内 Agent 笔记工作流」——面板里直接说"读一下今天的笔记"，Agent 自动定位当前库读写。',
    })

    // ---------- 服务控制 ----------
    new Setting(containerEl).setName('服务').setHeading()
    const statusLine = new Setting(containerEl)
      .setName('服务状态')
      .setDesc(this.describeStatus())
    const btns = statusLine.controlEl.createDiv({ cls: 'dsh-dock-btns' })
    const startBtn = btns.createEl('button', { cls: 'mod-cta', text: '▶ 启动' })
    startBtn.onclick = () => {
      void this.plugin.start().then(() => this.display())
    }
    const stopBtn = btns.createEl('button', { text: '■ 停止' })
    stopBtn.onclick = () => {
      void this.plugin.stop().then(() => this.display())
    }
    const openBtn = btns.createEl('button', { text: '打开面板' })
    openBtn.onclick = () => {
      void this.plugin.openPanel()
    }

    new Setting(containerEl)
      .setName('随 Obsidian 自动启动')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.autostart).onChange(async (v) => {
          this.plugin.settings.autostart = v
          await this.plugin.saveSettings()
        }),
      )

    // ---------- Obsidian API 桥 ----------
    new Setting(containerEl).setName('Obsidian API 桥（B1）').setHeading()
    new Setting(containerEl)
      .setName('启用 API 桥')
      .setDesc(
        '插件加载即在本机 127.0.0.1 起一个 token 鉴权的 HTTP 桥，把 vault/metadataCache/fileManager 的官方解析结果喂给 DSH 侧 vault_* 工具（桥优先、文件回退）。关闭后工具回退文件直读模式。',
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.bridgeEnabled).onChange(async (v) => {
          this.plugin.settings.bridgeEnabled = v
          await this.plugin.saveSettings()
          if (v) {
            await this.plugin.startBridge()
          } else {
            await this.plugin.stopBridge()
          }
          this.bridgeLine.textContent = this.describeBridge()
        }),
      )
    this.bridgeLine = containerEl.createDiv({ cls: 'dsh-dock-detect' })

    // ---------- 运行时 ----------
    new Setting(containerEl).setName('运行时').setHeading()
    new Setting(containerEl)
      .setName('dsh CLI 路径')
      .setDesc('留空自动探测（DSH_BIN → npm root -g → 常见全局目录）。可填 dsh 包目录或 bin.js 绝对路径。')
      .addText((t) =>
        t
          .setPlaceholder('例如 /opt/homebrew/lib/node_modules/@deepseek-ai/dsh')
          .setValue(this.plugin.settings.dshBin)
          .onChange(async (v) => {
            this.plugin.settings.dshBin = v.trim()
            await this.plugin.saveSettings()
            this.detectLine.textContent = this.describeDetect()
          }),
      )
    this.detectLine = containerEl.createDiv({ cls: 'dsh-dock-detect' })

    new Setting(containerEl)
      .setName('Node 可执行文件')
      .setDesc('留空自动选择（系统 node 最稳定）。')
      .addText((t) =>
        t
          .setPlaceholder('例如 /opt/homebrew/bin/node')
          .setValue(this.plugin.settings.nodeBin)
          .onChange(async (v) => {
            this.plugin.settings.nodeBin = v.trim()
            await this.plugin.saveSettings()
            this.detectLine.textContent = this.describeDetect()
          }),
      )

    new Setting(containerEl)
      .setName('复用 Obsidian 内置 Node')
      .setDesc('ELECTRON_RUN_AS_NODE。默认关闭——实测 Obsidian 二进制以 Node 模式运行会挂起，仅在验证可用时开启。')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.useEmbeddedNode).onChange(async (v) => {
          this.plugin.settings.useEmbeddedNode = v
          await this.plugin.saveSettings()
          this.detectLine.textContent = this.describeDetect()
        }),
      )

    // ---------- 网络 ----------
    new Setting(containerEl).setName('网络').setHeading()
    new Setting(containerEl)
      .setName('监听地址')
      .setDesc('仅本机回环地址可选：官方 dsh 拒绝 --host 0.0.0.0（不支持局域网访问），非回环值没有意义。旧版遗留的自定义值会被重置为 127.0.0.1。')
      .addDropdown((dd) => {
        // 历史 data.json 可能残留自定义 host（隐藏字段时代手改的），收敛到回环
        if (this.plugin.settings.host !== '127.0.0.1' && this.plugin.settings.host !== 'localhost') {
          this.plugin.settings.host = '127.0.0.1'
          void this.plugin.saveSettings()
        }
        dd.addOption('127.0.0.1', '127.0.0.1（仅本机，默认）')
        dd.addOption('localhost', 'localhost（仅本机）')
        dd.setValue(this.plugin.settings.host)
        dd.onChange(async (v) => {
          this.plugin.settings.host = v
          await this.plugin.saveSettings()
        })
      })
    new Setting(containerEl)
      .setName('监听端口（基准）')
      .setDesc('官方默认 3080。shared/custom 模式直接使用；per-vault 模式在此基础上按 vault 派生独立端口（每 vault 独占，会话互不可见）。')
      .addText((t) =>
        t
          .setPlaceholder('3080')
          .setValue(String(this.plugin.settings.port))
          .onChange(async (v) => {
            const n = Number(v.trim())
            this.plugin.settings.port = Number.isInteger(n) && n >= 0 && n <= 65535 ? n : 3080
            await this.plugin.saveSettings()
            this.netPreview.textContent = this.describeNet()
          }),
      )
    this.netPreview = containerEl.createDiv({ cls: 'dsh-dock-detect' })

    // ---------- 数据目录 ----------
    new Setting(containerEl).setName('数据目录（DSH_HOME）与会话隔离').setHeading()
    new Setting(containerEl)
      .setName('模式')
      .setDesc('per-vault 模式 = 会话按库隔离（各库面板只显示本库创建的会话），但模型/密钥/主题配置与运行时插件全局共享一份，配一次全库生效。')
      .addDropdown((dd) => {
        dd.addOption('per-vault', '每 vault 隔离会话 ~/.dsh/vaults/<名>-<hash>（默认；配置与插件仍共享）')
        dd.addOption('shared', '官方共享 ~/.dsh（所有 vault 共用一套配置、插件与会话）')
        dd.addOption('custom', '自定义路径')
        dd.setValue(this.plugin.settings.dshHomeMode)
        dd.onChange(async (v) => {
          this.plugin.settings.dshHomeMode = v as DshHomeMode
          await this.plugin.saveSettings()
          this.customHomeEl?.setDisabled(v !== 'custom')
          this.homePreview.textContent = this.describeDshHome()
          this.netPreview.textContent = this.describeNet()
        })
      })

    this.customHomeEl = new Setting(containerEl)
      .setName('自定义 DSH_HOME 路径')
      .addText((t) =>
        t
          .setPlaceholder('例如 /Users/you/.dsh')
          .setValue(this.plugin.settings.dshHome)
          .onChange(async (v) => {
            this.plugin.settings.dshHome = v.trim()
            await this.plugin.saveSettings()
            this.homePreview.textContent = this.describeDshHome()
          }),
      )
    this.customHomeEl.setDisabled(this.plugin.settings.dshHomeMode !== 'custom')

    this.homePreview = containerEl.createDiv({ cls: 'dsh-dock-detect' })

    this.detectLine.textContent = this.describeDetect()
    this.homePreview.textContent = this.describeDshHome()
    this.netPreview.textContent = this.describeNet()
    this.bridgeLine.textContent = this.describeBridge()
  }

  private detectLine!: HTMLElement
  private homePreview!: HTMLElement
  private netPreview!: HTMLElement
  private bridgeLine!: HTMLElement

  private describeStatus(): string {
    const s = this.plugin.getStatus()
    if (s.kind === 'running') {
      return `${s.url}（${s.attached ? '挂接已有服务' : '子进程运行中'}）`
    }
    if (s.kind === 'starting') return '启动中…（首次约 10 秒，需初始化 profile）'
    if (s.kind === 'error') return `失败: ${s.message}`
    return '未运行'
  }

  private describeBridge(): string {
    const url = this.plugin.bridgeUrl
    if (!this.plugin.settings.bridgeEnabled) return '已关闭（工具回退文件直读模式）'
    return url ? `运行中: ${url}（token 鉴权，仅本机）` : '未运行（启动失败将回退文件模式）'
  }

  private describeDetect(): string {
    const info = this.plugin.detectInfo()
    return [
      `dsh: ${info.dshBin ?? '未找到'}${info.dshNotes.length ? `（${info.dshNotes.join('；')}）` : ''}`,
      `node: ${info.nodeNotes.join('；')}`,
    ].join('\n')
  }

  private describeDshHome(): string {
    const home = this.plugin.effectiveDshHome()
    const shared = this.plugin.effectiveSharedConfigRoot()
    if (shared) {
      return `会话目录: ${home}\n配置共享: ${shared}（模型/密钥/主题配一次全库生效）`
    }
    return `生效路径: ${home}`
  }

  private describeNet(): string {
    const port = this.plugin.effectivePort()
    const mode = this.plugin.settings.dshHomeMode
    const suffix = mode === 'per-vault' ? '（本 vault 独占，与其他 vault 隔离）' : '（shared/custom：所有 vault 共用）'
    return `生效端口: ${port}${suffix}`
  }
}
