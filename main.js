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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSB7IENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7XG4gIGVtYmVkZGVkTm9kZVZlcnNpb24sXG4gIGVuc3VyZURzaFJ1bm5pbmcsXG4gIHJlc29sdmVEc2hCaW4sXG4gIHJlc29sdmVOb2RlQmluLFxuICBzYWZlVmF1bHROYW1lLFxuICBzdGFibGVIYXNoLFxuICBzdG9wUHJvY2VzcyxcbiAgdHlwZSBTZXJ2ZXJTdGF0dXMsXG59IGZyb20gJy4vbGF1bmNoZXInXG5pbXBvcnQgeyBEc2hEb2NrU2V0dGluZ3NUYWIsIERFRkFVTFRfU0VUVElOR1MsIHR5cGUgRHNoRG9ja1NldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncydcbmltcG9ydCB7IERzaFdlYlZpZXcsIERTSF9XRUJfVklFV19UWVBFIH0gZnJvbSAnLi92aWV3J1xuaW1wb3J0IHsgY3VycmVudFZhdWx0SW5mbywgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIgfSBmcm9tICcuL2N1cnJlbnRWYXVsdCdcblxuLyoqXG4gKiBcdThCQTFcdTdCOTcgRFNIX0hPTUVcdUZGMUFcbiAqIC0gc2hhcmVkXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFBfi8uZHNoIFx1MjAxNFx1MjAxNCBcdTRFMEVcdTVCOThcdTY1QjkgZHNoIENMSSBcdTVCOENcdTUxNjhcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTVERjJcdTY3MDlcdTkxNERcdTdGNkUvXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURzaEhvbWUoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAnZHNoSG9tZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKClcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgcmV0dXJuIHMuZHNoSG9tZS50cmltKCkgfHwgcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbiAgfVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcpIHtcbiAgICBjb25zdCBuYW1lID0gdmF1bHRSb290ID8gYCR7c2FmZVZhdWx0TmFtZSh2YXVsdFJvb3QpfS0ke3N0YWJsZUhhc2godmF1bHRSb290KX1gIDogJ3ZhdWx0J1xuICAgIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnLCAndmF1bHRzJywgbmFtZSlcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbn1cblxuLyoqXG4gKiBcdThCQTFcdTdCOTdcdTY3MkMgdmF1bHQgXHU3Njg0XHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHUzMDAyXG4gKiAtIHNoYXJlZCAvIGN1c3RvbVx1RkYxQXNldHRpbmdzLnBvcnRcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOVx1MjAxNFx1MjAxNCBcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU1NDBDXHU0RTAwXHU2NzBEXHU1MkExXHU0RTBFXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQXNldHRpbmdzLnBvcnQgKyAoc3RhYmxlSGFzaCAlIDQwOTYpIFx1MjAxNFx1MjAxNCBcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3MkVDXHU1MzYwXHU3QUVGXHU1M0UzXHVGRjBDXHU1NDA0XHU4MUVBXG4gKiAgIHNwYXduIFx1NzJFQ1x1N0FDQlx1NzY4NCBkc2ggXHU4RkRCXHU3QTBCXHVGRjFCXHU5MTREXHU1NDA4XHU3MkVDXHU3QUNCXHU3Njg0IERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREXHU1QjU4XHU1MEE4XHU2ODM5XHVGRjA5XHVGRjBDXHU0RTBEXHU1NDBDIHZhdWx0IFx1NzY4NFxuICogICBcdTRGMUFcdThCRERcdTVCOENcdTUxNjhcdTk2OTRcdTc5QkJcdUZGMENcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdTMwMDJcdTdBRUZcdTUzRTNcdTUxQjJcdTdBODFcdTY5ODJcdTczODcgfjEvNDA5Nlx1RkYwQ1x1NTNFRlx1NjNBNVx1NTNEN1x1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVBvcnQoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAncG9ydCc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludChzdGFibGVIYXNoKHZhdWx0Um9vdCksIDM2KSAlIDQwOTZcbiAgICByZXR1cm4gcy5wb3J0ICsgb2Zmc2V0XG4gIH1cbiAgcmV0dXJuIHMucG9ydFxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEc2hEb2NrUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IERzaERvY2tTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1NcbiAgcHJpdmF0ZSBwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1czogU2VydmVyU3RhdHVzID0geyBraW5kOiAnc3RvcHBlZCcgfVxuICBwcml2YXRlIHN0YXJ0aW5nID0gZmFsc2VcbiAgcHJpdmF0ZSBzdGF0dXNCYXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1c0xpc3RlbmVycyA9IG5ldyBTZXQ8KCkgPT4gdm9pZD4oKVxuICAvKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTk5XHU1MTY1XHU5NjMyXHU2Mjk2IHRpbWVyXHVGRjA4XHU3QTk3XHU1M0UzIGZvY3VzIFx1NTNFRlx1ODBGRFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1RkYwOSAqL1xuICBwcml2YXRlIG1hcmtlclRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsXG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlxuXG4gIG92ZXJyaWRlIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpXG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhEU0hfV0VCX1ZJRVdfVFlQRSwgKGxlYWYpID0+IG5ldyBEc2hXZWJWaWV3KGxlYWYsIHRoaXMpKVxuXG4gICAgLy8gXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHRcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHVGRjFBXHU2NzJDXHU3QTk3XHU1M0UzXHU2MjUzXHU1RjAwXHVGRjA4b25sb2FkXHVGRjA5XHU0RTBFXHU2QkNGXHU2QjIxXHU4M0I3XHU1Rjk3XG4gICAgLy8gXHU3MTI2XHU3MEI5XHU2NUY2XHU1MjM3XHU2NUIwXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHUzMDAyXHU1OTFBXHU3QTk3XHU1M0UzXHU1NzNBXHU2NjZGXHU0RTBCXHU2QkNGXHU0RTJBXHU3QTk3XHU1M0UzXHU5MEZEXHU3MkVDXHU3QUNCXHU1MkEwXHU4RjdEXHU2NzJDXHU2M0QyXHU0RUY2XHVGRjBDXHU2NzAwXHU1NDBFXHU4M0I3XHU1Rjk3XG4gICAgLy8gXHU3MTI2XHU3MEI5XHU3Njg0XHU3QTk3XHU1M0UzXHU1MTk5XHU1MTY1XHVGRjBDXHU1MzczXCJcdTc1MjhcdTYyMzdcdTVGNTNcdTUyNERcdTZCNjNcdTU3MjhcdTc3MEJcdTc2ODQgdmF1bHRcIlx1MzAwMlxuICAgIHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gICAgY29uc3Qgb25XaW5kb3dGb2N1cyA9ICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25XaW5kb3dGb2N1cylcbiAgICB0aGlzLnJlZ2lzdGVyKCgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uV2luZG93Rm9jdXMpKVxuICAgIC8vIFx1ODg2NVx1NTE0NVx1NEZFMVx1NTNGN1x1RkYxQVx1NzUyOFx1NjIzN1x1NTcyOFx1N0E5N1x1NTNFM1x1NTE4NVx1NTIwN1x1NjM2Mlx1NjU4N1x1NEVGNi9cdTVFMDNcdTVDNDBcdTVGQzVcdTcxMzZcdTg5RTZcdTUzRDEgYWN0aXZlLWxlYWYtY2hhbmdlXHVGRjBDXG4gICAgLy8gXHU4OTg2XHU3NkQ2IHdpbmRvdyBmb2N1cyBcdTRFOEJcdTRFRjZcdTRFMERcdTZEM0VcdTUzRDFcdTc2ODRcdTU3M0FcdTY2NkZcdTMwMDJcdTk2MzJcdTYyOTZcdTUxNzFcdTc1MjhcdTRFMDBcdTRFMkEgdGltZXJcdUZGMENcdTRFOTJcdTRFMERcdTVFNzJcdTYyNzBcdTMwMDJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKCdhY3RpdmUtbGVhZi1jaGFuZ2UnLCAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKSkpXG5cbiAgICB0aGlzLmFkZFJpYmJvbkljb24oJ2JvdCcsICdEU0ggRG9ja1x1RkYxQVx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicsICgpID0+IHZvaWQgdGhpcy5vcGVuUGFuZWwoKSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1wYW5lbCcsXG4gICAgICBuYW1lOiAnXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0YnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuUGFuZWwoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N0YXJ0LWRzaCcsXG4gICAgICBuYW1lOiAnXHU1NDJGXHU1MkE4IERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdGFydCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RvcC1kc2gnLFxuICAgICAgbmFtZTogJ1x1NTA1Q1x1NkI2MiBEU0ggXHU2NzBEXHU1MkExJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc3RvcCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1kc2gtYnJvd3NlcicsXG4gICAgICBuYW1lOiAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwIERTSCcsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5JbkJyb3dzZXIoKSxcbiAgICB9KVxuXG4gICAgdGhpcy5zdGF0dXNCYXJFbCA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRHNoRG9ja1NldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSlcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9zdGFydCkge1xuICAgICAgdm9pZCB0aGlzLnN0YXJ0KClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbnVubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnN0b3AoKVxuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmNsZWFyKClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDkgKi9cbiAgcHJpdmF0ZSB2YXVsdFJvb3QoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgfVxuXG4gIG9uU3RhdHVzQ2hhbmdlKGZuOiAoKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuYWRkKGZuKVxuICAgIHJldHVybiAoKSA9PiB0aGlzLnN0YXR1c0xpc3RlbmVycy5kZWxldGUoZm4pXG4gIH1cblxuICBwcml2YXRlIHNldFN0YXR1cyhzdGF0dXM6IFNlcnZlclN0YXR1cyk6IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIGZvciAoY29uc3QgZm4gb2YgdGhpcy5zdGF0dXNMaXN0ZW5lcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZuKClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXR1c0JhcigpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc3RhdHVzQmFyRWwpIHJldHVyblxuICAgIGNvbnN0IHMgPSB0aGlzLnN0YXR1c1xuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KGBEU0g6ICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICdcdUZGMDhcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMDknIDogJyd9YClcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNicpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU2NzJBXHU4RkQwXHU4ODRDJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcblxuICAvKiogXHU4QkZCXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgY2xlYXJUaW1lb3V0KHRoaXMubWFya2VyVGltZXIpXG4gICAgdGhpcy5tYXJrZXJUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5tYXJrZXJUaW1lciA9IG51bGxcbiAgICAgIGNvbnN0IGluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgaWYgKGluZm8pIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKGluZm8ubmFtZSwgaW5mby5wYXRoKVxuICAgIH0sIDMwMClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcblxuICAvKiogXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTYzMDJcdTYzQTVcdUZGMUJcdTU0MjZcdTUyMTkgc3Bhd24gXHU1Qjk4XHU2NUI5IGRzaCB3ZWIgKi9cbiAgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTxTZXJ2ZXJTdGF0dXM+IHtcbiAgICBpZiAodGhpcy5zdGFydGluZykgcmV0dXJuIHRoaXMuc3RhdHVzXG4gICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJykgcmV0dXJuIHRoaXMuc3RhdHVzXG4gICAgdGhpcy5zdGFydGluZyA9IHRydWVcbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdGFydGluZycgfSlcbiAgICB0cnkge1xuICAgICAgY29uc3QgdmF1bHRSb290ID0gdGhpcy52YXVsdFJvb3QoKVxuICAgICAgY29uc3QgZHNoSG9tZSA9IGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHBvcnQgPSBjb21wdXRlUG9ydCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgaG9zdDogdGhpcy5zZXR0aW5ncy5ob3N0LFxuICAgICAgICBkc2hIb21lLFxuICAgICAgICB1c2VFbWJlZGRlZE5vZGU6IHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlLFxuICAgICAgICAvLyBcdTU0MkZcdTUyQThcdTY1RjZcdTYyOEFcdTVGNTNcdTUyNEQgdmF1bHQgXHU0RTAwXHU1RTc2XHU2Q0U4XHU1MTY1XHU1QjUwXHU4RkRCXHU3QTBCIGVudlx1RkYwQ1x1NEY1Q1x1NEUzQVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NEU0Qlx1NTkxNlx1NzY4NFx1N0IyQ1x1NEU4Q1x1OTAxQVx1OTA1M1xuICAgICAgICAvLyBcdUZGMDhcdTY3MERcdTUyQTFcdTUyMUFcdTYyQzlcdThENzdcdTMwMDFcdTY4MDdcdThCQjBcdTVDMUFcdTY3MkFcdTUyMzdcdTY1QjBcdTY1RjZcdTUxNUNcdTVFOTVcdUZGMDlcdTMwMDJcbiAgICAgICAgZW52OiB2YXVsdEluZm9cbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgRFNIX09CU0lESUFOX1ZBVUxUX05BTUU6IHZhdWx0SW5mby5uYW1lLFxuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfUEFUSDogdmF1bHRJbmZvLnBhdGgsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiB7fSxcbiAgICAgIH0pXG4gICAgICB0aGlzLnByb2MgPSByZXN1bHQucHJvYyA/PyBudWxsXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgcmVzdWx0LnByb2MpIHtcbiAgICAgICAgdGhpcy5ob29rQ2hpbGRMb2dzKHJlc3VsdC5wcm9jKVxuICAgICAgfVxuICAgICAgdGhpcy5zZXRTdGF0dXMocmVzdWx0LnN0YXR1cylcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtyZXN1bHQuc3RhdHVzLm1lc3NhZ2V9YClcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgIXJlc3VsdC5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFdlYiBcdTVERjJcdTVDMzFcdTdFRUE6ICR7cmVzdWx0LnN0YXR1cy51cmx9YClcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBtc2cgfSlcbiAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTVGMDJcdTVFMzg6ICR7bXNnfWApXG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgaWYgKHRoaXMucHJvYykge1xuICAgICAgYXdhaXQgc3RvcFByb2Nlc3ModGhpcy5wcm9jKVxuICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgIH1cbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICB9XG5cbiAgcHJpdmF0ZSBob29rQ2hpbGRMb2dzKHByb2M6IENoaWxkUHJvY2Vzcyk6IHZvaWQge1xuICAgIHByb2Muc3Rkb3V0Py5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUuaW5mbygnW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLnN0ZGVycj8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiBjb25zb2xlLndhcm4oJ1tkc2hdJywgZC50b1N0cmluZygpLnRyaW1FbmQoKSkpXG4gICAgcHJvYy5vbmNlKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIGlmICh0aGlzLnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgIXRoaXMuc3RhdHVzLmF0dGFjaGVkKSB7XG4gICAgICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBgRFNIIFx1OEZEQlx1N0EwQlx1OTAwMFx1NTFGQTogY29kZT0ke2NvZGV9IHNpZ25hbD0ke3NpZ25hbCA/PyAnJ31gIH0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIHByb2Mub25jZSgnZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbZHNoLWRvY2tdIFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRicsIGVycilcbiAgICAgIGlmICh0aGlzLnByb2MgPT09IHByb2MpIHtcbiAgICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBcdTVCNTBcdThGREJcdTdBMEJcdTk1MTlcdThCRUY6ICR7ZXJyLm1lc3NhZ2V9YCB9KVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKiogXHU2M0EyXHU2RDRCXHU0RkUxXHU2MDZGXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGRldGVjdEluZm8oKTogeyBkc2hCaW46IHN0cmluZyB8IG51bGw7IGRzaE5vdGVzOiBzdHJpbmdbXTsgbm9kZU5vdGVzOiBzdHJpbmdbXSB9IHtcbiAgICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4odGhpcy5zZXR0aW5ncy5kc2hCaW4pXG4gICAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKHRoaXMuc2V0dGluZ3Mubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCB0aGlzLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSlcbiAgICByZXR1cm4ge1xuICAgICAgZHNoQmluOiBmb3VuZC5iaW4sXG4gICAgICBkc2hOb3RlczogZm91bmQubm90ZXMsXG4gICAgICBub2RlTm90ZXM6IG5vZGUubm90ZXMsXG4gICAgfVxuICB9XG5cbiAgLyoqIFx1NUY1M1x1NTI0RFx1OEJCRVx1N0Y2RVx1NEUwQlx1NzUxRlx1NjU0OFx1NzY4NCBEU0hfSE9NRVx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBlZmZlY3RpdmVEc2hIb21lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0XHU3QUVGXHU1M0UzXHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NkJDRiB2YXVsdCBcdTcyRUNcdTdBQ0JcdUZGMDkgKi9cbiAgZWZmZWN0aXZlUG9ydCgpOiBudW1iZXIge1xuICAgIHJldHVybiBjb21wdXRlUG9ydCh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMubG9hZERhdGEoKVxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBkYXRhID8/IHt9KVxuICAgIC8vIFx1NjVFN1x1NzI0OFx1RkYwOGRzaC1ob3N0IFYwLjFcdUZGMDlcdThCQkVcdTdGNkVcdThGQzFcdTc5RkJcdUZGMUFkc2hIb21lIFx1NUI1N1x1N0IyNlx1NEUzMiBcdTIxOTIgY3VzdG9tIFx1NkEyMVx1NUYwRlxuICAgIGNvbnN0IGxlZ2FjeSA9IGRhdGEgYXMgeyBkc2hIb21lPzogc3RyaW5nIH0gfCB1bmRlZmluZWRcbiAgICBpZiAobGVnYWN5Py5kc2hIb21lICYmIHR5cGVvZiBsZWdhY3kuZHNoSG9tZSA9PT0gJ3N0cmluZycgJiYgbGVnYWN5LmRzaEhvbWUudHJpbSgpKSB7XG4gICAgICB0aGlzLnNldHRpbmdzLmRzaEhvbWVNb2RlID0gJ2N1c3RvbSdcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZSA9IGxlZ2FjeS5kc2hIb21lLnRyaW0oKVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gVUlcblxuICBhc3luYyBvcGVuUGFuZWwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwXG4gICAgY29uc3QgbGVhdmVzID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShEU0hfV0VCX1ZJRVdfVFlQRSlcbiAgICBsZXQgbGVhZjogV29ya3NwYWNlTGVhZiB8IG51bGwgPSBsZWF2ZXNbMF0gPz8gbnVsbFxuICAgIGlmICghbGVhZikge1xuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpXG4gICAgICBpZiAoIWxlYWYpIHJldHVyblxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfVxuICAgIHdvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGxlYWYpXG4gIH1cblxuICBhc3luYyBvcGVuSW5Ccm93c2VyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgc2hlbGwgfSA9IHJlcXVpcmUoJ2VsZWN0cm9uJykgYXMgeyBzaGVsbDogeyBvcGVuRXh0ZXJuYWwodXJsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IH0gfVxuICAgIGF3YWl0IHNoZWxsLm9wZW5FeHRlcm5hbCh0aGlzLmJhc2VVcmwpXG4gIH1cblxuICAvKipcbiAgICogXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4T2JzaWRpYW4gcG9wb3V0XHVGRjA5XHVGRjFBRFNIIFx1OTc2Mlx1Njc3Rlx1OEZEQlx1NTE2NVx1NzJFQ1x1N0FDQiBCcm93c2VyV2luZG93ID1cbiAgICogXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU0RTBFIE9ic2lkaWFuIFx1NEUzQlx1N0E5N1x1NTNFM1x1OTY5NFx1NzlCQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1NjgwN1x1N0I3RVx1OTg3NVx1MzAwMlxuICAgKi9cbiAgYXN5bmMgb3BlblBvcG91dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5vcGVuUG9wb3V0TGVhZigpXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgbmV3IE5vdGljZShgXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHU1OTMxXHU4RDI1OiAke21zZ31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogbGF1bmNoZXIudHMgXHUyMDE0XHUyMDE0IFx1N0VBRlx1NTQyRlx1NTJBOFx1OTAzQlx1OEY5MVx1RkYwOFx1OTZGNiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMENcdTUzRUZcdTcyRUNcdTdBQ0JcdTUxOTJcdTcwREZcdTZENEJcdThCRDVcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTgwNENcdThEMjNcdUZGMUFcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2IFx1MjE5MiBzcGF3biBgZHNoIHdlYmBcbiAqIFx1RkYwODEyNy4wLjAuMTo8cG9ydD5cdUZGMDlcdTIxOTIgXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBIFx1MjE5MiBcdTUwNUNcdTZCNjJcdTMwMDJcbiAqXG4gKiBcdTUxNzNcdTk1MkVcdTRFOEJcdTVCOUVcdUZGMDhcdTVERjJcdTU3MjhcdTVCOThcdTY1QjkgQGRlZXBzZWVrLWFpL2RzaEAwLjEuMC1yYy42IFx1NEUwQVx1OUE4Q1x1OEJDMVx1RkYwOVx1RkYxQVxuICogLSBgbm9kZSA8ZHNoPi9saWIvYmluLmpzIHdlYiAtLWhvc3QgMTI3LjAuMC4xIC0tcG9ydCA8cG9ydD5gIFx1NTM3M1x1NUI5OFx1NjVCOSBXZWIgVUlcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0IGhvc3Q9MTI3LjAuMC4xXHUzMDAxcG9ydD0zMDgwXHVGRjA4XHU1M0VGXHU4OTg2XHU3NkQ2XHVGRjA5XHVGRjFCXG4gKiAtIFx1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1ODFFQVx1NTJBOFx1NTIxRFx1NTlDQlx1NTMxNiAkRFNIX0hPTUUvcHJvZmlsZXMvd2ViXHVGRjA4YnVuZGxlcyA9IGRzaC1iYXNlICsgZHNoLXdlYi1hcHBcdUZGMDlcdUZGMENcbiAqICAgXHU2QTIxXHU1NzU3XHU4OUUzXHU2NzkwXHU4RDcwICREU0hfSE9NRS9wcm9maWxlcy9ub2RlX21vZHVsZXMgXHU1RTczXHU5NzYyXHU3QjI2XHU1M0Y3XHU5NEZFXHU2M0E1XHVGRjBDXHU2NUUwXHU5NzAwIHBucG0vXHU4MDU0XHU3RjUxXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNFx1OTE0RFx1N0Y2RVx1NEUwQiBTUUxpdGVcdUZGMDhub2RlOnNxbGl0ZVx1RkYwQ1x1OTcwMCBOb2RlIFx1MjI2NTIyLjVcdUZGMDlcdTRFMERcdTRGMUFcdTYyNTNcdTVGMDBcdUZGMDhvcGVuQXQ6IG5ldmVyXHVGRjA5XHVGRjBDXG4gKiAgIFx1NTZFMFx1NkI2NCBOb2RlIDIwKyBcdTRFNUZcdTgwRkRcdThERDFcdTlFRDhcdThCQTQgd2ViIHByb2ZpbGVcdUZGMUJcdTU0MkZcdTc1MjhcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTY1RjZcdTYyNERcdTk3MDBcdTg5ODEgTm9kZSBcdTIyNjUyMi41XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgc3Bhd24sIHNwYXduU3luYywgdHlwZSBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IERTSF9SRUxBVElWRV9CSU4gPSBwYXRoLmpvaW4oJ0BkZWVwc2Vlay1haScsICdkc2gnLCAnbGliJywgJ2Jpbi5qcycpXG5cbi8qKiBOb2RlIFx1NEUzQlx1NzI0OFx1NjcyQ1x1NTNGN1x1NkJENFx1OEY4M1x1RkYxQW5vZGU6c3FsaXRlIFx1OTcwMFx1ODk4MSBcdTIyNjUyMi41XHVGRjA4XHU0RUM1XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU1MjlGXHU4MEZEXHU3NTI4XHU1MjMwXHVGRjA5ICovXG5leHBvcnQgY29uc3QgTk9ERV9TUUxJVEVfTUlOX01BSk9SID0gMjJcblxuLyoqIFx1N0EzM1x1NUI5QVx1NzdFRFx1NTRDOFx1NUUwQ1x1RkYwOGRqYjJcdUZGMDlcdUZGMENcdTc1MjhcdTRFOEUgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHU2RDg4XHU2QjY3XHVGRjBDXHU5MDdGXHU1MTREXHU0RTJEXHU2NTg3XHU1NDBEXHU2RTA1XHU2RDE3XHU3OEIwXHU2NDlFICovXG5leHBvcnQgZnVuY3Rpb24gc3RhYmxlSGFzaChpbnB1dDogc3RyaW5nLCBsZW4gPSA2KTogc3RyaW5nIHtcbiAgbGV0IGggPSA1MzgxXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIGggPSAoKGggPDwgNSkgKyBoICsgaW5wdXQuY2hhckNvZGVBdChpKSkgPj4+IDBcbiAgcmV0dXJuIGgudG9TdHJpbmcoMzYpLnBhZFN0YXJ0KGxlbiwgJzAnKS5zbGljZSgwLCBsZW4pXG59XG5cbi8qKiBcdTUzRUZcdThCRkJcdTc2ODQgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHVGRjA4XHU0RkREXHU3NTU5IFVuaWNvZGUgXHU1QjU3XHU2QkNEXHU2NTcwXHU1QjU3XHVGRjBDXHU1MTc2XHU0RjU5XHU4RjZDIC1cdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTkgJ3ZhdWx0JyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVWYXVsdE5hbWUodmF1bHRSb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjbGVhbmVkID0gcGF0aFxuICAgIC5iYXNlbmFtZSh2YXVsdFJvb3QpXG4gICAgLnJlcGxhY2UoL1teXFxwe0x9XFxwe059Xy1dKy9ndSwgJy0nKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csICcnKVxuICByZXR1cm4gKGNsZWFuZWQgfHwgJ3ZhdWx0Jykuc2xpY2UoMCwgNDApXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF1bmNoT3B0aW9ucyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMENcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW4/OiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5ICovXG4gIG5vZGVCaW4/OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ/OiBudW1iZXJcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0IDEyNy4wLjAuMVx1RkYwQ1x1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0Pzogc3RyaW5nXG4gIC8qKiAkRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCREQvXHU1QkM2XHU5NEE1L1x1NkEyMVx1NTc4Qlx1OTE0RFx1N0Y2RVx1NjgzOVx1NzZFRVx1NUY1NVx1RkYxQlx1OUVEOFx1OEJBNCA8dmF1bHQ+Ly5kc2hcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZT86IGJvb2xlYW5cbiAgLyoqIFx1NUMzMVx1N0VFQVx1N0I0OVx1NUY4NVx1NEUwQVx1OTY1MFx1RkYwOFx1OUVEOFx1OEJBNCAxMjBzXHVGRjA5ICovXG4gIHRpbWVvdXRNcz86IG51bWJlclxuICAvKiogXHU5NjQ0XHU1MkEwXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGICovXG4gIGVudj86IE5vZGVKUy5Qcm9jZXNzRW52XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWROb2RlIHtcbiAgLyoqIFx1NzUyOFx1NEU4RSBzcGF3biBcdTc2ODQgbm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU2MjhBIE9ic2lkaWFuIFx1NzY4NCBFbGVjdHJvbiBcdTRFOENcdThGREJcdTUyMzZcdTVGNTMgTm9kZSBcdTc1MjggKi9cbiAgdXNlRWxlY3Ryb25Bc05vZGU6IGJvb2xlYW5cbiAgLyoqIFx1OEJFNSBOb2RlIFx1NzY4NCBtYWpvciBcdTcyNDhcdTY3MkNcdUZGMDhcdTYzQTJcdTZENEJcdTU5MzFcdThEMjVcdTRFM0EgMFx1RkYwOSAqL1xuICBub2RlTWFqb3I6IG51bWJlclxuICAvKiogXHU2M0EyXHU2RDRCL1x1NTFCM1x1N0I1Nlx1OEJGNFx1NjYwRVx1RkYwOFx1NEY5Qlx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBub3Rlczogc3RyaW5nW11cbn1cblxuZXhwb3J0IHR5cGUgU2VydmVyU3RhdHVzID1cbiAgfCB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHwgeyBraW5kOiAnc3RhcnRpbmcnIH1cbiAgfCB7IGtpbmQ6ICdydW5uaW5nJzsgcG9ydDogbnVtYmVyOyBob3N0OiBzdHJpbmc7IHVybDogc3RyaW5nOyBhdHRhY2hlZDogYm9vbGVhbiB9XG4gIHwgeyBraW5kOiAnZXJyb3InOyBtZXNzYWdlOiBzdHJpbmcgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1OERFRlx1NUY4NFx1NUI5QVx1NEY0RFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTYyOEFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTUxNjVcdTUzRTNcdTg5QzRcdTgzMDNcdTUzMTZcdUZGMUFcdTYzMDdcdTU0MTEgYmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU5MEZEXHU2M0E1XHU1M0Q3ICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRHNoQmluKGlucHV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghaW5wdXQpIHJldHVybiBudWxsXG4gIGNvbnN0IHAgPSBpbnB1dC50cmltKClcbiAgaWYgKCFwKSByZXR1cm4gbnVsbFxuICBjb25zdCBleHBhbmRlZCA9IHAucmVwbGFjZSgvXn4oPz0kfFxcL3xcXFxcKS8sIG9zLmhvbWVkaXIoKSlcbiAgY29uc3QgYWJzID0gcGF0aC5pc0Fic29sdXRlKGV4cGFuZGVkKSA/IHBhdGgubm9ybWFsaXplKGV4cGFuZGVkKSA6IHBhdGgucmVzb2x2ZShleHBhbmRlZClcbiAgdHJ5IHtcbiAgICBjb25zdCBzdCA9IGZzLnN0YXRTeW5jKGFicylcbiAgICBpZiAoc3QuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKGFicywgJ2xpYicsICdiaW4uanMnKVxuICAgICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IG51bGxcbiAgICB9XG4gICAgaWYgKHN0LmlzRmlsZSgpKSByZXR1cm4gYWJzXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuLyoqIFx1NUUzOFx1ODlDMSBucG0gXHU1MTY4XHU1QzQwIG5vZGVfbW9kdWxlcyBcdTY4MzlcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxNb2R1bGVSb290cygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJvb3RzOiBzdHJpbmdbXSA9IFtdXG4gIGlmIChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpIHJvb3RzLnB1c2gocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKVxuICBjb25zdCBucG1Sb290ID0gc3Bhd25TeW5jKCducG0nLCBbJ3Jvb3QnLCAnLWcnXSwge1xuICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgdGltZW91dDogMTBfMDAwLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxuICBpZiAobnBtUm9vdC5zdGF0dXMgPT09IDAgJiYgbnBtUm9vdC5zdGRvdXQpIHtcbiAgICBjb25zdCBsaW5lID0gbnBtUm9vdC5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLylbMF1cbiAgICBpZiAobGluZSkgcm9vdHMucHVzaChsaW5lKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIHJvb3RzLnB1c2goJy9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICByb290cy5wdXNoKCcvdXNyL2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdsaWInLCAnbm9kZV9tb2R1bGVzJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIGNvbnN0IGFwcERhdGEgPSBwcm9jZXNzLmVudi5BUFBEQVRBXG4gICAgaWYgKGFwcERhdGEpIHJvb3RzLnB1c2gocGF0aC5qb2luKGFwcERhdGEsICducG0nLCAnbm9kZV9tb2R1bGVzJykpXG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXG4gIHJldHVybiBbLi4ubmV3IFNldChyb290cyldXG59XG5cbi8qKlxuICogXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1MTY1XHU1M0UzXHUzMDAyXHU0RjE4XHU1MTQ4XHU3RUE3XHVGRjFBXG4gKiAxLiBcdTY2M0VcdTVGMEZcdTRGMjBcdTUxNjVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdUZGMDlcdTIxOTIgMi4gXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIERTSF9CSU4gXHUyMTkyIDMuIG5wbSByb290IC1nIFx1MjE5MiA0LiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTY4MzlcdTMwMDJcbiAqIFx1NjcyQVx1NjI3RVx1NTIzMFx1NjVGNiBiaW4gXHU0RTNBIG51bGxcdUZGMENub3RlcyBcdThCRjRcdTY2MEVcdTUzOUZcdTU2RTBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEc2hCaW4oZXhwbGljaXQ/OiBzdHJpbmcpOiB7IGJpbjogc3RyaW5nIHwgbnVsbDsgbm90ZXM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IG5vcm1hbGl6ZURzaEJpbihleHBsaWNpdCA/PyBwcm9jZXNzLmVudi5EU0hfQklOKVxuICBpZiAoZXhwbGljaXRCaW4gJiYgZnMuZXhpc3RzU3luYyhleHBsaWNpdEJpbikpIHtcbiAgICByZXR1cm4geyBiaW46IGV4cGxpY2l0QmluLCBub3RlczogW2BcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEZcdThERUZcdTVGODQ6ICR7ZXhwbGljaXRCaW59YF0gfVxuICB9XG4gIGlmIChleHBsaWNpdCkgbm90ZXMucHVzaChgXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0XHU0RTBEXHU1QjU4XHU1NzI4OiAke2V4cGxpY2l0fWApXG5cbiAgZm9yIChjb25zdCByb290IG9mIGdsb2JhbE1vZHVsZVJvb3RzKCkpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4ocm9vdCwgRFNIX1JFTEFUSVZFX0JJTilcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICByZXR1cm4geyBiaW46IGNhbmRpZGF0ZSwgbm90ZXM6IFsuLi5ub3RlcywgYFx1NEVDRVx1NTE2OFx1NUM0MFx1NkEyMVx1NTc1N1x1NjgzOVx1NTNEMVx1NzNCMDogJHtjYW5kaWRhdGV9YF0gfVxuICAgIH1cbiAgfVxuICBub3Rlcy5wdXNoKCdcdTY3MkFcdTYyN0VcdTUyMzAgZHNoIFx1NUI4OVx1ODhDNVx1MzAwMlx1OEJGN1x1NTE0OFx1NjI2N1x1ODg0QzogbnBtIGluc3RhbGwgLWcgQGRlZXBzZWVrLWFpL2RzaFx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBkc2ggXHU4REVGXHU1Rjg0JylcbiAgcmV0dXJuIHsgYmluOiBudWxsLCBub3RlcyB9XG59XG5cbi8qKlxuICogXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2XHUzMDAyXG4gKiBcdTlFRDhcdThCQTRcdTk4N0FcdTVFOEZcdUZGMUFcdTY2M0VcdTVGMEZcdThERUZcdTVGODQgXHUyMTkyIFx1N0NGQlx1N0VERiBgbm9kZWBcdUZGMDhQQVRIXHVGRjBDXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyXG4gKiBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgXHU1QjlFXHU2RDRCXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjA4T2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XG4gKiBcdTRFMERcdTYzMDlcdTY2NkVcdTkwMUEgRWxlY3Ryb24gXHU4QkVEXHU0RTQ5XHU1NENEXHU1RTk0XHVGRjA5XHVGRjBDXHU1NkUwXHU2QjY0XHU0RUM1XHU1RjUzIHVzZUVtYmVkZGVkTm9kZSBcdTY2M0VcdTVGMEZcdTVGMDBcdTU0MkZcdTY1RjZcdTYyNERcdTVDMURcdThCRDVcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVOb2RlQmluKGV4cGxpY2l0Pzogc3RyaW5nLCBlbWJlZGRlZE5vZGVWZXJzaW9uPzogc3RyaW5nLCB1c2VFbWJlZGRlZCA9IGZhbHNlKTogUmVzb2x2ZWROb2RlIHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBleHBsaWNpdD8udHJpbSgpIHx8IHByb2Nlc3MuZW52LkRTSF9OT0RFXG4gIGlmIChleHBsaWNpdEJpbikge1xuICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRiBOb2RlOiAke2V4cGxpY2l0QmlufWApXG4gICAgcmV0dXJuIHsgbm9kZUJpbjogZXhwbGljaXRCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG4gIH1cbiAgaWYgKHVzZUVtYmVkZGVkICYmIHByb2Nlc3MuZXhlY1BhdGggJiYgZW1iZWRkZWROb2RlVmVyc2lvbikge1xuICAgIGNvbnN0IG1ham9yID0gTnVtYmVyKGVtYmVkZGVkTm9kZVZlcnNpb24uc3BsaXQoJy4nKVswXSkgfHwgMFxuICAgIGlmIChtYWpvciA+PSBOT0RFX1NRTElURV9NSU5fTUFKT1IpIHtcbiAgICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSAke2VtYmVkZGVkTm9kZVZlcnNpb259XHVGRjA4RUxFQ1RST05fUlVOX0FTX05PREVcdUZGMDlgKVxuICAgICAgcmV0dXJuIHsgbm9kZUJpbjogcHJvY2Vzcy5leGVjUGF0aCwgdXNlRWxlY3Ryb25Bc05vZGU6IHRydWUsIG5vZGVNYWpvcjogbWFqb3IsIG5vdGVzIH1cbiAgICB9XG4gICAgbm90ZXMucHVzaChgT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufSA8ICR7Tk9ERV9TUUxJVEVfTUlOX01BSk9SfVx1RkYwQ1x1NjVFMFx1NkNENVx1NTQyRlx1NzUyOGApXG4gIH1cbiAgbm90ZXMucHVzaCgnXHU0RjdGXHU3NTI4IFBBVEggXHU0RTJEXHU3Njg0IG5vZGVcdUZGMDhcdTdDRkJcdTdFREYgTm9kZVx1RkYwQ1x1NjcwMFx1N0EzM1x1NUI5QVx1RkYwOScpXG4gIHJldHVybiB7IG5vZGVCaW46ICdub2RlJywgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTdBRUZcdTUzRTNcdTYzQTJcdTZENEJcdTRFMEVcdTdCNDlcdTVGODVcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogXHU1RjUzXHU1MjREXHU4RkQwXHU4ODRDXHU3M0FGXHU1ODgzXHVGRjA4T2JzaWRpYW4gXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjA5XHU4MUVBXHU1RTI2XHU3Njg0IE5vZGUgXHU3MjQ4XHU2NzJDXHVGRjFCXHU2NUUwXHU1MjE5IHVuZGVmaW5lZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVtYmVkZGVkTm9kZVZlcnNpb24oKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB2ID0gKHByb2Nlc3MudmVyc2lvbnMgYXMgeyBub2RlPzogc3RyaW5nIH0gfCB1bmRlZmluZWQpPy5ub2RlXG4gICAgcmV0dXJuIHYgfHwgdW5kZWZpbmVkXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFx1N0FFRlx1NTNFM1x1NjYyRlx1NTQyNlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1MzAwMlxuICogXHU3NTI4IG5vZGU6aHR0cCBcdTgwMENcdTk3NUVcdTZENEZcdTg5QzhcdTU2NjggZmV0Y2hcdUZGMUFPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTc2ODQgQ1NQIFx1NEYxQVx1NjJFNlx1NjIyQVxuICogXHU1QkY5IGh0dHA6Ly8xMjcuMC4wLjEgXHU3Njg0IGZldGNoXHVGRjBDXHU1QkZDXHU4MUY0XCJcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcIlx1OEJFRlx1NTIyNFx1NEUzQVwiXHU2Q0ExXHU2NzA5XCJcdTMwMDJcbiAqIE5vZGUgXHU3Njg0IGh0dHAgXHU2QTIxXHU1NzU3XHU0RTBEXHU1M0Q3XHU5ODc1XHU5NzYyIENTUCBcdTdFQTZcdTY3NUZcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUG9ydFVwKGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCB0aW1lb3V0TXMgPSAxNTAwKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHJlcSA9IGh0dHAuZ2V0KHsgaG9zdCwgcG9ydCwgcGF0aDogJy8nLCB0aW1lb3V0OiB0aW1lb3V0TXMgfSwgKHJlcykgPT4ge1xuICAgICAgcmVzLnJlc3VtZSgpXG4gICAgICByZXNvbHZlKHRydWUpXG4gICAgfSlcbiAgICByZXEub24oJ3RpbWVvdXQnLCAoKSA9PiB7XG4gICAgICByZXEuZGVzdHJveSgpXG4gICAgICByZXNvbHZlKGZhbHNlKVxuICAgIH0pXG4gICAgcmVxLm9uKCdlcnJvcicsICgpID0+IHJlc29sdmUoZmFsc2UpKVxuICB9KVxufVxuXG4vKiogXHU4RjZFXHU4QkUyXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBXHVGRjFCXHU4RDg1XHU2NUY2XHU4RkQ0XHU1NkRFIGZhbHNlICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2FpdEZvclJlYWR5KGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCB0aW1lb3V0TXMgPSAxMjBfMDAwKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGRlYWRsaW5lID0gRGF0ZS5ub3coKSArIHRpbWVvdXRNc1xuICBmb3IgKDs7KSB7XG4gICAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQsIDE1MDApKSByZXR1cm4gdHJ1ZVxuICAgIGlmIChEYXRlLm5vdygpID4gZGVhZGxpbmUpIHJldHVybiBmYWxzZVxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDUwMCkpXG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaGVkU2VydmVyIHtcbiAgcHJvYzogQ2hpbGRQcm9jZXNzXG4gIHVybDogc3RyaW5nXG4gIC8qKiB0cnVlID0gXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjBDXHU2NzJBXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCICovXG4gIGF0dGFjaGVkOiBib29sZWFuXG59XG5cbi8qKiBcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgZHNoIHdlYlx1MzAwMlx1OEMwM1x1NzUyOFx1NjVCOVx1OEQxRlx1OEQyM1x1NzZEMVx1NTQyQyBwcm9jIFx1NzY4NCBleGl0L2Vycm9yXHUzMDAyICovXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoRHNoKG9wdHM6IExhdW5jaE9wdGlvbnMgJiB7IGRzaEJpbjogc3RyaW5nOyBub2RlQmluOiBzdHJpbmc7IHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuIH0pOiBDaGlsZFByb2Nlc3Mge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCBhcmdzID0gW29wdHMuZHNoQmluLCAnd2ViJywgJy0taG9zdCcsIGhvc3QsICctLXBvcnQnLCBTdHJpbmcocG9ydCldXG4gIGNvbnN0IGVudjogTm9kZUpTLlByb2Nlc3NFbnYgPSB7XG4gICAgLi4uKG9wdHMuZW52ID8/IHByb2Nlc3MuZW52ID8/IHt9KSxcbiAgICBEU0hfSE9NRTogb3B0cy5kc2hIb21lLFxuICB9XG4gIGlmIChvcHRzLnVzZUVsZWN0cm9uQXNOb2RlKSBlbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSdcbiAgY29uc29sZS5pbmZvKGBbZHNoLWhvc3RdIHNwYXduICR7b3B0cy5ub2RlQmlufSAke2FyZ3Muam9pbignICcpfWApXG4gIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBEU0hfSE9NRT0ke29wdHMuZHNoSG9tZX1gKVxuICByZXR1cm4gc3Bhd24ob3B0cy5ub2RlQmluLCBhcmdzLCB7XG4gICAgZW52LFxuICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbn1cblxuLyoqXG4gKiBcdTRFMDBcdTk1MkVcIlx1Nzg2RVx1NEZERFx1OEZEMFx1ODg0Q1wiXHVGRjFBXG4gKiAxLiBcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NzZGNFx1NjNBNVx1NjMwMlx1NjNBNVx1RkYwOGF0dGFjaGVkXHVGRjBDXHU0RTBEXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCXHVGRjA5XHVGRjFCXG4gKiAyLiBcdTU0MjZcdTUyMTlcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdTIxOTIgc3Bhd24gXHUyMTkyIFx1N0I0OVx1NUY4NVx1NUMzMVx1N0VFQVx1RkYxQlxuICogMy4gXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHVGRjA4XHU1OTgyXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwIEVBRERSSU5VU0VcdUZGMDlcdTIxOTIgXHU3QUNCXHU1MzczXHU4RkQ0XHU1NkRFXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXHVGRjBDXHU0RTBEXHU1MThEXHU3NkYyXHU3QjQ5XHUzMDAyXG4gKiBcdThGRDRcdTU2REUgU2VydmVyU3RhdHVzXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEc2hSdW5uaW5nKG9wdHM6IExhdW5jaE9wdGlvbnMpOiBQcm9taXNlPHsgc3RhdHVzOiBTZXJ2ZXJTdGF0dXM7IHByb2M/OiBDaGlsZFByb2Nlc3MgfT4ge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCB1cmwgPSBgaHR0cDovLyR7aG9zdH06JHtwb3J0fS9gXG5cbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9IH1cbiAgfVxuXG4gIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbihvcHRzLmRzaEJpbilcbiAgaWYgKCFmb3VuZC5iaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogZm91bmQubm90ZXNbZm91bmQubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBkc2ggQ0xJJyB9IH1cbiAgfVxuICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4ob3B0cy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIG9wdHMudXNlRW1iZWRkZWROb2RlKVxuICBjb25zdCBwcm9jID0gbGF1bmNoRHNoKHsgLi4ub3B0cywgZHNoQmluOiBmb3VuZC5iaW4sIG5vZGVCaW46IG5vZGUubm9kZUJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IG5vZGUudXNlRWxlY3Ryb25Bc05vZGUgfSlcblxuICAvLyBcdTY1MzZcdTk2QzYgc3RkZXJyIFx1NUMzRVx1OTBFOFx1RkYxQVx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1NjVGNlx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1NTM5Rlx1NTZFMFx1RkYwOFx1NTk4MiBFQUREUklOVVNFXHVGRjA5XG4gIGxldCBzdGRlcnJUYWlsID0gJydcbiAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4ge1xuICAgIHN0ZGVyclRhaWwgPSAoc3RkZXJyVGFpbCArIGQudG9TdHJpbmcoKSkuc2xpY2UoLTQwMDApXG4gIH0pXG5cbiAgY29uc3QgY2hpbGREaWVkID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICAgIHByb2Mub25jZSgnZXJyb3InLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICB9KVxuXG4gIGNvbnN0IHJlYWR5ID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICB3YWl0Rm9yUmVhZHkoaG9zdCwgcG9ydCwgb3B0cy50aW1lb3V0TXMgPz8gMTIwXzAwMCkudGhlbigoKSA9PiB0cnVlKSxcbiAgICBjaGlsZERpZWQudGhlbigoKSA9PiBmYWxzZSksXG4gIF0pXG5cbiAgaWYgKHJlYWR5KSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogZmFsc2UgfSwgcHJvYyB9XG4gIH1cblxuICAvLyBcdTVCNTBcdThGREJcdTdBMEJcdTVERjJcdTkwMDBcdTUxRkFcdUZGMUFcdTUxOERcdTYzQTJcdTRFMDBcdTZCMjFcdTdBRUZcdTUzRTNcdUZGMDhcdTUzRUZcdTgwRkRcdTg4QUJcdTUyMkJcdTc2ODRcdTVCOUVcdTRGOEJcdTYyQTJcdThERDFcdTdFRDFcdTVCOUFcdUZGMDlcdUZGMENcdTU0MjZcdTUyMTlcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTk1MTlcdThCRUZcbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9LCBwcm9jIH1cbiAgfVxuICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsKSB9LCBwcm9jIH1cbn1cblxuLyoqIFx1NEVDRSBzdGRlcnIgXHU1QzNFXHU5MEU4XHU2M0QwXHU3MEJDXHU1M0VGXHU4QkZCXHU5NTE5XHU4QkVGICovXG5mdW5jdGlvbiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gc3RkZXJyVGFpbC5zcGxpdCgvXFxyP1xcbi8pLmZpbHRlcihCb29sZWFuKVxuICBjb25zdCBhZGRyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0VBRERSSU5VU0UnKSlcbiAgY29uc3QgZXJyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0Vycm9yOicpKVxuICBpZiAoYWRkckxpbmUpIHtcbiAgICByZXR1cm4gJ1x1N0FFRlx1NTNFM1x1NURGMlx1ODhBQlx1NTM2MFx1NzUyOFx1RkYwOEVBRERSSU5VU0VcdUZGMDlcdTMwMDJcdThCRjdcdTYzNjJcdTRFMDBcdTRFMkFcdTdBRUZcdTUzRTNcdUZGMENcdTYyMTZcdTUxNDhcdTUwNUNcdTYzODlcdTUzNjBcdTc1MjhcdThCRTVcdTdBRUZcdTUzRTNcdTc2ODRcdTY3MERcdTUyQTFcdTU0MEVcdTkxQ0RcdThCRDUnXG4gIH1cbiAgaWYgKGVyckxpbmUpIHtcbiAgICBjb25zdCBjbGVhbmVkID0gZXJyTGluZS50cmltKCkuc2xpY2UoMCwgMzAwKVxuICAgIHJldHVybiBgZHNoIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtjbGVhbmVkfWBcbiAgfVxuICByZXR1cm4gJ0RTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkFcdUZGMDhcdTY1RTBcdThCRTZcdTdFQzZcdTk1MTlcdThCRUZcdUZGMDlcdTMwMDJcdThCRjdcdTY3RTVcdTc3MEIgT2JzaWRpYW4gXHU2M0E3XHU1MjM2XHU1M0YwIFtkc2hdIFx1NjVFNVx1NUZENydcbn1cblxuLyoqIFx1NTA1Q1x1NkI2Mlx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOFNJR1RFUk1cdUZGMENcdTdCNDlcdTVGODVcdTkwMDBcdTUxRkFcdUZGMUJcdThEODVcdTY1RjZcdTU0MEUgU0lHS0lMTFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BQcm9jZXNzKHByb2M6IENoaWxkUHJvY2VzcyB8IG51bGwgfCB1bmRlZmluZWQsIHRpbWVvdXRNcyA9IDUwMDApOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFwcm9jIHx8IHByb2MuZXhpdENvZGUgIT09IG51bGwgfHwgcHJvYy5zaWduYWxDb2RlICE9PSBudWxsKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Mua2lsbCgnU0lHS0lMTCcpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfSwgdGltZW91dE1zKVxuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH0pXG4gICAgdHJ5IHtcbiAgICAgIHByb2Mua2lsbCgnU0lHVEVSTScpXG4gICAgfSBjYXRjaCB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9XG4gIH0pXG59XG4iLCAiLyoqXG4gKiBcdThCQkVcdTdGNkVcdUZGMUFcdTVCNTdcdTZCQjUgKyBcdThCQkVcdTdGNkVcdTk4NzUgVUlcdTMwMDJcbiAqIFYwLjJcdUZGMUFEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdUZGMDhcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgLyBcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCIC8gXHU4MUVBXHU1QjlBXHU0RTQ5XHVGRjA5XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IHR5cGUgRHNoSG9tZU1vZGUgPSAnc2hhcmVkJyB8ICdwZXItdmF1bHQnIHwgJ2N1c3RvbSdcblxuZXhwb3J0IGludGVyZmFjZSBEc2hEb2NrU2V0dGluZ3Mge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluOiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU0RjE4XHU1MTQ4XHVGRjA5ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTRcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdDogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0OiBudW1iZXJcbiAgLyoqIERTSF9IT01FIFx1NkEyMVx1NUYwRlx1RkYxQXNoYXJlZD1cdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFCcGVyLXZhdWx0PVx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMUJjdXN0b209XHU4MUVBXHU1QjlBXHU0RTQ5ICovXG4gIGRzaEhvbWVNb2RlOiBEc2hIb21lTW9kZVxuICAvKiogXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NFx1RkYwOFx1NEVDNSBjdXN0b20gXHU2QTIxXHU1RjBGXHU3NTFGXHU2NTQ4XHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKiogXHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU6IGJvb2xlYW5cbiAgLyoqIE9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NjVGNlx1ODFFQVx1NTJBOFx1NjJDOVx1OEQ3NyBEU0ggKi9cbiAgYXV0b3N0YXJ0OiBib29sZWFuXG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEc2hEb2NrU2V0dGluZ3MgPSB7XG4gIGRzaEJpbjogJycsXG4gIG5vZGVCaW46ICcnLFxuICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgcG9ydDogMzA4MCxcbiAgZHNoSG9tZU1vZGU6ICdzaGFyZWQnLFxuICBkc2hIb21lOiAnJyxcbiAgdXNlRW1iZWRkZWROb2RlOiBmYWxzZSxcbiAgYXV0b3N0YXJ0OiB0cnVlLFxufVxuXG5leHBvcnQgY2xhc3MgRHNoRG9ja1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgY3VzdG9tSG9tZUVsPzogU2V0dGluZ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbilcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpc1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2OTgyXHU4OUM4IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdcdTI2RjUgRFNIIERvY2snIH0pXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zZXR0aW5ncy1kZXNjJyxcbiAgICAgIHRleHQ6ICdcdTYyOEFcdTVCOThcdTY1QjkgRGVlcFNlZWsgSGFybmVzcyBXZWIgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuXHVGRjFBXHU1QjlBXHU0RjREIGRzaCBcdTIxOTIgXHU1QjUwXHU4RkRCXHU3QTBCXHU4RkQwXHU4ODRDIFx1MjE5MiBcdTk3NjJcdTY3N0ZcdTVENENcdTUxNjVcdTMwMDJcdTUxNjhcdTdBMEJcdTVCOThcdTY1QjlcdUZGMENcdTk2RjZcdTgxRUFcdTc4MTRcdTMwMDInLFxuICAgIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjcwRFx1NTJBMVx1NjNBN1x1NTIzNiAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU2NzBEXHU1MkExJyB9KVxuICAgIGNvbnN0IHN0YXR1c0xpbmUgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTY3MERcdTUyQTFcdTcyQjZcdTYwMDEnKVxuICAgICAgLnNldERlc2ModGhpcy5kZXNjcmliZVN0YXR1cygpKVxuICAgIGNvbnN0IGJ0bnMgPSBzdGF0dXNMaW5lLmNvbnRyb2xFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1idG5zJyB9KVxuICAgIGNvbnN0IHN0YXJ0QnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdtb2QtY3RhJywgdGV4dDogJ1x1MjVCNiBcdTU0MkZcdTUyQTgnIH0pXG4gICAgc3RhcnRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMuZGlzcGxheSgpKVxuICAgIH1cbiAgICBjb25zdCBzdG9wQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHUyNUEwIFx1NTA1Q1x1NkI2MicgfSlcbiAgICBzdG9wQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0b3AoKS50aGVuKCgpID0+IHRoaXMuZGlzcGxheSgpKVxuICAgIH1cbiAgICBjb25zdCBvcGVuQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJyB9KVxuICAgIG9wZW5CdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlblBhbmVsKClcbiAgICB9XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTk2OEYgT2JzaWRpYW4gXHU4MUVBXHU1MkE4XHU1NDJGXHU1MkE4JylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b3N0YXJ0KS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU4RkQwXHU4ODRDXHU2NUY2IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdThGRDBcdTg4NENcdTY1RjYnIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnZHNoIENMSSBcdThERUZcdTVGODQnKVxuICAgICAgLnNldERlc2MoJ1x1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0Qlx1RkYwOERTSF9CSU4gXHUyMTkyIG5wbSByb290IC1nIFx1MjE5MiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTc2RUVcdTVGNTVcdUZGMDlcdTMwMDJcdTUzRUZcdTU4NkIgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1NjIxNiBiaW4uanMgXHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9saWIvbm9kZV9tb2R1bGVzL0BkZWVwc2Vlay1haS9kc2gnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hCaW4gPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuZGV0ZWN0TGluZSA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ05vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTlcdUZGMDhcdTdDRkJcdTdFREYgbm9kZSBcdTY3MDBcdTdBMzNcdTVCOUFcdUZGMDlcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvb3B0L2hvbWVicmV3L2Jpbi9ub2RlJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mubm9kZUJpbilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4gPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlJylcbiAgICAgIC5zZXREZXNjKCdFTEVDVFJPTl9SVU5fQVNfTk9ERVx1MzAwMlx1OUVEOFx1OEJBNFx1NTE3M1x1OTVFRFx1MjAxNFx1MjAxNFx1NUI5RVx1NkQ0QiBPYnNpZGlhbiBcdTRFOENcdThGREJcdTUyMzZcdTRFRTUgTm9kZSBcdTZBMjFcdTVGMEZcdThGRDBcdTg4NENcdTRGMUFcdTYzMDJcdThENzdcdUZGMENcdTRFQzVcdTU3MjhcdTlBOENcdThCQzFcdTUzRUZcdTc1MjhcdTY1RjZcdTVGMDBcdTU0MkZcdTMwMDInKVxuICAgICAgLmFkZFRvZ2dsZSgodCkgPT5cbiAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlID0gdlxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTdGNTFcdTdFREMgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1N0Y1MVx1N0VEQycgfSlcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTU3RkFcdTUxQzZcdUZGMDknKVxuICAgICAgLnNldERlc2MoJ1x1NUI5OFx1NjVCOVx1OUVEOFx1OEJBNCAzMDgwXHUzMDAyc2hhcmVkL2N1c3RvbSBcdTZBMjFcdTVGMEZcdTc2RjRcdTYzQTVcdTRGN0ZcdTc1MjhcdUZGMUJwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU1NzI4XHU2QjY0XHU1N0ZBXHU3ODQwXHU0RTBBXHU2MzA5IHZhdWx0IFx1NkQzRVx1NzUxRlx1NzJFQ1x1N0FDQlx1N0FFRlx1NTNFM1x1RkYwOFx1NkJDRiB2YXVsdCBcdTcyRUNcdTUzNjBcdUZGMENcdTRGMUFcdThCRERcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdUZGMDlcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJzMwODAnKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuID0gTnVtYmVyKHYudHJpbSgpKVxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCA9IE51bWJlci5pc0ludGVnZXIobikgJiYgbiA+PSAwICYmIG4gPD0gNjU1MzUgPyBuIDogMzA4MFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMubmV0UHJldmlldyA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTVcdUZGMDhEU0hfSE9NRVx1RkYwOVx1NEUwRVx1NEYxQVx1OEJERFx1OTY5NFx1NzlCQicgfSlcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTZBMjFcdTVGMEYnKVxuICAgICAgLnNldERlc2MoJ0RTSCBcdTc2ODRcdTRGMUFcdThCREQvXHU1QkM2XHU5NEE1L1x1NkEyMVx1NTc4Qlx1OTE0RFx1N0Y2RVx1NjgzOVx1NzZFRVx1NUY1NVx1MzAwMnBlci12YXVsdCBcdTZBMjFcdTVGMEYgPSBcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3MkVDXHU3QUNCIERTSF9IT01FICsgXHU3MkVDXHU3QUNCXHU3QUVGXHU1M0UzXHVGRjBDXHU1NDA0XHU4MUVBXHU1M0VBXHU2NjNFXHU3OTNBXHU2NzJDIHZhdWx0IFx1NTIxQlx1NUVGQS9cdTY1QjBcdTVFRkFcdTc2ODRcdTRGMUFcdThCRERcdUZGMENcdTRFOTJcdTRFMERcdTc2RjhcdTkwMUFcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICBkZC5hZGRPcHRpb24oJ3NoYXJlZCcsICdcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjA4XHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NEUwMFx1NTk1N1x1NEYxQVx1OEJERFx1RkYwQ1x1NEUwRSBkc2ggQ0xJIFx1NEUwMFx1ODFGNFx1RkYwOScpXG4gICAgICAgIGRkLmFkZE9wdGlvbigncGVyLXZhdWx0JywgJ1x1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkIgfi8uZHNoL3ZhdWx0cy88XHU1NDBEPi08aGFzaD5cdUZGMDhcdTRGMUFcdThCRERcdTVCOENcdTUxNjhcdTcyRUNcdTdBQ0JcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2N1c3RvbScsICdcdTgxRUFcdTVCOUFcdTRFNDlcdThERUZcdTVGODQnKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSlcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSA9IHYgYXMgRHNoSG9tZU1vZGVcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuY3VzdG9tSG9tZUVsPy5zZXREaXNhYmxlZCh2ICE9PSAnY3VzdG9tJylcbiAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIHRoaXMuY3VzdG9tSG9tZUVsID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NCcpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9Vc2Vycy95b3UvLmRzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuY3VzdG9tSG9tZUVsLnNldERpc2FibGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlICE9PSAnY3VzdG9tJylcblxuICAgIHRoaXMuaG9tZVByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RMaW5lITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBob21lUHJldmlldyE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgbmV0UHJldmlldyE6IEhUTUxFbGVtZW50XG5cbiAgcHJpdmF0ZSBkZXNjcmliZVN0YXR1cygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgcmV0dXJuIGAke3MudXJsfVx1RkYwOCR7cy5hdHRhY2hlZCA/ICdcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJ1x1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0Q1x1NEUyRCd9XHVGRjA5YFxuICAgIH1cbiAgICBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSByZXR1cm4gJ1x1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNlx1RkYwOFx1OTk5Nlx1NkIyMVx1N0VBNiAxMCBcdTc5RDJcdUZGMENcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOSdcbiAgICBpZiAocy5raW5kID09PSAnZXJyb3InKSByZXR1cm4gYFx1NTkzMVx1OEQyNTogJHtzLm1lc3NhZ2V9YFxuICAgIHJldHVybiAnXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURldGVjdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnBsdWdpbi5kZXRlY3RJbmZvKClcbiAgICByZXR1cm4gW1xuICAgICAgYGRzaDogJHtpbmZvLmRzaEJpbiA/PyAnXHU2NzJBXHU2MjdFXHU1MjMwJ30ke2luZm8uZHNoTm90ZXMubGVuZ3RoID8gYFx1RkYwOCR7aW5mby5kc2hOb3Rlcy5qb2luKCdcdUZGMUInKX1cdUZGMDlgIDogJyd9YCxcbiAgICAgIGBub2RlOiAke2luZm8ubm9kZU5vdGVzLmpvaW4oJ1x1RkYxQicpfWAsXG4gICAgXS5qb2luKCdcXG4nKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1OERFRlx1NUY4NDogJHt0aGlzLnBsdWdpbi5lZmZlY3RpdmVEc2hIb21lKCl9YFxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZU5ldCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBvcnQgPSB0aGlzLnBsdWdpbi5lZmZlY3RpdmVQb3J0KClcbiAgICBjb25zdCBtb2RlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGVcbiAgICBjb25zdCBzdWZmaXggPSBtb2RlID09PSAncGVyLXZhdWx0JyA/ICdcdUZGMDhcdTY3MkMgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RTBFXHU1MTc2XHU0RUQ2IHZhdWx0IFx1OTY5NFx1NzlCQlx1RkYwOScgOiAnXHVGRjA4c2hhcmVkL2N1c3RvbVx1RkYxQVx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdUZGMDknXG4gICAgcmV0dXJuIGBcdTc1MUZcdTY1NDhcdTdBRUZcdTUzRTM6ICR7cG9ydH0ke3N1ZmZpeH1gXG4gIH1cbn1cbiIsICIvKipcbiAqIERzaFdlYlZpZXcgXHUyMDE0XHUyMDE0IFx1NjI4QVx1NUI5OFx1NjVCOSBEU0ggV2ViICgxMjcuMC4wLjE6PHBvcnQ+KSBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW4gXHU5NzYyXHU2NzdGXHUzMDAyXG4gKiBcdTVFMjZcdTVCOENcdTY1NzRcdThGQzdcdTdBMEJcdTcyQjZcdTYwMDFcdUZGMUFcdTUyQTBcdThGN0RcdTUyQThcdTc1M0IgLyBcdTk1MTlcdThCRUZcdTUzNjFcdTcyNDdcdUZGMDhcdTU0MkJcdTkxQ0RcdThCRDVcdUZGMDkvIFx1NjcyQVx1NTQyRlx1NTJBOFx1N0E3QVx1NzJCNlx1NjAwMSAvIFx1NTZGRVx1NjgwN1x1NURFNVx1NTE3N1x1NjgwRlx1MzAwMlxuICogaWZyYW1lIFx1NjMwN1x1NTQxMVx1NUI5OFx1NjVCOVx1NjcwRFx1NTJBMVx1RkYwQ1VJIFx1NTNFQVx1NjYyRlwiXHU4MjM5XHU1NzVFXCJcdTU5MTZcdTU4RjNcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgc2V0SWNvbiB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCBjb25zdCBEU0hfV0VCX1ZJRVdfVFlQRSA9ICdkc2gtZG9jay13ZWInXG5cbnR5cGUgVWlTdGF0ZSA9ICdydW5uaW5nJyB8ICdzdGFydGluZycgfCAnZXJyb3InIHwgJ3N0b3BwZWQnXG5cbmV4cG9ydCBjbGFzcyBEc2hXZWJWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwcml2YXRlIGlmcmFtZUVsOiBIVE1MSUZyYW1lRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgcGlsbEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgb3ZlcmxheUVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgdG9nZ2xlQnRuOiBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgY3VycmVudDogVWlTdGF0ZSA9ICdzdG9wcGVkJ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSBwbHVnaW46IERzaERvY2tQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGxlYWYpXG4gIH1cblxuICBvdmVycmlkZSBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBEU0hfV0VCX1ZJRVdfVFlQRVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0RTSCBEb2NrJ1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiAnYW5jaG9yJ1xuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jaycgfSlcblxuICAgIC8vIC0tLS0gXHU1OTM0XHU5MEU4XHU1REU1XHU1MTc3XHU2ODBGIC0tLS1cbiAgICBjb25zdCBoZWFkZXIgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWhlYWRlcicgfSlcbiAgICBjb25zdCBsb2dvID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWxvZ28nIH0pXG4gICAgc2V0SWNvbihsb2dvLCAnYW5jaG9yJylcbiAgICBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXRpdGxlJywgdGV4dDogJ0RTSCBEb2NrJyB9KVxuICAgIHRoaXMucGlsbEVsID0gaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay1waWxsJyB9KVxuICAgIGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGFjZXInIH0pXG5cbiAgICB0aGlzLnRvZ2dsZUJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgdGhpcy50b2dnbGVCdG4ub25jbGljayA9ICgpID0+IHZvaWQgdGhpcy5vblRvZ2dsZSgpXG5cbiAgICBjb25zdCByZWZyZXNoQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHJlZnJlc2hCdG4sICdyZWZyZXNoLWN3JylcbiAgICByZWZyZXNoQnRuLnRpdGxlID0gJ1x1NTIzN1x1NjVCMCdcbiAgICByZWZyZXNoQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnJlbG9hZCgpXG5cbiAgICBjb25zdCBwb3BvdXRCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24ocG9wb3V0QnRuLCAnbWF4aW1pemUtMicpXG4gICAgcG9wb3V0QnRuLnRpdGxlID0gJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOFx1NzJFQ1x1N0FDQlx1OEZEQlx1N0EwQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOSdcbiAgICBwb3BvdXRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpXG4gICAgfVxuXG4gICAgY29uc3QgYnJvd3NlckJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihicm93c2VyQnRuLCAnZXh0ZXJuYWwtbGluaycpXG4gICAgYnJvd3NlckJ0bi50aXRsZSA9ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAnXG4gICAgYnJvd3NlckJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKClcbiAgICB9XG5cbiAgICAvLyAtLS0tIFx1NEUzQlx1NEY1M1x1RkYxQWlmcmFtZSArIFx1NzJCNlx1NjAwMVx1ODk4Nlx1NzZENlx1NUM0MiAtLS0tXG4gICAgY29uc3QgYm9keSA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYm9keScgfSlcbiAgICB0aGlzLmlmcmFtZUVsID0gYm9keS5jcmVhdGVFbCgnaWZyYW1lJywgeyBjbHM6ICdkc2gtZG9jay1mcmFtZScgfSlcbiAgICB0aGlzLm92ZXJsYXlFbCA9IGJvZHkuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stb3ZlcmxheScgfSlcblxuICAgIC8vIFx1NzJCNlx1NjAwMVx1ODA1NFx1NTJBOFxuICAgIHRoaXMucGx1Z2luLm9uU3RhdHVzQ2hhbmdlKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIHRoaXMucmVmcmVzaCgpXG5cbiAgICAvLyBcdTUxNUNcdTVFOTVcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTgyRTVcdTY3MERcdTUyQTFcdTY3MkFcdTU0MkZcdTUyQThcdTRFMTRcdTdBRUZcdTUzRTNcdTUzRUZcdTc1MjhcdUZGMENcdTVDMURcdThCRDVcdTYyQzlcdThENzdcbiAgICB2b2lkIHRoaXMuZW5zdXJlU3RhcnRlZCgpXG5cbiAgICAvLyBcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTUyMzdcdTY1QjBcdTRFMDBcdTZCMjFcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXHVGRjFBXHU3NTI4XHU2MjM3XHU2QjY0XHU1MjNCXHU2QjYzXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0ZcdTc2ODRcdTdBOTdcdTUzRTNcbiAgICAvLyBcdTVDMzFcdTY2MkZcIlx1NUY1M1x1NTI0RCB2YXVsdFwiXHVGRjBDXHU2NUUwXHU5NzAwXHU3QjQ5IGZvY3VzL2FjdGl2ZS1sZWFmLWNoYW5nZSBcdTRFOEJcdTRFRjZcdTMwMDJcbiAgICB0aGlzLnBsdWdpbi5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgfVxuXG4gIG92ZXJyaWRlIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9uVG9nZ2xlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0b3AoKVxuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdGFydCgpXG4gICAgfVxuICAgIHRoaXMucmVmcmVzaCgpXG4gIH1cblxuICAvKiogXHU5NzYyXHU2NzdGXHU2MjUzXHU1RjAwXHU2NUY2XHU3ODZFXHU0RkREXHU2NzBEXHU1MkExXHU1NzI4XHU4REQxXHVGRjA4XHU1REYyXHU1NzI4XHU4REQxXHU1MjE5XHU2MzAyXHU2M0E1XHVGRjA5ICovXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlU3RhcnRlZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAnc3RvcHBlZCcgfHwgcy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdGFydCgpXG4gICAgICB0aGlzLnJlZnJlc2goKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBsZXQgdWk6IFVpU3RhdGVcbiAgICBsZXQgcGlsbFRleHQgPSAnJ1xuICAgIGxldCBwaWxsQ2xzID0gJydcblxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgdWkgPSAncnVubmluZydcbiAgICAgIHBpbGxUZXh0ID0gYFx1MjVDRiAke3MucG9ydH0ke3MuYXR0YWNoZWQgPyAnIFx1MDBCNyBcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJyd9YFxuICAgICAgcGlsbENscyA9ICdpcy1ydW5uaW5nJ1xuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB1aSA9ICdzdGFydGluZydcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjVDQyBcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjYnXG4gICAgICBwaWxsQ2xzID0gJ2lzLXN0YXJ0aW5nJ1xuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICB1aSA9ICdlcnJvcidcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjcxNSBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnXG4gICAgICBwaWxsQ2xzID0gJ2lzLWVycm9yJ1xuICAgIH0gZWxzZSB7XG4gICAgICB1aSA9ICdzdG9wcGVkJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNCIFx1NjcyQVx1OEZEMFx1ODg0QydcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RvcHBlZCdcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnQgPSB1aVxuICAgIGlmICh0aGlzLnBpbGxFbCkge1xuICAgICAgdGhpcy5waWxsRWwuc2V0VGV4dChwaWxsVGV4dClcbiAgICAgIHRoaXMucGlsbEVsLmNsYXNzTmFtZSA9IGBkc2gtZG9jay1waWxsICR7cGlsbENsc31gXG4gICAgfVxuICAgIGlmICh0aGlzLnRvZ2dsZUJ0bikge1xuICAgICAgdGhpcy50b2dnbGVCdG4uZW1wdHkoKVxuICAgICAgc2V0SWNvbih0aGlzLnRvZ2dsZUJ0biwgcy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnID8gJ3NxdWFyZScgOiAncGxheScpXG4gICAgICB0aGlzLnRvZ2dsZUJ0bi50aXRsZSA9IHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJyA/ICdcdTUwNUNcdTZCNjInIDogJ1x1NTQyRlx1NTJBOCdcbiAgICB9XG5cbiAgICAvLyBpZnJhbWUgXHU0RTBFXHU4OTg2XHU3NkQ2XHU1QzQyXG4gICAgaWYgKHVpID09PSAncnVubmluZycpIHtcbiAgICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuaWZyYW1lRWwuc3JjICE9PSB0aGlzLnBsdWdpbi5iYXNlVXJsKSB7XG4gICAgICAgIHRoaXMuaWZyYW1lRWwuc3JjID0gdGhpcy5wbHVnaW4uYmFzZVVybFxuICAgICAgfVxuICAgICAgdGhpcy5zaG93T3ZlcmxheShudWxsKVxuICAgIH0gZWxzZSBpZiAodWkgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJTdGFydGluZygpKVxuICAgIH0gZWxzZSBpZiAodWkgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJFcnJvcihzLmtpbmQgPT09ICdlcnJvcicgPyBzLm1lc3NhZ2UgOiAnXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGJykpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJTdG9wcGVkKCkpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLSBcdTg5ODZcdTc2RDZcdTVDNDJcdTZFMzJcdTY3RDMgLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgc2hvd092ZXJsYXkoY29udGVudDogSFRNTEVsZW1lbnQgfCBudWxsKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLm92ZXJsYXlFbCkgcmV0dXJuXG4gICAgdGhpcy5vdmVybGF5RWwuZW1wdHkoKVxuICAgIGlmIChjb250ZW50KSB7XG4gICAgICB0aGlzLm92ZXJsYXlFbC5hcHBlbmRDaGlsZChjb250ZW50KVxuICAgICAgdGhpcy5vdmVybGF5RWwucmVtb3ZlQXR0cmlidXRlKCdoaWRkZW4nKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBcdThGRDBcdTg4NENcdTRFMkRcdUZGMUFcdTY2M0VcdTVGMEZcdTk2OTBcdTg1Q0ZcdTg5ODZcdTc2RDZcdTVDNDJcdUZGMDhcdTU0MjZcdTUyMTlcdTdBN0FcdTc2ODRcdTdFRERcdTVCRjlcdTVCOUFcdTRGNERcdTVDNDJcdTRGMUFcdTYzMjFcdTRGNEYgaWZyYW1lXHVGRjA5XG4gICAgICB0aGlzLm92ZXJsYXlFbC5zZXRBdHRyaWJ1dGUoJ2hpZGRlbicsICcnKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhcnRpbmcoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGlubmVyJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdcdTZCNjNcdTU3MjhcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgRFNIIFdlYlx1MjAyNicgfSlcbiAgICBib3guY3JlYXRlRGl2KHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsXG4gICAgICB0ZXh0OiAnXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU5NzAwXHU1MjFEXHU1OUNCXHU1MzE2IHByb2ZpbGVcdUZGMDhcdTdFQTYgMTAgXHU3OUQyXHVGRjA5XHVGRjFCXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwXHU3NTI4XHU2NUY2XHU1QzA2XHU4MUVBXHU1MkE4XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyxcbiAgICB9KVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRXJyb3IobWVzc2FnZTogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbGVydC10cmlhbmdsZScpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLW1zZycsIHRleHQ6IG1lc3NhZ2UgfSlcbiAgICBjb25zdCByZXRyeSA9IGJveC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1idG4nLCB0ZXh0OiAnXHU5MUNEXHU4QkQ1JyB9KVxuICAgIHJldHJ5Lm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB9XG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdG9wcGVkKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYW5jaG9yJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NjcyQVx1OEZEMFx1ODg0QycgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJywgdGV4dDogJ1x1NzBCOVx1NTFGQlx1NTQyRlx1NTJBOFx1RkYwQ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFx1NTA1Q1x1OTc2MFx1OEZEQlx1Njc2NScgfSlcbiAgICBjb25zdCBzdGFydCA9IGJveC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1idG4gbW9kLWN0YScsIHRleHQ6ICdcdTU0MkZcdTUyQTggRFNIJyB9KVxuICAgIHN0YXJ0Lm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB9XG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZWxvYWQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5jdXJyZW50ID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuaWZyYW1lRWwuc3JjID0gdGhpcy5wbHVnaW4uYmFzZVVybFxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogY3VycmVudFZhdWx0LnRzIFx1MjAxNFx1MjAxNCBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdTMwMDJcbiAqXG4gKiBkc2gtZG9jayBcdThERDFcdTU3MjggT2JzaWRpYW4gXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU4MEZEXHU2MkZGXHU1MjMwXHU2NzAwXHU2NzQzXHU1QTAxXHU3Njg0XHU1RjUzXHU1MjREIHZhdWx0XHVGRjA4XHU3QTk3XHU1M0UzXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU2NUY2XHVGRjBDXG4gKiBgYXBwLnZhdWx0LmdldE5hbWUoKWAgKyBgYWRhcHRlci5nZXRCYXNlUGF0aCgpYFx1RkYwOVx1MzAwMkRTSCBcdTc2ODRcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjZcbiAqIGRzaC10b29sLW9ic2lkaWFuLXZhdWx0IFx1OEREMVx1NTcyOFx1NzJFQ1x1N0FDQiBub2RlIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1NEUyNFx1ODAwNVx1OTAxQVx1OEZDN1x1NEUwMFx1NEUyQVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1ODlFM1x1ODAyNlx1OTAxQVx1NEZFMVx1RkYxQVxuICpcbiAqICAgPGhvbWVkaXI+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICAgeyBuYW1lLCBwYXRoLCB1cGRhdGVkQXQgfVxuICpcbiAqIC0gXHU0RjREXHU3RjZFXHU1NkZBXHU1QjlBXHU1NzI4IGB+Ly5kc2hgXHVGRjA4XHU0RTBFIGRzaC1kb2NrIFx1NzY4NCBEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdTY1RTBcdTUxNzNcdUZGMDlcdUZGMENcdTRFRkJcdTRGNTVcdTZBMjFcdTVGMEZcbiAqICAgXHU0RTBCIERTSCBcdTRGQTdcdTkwRkRcdThCRkJcdTVGOTdcdTUyMzBcdUZGMUJcbiAqIC0gXHU1OTFBXHU3QTk3XHU1M0UzXHU1NzNBXHU2NjZGXHVGRjFBXHU2QkNGXHU0RTJBIE9ic2lkaWFuIFx1N0E5N1x1NTNFM1x1RkYwOFx1NEUzQlx1N0E5N1x1NTNFMyAvIHBvcG91dFx1RkYwOVx1OTBGRFx1NjYyRlx1NzJFQ1x1N0FDQlx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwQ1x1NTQwNFxuICogICBcdTgxRUFcdTc2RDFcdTU0MkNcdTgxRUFcdTVERjFcdTc2ODQgd2luZG93IGZvY3VzIFx1MjAxNFx1MjAxNCBcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTZCNjNcdTY2MkZcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1xuICogICBcdTU3MjhcdTc3MEJcdTc2ODQgdmF1bHRcIlx1RkYxQlxuICogLSBcdTU5MzFcdThEMjVcdTk3NTlcdTlFRDhcdUZGMUFcdTUxOTlcdTRFMERcdThGREJcdUZGMDhcdTY3NDNcdTk2NTAvXHU3OEMxXHU3NkQ4XHVGRjA5XHU1M0VBIGNvbnNvbGUud2Fyblx1RkYwQ1x1N0VERFx1NEUwRFx1NjI1M1x1NjVBRFx1NjNEMlx1NEVGNlx1NEUzQlx1NkQ0MVx1N0EwQlx1RkYxQlxuICogICBcdTY1ODdcdTRFRjZcdTYzNUZcdTU3NEYvXHU3RjNBXHU1OTMxXHU2NUY2IERTSCBcdTRGQTdcdTU2REVcdTkwMDBcdTUzOUZcdTY3MDlcdTRGRTFcdTUzRjdcdUZGMENcdTU0MTFcdTU0MEVcdTUxN0NcdTVCQjlcdTRFMERcdTg4QzUgZHNoLWRvY2sgXHU3Njg0XHU1NzNBXHU2NjZGXHUzMDAyXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTZGQVx1NUI5QVx1NEY0RFx1N0Y2RVx1RkYxQX4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gKi9cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50VmF1bHRNYXJrZXJQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmRzaCcsICdjdXJyZW50LXZhdWx0Lmpzb24nKVxufVxuXG4vKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTg1XHU1QkI5XHVGRjA4RFNIIFx1NEZBN1x1NTNFQVx1OEJGQiBuYW1lL3BhdGhcdUZGMEN1cGRhdGVkQXQgXHU0RjlCXHU4QkNBXHU2NUFEXHVGRjA5ICovXG5leHBvcnQgaW50ZXJmYWNlIEN1cnJlbnRWYXVsdE1hcmtlciB7XG4gIG5hbWU6IHN0cmluZ1xuICBwYXRoOiBzdHJpbmdcbiAgdXBkYXRlZEF0OiBudW1iZXJcbn1cblxuLyoqXG4gKiBcdTUzOUZcdTVCNTBcdTUxOTlcdTUxNjVcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdUZGMUFcdTUxNDhcdTUxOTlcdTU0MENcdTc2RUVcdTVGNTUgLnRtcCBcdTUxOEQgcmVuYW1lXHVGRjBDXHU5MDdGXHU1MTREIERTSCBcdTRGQTdcdThCRkJcdTUyMzBcdTUzNEFcdTYyMkFcdTUxODVcdTVCQjlcdTMwMDJcbiAqIFx1NTkzMVx1OEQyNVx1NTNFQVx1NTQ0QVx1OEI2Nlx1RkYwQ1x1NEUwRFx1NjI5Qlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIobmFtZTogc3RyaW5nLCB2YXVsdFBhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGNvbnN0IGZpbGUgPSBjdXJyZW50VmF1bHRNYXJrZXJQYXRoKClcbiAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgIGNvbnN0IHBheWxvYWQ6IEN1cnJlbnRWYXVsdE1hcmtlciA9IHsgbmFtZSwgcGF0aDogdmF1bHRQYXRoLCB1cGRhdGVkQXQ6IERhdGUubm93KCkgfVxuICAgIGNvbnN0IHRtcCA9IGAke2ZpbGV9LnRtcGBcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRtcCwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMikpXG4gICAgZnMucmVuYW1lU3luYyh0bXAsIGZpbGUpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignW2RzaC1kb2NrXSBcdTUxOTlcdTUxNjUgY3VycmVudC12YXVsdCBcdTY4MDdcdThCQjBcdTU5MzFcdThEMjUnLCBlcnIpXG4gIH1cbn1cblxuLyoqIFx1NEVDRSBPYnNpZGlhbiBhcHAgXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NTQwRFx1NEUwRVx1NjgzOVx1OERFRlx1NUY4NFx1RkYxQlx1NTNENlx1NEUwRFx1NTIzMFx1OEZENFx1NTZERSBudWxsICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0SW5mbyhhcHA6IHtcbiAgdmF1bHQ6IHsgZ2V0TmFtZSgpOiBzdHJpbmc7IGFkYXB0ZXI6IHVua25vd24gfVxufSk6IHsgbmFtZTogc3RyaW5nOyBwYXRoOiBzdHJpbmcgfSB8IG51bGwge1xuICB0cnkge1xuICAgIC8vIGdldEJhc2VQYXRoIFx1NEUwRFx1NTcyOCBvYnNpZGlhbiBcdTc2ODRcdTdDN0JcdTU3OEJcdTVCOUFcdTRFNDlcdTkxQ0NcdUZGMDhcdThGRDBcdTg4NENcdTY1RjYgRGF0YUFkYXB0ZXIgXHU2MjREXHU2NzA5XHVGRjA5XHVGRjBDXG4gICAgLy8gXHU2MjQwXHU0RUU1XHU4RkQ5XHU5MUNDXHU2MjhBIGFkYXB0ZXIgXHU1RjUzIHVua25vd24gXHU1OTA0XHU3NDA2XHU1MThEXHU2NUFEXHU4QTAwXHUzMDAyXG4gICAgY29uc3QgYmFzZSA9IChhcHAudmF1bHQuYWRhcHRlciBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH0pLmdldEJhc2VQYXRoPy4oKVxuICAgIGlmICghYmFzZSkgcmV0dXJuIG51bGxcbiAgICByZXR1cm4geyBuYW1lOiBhcHAudmF1bHQuZ2V0TmFtZSgpLCBwYXRoOiBiYXNlIH1cbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRQSxJQUFBQSxtQkFBOEM7QUFFOUMsSUFBQUMsTUFBb0I7QUFDcEIsSUFBQUMsUUFBc0I7OztBQ0l0QiwyQkFBb0Q7QUFDcEQsU0FBb0I7QUFDcEIsV0FBc0I7QUFDdEIsU0FBb0I7QUFDcEIsV0FBc0I7QUFFZixJQUFNLG1CQUF3QixVQUFLLGdCQUFnQixPQUFPLE9BQU8sUUFBUTtBQUd6RSxJQUFNLHdCQUF3QjtBQUc5QixTQUFTLFdBQVcsT0FBZSxNQUFNLEdBQVc7QUFDekQsTUFBSSxJQUFJO0FBQ1IsV0FBUyxJQUFJLEdBQUcsSUFBSSxNQUFNLFFBQVEsSUFBSyxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFDLE1BQU87QUFDcEYsU0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLFNBQVMsS0FBSyxHQUFHLEVBQUUsTUFBTSxHQUFHLEdBQUc7QUFDdkQ7QUFHTyxTQUFTLGNBQWMsV0FBMkI7QUFDdkQsUUFBTSxVQUNILGNBQVMsU0FBUyxFQUNsQixRQUFRLHNCQUFzQixHQUFHLEVBQ2pDLFFBQVEsWUFBWSxFQUFFO0FBQ3pCLFVBQVEsV0FBVyxTQUFTLE1BQU0sR0FBRyxFQUFFO0FBQ3pDO0FBMkNPLFNBQVMsZ0JBQWdCLE9BQWlEO0FBQy9FLE1BQUksQ0FBQyxNQUFPLFFBQU87QUFDbkIsUUFBTSxJQUFJLE1BQU0sS0FBSztBQUNyQixNQUFJLENBQUMsRUFBRyxRQUFPO0FBQ2YsUUFBTSxXQUFXLEVBQUUsUUFBUSxpQkFBb0IsV0FBUSxDQUFDO0FBQ3hELFFBQU0sTUFBVyxnQkFBVyxRQUFRLElBQVMsZUFBVSxR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QUNuQyxVQUFNLEVBQUUsTUFBTSxJQUFJLFFBQVEsVUFBVTtBQUNwQyxVQUFNLE1BQU0sYUFBYSxLQUFLLE9BQU87QUFBQSxFQUN2QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNQSxNQUFNLGFBQTRCO0FBQ2hDLFFBQUk7QUFDRixZQUFNLE9BQU8sS0FBSyxJQUFJLFVBQVUsZUFBZTtBQUMvQyxZQUFNLEtBQUssYUFBYSxFQUFFLE1BQU0sbUJBQW1CLFFBQVEsS0FBSyxDQUFDO0FBQUEsSUFDbkUsU0FBUyxLQUFLO0FBQ1osWUFBTSxNQUFNLGVBQWUsUUFBUSxJQUFJLFVBQVUsT0FBTyxHQUFHO0FBQzNELFVBQUksd0JBQU8scURBQWEsR0FBRyxFQUFFO0FBQUEsSUFDL0I7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJvcyIsICJwYXRoIiwgImVtYmVkZGVkTm9kZVZlcnNpb24iLCAicmVzb2x2ZSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiZnMiLCAib3MiLCAicGF0aCJdCn0K
