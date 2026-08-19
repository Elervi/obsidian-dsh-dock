# DSH Dock（V0.2）

**在 Obsidian 桌面端内启动官方 DeepSeek Harness Web（127.0.0.1:3080）并嵌入为面板。**

与 `obsidian-harness-like` 那种"在插件里自研 agent 循环"的路线相反：本插件**零自研 DSH 能力**（官方 Web UI 原样嵌入，外观美化只作用于插件外壳：工具栏/状态胶囊/加载与错误态），只做三件事——

1. **定位**官方 dsh CLI（`@deepseek-ai/dsh`）；
2. 用子进程 **spawn** `node <dsh>/lib/bin.js web --host 127.0.0.1 --port 3080`（官方 web profile，端口默认 3080）；
3. 用 **iframe** 把官方 Web UI 嵌进 Obsidian 面板，卸载插件时 SIGTERM 关停服务。

## 工作原理

```
Obsidian (Electron)
 └─ DSH Dock 插件
     ├─ 定位 dsh: 设置路径 → $DSH_BIN → npm root -g → 常见全局目录
     ├─ 选择 Node: 设置路径 → PATH 中的 node（系统 Node 最稳定）
     ├─ 端口探测: node:http（不依赖浏览器 fetch——Obsidian 渲染进程的 CSP
     │            会屏蔽对 http://127.0.0.1 的 fetch，导致误判）
     ├─ 已有服务 → 直接挂接（不重复拉起）；否则
     ├─ spawn: node <dsh>/lib/bin.js web --host 127.0.0.1 --port <port>
     │         env: DSH_HOME=~/.dsh（默认=官方共享；可切换每 vault 隔离/自定义）
     ├─ 等待就绪（子进程秒退则立即报出真实错误，如 EADDRINUSE，不盲等 120s）
     └─ iframe 面板 → http://127.0.0.1:<port>/
```

关键官方事实（已在 `@deepseek-ai/dsh@0.1.0-rc.6` 上验证）：

- `dsh web` 默认绑定 `127.0.0.1`、默认端口 `3080`，`--port 0` 可让 OS 分配空闲端口；
- 首次启动自动初始化 `$DSH_HOME/profiles/web`（bundles = `dsh-base` + `dsh-web-app`），
  模块解析走 `$DSH_HOME/profiles/node_modules` 平面符号链接，**无需 pnpm、无需联网**；
- 默认配置下 SQLite（`node:sqlite`，需 Node ≥ 22.5）**不会打开**（`openAt: never`），
  所以 Node 20+ 也能跑默认 web profile；只有启用会话全文搜索才需要 Node ≥ 22.5；
- **DSH_HOME 三档可配**（设置页）：默认「官方共享 `~/.dsh`」与 dsh CLI 完全一致，
  复用已有配置/会话；可切「每 vault 隔离 `~/.dsh/vaults/<名>-<hash6>`」（hash 消歧，
  中文名不碰撞）；可「自定义」。不建议放 vault 内（macOS Documents 有 TCC 权限墙）。

## 环境要求

- Obsidian **桌面端**（1.5.0+）
- 官方 dsh 已安装：`npm install -g @deepseek-ai/dsh`（或把 dsh 包放到可探测位置）
- 系统有 `node`（≥ 20 即可跑默认配置；会话全文搜索才需 ≥ 22.5）

## 安装

1. `npm install && npm run build`（产物 `main.js` + `manifest.json` + `styles.css`）；
2. 把这三个文件复制到 vault 的 `.obsidian/plugins/obsidian-dsh-dock/`；
3. Obsidian：设置 → 第三方插件 → 启用 **DSH Dock**；
4. 点击侧边栏机器人图标，或运行命令「打开 DSH 面板」。

首次启动会自动初始化 `$DSH_HOME`（默认 `<vault>/.dsh`），几秒内面板出现官方 DSH Web UI。

## 命令

| 命令 | 说明 |
|---|---|
| 打开 DSH 面板 | 在右侧栏打开 iframe 面板 |
| 弹出独立窗口 | 面板进入独立 BrowserWindow（独立渲染进程，性能等同浏览器标签页） |
| 启动 / 停止 DSH 服务 | 手动控制子进程 |
| 在系统浏览器中打开 DSH | 用默认浏览器打开 http://127.0.0.1:<port> |

