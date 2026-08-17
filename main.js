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
  computePort: () => computePort,
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
  console.info(`[dsh-host] DSH_HOME=${opts.dshHome}${opts.cwd ? ` cwd=${opts.cwd}` : ""}`);
  return (0, import_child_process.spawn)(opts.nodeBin, args, {
    env,
    cwd: opts.cwd,
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
    new import_obsidian.Setting(containerEl).setName("\u76D1\u542C\u7AEF\u53E3\uFF08\u57FA\u51C6\uFF09").setDesc("\u5B98\u65B9\u9ED8\u8BA4 3080\u3002shared/custom \u6A21\u5F0F\u76F4\u63A5\u4F7F\u7528\uFF1Bper-vault \u6A21\u5F0F\u5728\u6B64\u57FA\u7840\u4E0A\u6309 vault \u6D3E\u751F\u72EC\u7ACB\u7AEF\u53E3\uFF08\u6BCF vault \u72EC\u5360\uFF0C\u4F1A\u8BDD\u4E92\u4E0D\u53EF\u89C1\uFF09\u3002").addText(
      (t) => t.setPlaceholder("3080").setValue(String(this.plugin.settings.port)).onChange(async (v) => {
        const n = Number(v.trim());
        this.plugin.settings.port = Number.isInteger(n) && n >= 0 && n <= 65535 ? n : 3080;
        await this.plugin.saveSettings();
        this.netPreview.textContent = this.describeNet();
      })
    );
    this.netPreview = containerEl.createEl("div", { cls: "dsh-dock-detect" });
    containerEl.createEl("h3", { text: "\u6570\u636E\u76EE\u5F55\uFF08DSH_HOME\uFF09\u4E0E\u4F1A\u8BDD\u9694\u79BB" });
    new import_obsidian.Setting(containerEl).setName("\u6A21\u5F0F").setDesc("DSH \u7684\u4F1A\u8BDD/\u5BC6\u94A5/\u6A21\u578B\u914D\u7F6E\u6839\u76EE\u5F55\u3002per-vault \u6A21\u5F0F = \u6BCF\u4E2A vault \u72EC\u7ACB DSH_HOME + \u72EC\u7ACB\u7AEF\u53E3\uFF0C\u5404\u81EA\u53EA\u663E\u793A\u672C vault \u521B\u5EFA/\u65B0\u5EFA\u7684\u4F1A\u8BDD\uFF0C\u4E92\u4E0D\u76F8\u901A\u3002").addDropdown((dd) => {
      dd.addOption("shared", "\u5B98\u65B9\u5171\u4EAB ~/.dsh\uFF08\u6240\u6709 vault \u5171\u7528\u4E00\u5957\u4F1A\u8BDD\uFF0C\u4E0E dsh CLI \u4E00\u81F4\uFF09");
      dd.addOption("per-vault", "\u6BCF vault \u9694\u79BB ~/.dsh/vaults/<\u540D>-<hash>\uFF08\u4F1A\u8BDD\u5B8C\u5168\u72EC\u7ACB\uFF09");
      dd.addOption("custom", "\u81EA\u5B9A\u4E49\u8DEF\u5F84");
      dd.setValue(this.plugin.settings.dshHomeMode);
      dd.onChange(async (v) => {
        this.plugin.settings.dshHomeMode = v;
        await this.plugin.saveSettings();
        this.customHomeEl?.setDisabled(v !== "custom");
        this.homePreview.textContent = this.describeDshHome();
        this.netPreview.textContent = this.describeNet();
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
    this.netPreview.textContent = this.describeNet();
  }
  detectLine;
  homePreview;
  netPreview;
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
  describeNet() {
    const port = this.plugin.effectivePort();
    const mode = this.plugin.settings.dshHomeMode;
    const suffix = mode === "per-vault" ? "\uFF08\u672C vault \u72EC\u5360\uFF0C\u4E0E\u5176\u4ED6 vault \u9694\u79BB\uFF09" : "\uFF08shared/custom\uFF1A\u6240\u6709 vault \u5171\u7528\uFF09";
    return `\u751F\u6548\u7AEF\u53E3: ${port}${suffix}`;
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
function computePort(s, vaultRoot) {
  if (s.dshHomeMode === "per-vault" && vaultRoot) {
    const offset = parseInt(stableHash(vaultRoot), 36) % 4096;
    return s.port + offset;
  }
  return s.port;
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
    const vaultRoot = this.vaultRoot();
    const port = computePort(this.settings, vaultRoot);
    return `http://${this.settings.host}:${port}/`;
  }
  /** 当前 vault 根目录（无则 undefined） */
  vaultRoot() {
    return this.app.vault.adapter.getBasePath?.();
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
      const vaultRoot = this.vaultRoot();
      const dshHome = computeDshHome(this.settings, vaultRoot);
      const port = computePort(this.settings, vaultRoot);
      const vaultInfo = currentVaultInfo(this.app);
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port,
        host: this.settings.host,
        dshHome,
        useEmbeddedNode: this.settings.useEmbeddedNode,
        // 子进程工作目录 = vault 根：新建会话的 cwd 即该 vault，会话持久化
        // 按 vault 分目录，重启/恢复后仍关联（vault 工具解析顺序自动命中）。
        cwd: vaultRoot,
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
    return computeDshHome(this.settings, this.vaultRoot());
  }
  /** 当前设置下生效的端口（per-vault 模式每 vault 独立） */
  effectivePort() {
    return computePort(this.settings, this.vaultRoot());
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
  computeDshHome,
  computePort
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSB7IENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7XG4gIGVtYmVkZGVkTm9kZVZlcnNpb24sXG4gIGVuc3VyZURzaFJ1bm5pbmcsXG4gIHJlc29sdmVEc2hCaW4sXG4gIHJlc29sdmVOb2RlQmluLFxuICBzYWZlVmF1bHROYW1lLFxuICBzdGFibGVIYXNoLFxuICBzdG9wUHJvY2VzcyxcbiAgdHlwZSBTZXJ2ZXJTdGF0dXMsXG59IGZyb20gJy4vbGF1bmNoZXInXG5pbXBvcnQgeyBEc2hEb2NrU2V0dGluZ3NUYWIsIERFRkFVTFRfU0VUVElOR1MsIHR5cGUgRHNoRG9ja1NldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncydcbmltcG9ydCB7IERzaFdlYlZpZXcsIERTSF9XRUJfVklFV19UWVBFIH0gZnJvbSAnLi92aWV3J1xuaW1wb3J0IHsgY3VycmVudFZhdWx0SW5mbywgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIgfSBmcm9tICcuL2N1cnJlbnRWYXVsdCdcblxuLyoqXG4gKiBcdThCQTFcdTdCOTcgRFNIX0hPTUVcdUZGMUFcbiAqIC0gc2hhcmVkXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFBfi8uZHNoIFx1MjAxNFx1MjAxNCBcdTRFMEVcdTVCOThcdTY1QjkgZHNoIENMSSBcdTVCOENcdTUxNjhcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTVERjJcdTY3MDlcdTkxNERcdTdGNkUvXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURzaEhvbWUoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAnZHNoSG9tZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKClcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgcmV0dXJuIHMuZHNoSG9tZS50cmltKCkgfHwgcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbiAgfVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcpIHtcbiAgICBjb25zdCBuYW1lID0gdmF1bHRSb290ID8gYCR7c2FmZVZhdWx0TmFtZSh2YXVsdFJvb3QpfS0ke3N0YWJsZUhhc2godmF1bHRSb290KX1gIDogJ3ZhdWx0J1xuICAgIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnLCAndmF1bHRzJywgbmFtZSlcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbn1cblxuLyoqXG4gKiBcdThCQTFcdTdCOTdcdTY3MkMgdmF1bHQgXHU3Njg0XHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHUzMDAyXG4gKiAtIHNoYXJlZCAvIGN1c3RvbVx1RkYxQXNldHRpbmdzLnBvcnRcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOVx1MjAxNFx1MjAxNCBcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU1NDBDXHU0RTAwXHU2NzBEXHU1MkExXHU0RTBFXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQXNldHRpbmdzLnBvcnQgKyAoc3RhYmxlSGFzaCAlIDQwOTYpIFx1MjAxNFx1MjAxNCBcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3MkVDXHU1MzYwXHU3QUVGXHU1M0UzXHVGRjBDXHU1NDA0XHU4MUVBXG4gKiAgIHNwYXduIFx1NzJFQ1x1N0FDQlx1NzY4NCBkc2ggXHU4RkRCXHU3QTBCXHVGRjFCXHU5MTREXHU1NDA4XHU3MkVDXHU3QUNCXHU3Njg0IERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREXHU1QjU4XHU1MEE4XHU2ODM5XHVGRjA5XHVGRjBDXHU0RTBEXHU1NDBDIHZhdWx0IFx1NzY4NFxuICogICBcdTRGMUFcdThCRERcdTVCOENcdTUxNjhcdTk2OTRcdTc5QkJcdUZGMENcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdTMwMDJcdTdBRUZcdTUzRTNcdTUxQjJcdTdBODFcdTY5ODJcdTczODcgfjEvNDA5Nlx1RkYwQ1x1NTNFRlx1NjNBNVx1NTNEN1x1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVBvcnQoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAncG9ydCc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludChzdGFibGVIYXNoKHZhdWx0Um9vdCksIDM2KSAlIDQwOTZcbiAgICByZXR1cm4gcy5wb3J0ICsgb2Zmc2V0XG4gIH1cbiAgcmV0dXJuIHMucG9ydFxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEc2hEb2NrUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IERzaERvY2tTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1NcbiAgcHJpdmF0ZSBwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1czogU2VydmVyU3RhdHVzID0geyBraW5kOiAnc3RvcHBlZCcgfVxuICBwcml2YXRlIHN0YXJ0aW5nID0gZmFsc2VcbiAgcHJpdmF0ZSBzdGF0dXNCYXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1c0xpc3RlbmVycyA9IG5ldyBTZXQ8KCkgPT4gdm9pZD4oKVxuICAvKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTk5XHU1MTY1XHU5NjMyXHU2Mjk2IHRpbWVyXHVGRjA4XHU3QTk3XHU1M0UzIGZvY3VzIFx1NTNFRlx1ODBGRFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1RkYwOSAqL1xuICBwcml2YXRlIG1hcmtlclRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsXG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlxuXG4gIG92ZXJyaWRlIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpXG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhEU0hfV0VCX1ZJRVdfVFlQRSwgKGxlYWYpID0+IG5ldyBEc2hXZWJWaWV3KGxlYWYsIHRoaXMpKVxuXG4gICAgLy8gXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHRcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHVGRjFBXHU2NzJDXHU3QTk3XHU1M0UzXHU2MjUzXHU1RjAwXHVGRjA4b25sb2FkXHVGRjA5XHU0RTBFXHU2QkNGXHU2QjIxXHU4M0I3XHU1Rjk3XG4gICAgLy8gXHU3MTI2XHU3MEI5XHU2NUY2XHU1MjM3XHU2NUIwXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHUzMDAyXHU1OTFBXHU3QTk3XHU1M0UzXHU1NzNBXHU2NjZGXHU0RTBCXHU2QkNGXHU0RTJBXHU3QTk3XHU1M0UzXHU5MEZEXHU3MkVDXHU3QUNCXHU1MkEwXHU4RjdEXHU2NzJDXHU2M0QyXHU0RUY2XHVGRjBDXHU2NzAwXHU1NDBFXHU4M0I3XHU1Rjk3XG4gICAgLy8gXHU3MTI2XHU3MEI5XHU3Njg0XHU3QTk3XHU1M0UzXHU1MTk5XHU1MTY1XHVGRjBDXHU1MzczXCJcdTc1MjhcdTYyMzdcdTVGNTNcdTUyNERcdTZCNjNcdTU3MjhcdTc3MEJcdTc2ODQgdmF1bHRcIlx1MzAwMlxuICAgIHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gICAgY29uc3Qgb25XaW5kb3dGb2N1cyA9ICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25XaW5kb3dGb2N1cylcbiAgICB0aGlzLnJlZ2lzdGVyKCgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uV2luZG93Rm9jdXMpKVxuICAgIC8vIFx1ODg2NVx1NTE0NVx1NEZFMVx1NTNGN1x1RkYxQVx1NzUyOFx1NjIzN1x1NTcyOFx1N0E5N1x1NTNFM1x1NTE4NVx1NTIwN1x1NjM2Mlx1NjU4N1x1NEVGNi9cdTVFMDNcdTVDNDBcdTVGQzVcdTcxMzZcdTg5RTZcdTUzRDEgYWN0aXZlLWxlYWYtY2hhbmdlXHVGRjBDXG4gICAgLy8gXHU4OTg2XHU3NkQ2IHdpbmRvdyBmb2N1cyBcdTRFOEJcdTRFRjZcdTRFMERcdTZEM0VcdTUzRDFcdTc2ODRcdTU3M0FcdTY2NkZcdTMwMDJcdTk2MzJcdTYyOTZcdTUxNzFcdTc1MjhcdTRFMDBcdTRFMkEgdGltZXJcdUZGMENcdTRFOTJcdTRFMERcdTVFNzJcdTYyNzBcdTMwMDJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKCdhY3RpdmUtbGVhZi1jaGFuZ2UnLCAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKSkpXG5cbiAgICB0aGlzLmFkZFJpYmJvbkljb24oJ2JvdCcsICdEU0ggRG9ja1x1RkYxQVx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicsICgpID0+IHZvaWQgdGhpcy5vcGVuUGFuZWwoKSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1wYW5lbCcsXG4gICAgICBuYW1lOiAnXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0YnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuUGFuZWwoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N0YXJ0LWRzaCcsXG4gICAgICBuYW1lOiAnXHU1NDJGXHU1MkE4IERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdGFydCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RvcC1kc2gnLFxuICAgICAgbmFtZTogJ1x1NTA1Q1x1NkI2MiBEU0ggXHU2NzBEXHU1MkExJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc3RvcCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1kc2gtYnJvd3NlcicsXG4gICAgICBuYW1lOiAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwIERTSCcsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5JbkJyb3dzZXIoKSxcbiAgICB9KVxuXG4gICAgdGhpcy5zdGF0dXNCYXJFbCA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRHNoRG9ja1NldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSlcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9zdGFydCkge1xuICAgICAgdm9pZCB0aGlzLnN0YXJ0KClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbnVubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnN0b3AoKVxuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmNsZWFyKClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDkgKi9cbiAgcHJpdmF0ZSB2YXVsdFJvb3QoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgfVxuXG4gIG9uU3RhdHVzQ2hhbmdlKGZuOiAoKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuYWRkKGZuKVxuICAgIHJldHVybiAoKSA9PiB0aGlzLnN0YXR1c0xpc3RlbmVycy5kZWxldGUoZm4pXG4gIH1cblxuICBwcml2YXRlIHNldFN0YXR1cyhzdGF0dXM6IFNlcnZlclN0YXR1cyk6IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIGZvciAoY29uc3QgZm4gb2YgdGhpcy5zdGF0dXNMaXN0ZW5lcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZuKClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXR1c0JhcigpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc3RhdHVzQmFyRWwpIHJldHVyblxuICAgIGNvbnN0IHMgPSB0aGlzLnN0YXR1c1xuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KGBEU0g6ICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICdcdUZGMDhcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMDknIDogJyd9YClcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNicpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU2NzJBXHU4RkQwXHU4ODRDJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcblxuICAvKiogXHU4QkZCXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgY2xlYXJUaW1lb3V0KHRoaXMubWFya2VyVGltZXIpXG4gICAgdGhpcy5tYXJrZXJUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5tYXJrZXJUaW1lciA9IG51bGxcbiAgICAgIGNvbnN0IGluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgaWYgKGluZm8pIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKGluZm8ubmFtZSwgaW5mby5wYXRoKVxuICAgIH0sIDMwMClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcblxuICAvKiogXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTYzMDJcdTYzQTVcdUZGMUJcdTU0MjZcdTUyMTkgc3Bhd24gXHU1Qjk4XHU2NUI5IGRzaCB3ZWIgKi9cbiAgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTxTZXJ2ZXJTdGF0dXM+IHtcbiAgICBpZiAodGhpcy5zdGFydGluZykgcmV0dXJuIHRoaXMuc3RhdHVzXG4gICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJykgcmV0dXJuIHRoaXMuc3RhdHVzXG4gICAgdGhpcy5zdGFydGluZyA9IHRydWVcbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdGFydGluZycgfSlcbiAgICB0cnkge1xuICAgICAgY29uc3QgdmF1bHRSb290ID0gdGhpcy52YXVsdFJvb3QoKVxuICAgICAgY29uc3QgZHNoSG9tZSA9IGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHBvcnQgPSBjb21wdXRlUG9ydCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgaG9zdDogdGhpcy5zZXR0aW5ncy5ob3N0LFxuICAgICAgICBkc2hIb21lLFxuICAgICAgICB1c2VFbWJlZGRlZE5vZGU6IHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlLFxuICAgICAgICAvLyBcdTVCNTBcdThGREJcdTdBMEJcdTVERTVcdTRGNUNcdTc2RUVcdTVGNTUgPSB2YXVsdCBcdTY4MzlcdUZGMUFcdTY1QjBcdTVFRkFcdTRGMUFcdThCRERcdTc2ODQgY3dkIFx1NTM3M1x1OEJFNSB2YXVsdFx1RkYwQ1x1NEYxQVx1OEJERFx1NjMwMVx1NEU0NVx1NTMxNlxuICAgICAgICAvLyBcdTYzMDkgdmF1bHQgXHU1MjA2XHU3NkVFXHU1RjU1XHVGRjBDXHU5MUNEXHU1NDJGL1x1NjA2Mlx1NTkwRFx1NTQwRVx1NEVDRFx1NTE3M1x1ODA1NFx1RkYwOHZhdWx0IFx1NURFNVx1NTE3N1x1ODlFM1x1Njc5MFx1OTg3QVx1NUU4Rlx1ODFFQVx1NTJBOFx1NTQ3RFx1NEUyRFx1RkYwOVx1MzAwMlxuICAgICAgICBjd2Q6IHZhdWx0Um9vdCxcbiAgICAgICAgLy8gXHU1NDJGXHU1MkE4XHU2NUY2XHU2MjhBXHU1RjUzXHU1MjREIHZhdWx0IFx1NEUwMFx1NUU3Nlx1NkNFOFx1NTE2NVx1NUI1MFx1OEZEQlx1N0EwQiBlbnZcdUZGMENcdTRGNUNcdTRFM0FcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTRFNEJcdTU5MTZcdTc2ODRcdTdCMkNcdTRFOENcdTkwMUFcdTkwNTNcbiAgICAgICAgLy8gXHVGRjA4XHU2NzBEXHU1MkExXHU1MjFBXHU2MkM5XHU4RDc3XHUzMDAxXHU2ODA3XHU4QkIwXHU1QzFBXHU2NzJBXHU1MjM3XHU2NUIwXHU2NUY2XHU1MTVDXHU1RTk1XHVGRjA5XHUzMDAyXG4gICAgICAgIGVudjogdmF1bHRJbmZvXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIERTSF9PQlNJRElBTl9WQVVMVF9OQU1FOiB2YXVsdEluZm8ubmFtZSxcbiAgICAgICAgICAgICAgRFNIX09CU0lESUFOX1ZBVUxUX1BBVEg6IHZhdWx0SW5mby5wYXRoLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDoge30sXG4gICAgICB9KVxuICAgICAgdGhpcy5wcm9jID0gcmVzdWx0LnByb2MgPz8gbnVsbFxuICAgICAgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmIHJlc3VsdC5wcm9jKSB7XG4gICAgICAgIHRoaXMuaG9va0NoaWxkTG9ncyhyZXN1bHQucHJvYylcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U3RhdHVzKHJlc3VsdC5zdGF0dXMpXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7cmVzdWx0LnN0YXR1cy5tZXNzYWdlfWApXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICFyZXN1bHQuc3RhdHVzLmF0dGFjaGVkKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBXZWIgXHU1REYyXHU1QzMxXHU3RUVBOiAke3Jlc3VsdC5zdGF0dXMudXJsfWApXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbXNnIH0pXG4gICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1RjAyXHU1RTM4OiAke21zZ31gKVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzXG4gIH1cblxuICBhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIGlmICh0aGlzLnByb2MpIHtcbiAgICAgIGF3YWl0IHN0b3BQcm9jZXNzKHRoaXMucHJvYylcbiAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICB9XG4gICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgfVxuXG4gIHByaXZhdGUgaG9va0NoaWxkTG9ncyhwcm9jOiBDaGlsZFByb2Nlc3MpOiB2b2lkIHtcbiAgICBwcm9jLnN0ZG91dD8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiBjb25zb2xlLmluZm8oJ1tkc2hdJywgZC50b1N0cmluZygpLnRyaW1FbmQoKSkpXG4gICAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS53YXJuKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Mub25jZSgnZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIGlmICh0aGlzLnByb2MgPT09IHByb2MpIHtcbiAgICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgICAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICF0aGlzLnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYERTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkE6IGNvZGU9JHtjb2RlfSBzaWduYWw9JHtzaWduYWwgPz8gJyd9YCB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW2RzaC1kb2NrXSBcdTVCNTBcdThGREJcdTdBMEJcdTk1MTlcdThCRUYnLCBlcnIpXG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBgXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGOiAke2Vyci5tZXNzYWdlfWAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqIFx1NjNBMlx1NkQ0Qlx1NEZFMVx1NjA2Rlx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBkZXRlY3RJbmZvKCk6IHsgZHNoQmluOiBzdHJpbmcgfCBudWxsOyBkc2hOb3Rlczogc3RyaW5nW107IG5vZGVOb3Rlczogc3RyaW5nW10gfSB7XG4gICAgY29uc3QgZm91bmQgPSByZXNvbHZlRHNoQmluKHRoaXMuc2V0dGluZ3MuZHNoQmluKVxuICAgIGNvbnN0IG5vZGUgPSByZXNvbHZlTm9kZUJpbih0aGlzLnNldHRpbmdzLm5vZGVCaW4sIGVtYmVkZGVkTm9kZVZlcnNpb24oKSwgdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpXG4gICAgcmV0dXJuIHtcbiAgICAgIGRzaEJpbjogZm91bmQuYmluLFxuICAgICAgZHNoTm90ZXM6IGZvdW5kLm5vdGVzLFxuICAgICAgbm9kZU5vdGVzOiBub2RlLm5vdGVzLFxuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZWZmZWN0aXZlRHNoSG9tZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKVxuICB9XG5cbiAgLyoqIFx1NUY1M1x1NTI0RFx1OEJCRVx1N0Y2RVx1NEUwQlx1NzUxRlx1NjU0OFx1NzY4NFx1N0FFRlx1NTNFM1x1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTZCQ0YgdmF1bHQgXHU3MkVDXHU3QUNCXHVGRjA5ICovXG4gIGVmZmVjdGl2ZVBvcnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmxvYWREYXRhKClcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgZGF0YSA/PyB7fSlcbiAgICAvLyBcdTY1RTdcdTcyNDhcdUZGMDhkc2gtaG9zdCBWMC4xXHVGRjA5XHU4QkJFXHU3RjZFXHU4RkMxXHU3OUZCXHVGRjFBZHNoSG9tZSBcdTVCNTdcdTdCMjZcdTRFMzIgXHUyMTkyIGN1c3RvbSBcdTZBMjFcdTVGMEZcbiAgICBjb25zdCBsZWdhY3kgPSBkYXRhIGFzIHsgZHNoSG9tZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkXG4gICAgaWYgKGxlZ2FjeT8uZHNoSG9tZSAmJiB0eXBlb2YgbGVnYWN5LmRzaEhvbWUgPT09ICdzdHJpbmcnICYmIGxlZ2FjeS5kc2hIb21lLnRyaW0oKSkge1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lTW9kZSA9ICdjdXN0b20nXG4gICAgICB0aGlzLnNldHRpbmdzLmRzaEhvbWUgPSBsZWdhY3kuZHNoSG9tZS50cmltKClcbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFVJXG5cbiAgYXN5bmMgb3BlblBhbmVsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcFxuICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRFNIX1dFQl9WSUVXX1RZUEUpXG4gICAgbGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCBudWxsID0gbGVhdmVzWzBdID8/IG51bGxcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKVxuICAgICAgaWYgKCFsZWFmKSByZXR1cm5cbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH1cbiAgICB3b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmKVxuICB9XG5cbiAgYXN5bmMgb3BlbkluQnJvd3NlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHNoZWxsIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpIGFzIHsgc2hlbGw6IHsgb3BlbkV4dGVybmFsKHVybDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB9IH1cbiAgICBhd2FpdCBzaGVsbC5vcGVuRXh0ZXJuYWwodGhpcy5iYXNlVXJsKVxuICB9XG5cbiAgLyoqXG4gICAqIFx1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOE9ic2lkaWFuIHBvcG91dFx1RkYwOVx1RkYxQURTSCBcdTk3NjJcdTY3N0ZcdThGREJcdTUxNjVcdTcyRUNcdTdBQ0IgQnJvd3NlcldpbmRvdyA9XG4gICAqIFx1NzJFQ1x1N0FDQlx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwQ1x1NEUwRSBPYnNpZGlhbiBcdTRFM0JcdTdBOTdcdTUzRTNcdTk2OTRcdTc5QkJcdUZGMENcdTYwMjdcdTgwRkRcdTdCNDlcdTU0MENcdTZENEZcdTg5QzhcdTU2NjhcdTY4MDdcdTdCN0VcdTk4NzVcdTMwMDJcbiAgICovXG4gIGFzeW5jIG9wZW5Qb3BvdXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2Uub3BlblBvcG91dExlYWYoKVxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIG5ldyBOb3RpY2UoYFx1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1NTkzMVx1OEQyNTogJHttc2d9YClcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGxhdW5jaGVyLnRzIFx1MjAxNFx1MjAxNCBcdTdFQUZcdTU0MkZcdTUyQThcdTkwM0JcdThGOTFcdUZGMDhcdTk2RjYgT2JzaWRpYW4gXHU0RjlEXHU4RDU2XHVGRjBDXHU1M0VGXHU3MkVDXHU3QUNCXHU1MTkyXHU3MERGXHU2RDRCXHU4QkQ1XHVGRjA5XHUzMDAyXG4gKlxuICogXHU4MDRDXHU4RDIzXHVGRjFBXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHUyMTkyIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNiBcdTIxOTIgc3Bhd24gYGRzaCB3ZWJgXG4gKiBcdUZGMDgxMjcuMC4wLjE6PHBvcnQ+XHVGRjA5XHUyMTkyIFx1N0I0OVx1NUY4NSBIVFRQIFx1NUMzMVx1N0VFQSBcdTIxOTIgXHU1MDVDXHU2QjYyXHUzMDAyXG4gKlxuICogXHU1MTczXHU5NTJFXHU0RThCXHU1QjlFXHVGRjA4XHU1REYyXHU1NzI4XHU1Qjk4XHU2NUI5IEBkZWVwc2Vlay1haS9kc2hAMC4xLjAtcmMuNiBcdTRFMEFcdTlBOENcdThCQzFcdUZGMDlcdUZGMUFcbiAqIC0gYG5vZGUgPGRzaD4vbGliL2Jpbi5qcyB3ZWIgLS1ob3N0IDEyNy4wLjAuMSAtLXBvcnQgPHBvcnQ+YCBcdTUzNzNcdTVCOThcdTY1QjkgV2ViIFVJXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNCBob3N0PTEyNy4wLjAuMVx1MzAwMXBvcnQ9MzA4MFx1RkYwOFx1NTNFRlx1ODk4Nlx1NzZENlx1RkYwOVx1RkYxQlxuICogLSBcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTgxRUFcdTUyQThcdTUyMURcdTU5Q0JcdTUzMTYgJERTSF9IT01FL3Byb2ZpbGVzL3dlYlx1RkYwOGJ1bmRsZXMgPSBkc2gtYmFzZSArIGRzaC13ZWItYXBwXHVGRjA5XHVGRjBDXG4gKiAgIFx1NkEyMVx1NTc1N1x1ODlFM1x1Njc5MFx1OEQ3MCAkRFNIX0hPTUUvcHJvZmlsZXMvbm9kZV9tb2R1bGVzIFx1NUU3M1x1OTc2Mlx1N0IyNlx1NTNGN1x1OTRGRVx1NjNBNVx1RkYwQ1x1NjVFMFx1OTcwMCBwbnBtL1x1ODA1NFx1N0Y1MVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTRcdTkxNERcdTdGNkVcdTRFMEIgU1FMaXRlXHVGRjA4bm9kZTpzcWxpdGVcdUZGMENcdTk3MDAgTm9kZSBcdTIyNjUyMi41XHVGRjA5XHU0RTBEXHU0RjFBXHU2MjUzXHU1RjAwXHVGRjA4b3BlbkF0OiBuZXZlclx1RkYwOVx1RkYwQ1xuICogICBcdTU2RTBcdTZCNjQgTm9kZSAyMCsgXHU0RTVGXHU4MEZEXHU4REQxXHU5RUQ4XHU4QkE0IHdlYiBwcm9maWxlXHVGRjFCXHU1NDJGXHU3NTI4XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU2NUY2XHU2MjREXHU5NzAwXHU4OTgxIE5vZGUgXHUyMjY1MjIuNVx1MzAwMlxuICovXG5cbmltcG9ydCB7IHNwYXduLCBzcGF3blN5bmMsIHR5cGUgQ2hpbGRQcm9jZXNzIH0gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBjb25zdCBEU0hfUkVMQVRJVkVfQklOID0gcGF0aC5qb2luKCdAZGVlcHNlZWstYWknLCAnZHNoJywgJ2xpYicsICdiaW4uanMnKVxuXG4vKiogTm9kZSBcdTRFM0JcdTcyNDhcdTY3MkNcdTUzRjdcdTZCRDRcdThGODNcdUZGMUFub2RlOnNxbGl0ZSBcdTk3MDBcdTg5ODEgXHUyMjY1MjIuNVx1RkYwOFx1NEVDNVx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NTI5Rlx1ODBGRFx1NzUyOFx1NTIzMFx1RkYwOSAqL1xuZXhwb3J0IGNvbnN0IE5PREVfU1FMSVRFX01JTl9NQUpPUiA9IDIyXG5cbi8qKiBcdTdBMzNcdTVCOUFcdTc3RURcdTU0QzhcdTVFMENcdUZGMDhkamIyXHVGRjA5XHVGRjBDXHU3NTI4XHU0RThFIHZhdWx0IFx1NzZFRVx1NUY1NVx1NTQwRFx1NkQ4OFx1NkI2N1x1RkYwQ1x1OTA3Rlx1NTE0RFx1NEUyRFx1NjU4N1x1NTQwRFx1NkUwNVx1NkQxN1x1NzhCMFx1NjQ5RSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YWJsZUhhc2goaW5wdXQ6IHN0cmluZywgbGVuID0gNik6IHN0cmluZyB7XG4gIGxldCBoID0gNTM4MVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSBoID0gKChoIDw8IDUpICsgaCArIGlucHV0LmNoYXJDb2RlQXQoaSkpID4+PiAwXG4gIHJldHVybiBoLnRvU3RyaW5nKDM2KS5wYWRTdGFydChsZW4sICcwJykuc2xpY2UoMCwgbGVuKVxufVxuXG4vKiogXHU1M0VGXHU4QkZCXHU3Njg0IHZhdWx0IFx1NzZFRVx1NUY1NVx1NTQwRFx1RkYwOFx1NEZERFx1NzU1OSBVbmljb2RlIFx1NUI1N1x1NkJDRFx1NjU3MFx1NUI1N1x1RkYwQ1x1NTE3Nlx1NEY1OVx1OEY2QyAtXHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5ICd2YXVsdCcgKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlVmF1bHROYW1lKHZhdWx0Um9vdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY2xlYW5lZCA9IHBhdGhcbiAgICAuYmFzZW5hbWUodmF1bHRSb290KVxuICAgIC5yZXBsYWNlKC9bXlxccHtMfVxccHtOfV8tXSsvZ3UsICctJylcbiAgICAucmVwbGFjZSgvXi0rfC0rJC9nLCAnJylcbiAgcmV0dXJuIChjbGVhbmVkIHx8ICd2YXVsdCcpLnNsaWNlKDAsIDQwKVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaE9wdGlvbnMge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU3Njg0XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluPzogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOSAqL1xuICBub2RlQmluPzogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0PzogbnVtYmVyXG4gIC8qKiBcdTc2RDFcdTU0MkMgaG9zdFx1RkYwOFx1OUVEOFx1OEJBNCAxMjcuMC4wLjFcdUZGMENcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdD86IHN0cmluZ1xuICAvKiogJERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREL1x1NUJDNlx1OTRBNS9cdTZBMjFcdTU3OEJcdTkxNERcdTdGNkVcdTY4MzlcdTc2RUVcdTVGNTVcdUZGMUJcdTlFRDhcdThCQTQgPHZhdWx0Pi8uZHNoXHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKiogXHU2NjJGXHU1NDI2XHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1OTVFRFx1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU/OiBib29sZWFuXG4gIC8qKiBcdTVDMzFcdTdFRUFcdTdCNDlcdTVGODVcdTRFMEFcdTk2NTBcdUZGMDhcdTlFRDhcdThCQTQgMTIwc1x1RkYwOSAqL1xuICB0aW1lb3V0TXM/OiBudW1iZXJcbiAgLyoqIFx1OTY0NFx1NTJBMFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiAqL1xuICBlbnY/OiBOb2RlSlMuUHJvY2Vzc0VudlxuICAvKipcbiAgICogXHU1QjUwXHU4RkRCXHU3QTBCXHU1REU1XHU0RjVDXHU3NkVFXHU1RjU1XHUzMDAyXHU0RjIwIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1NjVGNlx1RkYwQ1x1NjVCMFx1NUVGQVx1NEYxQVx1OEJERFx1NzY4NCBjd2QgXHU1QzMxXHU2NjJGXHU4QkU1IHZhdWx0XHVGRjFBXG4gICAqIFx1NEYxQVx1OEJERFx1NjMwMVx1NEU0NVx1NTMxNlx1ODFFQVx1NTJBOFx1NjMwOSB2YXVsdCBcdTUyMDZcdTc2RUVcdTVGNTVcdUZGMDg8cm9vdD4vPHZhdWx0IFx1OERFRlx1NUY4ND4vPFx1NEYxQVx1OEJERD4vXHUyMDI2XHVGRjA5XHVGRjBDXG4gICAqIFx1OTFDRFx1NTQyRi9cdTYwNjJcdTU5MERcdTU0MEUgU2Vzc2lvbkhlYWRlci5jd2QgXHU0RUNEXHU2NjJGIHZhdWx0IFx1NjgzOVx1RkYwQ3ZhdWx0IFx1NURFNVx1NTE3N1x1ODlFM1x1Njc5MFx1OTg3QVx1NUU4Rlx1N0IyQyAzIFx1NEY0RFxuICAgKiBcdUZGMDhcdTRGMUFcdThCREQgY3dkIFx1ODJFNVx1NjYyRlx1NUU5M1x1RkYwOVx1NTkyOVx1NzEzNlx1NTQ3RFx1NEUyRCBcdTIwMTRcdTIwMTQgXHU1MzczXCJ2YXVsdCBcdTIxOTQgXHU0RjFBXHU4QkREXCJcdTc2ODRcdTYzMDFcdTRFNDVcdTUxNzNcdTgwNTRcdTMwMDJcbiAgICovXG4gIGN3ZD86IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkTm9kZSB7XG4gIC8qKiBcdTc1MjhcdTRFOEUgc3Bhd24gXHU3Njg0IG5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU2NjJGXHU1NDI2XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NjI4QSBPYnNpZGlhbiBcdTc2ODQgRWxlY3Ryb24gXHU0RThDXHU4RkRCXHU1MjM2XHU1RjUzIE5vZGUgXHU3NTI4ICovXG4gIHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuXG4gIC8qKiBcdThCRTUgTm9kZSBcdTc2ODQgbWFqb3IgXHU3MjQ4XHU2NzJDXHVGRjA4XHU2M0EyXHU2RDRCXHU1OTMxXHU4RDI1XHU0RTNBIDBcdUZGMDkgKi9cbiAgbm9kZU1ham9yOiBudW1iZXJcbiAgLyoqIFx1NjNBMlx1NkQ0Qi9cdTUxQjNcdTdCNTZcdThCRjRcdTY2MEVcdUZGMDhcdTRGOUJcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgbm90ZXM6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCB0eXBlIFNlcnZlclN0YXR1cyA9XG4gIHwgeyBraW5kOiAnc3RvcHBlZCcgfVxuICB8IHsga2luZDogJ3N0YXJ0aW5nJyB9XG4gIHwgeyBraW5kOiAncnVubmluZyc7IHBvcnQ6IG51bWJlcjsgaG9zdDogc3RyaW5nOyB1cmw6IHN0cmluZzsgYXR0YWNoZWQ6IGJvb2xlYW4gfVxuICB8IHsga2luZDogJ2Vycm9yJzsgbWVzc2FnZTogc3RyaW5nIH1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdThERUZcdTVGODRcdTVCOUFcdTRGNERcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogXHU2MjhBXHU3NTI4XHU2MjM3XHU1ODZCXHU1MTk5XHU3Njg0XHU1MTY1XHU1M0UzXHU4OUM0XHU4MzAzXHU1MzE2XHVGRjFBXHU2MzA3XHU1NDExIGJpbi5qcyBcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1OTBGRFx1NjNBNVx1NTNENyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZURzaEJpbihpbnB1dDogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWlucHV0KSByZXR1cm4gbnVsbFxuICBjb25zdCBwID0gaW5wdXQudHJpbSgpXG4gIGlmICghcCkgcmV0dXJuIG51bGxcbiAgY29uc3QgZXhwYW5kZWQgPSBwLnJlcGxhY2UoL15+KD89JHxcXC98XFxcXCkvLCBvcy5ob21lZGlyKCkpXG4gIGNvbnN0IGFicyA9IHBhdGguaXNBYnNvbHV0ZShleHBhbmRlZCkgPyBwYXRoLm5vcm1hbGl6ZShleHBhbmRlZCkgOiBwYXRoLnJlc29sdmUoZXhwYW5kZWQpXG4gIHRyeSB7XG4gICAgY29uc3Qgc3QgPSBmcy5zdGF0U3luYyhhYnMpXG4gICAgaWYgKHN0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihhYnMsICdsaWInLCAnYmluLmpzJylcbiAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkgPyBjYW5kaWRhdGUgOiBudWxsXG4gICAgfVxuICAgIGlmIChzdC5pc0ZpbGUoKSkgcmV0dXJuIGFic1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHJldHVybiBudWxsXG59XG5cbi8qKiBcdTVFMzhcdTg5QzEgbnBtIFx1NTE2OFx1NUM0MCBub2RlX21vZHVsZXMgXHU2ODM5XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gZ2xvYmFsTW9kdWxlUm9vdHMoKTogc3RyaW5nW10ge1xuICBjb25zdCByb290czogc3RyaW5nW10gPSBbXVxuICBpZiAocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKSByb290cy5wdXNoKHByb2Nlc3MuZW52LkRTSF9HTE9CQUxfTU9EVUxFUylcbiAgY29uc3QgbnBtUm9vdCA9IHNwYXduU3luYygnbnBtJywgWydyb290JywgJy1nJ10sIHtcbiAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgIHRpbWVvdXQ6IDEwXzAwMCxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbiAgaWYgKG5wbVJvb3Quc3RhdHVzID09PSAwICYmIG5wbVJvb3Quc3Rkb3V0KSB7XG4gICAgY29uc3QgbGluZSA9IG5wbVJvb3Quc3Rkb3V0LnRyaW0oKS5zcGxpdCgvXFxyP1xcbi8pWzBdXG4gICAgaWYgKGxpbmUpIHJvb3RzLnB1c2gobGluZSlcbiAgfVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2RhcndpbicpIHtcbiAgICByb290cy5wdXNoKCcvb3B0L2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJylcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnbGludXgnKSB7XG4gICAgcm9vdHMucHVzaCgnL3Vzci9saWIvbm9kZV9tb2R1bGVzJywgJy91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcycsIHBhdGguam9pbihvcy5ob21lZGlyKCksICcubG9jYWwnLCAnbGliJywgJ25vZGVfbW9kdWxlcycpKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICBjb25zdCBhcHBEYXRhID0gcHJvY2Vzcy5lbnYuQVBQREFUQVxuICAgIGlmIChhcHBEYXRhKSByb290cy5wdXNoKHBhdGguam9pbihhcHBEYXRhLCAnbnBtJywgJ25vZGVfbW9kdWxlcycpKVxuICB9XG4gIC8vIFx1NTNCQlx1OTFDRFx1NEZERFx1NUU4RlxuICByZXR1cm4gWy4uLm5ldyBTZXQocm9vdHMpXVxufVxuXG4vKipcbiAqIFx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1MzAwMlx1NEYxOFx1NTE0OFx1N0VBN1x1RkYxQVxuICogMS4gXHU2NjNFXHU1RjBGXHU0RjIwXHU1MTY1XHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHVGRjA5XHUyMTkyIDIuIFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiBEU0hfQklOIFx1MjE5MiAzLiBucG0gcm9vdCAtZyBcdTIxOTIgNC4gXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU2ODM5XHUzMDAyXG4gKiBcdTY3MkFcdTYyN0VcdTUyMzBcdTY1RjYgYmluIFx1NEUzQSBudWxsXHVGRjBDbm90ZXMgXHU4QkY0XHU2NjBFXHU1MzlGXHU1NkUwXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRHNoQmluKGV4cGxpY2l0Pzogc3RyaW5nKTogeyBiaW46IHN0cmluZyB8IG51bGw7IG5vdGVzOiBzdHJpbmdbXSB9IHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBub3JtYWxpemVEc2hCaW4oZXhwbGljaXQgPz8gcHJvY2Vzcy5lbnYuRFNIX0JJTilcbiAgaWYgKGV4cGxpY2l0QmluICYmIGZzLmV4aXN0c1N5bmMoZXhwbGljaXRCaW4pKSB7XG4gICAgcmV0dXJuIHsgYmluOiBleHBsaWNpdEJpbiwgbm90ZXM6IFtgXHU0RjdGXHU3NTI4XHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0OiAke2V4cGxpY2l0QmlufWBdIH1cbiAgfVxuICBpZiAoZXhwbGljaXQpIG5vdGVzLnB1c2goYFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NFx1NEUwRFx1NUI1OFx1NTcyODogJHtleHBsaWNpdH1gKVxuXG4gIGZvciAoY29uc3Qgcm9vdCBvZiBnbG9iYWxNb2R1bGVSb290cygpKSB7XG4gICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKHJvb3QsIERTSF9SRUxBVElWRV9CSU4pXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSkge1xuICAgICAgcmV0dXJuIHsgYmluOiBjYW5kaWRhdGUsIG5vdGVzOiBbLi4ubm90ZXMsIGBcdTRFQ0VcdTUxNjhcdTVDNDBcdTZBMjFcdTU3NTdcdTY4MzlcdTUzRDFcdTczQjA6ICR7Y2FuZGlkYXRlfWBdIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIGRzaCBcdTVCODlcdTg4QzVcdTMwMDJcdThCRjdcdTUxNDhcdTYyNjdcdTg4NEM6IG5wbSBpbnN0YWxsIC1nIEBkZWVwc2Vlay1haS9kc2hcdUZGMENcdTYyMTZcdTU3MjhcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgZHNoIFx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IGJpbjogbnVsbCwgbm90ZXMgfVxufVxuXG4vKipcbiAqIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNlx1MzAwMlxuICogXHU5RUQ4XHU4QkE0XHU5ODdBXHU1RThGXHVGRjFBXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0IFx1MjE5MiBcdTdDRkJcdTdFREYgYG5vZGVgXHVGRjA4UEFUSFx1RkYwQ1x1NjcwMFx1N0EzM1x1NUI5QVx1RkYwOVx1MzAwMlxuICogRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlIFx1NUI5RVx1NkQ0Qlx1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwOE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlxuICogXHU0RTBEXHU2MzA5XHU2NjZFXHU5MDFBIEVsZWN0cm9uIFx1OEJFRFx1NEU0OVx1NTRDRFx1NUU5NFx1RkYwOVx1RkYwQ1x1NTZFMFx1NkI2NFx1NEVDNVx1NUY1MyB1c2VFbWJlZGRlZE5vZGUgXHU2NjNFXHU1RjBGXHU1RjAwXHU1NDJGXHU2NUY2XHU2MjREXHU1QzFEXHU4QkQ1XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTm9kZUJpbihleHBsaWNpdD86IHN0cmluZywgZW1iZWRkZWROb2RlVmVyc2lvbj86IHN0cmluZywgdXNlRW1iZWRkZWQgPSBmYWxzZSk6IFJlc29sdmVkTm9kZSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gZXhwbGljaXQ/LnRyaW0oKSB8fCBwcm9jZXNzLmVudi5EU0hfTk9ERVxuICBpZiAoZXhwbGljaXRCaW4pIHtcbiAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEYgTm9kZTogJHtleHBsaWNpdEJpbn1gKVxuICAgIHJldHVybiB7IG5vZGVCaW46IGV4cGxpY2l0QmluLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZCAmJiBwcm9jZXNzLmV4ZWNQYXRoICYmIGVtYmVkZGVkTm9kZVZlcnNpb24pIHtcbiAgICBjb25zdCBtYWpvciA9IE51bWJlcihlbWJlZGRlZE5vZGVWZXJzaW9uLnNwbGl0KCcuJylbMF0pIHx8IDBcbiAgICBpZiAobWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufVx1RkYwOEVMRUNUUk9OX1JVTl9BU19OT0RFXHVGRjA5YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IHByb2Nlc3MuZXhlY1BhdGgsIHVzZUVsZWN0cm9uQXNOb2RlOiB0cnVlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICAgIG5vdGVzLnB1c2goYE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn0gPCAke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMENcdTY1RTBcdTZDRDVcdTU0MkZcdTc1MjhgKVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NEY3Rlx1NzUyOCBQQVRIIFx1NEUyRFx1NzY4NCBub2RlXHVGRjA4XHU3Q0ZCXHU3RURGIE5vZGVcdUZGMENcdTY3MDBcdTdBMzNcdTVCOUFcdUZGMDknKVxuICByZXR1cm4geyBub2RlQmluOiAnbm9kZScsIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU3QUVGXHU1M0UzXHU2M0EyXHU2RDRCXHU0RTBFXHU3QjQ5XHU1Rjg1XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFx1NUY1M1x1NTI0RFx1OEZEMFx1ODg0Q1x1NzNBRlx1NTg4M1x1RkYwOE9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwOVx1ODFFQVx1NUUyNlx1NzY4NCBOb2RlIFx1NzI0OFx1NjcyQ1x1RkYxQlx1NjVFMFx1NTIxOSB1bmRlZmluZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWJlZGRlZE5vZGVWZXJzaW9uKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgdiA9IChwcm9jZXNzLnZlcnNpb25zIGFzIHsgbm9kZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkKT8ubm9kZVxuICAgIHJldHVybiB2IHx8IHVuZGVmaW5lZFxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBcdTdBRUZcdTUzRTNcdTY2MkZcdTU0MjZcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdTMwMDJcbiAqIFx1NzUyOCBub2RlOmh0dHAgXHU4MDBDXHU5NzVFXHU2RDRGXHU4OUM4XHU1NjY4IGZldGNoXHVGRjFBT2JzaWRpYW4gXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHU3Njg0IENTUCBcdTRGMUFcdTYyRTZcdTYyMkFcbiAqIFx1NUJGOSBodHRwOi8vMTI3LjAuMC4xIFx1NzY4NCBmZXRjaFx1RkYwQ1x1NUJGQ1x1ODFGNFwiXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXCJcdThCRUZcdTUyMjRcdTRFM0FcIlx1NkNBMVx1NjcwOVwiXHUzMDAyXG4gKiBOb2RlIFx1NzY4NCBodHRwIFx1NkEyMVx1NTc1N1x1NEUwRFx1NTNEN1x1OTg3NVx1OTc2MiBDU1AgXHU3RUE2XHU2NzVGXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BvcnRVcChob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTUwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCByZXEgPSBodHRwLmdldCh7IGhvc3QsIHBvcnQsIHBhdGg6ICcvJywgdGltZW91dDogdGltZW91dE1zIH0sIChyZXMpID0+IHtcbiAgICAgIHJlcy5yZXN1bWUoKVxuICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgIH0pXG4gICAgcmVxLm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgcmVxLmRlc3Ryb3koKVxuICAgICAgcmVzb2x2ZShmYWxzZSlcbiAgICB9KVxuICAgIHJlcS5vbignZXJyb3InLCAoKSA9PiByZXNvbHZlKGZhbHNlKSlcbiAgfSlcbn1cblxuLyoqIFx1OEY2RVx1OEJFMlx1N0I0OVx1NUY4NSBIVFRQIFx1NUMzMVx1N0VFQVx1RkYxQlx1OEQ4NVx1NjVGNlx1OEZENFx1NTZERSBmYWxzZSAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JSZWFkeShob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTIwXzAwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWFkbGluZSA9IERhdGUubm93KCkgKyB0aW1lb3V0TXNcbiAgZm9yICg7Oykge1xuICAgIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0LCAxNTAwKSkgcmV0dXJuIHRydWVcbiAgICBpZiAoRGF0ZS5ub3coKSA+IGRlYWRsaW5lKSByZXR1cm4gZmFsc2VcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA1MDApKVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hlZFNlcnZlciB7XG4gIHByb2M6IENoaWxkUHJvY2Vzc1xuICB1cmw6IHN0cmluZ1xuICAvKiogdHJ1ZSA9IFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwQ1x1NjcyQVx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQiAqL1xuICBhdHRhY2hlZDogYm9vbGVhblxufVxuXG4vKiogXHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IGRzaCB3ZWJcdTMwMDJcdThDMDNcdTc1MjhcdTY1QjlcdThEMUZcdThEMjNcdTc2RDFcdTU0MkMgcHJvYyBcdTc2ODQgZXhpdC9lcnJvclx1MzAwMiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxhdW5jaERzaChvcHRzOiBMYXVuY2hPcHRpb25zICYgeyBkc2hCaW46IHN0cmluZzsgbm9kZUJpbjogc3RyaW5nOyB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhbiB9KTogQ2hpbGRQcm9jZXNzIHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgYXJncyA9IFtvcHRzLmRzaEJpbiwgJ3dlYicsICctLWhvc3QnLCBob3N0LCAnLS1wb3J0JywgU3RyaW5nKHBvcnQpXVxuICBjb25zdCBlbnY6IE5vZGVKUy5Qcm9jZXNzRW52ID0ge1xuICAgIC4uLihvcHRzLmVudiA/PyBwcm9jZXNzLmVudiA/PyB7fSksXG4gICAgRFNIX0hPTUU6IG9wdHMuZHNoSG9tZSxcbiAgfVxuICBpZiAob3B0cy51c2VFbGVjdHJvbkFzTm9kZSkgZW52LkVMRUNUUk9OX1JVTl9BU19OT0RFID0gJzEnXG4gIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBzcGF3biAke29wdHMubm9kZUJpbn0gJHthcmdzLmpvaW4oJyAnKX1gKVxuICBjb25zb2xlLmluZm8oYFtkc2gtaG9zdF0gRFNIX0hPTUU9JHtvcHRzLmRzaEhvbWV9JHtvcHRzLmN3ZCA/IGAgY3dkPSR7b3B0cy5jd2R9YCA6ICcnfWApXG4gIHJldHVybiBzcGF3bihvcHRzLm5vZGVCaW4sIGFyZ3MsIHtcbiAgICBlbnYsXG4gICAgY3dkOiBvcHRzLmN3ZCxcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdwaXBlJ10sXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG59XG5cbi8qKlxuICogXHU0RTAwXHU5NTJFXCJcdTc4NkVcdTRGRERcdThGRDBcdTg4NENcIlx1RkYxQVxuICogMS4gXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTc2RjRcdTYzQTVcdTYzMDJcdTYzQTVcdUZGMDhhdHRhY2hlZFx1RkYwQ1x1NEUwRFx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQlx1RkYwOVx1RkYxQlxuICogMi4gXHU1NDI2XHU1MjE5XHU1QjlBXHU0RjREIGRzaCBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHUyMTkyIHNwYXduIFx1MjE5MiBcdTdCNDlcdTVGODVcdTVDMzFcdTdFRUFcdUZGMUJcbiAqIDMuIFx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1RkYwOFx1NTk4Mlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MCBFQUREUklOVVNFXHVGRjA5XHUyMTkyIFx1N0FDQlx1NTM3M1x1OEZENFx1NTZERVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlx1RkYwQ1x1NEUwRFx1NTE4RFx1NzZGMlx1N0I0OVx1MzAwMlxuICogXHU4RkQ0XHU1NkRFIFNlcnZlclN0YXR1c1x1MzAwMlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRHNoUnVubmluZyhvcHRzOiBMYXVuY2hPcHRpb25zKTogUHJvbWlzZTx7IHN0YXR1czogU2VydmVyU3RhdHVzOyBwcm9jPzogQ2hpbGRQcm9jZXNzIH0+IHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgdXJsID0gYGh0dHA6Ly8ke2hvc3R9OiR7cG9ydH0vYFxuXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfSB9XG4gIH1cblxuICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4ob3B0cy5kc2hCaW4pXG4gIGlmICghZm91bmQuYmluKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGZvdW5kLm5vdGVzW2ZvdW5kLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgZHNoIENMSScgfSB9XG4gIH1cbiAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKG9wdHMubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCBvcHRzLnVzZUVtYmVkZGVkTm9kZSlcbiAgY29uc3QgcHJvYyA9IGxhdW5jaERzaCh7IC4uLm9wdHMsIGRzaEJpbjogZm91bmQuYmluLCBub2RlQmluOiBub2RlLm5vZGVCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBub2RlLnVzZUVsZWN0cm9uQXNOb2RlIH0pXG5cbiAgLy8gXHU2NTM2XHU5NkM2IHN0ZGVyciBcdTVDM0VcdTkwRThcdUZGMUFcdTVCNTBcdThGREJcdTdBMEJcdTc5RDJcdTkwMDBcdTY1RjZcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTUzOUZcdTU2RTBcdUZGMDhcdTU5ODIgRUFERFJJTlVTRVx1RkYwOVxuICBsZXQgc3RkZXJyVGFpbCA9ICcnXG4gIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IHtcbiAgICBzdGRlcnJUYWlsID0gKHN0ZGVyclRhaWwgKyBkLnRvU3RyaW5nKCkpLnNsaWNlKC00MDAwKVxuICB9KVxuXG4gIGNvbnN0IGNoaWxkRGllZCA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXNvbHZlKSA9PiB7XG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgfSlcblxuICBjb25zdCByZWFkeSA9IGF3YWl0IFByb21pc2UucmFjZShbXG4gICAgd2FpdEZvclJlYWR5KGhvc3QsIHBvcnQsIG9wdHMudGltZW91dE1zID8/IDEyMF8wMDApLnRoZW4oKCkgPT4gdHJ1ZSksXG4gICAgY2hpbGREaWVkLnRoZW4oKCkgPT4gZmFsc2UpLFxuICBdKVxuXG4gIGlmIChyZWFkeSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IGZhbHNlIH0sIHByb2MgfVxuICB9XG5cbiAgLy8gXHU1QjUwXHU4RkRCXHU3QTBCXHU1REYyXHU5MDAwXHU1MUZBXHVGRjFBXHU1MThEXHU2M0EyXHU0RTAwXHU2QjIxXHU3QUVGXHU1M0UzXHVGRjA4XHU1M0VGXHU4MEZEXHU4OEFCXHU1MjJCXHU3Njg0XHU1QjlFXHU0RjhCXHU2MkEyXHU4REQxXHU3RUQxXHU1QjlBXHVGRjA5XHVGRjBDXHU1NDI2XHU1MjE5XHU3RUQ5XHU1MUZBXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfSwgcHJvYyB9XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbCkgfSwgcHJvYyB9XG59XG5cbi8qKiBcdTRFQ0Ugc3RkZXJyIFx1NUMzRVx1OTBFOFx1NjNEMFx1NzBCQ1x1NTNFRlx1OEJGQlx1OTUxOVx1OEJFRiAqL1xuZnVuY3Rpb24gc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IHN0ZGVyclRhaWwuc3BsaXQoL1xccj9cXG4vKS5maWx0ZXIoQm9vbGVhbilcbiAgY29uc3QgYWRkckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFQUREUklOVVNFJykpXG4gIGNvbnN0IGVyckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFcnJvcjonKSlcbiAgaWYgKGFkZHJMaW5lKSB7XG4gICAgcmV0dXJuICdcdTdBRUZcdTUzRTNcdTVERjJcdTg4QUJcdTUzNjBcdTc1MjhcdUZGMDhFQUREUklOVVNFXHVGRjA5XHUzMDAyXHU4QkY3XHU2MzYyXHU0RTAwXHU0RTJBXHU3QUVGXHU1M0UzXHVGRjBDXHU2MjE2XHU1MTQ4XHU1MDVDXHU2Mzg5XHU1MzYwXHU3NTI4XHU4QkU1XHU3QUVGXHU1M0UzXHU3Njg0XHU2NzBEXHU1MkExXHU1NDBFXHU5MUNEXHU4QkQ1J1xuICB9XG4gIGlmIChlcnJMaW5lKSB7XG4gICAgY29uc3QgY2xlYW5lZCA9IGVyckxpbmUudHJpbSgpLnNsaWNlKDAsIDMwMClcbiAgICByZXR1cm4gYGRzaCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7Y2xlYW5lZH1gXG4gIH1cbiAgcmV0dXJuICdEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBXHVGRjA4XHU2NUUwXHU4QkU2XHU3RUM2XHU5NTE5XHU4QkVGXHVGRjA5XHUzMDAyXHU4QkY3XHU2N0U1XHU3NzBCIE9ic2lkaWFuIFx1NjNBN1x1NTIzNlx1NTNGMCBbZHNoXSBcdTY1RTVcdTVGRDcnXG59XG5cbi8qKiBcdTUwNUNcdTZCNjJcdTVCNTBcdThGREJcdTdBMEJcdUZGMDhTSUdURVJNXHVGRjBDXHU3QjQ5XHU1Rjg1XHU5MDAwXHU1MUZBXHVGRjFCXHU4RDg1XHU2NUY2XHU1NDBFIFNJR0tJTExcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wUHJvY2Vzcyhwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsIHwgdW5kZWZpbmVkLCB0aW1lb3V0TXMgPSA1MDAwKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghcHJvYyB8fCBwcm9jLmV4aXRDb2RlICE9PSBudWxsIHx8IHByb2Muc2lnbmFsQ29kZSAhPT0gbnVsbCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBwcm9jLmtpbGwoJ1NJR0tJTEwnKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH0sIHRpbWVvdXRNcylcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9KVxuICAgIHRyeSB7XG4gICAgICBwcm9jLmtpbGwoJ1NJR1RFUk0nKVxuICAgIH0gY2F0Y2gge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuICB9KVxufVxuIiwgIi8qKlxuICogXHU4QkJFXHU3RjZFXHVGRjFBXHU1QjU3XHU2QkI1ICsgXHU4QkJFXHU3RjZFXHU5ODc1IFVJXHUzMDAyXG4gKiBWMC4yXHVGRjFBRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHVGRjA4XHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIC8gXHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQiAvIFx1ODFFQVx1NUI5QVx1NEU0OVx1RkYwOVx1MzAwMlxuICovXG5cbmltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCB0eXBlIERzaEhvbWVNb2RlID0gJ3NoYXJlZCcgfCAncGVyLXZhdWx0JyB8ICdjdXN0b20nXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHNoRG9ja1NldHRpbmdzIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbjogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NEYxOFx1NTE0OFx1RkYwOSAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0XHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q6IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydDogbnVtYmVyXG4gIC8qKiBEU0hfSE9NRSBcdTZBMjFcdTVGMEZcdUZGMUFzaGFyZWQ9XHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQnBlci12YXVsdD1cdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjFCY3VzdG9tPVx1ODFFQVx1NUI5QVx1NEU0OSAqL1xuICBkc2hIb21lTW9kZTogRHNoSG9tZU1vZGVcbiAgLyoqIFx1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODRcdUZGMDhcdTRFQzUgY3VzdG9tIFx1NkEyMVx1NUYwRlx1NzUxRlx1NjU0OFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqIFx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlOiBib29sZWFuXG4gIC8qKiBPYnNpZGlhbiBcdTU0MkZcdTUyQThcdTY1RjZcdTgxRUFcdTUyQThcdTYyQzlcdThENzcgRFNIICovXG4gIGF1dG9zdGFydDogYm9vbGVhblxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRHNoRG9ja1NldHRpbmdzID0ge1xuICBkc2hCaW46ICcnLFxuICBub2RlQmluOiAnJyxcbiAgaG9zdDogJzEyNy4wLjAuMScsXG4gIHBvcnQ6IDMwODAsXG4gIGRzaEhvbWVNb2RlOiAnc2hhcmVkJyxcbiAgZHNoSG9tZTogJycsXG4gIHVzZUVtYmVkZGVkTm9kZTogZmFsc2UsXG4gIGF1dG9zdGFydDogdHJ1ZSxcbn1cblxuZXhwb3J0IGNsYXNzIERzaERvY2tTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIGN1c3RvbUhvbWVFbD86IFNldHRpbmdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pXG4gIH1cblxuICBvdmVycmlkZSBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXNcbiAgICBjb250YWluZXJFbC5lbXB0eSgpXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1Njk4Mlx1ODlDOCAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnXHUyNkY1IERTSCBEb2NrJyB9KVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge1xuICAgICAgY2xzOiAnZHNoLWRvY2stc2V0dGluZ3MtZGVzYycsXG4gICAgICB0ZXh0OiAnXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgV2ViIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhblx1RkYxQVx1NUI5QVx1NEY0RCBkc2ggXHUyMTkyIFx1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0QyBcdTIxOTIgXHU5NzYyXHU2NzdGXHU1RDRDXHU1MTY1XHUzMDAyXHU1MTY4XHU3QTBCXHU1Qjk4XHU2NUI5XHVGRjBDXHU5NkY2XHU4MUVBXHU3ODE0XHUzMDAyJyxcbiAgICB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY3MERcdTUyQTFcdTYzQTdcdTUyMzYgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1NjcwRFx1NTJBMScgfSlcbiAgICBjb25zdCBzdGF0dXNMaW5lID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NzBEXHU1MkExXHU3MkI2XHU2MDAxJylcbiAgICAgIC5zZXREZXNjKHRoaXMuZGVzY3JpYmVTdGF0dXMoKSlcbiAgICBjb25zdCBidG5zID0gc3RhdHVzTGluZS5jb250cm9sRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYnRucycgfSlcbiAgICBjb25zdCBzdGFydEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnbW9kLWN0YScsIHRleHQ6ICdcdTI1QjYgXHU1NDJGXHU1MkE4JyB9KVxuICAgIHN0YXJ0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgc3RvcEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVBMCBcdTUwNUNcdTZCNjInIH0pXG4gICAgc3RvcEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdG9wKCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgb3BlbkJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicgfSlcbiAgICBvcGVuQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5QYW5lbCgpXG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5NjhGIE9ic2lkaWFuIFx1ODFFQVx1NTJBOFx1NTQyRlx1NTJBOCcpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1OEZEMFx1ODg0Q1x1NjVGNiAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU4RkQwXHU4ODRDXHU2NUY2JyB9KVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ2RzaCBDTEkgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEJcdUZGMDhEU0hfQklOIFx1MjE5MiBucG0gcm9vdCAtZyBcdTIxOTIgXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXHU1M0VGXHU1ODZCIGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTYyMTYgYmluLmpzIFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcy9AZGVlcHNlZWstYWkvZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmRldGVjdExpbmUgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNicpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9iaW4vbm9kZScpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZScpXG4gICAgICAuc2V0RGVzYygnRUxFQ1RST05fUlVOX0FTX05PREVcdTMwMDJcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdTIwMTRcdTIwMTRcdTVCOUVcdTZENEIgT2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XHU0RUU1IE5vZGUgXHU2QTIxXHU1RjBGXHU4RkQwXHU4ODRDXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjBDXHU0RUM1XHU1NzI4XHU5QThDXHU4QkMxXHU1M0VGXHU3NTI4XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyJylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU3RjUxXHU3RURDIC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTdGNTFcdTdFREMnIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1N0ZBXHU1MUM2XHVGRjA5JylcbiAgICAgIC5zZXREZXNjKCdcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1MzAwMnNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXHU3NkY0XHU2M0E1XHU0RjdGXHU3NTI4XHVGRjFCcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NTcyOFx1NkI2NFx1NTdGQVx1Nzg0MFx1NEUwQVx1NjMwOSB2YXVsdCBcdTZEM0VcdTc1MUZcdTcyRUNcdTdBQ0JcdTdBRUZcdTUzRTNcdUZGMDhcdTZCQ0YgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RjFBXHU4QkREXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCczMDgwJylcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQpKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbiA9IE51bWJlcih2LnRyaW0oKSlcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQgPSBOdW1iZXIuaXNJbnRlZ2VyKG4pICYmIG4gPj0gMCAmJiBuIDw9IDY1NTM1ID8gbiA6IDMwODBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLm5ldFByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NSAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1XHVGRjA4RFNIX0hPTUVcdUZGMDlcdTRFMEVcdTRGMUFcdThCRERcdTk2OTRcdTc5QkInIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2QTIxXHU1RjBGJylcbiAgICAgIC5zZXREZXNjKCdEU0ggXHU3Njg0XHU0RjFBXHU4QkREL1x1NUJDNlx1OTRBNS9cdTZBMjFcdTU3OEJcdTkxNERcdTdGNkVcdTY4MzlcdTc2RUVcdTVGNTVcdTMwMDJwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gXHU2QkNGXHU0RTJBIHZhdWx0IFx1NzJFQ1x1N0FDQiBEU0hfSE9NRSArIFx1NzJFQ1x1N0FDQlx1N0FFRlx1NTNFM1x1RkYwQ1x1NTQwNFx1ODFFQVx1NTNFQVx1NjYzRVx1NzkzQVx1NjcyQyB2YXVsdCBcdTUyMUJcdTVFRkEvXHU2NUIwXHU1RUZBXHU3Njg0XHU0RjFBXHU4QkREXHVGRjBDXHU0RTkyXHU0RTBEXHU3NkY4XHU5MDFBXHUzMDAyJylcbiAgICAgIC5hZGREcm9wZG93bigoZGQpID0+IHtcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdzaGFyZWQnLCAnXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTRFMDBcdTU5NTdcdTRGMUFcdThCRERcdUZGMENcdTRFMEUgZHNoIENMSSBcdTRFMDBcdTgxRjRcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ3Blci12YXVsdCcsICdcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCIH4vLmRzaC92YXVsdHMvPFx1NTQwRD4tPGhhc2g+XHVGRjA4XHU0RjFBXHU4QkREXHU1QjhDXHU1MTY4XHU3MkVDXHU3QUNCXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdjdXN0b20nLCAnXHU4MUVBXHU1QjlBXHU0RTQ5XHU4REVGXHU1Rjg0JylcbiAgICAgICAgZGQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUpXG4gICAgICAgIGRkLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSB2IGFzIERzaEhvbWVNb2RlXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB0aGlzLmN1c3RvbUhvbWVFbD8uc2V0RGlzYWJsZWQodiAhPT0gJ2N1c3RvbScpXG4gICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICB0aGlzLmN1c3RvbUhvbWVFbCA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODQnKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvVXNlcnMveW91Ly5kc2gnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZSA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmN1c3RvbUhvbWVFbC5zZXREaXNhYmxlZCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSAhPT0gJ2N1c3RvbScpXG5cbiAgICB0aGlzLmhvbWVQcmV2aWV3ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgfVxuXG4gIHByaXZhdGUgZGV0ZWN0TGluZSE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgaG9tZVByZXZpZXchOiBIVE1MRWxlbWVudFxuICBwcml2YXRlIG5ldFByZXZpZXchOiBIVE1MRWxlbWVudFxuXG4gIHByaXZhdGUgZGVzY3JpYmVTdGF0dXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHJldHVybiBgJHtzLnVybH1cdUZGMDgke3MuYXR0YWNoZWQgPyAnXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICdcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NENcdTRFMkQnfVx1RkYwOWBcbiAgICB9XG4gICAgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykgcmV0dXJuICdcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjZcdUZGMDhcdTk5OTZcdTZCMjFcdTdFQTYgMTAgXHU3OUQyXHVGRjBDXHU5NzAwXHU1MjFEXHU1OUNCXHU1MzE2IHByb2ZpbGVcdUZGMDknXG4gICAgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykgcmV0dXJuIGBcdTU5MzFcdThEMjU6ICR7cy5tZXNzYWdlfWBcbiAgICByZXR1cm4gJ1x1NjcyQVx1OEZEMFx1ODg0QydcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEZXRlY3QoKTogc3RyaW5nIHtcbiAgICBjb25zdCBpbmZvID0gdGhpcy5wbHVnaW4uZGV0ZWN0SW5mbygpXG4gICAgcmV0dXJuIFtcbiAgICAgIGBkc2g6ICR7aW5mby5kc2hCaW4gPz8gJ1x1NjcyQVx1NjI3RVx1NTIzMCd9JHtpbmZvLmRzaE5vdGVzLmxlbmd0aCA/IGBcdUZGMDgke2luZm8uZHNoTm90ZXMuam9pbignXHVGRjFCJyl9XHVGRjA5YCA6ICcnfWAsXG4gICAgICBgbm9kZTogJHtpbmZvLm5vZGVOb3Rlcy5qb2luKCdcdUZGMUInKX1gLFxuICAgIF0uam9pbignXFxuJylcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEc2hIb21lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBcdTc1MUZcdTY1NDhcdThERUZcdTVGODQ6ICR7dGhpcy5wbHVnaW4uZWZmZWN0aXZlRHNoSG9tZSgpfWBcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVOZXQoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlUG9ydCgpXG4gICAgY29uc3QgbW9kZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlXG4gICAgY29uc3Qgc3VmZml4ID0gbW9kZSA9PT0gJ3Blci12YXVsdCcgPyAnXHVGRjA4XHU2NzJDIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEUwRVx1NTE3Nlx1NEVENiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMDknIDogJ1x1RkYwOHNoYXJlZC9jdXN0b21cdUZGMUFcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHVGRjA5J1xuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU3QUVGXHU1M0UzOiAke3BvcnR9JHtzdWZmaXh9YFxuICB9XG59XG4iLCAiLyoqXG4gKiBEc2hXZWJWaWV3IFx1MjAxNFx1MjAxNCBcdTYyOEFcdTVCOThcdTY1QjkgRFNIIFdlYiAoMTI3LjAuMC4xOjxwb3J0PikgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuIFx1OTc2Mlx1Njc3Rlx1MzAwMlxuICogXHU1RTI2XHU1QjhDXHU2NTc0XHU4RkM3XHU3QTBCXHU3MkI2XHU2MDAxXHVGRjFBXHU1MkEwXHU4RjdEXHU1MkE4XHU3NTNCIC8gXHU5NTE5XHU4QkVGXHU1MzYxXHU3MjQ3XHVGRjA4XHU1NDJCXHU5MUNEXHU4QkQ1XHVGRjA5LyBcdTY3MkFcdTU0MkZcdTUyQThcdTdBN0FcdTcyQjZcdTYwMDEgLyBcdTU2RkVcdTY4MDdcdTVERTVcdTUxNzdcdTY4MEZcdTMwMDJcbiAqIGlmcmFtZSBcdTYzMDdcdTU0MTFcdTVCOThcdTY1QjlcdTY3MERcdTUyQTFcdUZGMENVSSBcdTUzRUFcdTY2MkZcIlx1ODIzOVx1NTc1RVwiXHU1OTE2XHU1OEYzXHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24gfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgY29uc3QgRFNIX1dFQl9WSUVXX1RZUEUgPSAnZHNoLWRvY2std2ViJ1xuXG50eXBlIFVpU3RhdGUgPSAncnVubmluZycgfCAnc3RhcnRpbmcnIHwgJ2Vycm9yJyB8ICdzdG9wcGVkJ1xuXG5leHBvcnQgY2xhc3MgRHNoV2ViVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBpZnJhbWVFbDogSFRNTElGcmFtZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHBpbGxFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIG92ZXJsYXlFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHRvZ2dsZUJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIGN1cnJlbnQ6IFVpU3RhdGUgPSAnc3RvcHBlZCdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihsZWFmKVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gRFNIX1dFQl9WSUVXX1RZUEVcbiAgfVxuXG4gIG92ZXJyaWRlIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdEU0ggRG9jaydcbiAgfVxuXG4gIG92ZXJyaWRlIGdldEljb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ2FuY2hvcidcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2snIH0pXG5cbiAgICAvLyAtLS0tIFx1NTkzNFx1OTBFOFx1NURFNVx1NTE3N1x1NjgwRiAtLS0tXG4gICAgY29uc3QgaGVhZGVyID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1oZWFkZXInIH0pXG4gICAgY29uc3QgbG9nbyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1sb2dvJyB9KVxuICAgIHNldEljb24obG9nbywgJ2FuY2hvcicpXG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay10aXRsZScsIHRleHQ6ICdEU0ggRG9jaycgfSlcbiAgICB0aGlzLnBpbGxFbCA9IGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stcGlsbCcgfSlcbiAgICBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3BhY2VyJyB9KVxuXG4gICAgdGhpcy50b2dnbGVCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHRoaXMudG9nZ2xlQnRuLm9uY2xpY2sgPSAoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKVxuXG4gICAgY29uc3QgcmVmcmVzaEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihyZWZyZXNoQnRuLCAncmVmcmVzaC1jdycpXG4gICAgcmVmcmVzaEJ0bi50aXRsZSA9ICdcdTUyMzdcdTY1QjAnXG4gICAgcmVmcmVzaEJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5yZWxvYWQoKVxuXG4gICAgY29uc3QgcG9wb3V0QnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHBvcG91dEJ0biwgJ21heGltaXplLTInKVxuICAgIHBvcG91dEJ0bi50aXRsZSA9ICdcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhcdTcyRUNcdTdBQ0JcdThGREJcdTdBMEJcdUZGMENcdTYwMjdcdTgwRkRcdTdCNDlcdTU0MENcdTZENEZcdTg5QzhcdTU2NjhcdUZGMDknXG4gICAgcG9wb3V0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5Qb3BvdXQoKVxuICAgIH1cblxuICAgIGNvbnN0IGJyb3dzZXJCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24oYnJvd3NlckJ0biwgJ2V4dGVybmFsLWxpbmsnKVxuICAgIGJyb3dzZXJCdG4udGl0bGUgPSAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJ1xuICAgIGJyb3dzZXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlbkluQnJvd3NlcigpXG4gICAgfVxuXG4gICAgLy8gLS0tLSBcdTRFM0JcdTRGNTNcdUZGMUFpZnJhbWUgKyBcdTcyQjZcdTYwMDFcdTg5ODZcdTc2RDZcdTVDNDIgLS0tLVxuICAgIGNvbnN0IGJvZHkgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJvZHknIH0pXG4gICAgdGhpcy5pZnJhbWVFbCA9IGJvZHkuY3JlYXRlRWwoJ2lmcmFtZScsIHsgY2xzOiAnZHNoLWRvY2stZnJhbWUnIH0pXG4gICAgdGhpcy5vdmVybGF5RWwgPSBib2R5LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLW92ZXJsYXknIH0pXG5cbiAgICAvLyBcdTcyQjZcdTYwMDFcdTgwNTRcdTUyQThcbiAgICB0aGlzLnBsdWdpbi5vblN0YXR1c0NoYW5nZSgoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB0aGlzLnJlZnJlc2goKVxuXG4gICAgLy8gXHU1MTVDXHU1RTk1XHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGXHU2NUY2XHU4MkU1XHU2NzBEXHU1MkExXHU2NzJBXHU1NDJGXHU1MkE4XHU0RTE0XHU3QUVGXHU1M0UzXHU1M0VGXHU3NTI4XHVGRjBDXHU1QzFEXHU4QkQ1XHU2MkM5XHU4RDc3XG4gICAgdm9pZCB0aGlzLmVuc3VyZVN0YXJ0ZWQoKVxuXG4gICAgLy8gXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGXHU2NUY2XHU1MjM3XHU2NUIwXHU0RTAwXHU2QjIxXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgwN1x1OEJCMFx1RkYxQVx1NzUyOFx1NjIzN1x1NkI2NFx1NTIzQlx1NkI2M1x1NjI1M1x1NUYwMCBEU0ggXHU5NzYyXHU2NzdGXHU3Njg0XHU3QTk3XHU1M0UzXG4gICAgLy8gXHU1QzMxXHU2NjJGXCJcdTVGNTNcdTUyNEQgdmF1bHRcIlx1RkYwQ1x1NjVFMFx1OTcwMFx1N0I0OSBmb2N1cy9hY3RpdmUtbGVhZi1jaGFuZ2UgXHU0RThCXHU0RUY2XHUzMDAyXG4gICAgdGhpcy5wbHVnaW4ucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gIH1cblxuICBvdmVycmlkZSBvbkNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBvblRvZ2dsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdG9wKClcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgIH1cbiAgICB0aGlzLnJlZnJlc2goKVxuICB9XG5cbiAgLyoqIFx1OTc2Mlx1Njc3Rlx1NjI1M1x1NUYwMFx1NjVGNlx1Nzg2RVx1NEZERFx1NjcwRFx1NTJBMVx1NTcyOFx1OEREMVx1RkYwOFx1NURGMlx1NTcyOFx1OEREMVx1NTIxOVx1NjMwMlx1NjNBNVx1RkYwOSAqL1xuICBwcml2YXRlIGFzeW5jIGVuc3VyZVN0YXJ0ZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3N0b3BwZWQnIHx8IHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgICAgdGhpcy5yZWZyZXNoKClcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlZnJlc2goKTogdm9pZCB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgbGV0IHVpOiBVaVN0YXRlXG4gICAgbGV0IHBpbGxUZXh0ID0gJydcbiAgICBsZXQgcGlsbENscyA9ICcnXG5cbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHVpID0gJ3J1bm5pbmcnXG4gICAgICBwaWxsVGV4dCA9IGBcdTI1Q0YgJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJyBcdTAwQjcgXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICcnfWBcbiAgICAgIHBpbGxDbHMgPSAnaXMtcnVubmluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdWkgPSAnc3RhcnRpbmcnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0MgXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2J1xuICAgICAgcGlsbENscyA9ICdpcy1zdGFydGluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdWkgPSAnZXJyb3InXG4gICAgICBwaWxsVGV4dCA9ICdcdTI3MTUgXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1J1xuICAgICAgcGlsbENscyA9ICdpcy1lcnJvcidcbiAgICB9IGVsc2Uge1xuICAgICAgdWkgPSAnc3RvcHBlZCdcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjVDQiBcdTY3MkFcdThGRDBcdTg4NEMnXG4gICAgICBwaWxsQ2xzID0gJ2lzLXN0b3BwZWQnXG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdWlcbiAgICBpZiAodGhpcy5waWxsRWwpIHtcbiAgICAgIHRoaXMucGlsbEVsLnNldFRleHQocGlsbFRleHQpXG4gICAgICB0aGlzLnBpbGxFbC5jbGFzc05hbWUgPSBgZHNoLWRvY2stcGlsbCAke3BpbGxDbHN9YFxuICAgIH1cbiAgICBpZiAodGhpcy50b2dnbGVCdG4pIHtcbiAgICAgIHRoaXMudG9nZ2xlQnRuLmVtcHR5KClcbiAgICAgIHNldEljb24odGhpcy50b2dnbGVCdG4sIHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJyA/ICdzcXVhcmUnIDogJ3BsYXknKVxuICAgICAgdGhpcy50b2dnbGVCdG4udGl0bGUgPSBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycgPyAnXHU1MDVDXHU2QjYyJyA6ICdcdTU0MkZcdTUyQTgnXG4gICAgfVxuXG4gICAgLy8gaWZyYW1lIFx1NEUwRVx1ODk4Nlx1NzZENlx1NUM0MlxuICAgIGlmICh1aSA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmlmcmFtZUVsLnNyYyAhPT0gdGhpcy5wbHVnaW4uYmFzZVVybCkge1xuICAgICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICAgIH1cbiAgICAgIHRoaXMuc2hvd092ZXJsYXkobnVsbClcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RhcnRpbmcoKSlcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyRXJyb3Iocy5raW5kID09PSAnZXJyb3InID8gcy5tZXNzYWdlIDogJ1x1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRicpKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RvcHBlZCgpKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0gXHU4OTg2XHU3NkQ2XHU1QzQyXHU2RTMyXHU2N0QzIC0tLS0tLS0tLS1cblxuICBwcml2YXRlIHNob3dPdmVybGF5KGNvbnRlbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5vdmVybGF5RWwpIHJldHVyblxuICAgIHRoaXMub3ZlcmxheUVsLmVtcHR5KClcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgdGhpcy5vdmVybGF5RWwuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgICAgIHRoaXMub3ZlcmxheUVsLnJlbW92ZUF0dHJpYnV0ZSgnaGlkZGVuJylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gXHU4RkQwXHU4ODRDXHU0RTJEXHVGRjFBXHU2NjNFXHU1RjBGXHU5NjkwXHU4NUNGXHU4OTg2XHU3NkQ2XHU1QzQyXHVGRjA4XHU1NDI2XHU1MjE5XHU3QTdBXHU3Njg0XHU3RUREXHU1QkY5XHU1QjlBXHU0RjREXHU1QzQyXHU0RjFBXHU2MzIxXHU0RjRGIGlmcmFtZVx1RkYwOVxuICAgICAgdGhpcy5vdmVybGF5RWwuc2V0QXR0cmlidXRlKCdoaWRkZW4nLCAnJylcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXJ0aW5nKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3Bpbm5lcicgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnXHU2QjYzXHU1NzI4XHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IERTSCBXZWJcdTIwMjYnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLFxuICAgICAgdGV4dDogJ1x1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1OTcwMFx1NTIxRFx1NTlDQlx1NTMxNiBwcm9maWxlXHVGRjA4XHU3RUE2IDEwIFx1NzlEMlx1RkYwOVx1RkYxQlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MFx1NzUyOFx1NjVGNlx1NUMwNlx1ODFFQVx1NTJBOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScsXG4gICAgfSlcbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYWxlcnQtdHJpYW5nbGUnKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1tc2cnLCB0ZXh0OiBtZXNzYWdlIH0pXG4gICAgY29uc3QgcmV0cnkgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuJywgdGV4dDogJ1x1OTFDRFx1OEJENScgfSlcbiAgICByZXRyeS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RvcHBlZCgpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FuY2hvcicpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTY3MkFcdThGRDBcdTg4NEMnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsIHRleHQ6ICdcdTcwQjlcdTUxRkJcdTU0MkZcdTUyQThcdUZGMENcdTYyOEFcdTVCOThcdTY1QjkgRGVlcFNlZWsgSGFybmVzcyBcdTUwNUNcdTk3NjBcdThGREJcdTY3NjUnIH0pXG4gICAgY29uc3Qgc3RhcnQgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuIG1vZC1jdGEnLCB0ZXh0OiAnXHU1NDJGXHU1MkE4IERTSCcgfSlcbiAgICBzdGFydC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVsb2FkKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGN1cnJlbnRWYXVsdC50cyBcdTIwMTRcdTIwMTQgXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHRcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHUzMDAyXG4gKlxuICogZHNoLWRvY2sgXHU4REQxXHU1NzI4IE9ic2lkaWFuIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1ODBGRFx1NjJGRlx1NTIzMFx1NjcwMFx1Njc0M1x1NUEwMVx1NzY4NFx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1N0E5N1x1NTNFM1x1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NjVGNlx1RkYwQ1xuICogYGFwcC52YXVsdC5nZXROYW1lKClgICsgYGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKWBcdUZGMDlcdTMwMDJEU0ggXHU3Njg0XHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XG4gKiBkc2gtdG9vbC1vYnNpZGlhbi12YXVsdCBcdThERDFcdTU3MjhcdTcyRUNcdTdBQ0Igbm9kZSBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTRFMjRcdTgwMDVcdTkwMUFcdThGQzdcdTRFMDBcdTRFMkFcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTg5RTNcdTgwMjZcdTkwMUFcdTRGRTFcdUZGMUFcbiAqXG4gKiAgIDxob21lZGlyPi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAgIHsgbmFtZSwgcGF0aCwgdXBkYXRlZEF0IH1cbiAqXG4gKiAtIFx1NEY0RFx1N0Y2RVx1NTZGQVx1NUI5QVx1NTcyOCBgfi8uZHNoYFx1RkYwOFx1NEUwRSBkc2gtZG9jayBcdTc2ODQgRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHU2NUUwXHU1MTczXHVGRjA5XHVGRjBDXHU0RUZCXHU0RjU1XHU2QTIxXHU1RjBGXG4gKiAgIFx1NEUwQiBEU0ggXHU0RkE3XHU5MEZEXHU4QkZCXHU1Rjk3XHU1MjMwXHVGRjFCXG4gKiAtIFx1NTkxQVx1N0E5N1x1NTNFM1x1NTczQVx1NjY2Rlx1RkYxQVx1NkJDRlx1NEUyQSBPYnNpZGlhbiBcdTdBOTdcdTUzRTNcdUZGMDhcdTRFM0JcdTdBOTdcdTUzRTMgLyBwb3BvdXRcdUZGMDlcdTkwRkRcdTY2MkZcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTU0MDRcbiAqICAgXHU4MUVBXHU3NkQxXHU1NDJDXHU4MUVBXHU1REYxXHU3Njg0IHdpbmRvdyBmb2N1cyBcdTIwMTRcdTIwMTQgXHU2NzAwXHU1NDBFXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU3Njg0XHU3QTk3XHU1M0UzXHU1MTk5XHU1MTY1XHVGRjBDXHU2QjYzXHU2NjJGXCJcdTc1MjhcdTYyMzdcdTVGNTNcdTUyNERcdTZCNjNcbiAqICAgXHU1NzI4XHU3NzBCXHU3Njg0IHZhdWx0XCJcdUZGMUJcbiAqIC0gXHU1OTMxXHU4RDI1XHU5NzU5XHU5RUQ4XHVGRjFBXHU1MTk5XHU0RTBEXHU4RkRCXHVGRjA4XHU2NzQzXHU5NjUwL1x1NzhDMVx1NzZEOFx1RkYwOVx1NTNFQSBjb25zb2xlLndhcm5cdUZGMENcdTdFRERcdTRFMERcdTYyNTNcdTY1QURcdTYzRDJcdTRFRjZcdTRFM0JcdTZENDFcdTdBMEJcdUZGMUJcbiAqICAgXHU2NTg3XHU0RUY2XHU2MzVGXHU1NzRGL1x1N0YzQVx1NTkzMVx1NjVGNiBEU0ggXHU0RkE3XHU1NkRFXHU5MDAwXHU1MzlGXHU2NzA5XHU0RkUxXHU1M0Y3XHVGRjBDXHU1NDExXHU1NDBFXHU1MTdDXHU1QkI5XHU0RTBEXHU4OEM1IGRzaC1kb2NrIFx1NzY4NFx1NTczQVx1NjY2Rlx1MzAwMlxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTU2RkFcdTVCOUFcdTRGNERcdTdGNkVcdUZGMUF+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnLCAnY3VycmVudC12YXVsdC5qc29uJylcbn1cblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE4NVx1NUJCOVx1RkYwOERTSCBcdTRGQTdcdTUzRUFcdThCRkIgbmFtZS9wYXRoXHVGRjBDdXBkYXRlZEF0IFx1NEY5Qlx1OEJDQVx1NjVBRFx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBDdXJyZW50VmF1bHRNYXJrZXIge1xuICBuYW1lOiBzdHJpbmdcbiAgcGF0aDogc3RyaW5nXG4gIHVwZGF0ZWRBdDogbnVtYmVyXG59XG5cbi8qKlxuICogXHU1MzlGXHU1QjUwXHU1MTk5XHU1MTY1XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjFBXHU1MTQ4XHU1MTk5XHU1NDBDXHU3NkVFXHU1RjU1IC50bXAgXHU1MThEIHJlbmFtZVx1RkYwQ1x1OTA3Rlx1NTE0RCBEU0ggXHU0RkE3XHU4QkZCXHU1MjMwXHU1MzRBXHU2MjJBXHU1MTg1XHU1QkI5XHUzMDAyXG4gKiBcdTU5MzFcdThEMjVcdTUzRUFcdTU0NEFcdThCNjZcdUZGMENcdTRFMERcdTYyOUJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKG5hbWU6IHN0cmluZywgdmF1bHRQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlID0gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpXG4gICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShmaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBjb25zdCBwYXlsb2FkOiBDdXJyZW50VmF1bHRNYXJrZXIgPSB7IG5hbWUsIHBhdGg6IHZhdWx0UGF0aCwgdXBkYXRlZEF0OiBEYXRlLm5vdygpIH1cbiAgICBjb25zdCB0bXAgPSBgJHtmaWxlfS50bXBgXG4gICAgZnMud3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpKVxuICAgIGZzLnJlbmFtZVN5bmModG1wLCBmaWxlKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gXHU1MTk5XHU1MTY1IGN1cnJlbnQtdmF1bHQgXHU2ODA3XHU4QkIwXHU1OTMxXHU4RDI1JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTRFQ0UgT2JzaWRpYW4gYXBwIFx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdCBcdTU0MERcdTRFMEVcdTY4MzlcdThERUZcdTVGODRcdUZGMUJcdTUzRDZcdTRFMERcdTUyMzBcdThGRDRcdTU2REUgbnVsbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdEluZm8oYXBwOiB7XG4gIHZhdWx0OiB7IGdldE5hbWUoKTogc3RyaW5nOyBhZGFwdGVyOiB1bmtub3duIH1cbn0pOiB7IG5hbWU6IHN0cmluZzsgcGF0aDogc3RyaW5nIH0gfCBudWxsIHtcbiAgdHJ5IHtcbiAgICAvLyBnZXRCYXNlUGF0aCBcdTRFMERcdTU3Mjggb2JzaWRpYW4gXHU3Njg0XHU3QzdCXHU1NzhCXHU1QjlBXHU0RTQ5XHU5MUNDXHVGRjA4XHU4RkQwXHU4ODRDXHU2NUY2IERhdGFBZGFwdGVyIFx1NjI0RFx1NjcwOVx1RkYwOVx1RkYwQ1xuICAgIC8vIFx1NjI0MFx1NEVFNVx1OEZEOVx1OTFDQ1x1NjI4QSBhZGFwdGVyIFx1NUY1MyB1bmtub3duIFx1NTkwNFx1NzQwNlx1NTE4RFx1NjVBRFx1OEEwMFx1MzAwMlxuICAgIGNvbnN0IGJhc2UgPSAoYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgICBpZiAoIWJhc2UpIHJldHVybiBudWxsXG4gICAgcmV0dXJuIHsgbmFtZTogYXBwLnZhdWx0LmdldE5hbWUoKSwgcGF0aDogYmFzZSB9XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBUUEsSUFBQUEsbUJBQThDO0FBRTlDLElBQUFDLE1BQW9CO0FBQ3BCLElBQUFDLFFBQXNCOzs7QUNJdEIsMkJBQW9EO0FBQ3BELFNBQW9CO0FBQ3BCLFdBQXNCO0FBQ3RCLFNBQW9CO0FBQ3BCLFdBQXNCO0FBRWYsSUFBTSxtQkFBd0IsVUFBSyxnQkFBZ0IsT0FBTyxPQUFPLFFBQVE7QUFHekUsSUFBTSx3QkFBd0I7QUFHOUIsU0FBUyxXQUFXLE9BQWUsTUFBTSxHQUFXO0FBQ3pELE1BQUksSUFBSTtBQUNSLFdBQVMsSUFBSSxHQUFHLElBQUksTUFBTSxRQUFRLElBQUssTUFBTSxLQUFLLEtBQUssSUFBSSxNQUFNLFdBQVcsQ0FBQyxNQUFPO0FBQ3BGLFNBQU8sRUFBRSxTQUFTLEVBQUUsRUFBRSxTQUFTLEtBQUssR0FBRyxFQUFFLE1BQU0sR0FBRyxHQUFHO0FBQ3ZEO0FBR08sU0FBUyxjQUFjLFdBQTJCO0FBQ3ZELFFBQU0sVUFDSCxjQUFTLFNBQVMsRUFDbEIsUUFBUSxzQkFBc0IsR0FBRyxFQUNqQyxRQUFRLFlBQVksRUFBRTtBQUN6QixVQUFRLFdBQVcsU0FBUyxNQUFNLEdBQUcsRUFBRTtBQUN6QztBQWtETyxTQUFTLGdCQUFnQixPQUFpRDtBQUMvRSxNQUFJLENBQUMsTUFBTyxRQUFPO0FBQ25CLFFBQU0sSUFBSSxNQUFNLEtBQUs7QUFDckIsTUFBSSxDQUFDLEVBQUcsUUFBTztBQUNmLFFBQU0sV0FBVyxFQUFFLFFBQVEsaUJBQW9CLFdBQVEsQ0FBQztBQUN4RCxRQUFNLE1BQVcsZ0JBQVcsUUFBUSxJQUFTLGVBQVUsUUFBUSxJQUFTLGFBQVEsUUFBUTtBQUN4RixNQUFJO0FBQ0YsVUFBTSxLQUFRLFlBQVMsR0FBRztBQUMxQixRQUFJLEdBQUcsWUFBWSxHQUFHO0FBQ3BCLFlBQU0sWUFBaUIsVUFBSyxLQUFLLE9BQU8sUUFBUTtBQUNoRCxhQUFVLGNBQVcsU0FBUyxJQUFJLFlBQVk7QUFBQSxJQUNoRDtBQUNBLFFBQUksR0FBRyxPQUFPLEVBQUcsUUFBTztBQUFBLEVBQzFCLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUdPLFNBQVMsb0JBQThCO0FBQzVDLFFBQU0sUUFBa0IsQ0FBQztBQUN6QixNQUFJLFFBQVEsSUFBSSxtQkFBb0IsT0FBTSxLQUFLLFFBQVEsSUFBSSxrQkFBa0I7QUFDN0UsUUFBTSxjQUFVLGdDQUFVLE9BQU8sQ0FBQyxRQUFRLElBQUksR0FBRztBQUFBLElBQy9DLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxFQUNmLENBQUM7QUFDRCxNQUFJLFFBQVEsV0FBVyxLQUFLLFFBQVEsUUFBUTtBQUMxQyxVQUFNLE9BQU8sUUFBUSxPQUFPLEtBQUssRUFBRSxNQUFNLE9BQU8sRUFBRSxDQUFDO0FBQ25ELFFBQUksS0FBTSxPQUFNLEtBQUssSUFBSTtBQUFBLEVBQzNCO0FBQ0EsTUFBSSxRQUFRLGFBQWEsVUFBVTtBQUNqQyxVQUFNLEtBQUssa0NBQWtDLDZCQUE2QjtBQUFBLEVBQzVFLFdBQVcsUUFBUSxhQUFhLFNBQVM7QUFDdkMsVUFBTSxLQUFLLHlCQUF5QiwrQkFBb0MsVUFBUSxXQUFRLEdBQUcsVUFBVSxPQUFPLGNBQWMsQ0FBQztBQUFBLEVBQzdILFdBQVcsUUFBUSxhQUFhLFNBQVM7QUFDdkMsVUFBTSxVQUFVLFFBQVEsSUFBSTtBQUM1QixRQUFJLFFBQVMsT0FBTSxLQUFVLFVBQUssU0FBUyxPQUFPLGNBQWMsQ0FBQztBQUFBLEVBQ25FO0FBRUEsU0FBTyxDQUFDLEdBQUcsSUFBSSxJQUFJLEtBQUssQ0FBQztBQUMzQjtBQU9PLFNBQVMsY0FBYyxVQUE0RDtBQUN4RixRQUFNLFFBQWtCLENBQUM7QUFDekIsUUFBTSxjQUFjLGdCQUFnQixZQUFZLFFBQVEsSUFBSSxPQUFPO0FBQ25FLE1BQUksZUFBa0IsY0FBVyxXQUFXLEdBQUc7QUFDN0MsV0FBTyxFQUFFLEtBQUssYUFBYSxPQUFPLENBQUMseUNBQVcsV0FBVyxFQUFFLEVBQUU7QUFBQSxFQUMvRDtBQUNBLE1BQUksU0FBVSxPQUFNLEtBQUssK0NBQVksUUFBUSxFQUFFO0FBRS9DLGFBQVcsUUFBUSxrQkFBa0IsR0FBRztBQUN0QyxVQUFNLFlBQWlCLFVBQUssTUFBTSxnQkFBZ0I7QUFDbEQsUUFBTyxjQUFXLFNBQVMsR0FBRztBQUM1QixhQUFPLEVBQUUsS0FBSyxXQUFXLE9BQU8sQ0FBQyxHQUFHLE9BQU8scURBQWEsU0FBUyxFQUFFLEVBQUU7QUFBQSxJQUN2RTtBQUFBLEVBQ0Y7QUFDQSxRQUFNLEtBQUsscUtBQWlFO0FBQzVFLFNBQU8sRUFBRSxLQUFLLE1BQU0sTUFBTTtBQUM1QjtBQVFPLFNBQVMsZUFBZSxVQUFtQkMsc0JBQThCLGNBQWMsT0FBcUI7QUFDakgsUUFBTSxRQUFrQixDQUFDO0FBQ3pCLFFBQU0sY0FBYyxVQUFVLEtBQUssS0FBSyxRQUFRLElBQUk7QUFDcEQsTUFBSSxhQUFhO0FBQ2YsVUFBTSxLQUFLLGtDQUFjLFdBQVcsRUFBRTtBQUN0QyxXQUFPLEVBQUUsU0FBUyxhQUFhLG1CQUFtQixPQUFPLFdBQVcsR0FBRyxNQUFNO0FBQUEsRUFDL0U7QUFDQSxNQUFJLGVBQWUsUUFBUSxZQUFZQSxzQkFBcUI7QUFDMUQsVUFBTSxRQUFRLE9BQU9BLHFCQUFvQixNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSztBQUMzRCxRQUFJLFNBQVMsdUJBQXVCO0FBQ2xDLFlBQU0sS0FBSywyQ0FBdUJBLG9CQUFtQixrQ0FBd0I7QUFDN0UsYUFBTyxFQUFFLFNBQVMsUUFBUSxVQUFVLG1CQUFtQixNQUFNLFdBQVcsT0FBTyxNQUFNO0FBQUEsSUFDdkY7QUFDQSxVQUFNLEtBQUssOEJBQW9CQSxvQkFBbUIsTUFBTSxxQkFBcUIsZ0NBQU87QUFBQSxFQUN0RjtBQUNBLFFBQU0sS0FBSywwRkFBOEI7QUFDekMsU0FBTyxFQUFFLFNBQVMsUUFBUSxtQkFBbUIsT0FBTyxXQUFXLEdBQUcsTUFBTTtBQUMxRTtBQU9PLFNBQVMsc0JBQTBDO0FBQ3hELE1BQUk7QUFDRixVQUFNLElBQUssUUFBUSxVQUE0QztBQUMvRCxXQUFPLEtBQUs7QUFBQSxFQUNkLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBUU8sU0FBUyxTQUFTLE1BQWMsTUFBYyxZQUFZLE1BQXdCO0FBQ3ZGLFNBQU8sSUFBSSxRQUFRLENBQUNDLGFBQVk7QUFDOUIsVUFBTSxNQUFXLFNBQUksRUFBRSxNQUFNLE1BQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxHQUFHLENBQUMsUUFBUTtBQUMzRSxVQUFJLE9BQU87QUFDWCxNQUFBQSxTQUFRLElBQUk7QUFBQSxJQUNkLENBQUM7QUFDRCxRQUFJLEdBQUcsV0FBVyxNQUFNO0FBQ3RCLFVBQUksUUFBUTtBQUNaLE1BQUFBLFNBQVEsS0FBSztBQUFBLElBQ2YsQ0FBQztBQUNELFFBQUksR0FBRyxTQUFTLE1BQU1BLFNBQVEsS0FBSyxDQUFDO0FBQUEsRUFDdEMsQ0FBQztBQUNIO0FBR0EsZUFBc0IsYUFBYSxNQUFjLE1BQWMsWUFBWSxNQUEyQjtBQUNwRyxRQUFNLFdBQVcsS0FBSyxJQUFJLElBQUk7QUFDOUIsYUFBUztBQUNQLFFBQUksTUFBTSxTQUFTLE1BQU0sTUFBTSxJQUFJLEVBQUcsUUFBTztBQUM3QyxRQUFJLEtBQUssSUFBSSxJQUFJLFNBQVUsUUFBTztBQUNsQyxVQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQztBQUFBLEVBQzdDO0FBQ0Y7QUFjTyxTQUFTLFVBQVUsTUFBcUc7QUFDN0gsUUFBTSxPQUFPLEtBQUssUUFBUTtBQUMxQixRQUFNLE9BQU8sS0FBSyxRQUFRO0FBQzFCLFFBQU0sT0FBTyxDQUFDLEtBQUssUUFBUSxPQUFPLFVBQVUsTUFBTSxVQUFVLE9BQU8sSUFBSSxDQUFDO0FBQ3hFLFFBQU0sTUFBeUI7QUFBQSxJQUM3QixHQUFJLEtBQUssT0FBTyxRQUFRLE9BQU8sQ0FBQztBQUFBLElBQ2hDLFVBQVUsS0FBSztBQUFBLEVBQ2pCO0FBQ0EsTUFBSSxLQUFLLGtCQUFtQixLQUFJLHVCQUF1QjtBQUN2RCxVQUFRLEtBQUssb0JBQW9CLEtBQUssT0FBTyxJQUFJLEtBQUssS0FBSyxHQUFHLENBQUMsRUFBRTtBQUNqRSxVQUFRLEtBQUssdUJBQXVCLEtBQUssT0FBTyxHQUFHLEtBQUssTUFBTSxRQUFRLEtBQUssR0FBRyxLQUFLLEVBQUUsRUFBRTtBQUN2RixhQUFPLDRCQUFNLEtBQUssU0FBUyxNQUFNO0FBQUEsSUFDL0I7QUFBQSxJQUNBLEtBQUssS0FBSztBQUFBLElBQ1YsT0FBTyxDQUFDLFVBQVUsUUFBUSxNQUFNO0FBQUEsSUFDaEMsYUFBYTtBQUFBLEVBQ2YsQ0FBQztBQUNIO0FBU0EsZUFBc0IsaUJBQWlCLE1BQTZFO0FBQ2xILFFBQU0sT0FBTyxLQUFLLFFBQVE7QUFDMUIsUUFBTSxPQUFPLEtBQUssUUFBUTtBQUMxQixRQUFNLE1BQU0sVUFBVSxJQUFJLElBQUksSUFBSTtBQUVsQyxNQUFJLE1BQU0sU0FBUyxNQUFNLElBQUksR0FBRztBQUM5QixXQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sV0FBVyxNQUFNLE1BQU0sS0FBSyxVQUFVLEtBQUssRUFBRTtBQUFBLEVBQ3hFO0FBRUEsUUFBTSxRQUFRLGNBQWMsS0FBSyxNQUFNO0FBQ3ZDLE1BQUksQ0FBQyxNQUFNLEtBQUs7QUFDZCxXQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sU0FBUyxTQUFTLE1BQU0sTUFBTSxNQUFNLE1BQU0sU0FBUyxDQUFDLEtBQUssbUNBQWUsRUFBRTtBQUFBLEVBQ3JHO0FBQ0EsUUFBTSxPQUFPLGVBQWUsS0FBSyxTQUFTLG9CQUFvQixHQUFHLEtBQUssZUFBZTtBQUNyRixRQUFNLE9BQU8sVUFBVSxFQUFFLEdBQUcsTUFBTSxRQUFRLE1BQU0sS0FBSyxTQUFTLEtBQUssU0FBUyxtQkFBbUIsS0FBSyxrQkFBa0IsQ0FBQztBQUd2SCxNQUFJLGFBQWE7QUFDakIsT0FBSyxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQWM7QUFDckMsa0JBQWMsYUFBYSxFQUFFLFNBQVMsR0FBRyxNQUFNLElBQUs7QUFBQSxFQUN0RCxDQUFDO0FBRUQsUUFBTSxZQUFZLElBQUksUUFBaUIsQ0FBQ0EsYUFBWTtBQUNsRCxTQUFLLEtBQUssUUFBUSxNQUFNQSxTQUFRLElBQUksQ0FBQztBQUNyQyxTQUFLLEtBQUssU0FBUyxNQUFNQSxTQUFRLElBQUksQ0FBQztBQUFBLEVBQ3hDLENBQUM7QUFFRCxRQUFNLFFBQVEsTUFBTSxRQUFRLEtBQUs7QUFBQSxJQUMvQixhQUFhLE1BQU0sTUFBTSxLQUFLLGFBQWEsSUFBTyxFQUFFLEtBQUssTUFBTSxJQUFJO0FBQUEsSUFDbkUsVUFBVSxLQUFLLE1BQU0sS0FBSztBQUFBLEVBQzVCLENBQUM7QUFFRCxNQUFJLE9BQU87QUFDVCxXQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sV0FBVyxNQUFNLE1BQU0sS0FBSyxVQUFVLE1BQU0sR0FBRyxLQUFLO0FBQUEsRUFDL0U7QUFHQSxNQUFJLE1BQU0sU0FBUyxNQUFNLElBQUksR0FBRztBQUM5QixXQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sV0FBVyxNQUFNLE1BQU0sS0FBSyxVQUFVLEtBQUssR0FBRyxLQUFLO0FBQUEsRUFDOUU7QUFDQSxTQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sU0FBUyxTQUFTLG9CQUFvQixVQUFVLEVBQUUsR0FBRyxLQUFLO0FBQ3JGO0FBR0EsU0FBUyxvQkFBb0IsWUFBNEI7QUFDdkQsUUFBTSxRQUFRLFdBQVcsTUFBTSxPQUFPLEVBQUUsT0FBTyxPQUFPO0FBQ3RELFFBQU0sV0FBVyxNQUFNLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxZQUFZLENBQUM7QUFDM0QsUUFBTSxVQUFVLE1BQU0sS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLFFBQVEsQ0FBQztBQUN0RCxNQUFJLFVBQVU7QUFDWixXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksU0FBUztBQUNYLFVBQU0sVUFBVSxRQUFRLEtBQUssRUFBRSxNQUFNLEdBQUcsR0FBRztBQUMzQyxXQUFPLGlDQUFhLE9BQU87QUFBQSxFQUM3QjtBQUNBLFNBQU87QUFDVDtBQUdPLFNBQVMsWUFBWSxNQUF1QyxZQUFZLEtBQXFCO0FBQ2xHLE1BQUksQ0FBQyxRQUFRLEtBQUssYUFBYSxRQUFRLEtBQUssZUFBZSxLQUFNLFFBQU8sUUFBUSxRQUFRO0FBQ3hGLFNBQU8sSUFBSSxRQUFRLENBQUNBLGFBQVk7QUFDOUIsVUFBTSxRQUFRLFdBQVcsTUFBTTtBQUM3QixVQUFJO0FBQ0YsYUFBSyxLQUFLLFNBQVM7QUFBQSxNQUNyQixRQUFRO0FBQUEsTUFFUjtBQUFBLElBQ0YsR0FBRyxTQUFTO0FBQ1osU0FBSyxLQUFLLFFBQVEsTUFBTTtBQUN0QixtQkFBYSxLQUFLO0FBQ2xCLE1BQUFBLFNBQVE7QUFBQSxJQUNWLENBQUM7QUFDRCxRQUFJO0FBQ0YsV0FBSyxLQUFLLFNBQVM7QUFBQSxJQUNyQixRQUFRO0FBQ04sbUJBQWEsS0FBSztBQUNsQixNQUFBQSxTQUFRO0FBQUEsSUFDVjtBQUFBLEVBQ0YsQ0FBQztBQUNIOzs7QUNuVkEsc0JBQStDO0FBd0J4QyxJQUFNLG1CQUFvQztBQUFBLEVBQy9DLFFBQVE7QUFBQSxFQUNSLFNBQVM7QUFBQSxFQUNULE1BQU07QUFBQSxFQUNOLE1BQU07QUFBQSxFQUNOLGFBQWE7QUFBQSxFQUNiLFNBQVM7QUFBQSxFQUNULGlCQUFpQjtBQUFBLEVBQ2pCLFdBQVc7QUFDYjtBQUVPLElBQU0scUJBQU4sY0FBaUMsaUNBQWlCO0FBQUEsRUFHdkQsWUFDRSxLQUNRLFFBQ1I7QUFDQSxVQUFNLEtBQUssTUFBTTtBQUZUO0FBQUEsRUFHVjtBQUFBLEVBSFU7QUFBQSxFQUpGO0FBQUEsRUFTQyxVQUFnQjtBQUN2QixVQUFNLEVBQUUsWUFBWSxJQUFJO0FBQ3hCLGdCQUFZLE1BQU07QUFHbEIsZ0JBQVksU0FBUyxNQUFNLEVBQUUsTUFBTSxrQkFBYSxDQUFDO0FBQ2pELGdCQUFZLFNBQVMsS0FBSztBQUFBLE1BQ3hCLEtBQUs7QUFBQSxNQUNMLE1BQU07QUFBQSxJQUNSLENBQUM7QUFHRCxnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLGVBQUssQ0FBQztBQUN6QyxVQUFNLGFBQWEsSUFBSSx3QkFBUSxXQUFXLEVBQ3ZDLFFBQVEsMEJBQU0sRUFDZCxRQUFRLEtBQUssZUFBZSxDQUFDO0FBQ2hDLFVBQU0sT0FBTyxXQUFXLFVBQVUsVUFBVSxFQUFFLEtBQUssZ0JBQWdCLENBQUM7QUFDcEUsVUFBTSxXQUFXLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSyxXQUFXLE1BQU0sc0JBQU8sQ0FBQztBQUN6RSxhQUFTLFVBQVUsTUFBTTtBQUN2QixXQUFLLEtBQUssT0FBTyxNQUFNLEVBQUUsS0FBSyxNQUFNLEtBQUssUUFBUSxDQUFDO0FBQUEsSUFDcEQ7QUFDQSxVQUFNLFVBQVUsS0FBSyxTQUFTLFVBQVUsRUFBRSxNQUFNLHNCQUFPLENBQUM7QUFDeEQsWUFBUSxVQUFVLE1BQU07QUFDdEIsV0FBSyxLQUFLLE9BQU8sS0FBSyxFQUFFLEtBQUssTUFBTSxLQUFLLFFBQVEsQ0FBQztBQUFBLElBQ25EO0FBQ0EsVUFBTSxVQUFVLEtBQUssU0FBUyxVQUFVLEVBQUUsTUFBTSwyQkFBTyxDQUFDO0FBQ3hELFlBQVEsVUFBVSxNQUFNO0FBQ3RCLFdBQUssS0FBSyxPQUFPLFVBQVU7QUFBQSxJQUM3QjtBQUVBLFFBQUksd0JBQVEsV0FBVyxFQUNwQixRQUFRLDBDQUFpQixFQUN6QjtBQUFBLE1BQVUsQ0FBQyxNQUNWLEVBQUUsU0FBUyxLQUFLLE9BQU8sU0FBUyxTQUFTLEVBQUUsU0FBUyxPQUFPLE1BQU07QUFDL0QsYUFBSyxPQUFPLFNBQVMsWUFBWTtBQUNqQyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0g7QUFHRixnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLHFCQUFNLENBQUM7QUFDMUMsUUFBSSx3QkFBUSxXQUFXLEVBQ3BCLFFBQVEsc0JBQVksRUFDcEIsUUFBUSw2TUFBaUUsRUFDekU7QUFBQSxNQUFRLENBQUMsTUFDUixFQUNHLGVBQWUsOERBQW9ELEVBQ25FLFNBQVMsS0FBSyxPQUFPLFNBQVMsTUFBTSxFQUNwQyxTQUFTLE9BQU8sTUFBTTtBQUNyQixhQUFLLE9BQU8sU0FBUyxTQUFTLEVBQUUsS0FBSztBQUNyQyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQy9CLGFBQUssV0FBVyxjQUFjLEtBQUssZUFBZTtBQUFBLE1BQ3BELENBQUM7QUFBQSxJQUNMO0FBQ0YsU0FBSyxhQUFhLFlBQVksU0FBUyxPQUFPLEVBQUUsS0FBSyxrQkFBa0IsQ0FBQztBQUV4RSxRQUFJLHdCQUFRLFdBQVcsRUFDcEIsUUFBUSxxQ0FBWSxFQUNwQixRQUFRLDRGQUFzQixFQUM5QjtBQUFBLE1BQVEsQ0FBQyxNQUNSLEVBQ0csZUFBZSxxQ0FBMkIsRUFDMUMsU0FBUyxLQUFLLE9BQU8sU0FBUyxPQUFPLEVBQ3JDLFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGFBQUssT0FBTyxTQUFTLFVBQVUsRUFBRSxLQUFLO0FBQ3RDLGNBQU0sS0FBSyxPQUFPLGFBQWE7QUFDL0IsYUFBSyxXQUFXLGNBQWMsS0FBSyxlQUFlO0FBQUEsTUFDcEQsQ0FBQztBQUFBLElBQ0w7QUFFRixRQUFJLHdCQUFRLFdBQVcsRUFDcEIsUUFBUSx5Q0FBcUIsRUFDN0IsUUFBUSxnT0FBcUUsRUFDN0U7QUFBQSxNQUFVLENBQUMsTUFDVixFQUFFLFNBQVMsS0FBSyxPQUFPLFNBQVMsZUFBZSxFQUFFLFNBQVMsT0FBTyxNQUFNO0FBQ3JFLGFBQUssT0FBTyxTQUFTLGtCQUFrQjtBQUN2QyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQy9CLGFBQUssV0FBVyxjQUFjLEtBQUssZUFBZTtBQUFBLE1BQ3BELENBQUM7QUFBQSxJQUNIO0FBR0YsZ0JBQVksU0FBUyxNQUFNLEVBQUUsTUFBTSxlQUFLLENBQUM7QUFDekMsUUFBSSx3QkFBUSxXQUFXLEVBQ3BCLFFBQVEsa0RBQVUsRUFDbEIsUUFBUSx1UkFBb0YsRUFDNUY7QUFBQSxNQUFRLENBQUMsTUFDUixFQUNHLGVBQWUsTUFBTSxFQUNyQixTQUFTLE9BQU8sS0FBSyxPQUFPLFNBQVMsSUFBSSxDQUFDLEVBQzFDLFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGNBQU0sSUFBSSxPQUFPLEVBQUUsS0FBSyxDQUFDO0FBQ3pCLGFBQUssT0FBTyxTQUFTLE9BQU8sT0FBTyxVQUFVLENBQUMsS0FBSyxLQUFLLEtBQUssS0FBSyxRQUFRLElBQUk7QUFDOUUsY0FBTSxLQUFLLE9BQU8sYUFBYTtBQUMvQixhQUFLLFdBQVcsY0FBYyxLQUFLLFlBQVk7QUFBQSxNQUNqRCxDQUFDO0FBQUEsSUFDTDtBQUNGLFNBQUssYUFBYSxZQUFZLFNBQVMsT0FBTyxFQUFFLEtBQUssa0JBQWtCLENBQUM7QUFHeEUsZ0JBQVksU0FBUyxNQUFNLEVBQUUsTUFBTSw2RUFBc0IsQ0FBQztBQUMxRCxRQUFJLHdCQUFRLFdBQVcsRUFDcEIsUUFBUSxjQUFJLEVBQ1osUUFBUSxrVEFBMkYsRUFDbkcsWUFBWSxDQUFDLE9BQU87QUFDbkIsU0FBRyxVQUFVLFVBQVUscUlBQTJDO0FBQ2xFLFNBQUcsVUFBVSxhQUFhLHlHQUE2QztBQUN2RSxTQUFHLFVBQVUsVUFBVSxnQ0FBTztBQUM5QixTQUFHLFNBQVMsS0FBSyxPQUFPLFNBQVMsV0FBVztBQUM1QyxTQUFHLFNBQVMsT0FBTyxNQUFNO0FBQ3ZCLGFBQUssT0FBTyxTQUFTLGNBQWM7QUFDbkMsY0FBTSxLQUFLLE9BQU8sYUFBYTtBQUMvQixhQUFLLGNBQWMsWUFBWSxNQUFNLFFBQVE7QUFDN0MsYUFBSyxZQUFZLGNBQWMsS0FBSyxnQkFBZ0I7QUFDcEQsYUFBSyxXQUFXLGNBQWMsS0FBSyxZQUFZO0FBQUEsTUFDakQsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUVILFNBQUssZUFBZSxJQUFJLHdCQUFRLFdBQVcsRUFDeEMsUUFBUSwwQ0FBaUIsRUFDekI7QUFBQSxNQUFRLENBQUMsTUFDUixFQUNHLGVBQWUsOEJBQW9CLEVBQ25DLFNBQVMsS0FBSyxPQUFPLFNBQVMsT0FBTyxFQUNyQyxTQUFTLE9BQU8sTUFBTTtBQUNyQixhQUFLLE9BQU8sU0FBUyxVQUFVLEVBQUUsS0FBSztBQUN0QyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQy9CLGFBQUssWUFBWSxjQUFjLEtBQUssZ0JBQWdCO0FBQUEsTUFDdEQsQ0FBQztBQUFBLElBQ0w7QUFDRixTQUFLLGFBQWEsWUFBWSxLQUFLLE9BQU8sU0FBUyxnQkFBZ0IsUUFBUTtBQUUzRSxTQUFLLGNBQWMsWUFBWSxTQUFTLE9BQU8sRUFBRSxLQUFLLGtCQUFrQixDQUFDO0FBRXpFLFNBQUssV0FBVyxjQUFjLEtBQUssZUFBZTtBQUNsRCxTQUFLLFlBQVksY0FBYyxLQUFLLGdCQUFnQjtBQUNwRCxTQUFLLFdBQVcsY0FBYyxLQUFLLFlBQVk7QUFBQSxFQUNqRDtBQUFBLEVBRVE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBRUEsaUJBQXlCO0FBQy9CLFVBQU0sSUFBSSxLQUFLLE9BQU8sVUFBVTtBQUNoQyxRQUFJLEVBQUUsU0FBUyxXQUFXO0FBQ3hCLGFBQU8sR0FBRyxFQUFFLEdBQUcsU0FBSSxFQUFFLFdBQVcseUNBQVcsc0NBQVE7QUFBQSxJQUNyRDtBQUNBLFFBQUksRUFBRSxTQUFTLFdBQVksUUFBTztBQUNsQyxRQUFJLEVBQUUsU0FBUyxRQUFTLFFBQU8saUJBQU8sRUFBRSxPQUFPO0FBQy9DLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFUSxpQkFBeUI7QUFDL0IsVUFBTSxPQUFPLEtBQUssT0FBTyxXQUFXO0FBQ3BDLFdBQU87QUFBQSxNQUNMLFFBQVEsS0FBSyxVQUFVLG9CQUFLLEdBQUcsS0FBSyxTQUFTLFNBQVMsU0FBSSxLQUFLLFNBQVMsS0FBSyxRQUFHLENBQUMsV0FBTSxFQUFFO0FBQUEsTUFDekYsU0FBUyxLQUFLLFVBQVUsS0FBSyxRQUFHLENBQUM7QUFBQSxJQUNuQyxFQUFFLEtBQUssSUFBSTtBQUFBLEVBQ2I7QUFBQSxFQUVRLGtCQUEwQjtBQUNoQyxXQUFPLDZCQUFTLEtBQUssT0FBTyxpQkFBaUIsQ0FBQztBQUFBLEVBQ2hEO0FBQUEsRUFFUSxjQUFzQjtBQUM1QixVQUFNLE9BQU8sS0FBSyxPQUFPLGNBQWM7QUFDdkMsVUFBTSxPQUFPLEtBQUssT0FBTyxTQUFTO0FBQ2xDLFVBQU0sU0FBUyxTQUFTLGNBQWMscUZBQThCO0FBQ3BFLFdBQU8sNkJBQVMsSUFBSSxHQUFHLE1BQU07QUFBQSxFQUMvQjtBQUNGOzs7QUN2TkEsSUFBQUMsbUJBQWlEO0FBRzFDLElBQU0sb0JBQW9CO0FBSTFCLElBQU0sYUFBTixjQUF5QiwwQkFBUztBQUFBLEVBT3ZDLFlBQ0UsTUFDUSxRQUNSO0FBQ0EsVUFBTSxJQUFJO0FBRkY7QUFBQSxFQUdWO0FBQUEsRUFIVTtBQUFBLEVBUkYsV0FBcUM7QUFBQSxFQUNyQyxTQUE2QjtBQUFBLEVBQzdCLFlBQWdDO0FBQUEsRUFDaEMsWUFBc0M7QUFBQSxFQUN0QyxVQUFtQjtBQUFBLEVBU2xCLGNBQXNCO0FBQzdCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFUyxpQkFBeUI7QUFDaEMsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVTLFVBQWtCO0FBQ3pCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFlLFNBQXdCO0FBQ3JDLFVBQU0sT0FBTyxLQUFLLFVBQVUsVUFBVSxFQUFFLEtBQUssV0FBVyxDQUFDO0FBR3pELFVBQU0sU0FBUyxLQUFLLFVBQVUsRUFBRSxLQUFLLGtCQUFrQixDQUFDO0FBQ3hELFVBQU0sT0FBTyxPQUFPLFVBQVUsRUFBRSxLQUFLLGdCQUFnQixDQUFDO0FBQ3RELGtDQUFRLE1BQU0sUUFBUTtBQUN0QixXQUFPLFdBQVcsRUFBRSxLQUFLLGtCQUFrQixNQUFNLFdBQVcsQ0FBQztBQUM3RCxTQUFLLFNBQVMsT0FBTyxXQUFXLEVBQUUsS0FBSyxnQkFBZ0IsQ0FBQztBQUN4RCxXQUFPLFVBQVUsRUFBRSxLQUFLLGtCQUFrQixDQUFDO0FBRTNDLFNBQUssWUFBWSxPQUFPLFNBQVMsVUFBVSxFQUFFLEtBQUssZUFBZSxDQUFDO0FBQ2xFLFNBQUssVUFBVSxVQUFVLE1BQU0sS0FBSyxLQUFLLFNBQVM7QUFFbEQsVUFBTSxhQUFhLE9BQU8sU0FBUyxVQUFVLEVBQUUsS0FBSyxlQUFlLENBQUM7QUFDcEUsa0NBQVEsWUFBWSxZQUFZO0FBQ2hDLGVBQVcsUUFBUTtBQUNuQixlQUFXLFVBQVUsTUFBTSxLQUFLLE9BQU87QUFFdkMsVUFBTSxZQUFZLE9BQU8sU0FBUyxVQUFVLEVBQUUsS0FBSyxlQUFlLENBQUM7QUFDbkUsa0NBQVEsV0FBVyxZQUFZO0FBQy9CLGNBQVUsUUFBUTtBQUNsQixjQUFVLFVBQVUsTUFBTTtBQUN4QixXQUFLLEtBQUssT0FBTyxXQUFXO0FBQUEsSUFDOUI7QUFFQSxVQUFNLGFBQWEsT0FBTyxTQUFTLFVBQVUsRUFBRSxLQUFLLGVBQWUsQ0FBQztBQUNwRSxrQ0FBUSxZQUFZLGVBQWU7QUFDbkMsZUFBVyxRQUFRO0FBQ25CLGVBQVcsVUFBVSxNQUFNO0FBQ3pCLFdBQUssS0FBSyxPQUFPLGNBQWM7QUFBQSxJQUNqQztBQUdBLFVBQU0sT0FBTyxLQUFLLFVBQVUsRUFBRSxLQUFLLGdCQUFnQixDQUFDO0FBQ3BELFNBQUssV0FBVyxLQUFLLFNBQVMsVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDakUsU0FBSyxZQUFZLEtBQUssVUFBVSxFQUFFLEtBQUssbUJBQW1CLENBQUM7QUFHM0QsU0FBSyxPQUFPLGVBQWUsTUFBTSxLQUFLLFFBQVEsQ0FBQztBQUMvQyxTQUFLLFFBQVE7QUFHYixTQUFLLEtBQUssY0FBYztBQUl4QixTQUFLLE9BQU8sMEJBQTBCO0FBQUEsRUFDeEM7QUFBQSxFQUVTLFVBQXlCO0FBQ2hDLFdBQU8sUUFBUSxRQUFRO0FBQUEsRUFDekI7QUFBQSxFQUVBLE1BQWMsV0FBMEI7QUFDdEMsVUFBTSxJQUFJLEtBQUssT0FBTyxVQUFVO0FBQ2hDLFFBQUksRUFBRSxTQUFTLGFBQWEsRUFBRSxTQUFTLFlBQVk7QUFDakQsWUFBTSxLQUFLLE9BQU8sS0FBSztBQUFBLElBQ3pCLE9BQU87QUFDTCxZQUFNLEtBQUssT0FBTyxNQUFNO0FBQUEsSUFDMUI7QUFDQSxTQUFLLFFBQVE7QUFBQSxFQUNmO0FBQUE7QUFBQSxFQUdBLE1BQWMsZ0JBQStCO0FBQzNDLFVBQU0sSUFBSSxLQUFLLE9BQU8sVUFBVTtBQUNoQyxRQUFJLEVBQUUsU0FBUyxhQUFhLEVBQUUsU0FBUyxTQUFTO0FBQzlDLFlBQU0sS0FBSyxPQUFPLE1BQU07QUFDeEIsV0FBSyxRQUFRO0FBQUEsSUFDZjtBQUFBLEVBQ0Y7QUFBQSxFQUVRLFVBQWdCO0FBQ3RCLFVBQU0sSUFBSSxLQUFLLE9BQU8sVUFBVTtBQUNoQyxRQUFJO0FBQ0osUUFBSSxXQUFXO0FBQ2YsUUFBSSxVQUFVO0FBRWQsUUFBSSxFQUFFLFNBQVMsV0FBVztBQUN4QixXQUFLO0FBQ0wsaUJBQVcsVUFBSyxFQUFFLElBQUksR0FBRyxFQUFFLFdBQVcsK0NBQWMsRUFBRTtBQUN0RCxnQkFBVTtBQUFBLElBQ1osV0FBVyxFQUFFLFNBQVMsWUFBWTtBQUNoQyxXQUFLO0FBQ0wsaUJBQVc7QUFDWCxnQkFBVTtBQUFBLElBQ1osV0FBVyxFQUFFLFNBQVMsU0FBUztBQUM3QixXQUFLO0FBQ0wsaUJBQVc7QUFDWCxnQkFBVTtBQUFBLElBQ1osT0FBTztBQUNMLFdBQUs7QUFDTCxpQkFBVztBQUNYLGdCQUFVO0FBQUEsSUFDWjtBQUVBLFNBQUssVUFBVTtBQUNmLFFBQUksS0FBSyxRQUFRO0FBQ2YsV0FBSyxPQUFPLFFBQVEsUUFBUTtBQUM1QixXQUFLLE9BQU8sWUFBWSxpQkFBaUIsT0FBTztBQUFBLElBQ2xEO0FBQ0EsUUFBSSxLQUFLLFdBQVc7QUFDbEIsV0FBSyxVQUFVLE1BQU07QUFDckIsb0NBQVEsS0FBSyxXQUFXLEVBQUUsU0FBUyxhQUFhLEVBQUUsU0FBUyxhQUFhLFdBQVcsTUFBTTtBQUN6RixXQUFLLFVBQVUsUUFBUSxFQUFFLFNBQVMsYUFBYSxFQUFFLFNBQVMsYUFBYSxpQkFBTztBQUFBLElBQ2hGO0FBR0EsUUFBSSxPQUFPLFdBQVc7QUFDcEIsVUFBSSxLQUFLLFlBQVksS0FBSyxTQUFTLFFBQVEsS0FBSyxPQUFPLFNBQVM7QUFDOUQsYUFBSyxTQUFTLE1BQU0sS0FBSyxPQUFPO0FBQUEsTUFDbEM7QUFDQSxXQUFLLFlBQVksSUFBSTtBQUFBLElBQ3ZCLFdBQVcsT0FBTyxZQUFZO0FBQzVCLFdBQUssWUFBWSxLQUFLLGVBQWUsQ0FBQztBQUFBLElBQ3hDLFdBQVcsT0FBTyxTQUFTO0FBQ3pCLFdBQUssWUFBWSxLQUFLLFlBQVksRUFBRSxTQUFTLFVBQVUsRUFBRSxVQUFVLDBCQUFNLENBQUM7QUFBQSxJQUM1RSxPQUFPO0FBQ0wsV0FBSyxZQUFZLEtBQUssY0FBYyxDQUFDO0FBQUEsSUFDdkM7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUlRLFlBQVksU0FBbUM7QUFDckQsUUFBSSxDQUFDLEtBQUssVUFBVztBQUNyQixTQUFLLFVBQVUsTUFBTTtBQUNyQixRQUFJLFNBQVM7QUFDWCxXQUFLLFVBQVUsWUFBWSxPQUFPO0FBQ2xDLFdBQUssVUFBVSxnQkFBZ0IsUUFBUTtBQUFBLElBQ3pDLE9BQU87QUFFTCxXQUFLLFVBQVUsYUFBYSxVQUFVLEVBQUU7QUFBQSxJQUMxQztBQUFBLEVBQ0Y7QUFBQSxFQUVRLGlCQUE4QjtBQUNwQyxVQUFNLE1BQU0sVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDL0MsUUFBSSxVQUFVLEVBQUUsS0FBSyxtQkFBbUIsQ0FBQztBQUN6QyxRQUFJLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixNQUFNLHFEQUFrQixDQUFDO0FBQ3RFLFFBQUksVUFBVTtBQUFBLE1BQ1osS0FBSztBQUFBLE1BQ0wsTUFBTTtBQUFBLElBQ1IsQ0FBQztBQUNELFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFUSxZQUFZLFNBQThCO0FBQ2hELFVBQU0sTUFBTSxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQUMvQyxVQUFNLE9BQU8sSUFBSSxVQUFVLEVBQUUsS0FBSyxzQkFBc0IsQ0FBQztBQUN6RCxrQ0FBUSxNQUFNLGdCQUFnQjtBQUM5QixRQUFJLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixNQUFNLCtCQUFXLENBQUM7QUFDL0QsUUFBSSxVQUFVLEVBQUUsS0FBSyxzQkFBc0IsTUFBTSxRQUFRLENBQUM7QUFDMUQsVUFBTSxRQUFRLElBQUksU0FBUyxVQUFVLEVBQUUsS0FBSyxzQkFBc0IsTUFBTSxlQUFLLENBQUM7QUFDOUUsVUFBTSxVQUFVLE1BQU07QUFDcEIsV0FBSyxLQUFLLE9BQU8sTUFBTSxFQUFFLEtBQUssTUFBTSxLQUFLLFFBQVEsQ0FBQztBQUFBLElBQ3BEO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLGdCQUE2QjtBQUNuQyxVQUFNLE1BQU0sVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDL0MsVUFBTSxPQUFPLElBQUksVUFBVSxFQUFFLEtBQUssc0JBQXNCLENBQUM7QUFDekQsa0NBQVEsTUFBTSxRQUFRO0FBQ3RCLFFBQUksVUFBVSxFQUFFLEtBQUssd0JBQXdCLE1BQU0seUJBQVUsQ0FBQztBQUM5RCxRQUFJLFVBQVUsRUFBRSxLQUFLLHNCQUFzQixNQUFNLDZGQUFpQyxDQUFDO0FBQ25GLFVBQU0sUUFBUSxJQUFJLFNBQVMsVUFBVSxFQUFFLEtBQUssOEJBQThCLE1BQU0sbUJBQVMsQ0FBQztBQUMxRixVQUFNLFVBQVUsTUFBTTtBQUNwQixXQUFLLEtBQUssT0FBTyxNQUFNLEVBQUUsS0FBSyxNQUFNLEtBQUssUUFBUSxDQUFDO0FBQUEsSUFDcEQ7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRVEsU0FBZTtBQUNyQixRQUFJLEtBQUssWUFBWSxLQUFLLFlBQVksV0FBVztBQUMvQyxXQUFLLFNBQVMsTUFBTSxLQUFLLE9BQU87QUFBQSxJQUNsQztBQUFBLEVBQ0Y7QUFDRjs7O0FDeE1BLElBQUFDLE1BQW9CO0FBQ3BCLElBQUFDLE1BQW9CO0FBQ3BCLElBQUFDLFFBQXNCO0FBR2YsU0FBUyx5QkFBaUM7QUFDL0MsU0FBWSxXQUFRLFlBQVEsR0FBRyxRQUFRLG9CQUFvQjtBQUM3RDtBQWFPLFNBQVMsd0JBQXdCLE1BQWMsV0FBeUI7QUFDN0UsTUFBSTtBQUNGLFVBQU0sT0FBTyx1QkFBdUI7QUFDcEMsSUFBRyxjQUFlLGNBQVEsSUFBSSxHQUFHLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDcEQsVUFBTSxVQUE4QixFQUFFLE1BQU0sTUFBTSxXQUFXLFdBQVcsS0FBSyxJQUFJLEVBQUU7QUFDbkYsVUFBTSxNQUFNLEdBQUcsSUFBSTtBQUNuQixJQUFHLGtCQUFjLEtBQUssS0FBSyxVQUFVLFNBQVMsTUFBTSxDQUFDLENBQUM7QUFDdEQsSUFBRyxlQUFXLEtBQUssSUFBSTtBQUFBLEVBQ3pCLFNBQVMsS0FBSztBQUNaLFlBQVEsS0FBSyxrRUFBb0MsR0FBRztBQUFBLEVBQ3REO0FBQ0Y7QUFHTyxTQUFTLGlCQUFpQixLQUVTO0FBQ3hDLE1BQUk7QUFHRixVQUFNLE9BQVEsSUFBSSxNQUFNLFFBQTJDLGNBQWM7QUFDakYsUUFBSSxDQUFDLEtBQU0sUUFBTztBQUNsQixXQUFPLEVBQUUsTUFBTSxJQUFJLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSztBQUFBLEVBQ2pELFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGOzs7QUpoQ08sU0FBUyxlQUFlLEdBQXFELFdBQXVDO0FBQ3pILFFBQU0sT0FBVSxZQUFRO0FBQ3hCLE1BQUksRUFBRSxnQkFBZ0IsVUFBVTtBQUM5QixXQUFPLEVBQUUsUUFBUSxLQUFLLEtBQVUsV0FBSyxNQUFNLE1BQU07QUFBQSxFQUNuRDtBQUNBLE1BQUksRUFBRSxnQkFBZ0IsYUFBYTtBQUNqQyxVQUFNLE9BQU8sWUFBWSxHQUFHLGNBQWMsU0FBUyxDQUFDLElBQUksV0FBVyxTQUFTLENBQUMsS0FBSztBQUNsRixXQUFZLFdBQUssTUFBTSxRQUFRLFVBQVUsSUFBSTtBQUFBLEVBQy9DO0FBQ0EsU0FBWSxXQUFLLE1BQU0sTUFBTTtBQUMvQjtBQVNPLFNBQVMsWUFBWSxHQUFrRCxXQUF1QztBQUNuSCxNQUFJLEVBQUUsZ0JBQWdCLGVBQWUsV0FBVztBQUM5QyxVQUFNLFNBQVMsU0FBUyxXQUFXLFNBQVMsR0FBRyxFQUFFLElBQUk7QUFDckQsV0FBTyxFQUFFLE9BQU87QUFBQSxFQUNsQjtBQUNBLFNBQU8sRUFBRTtBQUNYO0FBRUEsSUFBcUIsZ0JBQXJCLGNBQTJDLHdCQUFPO0FBQUEsRUFDaEQsV0FBNEI7QUFBQSxFQUNwQixPQUE0QjtBQUFBLEVBQzVCLFNBQXVCLEVBQUUsTUFBTSxVQUFVO0FBQUEsRUFDekMsV0FBVztBQUFBLEVBQ1gsY0FBa0M7QUFBQSxFQUNsQyxrQkFBa0Isb0JBQUksSUFBZ0I7QUFBQTtBQUFBLEVBRXRDLGNBQW9EO0FBQUE7QUFBQSxFQUk1RCxNQUFlLFNBQXdCO0FBQ3JDLFVBQU0sS0FBSyxhQUFhO0FBRXhCLFNBQUssYUFBYSxtQkFBbUIsQ0FBQyxTQUFTLElBQUksV0FBVyxNQUFNLElBQUksQ0FBQztBQUt6RSxTQUFLLDBCQUEwQjtBQUMvQixVQUFNLGdCQUFnQixNQUFNLEtBQUssMEJBQTBCO0FBQzNELFdBQU8saUJBQWlCLFNBQVMsYUFBYTtBQUM5QyxTQUFLLFNBQVMsTUFBTSxPQUFPLG9CQUFvQixTQUFTLGFBQWEsQ0FBQztBQUd0RSxTQUFLLGNBQWMsS0FBSyxJQUFJLFVBQVUsR0FBRyxzQkFBc0IsTUFBTSxLQUFLLDBCQUEwQixDQUFDLENBQUM7QUFFdEcsU0FBSyxjQUFjLE9BQU8sMENBQWlCLE1BQU0sS0FBSyxLQUFLLFVBQVUsQ0FBQztBQUN0RSxTQUFLLFdBQVc7QUFBQSxNQUNkLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFVBQVUsTUFBTSxLQUFLLEtBQUssVUFBVTtBQUFBLElBQ3RDLENBQUM7QUFDRCxTQUFLLFdBQVc7QUFBQSxNQUNkLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFVBQVUsTUFBTSxLQUFLLEtBQUssTUFBTTtBQUFBLElBQ2xDLENBQUM7QUFDRCxTQUFLLFdBQVc7QUFBQSxNQUNkLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFVBQVUsTUFBTSxLQUFLLEtBQUssS0FBSztBQUFBLElBQ2pDLENBQUM7QUFDRCxTQUFLLFdBQVc7QUFBQSxNQUNkLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFVBQVUsTUFBTSxLQUFLLEtBQUssY0FBYztBQUFBLElBQzFDLENBQUM7QUFFRCxTQUFLLGNBQWMsS0FBSyxpQkFBaUI7QUFDekMsU0FBSyxnQkFBZ0I7QUFDckIsU0FBSyxjQUFjLElBQUksbUJBQW1CLEtBQUssS0FBSyxJQUFJLENBQUM7QUFFekQsUUFBSSxLQUFLLFNBQVMsV0FBVztBQUMzQixXQUFLLEtBQUssTUFBTTtBQUFBLElBQ2xCLE9BQU87QUFDTCxXQUFLLFVBQVUsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUFBLElBQ3BDO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBZSxXQUEwQjtBQUN2QyxVQUFNLEtBQUssS0FBSztBQUNoQixTQUFLLGdCQUFnQixNQUFNO0FBQUEsRUFDN0I7QUFBQTtBQUFBLEVBSUEsWUFBMEI7QUFDeEIsV0FBTyxLQUFLO0FBQUEsRUFDZDtBQUFBLEVBRUEsSUFBSSxZQUFpQztBQUNuQyxXQUFPLEtBQUs7QUFBQSxFQUNkO0FBQUEsRUFFQSxJQUFJLFVBQWtCO0FBQ3BCLFVBQU0sWUFBWSxLQUFLLFVBQVU7QUFDakMsVUFBTSxPQUFPLFlBQVksS0FBSyxVQUFVLFNBQVM7QUFDakQsV0FBTyxVQUFVLEtBQUssU0FBUyxJQUFJLElBQUksSUFBSTtBQUFBLEVBQzdDO0FBQUE7QUFBQSxFQUdRLFlBQWdDO0FBQ3RDLFdBQVEsS0FBSyxJQUFJLE1BQU0sUUFBMkMsY0FBYztBQUFBLEVBQ2xGO0FBQUEsRUFFQSxlQUFlLElBQTRCO0FBQ3pDLFNBQUssZ0JBQWdCLElBQUksRUFBRTtBQUMzQixXQUFPLE1BQU0sS0FBSyxnQkFBZ0IsT0FBTyxFQUFFO0FBQUEsRUFDN0M7QUFBQSxFQUVRLFVBQVUsUUFBNEI7QUFDNUMsU0FBSyxTQUFTO0FBQ2QsU0FBSyxnQkFBZ0I7QUFDckIsZUFBVyxNQUFNLEtBQUssaUJBQWlCO0FBQ3JDLFVBQUk7QUFDRixXQUFHO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFFUjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFFUSxrQkFBd0I7QUFDOUIsUUFBSSxDQUFDLEtBQUssWUFBYTtBQUN2QixVQUFNLElBQUksS0FBSztBQUNmLFFBQUksRUFBRSxTQUFTLFdBQVc7QUFDeEIsV0FBSyxZQUFZLFFBQVEsUUFBUSxFQUFFLElBQUksR0FBRyxFQUFFLFdBQVcscURBQWEsRUFBRSxFQUFFO0FBQ3hFLFdBQUssWUFBWSxTQUFTLFlBQVk7QUFDdEMsV0FBSyxZQUFZLFlBQVksWUFBWTtBQUFBLElBQzNDLFdBQVcsRUFBRSxTQUFTLFNBQVM7QUFDN0IsV0FBSyxZQUFZLFFBQVEsK0JBQVc7QUFDcEMsV0FBSyxZQUFZLFlBQVksWUFBWTtBQUN6QyxXQUFLLFlBQVksU0FBUyxZQUFZO0FBQUEsSUFDeEMsV0FBVyxFQUFFLFNBQVMsWUFBWTtBQUNoQyxXQUFLLFlBQVksUUFBUSwrQkFBVztBQUNwQyxXQUFLLFlBQVksWUFBWSxZQUFZO0FBQ3pDLFdBQUssWUFBWSxTQUFTLFlBQVk7QUFBQSxJQUN4QyxPQUFPO0FBQ0wsV0FBSyxZQUFZLFFBQVEseUJBQVU7QUFDbkMsV0FBSyxZQUFZLFlBQVksWUFBWTtBQUN6QyxXQUFLLFlBQVksU0FBUyxZQUFZO0FBQUEsSUFDeEM7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBLEVBS0EsNEJBQWtDO0FBQ2hDLFFBQUksS0FBSyxZQUFhLGNBQWEsS0FBSyxXQUFXO0FBQ25ELFNBQUssY0FBYyxXQUFXLE1BQU07QUFDbEMsV0FBSyxjQUFjO0FBQ25CLFlBQU0sT0FBTyxpQkFBaUIsS0FBSyxHQUFHO0FBQ3RDLFVBQUksS0FBTSx5QkFBd0IsS0FBSyxNQUFNLEtBQUssSUFBSTtBQUFBLElBQ3hELEdBQUcsR0FBRztBQUFBLEVBQ1I7QUFBQTtBQUFBO0FBQUEsRUFLQSxNQUFNLFFBQStCO0FBQ25DLFFBQUksS0FBSyxTQUFVLFFBQU8sS0FBSztBQUMvQixRQUFJLEtBQUssT0FBTyxTQUFTLFVBQVcsUUFBTyxLQUFLO0FBQ2hELFNBQUssV0FBVztBQUNoQixTQUFLLFVBQVUsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxRQUFJO0FBQ0YsWUFBTSxZQUFZLEtBQUssVUFBVTtBQUNqQyxZQUFNLFVBQVUsZUFBZSxLQUFLLFVBQVUsU0FBUztBQUN2RCxZQUFNLE9BQU8sWUFBWSxLQUFLLFVBQVUsU0FBUztBQUNqRCxZQUFNLFlBQVksaUJBQWlCLEtBQUssR0FBRztBQUMzQyxZQUFNLFNBQVMsTUFBTSxpQkFBaUI7QUFBQSxRQUNwQyxRQUFRLEtBQUssU0FBUztBQUFBLFFBQ3RCLFNBQVMsS0FBSyxTQUFTO0FBQUEsUUFDdkI7QUFBQSxRQUNBLE1BQU0sS0FBSyxTQUFTO0FBQUEsUUFDcEI7QUFBQSxRQUNBLGlCQUFpQixLQUFLLFNBQVM7QUFBQTtBQUFBO0FBQUEsUUFHL0IsS0FBSztBQUFBO0FBQUE7QUFBQSxRQUdMLEtBQUssWUFDRDtBQUFBLFVBQ0UseUJBQXlCLFVBQVU7QUFBQSxVQUNuQyx5QkFBeUIsVUFBVTtBQUFBLFFBQ3JDLElBQ0EsQ0FBQztBQUFBLE1BQ1AsQ0FBQztBQUNELFdBQUssT0FBTyxPQUFPLFFBQVE7QUFDM0IsVUFBSSxPQUFPLE9BQU8sU0FBUyxhQUFhLE9BQU8sTUFBTTtBQUNuRCxhQUFLLGNBQWMsT0FBTyxJQUFJO0FBQUEsTUFDaEM7QUFDQSxXQUFLLFVBQVUsT0FBTyxNQUFNO0FBQzVCLFVBQUksT0FBTyxPQUFPLFNBQVMsU0FBUztBQUNsQyxZQUFJLHdCQUFPLGlDQUFhLE9BQU8sT0FBTyxPQUFPLEVBQUU7QUFBQSxNQUNqRCxXQUFXLE9BQU8sT0FBTyxTQUFTLGFBQWEsQ0FBQyxPQUFPLE9BQU8sVUFBVTtBQUN0RSxZQUFJLHdCQUFPLCtCQUFnQixPQUFPLE9BQU8sR0FBRyxFQUFFO0FBQUEsTUFDaEQ7QUFBQSxJQUNGLFNBQVMsS0FBSztBQUNaLFlBQU0sTUFBTSxlQUFlLFFBQVEsSUFBSSxVQUFVLE9BQU8sR0FBRztBQUMzRCxXQUFLLFVBQVUsRUFBRSxNQUFNLFNBQVMsU0FBUyxJQUFJLENBQUM7QUFDOUMsVUFBSSx3QkFBTyxpQ0FBYSxHQUFHLEVBQUU7QUFBQSxJQUMvQixVQUFFO0FBQ0EsV0FBSyxXQUFXO0FBQUEsSUFDbEI7QUFDQSxXQUFPLEtBQUs7QUFBQSxFQUNkO0FBQUEsRUFFQSxNQUFNLE9BQXNCO0FBQzFCLFNBQUssV0FBVztBQUNoQixRQUFJLEtBQUssTUFBTTtBQUNiLFlBQU0sWUFBWSxLQUFLLElBQUk7QUFDM0IsV0FBSyxPQUFPO0FBQUEsSUFDZDtBQUNBLFNBQUssVUFBVSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQUEsRUFDcEM7QUFBQSxFQUVRLGNBQWMsTUFBMEI7QUFDOUMsU0FBSyxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQWMsUUFBUSxLQUFLLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDcEYsU0FBSyxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQWMsUUFBUSxLQUFLLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDcEYsU0FBSyxLQUFLLFFBQVEsQ0FBQyxNQUFNLFdBQVc7QUFDbEMsVUFBSSxLQUFLLFNBQVMsTUFBTTtBQUN0QixhQUFLLE9BQU87QUFDWixZQUFJLEtBQUssT0FBTyxTQUFTLGFBQWEsQ0FBQyxLQUFLLE9BQU8sVUFBVTtBQUMzRCxlQUFLLFVBQVUsRUFBRSxNQUFNLFNBQVMsU0FBUyxzQ0FBa0IsSUFBSSxXQUFXLFVBQVUsRUFBRSxHQUFHLENBQUM7QUFBQSxRQUM1RjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFDRCxTQUFLLEtBQUssU0FBUyxDQUFDLFFBQVE7QUFDMUIsY0FBUSxNQUFNLDZDQUFvQixHQUFHO0FBQ3JDLFVBQUksS0FBSyxTQUFTLE1BQU07QUFDdEIsYUFBSyxPQUFPO0FBQ1osYUFBSyxVQUFVLEVBQUUsTUFBTSxTQUFTLFNBQVMsbUNBQVUsSUFBSSxPQUFPLEdBQUcsQ0FBQztBQUFBLE1BQ3BFO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBO0FBQUEsRUFHQSxhQUFpRjtBQUMvRSxVQUFNLFFBQVEsY0FBYyxLQUFLLFNBQVMsTUFBTTtBQUNoRCxVQUFNLE9BQU8sZUFBZSxLQUFLLFNBQVMsU0FBUyxvQkFBb0IsR0FBRyxLQUFLLFNBQVMsZUFBZTtBQUN2RyxXQUFPO0FBQUEsTUFDTCxRQUFRLE1BQU07QUFBQSxNQUNkLFVBQVUsTUFBTTtBQUFBLE1BQ2hCLFdBQVcsS0FBSztBQUFBLElBQ2xCO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxtQkFBMkI7QUFDekIsV0FBTyxlQUFlLEtBQUssVUFBVSxLQUFLLFVBQVUsQ0FBQztBQUFBLEVBQ3ZEO0FBQUE7QUFBQSxFQUdBLGdCQUF3QjtBQUN0QixXQUFPLFlBQVksS0FBSyxVQUFVLEtBQUssVUFBVSxDQUFDO0FBQUEsRUFDcEQ7QUFBQSxFQUVBLE1BQWMsZUFBOEI7QUFDMUMsVUFBTSxPQUFPLE1BQU0sS0FBSyxTQUFTO0FBQ2pDLFNBQUssV0FBVyxPQUFPLE9BQU8sQ0FBQyxHQUFHLGtCQUFrQixRQUFRLENBQUMsQ0FBQztBQUU5RCxVQUFNLFNBQVM7QUFDZixRQUFJLFFBQVEsV0FBVyxPQUFPLE9BQU8sWUFBWSxZQUFZLE9BQU8sUUFBUSxLQUFLLEdBQUc7QUFDbEYsV0FBSyxTQUFTLGNBQWM7QUFDNUIsV0FBSyxTQUFTLFVBQVUsT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQTtBQUFBLEVBSUEsTUFBTSxZQUEyQjtBQUMvQixVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsVUFBTSxTQUFTLFVBQVUsZ0JBQWdCLGlCQUFpQjtBQUMxRCxRQUFJLE9BQTZCLE9BQU8sQ0FBQyxLQUFLO0FBQzlDLFFBQUksQ0FBQyxNQUFNO0FBQ1QsYUFBTyxVQUFVLGFBQWEsS0FBSztBQUNuQyxVQUFJLENBQUMsS0FBTTtBQUNYLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRTtBQUNBLGNBQVUsY0FBYyxJQUFJO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sZ0JBQStCO0FBQ25DLFVBQU0sRUFBRSxNQUFNLElBQUksUUFBUSxVQUFVO0FBQ3BDLFVBQU0sTUFBTSxhQUFhLEtBQUssT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLE1BQU0sYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sT0FBTyxLQUFLLElBQUksVUFBVSxlQUFlO0FBQy9DLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRSxTQUFTLEtBQUs7QUFDWixZQUFNLE1BQU0sZUFBZSxRQUFRLElBQUksVUFBVSxPQUFPLEdBQUc7QUFDM0QsVUFBSSx3QkFBTyxxREFBYSxHQUFHLEVBQUU7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIm9zIiwgInBhdGgiLCAiZW1iZWRkZWROb2RlVmVyc2lvbiIsICJyZXNvbHZlIiwgImltcG9ydF9vYnNpZGlhbiIsICJmcyIsICJvcyIsICJwYXRoIl0KfQo=
