"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  computeDshHome: () => computeDshHome,
  default: () => DshDockPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");
var os3 = __toESM(require("os"), 1);
var path3 = __toESM(require("path"), 1);

// src/launcher.ts
var import_child_process = require("child_process");
var fs = __toESM(require("fs"), 1);
var http = __toESM(require("http"), 1);
var os = __toESM(require("os"), 1);
var path = __toESM(require("path"), 1);
var DSH_RELATIVE_BIN = path.join("@deepseek-ai", "dsh", "lib", "bin.js");
var NODE_SQLITE_MIN_MAJOR = 22;
function stableHash(input, len = 6) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h << 5) + h + input.charCodeAt(i) >>> 0;
  return h.toString(36).padStart(len, "0").slice(0, len);
}
function safeVaultName(vaultRoot) {
  const cleaned = path.basename(vaultRoot).replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "vault").slice(0, 40);
}
function normalizeDshBin(input) {
  if (!input) return null;
  const p = input.trim();
  if (!p) return null;
  const expanded = p.replace(/^~(?=$|\/|\\)/, os.homedir());
  const abs = path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(expanded);
  try {
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      const candidate = path.join(abs, "lib", "bin.js");
      return fs.existsSync(candidate) ? candidate : null;
    }
    if (st.isFile()) return abs;
  } catch {
    return null;
  }
  return null;
}
function globalModuleRoots() {
  const roots = [];
  if (process.env.DSH_GLOBAL_MODULES) roots.push(process.env.DSH_GLOBAL_MODULES);
  const npmRoot = (0, import_child_process.spawnSync)("npm", ["root", "-g"], {
    encoding: "utf8",
    timeout: 1e4,
    windowsHide: true
  });
  if (npmRoot.status === 0 && npmRoot.stdout) {
    const line = npmRoot.stdout.trim().split(/\r?\n/)[0];
    if (line) roots.push(line);
  }
  if (process.platform === "darwin") {
    roots.push("/opt/homebrew/lib/node_modules", "/usr/local/lib/node_modules");
  } else if (process.platform === "linux") {
    roots.push("/usr/lib/node_modules", "/usr/local/lib/node_modules", path.join(os.homedir(), ".local", "lib", "node_modules"));
  } else if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) roots.push(path.join(appData, "npm", "node_modules"));
  }
  return [...new Set(roots)];
}
function resolveDshBin(explicit) {
  const notes = [];
  const explicitBin = normalizeDshBin(explicit ?? process.env.DSH_BIN);
  if (explicitBin && fs.existsSync(explicitBin)) {
    return { bin: explicitBin, notes: [`\u4F7F\u7528\u663E\u5F0F\u8DEF\u5F84: ${explicitBin}`] };
  }
  if (explicit) notes.push(`\u663E\u5F0F\u8DEF\u5F84\u4E0D\u5B58\u5728: ${explicit}`);
  for (const root of globalModuleRoots()) {
    const candidate = path.join(root, DSH_RELATIVE_BIN);
    if (fs.existsSync(candidate)) {
      return { bin: candidate, notes: [...notes, `\u4ECE\u5168\u5C40\u6A21\u5757\u6839\u53D1\u73B0: ${candidate}`] };
    }
  }
  notes.push("\u672A\u627E\u5230 dsh \u5B89\u88C5\u3002\u8BF7\u5148\u6267\u884C: npm install -g @deepseek-ai/dsh\uFF0C\u6216\u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 dsh \u8DEF\u5F84");
  return { bin: null, notes };
}
function resolveNodeBin(explicit, embeddedNodeVersion2, useEmbedded = false) {
  const notes = [];
  const explicitBin = explicit?.trim() || process.env.DSH_NODE;
  if (explicitBin) {
    notes.push(`\u4F7F\u7528\u663E\u5F0F Node: ${explicitBin}`);
    return { nodeBin: explicitBin, useElectronAsNode: false, nodeMajor: 0, notes };
  }
  if (useEmbedded && process.execPath && embeddedNodeVersion2) {
    const major = Number(embeddedNodeVersion2.split(".")[0]) || 0;
    if (major >= NODE_SQLITE_MIN_MAJOR) {
      notes.push(`\u4F7F\u7528 Obsidian \u5185\u7F6E Node ${embeddedNodeVersion2}\uFF08ELECTRON_RUN_AS_NODE\uFF09`);
      return { nodeBin: process.execPath, useElectronAsNode: true, nodeMajor: major, notes };
    }
    notes.push(`Obsidian \u5185\u7F6E Node ${embeddedNodeVersion2} < ${NODE_SQLITE_MIN_MAJOR}\uFF0C\u65E0\u6CD5\u542F\u7528`);
  }
  notes.push("\u4F7F\u7528 PATH \u4E2D\u7684 node\uFF08\u7CFB\u7EDF Node\uFF0C\u6700\u7A33\u5B9A\uFF09");
  return { nodeBin: "node", useElectronAsNode: false, nodeMajor: 0, notes };
}
function embeddedNodeVersion() {
  try {
    const v = process.versions?.node;
    return v || void 0;
  } catch {
    return void 0;
  }
}
function isPortUp(host, port, timeoutMs = 1500) {
  return new Promise((resolve2) => {
    const req = http.get({ host, port, path: "/", timeout: timeoutMs }, (res) => {
      res.resume();
      resolve2(true);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve2(false);
    });
    req.on("error", () => resolve2(false));
  });
}
async function waitForReady(host, port, timeoutMs = 12e4) {
  const deadline = Date.now() + timeoutMs;
  for (; ; ) {
    if (await isPortUp(host, port, 1500)) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 500));
  }
}
function launchDsh(opts) {
  const port = opts.port ?? 3080;
  const host = opts.host ?? "127.0.0.1";
  const args = [opts.dshBin, "web", "--host", host, "--port", String(port)];
  const env = {
    ...opts.env ?? process.env ?? {},
    DSH_HOME: opts.dshHome
  };
  if (opts.useElectronAsNode) env.ELECTRON_RUN_AS_NODE = "1";
  console.info(`[dsh-host] spawn ${opts.nodeBin} ${args.join(" ")}`);
  console.info(`[dsh-host] DSH_HOME=${opts.dshHome}`);
  return (0, import_child_process.spawn)(opts.nodeBin, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
}
async function ensureDshRunning(opts) {
  const port = opts.port ?? 3080;
  const host = opts.host ?? "127.0.0.1";
  const url = `http://${host}:${port}/`;
  if (await isPortUp(host, port)) {
    return { status: { kind: "running", port, host, url, attached: true } };
  }
  const found = resolveDshBin(opts.dshBin);
  if (!found.bin) {
    return { status: { kind: "error", message: found.notes[found.notes.length - 1] ?? "\u65E0\u6CD5\u5B9A\u4F4D dsh CLI" } };
  }
  const node = resolveNodeBin(opts.nodeBin, embeddedNodeVersion(), opts.useEmbeddedNode);
  const proc = launchDsh({ ...opts, dshBin: found.bin, nodeBin: node.nodeBin, useElectronAsNode: node.useElectronAsNode });
  let stderrTail = "";
  proc.stderr?.on("data", (d) => {
    stderrTail = (stderrTail + d.toString()).slice(-4e3);
  });
  const childDied = new Promise((resolve2) => {
    proc.once("exit", () => resolve2(true));
    proc.once("error", () => resolve2(true));
  });
  const ready = await Promise.race([
    waitForReady(host, port, opts.timeoutMs ?? 12e4).then(() => true),
    childDied.then(() => false)
  ]);
  if (ready) {
    return { status: { kind: "running", port, host, url, attached: false }, proc };
  }
  if (await isPortUp(host, port)) {
    return { status: { kind: "running", port, host, url, attached: true }, proc };
  }
  return { status: { kind: "error", message: summarizeChildError(stderrTail) }, proc };
}
function summarizeChildError(stderrTail) {
  const lines = stderrTail.split(/\r?\n/).filter(Boolean);
  const addrLine = lines.find((l) => l.includes("EADDRINUSE"));
  const errLine = lines.find((l) => l.includes("Error:"));
  if (addrLine) {
    return "\u7AEF\u53E3\u5DF2\u88AB\u5360\u7528\uFF08EADDRINUSE\uFF09\u3002\u8BF7\u6362\u4E00\u4E2A\u7AEF\u53E3\uFF0C\u6216\u5148\u505C\u6389\u5360\u7528\u8BE5\u7AEF\u53E3\u7684\u670D\u52A1\u540E\u91CD\u8BD5";
  }
  if (errLine) {
    const cleaned = errLine.trim().slice(0, 300);
    return `dsh \u542F\u52A8\u5931\u8D25: ${cleaned}`;
  }
  return "DSH \u8FDB\u7A0B\u9000\u51FA\uFF08\u65E0\u8BE6\u7EC6\u9519\u8BEF\uFF09\u3002\u8BF7\u67E5\u770B Obsidian \u63A7\u5236\u53F0 [dsh] \u65E5\u5FD7";
}
function stopProcess(proc, timeoutMs = 5e3) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve();
  return new Promise((resolve2) => {
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
      }
    }, timeoutMs);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve2();
    });
    try {
      proc.kill("SIGTERM");
    } catch {
      clearTimeout(timer);
      resolve2();
    }
  });
}

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  dshBin: "",
  nodeBin: "",
  host: "127.0.0.1",
  port: 3080,
  dshHomeMode: "shared",
  dshHome: "",
  useEmbeddedNode: false,
  autostart: true
};
var DshDockSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  plugin;
  customHomeEl;
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u26F5 DSH Dock" });
    containerEl.createEl("p", {
      cls: "dsh-dock-settings-desc",
      text: "\u628A\u5B98\u65B9 DeepSeek Harness Web \u505C\u9760\u8FDB Obsidian\uFF1A\u5B9A\u4F4D dsh \u2192 \u5B50\u8FDB\u7A0B\u8FD0\u884C \u2192 \u9762\u677F\u5D4C\u5165\u3002\u5168\u7A0B\u5B98\u65B9\uFF0C\u96F6\u81EA\u7814\u3002"
    });
    containerEl.createEl("h3", { text: "\u670D\u52A1" });
    const statusLine = new import_obsidian.Setting(containerEl).setName("\u670D\u52A1\u72B6\u6001").setDesc(this.describeStatus());
    const btns = statusLine.controlEl.createDiv({ cls: "dsh-dock-btns" });
    const startBtn = btns.createEl("button", { cls: "mod-cta", text: "\u25B6 \u542F\u52A8" });
    startBtn.onclick = () => {
      void this.plugin.start().then(() => this.display());
    };
    const stopBtn = btns.createEl("button", { text: "\u25A0 \u505C\u6B62" });
    stopBtn.onclick = () => {
      void this.plugin.stop().then(() => this.display());
    };
    const openBtn = btns.createEl("button", { text: "\u6253\u5F00\u9762\u677F" });
    openBtn.onclick = () => {
      void this.plugin.openPanel();
    };
    new import_obsidian.Setting(containerEl).setName("\u968F Obsidian \u81EA\u52A8\u542F\u52A8").addToggle(
      (t) => t.setValue(this.plugin.settings.autostart).onChange(async (v) => {
        this.plugin.settings.autostart = v;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "\u8FD0\u884C\u65F6" });
    new import_obsidian.Setting(containerEl).setName("dsh CLI \u8DEF\u5F84").setDesc("\u7559\u7A7A\u81EA\u52A8\u63A2\u6D4B\uFF08DSH_BIN \u2192 npm root -g \u2192 \u5E38\u89C1\u5168\u5C40\u76EE\u5F55\uFF09\u3002\u53EF\u586B dsh \u5305\u76EE\u5F55\u6216 bin.js \u7EDD\u5BF9\u8DEF\u5F84\u3002").addText(
      (t) => t.setPlaceholder("\u4F8B\u5982 /opt/homebrew/lib/node_modules/@deepseek-ai/dsh").setValue(this.plugin.settings.dshBin).onChange(async (v) => {
        this.plugin.settings.dshBin = v.trim();
        await this.plugin.saveSettings();
        this.detectLine.textContent = this.describeDetect();
      })
    );
    this.detectLine = containerEl.createEl("div", { cls: "dsh-dock-detect" });
    new import_obsidian.Setting(containerEl).setName("Node \u53EF\u6267\u884C\u6587\u4EF6").setDesc("\u7559\u7A7A\u81EA\u52A8\u9009\u62E9\uFF08\u7CFB\u7EDF node \u6700\u7A33\u5B9A\uFF09\u3002").addText(
      (t) => t.setPlaceholder("\u4F8B\u5982 /opt/homebrew/bin/node").setValue(this.plugin.settings.nodeBin).onChange(async (v) => {
        this.plugin.settings.nodeBin = v.trim();
        await this.plugin.saveSettings();
        this.detectLine.textContent = this.describeDetect();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u590D\u7528 Obsidian \u5185\u7F6E Node").setDesc("ELECTRON_RUN_AS_NODE\u3002\u9ED8\u8BA4\u5173\u95ED\u2014\u2014\u5B9E\u6D4B Obsidian \u4E8C\u8FDB\u5236\u4EE5 Node \u6A21\u5F0F\u8FD0\u884C\u4F1A\u6302\u8D77\uFF0C\u4EC5\u5728\u9A8C\u8BC1\u53EF\u7528\u65F6\u5F00\u542F\u3002").addToggle(
      (t) => t.setValue(this.plugin.settings.useEmbeddedNode).onChange(async (v) => {
        this.plugin.settings.useEmbeddedNode = v;
        await this.plugin.saveSettings();
        this.detectLine.textContent = this.describeDetect();
      })
    );
    containerEl.createEl("h3", { text: "\u7F51\u7EDC" });
    new import_obsidian.Setting(containerEl).setName("\u76D1\u542C\u7AEF\u53E3").setDesc("\u5B98\u65B9\u9ED8\u8BA4 3080\u3002\u586B 0 \u8BA9\u7CFB\u7EDF\u5206\u914D\u7A7A\u95F2\u7AEF\u53E3\u3002").addText(
      (t) => t.setPlaceholder("3080").setValue(String(this.plugin.settings.port)).onChange(async (v) => {
        const n = Number(v.trim());
        this.plugin.settings.port = Number.isInteger(n) && n >= 0 && n <= 65535 ? n : 3080;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "\u6570\u636E\u76EE\u5F55\uFF08DSH_HOME\uFF09" });
    new import_obsidian.Setting(containerEl).setName("\u6A21\u5F0F").setDesc("DSH \u7684\u4F1A\u8BDD/\u5BC6\u94A5/\u6A21\u578B\u914D\u7F6E\u6839\u76EE\u5F55\u3002").addDropdown((dd) => {
      dd.addOption("shared", "\u5B98\u65B9\u5171\u4EAB ~/.dsh\uFF08\u4E0E dsh CLI \u4E00\u81F4\uFF0C\u590D\u7528\u73B0\u6709\u914D\u7F6E\uFF09");
      dd.addOption("per-vault", "\u6BCF vault \u9694\u79BB ~/.dsh/vaults/<\u540D>-<hash>");
      dd.addOption("custom", "\u81EA\u5B9A\u4E49\u8DEF\u5F84");
      dd.setValue(this.plugin.settings.dshHomeMode);
      dd.onChange(async (v) => {
        this.plugin.settings.dshHomeMode = v;
        await this.plugin.saveSettings();
        this.customHomeEl?.setDisabled(v !== "custom");
        this.homePreview.textContent = this.describeDshHome();
      });
    });
    this.customHomeEl = new import_obsidian.Setting(containerEl).setName("\u81EA\u5B9A\u4E49 DSH_HOME \u8DEF\u5F84").addText(
      (t) => t.setPlaceholder("\u4F8B\u5982 /Users/you/.dsh").setValue(this.plugin.settings.dshHome).onChange(async (v) => {
        this.plugin.settings.dshHome = v.trim();
        await this.plugin.saveSettings();
        this.homePreview.textContent = this.describeDshHome();
      })
    );
    this.customHomeEl.setDisabled(this.plugin.settings.dshHomeMode !== "custom");
    this.homePreview = containerEl.createEl("div", { cls: "dsh-dock-detect" });
    this.detectLine.textContent = this.describeDetect();
    this.homePreview.textContent = this.describeDshHome();
  }
  detectLine;
  homePreview;
  describeStatus() {
    const s = this.plugin.getStatus();
    if (s.kind === "running") {
      return `${s.url}\uFF08${s.attached ? "\u6302\u63A5\u5DF2\u6709\u670D\u52A1" : "\u5B50\u8FDB\u7A0B\u8FD0\u884C\u4E2D"}\uFF09`;
    }
    if (s.kind === "starting") return "\u542F\u52A8\u4E2D\u2026\uFF08\u9996\u6B21\u7EA6 10 \u79D2\uFF0C\u9700\u521D\u59CB\u5316 profile\uFF09";
    if (s.kind === "error") return `\u5931\u8D25: ${s.message}`;
    return "\u672A\u8FD0\u884C";
  }
  describeDetect() {
    const info = this.plugin.detectInfo();
    return [
      `dsh: ${info.dshBin ?? "\u672A\u627E\u5230"}${info.dshNotes.length ? `\uFF08${info.dshNotes.join("\uFF1B")}\uFF09` : ""}`,
      `node: ${info.nodeNotes.join("\uFF1B")}`
    ].join("\n");
  }
  describeDshHome() {
    return `\u751F\u6548\u8DEF\u5F84: ${this.plugin.effectiveDshHome()}`;
  }
};

// src/view.ts
var import_obsidian2 = require("obsidian");
var DSH_WEB_VIEW_TYPE = "dsh-dock-web";
var DshWebView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  plugin;
  iframeEl = null;
  pillEl = null;
  overlayEl = null;
  toggleBtn = null;
  current = "stopped";
  getViewType() {
    return DSH_WEB_VIEW_TYPE;
  }
  getDisplayText() {
    return "DSH Dock";
  }
  getIcon() {
    return "anchor";
  }
  async onOpen() {
    const root = this.contentEl.createDiv({ cls: "dsh-dock" });
    const header = root.createDiv({ cls: "dsh-dock-header" });
    const logo = header.createDiv({ cls: "dsh-dock-logo" });
    (0, import_obsidian2.setIcon)(logo, "anchor");
    header.createSpan({ cls: "dsh-dock-title", text: "DSH Dock" });
    this.pillEl = header.createSpan({ cls: "dsh-dock-pill" });
    header.createDiv({ cls: "dsh-dock-spacer" });
    this.toggleBtn = header.createEl("button", { cls: "dsh-dock-btn" });
    this.toggleBtn.onclick = () => void this.onToggle();
    const refreshBtn = header.createEl("button", { cls: "dsh-dock-btn" });
    (0, import_obsidian2.setIcon)(refreshBtn, "refresh-cw");
    refreshBtn.title = "\u5237\u65B0";
    refreshBtn.onclick = () => this.reload();
    const popoutBtn = header.createEl("button", { cls: "dsh-dock-btn" });
    (0, import_obsidian2.setIcon)(popoutBtn, "maximize-2");
    popoutBtn.title = "\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3\uFF08\u72EC\u7ACB\u8FDB\u7A0B\uFF0C\u6027\u80FD\u7B49\u540C\u6D4F\u89C8\u5668\uFF09";
    popoutBtn.onclick = () => {
      void this.plugin.openPopout();
    };
    const browserBtn = header.createEl("button", { cls: "dsh-dock-btn" });
    (0, import_obsidian2.setIcon)(browserBtn, "external-link");
    browserBtn.title = "\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00";
    browserBtn.onclick = () => {
      void this.plugin.openInBrowser();
    };
    const body = root.createDiv({ cls: "dsh-dock-body" });
    this.iframeEl = body.createEl("iframe", { cls: "dsh-dock-frame" });
    this.overlayEl = body.createDiv({ cls: "dsh-dock-overlay" });
    this.plugin.onStatusChange(() => this.refresh());
    this.refresh();
    void this.ensureStarted();
    this.plugin.refreshCurrentVaultMarker();
  }
  onClose() {
    return Promise.resolve();
  }
  async onToggle() {
    const s = this.plugin.getStatus();
    if (s.kind === "running" || s.kind === "starting") {
      await this.plugin.stop();
    } else {
      await this.plugin.start();
    }
    this.refresh();
  }
  /** 面板打开时确保服务在跑（已在跑则挂接） */
  async ensureStarted() {
    const s = this.plugin.getStatus();
    if (s.kind === "stopped" || s.kind === "error") {
      await this.plugin.start();
      this.refresh();
    }
  }
  refresh() {
    const s = this.plugin.getStatus();
    let ui;
    let pillText = "";
    let pillCls = "";
    if (s.kind === "running") {
      ui = "running";
      pillText = `\u25CF ${s.port}${s.attached ? " \xB7 \u6302\u63A5\u5DF2\u6709\u670D\u52A1" : ""}`;
      pillCls = "is-running";
    } else if (s.kind === "starting") {
      ui = "starting";
      pillText = "\u25CC \u542F\u52A8\u4E2D\u2026";
      pillCls = "is-starting";
    } else if (s.kind === "error") {
      ui = "error";
      pillText = "\u2715 \u542F\u52A8\u5931\u8D25";
      pillCls = "is-error";
    } else {
      ui = "stopped";
      pillText = "\u25CB \u672A\u8FD0\u884C";
      pillCls = "is-stopped";
    }
    this.current = ui;
    if (this.pillEl) {
      this.pillEl.setText(pillText);
      this.pillEl.className = `dsh-dock-pill ${pillCls}`;
    }
    if (this.toggleBtn) {
      this.toggleBtn.empty();
      (0, import_obsidian2.setIcon)(this.toggleBtn, s.kind === "running" || s.kind === "starting" ? "square" : "play");
      this.toggleBtn.title = s.kind === "running" || s.kind === "starting" ? "\u505C\u6B62" : "\u542F\u52A8";
    }
    if (ui === "running") {
      if (this.iframeEl && this.iframeEl.src !== this.plugin.baseUrl) {
        this.iframeEl.src = this.plugin.baseUrl;
      }
      this.showOverlay(null);
    } else if (ui === "starting") {
      this.showOverlay(this.renderStarting());
    } else if (ui === "error") {
      this.showOverlay(this.renderError(s.kind === "error" ? s.message : "\u672A\u77E5\u9519\u8BEF"));
    } else {
      this.showOverlay(this.renderStopped());
    }
  }
  // ---------- 覆盖层渲染 ----------
  showOverlay(content) {
    if (!this.overlayEl) return;
    this.overlayEl.empty();
    if (content) {
      this.overlayEl.appendChild(content);
      this.overlayEl.removeAttribute("hidden");
    } else {
      this.overlayEl.setAttribute("hidden", "");
    }
  }
  renderStarting() {
    const box = createDiv({ cls: "dsh-dock-state" });
    box.createDiv({ cls: "dsh-dock-spinner" });
    box.createDiv({ cls: "dsh-dock-state-title", text: "\u6B63\u5728\u542F\u52A8\u5B98\u65B9 DSH Web\u2026" });
    box.createDiv({
      cls: "dsh-dock-state-sub",
      text: "\u9996\u6B21\u542F\u52A8\u9700\u521D\u59CB\u5316 profile\uFF08\u7EA6 10 \u79D2\uFF09\uFF1B\u7AEF\u53E3\u88AB\u5360\u7528\u65F6\u5C06\u81EA\u52A8\u6302\u63A5\u5DF2\u6709\u670D\u52A1"
    });
    return box;
  }
  renderError(message) {
    const box = createDiv({ cls: "dsh-dock-state" });
    const icon = box.createDiv({ cls: "dsh-dock-state-icon" });
    (0, import_obsidian2.setIcon)(icon, "alert-triangle");
    box.createDiv({ cls: "dsh-dock-state-title", text: "DSH \u542F\u52A8\u5931\u8D25" });
    box.createDiv({ cls: "dsh-dock-state-msg", text: message });
    const retry = box.createEl("button", { cls: "dsh-dock-state-btn", text: "\u91CD\u8BD5" });
    retry.onclick = () => {
      void this.plugin.start().then(() => this.refresh());
    };
    return box;
  }
  renderStopped() {
    const box = createDiv({ cls: "dsh-dock-state" });
    const icon = box.createDiv({ cls: "dsh-dock-state-icon" });
    (0, import_obsidian2.setIcon)(icon, "anchor");
    box.createDiv({ cls: "dsh-dock-state-title", text: "DSH \u672A\u8FD0\u884C" });
    box.createDiv({ cls: "dsh-dock-state-sub", text: "\u70B9\u51FB\u542F\u52A8\uFF0C\u628A\u5B98\u65B9 DeepSeek Harness \u505C\u9760\u8FDB\u6765" });
    const start = box.createEl("button", { cls: "dsh-dock-state-btn mod-cta", text: "\u542F\u52A8 DSH" });
    start.onclick = () => {
      void this.plugin.start().then(() => this.refresh());
    };
    return box;
  }
  reload() {
    if (this.iframeEl && this.current === "running") {
      this.iframeEl.src = this.plugin.baseUrl;
    }
  }
};

// src/currentVault.ts
var fs2 = __toESM(require("fs"), 1);
var os2 = __toESM(require("os"), 1);
var path2 = __toESM(require("path"), 1);
function currentVaultMarkerPath() {
  return path2.join(os2.homedir(), ".dsh", "current-vault.json");
}
function writeCurrentVaultMarker(name, vaultPath) {
  try {
    const file = currentVaultMarkerPath();
    fs2.mkdirSync(path2.dirname(file), { recursive: true });
    const payload = { name, path: vaultPath, updatedAt: Date.now() };
    const tmp = `${file}.tmp`;
    fs2.writeFileSync(tmp, JSON.stringify(payload, null, 2));
    fs2.renameSync(tmp, file);
  } catch (err) {
    console.warn("[dsh-dock] \u5199\u5165 current-vault \u6807\u8BB0\u5931\u8D25", err);
  }
}
function currentVaultInfo(app) {
  try {
    const base = app.vault.adapter.getBasePath?.();
    if (!base) return null;
    return { name: app.vault.getName(), path: base };
  } catch {
    return null;
  }
}

// src/main.ts
function computeDshHome(s, vaultRoot) {
  const home = os3.homedir();
  if (s.dshHomeMode === "custom") {
    return s.dshHome.trim() || path3.join(home, ".dsh");
  }
  if (s.dshHomeMode === "per-vault") {
    const name = vaultRoot ? `${safeVaultName(vaultRoot)}-${stableHash(vaultRoot)}` : "vault";
    return path3.join(home, ".dsh", "vaults", name);
  }
  return path3.join(home, ".dsh");
}
var DshDockPlugin = class extends import_obsidian3.Plugin {
  settings = DEFAULT_SETTINGS;
  proc = null;
  status = { kind: "stopped" };
  starting = false;
  statusBarEl = null;
  statusListeners = /* @__PURE__ */ new Set();
  /** 标记文件写入防抖 timer（窗口 focus 可能高频触发） */
  markerTimer = null;
  // ------------------------------------------------------------------ 生命周期
  async onload() {
    await this.loadSettings();
    this.registerView(DSH_WEB_VIEW_TYPE, (leaf) => new DshWebView(leaf, this));
    this.refreshCurrentVaultMarker();
    const onWindowFocus = () => this.refreshCurrentVaultMarker();
    window.addEventListener("focus", onWindowFocus);
    this.register(() => window.removeEventListener("focus", onWindowFocus));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshCurrentVaultMarker()));
    this.addRibbonIcon("bot", "DSH Dock\uFF1A\u6253\u5F00\u9762\u677F", () => void this.openPanel());
    this.addCommand({
      id: "open-dsh-panel",
      name: "\u6253\u5F00 DSH \u9762\u677F",
      callback: () => void this.openPanel()
    });
    this.addCommand({
      id: "start-dsh",
      name: "\u542F\u52A8 DSH \u670D\u52A1",
      callback: () => void this.start()
    });
    this.addCommand({
      id: "stop-dsh",
      name: "\u505C\u6B62 DSH \u670D\u52A1",
      callback: () => void this.stop()
    });
    this.addCommand({
      id: "open-dsh-browser",
      name: "\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00 DSH",
      callback: () => void this.openInBrowser()
    });
    this.statusBarEl = this.addStatusBarItem();
    this.renderStatusBar();
    this.addSettingTab(new DshDockSettingsTab(this.app, this));
    if (this.settings.autostart) {
      void this.start();
    } else {
      this.setStatus({ kind: "stopped" });
    }
  }
  async onunload() {
    await this.stop();
    this.statusListeners.clear();
  }
  // ------------------------------------------------------------------ 状态
  getStatus() {
    return this.status;
  }
  get childProc() {
    return this.proc;
  }
  get baseUrl() {
    const port = this.settings.port;
    return `http://${this.settings.host}:${port}/`;
  }
  onStatusChange(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }
  setStatus(status) {
    this.status = status;
    this.renderStatusBar();
    for (const fn of this.statusListeners) {
      try {
        fn();
      } catch {
      }
    }
  }
  renderStatusBar() {
    if (!this.statusBarEl) return;
    const s = this.status;
    if (s.kind === "running") {
      this.statusBarEl.setText(`DSH: ${s.port}${s.attached ? "\uFF08\u6302\u63A5\u5DF2\u6709\u670D\u52A1\uFF09" : ""}`);
      this.statusBarEl.addClass("is-running");
      this.statusBarEl.removeClass("is-stopped");
    } else if (s.kind === "error") {
      this.statusBarEl.setText("DSH: \u542F\u52A8\u5931\u8D25");
      this.statusBarEl.removeClass("is-running");
      this.statusBarEl.addClass("is-stopped");
    } else if (s.kind === "starting") {
      this.statusBarEl.setText("DSH: \u542F\u52A8\u4E2D\u2026");
      this.statusBarEl.removeClass("is-running");
      this.statusBarEl.addClass("is-stopped");
    } else {
      this.statusBarEl.setText("DSH: \u672A\u8FD0\u884C");
      this.statusBarEl.removeClass("is-running");
      this.statusBarEl.addClass("is-stopped");
    }
  }
  // ------------------------------------------------------------------ 当前 vault 标记
  /** 读取当前 vault 并写标记文件（防抖 300ms，避免 focus 高频触发反复写盘） */
  refreshCurrentVaultMarker() {
    if (this.markerTimer) clearTimeout(this.markerTimer);
    this.markerTimer = setTimeout(() => {
      this.markerTimer = null;
      const info = currentVaultInfo(this.app);
      if (info) writeCurrentVaultMarker(info.name, info.path);
    }, 300);
  }
  // ------------------------------------------------------------------ 启动 / 停止
  /** 端口上已有服务 → 挂接；否则 spawn 官方 dsh web */
  async start() {
    if (this.starting) return this.status;
    if (this.status.kind === "running") return this.status;
    this.starting = true;
    this.setStatus({ kind: "starting" });
    try {
      const vaultRoot = this.app.vault.adapter.getBasePath?.();
      const dshHome = computeDshHome(this.settings, vaultRoot);
      const vaultInfo = currentVaultInfo(this.app);
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port: this.settings.port,
        host: this.settings.host,
        dshHome,
        useEmbeddedNode: this.settings.useEmbeddedNode,
        // 启动时把当前 vault 一并注入子进程 env，作为标记文件之外的第二通道
        // （服务刚拉起、标记尚未刷新时兜底）。
        env: vaultInfo ? {
          DSH_OBSIDIAN_VAULT_NAME: vaultInfo.name,
          DSH_OBSIDIAN_VAULT_PATH: vaultInfo.path
        } : {}
      });
      this.proc = result.proc ?? null;
      if (result.status.kind === "running" && result.proc) {
        this.hookChildLogs(result.proc);
      }
      this.setStatus(result.status);
      if (result.status.kind === "error") {
        new import_obsidian3.Notice(`DSH \u542F\u52A8\u5931\u8D25: ${result.status.message}`);
      } else if (result.status.kind === "running" && !result.status.attached) {
        new import_obsidian3.Notice(`DSH Web \u5DF2\u5C31\u7EEA: ${result.status.url}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus({ kind: "error", message: msg });
      new import_obsidian3.Notice(`DSH \u542F\u52A8\u5F02\u5E38: ${msg}`);
    } finally {
      this.starting = false;
    }
    return this.status;
  }
  async stop() {
    this.starting = false;
    if (this.proc) {
      await stopProcess(this.proc);
      this.proc = null;
    }
    this.setStatus({ kind: "stopped" });
  }
  hookChildLogs(proc) {
    proc.stdout?.on("data", (d) => console.info("[dsh]", d.toString().trimEnd()));
    proc.stderr?.on("data", (d) => console.warn("[dsh]", d.toString().trimEnd()));
    proc.once("exit", (code, signal) => {
      if (this.proc === proc) {
        this.proc = null;
        if (this.status.kind === "running" && !this.status.attached) {
          this.setStatus({ kind: "error", message: `DSH \u8FDB\u7A0B\u9000\u51FA: code=${code} signal=${signal ?? ""}` });
        }
      }
    });
    proc.once("error", (err) => {
      console.error("[dsh-dock] \u5B50\u8FDB\u7A0B\u9519\u8BEF", err);
      if (this.proc === proc) {
        this.proc = null;
        this.setStatus({ kind: "error", message: `\u5B50\u8FDB\u7A0B\u9519\u8BEF: ${err.message}` });
      }
    });
  }
  /** 探测信息（设置页展示） */
  detectInfo() {
    const found = resolveDshBin(this.settings.dshBin);
    const node = resolveNodeBin(this.settings.nodeBin, embeddedNodeVersion(), this.settings.useEmbeddedNode);
    return {
      dshBin: found.bin,
      dshNotes: found.notes,
      nodeNotes: node.notes
    };
  }
  /** 当前设置下生效的 DSH_HOME（设置页展示） */
  effectiveDshHome() {
    const vaultRoot = this.app.vault.adapter.getBasePath?.();
    return computeDshHome(this.settings, vaultRoot);
  }
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
    const legacy = data;
    if (legacy?.dshHome && typeof legacy.dshHome === "string" && legacy.dshHome.trim()) {
      this.settings.dshHomeMode = "custom";
      this.settings.dshHome = legacy.dshHome.trim();
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // ------------------------------------------------------------------ UI
  async openPanel() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(DSH_WEB_VIEW_TYPE);
    let leaf = leaves[0] ?? null;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: DSH_WEB_VIEW_TYPE, active: true });
    }
    workspace.setActiveLeaf(leaf);
  }
  async openInBrowser() {
    const { shell } = require("electron");
    await shell.openExternal(this.baseUrl);
  }
  /**
   * 弹出独立窗口（Obsidian popout）：DSH 面板进入独立 BrowserWindow =
   * 独立渲染进程，与 Obsidian 主窗口隔离，性能等同浏览器标签页。
   */
  async openPopout() {
    try {
      const leaf = this.app.workspace.openPopoutLeaf();
      await leaf.setViewState({ type: DSH_WEB_VIEW_TYPE, active: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      new import_obsidian3.Notice(`\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3\u5931\u8D25: ${msg}`);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeDshHome
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSB7IENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7XG4gIGVtYmVkZGVkTm9kZVZlcnNpb24sXG4gIGVuc3VyZURzaFJ1bm5pbmcsXG4gIHJlc29sdmVEc2hCaW4sXG4gIHJlc29sdmVOb2RlQmluLFxuICBzYWZlVmF1bHROYW1lLFxuICBzdGFibGVIYXNoLFxuICBzdG9wUHJvY2VzcyxcbiAgdHlwZSBTZXJ2ZXJTdGF0dXMsXG59IGZyb20gJy4vbGF1bmNoZXInXG5pbXBvcnQgeyBEc2hEb2NrU2V0dGluZ3NUYWIsIERFRkFVTFRfU0VUVElOR1MsIHR5cGUgRHNoRG9ja1NldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncydcbmltcG9ydCB7IERzaFdlYlZpZXcsIERTSF9XRUJfVklFV19UWVBFIH0gZnJvbSAnLi92aWV3J1xuaW1wb3J0IHsgY3VycmVudFZhdWx0SW5mbywgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIgfSBmcm9tICcuL2N1cnJlbnRWYXVsdCdcblxuLyoqXG4gKiBcdThCQTFcdTdCOTcgRFNIX0hPTUVcdUZGMUFcbiAqIC0gc2hhcmVkXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFBfi8uZHNoIFx1MjAxNFx1MjAxNCBcdTRFMEVcdTVCOThcdTY1QjkgZHNoIENMSSBcdTVCOENcdTUxNjhcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTVERjJcdTY3MDlcdTkxNERcdTdGNkUvXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURzaEhvbWUoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAnZHNoSG9tZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKClcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgcmV0dXJuIHMuZHNoSG9tZS50cmltKCkgfHwgcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbiAgfVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcpIHtcbiAgICBjb25zdCBuYW1lID0gdmF1bHRSb290ID8gYCR7c2FmZVZhdWx0TmFtZSh2YXVsdFJvb3QpfS0ke3N0YWJsZUhhc2godmF1bHRSb290KX1gIDogJ3ZhdWx0J1xuICAgIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnLCAndmF1bHRzJywgbmFtZSlcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHNoRG9ja1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBEc2hEb2NrU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTXG4gIHByaXZhdGUgcHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXM6IFNlcnZlclN0YXR1cyA9IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgcHJpdmF0ZSBzdGFydGluZyA9IGZhbHNlXG4gIHByaXZhdGUgc3RhdHVzQmFyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXNMaXN0ZW5lcnMgPSBuZXcgU2V0PCgpID0+IHZvaWQ+KClcbiAgLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE5OVx1NTE2NVx1OTYzMlx1NjI5NiB0aW1lclx1RkYwOFx1N0E5N1x1NTNFMyBmb2N1cyBcdTUzRUZcdTgwRkRcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdUZGMDkgKi9cbiAgcHJpdmF0ZSBtYXJrZXJUaW1lcjogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gbnVsbFxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcblxuICBvdmVycmlkZSBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKVxuXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoRFNIX1dFQl9WSUVXX1RZUEUsIChsZWFmKSA9PiBuZXcgRHNoV2ViVmlldyhsZWFmLCB0aGlzKSlcblxuICAgIC8vIFx1NjI4QVwiXHU1RjUzXHU1MjREXHU3MTI2XHU3MEI5IHZhdWx0XCJcdThERThcdThGREJcdTdBMEJcdTU0NEFcdThCQzkgRFNIIFx1NEZBN1x1RkYxQVx1NjcyQ1x1N0E5N1x1NTNFM1x1NjI1M1x1NUYwMFx1RkYwOG9ubG9hZFx1RkYwOVx1NEUwRVx1NkJDRlx1NkIyMVx1ODNCN1x1NUY5N1xuICAgIC8vIFx1NzEyNlx1NzBCOVx1NjVGNlx1NTIzN1x1NjVCMFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1MzAwMlx1NTkxQVx1N0E5N1x1NTNFM1x1NTczQVx1NjY2Rlx1NEUwQlx1NkJDRlx1NEUyQVx1N0E5N1x1NTNFM1x1OTBGRFx1NzJFQ1x1N0FDQlx1NTJBMFx1OEY3RFx1NjcyQ1x1NjNEMlx1NEVGNlx1RkYwQ1x1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1xuICAgIC8vIFx1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NTM3M1wiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXHU1NzI4XHU3NzBCXHU3Njg0IHZhdWx0XCJcdTMwMDJcbiAgICB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgIGNvbnN0IG9uV2luZG93Rm9jdXMgPSAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uV2luZG93Rm9jdXMpXG4gICAgdGhpcy5yZWdpc3RlcigoKSA9PiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbldpbmRvd0ZvY3VzKSlcbiAgICAvLyBcdTg4NjVcdTUxNDVcdTRGRTFcdTUzRjdcdUZGMUFcdTc1MjhcdTYyMzdcdTU3MjhcdTdBOTdcdTUzRTNcdTUxODVcdTUyMDdcdTYzNjJcdTY1ODdcdTRFRjYvXHU1RTAzXHU1QzQwXHU1RkM1XHU3MTM2XHU4OUU2XHU1M0QxIGFjdGl2ZS1sZWFmLWNoYW5nZVx1RkYwQ1xuICAgIC8vIFx1ODk4Nlx1NzZENiB3aW5kb3cgZm9jdXMgXHU0RThCXHU0RUY2XHU0RTBEXHU2RDNFXHU1M0QxXHU3Njg0XHU1NzNBXHU2NjZGXHUzMDAyXHU5NjMyXHU2Mjk2XHU1MTcxXHU3NTI4XHU0RTAwXHU0RTJBIHRpbWVyXHVGRjBDXHU0RTkyXHU0RTBEXHU1RTcyXHU2MjcwXHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignYWN0aXZlLWxlYWYtY2hhbmdlJywgKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCkpKVxuXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdib3QnLCAnRFNIIERvY2tcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0YnLCAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCkpXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1kc2gtcGFuZWwnLFxuICAgICAgbmFtZTogJ1x1NjI1M1x1NUYwMCBEU0ggXHU5NzYyXHU2NzdGJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdGFydC1kc2gnLFxuICAgICAgbmFtZTogJ1x1NTQyRlx1NTJBOCBEU0ggXHU2NzBEXHU1MkExJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc3RhcnQoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N0b3AtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTUwNUNcdTZCNjIgRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0b3AoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLWJyb3dzZXInLFxuICAgICAgbmFtZTogJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCBEU0gnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuSW5Ccm93c2VyKCksXG4gICAgfSlcblxuICAgIHRoaXMuc3RhdHVzQmFyRWwgPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKVxuICAgIHRoaXMucmVuZGVyU3RhdHVzQmFyKClcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IERzaERvY2tTZXR0aW5nc1RhYih0aGlzLmFwcCwgdGhpcykpXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5hdXRvc3RhcnQpIHtcbiAgICAgIHZvaWQgdGhpcy5zdGFydCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0b3BwZWQnIH0pXG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgb251bmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zdG9wKClcbiAgICB0aGlzLnN0YXR1c0xpc3RlbmVycy5jbGVhcigpXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3MkI2XHU2MDAxXG5cbiAgZ2V0U3RhdHVzKCk6IFNlcnZlclN0YXR1cyB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzXG4gIH1cblxuICBnZXQgY2hpbGRQcm9jKCk6IENoaWxkUHJvY2VzcyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLnByb2NcbiAgfVxuXG4gIGdldCBiYXNlVXJsKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcG9ydCA9IHRoaXMuc2V0dGluZ3MucG9ydFxuICAgIHJldHVybiBgaHR0cDovLyR7dGhpcy5zZXR0aW5ncy5ob3N0fToke3BvcnR9L2BcbiAgfVxuXG4gIG9uU3RhdHVzQ2hhbmdlKGZuOiAoKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuYWRkKGZuKVxuICAgIHJldHVybiAoKSA9PiB0aGlzLnN0YXR1c0xpc3RlbmVycy5kZWxldGUoZm4pXG4gIH1cblxuICBwcml2YXRlIHNldFN0YXR1cyhzdGF0dXM6IFNlcnZlclN0YXR1cyk6IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIGZvciAoY29uc3QgZm4gb2YgdGhpcy5zdGF0dXNMaXN0ZW5lcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZuKClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXR1c0JhcigpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc3RhdHVzQmFyRWwpIHJldHVyblxuICAgIGNvbnN0IHMgPSB0aGlzLnN0YXR1c1xuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KGBEU0g6ICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICdcdUZGMDhcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMDknIDogJyd9YClcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNicpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU2NzJBXHU4RkQwXHU4ODRDJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcblxuICAvKiogXHU4QkZCXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgY2xlYXJUaW1lb3V0KHRoaXMubWFya2VyVGltZXIpXG4gICAgdGhpcy5tYXJrZXJUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5tYXJrZXJUaW1lciA9IG51bGxcbiAgICAgIGNvbnN0IGluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgaWYgKGluZm8pIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKGluZm8ubmFtZSwgaW5mby5wYXRoKVxuICAgIH0sIDMwMClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcblxuICAvKiogXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTYzMDJcdTYzQTVcdUZGMUJcdTU0MjZcdTUyMTkgc3Bhd24gXHU1Qjk4XHU2NUI5IGRzaCB3ZWIgKi9cbiAgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTxTZXJ2ZXJTdGF0dXM+IHtcbiAgICBpZiAodGhpcy5zdGFydGluZykgcmV0dXJuIHRoaXMuc3RhdHVzXG4gICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJykgcmV0dXJuIHRoaXMuc3RhdHVzXG4gICAgdGhpcy5zdGFydGluZyA9IHRydWVcbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdGFydGluZycgfSlcbiAgICB0cnkge1xuICAgICAgY29uc3QgdmF1bHRSb290ID0gKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgICAgIGNvbnN0IGRzaEhvbWUgPSBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydDogdGhpcy5zZXR0aW5ncy5wb3J0LFxuICAgICAgICBob3N0OiB0aGlzLnNldHRpbmdzLmhvc3QsXG4gICAgICAgIGRzaEhvbWUsXG4gICAgICAgIHVzZUVtYmVkZGVkTm9kZTogdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUsXG4gICAgICAgIC8vIFx1NTQyRlx1NTJBOFx1NjVGNlx1NjI4QVx1NUY1M1x1NTI0RCB2YXVsdCBcdTRFMDBcdTVFNzZcdTZDRThcdTUxNjVcdTVCNTBcdThGREJcdTdBMEIgZW52XHVGRjBDXHU0RjVDXHU0RTNBXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU0RTRCXHU1OTE2XHU3Njg0XHU3QjJDXHU0RThDXHU5MDFBXHU5MDUzXG4gICAgICAgIC8vIFx1RkYwOFx1NjcwRFx1NTJBMVx1NTIxQVx1NjJDOVx1OEQ3N1x1MzAwMVx1NjgwN1x1OEJCMFx1NUMxQVx1NjcyQVx1NTIzN1x1NjVCMFx1NjVGNlx1NTE1Q1x1NUU5NVx1RkYwOVx1MzAwMlxuICAgICAgICBlbnY6IHZhdWx0SW5mb1xuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfTkFNRTogdmF1bHRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgIERTSF9PQlNJRElBTl9WQVVMVF9QQVRIOiB2YXVsdEluZm8ucGF0aCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9LFxuICAgICAgfSlcbiAgICAgIHRoaXMucHJvYyA9IHJlc3VsdC5wcm9jID8/IG51bGxcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiByZXN1bHQucHJvYykge1xuICAgICAgICB0aGlzLmhvb2tDaGlsZExvZ3MocmVzdWx0LnByb2MpXG4gICAgICB9XG4gICAgICB0aGlzLnNldFN0YXR1cyhyZXN1bHQuc3RhdHVzKVxuICAgICAgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke3Jlc3VsdC5zdGF0dXMubWVzc2FnZX1gKVxuICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhcmVzdWx0LnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggV2ViIFx1NURGMlx1NUMzMVx1N0VFQTogJHtyZXN1bHQuc3RhdHVzLnVybH1gKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IG1zZyB9KVxuICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NUYwMlx1NUUzODogJHttc2d9YClcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXR1c1xuICB9XG5cbiAgYXN5bmMgc3RvcCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICBpZiAodGhpcy5wcm9jKSB7XG4gICAgICBhd2FpdCBzdG9wUHJvY2Vzcyh0aGlzLnByb2MpXG4gICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgfVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0b3BwZWQnIH0pXG4gIH1cblxuICBwcml2YXRlIGhvb2tDaGlsZExvZ3MocHJvYzogQ2hpbGRQcm9jZXNzKTogdm9pZCB7XG4gICAgcHJvYy5zdGRvdXQ/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS5pbmZvKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUud2FybignW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhdGhpcy5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBOiBjb2RlPSR7Y29kZX0gc2lnbmFsPSR7c2lnbmFsID8/ICcnfWAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tkc2gtZG9ja10gXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGJywgZXJyKVxuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRjogJHtlcnIubWVzc2FnZX1gIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKiBcdTYzQTJcdTZENEJcdTRGRTFcdTYwNkZcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZGV0ZWN0SW5mbygpOiB7IGRzaEJpbjogc3RyaW5nIHwgbnVsbDsgZHNoTm90ZXM6IHN0cmluZ1tdOyBub2RlTm90ZXM6IHN0cmluZ1tdIH0ge1xuICAgIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbih0aGlzLnNldHRpbmdzLmRzaEJpbilcbiAgICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4odGhpcy5zZXR0aW5ncy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKVxuICAgIHJldHVybiB7XG4gICAgICBkc2hCaW46IGZvdW5kLmJpbixcbiAgICAgIGRzaE5vdGVzOiBmb3VuZC5ub3RlcyxcbiAgICAgIG5vZGVOb3Rlczogbm9kZS5ub3RlcyxcbiAgICB9XG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0IERTSF9IT01FXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGVmZmVjdGl2ZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSAodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH0pLmdldEJhc2VQYXRoPy4oKVxuICAgIHJldHVybiBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGRhdGEgPz8ge30pXG4gICAgLy8gXHU2NUU3XHU3MjQ4XHVGRjA4ZHNoLWhvc3QgVjAuMVx1RkYwOVx1OEJCRVx1N0Y2RVx1OEZDMVx1NzlGQlx1RkYxQWRzaEhvbWUgXHU1QjU3XHU3QjI2XHU0RTMyIFx1MjE5MiBjdXN0b20gXHU2QTIxXHU1RjBGXG4gICAgY29uc3QgbGVnYWN5ID0gZGF0YSBhcyB7IGRzaEhvbWU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZFxuICAgIGlmIChsZWdhY3k/LmRzaEhvbWUgJiYgdHlwZW9mIGxlZ2FjeS5kc2hIb21lID09PSAnc3RyaW5nJyAmJiBsZWdhY3kuZHNoSG9tZS50cmltKCkpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSAnY3VzdG9tJ1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lID0gbGVnYWN5LmRzaEhvbWUudHJpbSgpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBVSVxuXG4gIGFzeW5jIG9wZW5QYW5lbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHBcbiAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERTSF9XRUJfVklFV19UWVBFKVxuICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IGxlYXZlc1swXSA/PyBudWxsXG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSlcbiAgICAgIGlmICghbGVhZikgcmV0dXJuXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9XG4gICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZilcbiAgfVxuXG4gIGFzeW5jIG9wZW5JbkJyb3dzZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBzaGVsbCB9ID0gcmVxdWlyZSgnZWxlY3Ryb24nKSBhcyB7IHNoZWxsOiB7IG9wZW5FeHRlcm5hbCh1cmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gfSB9XG4gICAgYXdhaXQgc2hlbGwub3BlbkV4dGVybmFsKHRoaXMuYmFzZVVybClcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhPYnNpZGlhbiBwb3BvdXRcdUZGMDlcdUZGMUFEU0ggXHU5NzYyXHU2NzdGXHU4RkRCXHU1MTY1XHU3MkVDXHU3QUNCIEJyb3dzZXJXaW5kb3cgPVxuICAgKiBcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTRFMEUgT2JzaWRpYW4gXHU0RTNCXHU3QTk3XHU1M0UzXHU5Njk0XHU3OUJCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHU2ODA3XHU3QjdFXHU5ODc1XHUzMDAyXG4gICAqL1xuICBhc3luYyBvcGVuUG9wb3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLm9wZW5Qb3BvdXRMZWFmKClcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICBuZXcgTm90aWNlKGBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdTU5MzFcdThEMjU6ICR7bXNnfWApXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBsYXVuY2hlci50cyBcdTIwMTRcdTIwMTQgXHU3RUFGXHU1NDJGXHU1MkE4XHU5MDNCXHU4RjkxXHVGRjA4XHU5NkY2IE9ic2lkaWFuIFx1NEY5RFx1OEQ1Nlx1RkYwQ1x1NTNFRlx1NzJFQ1x1N0FDQlx1NTE5Mlx1NzBERlx1NkQ0Qlx1OEJENVx1RkYwOVx1MzAwMlxuICpcbiAqIFx1ODA0Q1x1OEQyM1x1RkYxQVx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYgXHUyMTkyIHNwYXduIGBkc2ggd2ViYFxuICogXHVGRjA4MTI3LjAuMC4xOjxwb3J0Plx1RkYwOVx1MjE5MiBcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUEgXHUyMTkyIFx1NTA1Q1x1NkI2Mlx1MzAwMlxuICpcbiAqIFx1NTE3M1x1OTUyRVx1NEU4Qlx1NUI5RVx1RkYwOFx1NURGMlx1NTcyOFx1NUI5OFx1NjVCOSBAZGVlcHNlZWstYWkvZHNoQDAuMS4wLXJjLjYgXHU0RTBBXHU5QThDXHU4QkMxXHVGRjA5XHVGRjFBXG4gKiAtIGBub2RlIDxkc2g+L2xpYi9iaW4uanMgd2ViIC0taG9zdCAxMjcuMC4wLjEgLS1wb3J0IDxwb3J0PmAgXHU1MzczXHU1Qjk4XHU2NUI5IFdlYiBVSVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTQgaG9zdD0xMjcuMC4wLjFcdTMwMDFwb3J0PTMwODBcdUZGMDhcdTUzRUZcdTg5ODZcdTc2RDZcdUZGMDlcdUZGMUJcbiAqIC0gXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU4MUVBXHU1MkE4XHU1MjFEXHU1OUNCXHU1MzE2ICREU0hfSE9NRS9wcm9maWxlcy93ZWJcdUZGMDhidW5kbGVzID0gZHNoLWJhc2UgKyBkc2gtd2ViLWFwcFx1RkYwOVx1RkYwQ1xuICogICBcdTZBMjFcdTU3NTdcdTg5RTNcdTY3OTBcdThENzAgJERTSF9IT01FL3Byb2ZpbGVzL25vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTdCMjZcdTUzRjdcdTk0RkVcdTYzQTVcdUZGMENcdTY1RTBcdTk3MDAgcG5wbS9cdTgwNTRcdTdGNTFcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0XHU5MTREXHU3RjZFXHU0RTBCIFNRTGl0ZVx1RkYwOG5vZGU6c3FsaXRlXHVGRjBDXHU5NzAwIE5vZGUgXHUyMjY1MjIuNVx1RkYwOVx1NEUwRFx1NEYxQVx1NjI1M1x1NUYwMFx1RkYwOG9wZW5BdDogbmV2ZXJcdUZGMDlcdUZGMENcbiAqICAgXHU1NkUwXHU2QjY0IE5vZGUgMjArIFx1NEU1Rlx1ODBGRFx1OEREMVx1OUVEOFx1OEJBNCB3ZWIgcHJvZmlsZVx1RkYxQlx1NTQyRlx1NzUyOFx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NjVGNlx1NjI0RFx1OTcwMFx1ODk4MSBOb2RlIFx1MjI2NTIyLjVcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBzcGF3biwgc3Bhd25TeW5jLCB0eXBlIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCdcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5leHBvcnQgY29uc3QgRFNIX1JFTEFUSVZFX0JJTiA9IHBhdGguam9pbignQGRlZXBzZWVrLWFpJywgJ2RzaCcsICdsaWInLCAnYmluLmpzJylcblxuLyoqIE5vZGUgXHU0RTNCXHU3MjQ4XHU2NzJDXHU1M0Y3XHU2QkQ0XHU4RjgzXHVGRjFBbm9kZTpzcWxpdGUgXHU5NzAwXHU4OTgxIFx1MjI2NTIyLjVcdUZGMDhcdTRFQzVcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTUyOUZcdTgwRkRcdTc1MjhcdTUyMzBcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBOT0RFX1NRTElURV9NSU5fTUFKT1IgPSAyMlxuXG4vKiogXHU3QTMzXHU1QjlBXHU3N0VEXHU1NEM4XHU1RTBDXHVGRjA4ZGpiMlx1RkYwOVx1RkYwQ1x1NzUyOFx1NEU4RSB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdTZEODhcdTZCNjdcdUZGMENcdTkwN0ZcdTUxNERcdTRFMkRcdTY1ODdcdTU0MERcdTZFMDVcdTZEMTdcdTc4QjBcdTY0OUUgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFibGVIYXNoKGlucHV0OiBzdHJpbmcsIGxlbiA9IDYpOiBzdHJpbmcge1xuICBsZXQgaCA9IDUzODFcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykgaCA9ICgoaCA8PCA1KSArIGggKyBpbnB1dC5jaGFyQ29kZUF0KGkpKSA+Pj4gMFxuICByZXR1cm4gaC50b1N0cmluZygzNikucGFkU3RhcnQobGVuLCAnMCcpLnNsaWNlKDAsIGxlbilcbn1cblxuLyoqIFx1NTNFRlx1OEJGQlx1NzY4NCB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdUZGMDhcdTRGRERcdTc1NTkgVW5pY29kZSBcdTVCNTdcdTZCQ0RcdTY1NzBcdTVCNTdcdUZGMENcdTUxNzZcdTRGNTlcdThGNkMgLVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOSAndmF1bHQnICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZVZhdWx0TmFtZSh2YXVsdFJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNsZWFuZWQgPSBwYXRoXG4gICAgLmJhc2VuYW1lKHZhdWx0Um9vdClcbiAgICAucmVwbGFjZSgvW15cXHB7TH1cXHB7Tn1fLV0rL2d1LCAnLScpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgJycpXG4gIHJldHVybiAoY2xlYW5lZCB8fCAndmF1bHQnKS5zbGljZSgwLCA0MClcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hPcHRpb25zIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1x1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbj86IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTkgKi9cbiAgbm9kZUJpbj86IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydD86IG51bWJlclxuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTQgMTI3LjAuMC4xXHVGRjBDXHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q/OiBzdHJpbmdcbiAgLyoqICREU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERC9cdTVCQzZcdTk0QTUvXHU2QTIxXHU1NzhCXHU5MTREXHU3RjZFXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjFCXHU5RUQ4XHU4QkE0IDx2YXVsdD4vLmRzaFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlPzogYm9vbGVhblxuICAvKiogXHU1QzMxXHU3RUVBXHU3QjQ5XHU1Rjg1XHU0RTBBXHU5NjUwXHVGRjA4XHU5RUQ4XHU4QkE0IDEyMHNcdUZGMDkgKi9cbiAgdGltZW91dE1zPzogbnVtYmVyXG4gIC8qKiBcdTk2NDRcdTUyQTBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgKi9cbiAgZW52PzogTm9kZUpTLlByb2Nlc3NFbnZcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZE5vZGUge1xuICAvKiogXHU3NTI4XHU0RThFIHNwYXduIFx1NzY4NCBub2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNiAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTYyOEEgT2JzaWRpYW4gXHU3Njg0IEVsZWN0cm9uIFx1NEU4Q1x1OEZEQlx1NTIzNlx1NUY1MyBOb2RlIFx1NzUyOCAqL1xuICB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhblxuICAvKiogXHU4QkU1IE5vZGUgXHU3Njg0IG1ham9yIFx1NzI0OFx1NjcyQ1x1RkYwOFx1NjNBMlx1NkQ0Qlx1NTkzMVx1OEQyNVx1NEUzQSAwXHVGRjA5ICovXG4gIG5vZGVNYWpvcjogbnVtYmVyXG4gIC8qKiBcdTYzQTJcdTZENEIvXHU1MUIzXHU3QjU2XHU4QkY0XHU2NjBFXHVGRjA4XHU0RjlCXHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIG5vdGVzOiBzdHJpbmdbXVxufVxuXG5leHBvcnQgdHlwZSBTZXJ2ZXJTdGF0dXMgPVxuICB8IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgfCB7IGtpbmQ6ICdzdGFydGluZycgfVxuICB8IHsga2luZDogJ3J1bm5pbmcnOyBwb3J0OiBudW1iZXI7IGhvc3Q6IHN0cmluZzsgdXJsOiBzdHJpbmc7IGF0dGFjaGVkOiBib29sZWFuIH1cbiAgfCB7IGtpbmQ6ICdlcnJvcic7IG1lc3NhZ2U6IHN0cmluZyB9XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU4REVGXHU1Rjg0XHU1QjlBXHU0RjREXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFx1NjI4QVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1NTE2NVx1NTNFM1x1ODlDNFx1ODMwM1x1NTMxNlx1RkYxQVx1NjMwN1x1NTQxMSBiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTkwRkRcdTYzQTVcdTUzRDcgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVEc2hCaW4oaW5wdXQ6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCFpbnB1dCkgcmV0dXJuIG51bGxcbiAgY29uc3QgcCA9IGlucHV0LnRyaW0oKVxuICBpZiAoIXApIHJldHVybiBudWxsXG4gIGNvbnN0IGV4cGFuZGVkID0gcC5yZXBsYWNlKC9efig/PSR8XFwvfFxcXFwpLywgb3MuaG9tZWRpcigpKVxuICBjb25zdCBhYnMgPSBwYXRoLmlzQWJzb2x1dGUoZXhwYW5kZWQpID8gcGF0aC5ub3JtYWxpemUoZXhwYW5kZWQpIDogcGF0aC5yZXNvbHZlKGV4cGFuZGVkKVxuICB0cnkge1xuICAgIGNvbnN0IHN0ID0gZnMuc3RhdFN5bmMoYWJzKVxuICAgIGlmIChzdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4oYWJzLCAnbGliJywgJ2Jpbi5qcycpXG4gICAgICByZXR1cm4gZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpID8gY2FuZGlkYXRlIDogbnVsbFxuICAgIH1cbiAgICBpZiAoc3QuaXNGaWxlKCkpIHJldHVybiBhYnNcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKiogXHU1RTM4XHU4OUMxIG5wbSBcdTUxNjhcdTVDNDAgbm9kZV9tb2R1bGVzIFx1NjgzOVx1RkYwOFx1NjMwOVx1NUU3M1x1NTNGMFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdsb2JhbE1vZHVsZVJvb3RzKCk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgcm9vdHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKHByb2Nlc3MuZW52LkRTSF9HTE9CQUxfTU9EVUxFUykgcm9vdHMucHVzaChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpXG4gIGNvbnN0IG5wbVJvb3QgPSBzcGF3blN5bmMoJ25wbScsIFsncm9vdCcsICctZyddLCB7XG4gICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICB0aW1lb3V0OiAxMF8wMDAsXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG4gIGlmIChucG1Sb290LnN0YXR1cyA9PT0gMCAmJiBucG1Sb290LnN0ZG91dCkge1xuICAgIGNvbnN0IGxpbmUgPSBucG1Sb290LnN0ZG91dC50cmltKCkuc3BsaXQoL1xccj9cXG4vKVswXVxuICAgIGlmIChsaW5lKSByb290cy5wdXNoKGxpbmUpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgcm9vdHMucHVzaCgnL29wdC9ob21lYnJldy9saWIvbm9kZV9tb2R1bGVzJywgJy91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcycpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2xpbnV4Jykge1xuICAgIHJvb3RzLnB1c2goJy91c3IvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2xpYicsICdub2RlX21vZHVsZXMnKSlcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgY29uc3QgYXBwRGF0YSA9IHByb2Nlc3MuZW52LkFQUERBVEFcbiAgICBpZiAoYXBwRGF0YSkgcm9vdHMucHVzaChwYXRoLmpvaW4oYXBwRGF0YSwgJ25wbScsICdub2RlX21vZHVsZXMnKSlcbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KHJvb3RzKV1cbn1cblxuLyoqXG4gKiBcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTUxNjVcdTUzRTNcdTMwMDJcdTRGMThcdTUxNDhcdTdFQTdcdUZGMUFcbiAqIDEuIFx1NjYzRVx1NUYwRlx1NEYyMFx1NTE2NVx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1RkYwOVx1MjE5MiAyLiBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgRFNIX0JJTiBcdTIxOTIgMy4gbnBtIHJvb3QgLWcgXHUyMTkyIDQuIFx1NUUzOFx1ODlDMVx1NTE2OFx1NUM0MFx1NjgzOVx1MzAwMlxuICogXHU2NzJBXHU2MjdFXHU1MjMwXHU2NUY2IGJpbiBcdTRFM0EgbnVsbFx1RkYwQ25vdGVzIFx1OEJGNFx1NjYwRVx1NTM5Rlx1NTZFMFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURzaEJpbihleHBsaWNpdD86IHN0cmluZyk6IHsgYmluOiBzdHJpbmcgfCBudWxsOyBub3Rlczogc3RyaW5nW10gfSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gbm9ybWFsaXplRHNoQmluKGV4cGxpY2l0ID8/IHByb2Nlc3MuZW52LkRTSF9CSU4pXG4gIGlmIChleHBsaWNpdEJpbiAmJiBmcy5leGlzdHNTeW5jKGV4cGxpY2l0QmluKSkge1xuICAgIHJldHVybiB7IGJpbjogZXhwbGljaXRCaW4sIG5vdGVzOiBbYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NDogJHtleHBsaWNpdEJpbn1gXSB9XG4gIH1cbiAgaWYgKGV4cGxpY2l0KSBub3Rlcy5wdXNoKGBcdTY2M0VcdTVGMEZcdThERUZcdTVGODRcdTRFMERcdTVCNThcdTU3Mjg6ICR7ZXhwbGljaXR9YClcblxuICBmb3IgKGNvbnN0IHJvb3Qgb2YgZ2xvYmFsTW9kdWxlUm9vdHMoKSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihyb290LCBEU0hfUkVMQVRJVkVfQklOKVxuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHJldHVybiB7IGJpbjogY2FuZGlkYXRlLCBub3RlczogWy4uLm5vdGVzLCBgXHU0RUNFXHU1MTY4XHU1QzQwXHU2QTIxXHU1NzU3XHU2ODM5XHU1M0QxXHU3M0IwOiAke2NhbmRpZGF0ZX1gXSB9XG4gICAgfVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NjcyQVx1NjI3RVx1NTIzMCBkc2ggXHU1Qjg5XHU4OEM1XHUzMDAyXHU4QkY3XHU1MTQ4XHU2MjY3XHU4ODRDOiBucG0gaW5zdGFsbCAtZyBAZGVlcHNlZWstYWkvZHNoXHVGRjBDXHU2MjE2XHU1NzI4XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IGRzaCBcdThERUZcdTVGODQnKVxuICByZXR1cm4geyBiaW46IG51bGwsIG5vdGVzIH1cbn1cblxuLyoqXG4gKiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjZcdTMwMDJcbiAqIFx1OUVEOFx1OEJBNFx1OTg3QVx1NUU4Rlx1RkYxQVx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NCBcdTIxOTIgXHU3Q0ZCXHU3RURGIGBub2RlYFx1RkYwOFBBVEhcdUZGMENcdTY3MDBcdTdBMzNcdTVCOUFcdUZGMDlcdTMwMDJcbiAqIEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSBcdTVCOUVcdTZENEJcdTRGMUFcdTYzMDJcdThENzdcdUZGMDhPYnNpZGlhbiBcdTRFOENcdThGREJcdTUyMzZcbiAqIFx1NEUwRFx1NjMwOVx1NjY2RVx1OTAxQSBFbGVjdHJvbiBcdThCRURcdTRFNDlcdTU0Q0RcdTVFOTRcdUZGMDlcdUZGMENcdTU2RTBcdTZCNjRcdTRFQzVcdTVGNTMgdXNlRW1iZWRkZWROb2RlIFx1NjYzRVx1NUYwRlx1NUYwMFx1NTQyRlx1NjVGNlx1NjI0RFx1NUMxRFx1OEJENVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU5vZGVCaW4oZXhwbGljaXQ/OiBzdHJpbmcsIGVtYmVkZGVkTm9kZVZlcnNpb24/OiBzdHJpbmcsIHVzZUVtYmVkZGVkID0gZmFsc2UpOiBSZXNvbHZlZE5vZGUge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IGV4cGxpY2l0Py50cmltKCkgfHwgcHJvY2Vzcy5lbnYuRFNIX05PREVcbiAgaWYgKGV4cGxpY2l0QmluKSB7XG4gICAgbm90ZXMucHVzaChgXHU0RjdGXHU3NTI4XHU2NjNFXHU1RjBGIE5vZGU6ICR7ZXhwbGljaXRCaW59YClcbiAgICByZXR1cm4geyBub2RlQmluOiBleHBsaWNpdEJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbiAgfVxuICBpZiAodXNlRW1iZWRkZWQgJiYgcHJvY2Vzcy5leGVjUGF0aCAmJiBlbWJlZGRlZE5vZGVWZXJzaW9uKSB7XG4gICAgY29uc3QgbWFqb3IgPSBOdW1iZXIoZW1iZWRkZWROb2RlVmVyc2lvbi5zcGxpdCgnLicpWzBdKSB8fCAwXG4gICAgaWYgKG1ham9yID49IE5PREVfU1FMSVRFX01JTl9NQUpPUikge1xuICAgICAgbm90ZXMucHVzaChgXHU0RjdGXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn1cdUZGMDhFTEVDVFJPTl9SVU5fQVNfTk9ERVx1RkYwOWApXG4gICAgICByZXR1cm4geyBub2RlQmluOiBwcm9jZXNzLmV4ZWNQYXRoLCB1c2VFbGVjdHJvbkFzTm9kZTogdHJ1ZSwgbm9kZU1ham9yOiBtYWpvciwgbm90ZXMgfVxuICAgIH1cbiAgICBub3Rlcy5wdXNoKGBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSAke2VtYmVkZGVkTm9kZVZlcnNpb259IDwgJHtOT0RFX1NRTElURV9NSU5fTUFKT1J9XHVGRjBDXHU2NUUwXHU2Q0Q1XHU1NDJGXHU3NTI4YClcbiAgfVxuICBub3Rlcy5wdXNoKCdcdTRGN0ZcdTc1MjggUEFUSCBcdTRFMkRcdTc2ODQgbm9kZVx1RkYwOFx1N0NGQlx1N0VERiBOb2RlXHVGRjBDXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5JylcbiAgcmV0dXJuIHsgbm9kZUJpbjogJ25vZGUnLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1N0FFRlx1NTNFM1x1NjNBMlx1NkQ0Qlx1NEUwRVx1N0I0OVx1NUY4NVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTVGNTNcdTUyNERcdThGRDBcdTg4NENcdTczQUZcdTU4ODNcdUZGMDhPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMDlcdTgxRUFcdTVFMjZcdTc2ODQgTm9kZSBcdTcyNDhcdTY3MkNcdUZGMUJcdTY1RTBcdTUyMTkgdW5kZWZpbmVkICovXG5leHBvcnQgZnVuY3Rpb24gZW1iZWRkZWROb2RlVmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIGNvbnN0IHYgPSAocHJvY2Vzcy52ZXJzaW9ucyBhcyB7IG5vZGU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/Lm5vZGVcbiAgICByZXR1cm4gdiB8fCB1bmRlZmluZWRcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogXHU3QUVGXHU1M0UzXHU2NjJGXHU1NDI2XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHUzMDAyXG4gKiBcdTc1Mjggbm9kZTpodHRwIFx1ODAwQ1x1OTc1RVx1NkQ0Rlx1ODlDOFx1NTY2OCBmZXRjaFx1RkYxQU9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1NzY4NCBDU1AgXHU0RjFBXHU2MkU2XHU2MjJBXG4gKiBcdTVCRjkgaHR0cDovLzEyNy4wLjAuMSBcdTc2ODQgZmV0Y2hcdUZGMENcdTVCRkNcdTgxRjRcIlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVwiXHU4QkVGXHU1MjI0XHU0RTNBXCJcdTZDQTFcdTY3MDlcIlx1MzAwMlxuICogTm9kZSBcdTc2ODQgaHR0cCBcdTZBMjFcdTU3NTdcdTRFMERcdTUzRDdcdTk4NzVcdTk3NjIgQ1NQIFx1N0VBNlx1Njc1Rlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQb3J0VXAoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDE1MDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgcmVxID0gaHR0cC5nZXQoeyBob3N0LCBwb3J0LCBwYXRoOiAnLycsIHRpbWVvdXQ6IHRpbWVvdXRNcyB9LCAocmVzKSA9PiB7XG4gICAgICByZXMucmVzdW1lKClcbiAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICB9KVxuICAgIHJlcS5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIHJlcS5kZXN0cm95KClcbiAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgfSlcbiAgICByZXEub24oJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZShmYWxzZSkpXG4gIH0pXG59XG5cbi8qKiBcdThGNkVcdThCRTJcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUFcdUZGMUJcdThEODVcdTY1RjZcdThGRDRcdTU2REUgZmFsc2UgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yUmVhZHkoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDEyMF8wMDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVhZGxpbmUgPSBEYXRlLm5vdygpICsgdGltZW91dE1zXG4gIGZvciAoOzspIHtcbiAgICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCwgMTUwMCkpIHJldHVybiB0cnVlXG4gICAgaWYgKERhdGUubm93KCkgPiBkZWFkbGluZSkgcmV0dXJuIGZhbHNlXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHNldFRpbWVvdXQociwgNTAwKSlcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF1bmNoZWRTZXJ2ZXIge1xuICBwcm9jOiBDaGlsZFByb2Nlc3NcbiAgdXJsOiBzdHJpbmdcbiAgLyoqIHRydWUgPSBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMENcdTY3MkFcdTY1QjBcdThENzdcdThGREJcdTdBMEIgKi9cbiAgYXR0YWNoZWQ6IGJvb2xlYW5cbn1cblxuLyoqIFx1NTQyRlx1NTJBOFx1NUI5OFx1NjVCOSBkc2ggd2ViXHUzMDAyXHU4QzAzXHU3NTI4XHU2NUI5XHU4RDFGXHU4RDIzXHU3NkQxXHU1NDJDIHByb2MgXHU3Njg0IGV4aXQvZXJyb3JcdTMwMDIgKi9cbmV4cG9ydCBmdW5jdGlvbiBsYXVuY2hEc2gob3B0czogTGF1bmNoT3B0aW9ucyAmIHsgZHNoQmluOiBzdHJpbmc7IG5vZGVCaW46IHN0cmluZzsgdXNlRWxlY3Ryb25Bc05vZGU6IGJvb2xlYW4gfSk6IENoaWxkUHJvY2VzcyB7XG4gIGNvbnN0IHBvcnQgPSBvcHRzLnBvcnQgPz8gMzA4MFxuICBjb25zdCBob3N0ID0gb3B0cy5ob3N0ID8/ICcxMjcuMC4wLjEnXG4gIGNvbnN0IGFyZ3MgPSBbb3B0cy5kc2hCaW4sICd3ZWInLCAnLS1ob3N0JywgaG9zdCwgJy0tcG9ydCcsIFN0cmluZyhwb3J0KV1cbiAgY29uc3QgZW52OiBOb2RlSlMuUHJvY2Vzc0VudiA9IHtcbiAgICAuLi4ob3B0cy5lbnYgPz8gcHJvY2Vzcy5lbnYgPz8ge30pLFxuICAgIERTSF9IT01FOiBvcHRzLmRzaEhvbWUsXG4gIH1cbiAgaWYgKG9wdHMudXNlRWxlY3Ryb25Bc05vZGUpIGVudi5FTEVDVFJPTl9SVU5fQVNfTk9ERSA9ICcxJ1xuICBjb25zb2xlLmluZm8oYFtkc2gtaG9zdF0gc3Bhd24gJHtvcHRzLm5vZGVCaW59ICR7YXJncy5qb2luKCcgJyl9YClcbiAgY29uc29sZS5pbmZvKGBbZHNoLWhvc3RdIERTSF9IT01FPSR7b3B0cy5kc2hIb21lfWApXG4gIHJldHVybiBzcGF3bihvcHRzLm5vZGVCaW4sIGFyZ3MsIHtcbiAgICBlbnYsXG4gICAgc3RkaW86IFsnaWdub3JlJywgJ3BpcGUnLCAncGlwZSddLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxufVxuXG4vKipcbiAqIFx1NEUwMFx1OTUyRVwiXHU3ODZFXHU0RkREXHU4RkQwXHU4ODRDXCJcdUZGMUFcbiAqIDEuIFx1N0FFRlx1NTNFM1x1NURGMlx1NjcwOVx1NjcwRFx1NTJBMSBcdTIxOTIgXHU3NkY0XHU2M0E1XHU2MzAyXHU2M0E1XHVGRjA4YXR0YWNoZWRcdUZGMENcdTRFMERcdTY1QjBcdThENzdcdThGREJcdTdBMEJcdUZGMDlcdUZGMUJcbiAqIDIuIFx1NTQyNlx1NTIxOVx1NUI5QVx1NEY0RCBkc2ggXHUyMTkyIFx1OTAwOVx1NjJFOSBOb2RlIFx1MjE5MiBzcGF3biBcdTIxOTIgXHU3QjQ5XHU1Rjg1XHU1QzMxXHU3RUVBXHVGRjFCXG4gKiAzLiBcdTVCNTBcdThGREJcdTdBMEJcdTc5RDJcdTkwMDBcdUZGMDhcdTU5ODJcdTdBRUZcdTUzRTNcdTg4QUJcdTUzNjAgRUFERFJJTlVTRVx1RkYwOVx1MjE5MiBcdTdBQ0JcdTUzNzNcdThGRDRcdTU2REVcdTc3MUZcdTVCOUVcdTk1MTlcdThCRUZcdUZGMENcdTRFMERcdTUxOERcdTc2RjJcdTdCNDlcdTMwMDJcbiAqIFx1OEZENFx1NTZERSBTZXJ2ZXJTdGF0dXNcdTMwMDJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZURzaFJ1bm5pbmcob3B0czogTGF1bmNoT3B0aW9ucyk6IFByb21pc2U8eyBzdGF0dXM6IFNlcnZlclN0YXR1czsgcHJvYz86IENoaWxkUHJvY2VzcyB9PiB7XG4gIGNvbnN0IHBvcnQgPSBvcHRzLnBvcnQgPz8gMzA4MFxuICBjb25zdCBob3N0ID0gb3B0cy5ob3N0ID8/ICcxMjcuMC4wLjEnXG4gIGNvbnN0IHVybCA9IGBodHRwOi8vJHtob3N0fToke3BvcnR9L2BcblxuICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiB0cnVlIH0gfVxuICB9XG5cbiAgY29uc3QgZm91bmQgPSByZXNvbHZlRHNoQmluKG9wdHMuZHNoQmluKVxuICBpZiAoIWZvdW5kLmJpbikge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBmb3VuZC5ub3Rlc1tmb3VuZC5ub3Rlcy5sZW5ndGggLSAxXSA/PyAnXHU2NUUwXHU2Q0Q1XHU1QjlBXHU0RjREIGRzaCBDTEknIH0gfVxuICB9XG4gIGNvbnN0IG5vZGUgPSByZXNvbHZlTm9kZUJpbihvcHRzLm5vZGVCaW4sIGVtYmVkZGVkTm9kZVZlcnNpb24oKSwgb3B0cy51c2VFbWJlZGRlZE5vZGUpXG4gIGNvbnN0IHByb2MgPSBsYXVuY2hEc2goeyAuLi5vcHRzLCBkc2hCaW46IGZvdW5kLmJpbiwgbm9kZUJpbjogbm9kZS5ub2RlQmluLCB1c2VFbGVjdHJvbkFzTm9kZTogbm9kZS51c2VFbGVjdHJvbkFzTm9kZSB9KVxuXG4gIC8vIFx1NjUzNlx1OTZDNiBzdGRlcnIgXHU1QzNFXHU5MEU4XHVGRjFBXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHU2NUY2XHU3RUQ5XHU1MUZBXHU3NzFGXHU1QjlFXHU1MzlGXHU1NkUwXHVGRjA4XHU1OTgyIEVBRERSSU5VU0VcdUZGMDlcbiAgbGV0IHN0ZGVyclRhaWwgPSAnJ1xuICBwcm9jLnN0ZGVycj8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiB7XG4gICAgc3RkZXJyVGFpbCA9IChzdGRlcnJUYWlsICsgZC50b1N0cmluZygpKS5zbGljZSgtNDAwMClcbiAgfSlcblxuICBjb25zdCBjaGlsZERpZWQgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gIH0pXG5cbiAgY29uc3QgcmVhZHkgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgIHdhaXRGb3JSZWFkeShob3N0LCBwb3J0LCBvcHRzLnRpbWVvdXRNcyA/PyAxMjBfMDAwKS50aGVuKCgpID0+IHRydWUpLFxuICAgIGNoaWxkRGllZC50aGVuKCgpID0+IGZhbHNlKSxcbiAgXSlcblxuICBpZiAocmVhZHkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiBmYWxzZSB9LCBwcm9jIH1cbiAgfVxuXG4gIC8vIFx1NUI1MFx1OEZEQlx1N0EwQlx1NURGMlx1OTAwMFx1NTFGQVx1RkYxQVx1NTE4RFx1NjNBMlx1NEUwMFx1NkIyMVx1N0FFRlx1NTNFM1x1RkYwOFx1NTNFRlx1ODBGRFx1ODhBQlx1NTIyQlx1NzY4NFx1NUI5RVx1NEY4Qlx1NjJBMlx1OEREMVx1N0VEMVx1NUI5QVx1RkYwOVx1RkYwQ1x1NTQyNlx1NTIxOVx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlxuICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiB0cnVlIH0sIHByb2MgfVxuICB9XG4gIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWwpIH0sIHByb2MgfVxufVxuXG4vKiogXHU0RUNFIHN0ZGVyciBcdTVDM0VcdTkwRThcdTYzRDBcdTcwQkNcdTUzRUZcdThCRkJcdTk1MTlcdThCRUYgKi9cbmZ1bmN0aW9uIHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBzdGRlcnJUYWlsLnNwbGl0KC9cXHI/XFxuLykuZmlsdGVyKEJvb2xlYW4pXG4gIGNvbnN0IGFkZHJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRUFERFJJTlVTRScpKVxuICBjb25zdCBlcnJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRXJyb3I6JykpXG4gIGlmIChhZGRyTGluZSkge1xuICAgIHJldHVybiAnXHU3QUVGXHU1M0UzXHU1REYyXHU4OEFCXHU1MzYwXHU3NTI4XHVGRjA4RUFERFJJTlVTRVx1RkYwOVx1MzAwMlx1OEJGN1x1NjM2Mlx1NEUwMFx1NEUyQVx1N0FFRlx1NTNFM1x1RkYwQ1x1NjIxNlx1NTE0OFx1NTA1Q1x1NjM4OVx1NTM2MFx1NzUyOFx1OEJFNVx1N0FFRlx1NTNFM1x1NzY4NFx1NjcwRFx1NTJBMVx1NTQwRVx1OTFDRFx1OEJENSdcbiAgfVxuICBpZiAoZXJyTGluZSkge1xuICAgIGNvbnN0IGNsZWFuZWQgPSBlcnJMaW5lLnRyaW0oKS5zbGljZSgwLCAzMDApXG4gICAgcmV0dXJuIGBkc2ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke2NsZWFuZWR9YFxuICB9XG4gIHJldHVybiAnRFNIIFx1OEZEQlx1N0EwQlx1OTAwMFx1NTFGQVx1RkYwOFx1NjVFMFx1OEJFNlx1N0VDNlx1OTUxOVx1OEJFRlx1RkYwOVx1MzAwMlx1OEJGN1x1NjdFNVx1NzcwQiBPYnNpZGlhbiBcdTYzQTdcdTUyMzZcdTUzRjAgW2RzaF0gXHU2NUU1XHU1RkQ3J1xufVxuXG4vKiogXHU1MDVDXHU2QjYyXHU1QjUwXHU4RkRCXHU3QTBCXHVGRjA4U0lHVEVSTVx1RkYwQ1x1N0I0OVx1NUY4NVx1OTAwMFx1NTFGQVx1RkYxQlx1OEQ4NVx1NjVGNlx1NTQwRSBTSUdLSUxMXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcFByb2Nlc3MocHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCB8IHVuZGVmaW5lZCwgdGltZW91dE1zID0gNTAwMCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXByb2MgfHwgcHJvYy5leGl0Q29kZSAhPT0gbnVsbCB8fCBwcm9jLnNpZ25hbENvZGUgIT09IG51bGwpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcHJvYy5raWxsKCdTSUdLSUxMJylcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9LCB0aW1lb3V0TXMpXG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4ge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfSlcbiAgICB0cnkge1xuICAgICAgcHJvYy5raWxsKCdTSUdURVJNJylcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIFx1OEJCRVx1N0Y2RVx1RkYxQVx1NUI1N1x1NkJCNSArIFx1OEJCRVx1N0Y2RVx1OTg3NSBVSVx1MzAwMlxuICogVjAuMlx1RkYxQURTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1RkYwOFx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiAvIFx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkIgLyBcdTgxRUFcdTVCOUFcdTRFNDlcdUZGMDlcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgdHlwZSBEc2hIb21lTW9kZSA9ICdzaGFyZWQnIHwgJ3Blci12YXVsdCcgfCAnY3VzdG9tJ1xuXG5leHBvcnQgaW50ZXJmYWNlIERzaERvY2tTZXR0aW5ncyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW46IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTlcdUZGMDhcdTdDRkJcdTdFREYgbm9kZSBcdTRGMThcdTUxNDhcdUZGMDkgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkMgaG9zdFx1RkYwOFx1OUVEOFx1OEJBNFx1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1NUI5OFx1NjVCOVx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ6IG51bWJlclxuICAvKiogRFNIX0hPTUUgXHU2QTIxXHU1RjBGXHVGRjFBc2hhcmVkPVx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMDhcdTlFRDhcdThCQTRcdUZGMDlcdUZGMUJwZXItdmF1bHQ9XHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQlx1RkYxQmN1c3RvbT1cdTgxRUFcdTVCOUFcdTRFNDkgKi9cbiAgZHNoSG9tZU1vZGU6IERzaEhvbWVNb2RlXG4gIC8qKiBcdTgxRUFcdTVCOUFcdTRFNDkgRFNIX0hPTUUgXHU4REVGXHU1Rjg0XHVGRjA4XHU0RUM1IGN1c3RvbSBcdTZBMjFcdTVGMEZcdTc1MUZcdTY1NDhcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKiBcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZTogYm9vbGVhblxuICAvKiogT2JzaWRpYW4gXHU1NDJGXHU1MkE4XHU2NUY2XHU4MUVBXHU1MkE4XHU2MkM5XHU4RDc3IERTSCAqL1xuICBhdXRvc3RhcnQ6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IERzaERvY2tTZXR0aW5ncyA9IHtcbiAgZHNoQmluOiAnJyxcbiAgbm9kZUJpbjogJycsXG4gIGhvc3Q6ICcxMjcuMC4wLjEnLFxuICBwb3J0OiAzMDgwLFxuICBkc2hIb21lTW9kZTogJ3NoYXJlZCcsXG4gIGRzaEhvbWU6ICcnLFxuICB1c2VFbWJlZGRlZE5vZGU6IGZhbHNlLFxuICBhdXRvc3RhcnQ6IHRydWUsXG59XG5cbmV4cG9ydCBjbGFzcyBEc2hEb2NrU2V0dGluZ3NUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcHJpdmF0ZSBjdXN0b21Ib21lRWw/OiBTZXR0aW5nXG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSBwbHVnaW46IERzaERvY2tQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKVxuICB9XG5cbiAgb3ZlcnJpZGUgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzXG4gICAgY29udGFpbmVyRWwuZW1wdHkoKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY5ODJcdTg5QzggLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ1x1MjZGNSBEU0ggRG9jaycgfSlcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXNldHRpbmdzLWRlc2MnLFxuICAgICAgdGV4dDogJ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFdlYiBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW5cdUZGMUFcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NEMgXHUyMTkyIFx1OTc2Mlx1Njc3Rlx1NUQ0Q1x1NTE2NVx1MzAwMlx1NTE2OFx1N0EwQlx1NUI5OFx1NjVCOVx1RkYwQ1x1OTZGNlx1ODFFQVx1NzgxNFx1MzAwMicsXG4gICAgfSlcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2NzBEXHU1MkExXHU2M0E3XHU1MjM2IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTY3MERcdTUyQTEnIH0pXG4gICAgY29uc3Qgc3RhdHVzTGluZSA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NjcwRFx1NTJBMVx1NzJCNlx1NjAwMScpXG4gICAgICAuc2V0RGVzYyh0aGlzLmRlc2NyaWJlU3RhdHVzKCkpXG4gICAgY29uc3QgYnRucyA9IHN0YXR1c0xpbmUuY29udHJvbEVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJ0bnMnIH0pXG4gICAgY29uc3Qgc3RhcnRCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ21vZC1jdGEnLCB0ZXh0OiAnXHUyNUI2IFx1NTQyRlx1NTJBOCcgfSlcbiAgICBzdGFydEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5kaXNwbGF5KCkpXG4gICAgfVxuICAgIGNvbnN0IHN0b3BCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTI1QTAgXHU1MDVDXHU2QjYyJyB9KVxuICAgIHN0b3BCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RvcCgpLnRoZW4oKCkgPT4gdGhpcy5kaXNwbGF5KCkpXG4gICAgfVxuICAgIGNvbnN0IG9wZW5CdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0YnIH0pXG4gICAgb3BlbkJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuUGFuZWwoKVxuICAgIH1cblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1OTY4RiBPYnNpZGlhbiBcdTgxRUFcdTUyQThcdTU0MkZcdTUyQTgnKVxuICAgICAgLmFkZFRvZ2dsZSgodCkgPT5cbiAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b3N0YXJ0ID0gdlxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdThGRDBcdTg4NENcdTY1RjYgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1OEZEMFx1ODg0Q1x1NjVGNicgfSlcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdkc2ggQ0xJIFx1OERFRlx1NUY4NCcpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCXHVGRjA4RFNIX0JJTiBcdTIxOTIgbnBtIHJvb3QgLWcgXHUyMTkyIFx1NUUzOFx1ODlDMVx1NTE2OFx1NUM0MFx1NzZFRVx1NUY1NVx1RkYwOVx1MzAwMlx1NTNFRlx1NTg2QiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU2MjE2IGJpbi5qcyBcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvb3B0L2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvQGRlZXBzZWVrLWFpL2RzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEJpbilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEJpbiA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG4gICAgdGhpcy5kZXRlY3RMaW5lID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYnKVxuICAgICAgLnNldERlc2MoJ1x1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NjcwMFx1N0EzM1x1NUI5QVx1RkYwOVx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvYmluL25vZGUnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm9kZUJpbiA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUnKVxuICAgICAgLnNldERlc2MoJ0VMRUNUUk9OX1JVTl9BU19OT0RFXHUzMDAyXHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHUyMDE0XHUyMDE0XHU1QjlFXHU2RDRCIE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlx1NEVFNSBOb2RlIFx1NkEyMVx1NUYwRlx1OEZEMFx1ODg0Q1x1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwQ1x1NEVDNVx1NTcyOFx1OUE4Q1x1OEJDMVx1NTNFRlx1NzUyOFx1NjVGNlx1NUYwMFx1NTQyRlx1MzAwMicpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1N0Y1MVx1N0VEQyAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU3RjUxXHU3RURDJyB9KVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFMycpXG4gICAgICAuc2V0RGVzYygnXHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdTMwMDJcdTU4NkIgMCBcdThCQTlcdTdDRkJcdTdFREZcdTUyMDZcdTkxNERcdTdBN0FcdTk1RjJcdTdBRUZcdTUzRTNcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJzMwODAnKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuID0gTnVtYmVyKHYudHJpbSgpKVxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCA9IE51bWJlci5pc0ludGVnZXIobikgJiYgbiA+PSAwICYmIG4gPD0gNjU1MzUgPyBuIDogMzA4MFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTVcdUZGMDhEU0hfSE9NRVx1RkYwOScgfSlcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTZBMjFcdTVGMEYnKVxuICAgICAgLnNldERlc2MoJ0RTSCBcdTc2ODRcdTRGMUFcdThCREQvXHU1QkM2XHU5NEE1L1x1NkEyMVx1NTc4Qlx1OTE0RFx1N0Y2RVx1NjgzOVx1NzZFRVx1NUY1NVx1MzAwMicpXG4gICAgICAuYWRkRHJvcGRvd24oKGRkKSA9PiB7XG4gICAgICAgIGRkLmFkZE9wdGlvbignc2hhcmVkJywgJ1x1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMDhcdTRFMEUgZHNoIENMSSBcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTczQjBcdTY3MDlcdTkxNERcdTdGNkVcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ3Blci12YXVsdCcsICdcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCIH4vLmRzaC92YXVsdHMvPFx1NTQwRD4tPGhhc2g+JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdjdXN0b20nLCAnXHU4MUVBXHU1QjlBXHU0RTQ5XHU4REVGXHU1Rjg0JylcbiAgICAgICAgZGQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUpXG4gICAgICAgIGRkLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSB2IGFzIERzaEhvbWVNb2RlXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB0aGlzLmN1c3RvbUhvbWVFbD8uc2V0RGlzYWJsZWQodiAhPT0gJ2N1c3RvbScpXG4gICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICB0aGlzLmN1c3RvbUhvbWVFbCA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODQnKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvVXNlcnMveW91Ly5kc2gnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZSA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmN1c3RvbUhvbWVFbC5zZXREaXNhYmxlZCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSAhPT0gJ2N1c3RvbScpXG5cbiAgICB0aGlzLmhvbWVQcmV2aWV3ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgfVxuXG4gIHByaXZhdGUgZGV0ZWN0TGluZSE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgaG9tZVByZXZpZXchOiBIVE1MRWxlbWVudFxuXG4gIHByaXZhdGUgZGVzY3JpYmVTdGF0dXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHJldHVybiBgJHtzLnVybH1cdUZGMDgke3MuYXR0YWNoZWQgPyAnXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICdcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NENcdTRFMkQnfVx1RkYwOWBcbiAgICB9XG4gICAgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykgcmV0dXJuICdcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjZcdUZGMDhcdTk5OTZcdTZCMjFcdTdFQTYgMTAgXHU3OUQyXHVGRjBDXHU5NzAwXHU1MjFEXHU1OUNCXHU1MzE2IHByb2ZpbGVcdUZGMDknXG4gICAgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykgcmV0dXJuIGBcdTU5MzFcdThEMjU6ICR7cy5tZXNzYWdlfWBcbiAgICByZXR1cm4gJ1x1NjcyQVx1OEZEMFx1ODg0QydcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEZXRlY3QoKTogc3RyaW5nIHtcbiAgICBjb25zdCBpbmZvID0gdGhpcy5wbHVnaW4uZGV0ZWN0SW5mbygpXG4gICAgcmV0dXJuIFtcbiAgICAgIGBkc2g6ICR7aW5mby5kc2hCaW4gPz8gJ1x1NjcyQVx1NjI3RVx1NTIzMCd9JHtpbmZvLmRzaE5vdGVzLmxlbmd0aCA/IGBcdUZGMDgke2luZm8uZHNoTm90ZXMuam9pbignXHVGRjFCJyl9XHVGRjA5YCA6ICcnfWAsXG4gICAgICBgbm9kZTogJHtpbmZvLm5vZGVOb3Rlcy5qb2luKCdcdUZGMUInKX1gLFxuICAgIF0uam9pbignXFxuJylcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEc2hIb21lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBcdTc1MUZcdTY1NDhcdThERUZcdTVGODQ6ICR7dGhpcy5wbHVnaW4uZWZmZWN0aXZlRHNoSG9tZSgpfWBcbiAgfVxufVxuIiwgIi8qKlxuICogRHNoV2ViVmlldyBcdTIwMTRcdTIwMTQgXHU2MjhBXHU1Qjk4XHU2NUI5IERTSCBXZWIgKDEyNy4wLjAuMTo8cG9ydD4pIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhbiBcdTk3NjJcdTY3N0ZcdTMwMDJcbiAqIFx1NUUyNlx1NUI4Q1x1NjU3NFx1OEZDN1x1N0EwQlx1NzJCNlx1NjAwMVx1RkYxQVx1NTJBMFx1OEY3RFx1NTJBOFx1NzUzQiAvIFx1OTUxOVx1OEJFRlx1NTM2MVx1NzI0N1x1RkYwOFx1NTQyQlx1OTFDRFx1OEJENVx1RkYwOS8gXHU2NzJBXHU1NDJGXHU1MkE4XHU3QTdBXHU3MkI2XHU2MDAxIC8gXHU1NkZFXHU2ODA3XHU1REU1XHU1MTc3XHU2ODBGXHUzMDAyXG4gKiBpZnJhbWUgXHU2MzA3XHU1NDExXHU1Qjk4XHU2NUI5XHU2NzBEXHU1MkExXHVGRjBDVUkgXHU1M0VBXHU2NjJGXCJcdTgyMzlcdTU3NUVcIlx1NTkxNlx1NThGM1x1MzAwMlxuICovXG5cbmltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBzZXRJY29uIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IGNvbnN0IERTSF9XRUJfVklFV19UWVBFID0gJ2RzaC1kb2NrLXdlYidcblxudHlwZSBVaVN0YXRlID0gJ3J1bm5pbmcnIHwgJ3N0YXJ0aW5nJyB8ICdlcnJvcicgfCAnc3RvcHBlZCdcblxuZXhwb3J0IGNsYXNzIERzaFdlYlZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHByaXZhdGUgaWZyYW1lRWw6IEhUTUxJRnJhbWVFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBwaWxsRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBvdmVybGF5RWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSB0b2dnbGVCdG46IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBjdXJyZW50OiBVaVN0YXRlID0gJ3N0b3BwZWQnXG5cbiAgY29uc3RydWN0b3IoXG4gICAgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIobGVhZilcbiAgfVxuXG4gIG92ZXJyaWRlIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIERTSF9XRUJfVklFV19UWVBFXG4gIH1cblxuICBvdmVycmlkZSBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnRFNIIERvY2snXG4gIH1cblxuICBvdmVycmlkZSBnZXRJY29uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdhbmNob3InXG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrJyB9KVxuXG4gICAgLy8gLS0tLSBcdTU5MzRcdTkwRThcdTVERTVcdTUxNzdcdTY4MEYgLS0tLVxuICAgIGNvbnN0IGhlYWRlciA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2staGVhZGVyJyB9KVxuICAgIGNvbnN0IGxvZ28gPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stbG9nbycgfSlcbiAgICBzZXRJY29uKGxvZ28sICdhbmNob3InKVxuICAgIGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stdGl0bGUnLCB0ZXh0OiAnRFNIIERvY2snIH0pXG4gICAgdGhpcy5waWxsRWwgPSBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXBpbGwnIH0pXG4gICAgaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwYWNlcicgfSlcblxuICAgIHRoaXMudG9nZ2xlQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICB0aGlzLnRvZ2dsZUJ0bi5vbmNsaWNrID0gKCkgPT4gdm9pZCB0aGlzLm9uVG9nZ2xlKClcblxuICAgIGNvbnN0IHJlZnJlc2hCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24ocmVmcmVzaEJ0biwgJ3JlZnJlc2gtY3cnKVxuICAgIHJlZnJlc2hCdG4udGl0bGUgPSAnXHU1MjM3XHU2NUIwJ1xuICAgIHJlZnJlc2hCdG4ub25jbGljayA9ICgpID0+IHRoaXMucmVsb2FkKClcblxuICAgIGNvbnN0IHBvcG91dEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihwb3BvdXRCdG4sICdtYXhpbWl6ZS0yJylcbiAgICBwb3BvdXRCdG4udGl0bGUgPSAnXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4XHU3MkVDXHU3QUNCXHU4RkRCXHU3QTBCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHVGRjA5J1xuICAgIHBvcG91dEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuUG9wb3V0KClcbiAgICB9XG5cbiAgICBjb25zdCBicm93c2VyQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKGJyb3dzZXJCdG4sICdleHRlcm5hbC1saW5rJylcbiAgICBicm93c2VyQnRuLnRpdGxlID0gJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCdcbiAgICBicm93c2VyQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5JbkJyb3dzZXIoKVxuICAgIH1cblxuICAgIC8vIC0tLS0gXHU0RTNCXHU0RjUzXHVGRjFBaWZyYW1lICsgXHU3MkI2XHU2MDAxXHU4OTg2XHU3NkQ2XHU1QzQyIC0tLS1cbiAgICBjb25zdCBib2R5ID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1ib2R5JyB9KVxuICAgIHRoaXMuaWZyYW1lRWwgPSBib2R5LmNyZWF0ZUVsKCdpZnJhbWUnLCB7IGNsczogJ2RzaC1kb2NrLWZyYW1lJyB9KVxuICAgIHRoaXMub3ZlcmxheUVsID0gYm9keS5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1vdmVybGF5JyB9KVxuXG4gICAgLy8gXHU3MkI2XHU2MDAxXHU4MDU0XHU1MkE4XG4gICAgdGhpcy5wbHVnaW4ub25TdGF0dXNDaGFuZ2UoKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgdGhpcy5yZWZyZXNoKClcblxuICAgIC8vIFx1NTE1Q1x1NUU5NVx1RkYxQVx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1ODJFNVx1NjcwRFx1NTJBMVx1NjcyQVx1NTQyRlx1NTJBOFx1NEUxNFx1N0FFRlx1NTNFM1x1NTNFRlx1NzUyOFx1RkYwQ1x1NUMxRFx1OEJENVx1NjJDOVx1OEQ3N1xuICAgIHZvaWQgdGhpcy5lbnN1cmVTdGFydGVkKClcblxuICAgIC8vIFx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1NTIzN1x1NjVCMFx1NEUwMFx1NkIyMVx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcdUZGMUFcdTc1MjhcdTYyMzdcdTZCNjRcdTUyM0JcdTZCNjNcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1NzY4NFx1N0E5N1x1NTNFM1xuICAgIC8vIFx1NUMzMVx1NjYyRlwiXHU1RjUzXHU1MjREIHZhdWx0XCJcdUZGMENcdTY1RTBcdTk3MDBcdTdCNDkgZm9jdXMvYWN0aXZlLWxlYWYtY2hhbmdlIFx1NEU4Qlx1NEVGNlx1MzAwMlxuICAgIHRoaXMucGx1Z2luLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICB9XG5cbiAgb3ZlcnJpZGUgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25Ub2dnbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoKClcbiAgfVxuXG4gIC8qKiBcdTk3NjJcdTY3N0ZcdTYyNTNcdTVGMDBcdTY1RjZcdTc4NkVcdTRGRERcdTY3MERcdTUyQTFcdTU3MjhcdThERDFcdUZGMDhcdTVERjJcdTU3MjhcdThERDFcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDkgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVTdGFydGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdzdG9wcGVkJyB8fCBzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICAgIHRoaXMucmVmcmVzaCgpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGxldCB1aTogVWlTdGF0ZVxuICAgIGxldCBwaWxsVGV4dCA9ICcnXG4gICAgbGV0IHBpbGxDbHMgPSAnJ1xuXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB1aSA9ICdydW5uaW5nJ1xuICAgICAgcGlsbFRleHQgPSBgXHUyNUNGICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICcgXHUwMEI3IFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnJ31gXG4gICAgICBwaWxsQ2xzID0gJ2lzLXJ1bm5pbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHVpID0gJ3N0YXJ0aW5nJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNDIFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNidcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RhcnRpbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHVpID0gJ2Vycm9yJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNzE1IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNSdcbiAgICAgIHBpbGxDbHMgPSAnaXMtZXJyb3InXG4gICAgfSBlbHNlIHtcbiAgICAgIHVpID0gJ3N0b3BwZWQnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0IgXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICAgICAgcGlsbENscyA9ICdpcy1zdG9wcGVkJ1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHVpXG4gICAgaWYgKHRoaXMucGlsbEVsKSB7XG4gICAgICB0aGlzLnBpbGxFbC5zZXRUZXh0KHBpbGxUZXh0KVxuICAgICAgdGhpcy5waWxsRWwuY2xhc3NOYW1lID0gYGRzaC1kb2NrLXBpbGwgJHtwaWxsQ2xzfWBcbiAgICB9XG4gICAgaWYgKHRoaXMudG9nZ2xlQnRuKSB7XG4gICAgICB0aGlzLnRvZ2dsZUJ0bi5lbXB0eSgpXG4gICAgICBzZXRJY29uKHRoaXMudG9nZ2xlQnRuLCBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgIHRoaXMudG9nZ2xlQnRuLnRpdGxlID0gcy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4J1xuICAgIH1cblxuICAgIC8vIGlmcmFtZSBcdTRFMEVcdTg5ODZcdTc2RDZcdTVDNDJcbiAgICBpZiAodWkgPT09ICdydW5uaW5nJykge1xuICAgICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5pZnJhbWVFbC5zcmMgIT09IHRoaXMucGx1Z2luLmJhc2VVcmwpIHtcbiAgICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgICB9XG4gICAgICB0aGlzLnNob3dPdmVybGF5KG51bGwpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0YXJ0aW5nKCkpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlckVycm9yKHMua2luZCA9PT0gJ2Vycm9yJyA/IHMubWVzc2FnZSA6ICdcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUYnKSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0b3BwZWQoKSlcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tIFx1ODk4Nlx1NzZENlx1NUM0Mlx1NkUzMlx1NjdEMyAtLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBzaG93T3ZlcmxheShjb250ZW50OiBIVE1MRWxlbWVudCB8IG51bGwpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMub3ZlcmxheUVsKSByZXR1cm5cbiAgICB0aGlzLm92ZXJsYXlFbC5lbXB0eSgpXG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgIHRoaXMub3ZlcmxheUVsLmFwcGVuZENoaWxkKGNvbnRlbnQpXG4gICAgICB0aGlzLm92ZXJsYXlFbC5yZW1vdmVBdHRyaWJ1dGUoJ2hpZGRlbicpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFx1OEZEMFx1ODg0Q1x1NEUyRFx1RkYxQVx1NjYzRVx1NUYwRlx1OTY5MFx1ODVDRlx1ODk4Nlx1NzZENlx1NUM0Mlx1RkYwOFx1NTQyNlx1NTIxOVx1N0E3QVx1NzY4NFx1N0VERFx1NUJGOVx1NUI5QVx1NEY0RFx1NUM0Mlx1NEYxQVx1NjMyMVx1NEY0RiBpZnJhbWVcdUZGMDlcbiAgICAgIHRoaXMub3ZlcmxheUVsLnNldEF0dHJpYnV0ZSgnaGlkZGVuJywgJycpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGFydGluZygpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwaW5uZXInIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ1x1NkI2M1x1NTcyOFx1NTQyRlx1NTJBOFx1NUI5OFx1NjVCOSBEU0ggV2ViXHUyMDI2JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoe1xuICAgICAgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJyxcbiAgICAgIHRleHQ6ICdcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOFx1N0VBNiAxMCBcdTc5RDJcdUZGMDlcdUZGMUJcdTdBRUZcdTUzRTNcdTg4QUJcdTUzNjBcdTc1MjhcdTY1RjZcdTVDMDZcdTgxRUFcdTUyQThcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnLFxuICAgIH0pXG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FsZXJ0LXRyaWFuZ2xlJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtbXNnJywgdGV4dDogbWVzc2FnZSB9KVxuICAgIGNvbnN0IHJldHJ5ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0bicsIHRleHQ6ICdcdTkxQ0RcdThCRDUnIH0pXG4gICAgcmV0cnkub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0b3BwZWQoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbmNob3InKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU2NzJBXHU4RkQwXHU4ODRDJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLCB0ZXh0OiAnXHU3MEI5XHU1MUZCXHU1NDJGXHU1MkE4XHVGRjBDXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgXHU1MDVDXHU5NzYwXHU4RkRCXHU2NzY1JyB9KVxuICAgIGNvbnN0IHN0YXJ0ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0biBtb2QtY3RhJywgdGV4dDogJ1x1NTQyRlx1NTJBOCBEU0gnIH0pXG4gICAgc3RhcnQub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbG9hZCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBjdXJyZW50VmF1bHQudHMgXHUyMDE0XHUyMDE0IFx1NjI4QVwiXHU1RjUzXHU1MjREXHU3MTI2XHU3MEI5IHZhdWx0XCJcdThERThcdThGREJcdTdBMEJcdTU0NEFcdThCQzkgRFNIIFx1NEZBN1x1MzAwMlxuICpcbiAqIGRzaC1kb2NrIFx1OEREMVx1NTcyOCBPYnNpZGlhbiBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTgwRkRcdTYyRkZcdTUyMzBcdTY3MDBcdTY3NDNcdTVBMDFcdTc2ODRcdTVGNTNcdTUyNEQgdmF1bHRcdUZGMDhcdTdBOTdcdTUzRTNcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTY1RjZcdUZGMENcbiAqIGBhcHAudmF1bHQuZ2V0TmFtZSgpYCArIGBhZGFwdGVyLmdldEJhc2VQYXRoKClgXHVGRjA5XHUzMDAyRFNIIFx1NzY4NFx1NURFNVx1NTE3N1x1NjNEMlx1NEVGNlxuICogZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHQgXHU4REQxXHU1NzI4XHU3MkVDXHU3QUNCIG5vZGUgXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU0RTI0XHU4MDA1XHU5MDFBXHU4RkM3XHU0RTAwXHU0RTJBXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU4OUUzXHU4MDI2XHU5MDFBXHU0RkUxXHVGRjFBXG4gKlxuICogICA8aG9tZWRpcj4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gICB7IG5hbWUsIHBhdGgsIHVwZGF0ZWRBdCB9XG4gKlxuICogLSBcdTRGNERcdTdGNkVcdTU2RkFcdTVCOUFcdTU3MjggYH4vLmRzaGBcdUZGMDhcdTRFMEUgZHNoLWRvY2sgXHU3Njg0IERTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1NjVFMFx1NTE3M1x1RkYwOVx1RkYwQ1x1NEVGQlx1NEY1NVx1NkEyMVx1NUYwRlxuICogICBcdTRFMEIgRFNIIFx1NEZBN1x1OTBGRFx1OEJGQlx1NUY5N1x1NTIzMFx1RkYxQlxuICogLSBcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdUZGMUFcdTZCQ0ZcdTRFMkEgT2JzaWRpYW4gXHU3QTk3XHU1M0UzXHVGRjA4XHU0RTNCXHU3QTk3XHU1M0UzIC8gcG9wb3V0XHVGRjA5XHU5MEZEXHU2NjJGXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU1NDA0XG4gKiAgIFx1ODFFQVx1NzZEMVx1NTQyQ1x1ODFFQVx1NURGMVx1NzY4NCB3aW5kb3cgZm9jdXMgXHUyMDE0XHUyMDE0IFx1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NkI2M1x1NjYyRlwiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXG4gKiAgIFx1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHVGRjFCXG4gKiAtIFx1NTkzMVx1OEQyNVx1OTc1OVx1OUVEOFx1RkYxQVx1NTE5OVx1NEUwRFx1OEZEQlx1RkYwOFx1Njc0M1x1OTY1MC9cdTc4QzFcdTc2RDhcdUZGMDlcdTUzRUEgY29uc29sZS53YXJuXHVGRjBDXHU3RUREXHU0RTBEXHU2MjUzXHU2NUFEXHU2M0QyXHU0RUY2XHU0RTNCXHU2RDQxXHU3QTBCXHVGRjFCXG4gKiAgIFx1NjU4N1x1NEVGNlx1NjM1Rlx1NTc0Ri9cdTdGM0FcdTU5MzFcdTY1RjYgRFNIIFx1NEZBN1x1NTZERVx1OTAwMFx1NTM5Rlx1NjcwOVx1NEZFMVx1NTNGN1x1RkYwQ1x1NTQxMVx1NTQwRVx1NTE3Q1x1NUJCOVx1NEUwRFx1ODhDNSBkc2gtZG9jayBcdTc2ODRcdTU3M0FcdTY2NkZcdTMwMDJcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG4vKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1NkZBXHU1QjlBXHU0RjREXHU3RjZFXHVGRjFBfi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZHNoJywgJ2N1cnJlbnQtdmF1bHQuanNvbicpXG59XG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUxODVcdTVCQjlcdUZGMDhEU0ggXHU0RkE3XHU1M0VBXHU4QkZCIG5hbWUvcGF0aFx1RkYwQ3VwZGF0ZWRBdCBcdTRGOUJcdThCQ0FcdTY1QURcdUZGMDkgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ3VycmVudFZhdWx0TWFya2VyIHtcbiAgbmFtZTogc3RyaW5nXG4gIHBhdGg6IHN0cmluZ1xuICB1cGRhdGVkQXQ6IG51bWJlclxufVxuXG4vKipcbiAqIFx1NTM5Rlx1NUI1MFx1NTE5OVx1NTE2NVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYxQVx1NTE0OFx1NTE5OVx1NTQwQ1x1NzZFRVx1NUY1NSAudG1wIFx1NTE4RCByZW5hbWVcdUZGMENcdTkwN0ZcdTUxNEQgRFNIIFx1NEZBN1x1OEJGQlx1NTIzMFx1NTM0QVx1NjIyQVx1NTE4NVx1NUJCOVx1MzAwMlxuICogXHU1OTMxXHU4RDI1XHU1M0VBXHU1NDRBXHU4QjY2XHVGRjBDXHU0RTBEXHU2MjlCXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlcihuYW1lOiBzdHJpbmcsIHZhdWx0UGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgZmlsZSA9IGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKVxuICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgY29uc3QgcGF5bG9hZDogQ3VycmVudFZhdWx0TWFya2VyID0geyBuYW1lLCBwYXRoOiB2YXVsdFBhdGgsIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSB9XG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYFxuICAgIGZzLndyaXRlRmlsZVN5bmModG1wLCBKU09OLnN0cmluZ2lmeShwYXlsb2FkLCBudWxsLCAyKSlcbiAgICBmcy5yZW5hbWVTeW5jKHRtcCwgZmlsZSlcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWRvY2tdIFx1NTE5OVx1NTE2NSBjdXJyZW50LXZhdWx0IFx1NjgwN1x1OEJCMFx1NTkzMVx1OEQyNScsIGVycilcbiAgfVxufVxuXG4vKiogXHU0RUNFIE9ic2lkaWFuIGFwcCBcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1NDBEXHU0RTBFXHU2ODM5XHU4REVGXHU1Rjg0XHVGRjFCXHU1M0Q2XHU0RTBEXHU1MjMwXHU4RkQ0XHU1NkRFIG51bGwgKi9cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50VmF1bHRJbmZvKGFwcDoge1xuICB2YXVsdDogeyBnZXROYW1lKCk6IHN0cmluZzsgYWRhcHRlcjogdW5rbm93biB9XG59KTogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9IHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgLy8gZ2V0QmFzZVBhdGggXHU0RTBEXHU1NzI4IG9ic2lkaWFuIFx1NzY4NFx1N0M3Qlx1NTc4Qlx1NUI5QVx1NEU0OVx1OTFDQ1x1RkYwOFx1OEZEMFx1ODg0Q1x1NjVGNiBEYXRhQWRhcHRlciBcdTYyNERcdTY3MDlcdUZGMDlcdUZGMENcbiAgICAvLyBcdTYyNDBcdTRFRTVcdThGRDlcdTkxQ0NcdTYyOEEgYWRhcHRlciBcdTVGNTMgdW5rbm93biBcdTU5MDRcdTc0MDZcdTUxOERcdTY1QURcdThBMDBcdTMwMDJcbiAgICBjb25zdCBiYXNlID0gKGFwcC52YXVsdC5hZGFwdGVyIGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfSkuZ2V0QmFzZVBhdGg/LigpXG4gICAgaWYgKCFiYXNlKSByZXR1cm4gbnVsbFxuICAgIHJldHVybiB7IG5hbWU6IGFwcC52YXVsdC5nZXROYW1lKCksIHBhdGg6IGJhc2UgfVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRQSxJQUFBQSxtQkFBOEM7QUFFOUMsSUFBQUMsTUFBb0I7QUFDcEIsSUFBQUMsUUFBc0I7OztBQ0l0QiwyQkFBb0Q7QUFDcEQsU0FBb0I7QUFDcEIsV0FBc0I7QUFDdEIsU0FBb0I7QUFDcEIsV0FBc0I7QUFFZixJQUFNLG1CQUF3QixVQUFLLGdCQUFnQixPQUFPLE9BQU8sUUFBUTtBQUd6RSxJQUFNLHdCQUF3QjtBQUc5QixTQUFTLFdBQVcsT0FBZSxNQUFNLEdBQVc7QUFDekQsTUFBSSxJQUFJO0FBQ1IsV0FBUyxJQUFJLEdBQUcsSUFBSSxNQUFNLFFBQVEsSUFBSyxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFDLE1BQU87QUFDcEYsU0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLFNBQVMsS0FBSyxHQUFHLEVBQUUsTUFBTSxHQUFHLEdBQUc7QUFDdkQ7QUFHTyxTQUFTLGNBQWMsV0FBMkI7QUFDdkQsUUFBTSxVQUNILGNBQVMsU0FBUyxFQUNsQixRQUFRLHNCQUFzQixHQUFHLEVBQ2pDLFFBQVEsWUFBWSxFQUFFO0FBQ3pCLFVBQVEsV0FBVyxTQUFTLE1BQU0sR0FBRyxFQUFFO0FBQ3pDO0FBMkNPLFNBQVMsZ0JBQWdCLE9BQWlEO0FBQy9FLE1BQUksQ0FBQyxNQUFPLFFBQU87QUFD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VSxPQUFPLFFBQVEsS0FBSztBQUFBLElBQzlDO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxlQUE4QjtBQUNsQyxVQUFNLEtBQUssU0FBUyxLQUFLLFFBQVE7QUFBQSxFQUNuQztBQUFBO0FBQUEsRUFJQSxNQUFNLFlBQTJCO0FBQy9CLFVBQU0sRUFBRSxVQUFVLElBQUksS0FBSztBQUMzQixVQUFNLFNBQVMsVUFBVSxnQkFBZ0IsaUJBQWlCO0FBQzFELFFBQUksT0FBNkIsT0FBTyxDQUFDLEtBQUs7QUFDOUMsUUFBSSxDQUFDLE1BQU07QUFDVCxhQUFPLFVBQVUsYUFBYSxLQUFLO0FBQ25DLFVBQUksQ0FBQyxLQUFNO0FBQ1gsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ25FO0FBQ0EsY0FBVSxjQUFjLElBQUk7QUFBQSxFQUM5QjtBQUFBLEVBRUEsTUFBTSxnQkFBK0I7QUFDbkMsVUFBTSxFQUFFLE1BQU0sSUFBSSxRQUFRLFVBQVU7QUFDcEMsVUFBTSxNQUFNLGFBQWEsS0FBSyxPQUFPO0FBQUEsRUFDdkM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTUEsTUFBTSxhQUE0QjtBQUNoQyxRQUFJO0FBQ0YsWUFBTSxPQUFPLEtBQUssSUFBSSxVQUFVLGVBQWU7QUFDL0MsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ25FLFNBQVMsS0FBSztBQUNaLFlBQU0sTUFBTSxlQUFlLFFBQVEsSUFBSSxVQUFVLE9BQU8sR0FBRztBQUMzRCxVQUFJLHdCQUFPLHFEQUFhLEdBQUcsRUFBRTtBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAib3MiLCAicGF0aCIsICJlbWJlZGRlZE5vZGVWZXJzaW9uIiwgInJlc29sdmUiLCAiaW1wb3J0X29ic2lkaWFuIiwgImZzIiwgIm9zIiwgInBhdGgiXQp9Cg==