## 设置

- **dsh CLI 路径**：留空自动探测（`DSH_BIN` → `npm root -g` → `/opt/homebrew|/usr/local/lib/node_modules` 等）；
- **Node 可执行文件**：留空自动选择（系统 `node`，最稳定）；「复用 Obsidian 内置 Node」默认关；
- **监听端口**：默认 3080；填 0 让 OS 分配；
- **DSH_HOME 模式**：默认「官方共享 `~/.dsh`」（与 dsh CLI 一致，复用现有配置/会话）；
  可选「每 vault 隔离 `~/.dsh/vaults/<名>-<hash6>`」（中文名不碰撞、改名不孤儿）；
  可选「自定义路径」；
- **随 Obsidian 自动启动**：默认开。

## per-vault 隔离模式（V0.2 核心特性）

per-vault 模式（`dshHomeMode: per-vault`，DSH_HOME = `~/.dsh/vaults/<库名>-<hash6>`）
的隔离边界是 **「会话隔离，配置共享」**：

| 维度 | 按库隔离 | 机制 |
|---|---|---|
| 会话 / 历史（sessions、storages） | ✅ | 每库独占 DSH_HOME 目录 |
| 监听端口 | ✅ | `settings.port + (vaultRoot hash % 4096)`，冲突概率 ~1/4096 |
| 会话 cwd | ✅ | spawn `cwd = vaultRoot`，会话 cwd 即本库根，杜绝跨库串扰 |
| vault 识别 | ✅ | 仅 per-vault 注入 `DSH_OBSIDIAN_VAULT_PATH` env，cwd 与库识别解耦 |
| 运行时插件（profiles） | ❌ 共享 | `profiles/` 软链 → `~/.dsh/profiles`，195+ 插件全局一份 |
| agent presets | ❌ 共享 | `.agent-presets/` 软链 → `~/.dsh/.agent-presets` |
| 模型 / API 密钥 / 界面主题 | ❌ 共享 | `cordis.patch.yml` 把 settings/credentials 指回 `~/.dsh` |

### 配置共享原理

插件自动维护共享 profile 的 `cordis.patch.yml`，把两个插件用 `path` 覆盖指回共享根
（写入条件：patch 为空或 `[]`；已有自定义内容时跳过，需手动合并）：

```yaml
- id: settings
  config:
    path: ~/.dsh/settings.yaml
- id: credentials
  config:
    path: ~/.dsh/.credentials.yaml
```

效果：**模型选择、API 密钥、DSH 面板主题配一次全库生效**，只有会话数据按库隔离。

### 常见疑问（FAQ）

**为什么改一个库的 DSH 面板主题，所有库都跟着变？**

主题偏好 `ui-theme.preference` 存在共享的 `~/.dsh/settings.yaml`，所有 per-vault / shared
实例的面板都读写这一份文件。Obsidian 自己的外观（`.obsidian/appearance.json`）不在此列，
仍是每库独立。

**如何让 DSH 面板主题按库独立？**

编辑 `~/.dsh/profiles/web/cordis.patch.yml`，**删除 `settings` 条目、保留 `credentials`**：
各 per-vault 服务改用各自的 `<per-vault-home>/settings.yaml` 存主题。
副作用：模型选择等其它设置也变为按库独立，每个库需各配一次。

### 更新记录

| 日期 | 重要更新 |
|---|---|
| 2026-08-19 | 「与 dsh-tool-obsidian-vault 联动」扩写为「珠联璧合」章节：配合机制表格（env 注入 / cwd / preset 软链 / 配置共享）+ 三步启用，与工具侧 README 双向印证；安装方式改为 preset 复制为主 |
| 2026-08-17 | per-vault 配置共享（模型/密钥/主题配一次全库生效）；`cordis.patch.yml` 语法修正；profiles / .agent-presets 软链共享；`DSH_OBSIDIAN_VAULT_PATH` env 注入；spawn `cwd = vaultRoot` 消除跨库串扰 |

## 与 dsh-tool-obsidian-vault 珠联璧合

