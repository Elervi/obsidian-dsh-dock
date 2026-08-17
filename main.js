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
  computeSharedConfigRoot: () => computeSharedConfigRoot,
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
function commonNodeBins() {
  const bins = [];
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (dir.trim()) bins.push(path.join(dir, "node"));
  }
  if (process.platform === "darwin") {
    bins.push("/opt/homebrew/bin/node", "/usr/local/bin/node");
  } else if (process.platform === "linux") {
    bins.push("/usr/bin/node", "/usr/local/bin/node", path.join(os.homedir(), ".local", "bin", "node"));
  } else if (process.platform === "win32") {
    try {
      const where = (0, import_child_process.spawnSync)("where", ["node"], { encoding: "utf8", timeout: 1e4, windowsHide: true });
      if (where.status === 0 && where.stdout) {
        for (const line of where.stdout.trim().split(/\r?\n/)) {
          if (line.trim()) bins.push(line.trim());
        }
      }
    } catch {
    }
  }
  return [...new Set(bins)];
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
  for (const candidate of commonNodeBins()) {
    if (fs.existsSync(candidate)) {
      notes.push(`\u4F7F\u7528\u7CFB\u7EDF Node: ${candidate}`);
      return { nodeBin: candidate, useElectronAsNode: false, nodeMajor: 0, notes };
    }
  }
  notes.push("\u672A\u627E\u5230 Node\u3002\u8BF7\u5B89\u88C5 Node\uFF08https://nodejs.org\uFF09\uFF0C\u6216\u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 Node \u53EF\u6267\u884C\u6587\u4EF6\u8DEF\u5F84");
  return { nodeBin: "", useElectronAsNode: false, nodeMajor: 0, notes };
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
function ensureSharedConfigPatch(dshHome, sharedRoot) {
  if (!sharedRoot || dshHome === sharedRoot) return;
  try {
    const profileDir = path.join(dshHome, "profiles", "web");
    const patchFile = path.join(profileDir, "cordis.patch.yml");
    const settingsPath = path.join(sharedRoot, "settings.yaml");
    const credentialsPath = path.join(sharedRoot, ".credentials.yaml");
    const patch = `# dsh-dock \u81EA\u52A8\u7EF4\u62A4\uFF1Aper-vault \u914D\u7F6E\u5171\u4EAB\uFF08\u6A21\u578B/\u5BC6\u94A5/\u4E3B\u9898\u6307\u5411\u5171\u4EAB ~/.dsh\uFF0C\u4F1A\u8BDD\u4ECD\u9694\u79BB\uFF09
- update:
    - id: settings
      config:
        path: ${settingsPath}
    - id: credentials
      config:
        path: ${credentialsPath}
`;
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(patchFile, patch);
    console.info(`[dsh-host] per-vault \u914D\u7F6E\u5171\u4EAB: settings/credentials -> ${sharedRoot}`);
  } catch (err) {
    console.warn("[dsh-host] \u5199\u5165\u914D\u7F6E\u5171\u4EAB patch \u5931\u8D25\uFF08\u5C06\u6309 per-vault \u72EC\u7ACB\u914D\u7F6E\u542F\u52A8\uFF09", err);
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
  if (!node.nodeBin) {
    return { status: { kind: "error", message: node.notes[node.notes.length - 1] ?? "\u65E0\u6CD5\u5B9A\u4F4D Node \u8FD0\u884C\u65F6" } };
  }
  if (opts.sharedConfigRoot) {
    ensureSharedConfigPatch(opts.dshHome, opts.sharedConfigRoot);
  }
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
    new import_obsidian.Setting(containerEl).setName("\u6A21\u5F0F").setDesc("per-vault \u6A21\u5F0F = \u4F1A\u8BDD\u6309\u5E93\u9694\u79BB\uFF08\u5404\u5E93\u9762\u677F\u53EA\u663E\u793A\u672C\u5E93\u521B\u5EFA\u7684\u4F1A\u8BDD\uFF09\uFF0C\u4F46\u6A21\u578B/\u5BC6\u94A5/\u4E3B\u9898\u914D\u7F6E\u5171\u4EAB\u4E00\u4EFD\uFF0C\u914D\u4E00\u6B21\u5168\u5E93\u751F\u6548\u3002").addDropdown((dd) => {
      dd.addOption("shared", "\u5B98\u65B9\u5171\u4EAB ~/.dsh\uFF08\u6240\u6709 vault \u5171\u7528\u4E00\u5957\u914D\u7F6E\u4E0E\u4F1A\u8BDD\uFF09");
      dd.addOption("per-vault", "\u6BCF vault \u9694\u79BB\u4F1A\u8BDD ~/.dsh/vaults/<\u540D>-<hash>\uFF08\u914D\u7F6E\u4ECD\u5171\u4EAB\uFF09");
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
    const home = this.plugin.effectiveDshHome();
    const shared = this.plugin.effectiveSharedConfigRoot();
    if (shared) {
      return `\u4F1A\u8BDD\u76EE\u5F55: ${home}
\u914D\u7F6E\u5171\u4EAB: ${shared}\uFF08\u6A21\u578B/\u5BC6\u94A5/\u4E3B\u9898\u914D\u4E00\u6B21\u5168\u5E93\u751F\u6548\uFF09`;
    }
    return `\u751F\u6548\u8DEF\u5F84: ${home}`;
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
function computeSharedConfigRoot(s, vaultRoot) {
  if (s.dshHomeMode === "per-vault" && vaultRoot) {
    return path3.join(os3.homedir(), ".dsh");
  }
  return void 0;
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
      const sharedConfigRoot = computeSharedConfigRoot(this.settings, vaultRoot);
      const vaultInfo = currentVaultInfo(this.app);
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port,
        host: this.settings.host,
        dshHome,
        // per-vault 配置共享：模型/密钥/主题指回共享 ~/.dsh，只隔离会话。
        ...sharedConfigRoot ? { sharedConfigRoot } : {},
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
  /** 当前设置下生效的共享配置根（per-vault 模式 = ~/.dsh，其余无） */
  effectiveSharedConfigRoot() {
    return computeSharedConfigRoot(this.settings, this.vaultRoot());
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
  computePort,
  computeSharedConfigRoot
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSB7IENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7XG4gIGVtYmVkZGVkTm9kZVZlcnNpb24sXG4gIGVuc3VyZURzaFJ1bm5pbmcsXG4gIHJlc29sdmVEc2hCaW4sXG4gIHJlc29sdmVOb2RlQmluLFxuICBzYWZlVmF1bHROYW1lLFxuICBzdGFibGVIYXNoLFxuICBzdG9wUHJvY2VzcyxcbiAgdHlwZSBTZXJ2ZXJTdGF0dXMsXG59IGZyb20gJy4vbGF1bmNoZXInXG5pbXBvcnQgeyBEc2hEb2NrU2V0dGluZ3NUYWIsIERFRkFVTFRfU0VUVElOR1MsIHR5cGUgRHNoRG9ja1NldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncydcbmltcG9ydCB7IERzaFdlYlZpZXcsIERTSF9XRUJfVklFV19UWVBFIH0gZnJvbSAnLi92aWV3J1xuaW1wb3J0IHsgY3VycmVudFZhdWx0SW5mbywgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIgfSBmcm9tICcuL2N1cnJlbnRWYXVsdCdcblxuLyoqXG4gKiBcdThCQTFcdTdCOTcgRFNIX0hPTUVcdUZGMUFcbiAqIC0gc2hhcmVkXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFBfi8uZHNoIFx1MjAxNFx1MjAxNCBcdTRFMEVcdTVCOThcdTY1QjkgZHNoIENMSSBcdTVCOENcdTUxNjhcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTVERjJcdTY3MDlcdTkxNERcdTdGNkUvXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURzaEhvbWUoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAnZHNoSG9tZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKClcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgcmV0dXJuIHMuZHNoSG9tZS50cmltKCkgfHwgcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbiAgfVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcpIHtcbiAgICBjb25zdCBuYW1lID0gdmF1bHRSb290ID8gYCR7c2FmZVZhdWx0TmFtZSh2YXVsdFJvb3QpfS0ke3N0YWJsZUhhc2godmF1bHRSb290KX1gIDogJ3ZhdWx0J1xuICAgIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnLCAndmF1bHRzJywgbmFtZSlcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbn1cblxuLyoqXG4gKiBcdThCQTFcdTdCOTdcdTY3MkMgdmF1bHQgXHU3Njg0XHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHUzMDAyXG4gKiAtIHNoYXJlZCAvIGN1c3RvbVx1RkYxQXNldHRpbmdzLnBvcnRcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOVx1MjAxNFx1MjAxNCBcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU1NDBDXHU0RTAwXHU2NzBEXHU1MkExXHU0RTBFXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQXNldHRpbmdzLnBvcnQgKyAoc3RhYmxlSGFzaCAlIDQwOTYpIFx1MjAxNFx1MjAxNCBcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3MkVDXHU1MzYwXHU3QUVGXHU1M0UzXHVGRjBDXHU1NDA0XHU4MUVBXG4gKiAgIHNwYXduIFx1NzJFQ1x1N0FDQlx1NzY4NCBkc2ggXHU4RkRCXHU3QTBCXHVGRjFCXHU5MTREXHU1NDA4XHU3MkVDXHU3QUNCXHU3Njg0IERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREXHU1QjU4XHU1MEE4XHU2ODM5XHVGRjA5XHVGRjBDXHU0RTBEXHU1NDBDIHZhdWx0IFx1NzY4NFxuICogICBcdTRGMUFcdThCRERcdTVCOENcdTUxNjhcdTk2OTRcdTc5QkJcdUZGMENcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdTMwMDJcdTdBRUZcdTUzRTNcdTUxQjJcdTdBODFcdTY5ODJcdTczODcgfjEvNDA5Nlx1RkYwQ1x1NTNFRlx1NjNBNVx1NTNEN1x1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVBvcnQoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAncG9ydCc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludChzdGFibGVIYXNoKHZhdWx0Um9vdCksIDM2KSAlIDQwOTZcbiAgICByZXR1cm4gcy5wb3J0ICsgb2Zmc2V0XG4gIH1cbiAgcmV0dXJuIHMucG9ydFxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODRcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NTE3MVx1NzUyOFx1NEUwMFx1NEVGRFx1RkYwQ1x1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1RkYwOVx1MzAwMlxuICogLSBzaGFyZWRcdUZGMUFkc2hIb21lIFx1ODFFQVx1OEVBQlx1NTM3M1x1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwQ1x1NjVFMFx1OTcwMFx1NTE3MVx1NEVBQlx1NUM0Mlx1RkYxQlxuICogLSBjdXN0b21cdUZGMUFcdTc1MjhcdTYyMzdcdTYzMDdcdTVCOUFcdThERUZcdTVGODRcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMENcdTY1RTBcdTk3MDBcdTUxNzFcdTRFQUJcdTVDNDJcdUZGMUJcbiAqIC0gcGVyLXZhdWx0XHVGRjFBXHU4RkQ0XHU1NkRFXHU1MTcxXHU0RUFCIGB+Ly5kc2hgXHVGRjBDXHU4QkE5XHU2QkNGXHU0RTJBIHZhdWx0IFx1NzY4NCBzZXR0aW5ncy9jcmVkZW50aWFsc1xuICogICBcdTYzMDdcdTU2REVcdTVCODMgXHUyMDE0XHUyMDE0IFx1OTE0RFx1NEUwMFx1NkIyMVx1NTE2OCB2YXVsdCBcdTc1MUZcdTY1NDhcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcgJiYgdmF1bHRSb290KSB7XG4gICAgcmV0dXJuIHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZHNoJylcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERzaERvY2tQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogRHNoRG9ja1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HU1xuICBwcml2YXRlIHByb2M6IENoaWxkUHJvY2VzcyB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgc3RhdHVzOiBTZXJ2ZXJTdGF0dXMgPSB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHByaXZhdGUgc3RhcnRpbmcgPSBmYWxzZVxuICBwcml2YXRlIHN0YXR1c0JhckVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgc3RhdHVzTGlzdGVuZXJzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpXG4gIC8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUxOTlcdTUxNjVcdTk2MzJcdTYyOTYgdGltZXJcdUZGMDhcdTdBOTdcdTUzRTMgZm9jdXMgXHU1M0VGXHU4MEZEXHU5QUQ4XHU5ODkxXHU4OUU2XHU1M0QxXHVGRjA5ICovXG4gIHByaXZhdGUgbWFya2VyVGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IG51bGxcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKClcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KERTSF9XRUJfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IERzaFdlYlZpZXcobGVhZiwgdGhpcykpXG5cbiAgICAvLyBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdUZGMUFcdTY3MkNcdTdBOTdcdTUzRTNcdTYyNTNcdTVGMDBcdUZGMDhvbmxvYWRcdUZGMDlcdTRFMEVcdTZCQ0ZcdTZCMjFcdTgzQjdcdTVGOTdcbiAgICAvLyBcdTcxMjZcdTcwQjlcdTY1RjZcdTUyMzdcdTY1QjBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTMwMDJcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdTRFMEJcdTZCQ0ZcdTRFMkFcdTdBOTdcdTUzRTNcdTkwRkRcdTcyRUNcdTdBQ0JcdTUyQTBcdThGN0RcdTY3MkNcdTYzRDJcdTRFRjZcdUZGMENcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcbiAgICAvLyBcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTUzNzNcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1x1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHUzMDAyXG4gICAgdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICBjb25zdCBvbldpbmRvd0ZvY3VzID0gKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbldpbmRvd0ZvY3VzKVxuICAgIHRoaXMucmVnaXN0ZXIoKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25XaW5kb3dGb2N1cykpXG4gICAgLy8gXHU4ODY1XHU1MTQ1XHU0RkUxXHU1M0Y3XHVGRjFBXHU3NTI4XHU2MjM3XHU1NzI4XHU3QTk3XHU1M0UzXHU1MTg1XHU1MjA3XHU2MzYyXHU2NTg3XHU0RUY2L1x1NUUwM1x1NUM0MFx1NUZDNVx1NzEzNlx1ODlFNlx1NTNEMSBhY3RpdmUtbGVhZi1jaGFuZ2VcdUZGMENcbiAgICAvLyBcdTg5ODZcdTc2RDYgd2luZG93IGZvY3VzIFx1NEU4Qlx1NEVGNlx1NEUwRFx1NkQzRVx1NTNEMVx1NzY4NFx1NTczQVx1NjY2Rlx1MzAwMlx1OTYzMlx1NjI5Nlx1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQSB0aW1lclx1RkYwQ1x1NEU5Mlx1NEUwRFx1NUU3Mlx1NjI3MFx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2FjdGl2ZS1sZWFmLWNoYW5nZScsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignYm90JywgJ0RTSCBEb2NrXHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJywgKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLXBhbmVsJyxcbiAgICAgIG5hbWU6ICdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3RicsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RhcnQtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTU0MkZcdTUyQTggRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0YXJ0KCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdG9wLWRzaCcsXG4gICAgICBuYW1lOiAnXHU1MDVDXHU2QjYyIERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdG9wKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1icm93c2VyJyxcbiAgICAgIG5hbWU6ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAgRFNIJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlbkluQnJvd3NlcigpLFxuICAgIH0pXG5cbiAgICB0aGlzLnN0YXR1c0JhckVsID0gdGhpcy5hZGRTdGF0dXNCYXJJdGVtKClcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEc2hEb2NrU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKVxuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b3N0YXJ0KSB7XG4gICAgICB2b2lkIHRoaXMuc3RhcnQoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9udW5sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc3RvcCgpXG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2xlYXIoKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NzJCNlx1NjAwMVxuXG4gIGdldFN0YXR1cygpOiBTZXJ2ZXJTdGF0dXMge1xuICAgIHJldHVybiB0aGlzLnN0YXR1c1xuICB9XG5cbiAgZ2V0IGNoaWxkUHJvYygpOiBDaGlsZFByb2Nlc3MgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5wcm9jXG4gIH1cblxuICBnZXQgYmFzZVVybCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhdWx0Um9vdCA9IHRoaXMudmF1bHRSb290KClcbiAgICBjb25zdCBwb3J0ID0gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgIHJldHVybiBgaHR0cDovLyR7dGhpcy5zZXR0aW5ncy5ob3N0fToke3BvcnR9L2BcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjA4XHU2NUUwXHU1MjE5IHVuZGVmaW5lZFx1RkYwOSAqL1xuICBwcml2YXRlIHZhdWx0Um9vdCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiAodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH0pLmdldEJhc2VQYXRoPy4oKVxuICB9XG5cbiAgb25TdGF0dXNDaGFuZ2UoZm46ICgpID0+IHZvaWQpOiAoKSA9PiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1c0xpc3RlbmVycy5hZGQoZm4pXG4gICAgcmV0dXJuICgpID0+IHRoaXMuc3RhdHVzTGlzdGVuZXJzLmRlbGV0ZShmbilcbiAgfVxuXG4gIHByaXZhdGUgc2V0U3RhdHVzKHN0YXR1czogU2VydmVyU3RhdHVzKTogdm9pZCB7XG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXNcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgZm9yIChjb25zdCBmbiBvZiB0aGlzLnN0YXR1c0xpc3RlbmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm4oKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhdHVzQmFyKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5zdGF0dXNCYXJFbCkgcmV0dXJuXG4gICAgY29uc3QgcyA9IHRoaXMuc3RhdHVzXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoYERTSDogJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJ1x1RkYwOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOScgOiAnJ31gKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTY3MkFcdThGRDBcdTg4NEMnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgwN1x1OEJCMFxuXG4gIC8qKiBcdThCRkJcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1RTc2XHU1MTk5XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjA4XHU5NjMyXHU2Mjk2IDMwMG1zXHVGRjBDXHU5MDdGXHU1MTREIGZvY3VzIFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1NTNDRFx1NTkwRFx1NTE5OVx1NzZEOFx1RkYwOSAqL1xuICByZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm1hcmtlclRpbWVyKSBjbGVhclRpbWVvdXQodGhpcy5tYXJrZXJUaW1lcilcbiAgICB0aGlzLm1hcmtlclRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgpXG4gICAgfSwgMzAwKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuXG4gIC8qKiBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NjMwMlx1NjNBNVx1RkYxQlx1NTQyNlx1NTIxOSBzcGF3biBcdTVCOThcdTY1QjkgZHNoIHdlYiAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xuICAgIGlmICh0aGlzLnN0YXJ0aW5nKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICB0aGlzLnN0YXJ0aW5nID0gdHJ1ZVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0YXJ0aW5nJyB9KVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgICBjb25zdCBkc2hIb21lID0gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHNoYXJlZENvbmZpZ1Jvb3QgPSBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgaG9zdDogdGhpcy5zZXR0aW5ncy5ob3N0LFxuICAgICAgICBkc2hIb21lLFxuICAgICAgICAvLyBwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHUzMDAyXG4gICAgICAgIC4uLihzaGFyZWRDb25maWdSb290ID8geyBzaGFyZWRDb25maWdSb290IH0gOiB7fSksXG4gICAgICAgIHVzZUVtYmVkZGVkTm9kZTogdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUsXG4gICAgICAgIC8vIFx1NTQyRlx1NTJBOFx1NjVGNlx1NjI4QVx1NUY1M1x1NTI0RCB2YXVsdCBcdTRFMDBcdTVFNzZcdTZDRThcdTUxNjVcdTVCNTBcdThGREJcdTdBMEIgZW52XHVGRjBDXHU0RjVDXHU0RTNBXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU0RTRCXHU1OTE2XHU3Njg0XHU3QjJDXHU0RThDXHU5MDFBXHU5MDUzXG4gICAgICAgIC8vIFx1RkYwOFx1NjcwRFx1NTJBMVx1NTIxQVx1NjJDOVx1OEQ3N1x1MzAwMVx1NjgwN1x1OEJCMFx1NUMxQVx1NjcyQVx1NTIzN1x1NjVCMFx1NjVGNlx1NTE1Q1x1NUU5NVx1RkYwOVx1MzAwMlxuICAgICAgICBlbnY6IHZhdWx0SW5mb1xuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfTkFNRTogdmF1bHRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgIERTSF9PQlNJRElBTl9WQVVMVF9QQVRIOiB2YXVsdEluZm8ucGF0aCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9LFxuICAgICAgfSlcbiAgICAgIHRoaXMucHJvYyA9IHJlc3VsdC5wcm9jID8/IG51bGxcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiByZXN1bHQucHJvYykge1xuICAgICAgICB0aGlzLmhvb2tDaGlsZExvZ3MocmVzdWx0LnByb2MpXG4gICAgICB9XG4gICAgICB0aGlzLnNldFN0YXR1cyhyZXN1bHQuc3RhdHVzKVxuICAgICAgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke3Jlc3VsdC5zdGF0dXMubWVzc2FnZX1gKVxuICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhcmVzdWx0LnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggV2ViIFx1NURGMlx1NUMzMVx1N0VFQTogJHtyZXN1bHQuc3RhdHVzLnVybH1gKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IG1zZyB9KVxuICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NUYwMlx1NUUzODogJHttc2d9YClcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXR1c1xuICB9XG5cbiAgYXN5bmMgc3RvcCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICBpZiAodGhpcy5wcm9jKSB7XG4gICAgICBhd2FpdCBzdG9wUHJvY2Vzcyh0aGlzLnByb2MpXG4gICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgfVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0b3BwZWQnIH0pXG4gIH1cblxuICBwcml2YXRlIGhvb2tDaGlsZExvZ3MocHJvYzogQ2hpbGRQcm9jZXNzKTogdm9pZCB7XG4gICAgcHJvYy5zdGRvdXQ/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS5pbmZvKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUud2FybignW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhdGhpcy5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBOiBjb2RlPSR7Y29kZX0gc2lnbmFsPSR7c2lnbmFsID8/ICcnfWAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tkc2gtZG9ja10gXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGJywgZXJyKVxuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRjogJHtlcnIubWVzc2FnZX1gIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKiBcdTYzQTJcdTZENEJcdTRGRTFcdTYwNkZcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZGV0ZWN0SW5mbygpOiB7IGRzaEJpbjogc3RyaW5nIHwgbnVsbDsgZHNoTm90ZXM6IHN0cmluZ1tdOyBub2RlTm90ZXM6IHN0cmluZ1tdIH0ge1xuICAgIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbih0aGlzLnNldHRpbmdzLmRzaEJpbilcbiAgICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4odGhpcy5zZXR0aW5ncy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKVxuICAgIHJldHVybiB7XG4gICAgICBkc2hCaW46IGZvdW5kLmJpbixcbiAgICAgIGRzaE5vdGVzOiBmb3VuZC5ub3RlcyxcbiAgICAgIG5vZGVOb3Rlczogbm9kZS5ub3RlcyxcbiAgICB9XG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0IERTSF9IT01FXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGVmZmVjdGl2ZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTdBRUZcdTUzRTNcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOSAqL1xuICBlZmZlY3RpdmVQb3J0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRiA9IH4vLmRzaFx1RkYwQ1x1NTE3Nlx1NEY1OVx1NjVFMFx1RkYwOSAqL1xuICBlZmZlY3RpdmVTaGFyZWRDb25maWdSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGRhdGEgPz8ge30pXG4gICAgLy8gXHU2NUU3XHU3MjQ4XHVGRjA4ZHNoLWhvc3QgVjAuMVx1RkYwOVx1OEJCRVx1N0Y2RVx1OEZDMVx1NzlGQlx1RkYxQWRzaEhvbWUgXHU1QjU3XHU3QjI2XHU0RTMyIFx1MjE5MiBjdXN0b20gXHU2QTIxXHU1RjBGXG4gICAgY29uc3QgbGVnYWN5ID0gZGF0YSBhcyB7IGRzaEhvbWU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZFxuICAgIGlmIChsZWdhY3k/LmRzaEhvbWUgJiYgdHlwZW9mIGxlZ2FjeS5kc2hIb21lID09PSAnc3RyaW5nJyAmJiBsZWdhY3kuZHNoSG9tZS50cmltKCkpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSAnY3VzdG9tJ1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lID0gbGVnYWN5LmRzaEhvbWUudHJpbSgpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBVSVxuXG4gIGFzeW5jIG9wZW5QYW5lbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHBcbiAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERTSF9XRUJfVklFV19UWVBFKVxuICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IGxlYXZlc1swXSA/PyBudWxsXG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSlcbiAgICAgIGlmICghbGVhZikgcmV0dXJuXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9XG4gICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZilcbiAgfVxuXG4gIGFzeW5jIG9wZW5JbkJyb3dzZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBzaGVsbCB9ID0gcmVxdWlyZSgnZWxlY3Ryb24nKSBhcyB7IHNoZWxsOiB7IG9wZW5FeHRlcm5hbCh1cmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gfSB9XG4gICAgYXdhaXQgc2hlbGwub3BlbkV4dGVybmFsKHRoaXMuYmFzZVVybClcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhPYnNpZGlhbiBwb3BvdXRcdUZGMDlcdUZGMUFEU0ggXHU5NzYyXHU2NzdGXHU4RkRCXHU1MTY1XHU3MkVDXHU3QUNCIEJyb3dzZXJXaW5kb3cgPVxuICAgKiBcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTRFMEUgT2JzaWRpYW4gXHU0RTNCXHU3QTk3XHU1M0UzXHU5Njk0XHU3OUJCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHU2ODA3XHU3QjdFXHU5ODc1XHUzMDAyXG4gICAqL1xuICBhc3luYyBvcGVuUG9wb3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLm9wZW5Qb3BvdXRMZWFmKClcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICBuZXcgTm90aWNlKGBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdTU5MzFcdThEMjU6ICR7bXNnfWApXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBsYXVuY2hlci50cyBcdTIwMTRcdTIwMTQgXHU3RUFGXHU1NDJGXHU1MkE4XHU5MDNCXHU4RjkxXHVGRjA4XHU5NkY2IE9ic2lkaWFuIFx1NEY5RFx1OEQ1Nlx1RkYwQ1x1NTNFRlx1NzJFQ1x1N0FDQlx1NTE5Mlx1NzBERlx1NkQ0Qlx1OEJENVx1RkYwOVx1MzAwMlxuICpcbiAqIFx1ODA0Q1x1OEQyM1x1RkYxQVx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYgXHUyMTkyIHNwYXduIGBkc2ggd2ViYFxuICogXHVGRjA4MTI3LjAuMC4xOjxwb3J0Plx1RkYwOVx1MjE5MiBcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUEgXHUyMTkyIFx1NTA1Q1x1NkI2Mlx1MzAwMlxuICpcbiAqIFx1NTE3M1x1OTUyRVx1NEU4Qlx1NUI5RVx1RkYwOFx1NURGMlx1NTcyOFx1NUI5OFx1NjVCOSBAZGVlcHNlZWstYWkvZHNoQDAuMS4wLXJjLjYgXHU0RTBBXHU5QThDXHU4QkMxXHVGRjA5XHVGRjFBXG4gKiAtIGBub2RlIDxkc2g+L2xpYi9iaW4uanMgd2ViIC0taG9zdCAxMjcuMC4wLjEgLS1wb3J0IDxwb3J0PmAgXHU1MzczXHU1Qjk4XHU2NUI5IFdlYiBVSVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTQgaG9zdD0xMjcuMC4wLjFcdTMwMDFwb3J0PTMwODBcdUZGMDhcdTUzRUZcdTg5ODZcdTc2RDZcdUZGMDlcdUZGMUJcbiAqIC0gXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU4MUVBXHU1MkE4XHU1MjFEXHU1OUNCXHU1MzE2ICREU0hfSE9NRS9wcm9maWxlcy93ZWJcdUZGMDhidW5kbGVzID0gZHNoLWJhc2UgKyBkc2gtd2ViLWFwcFx1RkYwOVx1RkYwQ1xuICogICBcdTZBMjFcdTU3NTdcdTg5RTNcdTY3OTBcdThENzAgJERTSF9IT01FL3Byb2ZpbGVzL25vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTdCMjZcdTUzRjdcdTk0RkVcdTYzQTVcdUZGMENcdTY1RTBcdTk3MDAgcG5wbS9cdTgwNTRcdTdGNTFcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0XHU5MTREXHU3RjZFXHU0RTBCIFNRTGl0ZVx1RkYwOG5vZGU6c3FsaXRlXHVGRjBDXHU5NzAwIE5vZGUgXHUyMjY1MjIuNVx1RkYwOVx1NEUwRFx1NEYxQVx1NjI1M1x1NUYwMFx1RkYwOG9wZW5BdDogbmV2ZXJcdUZGMDlcdUZGMENcbiAqICAgXHU1NkUwXHU2QjY0IE5vZGUgMjArIFx1NEU1Rlx1ODBGRFx1OEREMVx1OUVEOFx1OEJBNCB3ZWIgcHJvZmlsZVx1RkYxQlx1NTQyRlx1NzUyOFx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NjVGNlx1NjI0RFx1OTcwMFx1ODk4MSBOb2RlIFx1MjI2NTIyLjVcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBzcGF3biwgc3Bhd25TeW5jLCB0eXBlIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCdcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5leHBvcnQgY29uc3QgRFNIX1JFTEFUSVZFX0JJTiA9IHBhdGguam9pbignQGRlZXBzZWVrLWFpJywgJ2RzaCcsICdsaWInLCAnYmluLmpzJylcblxuLyoqIE5vZGUgXHU0RTNCXHU3MjQ4XHU2NzJDXHU1M0Y3XHU2QkQ0XHU4RjgzXHVGRjFBbm9kZTpzcWxpdGUgXHU5NzAwXHU4OTgxIFx1MjI2NTIyLjVcdUZGMDhcdTRFQzVcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTUyOUZcdTgwRkRcdTc1MjhcdTUyMzBcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBOT0RFX1NRTElURV9NSU5fTUFKT1IgPSAyMlxuXG4vKiogXHU3QTMzXHU1QjlBXHU3N0VEXHU1NEM4XHU1RTBDXHVGRjA4ZGpiMlx1RkYwOVx1RkYwQ1x1NzUyOFx1NEU4RSB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdTZEODhcdTZCNjdcdUZGMENcdTkwN0ZcdTUxNERcdTRFMkRcdTY1ODdcdTU0MERcdTZFMDVcdTZEMTdcdTc4QjBcdTY0OUUgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFibGVIYXNoKGlucHV0OiBzdHJpbmcsIGxlbiA9IDYpOiBzdHJpbmcge1xuICBsZXQgaCA9IDUzODFcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykgaCA9ICgoaCA8PCA1KSArIGggKyBpbnB1dC5jaGFyQ29kZUF0KGkpKSA+Pj4gMFxuICByZXR1cm4gaC50b1N0cmluZygzNikucGFkU3RhcnQobGVuLCAnMCcpLnNsaWNlKDAsIGxlbilcbn1cblxuLyoqIFx1NTNFRlx1OEJGQlx1NzY4NCB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdUZGMDhcdTRGRERcdTc1NTkgVW5pY29kZSBcdTVCNTdcdTZCQ0RcdTY1NzBcdTVCNTdcdUZGMENcdTUxNzZcdTRGNTlcdThGNkMgLVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOSAndmF1bHQnICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZVZhdWx0TmFtZSh2YXVsdFJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNsZWFuZWQgPSBwYXRoXG4gICAgLmJhc2VuYW1lKHZhdWx0Um9vdClcbiAgICAucmVwbGFjZSgvW15cXHB7TH1cXHB7Tn1fLV0rL2d1LCAnLScpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgJycpXG4gIHJldHVybiAoY2xlYW5lZCB8fCAndmF1bHQnKS5zbGljZSgwLCA0MClcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hPcHRpb25zIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1x1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbj86IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTkgKi9cbiAgbm9kZUJpbj86IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydD86IG51bWJlclxuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTQgMTI3LjAuMC4xXHVGRjBDXHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q/OiBzdHJpbmdcbiAgLyoqICREU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERC9cdTVCQzZcdTk0QTUvXHU2QTIxXHU1NzhCXHU5MTREXHU3RjZFXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjFCXHU5RUQ4XHU4QkE0IDx2YXVsdD4vLmRzaFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqXG4gICAqIFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODQgYH4vLmRzaGBcdUZGMDlcdUZGMUFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1N0Y2RVx1N0M3Qlx1NjU4N1x1NEVGNlxuICAgKiBcdTYzMDdcdTU0MTFcdTZCNjRcdTc2RUVcdTVGNTVcdUZGMENcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU0RTAwXHU0RUZEXHVGRjFCc2Vzc2lvbnMgXHU3QjQ5XHU2NTcwXHU2MzZFXHU0RUNEXHU1NzI4IGBkc2hIb21lYCBcdTk2OTRcdTc5QkJcdTMwMDJcbiAgICogXHU3NTU5XHU3QTdBID0gXHU0RTBEXHU1NDJGXHU3NTI4XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4ZHNoSG9tZSBcdTgxRUFcdThFQUJcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDlcdTMwMDJcbiAgICovXG4gIHNoYXJlZENvbmZpZ1Jvb3Q/OiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlPzogYm9vbGVhblxuICAvKiogXHU1QzMxXHU3RUVBXHU3QjQ5XHU1Rjg1XHU0RTBBXHU5NjUwXHVGRjA4XHU5RUQ4XHU4QkE0IDEyMHNcdUZGMDkgKi9cbiAgdGltZW91dE1zPzogbnVtYmVyXG4gIC8qKiBcdTk2NDRcdTUyQTBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgKi9cbiAgZW52PzogTm9kZUpTLlByb2Nlc3NFbnZcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZE5vZGUge1xuICAvKiogXHU3NTI4XHU0RThFIHNwYXduIFx1NzY4NCBub2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNiAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTYyOEEgT2JzaWRpYW4gXHU3Njg0IEVsZWN0cm9uIFx1NEU4Q1x1OEZEQlx1NTIzNlx1NUY1MyBOb2RlIFx1NzUyOCAqL1xuICB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhblxuICAvKiogXHU4QkU1IE5vZGUgXHU3Njg0IG1ham9yIFx1NzI0OFx1NjcyQ1x1RkYwOFx1NjNBMlx1NkQ0Qlx1NTkzMVx1OEQyNVx1NEUzQSAwXHVGRjA5ICovXG4gIG5vZGVNYWpvcjogbnVtYmVyXG4gIC8qKiBcdTYzQTJcdTZENEIvXHU1MUIzXHU3QjU2XHU4QkY0XHU2NjBFXHVGRjA4XHU0RjlCXHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIG5vdGVzOiBzdHJpbmdbXVxufVxuXG5leHBvcnQgdHlwZSBTZXJ2ZXJTdGF0dXMgPVxuICB8IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgfCB7IGtpbmQ6ICdzdGFydGluZycgfVxuICB8IHsga2luZDogJ3J1bm5pbmcnOyBwb3J0OiBudW1iZXI7IGhvc3Q6IHN0cmluZzsgdXJsOiBzdHJpbmc7IGF0dGFjaGVkOiBib29sZWFuIH1cbiAgfCB7IGtpbmQ6ICdlcnJvcic7IG1lc3NhZ2U6IHN0cmluZyB9XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU4REVGXHU1Rjg0XHU1QjlBXHU0RjREXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFx1NjI4QVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1NTE2NVx1NTNFM1x1ODlDNFx1ODMwM1x1NTMxNlx1RkYxQVx1NjMwN1x1NTQxMSBiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTkwRkRcdTYzQTVcdTUzRDcgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVEc2hCaW4oaW5wdXQ6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCFpbnB1dCkgcmV0dXJuIG51bGxcbiAgY29uc3QgcCA9IGlucHV0LnRyaW0oKVxuICBpZiAoIXApIHJldHVybiBudWxsXG4gIGNvbnN0IGV4cGFuZGVkID0gcC5yZXBsYWNlKC9efig/PSR8XFwvfFxcXFwpLywgb3MuaG9tZWRpcigpKVxuICBjb25zdCBhYnMgPSBwYXRoLmlzQWJzb2x1dGUoZXhwYW5kZWQpID8gcGF0aC5ub3JtYWxpemUoZXhwYW5kZWQpIDogcGF0aC5yZXNvbHZlKGV4cGFuZGVkKVxuICB0cnkge1xuICAgIGNvbnN0IHN0ID0gZnMuc3RhdFN5bmMoYWJzKVxuICAgIGlmIChzdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4oYWJzLCAnbGliJywgJ2Jpbi5qcycpXG4gICAgICByZXR1cm4gZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpID8gY2FuZGlkYXRlIDogbnVsbFxuICAgIH1cbiAgICBpZiAoc3QuaXNGaWxlKCkpIHJldHVybiBhYnNcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKiogXHU1RTM4XHU4OUMxIG5wbSBcdTUxNjhcdTVDNDAgbm9kZV9tb2R1bGVzIFx1NjgzOVx1RkYwOFx1NjMwOVx1NUU3M1x1NTNGMFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdsb2JhbE1vZHVsZVJvb3RzKCk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgcm9vdHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKHByb2Nlc3MuZW52LkRTSF9HTE9CQUxfTU9EVUxFUykgcm9vdHMucHVzaChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpXG4gIGNvbnN0IG5wbVJvb3QgPSBzcGF3blN5bmMoJ25wbScsIFsncm9vdCcsICctZyddLCB7XG4gICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICB0aW1lb3V0OiAxMF8wMDAsXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG4gIGlmIChucG1Sb290LnN0YXR1cyA9PT0gMCAmJiBucG1Sb290LnN0ZG91dCkge1xuICAgIGNvbnN0IGxpbmUgPSBucG1Sb290LnN0ZG91dC50cmltKCkuc3BsaXQoL1xccj9cXG4vKVswXVxuICAgIGlmIChsaW5lKSByb290cy5wdXNoKGxpbmUpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgcm9vdHMucHVzaCgnL29wdC9ob21lYnJldy9saWIvbm9kZV9tb2R1bGVzJywgJy91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcycpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2xpbnV4Jykge1xuICAgIHJvb3RzLnB1c2goJy91c3IvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2xpYicsICdub2RlX21vZHVsZXMnKSlcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgY29uc3QgYXBwRGF0YSA9IHByb2Nlc3MuZW52LkFQUERBVEFcbiAgICBpZiAoYXBwRGF0YSkgcm9vdHMucHVzaChwYXRoLmpvaW4oYXBwRGF0YSwgJ25wbScsICdub2RlX21vZHVsZXMnKSlcbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KHJvb3RzKV1cbn1cblxuLyoqXG4gKiBcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTUxNjVcdTUzRTNcdTMwMDJcdTRGMThcdTUxNDhcdTdFQTdcdUZGMUFcbiAqIDEuIFx1NjYzRVx1NUYwRlx1NEYyMFx1NTE2NVx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1RkYwOVx1MjE5MiAyLiBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgRFNIX0JJTiBcdTIxOTIgMy4gbnBtIHJvb3QgLWcgXHUyMTkyIDQuIFx1NUUzOFx1ODlDMVx1NTE2OFx1NUM0MFx1NjgzOVx1MzAwMlxuICogXHU2NzJBXHU2MjdFXHU1MjMwXHU2NUY2IGJpbiBcdTRFM0EgbnVsbFx1RkYwQ25vdGVzIFx1OEJGNFx1NjYwRVx1NTM5Rlx1NTZFMFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURzaEJpbihleHBsaWNpdD86IHN0cmluZyk6IHsgYmluOiBzdHJpbmcgfCBudWxsOyBub3Rlczogc3RyaW5nW10gfSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gbm9ybWFsaXplRHNoQmluKGV4cGxpY2l0ID8/IHByb2Nlc3MuZW52LkRTSF9CSU4pXG4gIGlmIChleHBsaWNpdEJpbiAmJiBmcy5leGlzdHNTeW5jKGV4cGxpY2l0QmluKSkge1xuICAgIHJldHVybiB7IGJpbjogZXhwbGljaXRCaW4sIG5vdGVzOiBbYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NDogJHtleHBsaWNpdEJpbn1gXSB9XG4gIH1cbiAgaWYgKGV4cGxpY2l0KSBub3Rlcy5wdXNoKGBcdTY2M0VcdTVGMEZcdThERUZcdTVGODRcdTRFMERcdTVCNThcdTU3Mjg6ICR7ZXhwbGljaXR9YClcblxuICBmb3IgKGNvbnN0IHJvb3Qgb2YgZ2xvYmFsTW9kdWxlUm9vdHMoKSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihyb290LCBEU0hfUkVMQVRJVkVfQklOKVxuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHJldHVybiB7IGJpbjogY2FuZGlkYXRlLCBub3RlczogWy4uLm5vdGVzLCBgXHU0RUNFXHU1MTY4XHU1QzQwXHU2QTIxXHU1NzU3XHU2ODM5XHU1M0QxXHU3M0IwOiAke2NhbmRpZGF0ZX1gXSB9XG4gICAgfVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NjcyQVx1NjI3RVx1NTIzMCBkc2ggXHU1Qjg5XHU4OEM1XHUzMDAyXHU4QkY3XHU1MTQ4XHU2MjY3XHU4ODRDOiBucG0gaW5zdGFsbCAtZyBAZGVlcHNlZWstYWkvZHNoXHVGRjBDXHU2MjE2XHU1NzI4XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IGRzaCBcdThERUZcdTVGODQnKVxuICByZXR1cm4geyBiaW46IG51bGwsIG5vdGVzIH1cbn1cblxuLyoqXG4gKiBcdTVFMzhcdTg5QzEgTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMENcdTYzQTJcdTZENEJcdTc1MjhcdUZGMDlcdTMwMDJcbiAqIE9ic2lkaWFuIFx1NEY1Q1x1NEUzQSBHVUkgXHU1RTk0XHU3NTI4XHU0RUNFIEZpbmRlciBcdTU0MkZcdTUyQThcdTY1RjZcdUZGMENQQVRIIFx1OTAxQVx1NUUzOFx1NTNFQVx1NjcwOVx1N0NGQlx1N0VERlx1NzZFRVx1NUY1NVxuICogXHVGRjA4L3Vzci9iaW46L2JpbjovdXNyL3NiaW46L3NiaW5cdUZGMDlcdUZGMENcdTRFMERcdTU0MkIgSG9tZWJyZXcgXHU3QjQ5XHU3NTI4XHU2MjM3XHU1Qjg5XHU4OEM1XHU3NkVFXHU1RjU1XHVGRjBDXG4gKiBcdTU2RTBcdTZCNjQgc3Bhd24oJ25vZGUnKSBcdTRGMUFcdTc2RjRcdTYzQTUgRU5PRU5UXHUzMDAyXHU4RkQ5XHU5MUNDXHU2MjhBXHU1RTM4XHU4OUMxXHU1Qjg5XHU4OEM1XHU0RjREXHU3RjZFXHU4ODY1XHU5RjUwXHVGRjFBXG4gKiAtIFBBVEggXHU0RTJEXHU3Njg0IG5vZGVcdUZGMDhzaGVsbCBcdTkxQ0NcdThGRDBcdTg4NENcdTY1RjZcdTVCNThcdTU3MjhcdUZGMDlcdUZGMUJcbiAqIC0gbWFjT1M6IC9vcHQvaG9tZWJyZXcvYmluL25vZGVcdUZGMDhBcHBsZSBTaWxpY29uXHVGRjA5XHUzMDAxL3Vzci9sb2NhbC9iaW4vbm9kZVx1RkYwOEludGVsXHVGRjA5XHVGRjFCXG4gKiAtIExpbnV4OiAvdXNyL2Jpbi9ub2RlXHUzMDAxL3Vzci9sb2NhbC9iaW4vbm9kZVx1MzAwMX4vLmxvY2FsL2Jpbi9ub2RlXHVGRjFCXG4gKiAtIFdpbmRvd3M6IFx1OTAxQVx1OEZDNyBgd2hlcmUgbm9kZWAgXHU4OUUzXHU2NzkwXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21tb25Ob2RlQmlucygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGJpbnM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgcGF0aEVudiA9IHByb2Nlc3MuZW52LlBBVEggPz8gJydcbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aEVudi5zcGxpdChwYXRoLmRlbGltaXRlcikpIHtcbiAgICBpZiAoZGlyLnRyaW0oKSkgYmlucy5wdXNoKHBhdGguam9pbihkaXIsICdub2RlJykpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgYmlucy5wdXNoKCcvb3B0L2hvbWVicmV3L2Jpbi9ub2RlJywgJy91c3IvbG9jYWwvYmluL25vZGUnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICBiaW5zLnB1c2goJy91c3IvYmluL25vZGUnLCAnL3Vzci9sb2NhbC9iaW4vbm9kZScsIHBhdGguam9pbihvcy5ob21lZGlyKCksICcubG9jYWwnLCAnYmluJywgJ25vZGUnKSlcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHdoZXJlID0gc3Bhd25TeW5jKCd3aGVyZScsIFsnbm9kZSddLCB7IGVuY29kaW5nOiAndXRmOCcsIHRpbWVvdXQ6IDEwXzAwMCwgd2luZG93c0hpZGU6IHRydWUgfSlcbiAgICAgIGlmICh3aGVyZS5zdGF0dXMgPT09IDAgJiYgd2hlcmUuc3Rkb3V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiB3aGVyZS5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLykpIHtcbiAgICAgICAgICBpZiAobGluZS50cmltKCkpIGJpbnMucHVzaChsaW5lLnRyaW0oKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICB9XG4gIC8vIFx1NTNCQlx1OTFDRFx1NEZERFx1NUU4Rlx1RkYwQ1x1NEZERFx1NzU1OVx1N0IyQ1x1NEUwMFx1NEUyQVx1NUI1OFx1NTcyOFx1NzY4NFxuICByZXR1cm4gWy4uLm5ldyBTZXQoYmlucyldXG59XG5cbi8qKlxuICogXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2XHUzMDAyXG4gKiBcdTlFRDhcdThCQTRcdTk4N0FcdTVFOEZcdUZGMUFcdTY2M0VcdTVGMEZcdThERUZcdTVGODQgXHUyMTkyIFx1N0NGQlx1N0VERiBgbm9kZWBcdUZGMDhQQVRIICsgXHU1RTM4XHU4OUMxXHU1Qjg5XHU4OEM1XHU4REVGXHU1Rjg0XHVGRjBDXHU4RkQ0XHU1NkRFXHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXG4gKiBcdTkwN0ZcdTUxNEQgT2JzaWRpYW4gR1VJIFx1NzNBRlx1NTg4MyBQQVRIIFx1N0YzQVx1NTkzMVx1NUJGQ1x1ODFGNCBzcGF3biBFTk9FTlRcdUZGMDlcdTIxOTIgXHU2MjdFXHU0RTBEXHU1MjMwXHU2NUY2XHU3RUQ5XHU1MUZBXHU2NjBFXHU3ODZFXHU5NTE5XHU4QkVGXHUzMDAyXG4gKiBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgXHU1QjlFXHU2RDRCXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjA4T2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XG4gKiBcdTRFMERcdTYzMDlcdTY2NkVcdTkwMUEgRWxlY3Ryb24gXHU4QkVEXHU0RTQ5XHU1NENEXHU1RTk0XHVGRjA5XHVGRjBDXHU1NkUwXHU2QjY0XHU0RUM1XHU1RjUzIHVzZUVtYmVkZGVkTm9kZSBcdTY2M0VcdTVGMEZcdTVGMDBcdTU0MkZcdTY1RjZcdTYyNERcdTVDMURcdThCRDVcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVOb2RlQmluKGV4cGxpY2l0Pzogc3RyaW5nLCBlbWJlZGRlZE5vZGVWZXJzaW9uPzogc3RyaW5nLCB1c2VFbWJlZGRlZCA9IGZhbHNlKTogUmVzb2x2ZWROb2RlIHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBleHBsaWNpdD8udHJpbSgpIHx8IHByb2Nlc3MuZW52LkRTSF9OT0RFXG4gIGlmIChleHBsaWNpdEJpbikge1xuICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRiBOb2RlOiAke2V4cGxpY2l0QmlufWApXG4gICAgcmV0dXJuIHsgbm9kZUJpbjogZXhwbGljaXRCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG4gIH1cbiAgaWYgKHVzZUVtYmVkZGVkICYmIHByb2Nlc3MuZXhlY1BhdGggJiYgZW1iZWRkZWROb2RlVmVyc2lvbikge1xuICAgIGNvbnN0IG1ham9yID0gTnVtYmVyKGVtYmVkZGVkTm9kZVZlcnNpb24uc3BsaXQoJy4nKVswXSkgfHwgMFxuICAgIGlmIChtYWpvciA+PSBOT0RFX1NRTElURV9NSU5fTUFKT1IpIHtcbiAgICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSAke2VtYmVkZGVkTm9kZVZlcnNpb259XHVGRjA4RUxFQ1RST05fUlVOX0FTX05PREVcdUZGMDlgKVxuICAgICAgcmV0dXJuIHsgbm9kZUJpbjogcHJvY2Vzcy5leGVjUGF0aCwgdXNlRWxlY3Ryb25Bc05vZGU6IHRydWUsIG5vZGVNYWpvcjogbWFqb3IsIG5vdGVzIH1cbiAgICB9XG4gICAgbm90ZXMucHVzaChgT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufSA8ICR7Tk9ERV9TUUxJVEVfTUlOX01BSk9SfVx1RkYwQ1x1NjVFMFx1NkNENVx1NTQyRlx1NzUyOGApXG4gIH1cbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY29tbW9uTm9kZUJpbnMoKSkge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOFx1N0NGQlx1N0VERiBOb2RlOiAke2NhbmRpZGF0ZX1gKVxuICAgICAgcmV0dXJuIHsgbm9kZUJpbjogY2FuZGlkYXRlLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICAgIH1cbiAgfVxuICBub3Rlcy5wdXNoKCdcdTY3MkFcdTYyN0VcdTUyMzAgTm9kZVx1MzAwMlx1OEJGN1x1NUI4OVx1ODhDNSBOb2RlXHVGRjA4aHR0cHM6Ly9ub2RlanMub3JnXHVGRjA5XHVGRjBDXHU2MjE2XHU1NzI4XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0JylcbiAgcmV0dXJuIHsgbm9kZUJpbjogJycsIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU3QUVGXHU1M0UzXHU2M0EyXHU2RDRCXHU0RTBFXHU3QjQ5XHU1Rjg1XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFx1NUY1M1x1NTI0RFx1OEZEMFx1ODg0Q1x1NzNBRlx1NTg4M1x1RkYwOE9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwOVx1ODFFQVx1NUUyNlx1NzY4NCBOb2RlIFx1NzI0OFx1NjcyQ1x1RkYxQlx1NjVFMFx1NTIxOSB1bmRlZmluZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWJlZGRlZE5vZGVWZXJzaW9uKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgdiA9IChwcm9jZXNzLnZlcnNpb25zIGFzIHsgbm9kZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkKT8ubm9kZVxuICAgIHJldHVybiB2IHx8IHVuZGVmaW5lZFxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBcdTdBRUZcdTUzRTNcdTY2MkZcdTU0MjZcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdTMwMDJcbiAqIFx1NzUyOCBub2RlOmh0dHAgXHU4MDBDXHU5NzVFXHU2RDRGXHU4OUM4XHU1NjY4IGZldGNoXHVGRjFBT2JzaWRpYW4gXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHU3Njg0IENTUCBcdTRGMUFcdTYyRTZcdTYyMkFcbiAqIFx1NUJGOSBodHRwOi8vMTI3LjAuMC4xIFx1NzY4NCBmZXRjaFx1RkYwQ1x1NUJGQ1x1ODFGNFwiXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXCJcdThCRUZcdTUyMjRcdTRFM0FcIlx1NkNBMVx1NjcwOVwiXHUzMDAyXG4gKiBOb2RlIFx1NzY4NCBodHRwIFx1NkEyMVx1NTc1N1x1NEUwRFx1NTNEN1x1OTg3NVx1OTc2MiBDU1AgXHU3RUE2XHU2NzVGXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BvcnRVcChob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTUwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCByZXEgPSBodHRwLmdldCh7IGhvc3QsIHBvcnQsIHBhdGg6ICcvJywgdGltZW91dDogdGltZW91dE1zIH0sIChyZXMpID0+IHtcbiAgICAgIHJlcy5yZXN1bWUoKVxuICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgIH0pXG4gICAgcmVxLm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgcmVxLmRlc3Ryb3koKVxuICAgICAgcmVzb2x2ZShmYWxzZSlcbiAgICB9KVxuICAgIHJlcS5vbignZXJyb3InLCAoKSA9PiByZXNvbHZlKGZhbHNlKSlcbiAgfSlcbn1cblxuLyoqIFx1OEY2RVx1OEJFMlx1N0I0OVx1NUY4NSBIVFRQIFx1NUMzMVx1N0VFQVx1RkYxQlx1OEQ4NVx1NjVGNlx1OEZENFx1NTZERSBmYWxzZSAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JSZWFkeShob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTIwXzAwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWFkbGluZSA9IERhdGUubm93KCkgKyB0aW1lb3V0TXNcbiAgZm9yICg7Oykge1xuICAgIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0LCAxNTAwKSkgcmV0dXJuIHRydWVcbiAgICBpZiAoRGF0ZS5ub3coKSA+IGRlYWRsaW5lKSByZXR1cm4gZmFsc2VcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA1MDApKVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hlZFNlcnZlciB7XG4gIHByb2M6IENoaWxkUHJvY2Vzc1xuICB1cmw6IHN0cmluZ1xuICAvKiogdHJ1ZSA9IFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwQ1x1NjcyQVx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQiAqL1xuICBhdHRhY2hlZDogYm9vbGVhblxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODRcIlx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlwiXHVGRjFBXHU2MjhBIHBlci12YXVsdCBEU0hfSE9NRSBcdTc2ODRcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1N0Y2RVxuICogXHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCIGB+Ly5kc2hgXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHU2NTcwXHU2MzZFXHUzMDAyXG4gKlxuICogXHU1MzlGXHU3NDA2XHVGRjFBZHNoIFx1NzY4NCBgc2V0dGluZ3NgXHVGRjA4QGRlZXBzZWVrLWFpL2RzaC1zZXR0aW5ncy1maWxlXHVGRjA5XHU0RTBFIGBjcmVkZW50aWFsc2BcbiAqIFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtY3JlZGVudGlhbHMtbG9jYWxcdUZGMDlcdTYzRDJcdTRFRjZcdTkwRkRcdTY1MkZcdTYzMDEgYHBhdGhgIFx1ODk4Nlx1NzZENlx1RkYwQ1x1OUVEOFx1OEJBNFx1OERFRlx1NUY4NFx1NjYyRlxuICogYDxkc2hIb21lPi9zZXR0aW5ncy55YW1sYCAvIGA8ZHNoSG9tZT4vLmNyZWRlbnRpYWxzLnlhbWxgXHUzMDAyXHU5MDFBXHU4RkM3XHU1NzI4IHBlci12YXVsdFxuICogcHJvZmlsZSBcdTc2ODQgYGNvcmRpcy5wYXRjaC55bWxgIFx1OTFDQ1x1NjI4QVx1OEZEOVx1NEUyNFx1NEUyQVx1NjNEMlx1NEVGNlx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlx1NjgzOVx1NzY4NFx1NjU4N1x1NEVGNlx1RkYwQ1x1NkEyMVx1NTc4Qlx1OTAwOVx1NjJFOVx1MzAwMVxuICogQVBJIFx1NUJDNlx1OTRBNVx1MzAwMVx1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1NEUwMFx1NkIyMVx1RkYwOFx1NTcyOFx1NEVGQlx1NjEwRiB2YXVsdCBcdTc2ODQgRFNIIFx1OTc2Mlx1Njc3Rlx1NjIxNlx1NzZGNFx1NjNBNVx1NjUzOSB+Ly5kc2hcdUZGMDlcdTUzNzNcdTUzRUZcdTUxNjhcbiAqIHZhdWx0IFx1NzUxRlx1NjU0OFx1RkYxQnNlc3Npb25zL3Byb2ZpbGVzL3N0b3JhZ2VzIFx1NEVDRFx1NzU1OVx1NTcyOCBwZXItdmF1bHQgZHNoSG9tZVx1RkYwQ1x1NEYxQVx1OEJERFx1OTY5NFx1NzlCQlxuICogXHU0RTBEXHU1M0Q3XHU1RjcxXHU1NENEXHUzMDAyXG4gKlxuICogXHU1RTQyXHU3QjQ5XHVGRjFBXHU2QkNGXHU2QjIxXHU1NDJGXHU1MkE4XHU5MEZEXHU5MUNEXHU1MTk5XHU0RTNBXHU1NDBDXHU0RTAwXHU0RUZEXHU1MTg1XHU1QkI5XHVGRjA4XHU1MzlGXHU1QjUwXHU1MTk5XHVGRjA5XHVGRjBDcHJvZmlsZSBcdTRFMERcdTVCNThcdTU3MjhcdTY1RjZcdTUxNDhcdTVFRkFcdTc2RUVcdTVGNTVcdUZGMUJcbiAqIFx1NTE3MVx1NEVBQlx1NjgzOVx1NjU4N1x1NEVGNlx1N0YzQVx1NTkzMVx1RkYwOFx1NEVDRVx1NjcyQVx1OTE0RFx1OEZDNyBzaGFyZWRcdUZGMDlcdTRFNUZcdTZDQTFcdTUxNzNcdTdDRkJcdUZGMENkc2ggXHU2MzA5XHU3QTdBXHU5MTREXHU3RjZFXHU1NDJGXHU1MkE4XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChkc2hIb21lOiBzdHJpbmcsIHNoYXJlZFJvb3Q6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXNoYXJlZFJvb3QgfHwgZHNoSG9tZSA9PT0gc2hhcmVkUm9vdCkgcmV0dXJuXG4gIHRyeSB7XG4gICAgY29uc3QgcHJvZmlsZURpciA9IHBhdGguam9pbihkc2hIb21lLCAncHJvZmlsZXMnLCAnd2ViJylcbiAgICBjb25zdCBwYXRjaEZpbGUgPSBwYXRoLmpvaW4ocHJvZmlsZURpciwgJ2NvcmRpcy5wYXRjaC55bWwnKVxuICAgIGNvbnN0IHNldHRpbmdzUGF0aCA9IHBhdGguam9pbihzaGFyZWRSb290LCAnc2V0dGluZ3MueWFtbCcpXG4gICAgY29uc3QgY3JlZGVudGlhbHNQYXRoID0gcGF0aC5qb2luKHNoYXJlZFJvb3QsICcuY3JlZGVudGlhbHMueWFtbCcpXG4gICAgY29uc3QgcGF0Y2ggPSBgIyBkc2gtZG9jayBcdTgxRUFcdTUyQThcdTdFRjRcdTYyQTRcdUZGMUFwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU0RjFBXHU4QkREXHU0RUNEXHU5Njk0XHU3OUJCXHVGRjA5XG4tIHVwZGF0ZTpcbiAgICAtIGlkOiBzZXR0aW5nc1xuICAgICAgY29uZmlnOlxuICAgICAgICBwYXRoOiAke3NldHRpbmdzUGF0aH1cbiAgICAtIGlkOiBjcmVkZW50aWFsc1xuICAgICAgY29uZmlnOlxuICAgICAgICBwYXRoOiAke2NyZWRlbnRpYWxzUGF0aH1cbmBcbiAgICBmcy5ta2RpclN5bmMocHJvZmlsZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGNoRmlsZSwgcGF0Y2gpXG4gICAgY29uc29sZS5pbmZvKGBbZHNoLWhvc3RdIHBlci12YXVsdCBcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUI6IHNldHRpbmdzL2NyZWRlbnRpYWxzIC0+ICR7c2hhcmVkUm9vdH1gKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtaG9zdF0gXHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCIHBhdGNoIFx1NTkzMVx1OEQyNVx1RkYwOFx1NUMwNlx1NjMwOSBwZXItdmF1bHQgXHU3MkVDXHU3QUNCXHU5MTREXHU3RjZFXHU1NDJGXHU1MkE4XHVGRjA5JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgZHNoIHdlYlx1MzAwMlx1OEMwM1x1NzUyOFx1NjVCOVx1OEQxRlx1OEQyM1x1NzZEMVx1NTQyQyBwcm9jIFx1NzY4NCBleGl0L2Vycm9yXHUzMDAyICovXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoRHNoKG9wdHM6IExhdW5jaE9wdGlvbnMgJiB7IGRzaEJpbjogc3RyaW5nOyBub2RlQmluOiBzdHJpbmc7IHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuIH0pOiBDaGlsZFByb2Nlc3Mge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCBhcmdzID0gW29wdHMuZHNoQmluLCAnd2ViJywgJy0taG9zdCcsIGhvc3QsICctLXBvcnQnLCBTdHJpbmcocG9ydCldXG4gIGNvbnN0IGVudjogTm9kZUpTLlByb2Nlc3NFbnYgPSB7XG4gICAgLi4uKG9wdHMuZW52ID8/IHByb2Nlc3MuZW52ID8/IHt9KSxcbiAgICBEU0hfSE9NRTogb3B0cy5kc2hIb21lLFxuICB9XG4gIGlmIChvcHRzLnVzZUVsZWN0cm9uQXNOb2RlKSBlbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSdcbiAgY29uc29sZS5pbmZvKGBbZHNoLWhvc3RdIHNwYXduICR7b3B0cy5ub2RlQmlufSAke2FyZ3Muam9pbignICcpfWApXG4gIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBEU0hfSE9NRT0ke29wdHMuZHNoSG9tZX1gKVxuICByZXR1cm4gc3Bhd24ob3B0cy5ub2RlQmluLCBhcmdzLCB7XG4gICAgZW52LFxuICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbn1cblxuLyoqXG4gKiBcdTRFMDBcdTk1MkVcIlx1Nzg2RVx1NEZERFx1OEZEMFx1ODg0Q1wiXHVGRjFBXG4gKiAxLiBcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NzZGNFx1NjNBNVx1NjMwMlx1NjNBNVx1RkYwOGF0dGFjaGVkXHVGRjBDXHU0RTBEXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCXHVGRjA5XHVGRjFCXG4gKiAyLiBcdTU0MjZcdTUyMTlcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdTIxOTIgc3Bhd24gXHUyMTkyIFx1N0I0OVx1NUY4NVx1NUMzMVx1N0VFQVx1RkYxQlxuICogMy4gXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHVGRjA4XHU1OTgyXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwIEVBRERSSU5VU0VcdUZGMDlcdTIxOTIgXHU3QUNCXHU1MzczXHU4RkQ0XHU1NkRFXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXHVGRjBDXHU0RTBEXHU1MThEXHU3NkYyXHU3QjQ5XHUzMDAyXG4gKiBcdThGRDRcdTU2REUgU2VydmVyU3RhdHVzXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEc2hSdW5uaW5nKG9wdHM6IExhdW5jaE9wdGlvbnMpOiBQcm9taXNlPHsgc3RhdHVzOiBTZXJ2ZXJTdGF0dXM7IHByb2M/OiBDaGlsZFByb2Nlc3MgfT4ge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCB1cmwgPSBgaHR0cDovLyR7aG9zdH06JHtwb3J0fS9gXG5cbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9IH1cbiAgfVxuXG4gIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbihvcHRzLmRzaEJpbilcbiAgaWYgKCFmb3VuZC5iaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogZm91bmQubm90ZXNbZm91bmQubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBkc2ggQ0xJJyB9IH1cbiAgfVxuICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4ob3B0cy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIG9wdHMudXNlRW1iZWRkZWROb2RlKVxuICBpZiAoIW5vZGUubm9kZUJpbikge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBub2RlLm5vdGVzW25vZGUubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNicgfSB9XG4gIH1cbiAgLy8gcGVyLXZhdWx0IFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYxQXNwYXduIFx1NTI0RFx1NjI4QSBzZXR0aW5ncy9jcmVkZW50aWFscyBcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUJcdTY4MzlcdUZGMDhcdTRFQzUgcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEYyMFx1NTE2NVx1RkYwOVx1MzAwMlxuICBpZiAob3B0cy5zaGFyZWRDb25maWdSb290KSB7XG4gICAgZW5zdXJlU2hhcmVkQ29uZmlnUGF0Y2gob3B0cy5kc2hIb21lLCBvcHRzLnNoYXJlZENvbmZpZ1Jvb3QpXG4gIH1cbiAgY29uc3QgcHJvYyA9IGxhdW5jaERzaCh7IC4uLm9wdHMsIGRzaEJpbjogZm91bmQuYmluLCBub2RlQmluOiBub2RlLm5vZGVCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBub2RlLnVzZUVsZWN0cm9uQXNOb2RlIH0pXG5cbiAgLy8gXHU2NTM2XHU5NkM2IHN0ZGVyciBcdTVDM0VcdTkwRThcdUZGMUFcdTVCNTBcdThGREJcdTdBMEJcdTc5RDJcdTkwMDBcdTY1RjZcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTUzOUZcdTU2RTBcdUZGMDhcdTU5ODIgRUFERFJJTlVTRVx1RkYwOVxuICBsZXQgc3RkZXJyVGFpbCA9ICcnXG4gIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IHtcbiAgICBzdGRlcnJUYWlsID0gKHN0ZGVyclRhaWwgKyBkLnRvU3RyaW5nKCkpLnNsaWNlKC00MDAwKVxuICB9KVxuXG4gIGNvbnN0IGNoaWxkRGllZCA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXNvbHZlKSA9PiB7XG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgfSlcblxuICBjb25zdCByZWFkeSA9IGF3YWl0IFByb21pc2UucmFjZShbXG4gICAgd2FpdEZvclJlYWR5KGhvc3QsIHBvcnQsIG9wdHMudGltZW91dE1zID8/IDEyMF8wMDApLnRoZW4oKCkgPT4gdHJ1ZSksXG4gICAgY2hpbGREaWVkLnRoZW4oKCkgPT4gZmFsc2UpLFxuICBdKVxuXG4gIGlmIChyZWFkeSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IGZhbHNlIH0sIHByb2MgfVxuICB9XG5cbiAgLy8gXHU1QjUwXHU4RkRCXHU3QTBCXHU1REYyXHU5MDAwXHU1MUZBXHVGRjFBXHU1MThEXHU2M0EyXHU0RTAwXHU2QjIxXHU3QUVGXHU1M0UzXHVGRjA4XHU1M0VGXHU4MEZEXHU4OEFCXHU1MjJCXHU3Njg0XHU1QjlFXHU0RjhCXHU2MkEyXHU4REQxXHU3RUQxXHU1QjlBXHVGRjA5XHVGRjBDXHU1NDI2XHU1MjE5XHU3RUQ5XHU1MUZBXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfSwgcHJvYyB9XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbCkgfSwgcHJvYyB9XG59XG5cbi8qKiBcdTRFQ0Ugc3RkZXJyIFx1NUMzRVx1OTBFOFx1NjNEMFx1NzBCQ1x1NTNFRlx1OEJGQlx1OTUxOVx1OEJFRiAqL1xuZnVuY3Rpb24gc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IHN0ZGVyclRhaWwuc3BsaXQoL1xccj9cXG4vKS5maWx0ZXIoQm9vbGVhbilcbiAgY29uc3QgYWRkckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFQUREUklOVVNFJykpXG4gIGNvbnN0IGVyckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFcnJvcjonKSlcbiAgaWYgKGFkZHJMaW5lKSB7XG4gICAgcmV0dXJuICdcdTdBRUZcdTUzRTNcdTVERjJcdTg4QUJcdTUzNjBcdTc1MjhcdUZGMDhFQUREUklOVVNFXHVGRjA5XHUzMDAyXHU4QkY3XHU2MzYyXHU0RTAwXHU0RTJBXHU3QUVGXHU1M0UzXHVGRjBDXHU2MjE2XHU1MTQ4XHU1MDVDXHU2Mzg5XHU1MzYwXHU3NTI4XHU4QkU1XHU3QUVGXHU1M0UzXHU3Njg0XHU2NzBEXHU1MkExXHU1NDBFXHU5MUNEXHU4QkQ1J1xuICB9XG4gIGlmIChlcnJMaW5lKSB7XG4gICAgY29uc3QgY2xlYW5lZCA9IGVyckxpbmUudHJpbSgpLnNsaWNlKDAsIDMwMClcbiAgICByZXR1cm4gYGRzaCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7Y2xlYW5lZH1gXG4gIH1cbiAgcmV0dXJuICdEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBXHVGRjA4XHU2NUUwXHU4QkU2XHU3RUM2XHU5NTE5XHU4QkVGXHVGRjA5XHUzMDAyXHU4QkY3XHU2N0U1XHU3NzBCIE9ic2lkaWFuIFx1NjNBN1x1NTIzNlx1NTNGMCBbZHNoXSBcdTY1RTVcdTVGRDcnXG59XG5cbi8qKiBcdTUwNUNcdTZCNjJcdTVCNTBcdThGREJcdTdBMEJcdUZGMDhTSUdURVJNXHVGRjBDXHU3QjQ5XHU1Rjg1XHU5MDAwXHU1MUZBXHVGRjFCXHU4RDg1XHU2NUY2XHU1NDBFIFNJR0tJTExcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wUHJvY2Vzcyhwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsIHwgdW5kZWZpbmVkLCB0aW1lb3V0TXMgPSA1MDAwKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghcHJvYyB8fCBwcm9jLmV4aXRDb2RlICE9PSBudWxsIHx8IHByb2Muc2lnbmFsQ29kZSAhPT0gbnVsbCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBwcm9jLmtpbGwoJ1NJR0tJTEwnKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH0sIHRpbWVvdXRNcylcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9KVxuICAgIHRyeSB7XG4gICAgICBwcm9jLmtpbGwoJ1NJR1RFUk0nKVxuICAgIH0gY2F0Y2gge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuICB9KVxufVxuIiwgIi8qKlxuICogXHU4QkJFXHU3RjZFXHVGRjFBXHU1QjU3XHU2QkI1ICsgXHU4QkJFXHU3RjZFXHU5ODc1IFVJXHUzMDAyXG4gKiBWMC4yXHVGRjFBRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHVGRjA4XHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIC8gXHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQiAvIFx1ODFFQVx1NUI5QVx1NEU0OVx1RkYwOVx1MzAwMlxuICovXG5cbmltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCB0eXBlIERzaEhvbWVNb2RlID0gJ3NoYXJlZCcgfCAncGVyLXZhdWx0JyB8ICdjdXN0b20nXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHNoRG9ja1NldHRpbmdzIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbjogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NEYxOFx1NTE0OFx1RkYwOSAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0XHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q6IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydDogbnVtYmVyXG4gIC8qKiBEU0hfSE9NRSBcdTZBMjFcdTVGMEZcdUZGMUFzaGFyZWQ9XHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQnBlci12YXVsdD1cdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjFCY3VzdG9tPVx1ODFFQVx1NUI5QVx1NEU0OSAqL1xuICBkc2hIb21lTW9kZTogRHNoSG9tZU1vZGVcbiAgLyoqIFx1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODRcdUZGMDhcdTRFQzUgY3VzdG9tIFx1NkEyMVx1NUYwRlx1NzUxRlx1NjU0OFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqIFx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlOiBib29sZWFuXG4gIC8qKiBPYnNpZGlhbiBcdTU0MkZcdTUyQThcdTY1RjZcdTgxRUFcdTUyQThcdTYyQzlcdThENzcgRFNIICovXG4gIGF1dG9zdGFydDogYm9vbGVhblxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRHNoRG9ja1NldHRpbmdzID0ge1xuICBkc2hCaW46ICcnLFxuICBub2RlQmluOiAnJyxcbiAgaG9zdDogJzEyNy4wLjAuMScsXG4gIHBvcnQ6IDMwODAsXG4gIGRzaEhvbWVNb2RlOiAnc2hhcmVkJyxcbiAgZHNoSG9tZTogJycsXG4gIHVzZUVtYmVkZGVkTm9kZTogZmFsc2UsXG4gIGF1dG9zdGFydDogdHJ1ZSxcbn1cblxuZXhwb3J0IGNsYXNzIERzaERvY2tTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIGN1c3RvbUhvbWVFbD86IFNldHRpbmdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pXG4gIH1cblxuICBvdmVycmlkZSBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXNcbiAgICBjb250YWluZXJFbC5lbXB0eSgpXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1Njk4Mlx1ODlDOCAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnXHUyNkY1IERTSCBEb2NrJyB9KVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge1xuICAgICAgY2xzOiAnZHNoLWRvY2stc2V0dGluZ3MtZGVzYycsXG4gICAgICB0ZXh0OiAnXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgV2ViIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhblx1RkYxQVx1NUI5QVx1NEY0RCBkc2ggXHUyMTkyIFx1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0QyBcdTIxOTIgXHU5NzYyXHU2NzdGXHU1RDRDXHU1MTY1XHUzMDAyXHU1MTY4XHU3QTBCXHU1Qjk4XHU2NUI5XHVGRjBDXHU5NkY2XHU4MUVBXHU3ODE0XHUzMDAyJyxcbiAgICB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY3MERcdTUyQTFcdTYzQTdcdTUyMzYgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1NjcwRFx1NTJBMScgfSlcbiAgICBjb25zdCBzdGF0dXNMaW5lID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NzBEXHU1MkExXHU3MkI2XHU2MDAxJylcbiAgICAgIC5zZXREZXNjKHRoaXMuZGVzY3JpYmVTdGF0dXMoKSlcbiAgICBjb25zdCBidG5zID0gc3RhdHVzTGluZS5jb250cm9sRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYnRucycgfSlcbiAgICBjb25zdCBzdGFydEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnbW9kLWN0YScsIHRleHQ6ICdcdTI1QjYgXHU1NDJGXHU1MkE4JyB9KVxuICAgIHN0YXJ0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgc3RvcEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVBMCBcdTUwNUNcdTZCNjInIH0pXG4gICAgc3RvcEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdG9wKCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgb3BlbkJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicgfSlcbiAgICBvcGVuQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5QYW5lbCgpXG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5NjhGIE9ic2lkaWFuIFx1ODFFQVx1NTJBOFx1NTQyRlx1NTJBOCcpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1OEZEMFx1ODg0Q1x1NjVGNiAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU4RkQwXHU4ODRDXHU2NUY2JyB9KVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ2RzaCBDTEkgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEJcdUZGMDhEU0hfQklOIFx1MjE5MiBucG0gcm9vdCAtZyBcdTIxOTIgXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXHU1M0VGXHU1ODZCIGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTYyMTYgYmluLmpzIFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcy9AZGVlcHNlZWstYWkvZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmRldGVjdExpbmUgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNicpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9iaW4vbm9kZScpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZScpXG4gICAgICAuc2V0RGVzYygnRUxFQ1RST05fUlVOX0FTX05PREVcdTMwMDJcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdTIwMTRcdTIwMTRcdTVCOUVcdTZENEIgT2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XHU0RUU1IE5vZGUgXHU2QTIxXHU1RjBGXHU4RkQwXHU4ODRDXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjBDXHU0RUM1XHU1NzI4XHU5QThDXHU4QkMxXHU1M0VGXHU3NTI4XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyJylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU3RjUxXHU3RURDIC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTdGNTFcdTdFREMnIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1N0ZBXHU1MUM2XHVGRjA5JylcbiAgICAgIC5zZXREZXNjKCdcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1MzAwMnNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXHU3NkY0XHU2M0E1XHU0RjdGXHU3NTI4XHVGRjFCcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NTcyOFx1NkI2NFx1NTdGQVx1Nzg0MFx1NEUwQVx1NjMwOSB2YXVsdCBcdTZEM0VcdTc1MUZcdTcyRUNcdTdBQ0JcdTdBRUZcdTUzRTNcdUZGMDhcdTZCQ0YgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RjFBXHU4QkREXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCczMDgwJylcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQpKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbiA9IE51bWJlcih2LnRyaW0oKSlcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQgPSBOdW1iZXIuaXNJbnRlZ2VyKG4pICYmIG4gPj0gMCAmJiBuIDw9IDY1NTM1ID8gbiA6IDMwODBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLm5ldFByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NSAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1XHVGRjA4RFNIX0hPTUVcdUZGMDlcdTRFMEVcdTRGMUFcdThCRERcdTk2OTRcdTc5QkInIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2QTIxXHU1RjBGJylcbiAgICAgIC5zZXREZXNjKCdwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gXHU0RjFBXHU4QkREXHU2MzA5XHU1RTkzXHU5Njk0XHU3OUJCXHVGRjA4XHU1NDA0XHU1RTkzXHU5NzYyXHU2NzdGXHU1M0VBXHU2NjNFXHU3OTNBXHU2NzJDXHU1RTkzXHU1MjFCXHU1RUZBXHU3Njg0XHU0RjFBXHU4QkREXHVGRjA5XHVGRjBDXHU0RjQ2XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcdTRFMDBcdTRFRkRcdUZGMENcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjhcdTVFOTNcdTc1MUZcdTY1NDhcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICBkZC5hZGRPcHRpb24oJ3NoYXJlZCcsICdcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjA4XHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NEUwMFx1NTk1N1x1OTE0RFx1N0Y2RVx1NEUwRVx1NEYxQVx1OEJERFx1RkYwOScpXG4gICAgICAgIGRkLmFkZE9wdGlvbigncGVyLXZhdWx0JywgJ1x1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkJcdTRGMUFcdThCREQgfi8uZHNoL3ZhdWx0cy88XHU1NDBEPi08aGFzaD5cdUZGMDhcdTkxNERcdTdGNkVcdTRFQ0RcdTUxNzFcdTRFQUJcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2N1c3RvbScsICdcdTgxRUFcdTVCOUFcdTRFNDlcdThERUZcdTVGODQnKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSlcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSA9IHYgYXMgRHNoSG9tZU1vZGVcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuY3VzdG9tSG9tZUVsPy5zZXREaXNhYmxlZCh2ICE9PSAnY3VzdG9tJylcbiAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIHRoaXMuY3VzdG9tSG9tZUVsID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NCcpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9Vc2Vycy95b3UvLmRzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuY3VzdG9tSG9tZUVsLnNldERpc2FibGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlICE9PSAnY3VzdG9tJylcblxuICAgIHRoaXMuaG9tZVByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RMaW5lITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBob21lUHJldmlldyE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgbmV0UHJldmlldyE6IEhUTUxFbGVtZW50XG5cbiAgcHJpdmF0ZSBkZXNjcmliZVN0YXR1cygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgcmV0dXJuIGAke3MudXJsfVx1RkYwOCR7cy5hdHRhY2hlZCA/ICdcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJ1x1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0Q1x1NEUyRCd9XHVGRjA5YFxuICAgIH1cbiAgICBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSByZXR1cm4gJ1x1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNlx1RkYwOFx1OTk5Nlx1NkIyMVx1N0VBNiAxMCBcdTc5RDJcdUZGMENcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOSdcbiAgICBpZiAocy5raW5kID09PSAnZXJyb3InKSByZXR1cm4gYFx1NTkzMVx1OEQyNTogJHtzLm1lc3NhZ2V9YFxuICAgIHJldHVybiAnXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURldGVjdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnBsdWdpbi5kZXRlY3RJbmZvKClcbiAgICByZXR1cm4gW1xuICAgICAgYGRzaDogJHtpbmZvLmRzaEJpbiA/PyAnXHU2NzJBXHU2MjdFXHU1MjMwJ30ke2luZm8uZHNoTm90ZXMubGVuZ3RoID8gYFx1RkYwOCR7aW5mby5kc2hOb3Rlcy5qb2luKCdcdUZGMUInKX1cdUZGMDlgIDogJyd9YCxcbiAgICAgIGBub2RlOiAke2luZm8ubm9kZU5vdGVzLmpvaW4oJ1x1RkYxQicpfWAsXG4gICAgXS5qb2luKCdcXG4nKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICBjb25zdCBob21lID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlRHNoSG9tZSgpXG4gICAgY29uc3Qgc2hhcmVkID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlU2hhcmVkQ29uZmlnUm9vdCgpXG4gICAgaWYgKHNoYXJlZCkge1xuICAgICAgcmV0dXJuIGBcdTRGMUFcdThCRERcdTc2RUVcdTVGNTU6ICR7aG9tZX1cXG5cdTkxNERcdTdGNkVcdTUxNzFcdTRFQUI6ICR7c2hhcmVkfVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4XHU1RTkzXHU3NTFGXHU2NTQ4XHVGRjA5YFxuICAgIH1cbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1OERFRlx1NUY4NDogJHtob21lfWBcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVOZXQoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlUG9ydCgpXG4gICAgY29uc3QgbW9kZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlXG4gICAgY29uc3Qgc3VmZml4ID0gbW9kZSA9PT0gJ3Blci12YXVsdCcgPyAnXHVGRjA4XHU2NzJDIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEUwRVx1NTE3Nlx1NEVENiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMDknIDogJ1x1RkYwOHNoYXJlZC9jdXN0b21cdUZGMUFcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHVGRjA5J1xuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU3QUVGXHU1M0UzOiAke3BvcnR9JHtzdWZmaXh9YFxuICB9XG59XG4iLCAiLyoqXG4gKiBEc2hXZWJWaWV3IFx1MjAxNFx1MjAxNCBcdTYyOEFcdTVCOThcdTY1QjkgRFNIIFdlYiAoMTI3LjAuMC4xOjxwb3J0PikgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuIFx1OTc2Mlx1Njc3Rlx1MzAwMlxuICogXHU1RTI2XHU1QjhDXHU2NTc0XHU4RkM3XHU3QTBCXHU3MkI2XHU2MDAxXHVGRjFBXHU1MkEwXHU4RjdEXHU1MkE4XHU3NTNCIC8gXHU5NTE5XHU4QkVGXHU1MzYxXHU3MjQ3XHVGRjA4XHU1NDJCXHU5MUNEXHU4QkQ1XHVGRjA5LyBcdTY3MkFcdTU0MkZcdTUyQThcdTdBN0FcdTcyQjZcdTYwMDEgLyBcdTU2RkVcdTY4MDdcdTVERTVcdTUxNzdcdTY4MEZcdTMwMDJcbiAqIGlmcmFtZSBcdTYzMDdcdTU0MTFcdTVCOThcdTY1QjlcdTY3MERcdTUyQTFcdUZGMENVSSBcdTUzRUFcdTY2MkZcIlx1ODIzOVx1NTc1RVwiXHU1OTE2XHU1OEYzXHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24gfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgY29uc3QgRFNIX1dFQl9WSUVXX1RZUEUgPSAnZHNoLWRvY2std2ViJ1xuXG50eXBlIFVpU3RhdGUgPSAncnVubmluZycgfCAnc3RhcnRpbmcnIHwgJ2Vycm9yJyB8ICdzdG9wcGVkJ1xuXG5leHBvcnQgY2xhc3MgRHNoV2ViVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBpZnJhbWVFbDogSFRNTElGcmFtZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHBpbGxFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIG92ZXJsYXlFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHRvZ2dsZUJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIGN1cnJlbnQ6IFVpU3RhdGUgPSAnc3RvcHBlZCdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihsZWFmKVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gRFNIX1dFQl9WSUVXX1RZUEVcbiAgfVxuXG4gIG92ZXJyaWRlIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdEU0ggRG9jaydcbiAgfVxuXG4gIG92ZXJyaWRlIGdldEljb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ2FuY2hvcidcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2snIH0pXG5cbiAgICAvLyAtLS0tIFx1NTkzNFx1OTBFOFx1NURFNVx1NTE3N1x1NjgwRiAtLS0tXG4gICAgY29uc3QgaGVhZGVyID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1oZWFkZXInIH0pXG4gICAgY29uc3QgbG9nbyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1sb2dvJyB9KVxuICAgIHNldEljb24obG9nbywgJ2FuY2hvcicpXG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay10aXRsZScsIHRleHQ6ICdEU0ggRG9jaycgfSlcbiAgICB0aGlzLnBpbGxFbCA9IGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stcGlsbCcgfSlcbiAgICBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3BhY2VyJyB9KVxuXG4gICAgdGhpcy50b2dnbGVCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHRoaXMudG9nZ2xlQnRuLm9uY2xpY2sgPSAoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKVxuXG4gICAgY29uc3QgcmVmcmVzaEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihyZWZyZXNoQnRuLCAncmVmcmVzaC1jdycpXG4gICAgcmVmcmVzaEJ0bi50aXRsZSA9ICdcdTUyMzdcdTY1QjAnXG4gICAgcmVmcmVzaEJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5yZWxvYWQoKVxuXG4gICAgY29uc3QgcG9wb3V0QnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHBvcG91dEJ0biwgJ21heGltaXplLTInKVxuICAgIHBvcG91dEJ0bi50aXRsZSA9ICdcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhcdTcyRUNcdTdBQ0JcdThGREJcdTdBMEJcdUZGMENcdTYwMjdcdTgwRkRcdTdCNDlcdTU0MENcdTZENEZcdTg5QzhcdTU2NjhcdUZGMDknXG4gICAgcG9wb3V0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5Qb3BvdXQoKVxuICAgIH1cblxuICAgIGNvbnN0IGJyb3dzZXJCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24oYnJvd3NlckJ0biwgJ2V4dGVybmFsLWxpbmsnKVxuICAgIGJyb3dzZXJCdG4udGl0bGUgPSAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJ1xuICAgIGJyb3dzZXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlbkluQnJvd3NlcigpXG4gICAgfVxuXG4gICAgLy8gLS0tLSBcdTRFM0JcdTRGNTNcdUZGMUFpZnJhbWUgKyBcdTcyQjZcdTYwMDFcdTg5ODZcdTc2RDZcdTVDNDIgLS0tLVxuICAgIGNvbnN0IGJvZHkgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJvZHknIH0pXG4gICAgdGhpcy5pZnJhbWVFbCA9IGJvZHkuY3JlYXRlRWwoJ2lmcmFtZScsIHsgY2xzOiAnZHNoLWRvY2stZnJhbWUnIH0pXG4gICAgdGhpcy5vdmVybGF5RWwgPSBib2R5LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLW92ZXJsYXknIH0pXG5cbiAgICAvLyBcdTcyQjZcdTYwMDFcdTgwNTRcdTUyQThcbiAgICB0aGlzLnBsdWdpbi5vblN0YXR1c0NoYW5nZSgoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB0aGlzLnJlZnJlc2goKVxuXG4gICAgLy8gXHU1MTVDXHU1RTk1XHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGXHU2NUY2XHU4MkU1XHU2NzBEXHU1MkExXHU2NzJBXHU1NDJGXHU1MkE4XHU0RTE0XHU3QUVGXHU1M0UzXHU1M0VGXHU3NTI4XHVGRjBDXHU1QzFEXHU4QkQ1XHU2MkM5XHU4RDc3XG4gICAgdm9pZCB0aGlzLmVuc3VyZVN0YXJ0ZWQoKVxuXG4gICAgLy8gXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGXHU2NUY2XHU1MjM3XHU2NUIwXHU0RTAwXHU2QjIxXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgwN1x1OEJCMFx1RkYxQVx1NzUyOFx1NjIzN1x1NkI2NFx1NTIzQlx1NkI2M1x1NjI1M1x1NUYwMCBEU0ggXHU5NzYyXHU2NzdGXHU3Njg0XHU3QTk3XHU1M0UzXG4gICAgLy8gXHU1QzMxXHU2NjJGXCJcdTVGNTNcdTUyNEQgdmF1bHRcIlx1RkYwQ1x1NjVFMFx1OTcwMFx1N0I0OSBmb2N1cy9hY3RpdmUtbGVhZi1jaGFuZ2UgXHU0RThCXHU0RUY2XHUzMDAyXG4gICAgdGhpcy5wbHVnaW4ucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gIH1cblxuICBvdmVycmlkZSBvbkNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBvblRvZ2dsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdG9wKClcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgIH1cbiAgICB0aGlzLnJlZnJlc2goKVxuICB9XG5cbiAgLyoqIFx1OTc2Mlx1Njc3Rlx1NjI1M1x1NUYwMFx1NjVGNlx1Nzg2RVx1NEZERFx1NjcwRFx1NTJBMVx1NTcyOFx1OEREMVx1RkYwOFx1NURGMlx1NTcyOFx1OEREMVx1NTIxOVx1NjMwMlx1NjNBNVx1RkYwOSAqL1xuICBwcml2YXRlIGFzeW5jIGVuc3VyZVN0YXJ0ZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3N0b3BwZWQnIHx8IHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgICAgdGhpcy5yZWZyZXNoKClcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlZnJlc2goKTogdm9pZCB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgbGV0IHVpOiBVaVN0YXRlXG4gICAgbGV0IHBpbGxUZXh0ID0gJydcbiAgICBsZXQgcGlsbENscyA9ICcnXG5cbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHVpID0gJ3J1bm5pbmcnXG4gICAgICBwaWxsVGV4dCA9IGBcdTI1Q0YgJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJyBcdTAwQjcgXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICcnfWBcbiAgICAgIHBpbGxDbHMgPSAnaXMtcnVubmluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdWkgPSAnc3RhcnRpbmcnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0MgXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2J1xuICAgICAgcGlsbENscyA9ICdpcy1zdGFydGluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdWkgPSAnZXJyb3InXG4gICAgICBwaWxsVGV4dCA9ICdcdTI3MTUgXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1J1xuICAgICAgcGlsbENscyA9ICdpcy1lcnJvcidcbiAgICB9IGVsc2Uge1xuICAgICAgdWkgPSAnc3RvcHBlZCdcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjVDQiBcdTY3MkFcdThGRDBcdTg4NEMnXG4gICAgICBwaWxsQ2xzID0gJ2lzLXN0b3BwZWQnXG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdWlcbiAgICBpZiAodGhpcy5waWxsRWwpIHtcbiAgICAgIHRoaXMucGlsbEVsLnNldFRleHQocGlsbFRleHQpXG4gICAgICB0aGlzLnBpbGxFbC5jbGFzc05hbWUgPSBgZHNoLWRvY2stcGlsbCAke3BpbGxDbHN9YFxuICAgIH1cbiAgICBpZiAodGhpcy50b2dnbGVCdG4pIHtcbiAgICAgIHRoaXMudG9nZ2xlQnRuLmVtcHR5KClcbiAgICAgIHNldEljb24odGhpcy50b2dnbGVCdG4sIHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJyA/ICdzcXVhcmUnIDogJ3BsYXknKVxuICAgICAgdGhpcy50b2dnbGVCdG4udGl0bGUgPSBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycgPyAnXHU1MDVDXHU2QjYyJyA6ICdcdTU0MkZcdTUyQTgnXG4gICAgfVxuXG4gICAgLy8gaWZyYW1lIFx1NEUwRVx1ODk4Nlx1NzZENlx1NUM0MlxuICAgIGlmICh1aSA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmlmcmFtZUVsLnNyYyAhPT0gdGhpcy5wbHVnaW4uYmFzZVVybCkge1xuICAgICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICAgIH1cbiAgICAgIHRoaXMuc2hvd092ZXJsYXkobnVsbClcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RhcnRpbmcoKSlcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyRXJyb3Iocy5raW5kID09PSAnZXJyb3InID8gcy5tZXNzYWdlIDogJ1x1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRicpKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RvcHBlZCgpKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0gXHU4OTg2XHU3NkQ2XHU1QzQyXHU2RTMyXHU2N0QzIC0tLS0tLS0tLS1cblxuICBwcml2YXRlIHNob3dPdmVybGF5KGNvbnRlbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5vdmVybGF5RWwpIHJldHVyblxuICAgIHRoaXMub3ZlcmxheUVsLmVtcHR5KClcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgdGhpcy5vdmVybGF5RWwuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgICAgIHRoaXMub3ZlcmxheUVsLnJlbW92ZUF0dHJpYnV0ZSgnaGlkZGVuJylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gXHU4RkQwXHU4ODRDXHU0RTJEXHVGRjFBXHU2NjNFXHU1RjBGXHU5NjkwXHU4NUNGXHU4OTg2XHU3NkQ2XHU1QzQyXHVGRjA4XHU1NDI2XHU1MjE5XHU3QTdBXHU3Njg0XHU3RUREXHU1QkY5XHU1QjlBXHU0RjREXHU1QzQyXHU0RjFBXHU2MzIxXHU0RjRGIGlmcmFtZVx1RkYwOVxuICAgICAgdGhpcy5vdmVybGF5RWwuc2V0QXR0cmlidXRlKCdoaWRkZW4nLCAnJylcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXJ0aW5nKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3Bpbm5lcicgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnXHU2QjYzXHU1NzI4XHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IERTSCBXZWJcdTIwMjYnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLFxuICAgICAgdGV4dDogJ1x1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1OTcwMFx1NTIxRFx1NTlDQlx1NTMxNiBwcm9maWxlXHVGRjA4XHU3RUE2IDEwIFx1NzlEMlx1RkYwOVx1RkYxQlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MFx1NzUyOFx1NjVGNlx1NUMwNlx1ODFFQVx1NTJBOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScsXG4gICAgfSlcbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYWxlcnQtdHJpYW5nbGUnKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1tc2cnLCB0ZXh0OiBtZXNzYWdlIH0pXG4gICAgY29uc3QgcmV0cnkgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuJywgdGV4dDogJ1x1OTFDRFx1OEJENScgfSlcbiAgICByZXRyeS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RvcHBlZCgpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FuY2hvcicpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTY3MkFcdThGRDBcdTg4NEMnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsIHRleHQ6ICdcdTcwQjlcdTUxRkJcdTU0MkZcdTUyQThcdUZGMENcdTYyOEFcdTVCOThcdTY1QjkgRGVlcFNlZWsgSGFybmVzcyBcdTUwNUNcdTk3NjBcdThGREJcdTY3NjUnIH0pXG4gICAgY29uc3Qgc3RhcnQgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuIG1vZC1jdGEnLCB0ZXh0OiAnXHU1NDJGXHU1MkE4IERTSCcgfSlcbiAgICBzdGFydC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVsb2FkKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGN1cnJlbnRWYXVsdC50cyBcdTIwMTRcdTIwMTQgXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHRcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHUzMDAyXG4gKlxuICogZHNoLWRvY2sgXHU4REQxXHU1NzI4IE9ic2lkaWFuIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1ODBGRFx1NjJGRlx1NTIzMFx1NjcwMFx1Njc0M1x1NUEwMVx1NzY4NFx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1N0E5N1x1NTNFM1x1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NjVGNlx1RkYwQ1xuICogYGFwcC52YXVsdC5nZXROYW1lKClgICsgYGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKWBcdUZGMDlcdTMwMDJEU0ggXHU3Njg0XHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XG4gKiBkc2gtdG9vbC1vYnNpZGlhbi12YXVsdCBcdThERDFcdTU3MjhcdTcyRUNcdTdBQ0Igbm9kZSBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTRFMjRcdTgwMDVcdTkwMUFcdThGQzdcdTRFMDBcdTRFMkFcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTg5RTNcdTgwMjZcdTkwMUFcdTRGRTFcdUZGMUFcbiAqXG4gKiAgIDxob21lZGlyPi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAgIHsgbmFtZSwgcGF0aCwgdXBkYXRlZEF0IH1cbiAqXG4gKiAtIFx1NEY0RFx1N0Y2RVx1NTZGQVx1NUI5QVx1NTcyOCBgfi8uZHNoYFx1RkYwOFx1NEUwRSBkc2gtZG9jayBcdTc2ODQgRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHU2NUUwXHU1MTczXHVGRjA5XHVGRjBDXHU0RUZCXHU0RjU1XHU2QTIxXHU1RjBGXG4gKiAgIFx1NEUwQiBEU0ggXHU0RkE3XHU5MEZEXHU4QkZCXHU1Rjk3XHU1MjMwXHVGRjFCXG4gKiAtIFx1NTkxQVx1N0E5N1x1NTNFM1x1NTczQVx1NjY2Rlx1RkYxQVx1NkJDRlx1NEUyQSBPYnNpZGlhbiBcdTdBOTdcdTUzRTNcdUZGMDhcdTRFM0JcdTdBOTdcdTUzRTMgLyBwb3BvdXRcdUZGMDlcdTkwRkRcdTY2MkZcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTU0MDRcbiAqICAgXHU4MUVBXHU3NkQxXHU1NDJDXHU4MUVBXHU1REYxXHU3Njg0IHdpbmRvdyBmb2N1cyBcdTIwMTRcdTIwMTQgXHU2NzAwXHU1NDBFXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU3Njg0XHU3QTk3XHU1M0UzXHU1MTk5XHU1MTY1XHVGRjBDXHU2QjYzXHU2NjJGXCJcdTc1MjhcdTYyMzdcdTVGNTNcdTUyNERcdTZCNjNcbiAqICAgXHU1NzI4XHU3NzBCXHU3Njg0IHZhdWx0XCJcdUZGMUJcbiAqIC0gXHU1OTMxXHU4RDI1XHU5NzU5XHU5RUQ4XHVGRjFBXHU1MTk5XHU0RTBEXHU4RkRCXHVGRjA4XHU2NzQzXHU5NjUwL1x1NzhDMVx1NzZEOFx1RkYwOVx1NTNFQSBjb25zb2xlLndhcm5cdUZGMENcdTdFRERcdTRFMERcdTYyNTNcdTY1QURcdTYzRDJcdTRFRjZcdTRFM0JcdTZENDFcdTdBMEJcdUZGMUJcbiAqICAgXHU2NTg3XHU0RUY2XHU2MzVGXHU1NzRGL1x1N0YzQVx1NTkzMVx1NjVGNiBEU0ggXHU0RkE3XHU1NkRFXHU5MDAwXHU1MzlGXHU2NzA5XHU0RkUxXHU1M0Y3XHVGRjBDXHU1NDExXHU1NDBFXHU1MTdDXHU1QkI5XHU0RTBEXHU4OEM1IGRzaC1kb2NrIFx1NzY4NFx1NTczQVx1NjY2Rlx1MzAwMlxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTU2RkFcdTVCOUFcdTRGNERcdTdGNkVcdUZGMUF+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnLCAnY3VycmVudC12YXVsdC5qc29uJylcbn1cblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE4NVx1NUJCOVx1RkYwOERTSCBcdTRGQTdcdTUzRUFcdThCRkIgbmFtZS9wYXRoXHVGRjBDdXBkYXRlZEF0IFx1NEY5Qlx1OEJDQVx1NjVBRFx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBDdXJyZW50VmF1bHRNYXJrZXIge1xuICBuYW1lOiBzdHJpbmdcbiAgcGF0aDogc3RyaW5nXG4gIHVwZGF0ZWRBdDogbnVtYmVyXG59XG5cbi8qKlxuICogXHU1MzlGXHU1QjUwXHU1MTk5XHU1MTY1XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjFBXHU1MTQ4XHU1MTk5XHU1NDBDXHU3NkVFXHU1RjU1IC50bXAgXHU1MThEIHJlbmFtZVx1RkYwQ1x1OTA3Rlx1NTE0RCBEU0ggXHU0RkE3XHU4QkZCXHU1MjMwXHU1MzRBXHU2MjJBXHU1MTg1XHU1QkI5XHUzMDAyXG4gKiBcdTU5MzFcdThEMjVcdTUzRUFcdTU0NEFcdThCNjZcdUZGMENcdTRFMERcdTYyOUJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKG5hbWU6IHN0cmluZywgdmF1bHRQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlID0gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpXG4gICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShmaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBjb25zdCBwYXlsb2FkOiBDdXJyZW50VmF1bHRNYXJrZXIgPSB7IG5hbWUsIHBhdGg6IHZhdWx0UGF0aCwgdXBkYXRlZEF0OiBEYXRlLm5vdygpIH1cbiAgICBjb25zdCB0bXAgPSBgJHtmaWxlfS50bXBgXG4gICAgZnMud3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpKVxuICAgIGZzLnJlbmFtZVN5bmModG1wLCBmaWxlKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gXHU1MTk5XHU1MTY1IGN1cnJlbnQtdmF1bHQgXHU2ODA3XHU4QkIwXHU1OTMxXHU4RDI1JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTRFQ0UgT2JzaWRpYW4gYXBwIFx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdCBcdTU0MERcdTRFMEVcdTY4MzlcdThERUZcdTVGODRcdUZGMUJcdTUzRDZcdTRFMERcdTUyMzBcdThGRDRcdTU2REUgbnVsbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdEluZm8oYXBwOiB7XG4gIHZhdWx0OiB7IGdldE5hbWUoKTogc3RyaW5nOyBhZGFwdGVyOiB1bmtub3duIH1cbn0pOiB7IG5hbWU6IHN0cmluZzsgcGF0aDogc3RyaW5nIH0gfCBudWxsIHtcbiAgdHJ5IHtcbiAgICAvLyBnZXRCYXNlUGF0aCBcdTRFMERcdTU3Mjggb2JzaWRpYW4gXHU3Njg0XHU3QzdCXHU1NzhCXHU1QjlBXHU0RTQ5XHU5MUNDXHVGRjA4XHU4RkQwXHU4ODRDXHU2NUY2IERhdGFBZGFwdGVyIFx1NjI0RFx1NjcwOVx1RkYwOVx1RkYwQ1xuICAgIC8vIFx1NjI0MFx1NEVFNVx1OEZEOVx1OTFDQ1x1NjI4QSBhZGFwdGVyIFx1NUY1MyB1bmtub3duIFx1NTkwNFx1NzQwNlx1NTE4RFx1NjVBRFx1OEEwMFx1MzAwMlxuICAgIGNvbnN0IGJhc2UgPSAoYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgICBpZiAoIWJhc2UpIHJldHVybiBudWxsXG4gICAgcmV0dXJuIHsgbmFtZTogYXBwLnZhdWx0LmdldE5hbWUoKSwgcGF0aDogYmFzZSB9XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRQSxJQUFBQSxtQkFBOEM7QUFFOUMsSUFBQUMsTUFBb0I7QUFDcEIsSUFBQUMsUUFBc0I7OztBQ0l0QiwyQkFBb0Q7QUFDcEQsU0FBb0I7QUFDcEIsV0FBc0I7QUFDdEIsU0FBb0I7QUFDcEIsV0FBc0I7QUFFZixJQUFNLG1CQUF3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O0FBQUEsRUFDaEU7QUFBQSxFQUVBLE1BQWMsZUFBOEI7QUFDMUMsVUFBTSxPQUFPLE1BQU0sS0FBSyxTQUFTO0FBQ2pDLFNBQUssV0FBVyxPQUFPLE9BQU8sQ0FBQyxHQUFHLGtCQUFrQixRQUFRLENBQUMsQ0FBQztBQUU5RCxVQUFNLFNBQVM7QUFDZixRQUFJLFFBQVEsV0FBVyxPQUFPLE9BQU8sWUFBWSxZQUFZLE9BQU8sUUFBUSxLQUFLLEdBQUc7QUFDbEYsV0FBSyxTQUFTLGNBQWM7QUFDNUIsV0FBSyxTQUFTLFVBQVUsT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQTtBQUFBLEVBSUEsTUFBTSxZQUEyQjtBQUMvQixVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsVUFBTSxTQUFTLFVBQVUsZ0JBQWdCLGlCQUFpQjtBQUMxRCxRQUFJLE9BQTZCLE9BQU8sQ0FBQyxLQUFLO0FBQzlDLFFBQUksQ0FBQyxNQUFNO0FBQ1QsYUFBTyxVQUFVLGFBQWEsS0FBSztBQUNuQyxVQUFJLENBQUMsS0FBTTtBQUNYLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRTtBQUNBLGNBQVUsY0FBYyxJQUFJO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sZ0JBQStCO0FBQ25DLFVBQU0sRUFBRSxNQUFNLElBQUksUUFBUSxVQUFVO0FBQ3BDLFVBQU0sTUFBTSxhQUFhLEtBQUssT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLE1BQU0sYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sT0FBTyxLQUFLLElBQUksVUFBVSxlQUFlO0FBQy9DLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRSxTQUFTLEtBQUs7QUFDWixZQUFNLE1BQU0sZUFBZSxRQUFRLElBQUksVUFBVSxPQUFPLEdBQUc7QUFDM0QsVUFBSSx3QkFBTyxxREFBYSxHQUFHLEVBQUU7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIm9zIiwgInBhdGgiLCAiZW1iZWRkZWROb2RlVmVyc2lvbiIsICJyZXNvbHZlIiwgImltcG9ydF9vYnNpZGlhbiIsICJmcyIsICJvcyIsICJwYXRoIl0KfQo=
