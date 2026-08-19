已发布到obsidian插件市场
# DSH Dock（V0.2）

> Dock the official **DeepSeek Harness Web** (127.0.0.1:3080) into an Obsidian
> sidebar panel. Native official: runs the official `dsh` CLI and embeds the
> official UI as-is. Requires Obsidian desktop 1.5.0+ and the official `dsh` CLI
> (`npm i -g @deepseek-ai/dsh`). Pairs with
> [dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault)
> for an agent-driven note workflow.

> 把官方 **DeepSeek Harness Web**（127.0.0.1:3080）停靠进 Obsidian 侧边栏面板。
> 官方原生：直接运行官方 `dsh CLI`，官方 UI 原样嵌入，只美化插件外壳。

## About

DSH Dock docks the official DeepSeek Harness Web UI (served by the official
`dsh` CLI at 127.0.0.1:3080) into an Obsidian sidebar panel. It is a thin
shell around the official tooling: the plugin locates the installed `dsh`
binary, spawns the official `dsh web` server, and embeds the official UI in an
iframe — no reimplementation, no modification of the official interface.

### Features

- **Zero-build install** — copy 3 files (`main.js`, `manifest.json`,
  `styles.css`) into `.obsidian/plugins/dsh-dock/` and enable the plugin.
- **Native official** — runs the official `dsh` CLI and embeds the official
  UI as-is.
- **Per-vault isolation (default)** — each vault gets its own DSH_HOME and
  its own derived port, so sessions never leak across vaults, while model,
  credentials and theme config stay shared (`~/.dsh`).
- **Pairs with dsh-tool-obsidian-vault** — together they enable an
  agent-driven note workflow directly inside Obsidian.

### Install

Prerequisites: Obsidian desktop 1.5.0+, the official `dsh` CLI
(`npm i -g @deepseek-ai/dsh`), and Node.js 20+.

1. Copy `main.js`, `manifest.json` and `styles.css` from the repo root to
   `.obsidian/plugins/dsh-dock/`.
2. In Obsidian, go to Settings → Community plugins and enable **DSH Dock**.
3. Click the robot icon in the sidebar (or run the "Open DSH panel" command).

On first start the plugin initializes `$DSH_HOME` (per-vault isolation by
default) and spawns the official `dsh web`; the panel appears in a few
seconds.

### Companion tool

[dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault)
is the DSH-side tool plugin that pairs with this one: it exposes 16
`vault_*` tools (search, read, create, edit, rename, backlinks, frontmatter
and more) plus a self-contained agent preset. With both installed you can say
"read today's notes" in the DSH panel and the agent will locate and operate
on the current vault automatically.

### License

MIT

---

## ✨ 特性

- 📦 **开箱即用** — 无需构建，复制仓库根 3 个文件即装
- 🪟 **官方原生** — 定位 `dsh` → spawn 官方 `dsh web` → iframe 原样嵌入官方 UI
- 🗂️ **per-vault 隔离** — 会话按库隔离、配置全局共享，多库并行互不串扰
- 🤝 **珠联璧合** — 与 [dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault)
  联动，开箱即用「Obsidian 内 Agent 笔记工作流」

## 📦 安装（开箱即用）

> 前置：Obsidian **桌面端** 1.5.0+；官方 dsh 已安装（`npm i -g @deepseek-ai/dsh`）；
> 系统有 `node`（≥ 20 即可，会话全文搜索才需 ≥ 22.5）。

1. 把仓库根目录的 `main.js` + `manifest.json` + `styles.css` 复制到 vault 的
   `.obsidian/plugins/dsh-dock/`；
2. Obsidian：设置 → 第三方插件 → 启用 **DSH Dock**；
3. 点击侧边栏机器人图标，或运行命令「打开 DSH 面板」。

首次启动自动初始化 `$DSH_HOME`（默认 **per-vault 隔离**，会话按库独立、配置全局共享）
并拉起官方 `dsh web`，几秒内面板出现。