[`dsh-tool-obsidian-vault`](https://github.com/Elervi/dsh-tool-obsidian-vault) 是 **DSH 侧**的工具插件
（16 个 `vault_*` 工具，通过 `obsidian.json` 全局注册表发现 vault），本插件跑在 **Obsidian 侧**。
两者一个管"门"（让 DSH 住进 Obsidian）、一个管"钥匙"（让 Agent 认识 Obsidian），合起来就是
开箱即用的「Obsidian 内 Agent 笔记工作流」：

| 环节 | 本插件（Obsidian 侧） | 工具侧如何受益（DSH 侧） |
| --- | --- | --- |
| 启动 DSH | 点一下机器人图标，面板里就是官方 DSH Web UI | 无需自己开终端跑 `dsh web` |
| 定位当前库 | per-vault 模式注入 `DSH_OBSIDIAN_VAULT_PATH` / `DSH_OBSIDIAN_VAULT_NAME` | 「注入的本库」在工具解析顺序里优先于工作目录巧合，多库同开不串 |
| 会话工作目录 | per-vault spawn `cwd = vaultRoot` | 会话 cwd 即库根，工具解析顺序直接命中，`vault_current` 判定依据清晰 |
| 多库并行 | 端口按库 hash 偏移互不冲突 | 每个库的面板共享同一份 preset，工具一次装好全库可用 |
| preset 发现 | `.agent-presets/` 软链 → 共享 `~/.dsh/.agent-presets` | `obsidian` preset 一次安装，per-vault 各面板都能发现 |
| 配置共享 | `cordis.patch.yml` 把模型/密钥/主题指回 `~/.dsh` | 配一次全库生效，只有会话/历史按库隔离 |

**三步启用即珠联璧合**：

1. 按上文安装并启用本插件（DSH Dock）；
2. 在 DSH 侧安装工具的 **Obsidian 模式** preset（复制 `preset/` 目录到
   `~/.dsh/.agent-presets/obsidian`，见工具 README「🚀 快速安装」）；
3. 点 dock 的机器人图标打开面板 → 新建会话选「Obsidian 模式」→ 直接说
   "读一下今天的笔记"、"把这段整理进 [[xxx]]"，Agent 会自动定位当前库读写，
   无需任何路径配置。

> 配套说明：只有 DSH_HOME 模式为 **per-vault** 时才注入
> `DSH_OBSIDIAN_VAULT_PATH` / `DSH_OBSIDIAN_VAULT_NAME` 并把 cwd 设为库根；
> **shared** 模式下多库共用一个服务，工具侧退回「最近活跃打开库 / 工作目录」解析。
> 双向印证见 dsh-tool-obsidian-vault 的 README「🤝 与 obsidian-dsh-dock 珠联璧合」一节。

工具侧的另一种安装方式（DSH 的插件管理，备选）：

```bash
dsh plugin --profile web add <dsh-tool-obsidian-vault 或其 npm 名>
```

## 已知限制（V0.2）

- 依赖 `child_process`：Obsidian 桌面端渲染进程可用（社区插件广泛验证），但**移动端不可用**（已 `isDesktopOnly`）；
- 端口被**非 DSH 服务**占用：子进程 EADDRINUSE 秒退，插件立即报"端口已被占用"，不会盲等；
  端口被**另一个 DSH** 占用（如本机已开着 `dsh web`）：插件直接挂接已有服务，不再新起进程；
- 会话全文搜索（启用 `session-query-sqlite` 的 `openAt` 后）需要 Node ≥ 22.5，
  请确保系统 Node 版本足够；
- 插件卸载/停用时子进程被 SIGTERM；Obsidian 崩溃时可能残留孤儿进程（重启后插件会挂接回该端口）。

## 冒烟测试（无需 Obsidian）

```bash
npm run build && npm run smoke
```

`scripts/smoke.mjs` 会在 3099 端口真实拉起官方 `dsh web`（独立 DSH_HOME），
验证定位 → spawn → 就绪 → 首页 HTML → 停止 全链路。

## 工程结构

```
src/launcher.ts   纯启动逻辑（无 Obsidian 依赖，可独立测试）
src/main.ts       插件生命周期：启动/停止/状态栏/命令/ribbon
src/view.ts       iframe 面板（Custom Frames 同款做法）
src/settings.ts   设置页
scripts/smoke.mjs 端到端冒烟
```

## License

MIT
