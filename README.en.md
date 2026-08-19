# DSH Dock

[![Obsidian Plugin Market Submitted](https://img.shields.io/badge/Obsidian%20Plugin%20Market-Submitted-7C3AED?style=flat-square)](https://obsidian.md/plugins?id=dsh-dock)
[![GitHub release](https://img.shields.io/github/v/release/Elervi/obsidian-dsh-dock?style=flat-square)](https://github.com/Elervi/obsidian-dsh-dock/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

> Dock the official **DeepSeek Harness Web** (127.0.0.1:3080) into an Obsidian sidebar: spawn the official `dsh` CLI and embed the official UI as-is. Thin shell, no reimplementation.

[![🇨🇳 中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-%E4%B8%AD%E6%96%87%E7%89%88-7C3AED?style=flat-square)](README.md) [![🇬🇧 English](https://img.shields.io/badge/English-Current-0969DA?style=flat-square)](#)

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

## License

MIT