## ⚙️ 设置

| 设置 | 说明 |
|---|---|
| dsh CLI 路径 | 留空自动探测（`$DSH_BIN` → npm 全局 → 常见全局目录） |
| Node 可执行文件 | 留空用系统 node（最稳定） |
| 监听端口 | 默认 3080；填 0 让 OS 分配空闲端口 |
| DSH_HOME 模式 | 每库隔离 `~/.dsh/vaults/<名>-<hash6>`（默认）· 官方共享 `~/.dsh` · 自定义 |
| 随 Obsidian 自动启动 | 默认开 |

## 🔧 工作原理

```
Obsidian (Electron)
 └─ DSH Dock 插件
     ├─ 定位 dsh：设置 → $DSH_BIN → npm root -g → 常见全局目录
     ├─ 选择 Node：系统 node 最稳定（Electron 内置 Node 实测不可靠，默认关）
     ├─ 端口探测：node:http（渲染进程 CSP 会屏蔽 fetch，不能用浏览器探测）
     │   └─ 已有服务 → 直接挂接，不重复拉起
     ├─ spawn: node <dsh>/lib/bin.js web --host 127.0.0.1 --port <port>
     │         env: DSH_HOME（默认 per-vault 隔离；shared / 自定义可切换）
     ├─ 等待就绪：子进程秒退立即报真实错误（如 EADDRINUSE），不盲等 120s
     └─ iframe 面板 → http://127.0.0.1:<port>/
```

> 已验证（`@deepseek-ai/dsh@0.1.0-rc.6`）：`dsh web` 默认绑定 127.0.0.1:3080；
> 首次启动自动初始化 profile，**无需 pnpm、无需联网**；默认不开 SQLite，
> Node 20+ 即可跑默认配置。

## 🗂️ per-vault 隔离模式（默认，V0.2 核心特性）

per-vault 模式（DSH_HOME = `~/.dsh/vaults/<库名>-<hash6>`，中文名不碰撞、改名不孤儿）
是 **默认模式**，隔离边界是 **「会话隔离，配置共享」**：

| 维度 | 按库隔离 | 机制 |
|---|---|---|
| 会话 / 历史（sessions、storages） | ✅ | 每库独占 DSH_HOME 目录 |
| 监听端口 | ✅ | `settings.port + (vaultRoot hash % 4096)`，冲突概率 ~1/4096 |
| 会话 cwd / vault 识别 | ✅ | spawn `cwd = vaultRoot` + 注入 `DSH_OBSIDIAN_VAULT_PATH` env，杜绝跨库串扰 |
| 运行时插件（profiles） | ❌ 共享 | `profiles/` 软链 → `~/.dsh/profiles`，全局一份 |
| agent presets | ❌ 共享 | `.agent-presets/` 软链 → `~/.dsh/.agent-presets` |
| 模型 / API 密钥 / 界面主题 | ❌ 共享 | `cordis.patch.yml` 把 settings/credentials 指回 `~/.dsh` |

**配置共享原理**：插件自动在共享 profile 写 `cordis.patch.yml`，把 `settings` /
`credentials` 的 `path` 指回共享根——**模型、密钥、主题配一次全库生效**，只有会话按库隔离。
（想按库独立主题：删除 patch 里的 `settings` 条目、保留 `credentials` 即可。）

## 🤝 与 dsh-tool-obsidian-vault 珠联璧合

[dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault) 是 **DSH 侧**
工具插件（16 个 `vault_*` 工具，让 Agent 直接读写本地 Obsidian 笔记）。本插件跑在
**Obsidian 侧**——一个管"门"（让 DSH 住进 Obsidian）、一个管"钥匙"（让 Agent 认识 Obsidian）：

