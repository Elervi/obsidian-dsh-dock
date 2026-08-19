# DSH Dock

[![Obsidian 插件市场 已提交](https://img.shields.io/badge/Obsidian%20%E6%8F%92%E4%BB%B6%E5%B8%82%E5%9C%BA-%E5%B7%B2%E6%8F%90%E4%BA%A4-7C3AED?style=flat-square)](https://obsidian.md/plugins?id=dsh-dock)
[![GitHub release](https://img.shields.io/github/v/release/Elervi/obsidian-dsh-dock?style=flat-square)](https://github.com/Elervi/obsidian-dsh-dock/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

> 把官方 **DeepSeek Harness Web**（127.0.0.1:3080）停靠进 Obsidian 侧边栏——跑官方 `dsh CLI`、官方 UI 原样嵌入，只做外壳。
> Dock the official DeepSeek Harness Web into an Obsidian sidebar: spawn the official `dsh` CLI and embed the official UI as-is.

<div class="rt-tabs">

<input class="rt-radio" type="radio" id="rt-zh" name="rt-lang" checked>
<input class="rt-radio" type="radio" id="rt-en" name="rt-lang">

<div class="rt-nav">
<label class="rt-tab" for="rt-zh">🇨🇳 中文</label>
<label class="rt-tab" for="rt-en">🇬🇧 English</label>
</div>

<div class="rt-panel rt-panel-zh">

## ✨ 特性

- 📦 **开箱即用** — Obsidian 市场一键安装，或复制 3 个文件
- 🪟 **官方原生** — 定位 dsh → 拉起官方 `dsh web` → iframe 原样嵌入
- 🗂️ **Per-vault 隔离** — 会话按库独立、配置全局共享，多库并行互不串扰
- 🤝 **珠联璧合** — 与 [dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault) 联动，Obsidian 内直接驱动 Agent 笔记工作流
- 🧹 **进程自清洁** — 卸载/停用 SIGTERM 关停；崩溃残留的孤儿进程下次启动自动清扫

## 📦 安装

> 前置：Obsidian **桌面端** ≥ 1.5.0 · `npm i -g @deepseek-ai/dsh` · Node ≥ 20

**① 插件市场（推荐）**：设置 → 第三方插件 → 浏览 → 搜索 **DSH Dock** → 安装并启用。

**② 手动安装**：把 `main.js` + `manifest.json` + `styles.css` 复制到 vault 的 `.obsidian/plugins/dsh-dock/`，再在设置中启用。

启用后点侧边栏机器人图标（或命令「打开 DSH 面板」）。首次启动自动初始化 `$DSH_HOME` 并拉起官方 `dsh web`，几秒后面板出现。

## 🗂️ Per-vault 隔离（默认）

**会话隔离、配置共享**——模型、密钥、主题配一次全库生效，只有会话/历史按库独立。

| 维度 | 行为 |
| --- | --- |
| 会话 / 历史 | 每库独占 `~/.dsh/vaults/<库名>-<hash6>` |
| 监听端口 | `port + vaultRoot hash % 4096`（冲突概率 ~1/4096） |
| vault 识别 | 注入 `DSH_OBSIDIAN_VAULT_PATH` + spawn `cwd = vaultRoot` |
| 模型 / 密钥 / 主题 / presets | 全局共享：软链 `profiles/` + `cordis.patch.yml` 指回 `~/.dsh` |

## ⚙️ 设置

| 设置 | 默认 |
| --- | --- |
| dsh CLI 路径 | 自动探测（`$DSH_BIN` → npm 全局） |
| Node 可执行文件 | 系统 node（最稳定） |
| 监听端口 | 3080；`0` = OS 分配空闲端口 |
| DSH_HOME 模式 | per-vault 隔离（可切换 shared / 自定义） |
| 随 Obsidian 自动启动 | ✅ 开 |

## 🔧 原理

```
node <dsh>/lib/bin.js web --host 127.0.0.1 --port <port>   env: DSH_HOME
→ 等待就绪（秒退立即报错，不盲等）→ iframe 面板 → http://127.0.0.1:<port>/
端口上已有 DSH 服务 → 直接挂接，不重复拉起
```

## ⚠️ 已知限制

- 仅桌面端（依赖 `child_process`）
- 端口被**非 DSH 服务**占用 → 秒退报错；被另一 DSH 占用 → 直接挂接
- 会话全文搜索需 Node ≥ 22.5

## 🤝 珠联璧合

[dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault) 是 **DSH 侧**工具插件（16 个 `vault_*` 工具，让 Agent 直接读写本地 Obsidian 笔记）；本插件是 **Obsidian 侧**外壳——一个管「门」（让 DSH 住进 Obsidian），一个管「钥匙」（让 Agent 认识 Obsidian）。

| 环节 | 本插件（Obsidian 侧） | 工具侧如何受益（DSH 侧） |
| --- | --- | --- |
| 启动 DSH | 点机器人图标，面板即官方 DSH Web UI | 无需自己开终端跑 `dsh web` |
| 定位当前库 | 注入 `DSH_OBSIDIAN_VAULT_PATH` / `DSH_OBSIDIAN_VAULT_NAME` | 「注入的本库」优先于工作目录巧合，多库同开不串 |
| 会话工作目录 | spawn `cwd = vaultRoot` | 会话 cwd 即库根，`vault_current` 判定依据清晰 |
| 多库并行 | 端口按库 hash 偏移互不冲突 | 面板共享同一份 preset，一次装好全库可用 |
| 配置共享 | `cordis.patch.yml` 指回 `~/.dsh` | 配一次全库生效，只有会话/历史按库隔离 |

**三步启用**：① 装好本插件 → ② 在 DSH 侧装 **Obsidian 模式** preset（复制其 `preset/` 到 `~/.dsh/.agent-presets/obsidian`）→ ③ 面板新建会话选「Obsidian 模式」，说「读一下今天的笔记」「把这段整理进 [[xxx]]」，Agent 自动读写当前库，无需任何路径配置。

> 仅 **per-vault** 模式（默认）注入 env 并设 cwd 为库根；**shared** 模式多库共用一个服务，工具侧退回「最近活跃打开库 / 工作目录」解析。

</div>

<div class="rt-panel rt-panel-en">

## ✨ Features

- 📦 **Zero-build** — one-click install from the Obsidian marketplace, or copy 3 files
- 🪟 **Native official** — locates `dsh` → spawns the official `dsh web` → embeds the official UI in an iframe
- 🗂️ **Per-vault isolation** — sessions isolated per vault, config shared across vaults
- 🤝 **Pairs with [dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault)** — agent-driven note workflow inside Obsidian
- 🧹 **Self-cleaning** — SIGTERM on unload/disable; orphan processes left by a crash are swept on next start

## 📦 Install

> Prereqs: Obsidian **desktop** ≥ 1.5.0 · `npm i -g @deepseek-ai/dsh` · Node ≥ 20

**① From the marketplace (recommended)**: Settings → Community plugins → Browse → search **DSH Dock** → Install & enable.

**② Manually**: copy `main.js` + `manifest.json` + `styles.css` into `.obsidian/plugins/dsh-dock/` in your vault, then enable it.

Click the robot icon in the sidebar (or run the "Open DSH panel" command). On first start it initializes `$DSH_HOME` and spawns the official `dsh web` — the panel appears in seconds.

## 🗂️ Per-vault isolation (default)

**Isolated sessions, shared config** — model, API keys and theme are configured once and apply to every vault; only sessions/history are per-vault.

| Aspect | Behavior |
| --- | --- |
| Sessions / history | Each vault owns `~/.dsh/vaults/<name>-<hash6>` |
| Port | `port + vaultRoot hash % 4096` (~1/4096 collision) |
| Vault detection | Injects `DSH_OBSIDIAN_VAULT_PATH` + spawn `cwd = vaultRoot` |
| Model / keys / theme / presets | Shared globally: symlinked `profiles/` + `cordis.patch.yml` pointing to `~/.dsh` |

## ⚙️ Settings

| Setting | Default |
| --- | --- |
| dsh CLI path | Auto-detect (`$DSH_BIN` → npm global) |
| Node executable | System node (most stable) |
| Port | 3080; `0` = let the OS pick a free port |
| DSH_HOME mode | per-vault isolation (shared / custom available) |
| Auto-start with Obsidian | ✅ on |

## 🔧 How it works

```
node <dsh>/lib/bin.js web --host 127.0.0.1 --port <port>   env: DSH_HOME
→ wait until ready (instant exit = real error, no blind wait) → iframe → http://127.0.0.1:<port>/
existing DSH service on the port → attach directly, no second spawn
```

## ⚠️ Limitations

- Desktop only (depends on `child_process`)
- Port taken by a **non-DSH** service → exits fast with a clear error; taken by another DSH → attaches to it
- Full-text session search needs Node ≥ 22.5

## 🤝 Companion plugin

[dsh-tool-obsidian-vault](https://github.com/Elervi/dsh-tool-obsidian-vault) is the **DSH-side** tool plugin (16 `vault_*` tools that let the agent read/write local notes); this plugin is the **Obsidian-side** shell — one opens the door (hosts DSH inside Obsidian), the other hands out the keys (teaches the agent about Obsidian).

| Stage | This plugin (Obsidian side) | Tool side benefit (DSH side) |
| --- | --- | --- |
| Start DSH | click the robot icon, official DSH Web UI in the panel | no terminal needed for `dsh web` |
| Locate the vault | injects `DSH_OBSIDIAN_VAULT_PATH` / `DSH_OBSIDIAN_VAULT_NAME` | "injected vault" beats working-directory coincidence |
| Session cwd | spawn `cwd = vaultRoot` | session cwd is the vault root; `vault_current` resolves clearly |
| Multiple vaults | per-vault port offset avoids collisions | all panels share one preset — install once, every vault works |
| Shared config | `cordis.patch.yml` points back to `~/.dsh` | configure once; only sessions are isolated |

**Enable in 3 steps**: ① install this plugin → ② install the tool's **Obsidian mode** preset (copy its `preset/` to `~/.dsh/.agent-presets/obsidian`) → ③ open a session in **Obsidian mode** and say "read today's notes" or "file this under [[xxx]]" — the agent reads/writes the current vault automatically, no path config needed.

> Only **per-vault** mode (default) injects env vars and sets cwd to the vault root; **shared** mode shares one service across vaults and the tool falls back to "most recently opened vault / working directory".

</div>

</div>

<style>
.rt-tabs .rt-radio{position:absolute;opacity:0;pointer-events:none}
.rt-tabs .rt-panel{display:none;padding-top:.5rem}
.rt-tabs .rt-nav{border-bottom:1px solid #d0d7de;margin-bottom:1rem}
.rt-tabs .rt-tab{display:inline-block;padding:.4rem .9rem;cursor:pointer;font-weight:600;color:#57606a;border-bottom:2px solid transparent;margin-bottom:-1px}
.rt-tabs #rt-zh:checked ~ .rt-nav .rt-tab[for="rt-zh"],
.rt-tabs #rt-en:checked ~ .rt-nav .rt-tab[for="rt-en"]{color:#0969da;border-bottom-color:#0969da}
.rt-tabs #rt-zh:checked ~ .rt-panel-zh,
.rt-tabs #rt-en:checked ~ .rt-panel-en{display:block}
</style>

## License

MIT
