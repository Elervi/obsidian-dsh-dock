/**
 * currentVault.ts —— 把"当前焦点 vault"跨进程告诉 DSH 侧。
 *
 * dsh-dock 跑在 Obsidian 进程里，能拿到最权威的当前 vault（窗口获得焦点时，
 * `app.vault.getName()` + `adapter.getBasePath()`）。DSH 的工具插件
 * dsh-tool-obsidian-vault 跑在独立 node 进程里，两者通过一个标记文件解耦通信：
 *
 *   <homedir>/.dsh/current-vault.json   { name, path, updatedAt }
 *
 * - 位置固定在 `~/.dsh`（与 dsh-dock 的 DSH_HOME 三档模式无关），任何模式
 *   下 DSH 侧都读得到；
 * - 多窗口场景：每个 Obsidian 窗口（主窗口 / popout）都是独立渲染进程，各
 *   自监听自己的 window focus —— 最后获得焦点的窗口写入，正是"用户当前正
 *   在看的 vault"；
 * - 失败静默：写不进（权限/磁盘）只 console.warn，绝不打断插件主流程；
 *   文件损坏/缺失时 DSH 侧回退原有信号，向后兼容不装 dsh-dock 的场景。
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/** 标记文件固定位置：~/.dsh/current-vault.json */
export function currentVaultMarkerPath(): string {
  return path.join(os.homedir(), '.dsh', 'current-vault.json')
}

/** 标记文件内容（DSH 侧只读 name/path，updatedAt 供诊断） */
export interface CurrentVaultMarker {
  name: string
  path: string
  updatedAt: number
}

/**
 * 原子写入标记文件：先写同目录 .tmp 再 rename，避免 DSH 侧读到半截内容。
 * 失败只告警，不抛。
 */
export function writeCurrentVaultMarker(name: string, vaultPath: string): void {
  try {
    const file = currentVaultMarkerPath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const payload: CurrentVaultMarker = { name, path: vaultPath, updatedAt: Date.now() }
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2))
    fs.renameSync(tmp, file)
  } catch (err) {
    console.warn('[dsh-dock] 写入 current-vault 标记失败', err)
  }
}

/** 从 Obsidian app 取当前 vault 名与根路径；取不到返回 null */
export function currentVaultInfo(app: {
  vault: { getName(): string; adapter: unknown }
}): { name: string; path: string } | null {
  try {
    // getBasePath 不在 obsidian 的类型定义里（运行时 DataAdapter 才有），
    // 所以这里把 adapter 当 unknown 处理再断言。
    const base = (app.vault.adapter as { getBasePath?: () => string }).getBasePath?.()
    if (!base) return null
    return { name: app.vault.getName(), path: base }
  } catch {
    return null
  }
}