| 环节 | 本插件（Obsidian 侧） | 工具侧如何受益（DSH 侧） |
| --- | --- | --- |
| 启动 DSH | 点机器人图标，面板里就是官方 DSH Web UI | 无需自己开终端跑 `dsh web` |
| 定位当前库 | per-vault 注入 `DSH_OBSIDIAN_VAULT_PATH` / `DSH_OBSIDIAN_VAULT_NAME` | 「注入的本库」优先于工作目录巧合，多库同开不串 |
| 会话工作目录 | per-vault spawn `cwd = vaultRoot` | 会话 cwd 即库根，`vault_current` 判定依据清晰 |
| 多库并行 | 端口按库 hash 偏移互不冲突 | 每个库的面板共享同一份 preset，工具一次装好全库可用 |
| 配置共享 | `cordis.patch.yml` 指回 `~/.dsh` | 配一次全库生效，只有会话/历史按库隔离 |

**三步启用**：① 装好本插件 → ② 在 DSH 侧装工具的 **Obsidian 模式** preset
（复制其 `preset/` 到 `~/.dsh/.agent-presets/obsidian`，见工具 README）→
③ 面板里新建会话选「Obsidian 模式」，直接说"读一下今天的笔记"、"把这段整理进
[[xxx]]"，Agent 自动定位当前库读写，无需任何路径配置。

> 配套说明：只有 DSH_HOME 模式为 **per-vault**（V0.2 起默认）才注入 env 并设 cwd 为库根；
> **shared** 模式多库共用一个服务，工具侧退回「最近活跃打开库 / 工作目录」解析。
> 双向印证见工具 README「🤝 与 obsidian-dsh-dock 珠联璧合」一节。

## ⚠️ 已知限制

- 依赖 `child_process`：桌面端可用，**移动端不可用**（`isDesktopOnly`）；
- 端口被**非 DSH 服务**占用：子进程秒退、立即报错；被**另一个 DSH** 占用：直接挂接已有服务；
- 会话全文搜索需 Node ≥ 22.5；
- 卸载/停用时 SIGTERM 关停服务；Obsidian 崩溃/强退残留的孤儿进程会在**下次启动时自动清扫**（PID 文件 + 命令行身份校验 + PPID 判定：只清本库端口上的、父进程已不在的 dsh web，多库/多窗口并发安全），随后重新拉起服务。

## 🛠️ 开发者

```sh
npm install && npm run build   # → main.js + lib/launcher.cjs
npm run build && npm run smoke # 端到端冒烟（3099 端口真实拉起官方 dsh web，无需 Obsidian）
```

```
src/launcher.ts   纯启动逻辑（无 Obsidian 依赖，可独立测试）
src/main.ts       插件生命周期：启动/停止/状态栏/命令/ribbon
src/view.ts       iframe 面板（Custom Frames 同款做法）
src/settings.ts   设置页
scripts/smoke.mjs 端到端冒烟
```

## 📜 更新记录

| 日期 | 更新 |
|---|---|
| 2026-08-19 | 「零自研」表述改为「官方原生」：README / 设置页 / manifest 统一为「直接运行官方 dsh CLI，官方 UI 原样嵌入」 |
| 2026-08-19 | **默认 DSH_HOME 模式改为 per-vault**（会话按库隔离、配置全局共享）；设置页下拉默认项与 README 同步 |
| 2026-08-19 | README 精简重构：开箱即用安装（复制 3 文件，无需构建）置顶，构建路线并入「开发者」一节；本地 `dist/obsidian-dsh-dock.zip` 重新打包为最新产物（发布用，不入库） |
| 2026-08-19 | 「与 dsh-tool-obsidian-vault 联动」扩写为「珠联璧合」章节（配合机制表格 + 三步启用），与工具侧 README 双向印证 |
| 2026-08-17 | per-vault 配置共享（模型/密钥/主题配一次全库生效）；profiles / .agent-presets 软链共享；`DSH_OBSIDIAN_VAULT_PATH` env 注入；spawn `cwd = vaultRoot` 消除跨库串扰 |

## License

MIT
