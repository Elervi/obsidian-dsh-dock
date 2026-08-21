/**
 * currentVault.ts —— 把"当前焦点 vault + 当前打开的笔记"跨进程告诉 DSH 侧。
 *
 * dsh-dock 跑在 Obsidian 进程里，能拿到最权威的当前 vault（窗口获得焦点时，
 * `app.vault.getName()` + `FileSystemAdapter.getBasePath()`）与当前打开的笔记
 * （`app.workspace.getActiveFile()`）。DSH 的工具插件 dsh-tool-obsidian-vault
 * 跑在独立 node 进程里，两者通过一个标记文件解耦通信：
 *
 *   <homedir>/.dsh/current-vault.json   { name, path, activeFile?, updatedAt }
 *
 * - 位置固定在 `~/.dsh`（与 dsh-dock 的 DSH_HOME 三档模式无关），任何模式
 *   下 DSH 侧都读得到；
 * - `activeFile` 是 vault 相对路径（无 `.md` 语义，原样），只在确实有打开的
 *   笔记时写入；DSH 侧的 `vault_current`/`vault_active` 据此从"猜最近活跃库"
 *   升级为"真·当前库 + 当前笔记"；
 * - 多窗口场景：每个 Obsidian 窗口（主窗口 / popout）都是独立渲染进程，各
 *   自监听自己的 window focus —— 最后获得焦点的窗口写入，正是"用户当前正
 *   在看的 vault"；
 * - 失败静默：写不进（权限/磁盘）只 console.warn，绝不打断插件主流程；
 *   文件损坏/缺失时 DSH 侧回退原有信号，向后兼容不装 dsh-dock 的场景。
 */

import { FileSystemAdapter, type App } from 'obsidian'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/** 标记文件固定位置：~/.dsh/current-vault.json */
export function currentVaultMarkerPath(): string {
  return path.join(os.homedir(), '.dsh', 'current-vault.json')
}

/** 标记文件内容（DSH 侧只读 name/path/activeFile，updatedAt 供诊断） */
export interface CurrentVaultMarker {
  name: string
  path: string
  /** 当前打开的笔记（vault 相对路径）；无打开笔记时不写此字段 */
  activeFile?: string
  /**
   * 本窗口 Obsidian API 桥的地址与 token（桥运行时写入）。shared/custom 模式下
   * dsh web 是共享服务、env 注入只来自拉起窗口，DSH 侧凭标记文件按 vault 路径
   * 匹配到正确窗口的桥（per-vault 模式 env 已足够，标记文件是第二通道）。
   */
  bridgeUrl?: string
  bridgeToken?: string
  updatedAt: number
}

/**
 * 原子写入标记文件：先写同目录 .tmp 再 rename，避免 DSH 侧读到半截内容。
 * 失败只告警，不抛。
 */
export function writeCurrentVaultMarker(
  name: string,
  vaultPath: string,
  activeFile?: string,
  bridge?: { url: string; token: string },
): void {
  try {
    const file = currentVaultMarkerPath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const payload: CurrentVaultMarker = { name, path: vaultPath, updatedAt: Date.now() }
    if (activeFile) payload.activeFile = activeFile
    if (bridge) {
      payload.bridgeUrl = bridge.url
      payload.bridgeToken = bridge.token
    }
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2))
    fs.renameSync(tmp, file)
  } catch (err) {
    console.warn('[dsh-dock] 写入 current-vault 标记失败', err)
  }
}

/**
 * 从 Obsidian app 取当前 vault 名、根路径与当前打开的笔记；取不到返回 null。
 *
 * 用 `instanceof FileSystemAdapter`（obsidian.d.ts:2996，桌面端实现）替代
 * 旧的 `as { getBasePath?: () => string }` 强转：类型安全，且移动端
 * （CapacitorAdapter）自然返回 null。FileSystemAdapter 从官方 `obsidian`
 * 模块导入（插件的运行时宿主注入），与 dsh-dock 实际编译的 obsidian@1.13.1
 * 类型一致。
 */
export function currentVaultInfo(app: App): { name: string; path: string; activeFile?: string } | null {
  try {
    const adapter = app.vault.adapter
    if (!(adapter instanceof FileSystemAdapter)) return null
    const activeFile = app.workspace.getActiveFile()?.path
    const info: { name: string; path: string; activeFile?: string } = {
      name: app.vault.getName(),
      path: adapter.getBasePath(),
    }
    if (activeFile) info.activeFile = activeFile
    return info
  } catch {
    return null
  }
}
