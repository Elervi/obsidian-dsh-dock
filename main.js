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
var os2 = __toESM(require("os"), 1);
var path2 = __toESM(require("path"), 1);

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

// src/main.ts
function computeDshHome(s, vaultRoot) {
  const home = os2.homedir();
  if (s.dshHomeMode === "custom") {
    return s.dshHome.trim() || path2.join(home, ".dsh");
  }
  if (s.dshHomeMode === "per-vault") {
    const name = vaultRoot ? `${safeVaultName(vaultRoot)}-${stableHash(vaultRoot)}` : "vault";
    return path2.join(home, ".dsh", "vaults", name);
  }
  return path2.join(home, ".dsh");
}
var DshDockPlugin = class extends import_obsidian3.Plugin {
  settings = DEFAULT_SETTINGS;
  proc = null;
  status = { kind: "stopped" };
  starting = false;
  statusBarEl = null;
  statusListeners = /* @__PURE__ */ new Set();
  // ------------------------------------------------------------------ 生命周期
  async onload() {
    await this.loadSettings();
    this.registerView(DSH_WEB_VIEW_TYPE, (leaf) => new DshWebView(leaf, this));
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
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port: this.settings.port,
        host: this.settings.host,
        dshHome,
        useEmbeddedNode: this.settings.useEmbeddedNode
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBEc2hEb2NrUGx1Z2luIFx1MjAxNFx1MjAxNCBPYnNpZGlhbiBcdTRGQTdcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcdTdCQTFcdTc0MDZcdTMwMDJcbiAqXG4gKiBvbmxvYWQ6IFx1NTJBMFx1OEY3RFx1OEJCRVx1N0Y2RSBcdTIxOTIgXHU2Q0U4XHU1MThDXHU4OUM2XHU1NkZFL1x1NTQ3RFx1NEVFNC9cdTcyQjZcdTYwMDFcdTY4MEYvXHU4QkJFXHU3RjZFXHU5ODc1IFx1MjE5MiBcdUZGMDhhdXRvc3RhcnQgXHU2NUY2XHVGRjA5XHU1NDJGXHU1MkE4IERTSFx1MzAwMlxuICogXHU1NDJGXHU1MkE4OiBsYXVuY2hlci5lbnN1cmVEc2hSdW5uaW5nKClcdUZGMDhcdTdBRUZcdTUzRTNcdTUzNjBcdTc1MjhcdTUyMTlcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMDlcdTMwMDJcbiAqIFx1NTM3OFx1OEY3RDogU0lHVEVSTSBcdTVCNTBcdThGREJcdTdBMEJcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBQbHVnaW4sIE5vdGljZSwgV29ya3NwYWNlTGVhZiB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgeyBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQge1xuICBlbWJlZGRlZE5vZGVWZXJzaW9uLFxuICBlbnN1cmVEc2hSdW5uaW5nLFxuICByZXNvbHZlRHNoQmluLFxuICByZXNvbHZlTm9kZUJpbixcbiAgc2FmZVZhdWx0TmFtZSxcbiAgc3RhYmxlSGFzaCxcbiAgc3RvcFByb2Nlc3MsXG4gIHR5cGUgU2VydmVyU3RhdHVzLFxufSBmcm9tICcuL2xhdW5jaGVyJ1xuaW1wb3J0IHsgRHNoRG9ja1NldHRpbmdzVGFiLCBERUZBVUxUX1NFVFRJTkdTLCB0eXBlIERzaERvY2tTZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnXG5pbXBvcnQgeyBEc2hXZWJWaWV3LCBEU0hfV0VCX1ZJRVdfVFlQRSB9IGZyb20gJy4vdmlldydcblxuLyoqXG4gKiBcdThCQTFcdTdCOTcgRFNIX0hPTUVcdUZGMUFcbiAqIC0gc2hhcmVkXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFBfi8uZHNoIFx1MjAxNFx1MjAxNCBcdTRFMEVcdTVCOThcdTY1QjkgZHNoIENMSSBcdTVCOENcdTUxNjhcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTVERjJcdTY3MDlcdTkxNERcdTdGNkUvXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURzaEhvbWUoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAnZHNoSG9tZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKClcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgcmV0dXJuIHMuZHNoSG9tZS50cmltKCkgfHwgcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbiAgfVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcpIHtcbiAgICBjb25zdCBuYW1lID0gdmF1bHRSb290ID8gYCR7c2FmZVZhdWx0TmFtZSh2YXVsdFJvb3QpfS0ke3N0YWJsZUhhc2godmF1bHRSb290KX1gIDogJ3ZhdWx0J1xuICAgIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnLCAndmF1bHRzJywgbmFtZSlcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHNoRG9ja1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBEc2hEb2NrU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTXG4gIHByaXZhdGUgcHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXM6IFNlcnZlclN0YXR1cyA9IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgcHJpdmF0ZSBzdGFydGluZyA9IGZhbHNlXG4gIHByaXZhdGUgc3RhdHVzQmFyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXNMaXN0ZW5lcnMgPSBuZXcgU2V0PCgpID0+IHZvaWQ+KClcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKClcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KERTSF9XRUJfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IERzaFdlYlZpZXcobGVhZiwgdGhpcykpXG5cbiAgICB0aGlzLmFkZFJpYmJvbkljb24oJ2JvdCcsICdEU0ggRG9ja1x1RkYxQVx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicsICgpID0+IHZvaWQgdGhpcy5vcGVuUGFuZWwoKSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1wYW5lbCcsXG4gICAgICBuYW1lOiAnXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0YnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuUGFuZWwoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N0YXJ0LWRzaCcsXG4gICAgICBuYW1lOiAnXHU1NDJGXHU1MkE4IERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdGFydCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RvcC1kc2gnLFxuICAgICAgbmFtZTogJ1x1NTA1Q1x1NkI2MiBEU0ggXHU2NzBEXHU1MkExJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc3RvcCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1kc2gtYnJvd3NlcicsXG4gICAgICBuYW1lOiAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwIERTSCcsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5JbkJyb3dzZXIoKSxcbiAgICB9KVxuXG4gICAgdGhpcy5zdGF0dXNCYXJFbCA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRHNoRG9ja1NldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSlcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9zdGFydCkge1xuICAgICAgdm9pZCB0aGlzLnN0YXJ0KClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbnVubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnN0b3AoKVxuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmNsZWFyKClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gdGhpcy5zZXR0aW5ncy5wb3J0XG4gICAgcmV0dXJuIGBodHRwOi8vJHt0aGlzLnNldHRpbmdzLmhvc3R9OiR7cG9ydH0vYFxuICB9XG5cbiAgb25TdGF0dXNDaGFuZ2UoZm46ICgpID0+IHZvaWQpOiAoKSA9PiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1c0xpc3RlbmVycy5hZGQoZm4pXG4gICAgcmV0dXJuICgpID0+IHRoaXMuc3RhdHVzTGlzdGVuZXJzLmRlbGV0ZShmbilcbiAgfVxuXG4gIHByaXZhdGUgc2V0U3RhdHVzKHN0YXR1czogU2VydmVyU3RhdHVzKTogdm9pZCB7XG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXNcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgZm9yIChjb25zdCBmbiBvZiB0aGlzLnN0YXR1c0xpc3RlbmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm4oKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhdHVzQmFyKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5zdGF0dXNCYXJFbCkgcmV0dXJuXG4gICAgY29uc3QgcyA9IHRoaXMuc3RhdHVzXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoYERTSDogJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJ1x1RkYwOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOScgOiAnJ31gKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTY3MkFcdThGRDBcdTg4NEMnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG5cbiAgLyoqIFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMSBcdTIxOTIgXHU2MzAyXHU2M0E1XHVGRjFCXHU1NDI2XHU1MjE5IHNwYXduIFx1NUI5OFx1NjVCOSBkc2ggd2ViICovXG4gIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XG4gICAgaWYgKHRoaXMuc3RhcnRpbmcpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIGlmICh0aGlzLnN0YXR1cy5raW5kID09PSAncnVubmluZycpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIHRoaXMuc3RhcnRpbmcgPSB0cnVlXG4gICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RhcnRpbmcnIH0pXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhdWx0Um9vdCA9ICh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfSkuZ2V0QmFzZVBhdGg/LigpXG4gICAgICBjb25zdCBkc2hIb21lID0gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydDogdGhpcy5zZXR0aW5ncy5wb3J0LFxuICAgICAgICBob3N0OiB0aGlzLnNldHRpbmdzLmhvc3QsXG4gICAgICAgIGRzaEhvbWUsXG4gICAgICAgIHVzZUVtYmVkZGVkTm9kZTogdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUsXG4gICAgICB9KVxuICAgICAgdGhpcy5wcm9jID0gcmVzdWx0LnByb2MgPz8gbnVsbFxuICAgICAgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmIHJlc3VsdC5wcm9jKSB7XG4gICAgICAgIHRoaXMuaG9va0NoaWxkTG9ncyhyZXN1bHQucHJvYylcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U3RhdHVzKHJlc3VsdC5zdGF0dXMpXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7cmVzdWx0LnN0YXR1cy5tZXNzYWdlfWApXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICFyZXN1bHQuc3RhdHVzLmF0dGFjaGVkKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBXZWIgXHU1REYyXHU1QzMxXHU3RUVBOiAke3Jlc3VsdC5zdGF0dXMudXJsfWApXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbXNnIH0pXG4gICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1RjAyXHU1RTM4OiAke21zZ31gKVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzXG4gIH1cblxuICBhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIGlmICh0aGlzLnByb2MpIHtcbiAgICAgIGF3YWl0IHN0b3BQcm9jZXNzKHRoaXMucHJvYylcbiAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICB9XG4gICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgfVxuXG4gIHByaXZhdGUgaG9va0NoaWxkTG9ncyhwcm9jOiBDaGlsZFByb2Nlc3MpOiB2b2lkIHtcbiAgICBwcm9jLnN0ZG91dD8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiBjb25zb2xlLmluZm8oJ1tkc2hdJywgZC50b1N0cmluZygpLnRyaW1FbmQoKSkpXG4gICAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS53YXJuKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Mub25jZSgnZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIGlmICh0aGlzLnByb2MgPT09IHByb2MpIHtcbiAgICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgICAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICF0aGlzLnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYERTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkE6IGNvZGU9JHtjb2RlfSBzaWduYWw9JHtzaWduYWwgPz8gJyd9YCB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW2RzaC1kb2NrXSBcdTVCNTBcdThGREJcdTdBMEJcdTk1MTlcdThCRUYnLCBlcnIpXG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBgXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGOiAke2Vyci5tZXNzYWdlfWAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqIFx1NjNBMlx1NkQ0Qlx1NEZFMVx1NjA2Rlx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBkZXRlY3RJbmZvKCk6IHsgZHNoQmluOiBzdHJpbmcgfCBudWxsOyBkc2hOb3Rlczogc3RyaW5nW107IG5vZGVOb3Rlczogc3RyaW5nW10gfSB7XG4gICAgY29uc3QgZm91bmQgPSByZXNvbHZlRHNoQmluKHRoaXMuc2V0dGluZ3MuZHNoQmluKVxuICAgIGNvbnN0IG5vZGUgPSByZXNvbHZlTm9kZUJpbih0aGlzLnNldHRpbmdzLm5vZGVCaW4sIGVtYmVkZGVkTm9kZVZlcnNpb24oKSwgdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpXG4gICAgcmV0dXJuIHtcbiAgICAgIGRzaEJpbjogZm91bmQuYmluLFxuICAgICAgZHNoTm90ZXM6IGZvdW5kLm5vdGVzLFxuICAgICAgbm9kZU5vdGVzOiBub2RlLm5vdGVzLFxuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZWZmZWN0aXZlRHNoSG9tZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhdWx0Um9vdCA9ICh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfSkuZ2V0QmFzZVBhdGg/LigpXG4gICAgcmV0dXJuIGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmxvYWREYXRhKClcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgZGF0YSA/PyB7fSlcbiAgICAvLyBcdTY1RTdcdTcyNDhcdUZGMDhkc2gtaG9zdCBWMC4xXHVGRjA5XHU4QkJFXHU3RjZFXHU4RkMxXHU3OUZCXHVGRjFBZHNoSG9tZSBcdTVCNTdcdTdCMjZcdTRFMzIgXHUyMTkyIGN1c3RvbSBcdTZBMjFcdTVGMEZcbiAgICBjb25zdCBsZWdhY3kgPSBkYXRhIGFzIHsgZHNoSG9tZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkXG4gICAgaWYgKGxlZ2FjeT8uZHNoSG9tZSAmJiB0eXBlb2YgbGVnYWN5LmRzaEhvbWUgPT09ICdzdHJpbmcnICYmIGxlZ2FjeS5kc2hIb21lLnRyaW0oKSkge1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lTW9kZSA9ICdjdXN0b20nXG4gICAgICB0aGlzLnNldHRpbmdzLmRzaEhvbWUgPSBsZWdhY3kuZHNoSG9tZS50cmltKClcbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFVJXG5cbiAgYXN5bmMgb3BlblBhbmVsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcFxuICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRFNIX1dFQl9WSUVXX1RZUEUpXG4gICAgbGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCBudWxsID0gbGVhdmVzWzBdID8/IG51bGxcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKVxuICAgICAgaWYgKCFsZWFmKSByZXR1cm5cbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH1cbiAgICB3b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmKVxuICB9XG5cbiAgYXN5bmMgb3BlbkluQnJvd3NlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHNoZWxsIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpIGFzIHsgc2hlbGw6IHsgb3BlbkV4dGVybmFsKHVybDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB9IH1cbiAgICBhd2FpdCBzaGVsbC5vcGVuRXh0ZXJuYWwodGhpcy5iYXNlVXJsKVxuICB9XG5cbiAgLyoqXG4gICAqIFx1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOE9ic2lkaWFuIHBvcG91dFx1RkYwOVx1RkYxQURTSCBcdTk3NjJcdTY3N0ZcdThGREJcdTUxNjVcdTcyRUNcdTdBQ0IgQnJvd3NlcldpbmRvdyA9XG4gICAqIFx1NzJFQ1x1N0FDQlx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwQ1x1NEUwRSBPYnNpZGlhbiBcdTRFM0JcdTdBOTdcdTUzRTNcdTk2OTRcdTc5QkJcdUZGMENcdTYwMjdcdTgwRkRcdTdCNDlcdTU0MENcdTZENEZcdTg5QzhcdTU2NjhcdTY4MDdcdTdCN0VcdTk4NzVcdTMwMDJcbiAgICovXG4gIGFzeW5jIG9wZW5Qb3BvdXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2Uub3BlblBvcG91dExlYWYoKVxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIG5ldyBOb3RpY2UoYFx1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1NTkzMVx1OEQyNTogJHttc2d9YClcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGxhdW5jaGVyLnRzIFx1MjAxNFx1MjAxNCBcdTdFQUZcdTU0MkZcdTUyQThcdTkwM0JcdThGOTFcdUZGMDhcdTk2RjYgT2JzaWRpYW4gXHU0RjlEXHU4RDU2XHVGRjBDXHU1M0VGXHU3MkVDXHU3QUNCXHU1MTkyXHU3MERGXHU2RDRCXHU4QkQ1XHVGRjA5XHUzMDAyXG4gKlxuICogXHU4MDRDXHU4RDIzXHVGRjFBXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHUyMTkyIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNiBcdTIxOTIgc3Bhd24gYGRzaCB3ZWJgXG4gKiBcdUZGMDgxMjcuMC4wLjE6PHBvcnQ+XHVGRjA5XHUyMTkyIFx1N0I0OVx1NUY4NSBIVFRQIFx1NUMzMVx1N0VFQSBcdTIxOTIgXHU1MDVDXHU2QjYyXHUzMDAyXG4gKlxuICogXHU1MTczXHU5NTJFXHU0RThCXHU1QjlFXHVGRjA4XHU1REYyXHU1NzI4XHU1Qjk4XHU2NUI5IEBkZWVwc2Vlay1haS9kc2hAMC4xLjAtcmMuNiBcdTRFMEFcdTlBOENcdThCQzFcdUZGMDlcdUZGMUFcbiAqIC0gYG5vZGUgPGRzaD4vbGliL2Jpbi5qcyB3ZWIgLS1ob3N0IDEyNy4wLjAuMSAtLXBvcnQgPHBvcnQ+YCBcdTUzNzNcdTVCOThcdTY1QjkgV2ViIFVJXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNCBob3N0PTEyNy4wLjAuMVx1MzAwMXBvcnQ9MzA4MFx1RkYwOFx1NTNFRlx1ODk4Nlx1NzZENlx1RkYwOVx1RkYxQlxuICogLSBcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTgxRUFcdTUyQThcdTUyMURcdTU5Q0JcdTUzMTYgJERTSF9IT01FL3Byb2ZpbGVzL3dlYlx1RkYwOGJ1bmRsZXMgPSBkc2gtYmFzZSArIGRzaC13ZWItYXBwXHVGRjA5XHVGRjBDXG4gKiAgIFx1NkEyMVx1NTc1N1x1ODlFM1x1Njc5MFx1OEQ3MCAkRFNIX0hPTUUvcHJvZmlsZXMvbm9kZV9tb2R1bGVzIFx1NUU3M1x1OTc2Mlx1N0IyNlx1NTNGN1x1OTRGRVx1NjNBNVx1RkYwQ1x1NjVFMFx1OTcwMCBwbnBtL1x1ODA1NFx1N0Y1MVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTRcdTkxNERcdTdGNkVcdTRFMEIgU1FMaXRlXHVGRjA4bm9kZTpzcWxpdGVcdUZGMENcdTk3MDAgTm9kZSBcdTIyNjUyMi41XHVGRjA5XHU0RTBEXHU0RjFBXHU2MjUzXHU1RjAwXHVGRjA4b3BlbkF0OiBuZXZlclx1RkYwOVx1RkYwQ1xuICogICBcdTU2RTBcdTZCNjQgTm9kZSAyMCsgXHU0RTVGXHU4MEZEXHU4REQxXHU5RUQ4XHU4QkE0IHdlYiBwcm9maWxlXHVGRjFCXHU1NDJGXHU3NTI4XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU2NUY2XHU2MjREXHU5NzAwXHU4OTgxIE5vZGUgXHUyMjY1MjIuNVx1MzAwMlxuICovXG5cbmltcG9ydCB7IHNwYXduLCBzcGF3blN5bmMsIHR5cGUgQ2hpbGRQcm9jZXNzIH0gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBjb25zdCBEU0hfUkVMQVRJVkVfQklOID0gcGF0aC5qb2luKCdAZGVlcHNlZWstYWknLCAnZHNoJywgJ2xpYicsICdiaW4uanMnKVxuXG4vKiogTm9kZSBcdTRFM0JcdTcyNDhcdTY3MkNcdTUzRjdcdTZCRDRcdThGODNcdUZGMUFub2RlOnNxbGl0ZSBcdTk3MDBcdTg5ODEgXHUyMjY1MjIuNVx1RkYwOFx1NEVDNVx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NTI5Rlx1ODBGRFx1NzUyOFx1NTIzMFx1RkYwOSAqL1xuZXhwb3J0IGNvbnN0IE5PREVfU1FMSVRFX01JTl9NQUpPUiA9IDIyXG5cbi8qKiBcdTdBMzNcdTVCOUFcdTc3RURcdTU0QzhcdTVFMENcdUZGMDhkamIyXHVGRjA5XHVGRjBDXHU3NTI4XHU0RThFIHZhdWx0IFx1NzZFRVx1NUY1NVx1NTQwRFx1NkQ4OFx1NkI2N1x1RkYwQ1x1OTA3Rlx1NTE0RFx1NEUyRFx1NjU4N1x1NTQwRFx1NkUwNVx1NkQxN1x1NzhCMFx1NjQ5RSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YWJsZUhhc2goaW5wdXQ6IHN0cmluZywgbGVuID0gNik6IHN0cmluZyB7XG4gIGxldCBoID0gNTM4MVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSBoID0gKChoIDw8IDUpICsgaCArIGlucHV0LmNoYXJDb2RlQXQoaSkpID4+PiAwXG4gIHJldHVybiBoLnRvU3RyaW5nKDM2KS5wYWRTdGFydChsZW4sICcwJykuc2xpY2UoMCwgbGVuKVxufVxuXG4vKiogXHU1M0VGXHU4QkZCXHU3Njg0IHZhdWx0IFx1NzZFRVx1NUY1NVx1NTQwRFx1RkYwOFx1NEZERFx1NzU1OSBVbmljb2RlIFx1NUI1N1x1NkJDRFx1NjU3MFx1NUI1N1x1RkYwQ1x1NTE3Nlx1NEY1OVx1OEY2QyAtXHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5ICd2YXVsdCcgKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlVmF1bHROYW1lKHZhdWx0Um9vdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY2xlYW5lZCA9IHBhdGhcbiAgICAuYmFzZW5hbWUodmF1bHRSb290KVxuICAgIC5yZXBsYWNlKC9bXlxccHtMfVxccHtOfV8tXSsvZ3UsICctJylcbiAgICAucmVwbGFjZSgvXi0rfC0rJC9nLCAnJylcbiAgcmV0dXJuIChjbGVhbmVkIHx8ICd2YXVsdCcpLnNsaWNlKDAsIDQwKVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaE9wdGlvbnMge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU3Njg0XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluPzogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOSAqL1xuICBub2RlQmluPzogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0PzogbnVtYmVyXG4gIC8qKiBcdTc2RDFcdTU0MkMgaG9zdFx1RkYwOFx1OUVEOFx1OEJBNCAxMjcuMC4wLjFcdUZGMENcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdD86IHN0cmluZ1xuICAvKiogJERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREL1x1NUJDNlx1OTRBNS9cdTZBMjFcdTU3OEJcdTkxNERcdTdGNkVcdTY4MzlcdTc2RUVcdTVGNTVcdUZGMUJcdTlFRDhcdThCQTQgPHZhdWx0Pi8uZHNoXHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKiogXHU2NjJGXHU1NDI2XHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1OTVFRFx1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU/OiBib29sZWFuXG4gIC8qKiBcdTVDMzFcdTdFRUFcdTdCNDlcdTVGODVcdTRFMEFcdTk2NTBcdUZGMDhcdTlFRDhcdThCQTQgMTIwc1x1RkYwOSAqL1xuICB0aW1lb3V0TXM/OiBudW1iZXJcbiAgLyoqIFx1OTY0NFx1NTJBMFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiAqL1xuICBlbnY/OiBOb2RlSlMuUHJvY2Vzc0VudlxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkTm9kZSB7XG4gIC8qKiBcdTc1MjhcdTRFOEUgc3Bhd24gXHU3Njg0IG5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU2NjJGXHU1NDI2XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NjI4QSBPYnNpZGlhbiBcdTc2ODQgRWxlY3Ryb24gXHU0RThDXHU4RkRCXHU1MjM2XHU1RjUzIE5vZGUgXHU3NTI4ICovXG4gIHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuXG4gIC8qKiBcdThCRTUgTm9kZSBcdTc2ODQgbWFqb3IgXHU3MjQ4XHU2NzJDXHVGRjA4XHU2M0EyXHU2RDRCXHU1OTMxXHU4RDI1XHU0RTNBIDBcdUZGMDkgKi9cbiAgbm9kZU1ham9yOiBudW1iZXJcbiAgLyoqIFx1NjNBMlx1NkQ0Qi9cdTUxQjNcdTdCNTZcdThCRjRcdTY2MEVcdUZGMDhcdTRGOUJcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgbm90ZXM6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCB0eXBlIFNlcnZlclN0YXR1cyA9XG4gIHwgeyBraW5kOiAnc3RvcHBlZCcgfVxuICB8IHsga2luZDogJ3N0YXJ0aW5nJyB9XG4gIHwgeyBraW5kOiAncnVubmluZyc7IHBvcnQ6IG51bWJlcjsgaG9zdDogc3RyaW5nOyB1cmw6IHN0cmluZzsgYXR0YWNoZWQ6IGJvb2xlYW4gfVxuICB8IHsga2luZDogJ2Vycm9yJzsgbWVzc2FnZTogc3RyaW5nIH1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdThERUZcdTVGODRcdTVCOUFcdTRGNERcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogXHU2MjhBXHU3NTI4XHU2MjM3XHU1ODZCXHU1MTk5XHU3Njg0XHU1MTY1XHU1M0UzXHU4OUM0XHU4MzAzXHU1MzE2XHVGRjFBXHU2MzA3XHU1NDExIGJpbi5qcyBcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1OTBGRFx1NjNBNVx1NTNENyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZURzaEJpbihpbnB1dDogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWlucHV0KSByZXR1cm4gbnVsbFxuICBjb25zdCBwID0gaW5wdXQudHJpbSgpXG4gIGlmICghcCkgcmV0dXJuIG51bGxcbiAgY29uc3QgZXhwYW5kZWQgPSBwLnJlcGxhY2UoL15+KD89JHxcXC98XFxcXCkvLCBvcy5ob21lZGlyKCkpXG4gIGNvbnN0IGFicyA9IHBhdGguaXNBYnNvbHV0ZShleHBhbmRlZCkgPyBwYXRoLm5vcm1hbGl6ZShleHBhbmRlZCkgOiBwYXRoLnJlc29sdmUoZXhwYW5kZWQpXG4gIHRyeSB7XG4gICAgY29uc3Qgc3QgPSBmcy5zdGF0U3luYyhhYnMpXG4gICAgaWYgKHN0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihhYnMsICdsaWInLCAnYmluLmpzJylcbiAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkgPyBjYW5kaWRhdGUgOiBudWxsXG4gICAgfVxuICAgIGlmIChzdC5pc0ZpbGUoKSkgcmV0dXJuIGFic1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHJldHVybiBudWxsXG59XG5cbi8qKiBcdTVFMzhcdTg5QzEgbnBtIFx1NTE2OFx1NUM0MCBub2RlX21vZHVsZXMgXHU2ODM5XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gZ2xvYmFsTW9kdWxlUm9vdHMoKTogc3RyaW5nW10ge1xuICBjb25zdCByb290czogc3RyaW5nW10gPSBbXVxuICBpZiAocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKSByb290cy5wdXNoKHByb2Nlc3MuZW52LkRTSF9HTE9CQUxfTU9EVUxFUylcbiAgY29uc3QgbnBtUm9vdCA9IHNwYXduU3luYygnbnBtJywgWydyb290JywgJy1nJ10sIHtcbiAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgIHRpbWVvdXQ6IDEwXzAwMCxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbiAgaWYgKG5wbVJvb3Quc3RhdHVzID09PSAwICYmIG5wbVJvb3Quc3Rkb3V0KSB7XG4gICAgY29uc3QgbGluZSA9IG5wbVJvb3Quc3Rkb3V0LnRyaW0oKS5zcGxpdCgvXFxyP1xcbi8pWzBdXG4gICAgaWYgKGxpbmUpIHJvb3RzLnB1c2gobGluZSlcbiAgfVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2RhcndpbicpIHtcbiAgICByb290cy5wdXNoKCcvb3B0L2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJylcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnbGludXgnKSB7XG4gICAgcm9vdHMucHVzaCgnL3Vzci9saWIvbm9kZV9tb2R1bGVzJywgJy91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcycsIHBhdGguam9pbihvcy5ob21lZGlyKCksICcubG9jYWwnLCAnbGliJywgJ25vZGVfbW9kdWxlcycpKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICBjb25zdCBhcHBEYXRhID0gcHJvY2Vzcy5lbnYuQVBQREFUQVxuICAgIGlmIChhcHBEYXRhKSByb290cy5wdXNoKHBhdGguam9pbihhcHBEYXRhLCAnbnBtJywgJ25vZGVfbW9kdWxlcycpKVxuICB9XG4gIC8vIFx1NTNCQlx1OTFDRFx1NEZERFx1NUU4RlxuICByZXR1cm4gWy4uLm5ldyBTZXQocm9vdHMpXVxufVxuXG4vKipcbiAqIFx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1MzAwMlx1NEYxOFx1NTE0OFx1N0VBN1x1RkYxQVxuICogMS4gXHU2NjNFXHU1RjBGXHU0RjIwXHU1MTY1XHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHVGRjA5XHUyMTkyIDIuIFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiBEU0hfQklOIFx1MjE5MiAzLiBucG0gcm9vdCAtZyBcdTIxOTIgNC4gXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU2ODM5XHUzMDAyXG4gKiBcdTY3MkFcdTYyN0VcdTUyMzBcdTY1RjYgYmluIFx1NEUzQSBudWxsXHVGRjBDbm90ZXMgXHU4QkY0XHU2NjBFXHU1MzlGXHU1NkUwXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRHNoQmluKGV4cGxpY2l0Pzogc3RyaW5nKTogeyBiaW46IHN0cmluZyB8IG51bGw7IG5vdGVzOiBzdHJpbmdbXSB9IHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBub3JtYWxpemVEc2hCaW4oZXhwbGljaXQgPz8gcHJvY2Vzcy5lbnYuRFNIX0JJTilcbiAgaWYgKGV4cGxpY2l0QmluICYmIGZzLmV4aXN0c1N5bmMoZXhwbGljaXRCaW4pKSB7XG4gICAgcmV0dXJuIHsgYmluOiBleHBsaWNpdEJpbiwgbm90ZXM6IFtgXHU0RjdGXHU3NTI4XHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0OiAke2V4cGxpY2l0QmlufWBdIH1cbiAgfVxuICBpZiAoZXhwbGljaXQpIG5vdGVzLnB1c2goYFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NFx1NEUwRFx1NUI1OFx1NTcyODogJHtleHBsaWNpdH1gKVxuXG4gIGZvciAoY29uc3Qgcm9vdCBvZiBnbG9iYWxNb2R1bGVSb290cygpKSB7XG4gICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKHJvb3QsIERTSF9SRUxBVElWRV9CSU4pXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSkge1xuICAgICAgcmV0dXJuIHsgYmluOiBjYW5kaWRhdGUsIG5vdGVzOiBbLi4ubm90ZXMsIGBcdTRFQ0VcdTUxNjhcdTVDNDBcdTZBMjFcdTU3NTdcdTY4MzlcdTUzRDFcdTczQjA6ICR7Y2FuZGlkYXRlfWBdIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIGRzaCBcdTVCODlcdTg4QzVcdTMwMDJcdThCRjdcdTUxNDhcdTYyNjdcdTg4NEM6IG5wbSBpbnN0YWxsIC1nIEBkZWVwc2Vlay1haS9kc2hcdUZGMENcdTYyMTZcdTU3MjhcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgZHNoIFx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IGJpbjogbnVsbCwgbm90ZXMgfVxufVxuXG4vKipcbiAqIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNlx1MzAwMlxuICogXHU5RUQ4XHU4QkE0XHU5ODdBXHU1RThGXHVGRjFBXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0IFx1MjE5MiBcdTdDRkJcdTdFREYgYG5vZGVgXHVGRjA4UEFUSFx1RkYwQ1x1NjcwMFx1N0EzM1x1NUI5QVx1RkYwOVx1MzAwMlxuICogRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlIFx1NUI5RVx1NkQ0Qlx1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwOE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlxuICogXHU0RTBEXHU2MzA5XHU2NjZFXHU5MDFBIEVsZWN0cm9uIFx1OEJFRFx1NEU0OVx1NTRDRFx1NUU5NFx1RkYwOVx1RkYwQ1x1NTZFMFx1NkI2NFx1NEVDNVx1NUY1MyB1c2VFbWJlZGRlZE5vZGUgXHU2NjNFXHU1RjBGXHU1RjAwXHU1NDJGXHU2NUY2XHU2MjREXHU1QzFEXHU4QkQ1XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTm9kZUJpbihleHBsaWNpdD86IHN0cmluZywgZW1iZWRkZWROb2RlVmVyc2lvbj86IHN0cmluZywgdXNlRW1iZWRkZWQgPSBmYWxzZSk6IFJlc29sdmVkTm9kZSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gZXhwbGljaXQ/LnRyaW0oKSB8fCBwcm9jZXNzLmVudi5EU0hfTk9ERVxuICBpZiAoZXhwbGljaXRCaW4pIHtcbiAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEYgTm9kZTogJHtleHBsaWNpdEJpbn1gKVxuICAgIHJldHVybiB7IG5vZGVCaW46IGV4cGxpY2l0QmluLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZCAmJiBwcm9jZXNzLmV4ZWNQYXRoICYmIGVtYmVkZGVkTm9kZVZlcnNpb24pIHtcbiAgICBjb25zdCBtYWpvciA9IE51bWJlcihlbWJlZGRlZE5vZGVWZXJzaW9uLnNwbGl0KCcuJylbMF0pIHx8IDBcbiAgICBpZiAobWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufVx1RkYwOEVMRUNUUk9OX1JVTl9BU19OT0RFXHVGRjA5YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IHByb2Nlc3MuZXhlY1BhdGgsIHVzZUVsZWN0cm9uQXNOb2RlOiB0cnVlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICAgIG5vdGVzLnB1c2goYE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn0gPCAke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMENcdTY1RTBcdTZDRDVcdTU0MkZcdTc1MjhgKVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NEY3Rlx1NzUyOCBQQVRIIFx1NEUyRFx1NzY4NCBub2RlXHVGRjA4XHU3Q0ZCXHU3RURGIE5vZGVcdUZGMENcdTY3MDBcdTdBMzNcdTVCOUFcdUZGMDknKVxuICByZXR1cm4geyBub2RlQmluOiAnbm9kZScsIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU3QUVGXHU1M0UzXHU2M0EyXHU2RDRCXHU0RTBFXHU3QjQ5XHU1Rjg1XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFx1NUY1M1x1NTI0RFx1OEZEMFx1ODg0Q1x1NzNBRlx1NTg4M1x1RkYwOE9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwOVx1ODFFQVx1NUUyNlx1NzY4NCBOb2RlIFx1NzI0OFx1NjcyQ1x1RkYxQlx1NjVFMFx1NTIxOSB1bmRlZmluZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWJlZGRlZE5vZGVWZXJzaW9uKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgdiA9IChwcm9jZXNzLnZlcnNpb25zIGFzIHsgbm9kZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkKT8ubm9kZVxuICAgIHJldHVybiB2IHx8IHVuZGVmaW5lZFxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBcdTdBRUZcdTUzRTNcdTY2MkZcdTU0MjZcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdTMwMDJcbiAqIFx1NzUyOCBub2RlOmh0dHAgXHU4MDBDXHU5NzVFXHU2RDRGXHU4OUM4XHU1NjY4IGZldGNoXHVGRjFBT2JzaWRpYW4gXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHU3Njg0IENTUCBcdTRGMUFcdTYyRTZcdTYyMkFcbiAqIFx1NUJGOSBodHRwOi8vMTI3LjAuMC4xIFx1NzY4NCBmZXRjaFx1RkYwQ1x1NUJGQ1x1ODFGNFwiXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXCJcdThCRUZcdTUyMjRcdTRFM0FcIlx1NkNBMVx1NjcwOVwiXHUzMDAyXG4gKiBOb2RlIFx1NzY4NCBodHRwIFx1NkEyMVx1NTc1N1x1NEUwRFx1NTNEN1x1OTg3NVx1OTc2MiBDU1AgXHU3RUE2XHU2NzVGXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BvcnRVcChob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTUwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCByZXEgPSBodHRwLmdldCh7IGhvc3QsIHBvcnQsIHBhdGg6ICcvJywgdGltZW91dDogdGltZW91dE1zIH0sIChyZXMpID0+IHtcbiAgICAgIHJlcy5yZXN1bWUoKVxuICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgIH0pXG4gICAgcmVxLm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgcmVxLmRlc3Ryb3koKVxuICAgICAgcmVzb2x2ZShmYWxzZSlcbiAgICB9KVxuICAgIHJlcS5vbignZXJyb3InLCAoKSA9PiByZXNvbHZlKGZhbHNlKSlcbiAgfSlcbn1cblxuLyoqIFx1OEY2RVx1OEJFMlx1N0I0OVx1NUY4NSBIVFRQIFx1NUMzMVx1N0VFQVx1RkYxQlx1OEQ4NVx1NjVGNlx1OEZENFx1NTZERSBmYWxzZSAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JSZWFkeShob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTIwXzAwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWFkbGluZSA9IERhdGUubm93KCkgKyB0aW1lb3V0TXNcbiAgZm9yICg7Oykge1xuICAgIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0LCAxNTAwKSkgcmV0dXJuIHRydWVcbiAgICBpZiAoRGF0ZS5ub3coKSA+IGRlYWRsaW5lKSByZXR1cm4gZmFsc2VcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA1MDApKVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hlZFNlcnZlciB7XG4gIHByb2M6IENoaWxkUHJvY2Vzc1xuICB1cmw6IHN0cmluZ1xuICAvKiogdHJ1ZSA9IFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwQ1x1NjcyQVx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQiAqL1xuICBhdHRhY2hlZDogYm9vbGVhblxufVxuXG4vKiogXHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IGRzaCB3ZWJcdTMwMDJcdThDMDNcdTc1MjhcdTY1QjlcdThEMUZcdThEMjNcdTc2RDFcdTU0MkMgcHJvYyBcdTc2ODQgZXhpdC9lcnJvclx1MzAwMiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxhdW5jaERzaChvcHRzOiBMYXVuY2hPcHRpb25zICYgeyBkc2hCaW46IHN0cmluZzsgbm9kZUJpbjogc3RyaW5nOyB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhbiB9KTogQ2hpbGRQcm9jZXNzIHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgYXJncyA9IFtvcHRzLmRzaEJpbiwgJ3dlYicsICctLWhvc3QnLCBob3N0LCAnLS1wb3J0JywgU3RyaW5nKHBvcnQpXVxuICBjb25zdCBlbnY6IE5vZGVKUy5Qcm9jZXNzRW52ID0ge1xuICAgIC4uLihvcHRzLmVudiA/PyBwcm9jZXNzLmVudiA/PyB7fSksXG4gICAgRFNIX0hPTUU6IG9wdHMuZHNoSG9tZSxcbiAgfVxuICBpZiAob3B0cy51c2VFbGVjdHJvbkFzTm9kZSkgZW52LkVMRUNUUk9OX1JVTl9BU19OT0RFID0gJzEnXG4gIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBzcGF3biAke29wdHMubm9kZUJpbn0gJHthcmdzLmpvaW4oJyAnKX1gKVxuICBjb25zb2xlLmluZm8oYFtkc2gtaG9zdF0gRFNIX0hPTUU9JHtvcHRzLmRzaEhvbWV9YClcbiAgcmV0dXJuIHNwYXduKG9wdHMubm9kZUJpbiwgYXJncywge1xuICAgIGVudixcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdwaXBlJ10sXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG59XG5cbi8qKlxuICogXHU0RTAwXHU5NTJFXCJcdTc4NkVcdTRGRERcdThGRDBcdTg4NENcIlx1RkYxQVxuICogMS4gXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTc2RjRcdTYzQTVcdTYzMDJcdTYzQTVcdUZGMDhhdHRhY2hlZFx1RkYwQ1x1NEUwRFx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQlx1RkYwOVx1RkYxQlxuICogMi4gXHU1NDI2XHU1MjE5XHU1QjlBXHU0RjREIGRzaCBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHUyMTkyIHNwYXduIFx1MjE5MiBcdTdCNDlcdTVGODVcdTVDMzFcdTdFRUFcdUZGMUJcbiAqIDMuIFx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1RkYwOFx1NTk4Mlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MCBFQUREUklOVVNFXHVGRjA5XHUyMTkyIFx1N0FDQlx1NTM3M1x1OEZENFx1NTZERVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlx1RkYwQ1x1NEUwRFx1NTE4RFx1NzZGMlx1N0I0OVx1MzAwMlxuICogXHU4RkQ0XHU1NkRFIFNlcnZlclN0YXR1c1x1MzAwMlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRHNoUnVubmluZyhvcHRzOiBMYXVuY2hPcHRpb25zKTogUHJvbWlzZTx7IHN0YXR1czogU2VydmVyU3RhdHVzOyBwcm9jPzogQ2hpbGRQcm9jZXNzIH0+IHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgdXJsID0gYGh0dHA6Ly8ke2hvc3R9OiR7cG9ydH0vYFxuXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfSB9XG4gIH1cblxuICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4ob3B0cy5kc2hCaW4pXG4gIGlmICghZm91bmQuYmluKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGZvdW5kLm5vdGVzW2ZvdW5kLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgZHNoIENMSScgfSB9XG4gIH1cbiAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKG9wdHMubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCBvcHRzLnVzZUVtYmVkZGVkTm9kZSlcbiAgY29uc3QgcHJvYyA9IGxhdW5jaERzaCh7IC4uLm9wdHMsIGRzaEJpbjogZm91bmQuYmluLCBub2RlQmluOiBub2RlLm5vZGVCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBub2RlLnVzZUVsZWN0cm9uQXNOb2RlIH0pXG5cbiAgLy8gXHU2NTM2XHU5NkM2IHN0ZGVyciBcdTVDM0VcdTkwRThcdUZGMUFcdTVCNTBcdThGREJcdTdBMEJcdTc5RDJcdTkwMDBcdTY1RjZcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTUzOUZcdTU2RTBcdUZGMDhcdTU5ODIgRUFERFJJTlVTRVx1RkYwOVxuICBsZXQgc3RkZXJyVGFpbCA9ICcnXG4gIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IHtcbiAgICBzdGRlcnJUYWlsID0gKHN0ZGVyclRhaWwgKyBkLnRvU3RyaW5nKCkpLnNsaWNlKC00MDAwKVxuICB9KVxuXG4gIGNvbnN0IGNoaWxkRGllZCA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXNvbHZlKSA9PiB7XG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgfSlcblxuICBjb25zdCByZWFkeSA9IGF3YWl0IFByb21pc2UucmFjZShbXG4gICAgd2FpdEZvclJlYWR5KGhvc3QsIHBvcnQsIG9wdHMudGltZW91dE1zID8/IDEyMF8wMDApLnRoZW4oKCkgPT4gdHJ1ZSksXG4gICAgY2hpbGREaWVkLnRoZW4oKCkgPT4gZmFsc2UpLFxuICBdKVxuXG4gIGlmIChyZWFkeSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IGZhbHNlIH0sIHByb2MgfVxuICB9XG5cbiAgLy8gXHU1QjUwXHU4RkRCXHU3QTBCXHU1REYyXHU5MDAwXHU1MUZBXHVGRjFBXHU1MThEXHU2M0EyXHU0RTAwXHU2QjIxXHU3QUVGXHU1M0UzXHVGRjA4XHU1M0VGXHU4MEZEXHU4OEFCXHU1MjJCXHU3Njg0XHU1QjlFXHU0RjhCXHU2MkEyXHU4REQxXHU3RUQxXHU1QjlBXHVGRjA5XHVGRjBDXHU1NDI2XHU1MjE5XHU3RUQ5XHU1MUZBXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfSwgcHJvYyB9XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbCkgfSwgcHJvYyB9XG59XG5cbi8qKiBcdTRFQ0Ugc3RkZXJyIFx1NUMzRVx1OTBFOFx1NjNEMFx1NzBCQ1x1NTNFRlx1OEJGQlx1OTUxOVx1OEJFRiAqL1xuZnVuY3Rpb24gc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IHN0ZGVyclRhaWwuc3BsaXQoL1xccj9cXG4vKS5maWx0ZXIoQm9vbGVhbilcbiAgY29uc3QgYWRkckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFQUREUklOVVNFJykpXG4gIGNvbnN0IGVyckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFcnJvcjonKSlcbiAgaWYgKGFkZHJMaW5lKSB7XG4gICAgcmV0dXJuICdcdTdBRUZcdTUzRTNcdTVERjJcdTg4QUJcdTUzNjBcdTc1MjhcdUZGMDhFQUREUklOVVNFXHVGRjA5XHUzMDAyXHU4QkY3XHU2MzYyXHU0RTAwXHU0RTJBXHU3QUVGXHU1M0UzXHVGRjBDXHU2MjE2XHU1MTQ4XHU1MDVDXHU2Mzg5XHU1MzYwXHU3NTI4XHU4QkU1XHU3QUVGXHU1M0UzXHU3Njg0XHU2NzBEXHU1MkExXHU1NDBFXHU5MUNEXHU4QkQ1J1xuICB9XG4gIGlmIChlcnJMaW5lKSB7XG4gICAgY29uc3QgY2xlYW5lZCA9IGVyckxpbmUudHJpbSgpLnNsaWNlKDAsIDMwMClcbiAgICByZXR1cm4gYGRzaCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7Y2xlYW5lZH1gXG4gIH1cbiAgcmV0dXJuICdEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBXHVGRjA4XHU2NUUwXHU4QkU2XHU3RUM2XHU5NTE5XHU4QkVGXHVGRjA5XHUzMDAyXHU4QkY3XHU2N0U1XHU3NzBCIE9ic2lkaWFuIFx1NjNBN1x1NTIzNlx1NTNGMCBbZHNoXSBcdTY1RTVcdTVGRDcnXG59XG5cbi8qKiBcdTUwNUNcdTZCNjJcdTVCNTBcdThGREJcdTdBMEJcdUZGMDhTSUdURVJNXHVGRjBDXHU3QjQ5XHU1Rjg1XHU5MDAwXHU1MUZBXHVGRjFCXHU4RDg1XHU2NUY2XHU1NDBFIFNJR0tJTExcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wUHJvY2Vzcyhwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsIHwgdW5kZWZpbmVkLCB0aW1lb3V0TXMgPSA1MDAwKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghcHJvYyB8fCBwcm9jLmV4aXRDb2RlICE9PSBudWxsIHx8IHByb2Muc2lnbmFsQ29kZSAhPT0gbnVsbCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBwcm9jLmtpbGwoJ1NJR0tJTEwnKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH0sIHRpbWVvdXRNcylcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9KVxuICAgIHRyeSB7XG4gICAgICBwcm9jLmtpbGwoJ1NJR1RFUk0nKVxuICAgIH0gY2F0Y2gge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuICB9KVxufVxuIiwgIi8qKlxuICogXHU4QkJFXHU3RjZFXHVGRjFBXHU1QjU3XHU2QkI1ICsgXHU4QkJFXHU3RjZFXHU5ODc1IFVJXHUzMDAyXG4gKiBWMC4yXHVGRjFBRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHVGRjA4XHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIC8gXHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQiAvIFx1ODFFQVx1NUI5QVx1NEU0OVx1RkYwOVx1MzAwMlxuICovXG5cbmltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCB0eXBlIERzaEhvbWVNb2RlID0gJ3NoYXJlZCcgfCAncGVyLXZhdWx0JyB8ICdjdXN0b20nXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHNoRG9ja1NldHRpbmdzIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbjogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NEYxOFx1NTE0OFx1RkYwOSAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0XHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q6IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydDogbnVtYmVyXG4gIC8qKiBEU0hfSE9NRSBcdTZBMjFcdTVGMEZcdUZGMUFzaGFyZWQ9XHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQnBlci12YXVsdD1cdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjFCY3VzdG9tPVx1ODFFQVx1NUI5QVx1NEU0OSAqL1xuICBkc2hIb21lTW9kZTogRHNoSG9tZU1vZGVcbiAgLyoqIFx1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODRcdUZGMDhcdTRFQzUgY3VzdG9tIFx1NkEyMVx1NUYwRlx1NzUxRlx1NjU0OFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqIFx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlOiBib29sZWFuXG4gIC8qKiBPYnNpZGlhbiBcdTU0MkZcdTUyQThcdTY1RjZcdTgxRUFcdTUyQThcdTYyQzlcdThENzcgRFNIICovXG4gIGF1dG9zdGFydDogYm9vbGVhblxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRHNoRG9ja1NldHRpbmdzID0ge1xuICBkc2hCaW46ICcnLFxuICBub2RlQmluOiAnJyxcbiAgaG9zdDogJzEyNy4wLjAuMScsXG4gIHBvcnQ6IDMwODAsXG4gIGRzaEhvbWVNb2RlOiAnc2hhcmVkJyxcbiAgZHNoSG9tZTogJycsXG4gIHVzZUVtYmVkZGVkTm9kZTogZmFsc2UsXG4gIGF1dG9zdGFydDogdHJ1ZSxcbn1cblxuZXhwb3J0IGNsYXNzIERzaERvY2tTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIGN1c3RvbUhvbWVFbD86IFNldHRpbmdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pXG4gIH1cblxuICBvdmVycmlkZSBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXNcbiAgICBjb250YWluZXJFbC5lbXB0eSgpXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1Njk4Mlx1ODlDOCAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnXHUyNkY1IERTSCBEb2NrJyB9KVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge1xuICAgICAgY2xzOiAnZHNoLWRvY2stc2V0dGluZ3MtZGVzYycsXG4gICAgICB0ZXh0OiAnXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgV2ViIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhblx1RkYxQVx1NUI5QVx1NEY0RCBkc2ggXHUyMTkyIFx1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0QyBcdTIxOTIgXHU5NzYyXHU2NzdGXHU1RDRDXHU1MTY1XHUzMDAyXHU1MTY4XHU3QTBCXHU1Qjk4XHU2NUI5XHVGRjBDXHU5NkY2XHU4MUVBXHU3ODE0XHUzMDAyJyxcbiAgICB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY3MERcdTUyQTFcdTYzQTdcdTUyMzYgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1NjcwRFx1NTJBMScgfSlcbiAgICBjb25zdCBzdGF0dXNMaW5lID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NzBEXHU1MkExXHU3MkI2XHU2MDAxJylcbiAgICAgIC5zZXREZXNjKHRoaXMuZGVzY3JpYmVTdGF0dXMoKSlcbiAgICBjb25zdCBidG5zID0gc3RhdHVzTGluZS5jb250cm9sRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYnRucycgfSlcbiAgICBjb25zdCBzdGFydEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnbW9kLWN0YScsIHRleHQ6ICdcdTI1QjYgXHU1NDJGXHU1MkE4JyB9KVxuICAgIHN0YXJ0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgc3RvcEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVBMCBcdTUwNUNcdTZCNjInIH0pXG4gICAgc3RvcEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdG9wKCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgb3BlbkJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicgfSlcbiAgICBvcGVuQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5QYW5lbCgpXG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5NjhGIE9ic2lkaWFuIFx1ODFFQVx1NTJBOFx1NTQyRlx1NTJBOCcpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1OEZEMFx1ODg0Q1x1NjVGNiAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU4RkQwXHU4ODRDXHU2NUY2JyB9KVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ2RzaCBDTEkgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEJcdUZGMDhEU0hfQklOIFx1MjE5MiBucG0gcm9vdCAtZyBcdTIxOTIgXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXHU1M0VGXHU1ODZCIGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTYyMTYgYmluLmpzIFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcy9AZGVlcHNlZWstYWkvZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmRldGVjdExpbmUgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNicpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9iaW4vbm9kZScpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZScpXG4gICAgICAuc2V0RGVzYygnRUxFQ1RST05fUlVOX0FTX05PREVcdTMwMDJcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdTIwMTRcdTIwMTRcdTVCOUVcdTZENEIgT2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XHU0RUU1IE5vZGUgXHU2QTIxXHU1RjBGXHU4RkQwXHU4ODRDXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjBDXHU0RUM1XHU1NzI4XHU5QThDXHU4QkMxXHU1M0VGXHU3NTI4XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyJylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU3RjUxXHU3RURDIC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTdGNTFcdTdFREMnIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzJylcbiAgICAgIC5zZXREZXNjKCdcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1MzAwMlx1NTg2QiAwIFx1OEJBOVx1N0NGQlx1N0VERlx1NTIwNlx1OTE0RFx1N0E3QVx1OTVGMlx1N0FFRlx1NTNFM1x1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignMzA4MCcpXG4gICAgICAgICAgLnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5wb3J0KSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG4gPSBOdW1iZXIodi50cmltKCkpXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wb3J0ID0gTnVtYmVyLmlzSW50ZWdlcihuKSAmJiBuID49IDAgJiYgbiA8PSA2NTUzNSA/IG4gOiAzMDgwXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTUgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVx1RkYwOERTSF9IT01FXHVGRjA5JyB9KVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NkEyMVx1NUYwRicpXG4gICAgICAuc2V0RGVzYygnRFNIIFx1NzY4NFx1NEYxQVx1OEJERC9cdTVCQzZcdTk0QTUvXHU2QTIxXHU1NzhCXHU5MTREXHU3RjZFXHU2ODM5XHU3NkVFXHU1RjU1XHUzMDAyJylcbiAgICAgIC5hZGREcm9wZG93bigoZGQpID0+IHtcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdzaGFyZWQnLCAnXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1NEUwRSBkc2ggQ0xJIFx1NEUwMFx1ODFGNFx1RkYwQ1x1NTkwRFx1NzUyOFx1NzNCMFx1NjcwOVx1OTE0RFx1N0Y2RVx1RkYwOScpXG4gICAgICAgIGRkLmFkZE9wdGlvbigncGVyLXZhdWx0JywgJ1x1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkIgfi8uZHNoL3ZhdWx0cy88XHU1NDBEPi08aGFzaD4nKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2N1c3RvbScsICdcdTgxRUFcdTVCOUFcdTRFNDlcdThERUZcdTVGODQnKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSlcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSA9IHYgYXMgRHNoSG9tZU1vZGVcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuY3VzdG9tSG9tZUVsPy5zZXREaXNhYmxlZCh2ICE9PSAnY3VzdG9tJylcbiAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIHRoaXMuY3VzdG9tSG9tZUVsID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NCcpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9Vc2Vycy95b3UvLmRzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuY3VzdG9tSG9tZUVsLnNldERpc2FibGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlICE9PSAnY3VzdG9tJylcblxuICAgIHRoaXMuaG9tZVByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RMaW5lITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBob21lUHJldmlldyE6IEhUTUxFbGVtZW50XG5cbiAgcHJpdmF0ZSBkZXNjcmliZVN0YXR1cygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgcmV0dXJuIGAke3MudXJsfVx1RkYwOCR7cy5hdHRhY2hlZCA/ICdcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJ1x1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0Q1x1NEUyRCd9XHVGRjA5YFxuICAgIH1cbiAgICBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSByZXR1cm4gJ1x1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNlx1RkYwOFx1OTk5Nlx1NkIyMVx1N0VBNiAxMCBcdTc5RDJcdUZGMENcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOSdcbiAgICBpZiAocy5raW5kID09PSAnZXJyb3InKSByZXR1cm4gYFx1NTkzMVx1OEQyNTogJHtzLm1lc3NhZ2V9YFxuICAgIHJldHVybiAnXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURldGVjdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnBsdWdpbi5kZXRlY3RJbmZvKClcbiAgICByZXR1cm4gW1xuICAgICAgYGRzaDogJHtpbmZvLmRzaEJpbiA/PyAnXHU2NzJBXHU2MjdFXHU1MjMwJ30ke2luZm8uZHNoTm90ZXMubGVuZ3RoID8gYFx1RkYwOCR7aW5mby5kc2hOb3Rlcy5qb2luKCdcdUZGMUInKX1cdUZGMDlgIDogJyd9YCxcbiAgICAgIGBub2RlOiAke2luZm8ubm9kZU5vdGVzLmpvaW4oJ1x1RkYxQicpfWAsXG4gICAgXS5qb2luKCdcXG4nKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1OERFRlx1NUY4NDogJHt0aGlzLnBsdWdpbi5lZmZlY3RpdmVEc2hIb21lKCl9YFxuICB9XG59XG4iLCAiLyoqXG4gKiBEc2hXZWJWaWV3IFx1MjAxNFx1MjAxNCBcdTYyOEFcdTVCOThcdTY1QjkgRFNIIFdlYiAoMTI3LjAuMC4xOjxwb3J0PikgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuIFx1OTc2Mlx1Njc3Rlx1MzAwMlxuICogXHU1RTI2XHU1QjhDXHU2NTc0XHU4RkM3XHU3QTBCXHU3MkI2XHU2MDAxXHVGRjFBXHU1MkEwXHU4RjdEXHU1MkE4XHU3NTNCIC8gXHU5NTE5XHU4QkVGXHU1MzYxXHU3MjQ3XHVGRjA4XHU1NDJCXHU5MUNEXHU4QkQ1XHVGRjA5LyBcdTY3MkFcdTU0MkZcdTUyQThcdTdBN0FcdTcyQjZcdTYwMDEgLyBcdTU2RkVcdTY4MDdcdTVERTVcdTUxNzdcdTY4MEZcdTMwMDJcbiAqIGlmcmFtZSBcdTYzMDdcdTU0MTFcdTVCOThcdTY1QjlcdTY3MERcdTUyQTFcdUZGMENVSSBcdTUzRUFcdTY2MkZcIlx1ODIzOVx1NTc1RVwiXHU1OTE2XHU1OEYzXHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24gfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgY29uc3QgRFNIX1dFQl9WSUVXX1RZUEUgPSAnZHNoLWRvY2std2ViJ1xuXG50eXBlIFVpU3RhdGUgPSAncnVubmluZycgfCAnc3RhcnRpbmcnIHwgJ2Vycm9yJyB8ICdzdG9wcGVkJ1xuXG5leHBvcnQgY2xhc3MgRHNoV2ViVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBpZnJhbWVFbDogSFRNTElGcmFtZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHBpbGxFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIG92ZXJsYXlFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHRvZ2dsZUJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIGN1cnJlbnQ6IFVpU3RhdGUgPSAnc3RvcHBlZCdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihsZWFmKVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gRFNIX1dFQl9WSUVXX1RZUEVcbiAgfVxuXG4gIG92ZXJyaWRlIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdEU0ggRG9jaydcbiAgfVxuXG4gIG92ZXJyaWRlIGdldEljb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ2FuY2hvcidcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2snIH0pXG5cbiAgICAvLyAtLS0tIFx1NTkzNFx1OTBFOFx1NURFNVx1NTE3N1x1NjgwRiAtLS0tXG4gICAgY29uc3QgaGVhZGVyID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1oZWFkZXInIH0pXG4gICAgY29uc3QgbG9nbyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1sb2dvJyB9KVxuICAgIHNldEljb24obG9nbywgJ2FuY2hvcicpXG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay10aXRsZScsIHRleHQ6ICdEU0ggRG9jaycgfSlcbiAgICB0aGlzLnBpbGxFbCA9IGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stcGlsbCcgfSlcbiAgICBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3BhY2VyJyB9KVxuXG4gICAgdGhpcy50b2dnbGVCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHRoaXMudG9nZ2xlQnRuLm9uY2xpY2sgPSAoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKVxuXG4gICAgY29uc3QgcmVmcmVzaEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihyZWZyZXNoQnRuLCAncmVmcmVzaC1jdycpXG4gICAgcmVmcmVzaEJ0bi50aXRsZSA9ICdcdTUyMzdcdTY1QjAnXG4gICAgcmVmcmVzaEJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5yZWxvYWQoKVxuXG4gICAgY29uc3QgcG9wb3V0QnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHBvcG91dEJ0biwgJ21heGltaXplLTInKVxuICAgIHBvcG91dEJ0bi50aXRsZSA9ICdcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhcdTcyRUNcdTdBQ0JcdThGREJcdTdBMEJcdUZGMENcdTYwMjdcdTgwRkRcdTdCNDlcdTU0MENcdTZENEZcdTg5QzhcdTU2NjhcdUZGMDknXG4gICAgcG9wb3V0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5Qb3BvdXQoKVxuICAgIH1cblxuICAgIGNvbnN0IGJyb3dzZXJCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24oYnJvd3NlckJ0biwgJ2V4dGVybmFsLWxpbmsnKVxuICAgIGJyb3dzZXJCdG4udGl0bGUgPSAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJ1xuICAgIGJyb3dzZXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlbkluQnJvd3NlcigpXG4gICAgfVxuXG4gICAgLy8gLS0tLSBcdTRFM0JcdTRGNTNcdUZGMUFpZnJhbWUgKyBcdTcyQjZcdTYwMDFcdTg5ODZcdTc2RDZcdTVDNDIgLS0tLVxuICAgIGNvbnN0IGJvZHkgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJvZHknIH0pXG4gICAgdGhpcy5pZnJhbWVFbCA9IGJvZHkuY3JlYXRlRWwoJ2lmcmFtZScsIHsgY2xzOiAnZHNoLWRvY2stZnJhbWUnIH0pXG4gICAgdGhpcy5vdmVybGF5RWwgPSBib2R5LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLW92ZXJsYXknIH0pXG5cbiAgICAvLyBcdTcyQjZcdTYwMDFcdTgwNTRcdTUyQThcbiAgICB0aGlzLnBsdWdpbi5vblN0YXR1c0NoYW5nZSgoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB0aGlzLnJlZnJlc2goKVxuXG4gICAgLy8gXHU1MTVDXHU1RTk1XHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGXHU2NUY2XHU4MkU1XHU2NzBEXHU1MkExXHU2NzJBXHU1NDJGXHU1MkE4XHU0RTE0XHU3QUVGXHU1M0UzXHU1M0VGXHU3NTI4XHVGRjBDXHU1QzFEXHU4QkQ1XHU2MkM5XHU4RDc3XG4gICAgdm9pZCB0aGlzLmVuc3VyZVN0YXJ0ZWQoKVxuICB9XG5cbiAgb3ZlcnJpZGUgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25Ub2dnbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoKClcbiAgfVxuXG4gIC8qKiBcdTk3NjJcdTY3N0ZcdTYyNTNcdTVGMDBcdTY1RjZcdTc4NkVcdTRGRERcdTY3MERcdTUyQTFcdTU3MjhcdThERDFcdUZGMDhcdTVERjJcdTU3MjhcdThERDFcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDkgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVTdGFydGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdzdG9wcGVkJyB8fCBzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICAgIHRoaXMucmVmcmVzaCgpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGxldCB1aTogVWlTdGF0ZVxuICAgIGxldCBwaWxsVGV4dCA9ICcnXG4gICAgbGV0IHBpbGxDbHMgPSAnJ1xuXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB1aSA9ICdydW5uaW5nJ1xuICAgICAgcGlsbFRleHQgPSBgXHUyNUNGICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICcgXHUwMEI3IFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnJ31gXG4gICAgICBwaWxsQ2xzID0gJ2lzLXJ1bm5pbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHVpID0gJ3N0YXJ0aW5nJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNDIFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNidcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RhcnRpbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHVpID0gJ2Vycm9yJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNzE1IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNSdcbiAgICAgIHBpbGxDbHMgPSAnaXMtZXJyb3InXG4gICAgfSBlbHNlIHtcbiAgICAgIHVpID0gJ3N0b3BwZWQnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0IgXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICAgICAgcGlsbENscyA9ICdpcy1zdG9wcGVkJ1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHVpXG4gICAgaWYgKHRoaXMucGlsbEVsKSB7XG4gICAgICB0aGlzLnBpbGxFbC5zZXRUZXh0KHBpbGxUZXh0KVxuICAgICAgdGhpcy5waWxsRWwuY2xhc3NOYW1lID0gYGRzaC1kb2NrLXBpbGwgJHtwaWxsQ2xzfWBcbiAgICB9XG4gICAgaWYgKHRoaXMudG9nZ2xlQnRuKSB7XG4gICAgICB0aGlzLnRvZ2dsZUJ0bi5lbXB0eSgpXG4gICAgICBzZXRJY29uKHRoaXMudG9nZ2xlQnRuLCBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgIHRoaXMudG9nZ2xlQnRuLnRpdGxlID0gcy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4J1xuICAgIH1cblxuICAgIC8vIGlmcmFtZSBcdTRFMEVcdTg5ODZcdTc2RDZcdTVDNDJcbiAgICBpZiAodWkgPT09ICdydW5uaW5nJykge1xuICAgICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5pZnJhbWVFbC5zcmMgIT09IHRoaXMucGx1Z2luLmJhc2VVcmwpIHtcbiAgICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgICB9XG4gICAgICB0aGlzLnNob3dPdmVybGF5KG51bGwpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0YXJ0aW5nKCkpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlckVycm9yKHMua2luZCA9PT0gJ2Vycm9yJyA/IHMubWVzc2FnZSA6ICdcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUYnKSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0b3BwZWQoKSlcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tIFx1ODk4Nlx1NzZENlx1NUM0Mlx1NkUzMlx1NjdEMyAtLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBzaG93T3ZlcmxheShjb250ZW50OiBIVE1MRWxlbWVudCB8IG51bGwpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMub3ZlcmxheUVsKSByZXR1cm5cbiAgICB0aGlzLm92ZXJsYXlFbC5lbXB0eSgpXG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgIHRoaXMub3ZlcmxheUVsLmFwcGVuZENoaWxkKGNvbnRlbnQpXG4gICAgICB0aGlzLm92ZXJsYXlFbC5yZW1vdmVBdHRyaWJ1dGUoJ2hpZGRlbicpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFx1OEZEMFx1ODg0Q1x1NEUyRFx1RkYxQVx1NjYzRVx1NUYwRlx1OTY5MFx1ODVDRlx1ODk4Nlx1NzZENlx1NUM0Mlx1RkYwOFx1NTQyNlx1NTIxOVx1N0E3QVx1NzY4NFx1N0VERFx1NUJGOVx1NUI5QVx1NEY0RFx1NUM0Mlx1NEYxQVx1NjMyMVx1NEY0RiBpZnJhbWVcdUZGMDlcbiAgICAgIHRoaXMub3ZlcmxheUVsLnNldEF0dHJpYnV0ZSgnaGlkZGVuJywgJycpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGFydGluZygpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwaW5uZXInIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ1x1NkI2M1x1NTcyOFx1NTQyRlx1NTJBOFx1NUI5OFx1NjVCOSBEU0ggV2ViXHUyMDI2JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoe1xuICAgICAgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJyxcbiAgICAgIHRleHQ6ICdcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOFx1N0VBNiAxMCBcdTc5RDJcdUZGMDlcdUZGMUJcdTdBRUZcdTUzRTNcdTg4QUJcdTUzNjBcdTc1MjhcdTY1RjZcdTVDMDZcdTgxRUFcdTUyQThcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnLFxuICAgIH0pXG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FsZXJ0LXRyaWFuZ2xlJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtbXNnJywgdGV4dDogbWVzc2FnZSB9KVxuICAgIGNvbnN0IHJldHJ5ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0bicsIHRleHQ6ICdcdTkxQ0RcdThCRDUnIH0pXG4gICAgcmV0cnkub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0b3BwZWQoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbmNob3InKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU2NzJBXHU4RkQwXHU4ODRDJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLCB0ZXh0OiAnXHU3MEI5XHU1MUZCXHU1NDJGXHU1MkE4XHVGRjBDXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgXHU1MDVDXHU5NzYwXHU4RkRCXHU2NzY1JyB9KVxuICAgIGNvbnN0IHN0YXJ0ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0biBtb2QtY3RhJywgdGV4dDogJ1x1NTQyRlx1NTJBOCBEU0gnIH0pXG4gICAgc3RhcnQub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbG9hZCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgfVxuICB9XG59XG4iXSwKICAibWFwcGlu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VUFBTSxZQUFhLEtBQUssSUFBSSxNQUFNLFFBQTJDLGNBQWM7QUFDM0YsV0FBTyxlQUFlLEtBQUssVUFBVSxTQUFTO0FBQUEsRUFDaEQ7QUFBQSxFQUVBLE1BQWMsZUFBOEI7QUFDMUMsVUFBTSxPQUFPLE1BQU0sS0FBSyxTQUFTO0FBQ2pDLFNBQUssV0FBVyxPQUFPLE9BQU8sQ0FBQyxHQUFHLGtCQUFrQixRQUFRLENBQUMsQ0FBQztBQUU5RCxVQUFNLFNBQVM7QUFDZixRQUFJLFFBQVEsV0FBVyxPQUFPLE9BQU8sWUFBWSxZQUFZLE9BQU8sUUFBUSxLQUFLLEdBQUc7QUFDbEYsV0FBSyxTQUFTLGNBQWM7QUFDNUIsV0FBSyxTQUFTLFVBQVUsT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQTtBQUFBLEVBSUEsTUFBTSxZQUEyQjtBQUMvQixVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsVUFBTSxTQUFTLFVBQVUsZ0JBQWdCLGlCQUFpQjtBQUMxRCxRQUFJLE9BQTZCLE9BQU8sQ0FBQyxLQUFLO0FBQzlDLFFBQUksQ0FBQyxNQUFNO0FBQ1QsYUFBTyxVQUFVLGFBQWEsS0FBSztBQUNuQyxVQUFJLENBQUMsS0FBTTtBQUNYLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRTtBQUNBLGNBQVUsY0FBYyxJQUFJO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sZ0JBQStCO0FBQ25DLFVBQU0sRUFBRSxNQUFNLElBQUksUUFBUSxVQUFVO0FBQ3BDLFVBQU0sTUFBTSxhQUFhLEtBQUssT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLE1BQU0sYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sT0FBTyxLQUFLLElBQUksVUFBVSxlQUFlO0FBQy9DLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRSxTQUFTLEtBQUs7QUFDWixZQUFNLE1BQU0sZUFBZSxRQUFRLElBQUksVUFBVSxPQUFPLEdBQUc7QUFDM0QsVUFBSSx3QkFBTyxxREFBYSxHQUFHLEVBQUU7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIm9zIiwgInBhdGgiLCAiZW1iZWRkZWROb2RlVmVyc2lvbiIsICJyZXNvbHZlIiwgImltcG9ydF9vYnNpZGlhbiJdCn0K
