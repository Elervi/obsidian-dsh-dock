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
var import_electron = require("electron");
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
    await new Promise((r) => globalThis.setTimeout(r, 500));
  }
}
function ensureSharedProfiles(dshHome, sharedRoot) {
  if (!sharedRoot || dshHome === sharedRoot) return;
  const linkDir = (name) => {
    try {
      const target = path.join(dshHome, name);
      const sharedTarget = path.join(sharedRoot, name);
      if (!fs.existsSync(sharedTarget)) return;
      let st = null;
      try {
        st = fs.lstatSync(target);
      } catch {
        st = null;
      }
      if (st?.isSymbolicLink()) {
        if (fs.realpathSync(target) === fs.realpathSync(sharedTarget)) return;
        fs.unlinkSync(target);
        st = null;
      }
      if (st?.isDirectory()) {
        const bak = `${target}.bak-${Date.now()}`;
        fs.renameSync(target, bak);
      }
      fs.mkdirSync(dshHome, { recursive: true });
      fs.symlinkSync(sharedTarget, target, "dir");
    } catch (err) {
      console.warn(`[dsh-host] \u5EFA\u7ACB\u5171\u4EAB ${name} \u8F6F\u94FE\u5931\u8D25\uFF08per-vault \u5C06\u7528\u72EC\u7ACB\u76EE\u5F55\uFF09`, err);
    }
  };
  linkDir("profiles");
  linkDir(".agent-presets");
}
function ensureSharedConfigPatch(dshHome, sharedRoot) {
  if (!sharedRoot || dshHome === sharedRoot) return;
  try {
    const sharedProfiles = path.join(sharedRoot, "profiles");
    const patchFile = path.join(sharedProfiles, "web", "cordis.patch.yml");
    const settingsPath = path.join(sharedRoot, "settings.yaml");
    const credentialsPath = path.join(sharedRoot, ".credentials.yaml");
    const blockSettings = `- id: settings
  config:
    path: ${settingsPath}
`;
    const blockCredentials = `- id: credentials
  config:
    path: ${credentialsPath}
`;
    let content = "";
    if (fs.existsSync(patchFile)) {
      content = fs.readFileSync(patchFile, "utf8");
    }
    const strip = (s) => s.replace(/\s+/g, "");
    const hasSettings = strip(content).includes(strip(blockSettings));
    const hasCredentials = strip(content).includes(strip(blockCredentials));
    if (hasSettings && hasCredentials) return;
    const withoutComments = content.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n").trim();
    if (withoutComments === "" || withoutComments === "[]") {
      const insertion = blockSettings + blockCredentials;
      content = `# dsh-dock \u81EA\u52A8\u7EF4\u62A4\uFF1Aper-vault \u914D\u7F6E\u5171\u4EAB\uFF08\u6A21\u578B/\u5BC6\u94A5/\u4E3B\u9898\u6307\u5411\u5171\u4EAB ~/.dsh\uFF0C\u4F1A\u8BDD\u4ECD\u9694\u79BB\uFF09
${insertion.trimEnd()}
`;
      fs.mkdirSync(path.dirname(patchFile), { recursive: true });
      fs.writeFileSync(patchFile, content);
    } else {
      console.warn(
        "[dsh-host] \u5171\u4EAB cordis.patch.yml \u5DF2\u6709\u81EA\u5B9A\u4E49\u5185\u5BB9\uFF0C\u8DF3\u8FC7\u81EA\u52A8\u5199\u5165\uFF1B\u5982\u9700\u914D\u7F6E\u5171\u4EAB\uFF0C\u8BF7\u5728 ~/.dsh/profiles/web/cordis.patch.yml \u624B\u52A8\u52A0\u5165 settings/credentials \u7684 path \u8986\u76D6"
      );
    }
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
  if (!node.nodeBin) {
    return { status: { kind: "error", message: node.notes[node.notes.length - 1] ?? "\u65E0\u6CD5\u5B9A\u4F4D Node \u8FD0\u884C\u65F6" } };
  }
  if (opts.sharedConfigRoot) {
    ensureSharedProfiles(opts.dshHome, opts.sharedConfigRoot);
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
    const timer = globalThis.setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
      }
    }, timeoutMs);
    proc.once("exit", () => {
      globalThis.clearTimeout(timer);
      resolve2();
    });
    try {
      proc.kill("SIGTERM");
    } catch {
      globalThis.clearTimeout(timer);
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
  dshHomeMode: "per-vault",
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
    new import_obsidian.Setting(containerEl).setName("\u26F5 DSH Dock").setHeading();
    containerEl.createEl("p", {
      cls: "dsh-dock-settings-desc",
      text: "\u628A\u5B98\u65B9 DeepSeek Harness Web \u505C\u9760\u8FDB Obsidian\uFF1A\u5B9A\u4F4D dsh \u2192 \u5B50\u8FDB\u7A0B\u8FD0\u884C \u2192 \u9762\u677F\u5D4C\u5165\u3002\u5B98\u65B9\u539F\u751F\uFF0C\u5B98\u65B9 UI \u539F\u6837\u5D4C\u5165\u3002"
    });
    new import_obsidian.Setting(containerEl).setName("\u670D\u52A1").setHeading();
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
    new import_obsidian.Setting(containerEl).setName("\u8FD0\u884C\u65F6").setHeading();
    new import_obsidian.Setting(containerEl).setName("dsh CLI \u8DEF\u5F84").setDesc("\u7559\u7A7A\u81EA\u52A8\u63A2\u6D4B\uFF08DSH_BIN \u2192 npm root -g \u2192 \u5E38\u89C1\u5168\u5C40\u76EE\u5F55\uFF09\u3002\u53EF\u586B dsh \u5305\u76EE\u5F55\u6216 bin.js \u7EDD\u5BF9\u8DEF\u5F84\u3002").addText(
      (t) => t.setPlaceholder("\u4F8B\u5982 /opt/homebrew/lib/node_modules/@deepseek-ai/dsh").setValue(this.plugin.settings.dshBin).onChange(async (v) => {
        this.plugin.settings.dshBin = v.trim();
        await this.plugin.saveSettings();
        this.detectLine.textContent = this.describeDetect();
      })
    );
    this.detectLine = containerEl.createDiv({ cls: "dsh-dock-detect" });
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
    new import_obsidian.Setting(containerEl).setName("\u7F51\u7EDC").setHeading();
    new import_obsidian.Setting(containerEl).setName("\u76D1\u542C\u7AEF\u53E3\uFF08\u57FA\u51C6\uFF09").setDesc("\u5B98\u65B9\u9ED8\u8BA4 3080\u3002shared/custom \u6A21\u5F0F\u76F4\u63A5\u4F7F\u7528\uFF1Bper-vault \u6A21\u5F0F\u5728\u6B64\u57FA\u7840\u4E0A\u6309 vault \u6D3E\u751F\u72EC\u7ACB\u7AEF\u53E3\uFF08\u6BCF vault \u72EC\u5360\uFF0C\u4F1A\u8BDD\u4E92\u4E0D\u53EF\u89C1\uFF09\u3002").addText(
      (t) => t.setPlaceholder("3080").setValue(String(this.plugin.settings.port)).onChange(async (v) => {
        const n = Number(v.trim());
        this.plugin.settings.port = Number.isInteger(n) && n >= 0 && n <= 65535 ? n : 3080;
        await this.plugin.saveSettings();
        this.netPreview.textContent = this.describeNet();
      })
    );
    this.netPreview = containerEl.createDiv({ cls: "dsh-dock-detect" });
    new import_obsidian.Setting(containerEl).setName("\u6570\u636E\u76EE\u5F55\uFF08DSH_HOME\uFF09\u4E0E\u4F1A\u8BDD\u9694\u79BB").setHeading();
    new import_obsidian.Setting(containerEl).setName("\u6A21\u5F0F").setDesc("per-vault \u6A21\u5F0F = \u4F1A\u8BDD\u6309\u5E93\u9694\u79BB\uFF08\u5404\u5E93\u9762\u677F\u53EA\u663E\u793A\u672C\u5E93\u521B\u5EFA\u7684\u4F1A\u8BDD\uFF09\uFF0C\u4F46\u6A21\u578B/\u5BC6\u94A5/\u4E3B\u9898\u914D\u7F6E\u4E0E\u8FD0\u884C\u65F6\u63D2\u4EF6\u5168\u5C40\u5171\u4EAB\u4E00\u4EFD\uFF0C\u914D\u4E00\u6B21\u5168\u5E93\u751F\u6548\u3002").addDropdown((dd) => {
      dd.addOption("per-vault", "\u6BCF vault \u9694\u79BB\u4F1A\u8BDD ~/.dsh/vaults/<\u540D>-<hash>\uFF08\u9ED8\u8BA4\uFF1B\u914D\u7F6E\u4E0E\u63D2\u4EF6\u4ECD\u5171\u4EAB\uFF09");
      dd.addOption("shared", "\u5B98\u65B9\u5171\u4EAB ~/.dsh\uFF08\u6240\u6709 vault \u5171\u7528\u4E00\u5957\u914D\u7F6E\u3001\u63D2\u4EF6\u4E0E\u4F1A\u8BDD\uFF09");
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
    this.homePreview = containerEl.createDiv({ cls: "dsh-dock-detect" });
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
  onunload() {
    void this.stop();
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
    if (this.markerTimer) window.clearTimeout(this.markerTimer);
    this.markerTimer = window.setTimeout(() => {
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
        // per-vault 模式：注入本服务所属库 env（第二通道）。工具插件解析时
        // 优先用本 env 识别"本服务服务的库"，cwd 保持 dsh 进程默认工作目录
        // 不变 —— cwd 与 Obsidian 库是两个独立概念，不合并。
        env: sharedConfigRoot && vaultInfo ? {
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
    await import_electron.shell.openExternal(this.baseUrl);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgeyBzaGVsbCB9IGZyb20gJ2VsZWN0cm9uJ1xuaW1wb3J0IHR5cGUgeyBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQge1xuICBlbWJlZGRlZE5vZGVWZXJzaW9uLFxuICBlbnN1cmVEc2hSdW5uaW5nLFxuICByZXNvbHZlRHNoQmluLFxuICByZXNvbHZlTm9kZUJpbixcbiAgc2FmZVZhdWx0TmFtZSxcbiAgc3RhYmxlSGFzaCxcbiAgc3RvcFByb2Nlc3MsXG4gIHR5cGUgU2VydmVyU3RhdHVzLFxufSBmcm9tICcuL2xhdW5jaGVyJ1xuaW1wb3J0IHsgRHNoRG9ja1NldHRpbmdzVGFiLCBERUZBVUxUX1NFVFRJTkdTLCB0eXBlIERzaERvY2tTZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnXG5pbXBvcnQgeyBEc2hXZWJWaWV3LCBEU0hfV0VCX1ZJRVdfVFlQRSB9IGZyb20gJy4vdmlldydcbmltcG9ydCB7IGN1cnJlbnRWYXVsdEluZm8sIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyIH0gZnJvbSAnLi9jdXJyZW50VmF1bHQnXG5cbi8qKlxuICogXHU4QkExXHU3Qjk3IERTSF9IT01FXHVGRjFBXG4gKiAtIHBlci12YXVsdFx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIHNoYXJlZFx1RkYxQX4vLmRzaCBcdTIwMTRcdTIwMTQgXHU0RTBFXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1QjhDXHU1MTY4XHU0RTAwXHU4MUY0XHVGRjBDXHU1OTBEXHU3NTI4XHU1REYyXHU2NzA5XHU5MTREXHU3RjZFL1x1NEYxQVx1OEJERFx1RkYxQlxuICogLSBjdXN0b21cdUZGMUFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEc2hIb21lKHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnIHwgJ2RzaEhvbWUnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpXG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAnY3VzdG9tJykge1xuICAgIHJldHVybiBzLmRzaEhvbWUudHJpbSgpIHx8IHBhdGguam9pbihob21lLCAnLmRzaCcpXG4gIH1cbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnKSB7XG4gICAgY29uc3QgbmFtZSA9IHZhdWx0Um9vdCA/IGAke3NhZmVWYXVsdE5hbWUodmF1bHRSb290KX0tJHtzdGFibGVIYXNoKHZhdWx0Um9vdCl9YCA6ICd2YXVsdCdcbiAgICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJywgJ3ZhdWx0cycsIG5hbWUpXG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbihob21lLCAnLmRzaCcpXG59XG5cbi8qKlxuICogXHU4QkExXHU3Qjk3XHU2NzJDIHZhdWx0IFx1NzY4NFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1MzAwMlxuICogLSBzaGFyZWQgLyBjdXN0b21cdUZGMUFzZXR0aW5ncy5wb3J0XHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDlcdTIwMTRcdTIwMTQgXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NTQwQ1x1NEUwMFx1NjcwRFx1NTJBMVx1NEUwRVx1NEYxQVx1OEJERFx1RkYxQlxuICogLSBwZXItdmF1bHRcdUZGMUFzZXR0aW5ncy5wb3J0ICsgKHN0YWJsZUhhc2ggJSA0MDk2KSBcdTIwMTRcdTIwMTQgXHU2QkNGXHU0RTJBIHZhdWx0IFx1NzJFQ1x1NTM2MFx1N0FFRlx1NTNFM1x1RkYwQ1x1NTQwNFx1ODFFQVxuICogICBzcGF3biBcdTcyRUNcdTdBQ0JcdTc2ODQgZHNoIFx1OEZEQlx1N0EwQlx1RkYxQlx1OTE0RFx1NTQwOFx1NzJFQ1x1N0FDQlx1NzY4NCBEU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERFx1NUI1OFx1NTBBOFx1NjgzOVx1RkYwOVx1RkYwQ1x1NEUwRFx1NTQwQyB2YXVsdCBcdTc2ODRcbiAqICAgXHU0RjFBXHU4QkREXHU1QjhDXHU1MTY4XHU5Njk0XHU3OUJCXHVGRjBDXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHUzMDAyXHU3QUVGXHU1M0UzXHU1MUIyXHU3QTgxXHU2OTgyXHU3Mzg3IH4xLzQwOTZcdUZGMENcdTUzRUZcdTYzQTVcdTUzRDdcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVQb3J0KHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnIHwgJ3BvcnQnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBudW1iZXIge1xuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcgJiYgdmF1bHRSb290KSB7XG4gICAgY29uc3Qgb2Zmc2V0ID0gcGFyc2VJbnQoc3RhYmxlSGFzaCh2YXVsdFJvb3QpLCAzNikgJSA0MDk2XG4gICAgcmV0dXJuIHMucG9ydCArIG9mZnNldFxuICB9XG4gIHJldHVybiBzLnBvcnRcbn1cblxuLyoqXG4gKiBwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTUxNzFcdTc1MjhcdTRFMDBcdTRFRkRcdUZGMENcdTUzRUFcdTk2OTRcdTc5QkJcdTRGMUFcdThCRERcdUZGMDlcdTMwMDJcbiAqIC0gc2hhcmVkXHVGRjFBZHNoSG9tZSBcdTgxRUFcdThFQUJcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMENcdTY1RTBcdTk3MDBcdTUxNzFcdTRFQUJcdTVDNDJcdUZGMUJcbiAqIC0gY3VzdG9tXHVGRjFBXHU3NTI4XHU2MjM3XHU2MzA3XHU1QjlBXHU4REVGXHU1Rjg0XHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjBDXHU2NUUwXHU5NzAwXHU1MTcxXHU0RUFCXHU1QzQyXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQVx1OEZENFx1NTZERVx1NTE3MVx1NEVBQiBgfi8uZHNoYFx1RkYwQ1x1OEJBOVx1NkJDRlx1NEUyQSB2YXVsdCBcdTc2ODQgc2V0dGluZ3MvY3JlZGVudGlhbHNcbiAqICAgXHU2MzA3XHU1NkRFXHU1QjgzIFx1MjAxNFx1MjAxNCBcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjggdmF1bHQgXHU3NTFGXHU2NTQ4XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdChzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnICYmIHZhdWx0Um9vdCkge1xuICAgIHJldHVybiBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmRzaCcpXG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZFxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEc2hEb2NrUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IERzaERvY2tTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1NcbiAgcHJpdmF0ZSBwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1czogU2VydmVyU3RhdHVzID0geyBraW5kOiAnc3RvcHBlZCcgfVxuICBwcml2YXRlIHN0YXJ0aW5nID0gZmFsc2VcbiAgcHJpdmF0ZSBzdGF0dXNCYXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1c0xpc3RlbmVycyA9IG5ldyBTZXQ8KCkgPT4gdm9pZD4oKVxuICAvKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTk5XHU1MTY1XHU5NjMyXHU2Mjk2IHRpbWVyXHVGRjA4XHU3QTk3XHU1M0UzIGZvY3VzIFx1NTNFRlx1ODBGRFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1RkYwOSAqL1xuICBwcml2YXRlIG1hcmtlclRpbWVyOiBudW1iZXIgfCBudWxsID0gbnVsbFxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcblxuICBvdmVycmlkZSBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKVxuXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoRFNIX1dFQl9WSUVXX1RZUEUsIChsZWFmKSA9PiBuZXcgRHNoV2ViVmlldyhsZWFmLCB0aGlzKSlcblxuICAgIC8vIFx1NjI4QVwiXHU1RjUzXHU1MjREXHU3MTI2XHU3MEI5IHZhdWx0XCJcdThERThcdThGREJcdTdBMEJcdTU0NEFcdThCQzkgRFNIIFx1NEZBN1x1RkYxQVx1NjcyQ1x1N0E5N1x1NTNFM1x1NjI1M1x1NUYwMFx1RkYwOG9ubG9hZFx1RkYwOVx1NEUwRVx1NkJDRlx1NkIyMVx1ODNCN1x1NUY5N1xuICAgIC8vIFx1NzEyNlx1NzBCOVx1NjVGNlx1NTIzN1x1NjVCMFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1MzAwMlx1NTkxQVx1N0E5N1x1NTNFM1x1NTczQVx1NjY2Rlx1NEUwQlx1NkJDRlx1NEUyQVx1N0E5N1x1NTNFM1x1OTBGRFx1NzJFQ1x1N0FDQlx1NTJBMFx1OEY3RFx1NjcyQ1x1NjNEMlx1NEVGNlx1RkYwQ1x1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1xuICAgIC8vIFx1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NTM3M1wiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXHU1NzI4XHU3NzBCXHU3Njg0IHZhdWx0XCJcdTMwMDJcbiAgICB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgIGNvbnN0IG9uV2luZG93Rm9jdXMgPSAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uV2luZG93Rm9jdXMpXG4gICAgdGhpcy5yZWdpc3RlcigoKSA9PiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbldpbmRvd0ZvY3VzKSlcbiAgICAvLyBcdTg4NjVcdTUxNDVcdTRGRTFcdTUzRjdcdUZGMUFcdTc1MjhcdTYyMzdcdTU3MjhcdTdBOTdcdTUzRTNcdTUxODVcdTUyMDdcdTYzNjJcdTY1ODdcdTRFRjYvXHU1RTAzXHU1QzQwXHU1RkM1XHU3MTM2XHU4OUU2XHU1M0QxIGFjdGl2ZS1sZWFmLWNoYW5nZVx1RkYwQ1xuICAgIC8vIFx1ODk4Nlx1NzZENiB3aW5kb3cgZm9jdXMgXHU0RThCXHU0RUY2XHU0RTBEXHU2RDNFXHU1M0QxXHU3Njg0XHU1NzNBXHU2NjZGXHUzMDAyXHU5NjMyXHU2Mjk2XHU1MTcxXHU3NTI4XHU0RTAwXHU0RTJBIHRpbWVyXHVGRjBDXHU0RTkyXHU0RTBEXHU1RTcyXHU2MjcwXHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignYWN0aXZlLWxlYWYtY2hhbmdlJywgKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCkpKVxuXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdib3QnLCAnRFNIIERvY2tcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0YnLCAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCkpXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1kc2gtcGFuZWwnLFxuICAgICAgbmFtZTogJ1x1NjI1M1x1NUYwMCBEU0ggXHU5NzYyXHU2NzdGJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdGFydC1kc2gnLFxuICAgICAgbmFtZTogJ1x1NTQyRlx1NTJBOCBEU0ggXHU2NzBEXHU1MkExJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc3RhcnQoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N0b3AtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTUwNUNcdTZCNjIgRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0b3AoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLWJyb3dzZXInLFxuICAgICAgbmFtZTogJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCBEU0gnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuSW5Ccm93c2VyKCksXG4gICAgfSlcblxuICAgIHRoaXMuc3RhdHVzQmFyRWwgPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKVxuICAgIHRoaXMucmVuZGVyU3RhdHVzQmFyKClcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IERzaERvY2tTZXR0aW5nc1RhYih0aGlzLmFwcCwgdGhpcykpXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5hdXRvc3RhcnQpIHtcbiAgICAgIHZvaWQgdGhpcy5zdGFydCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0b3BwZWQnIH0pXG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgb251bmxvYWQoKTogdm9pZCB7XG4gICAgdm9pZCB0aGlzLnN0b3AoKVxuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmNsZWFyKClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDkgKi9cbiAgcHJpdmF0ZSB2YXVsdFJvb3QoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgfVxuXG4gIG9uU3RhdHVzQ2hhbmdlKGZuOiAoKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuYWRkKGZuKVxuICAgIHJldHVybiAoKSA9PiB0aGlzLnN0YXR1c0xpc3RlbmVycy5kZWxldGUoZm4pXG4gIH1cblxuICBwcml2YXRlIHNldFN0YXR1cyhzdGF0dXM6IFNlcnZlclN0YXR1cyk6IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIGZvciAoY29uc3QgZm4gb2YgdGhpcy5zdGF0dXNMaXN0ZW5lcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZuKClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXR1c0JhcigpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc3RhdHVzQmFyRWwpIHJldHVyblxuICAgIGNvbnN0IHMgPSB0aGlzLnN0YXR1c1xuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KGBEU0g6ICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICdcdUZGMDhcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMDknIDogJyd9YClcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNicpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU2NzJBXHU4RkQwXHU4ODRDJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcblxuICAvKiogXHU4QkZCXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLm1hcmtlclRpbWVyKVxuICAgIHRoaXMubWFya2VyVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgpXG4gICAgfSwgMzAwKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuXG4gIC8qKiBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NjMwMlx1NjNBNVx1RkYxQlx1NTQyNlx1NTIxOSBzcGF3biBcdTVCOThcdTY1QjkgZHNoIHdlYiAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xuICAgIGlmICh0aGlzLnN0YXJ0aW5nKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICB0aGlzLnN0YXJ0aW5nID0gdHJ1ZVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0YXJ0aW5nJyB9KVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgICBjb25zdCBkc2hIb21lID0gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHNoYXJlZENvbmZpZ1Jvb3QgPSBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgaG9zdDogdGhpcy5zZXR0aW5ncy5ob3N0LFxuICAgICAgICBkc2hIb21lLFxuICAgICAgICAvLyBwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHUzMDAyXG4gICAgICAgIC4uLihzaGFyZWRDb25maWdSb290ID8geyBzaGFyZWRDb25maWdSb290IH0gOiB7fSksXG4gICAgICAgIHVzZUVtYmVkZGVkTm9kZTogdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUsXG4gICAgICAgIC8vIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFcdTZDRThcdTUxNjVcdTY3MkNcdTY3MERcdTUyQTFcdTYyNDBcdTVDNUVcdTVFOTMgZW52XHVGRjA4XHU3QjJDXHU0RThDXHU5MDFBXHU5MDUzXHVGRjA5XHUzMDAyXHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XHU4OUUzXHU2NzkwXHU2NUY2XG4gICAgICAgIC8vIFx1NEYxOFx1NTE0OFx1NzUyOFx1NjcyQyBlbnYgXHU4QkM2XHU1MjJCXCJcdTY3MkNcdTY3MERcdTUyQTFcdTY3MERcdTUyQTFcdTc2ODRcdTVFOTNcIlx1RkYwQ2N3ZCBcdTRGRERcdTYzMDEgZHNoIFx1OEZEQlx1N0EwQlx1OUVEOFx1OEJBNFx1NURFNVx1NEY1Q1x1NzZFRVx1NUY1NVxuICAgICAgICAvLyBcdTRFMERcdTUzRDggXHUyMDE0XHUyMDE0IGN3ZCBcdTRFMEUgT2JzaWRpYW4gXHU1RTkzXHU2NjJGXHU0RTI0XHU0RTJBXHU3MkVDXHU3QUNCXHU2OTgyXHU1RkY1XHVGRjBDXHU0RTBEXHU1NDA4XHU1RTc2XHUzMDAyXG4gICAgICAgIGVudjogc2hhcmVkQ29uZmlnUm9vdCAmJiB2YXVsdEluZm9cbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgRFNIX09CU0lESUFOX1ZBVUxUX05BTUU6IHZhdWx0SW5mby5uYW1lLFxuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfUEFUSDogdmF1bHRJbmZvLnBhdGgsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiB7fSxcbiAgICAgIH0pXG4gICAgICB0aGlzLnByb2MgPSByZXN1bHQucHJvYyA/PyBudWxsXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgcmVzdWx0LnByb2MpIHtcbiAgICAgICAgdGhpcy5ob29rQ2hpbGRMb2dzKHJlc3VsdC5wcm9jKVxuICAgICAgfVxuICAgICAgdGhpcy5zZXRTdGF0dXMocmVzdWx0LnN0YXR1cylcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtyZXN1bHQuc3RhdHVzLm1lc3NhZ2V9YClcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgIXJlc3VsdC5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFdlYiBcdTVERjJcdTVDMzFcdTdFRUE6ICR7cmVzdWx0LnN0YXR1cy51cmx9YClcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBtc2cgfSlcbiAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTVGMDJcdTVFMzg6ICR7bXNnfWApXG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgaWYgKHRoaXMucHJvYykge1xuICAgICAgYXdhaXQgc3RvcFByb2Nlc3ModGhpcy5wcm9jKVxuICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgIH1cbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICB9XG5cbiAgcHJpdmF0ZSBob29rQ2hpbGRMb2dzKHByb2M6IENoaWxkUHJvY2Vzcyk6IHZvaWQge1xuICAgIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUud2FybignW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhdGhpcy5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBOiBjb2RlPSR7Y29kZX0gc2lnbmFsPSR7c2lnbmFsID8/ICcnfWAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tkc2gtZG9ja10gXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGJywgZXJyKVxuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRjogJHtlcnIubWVzc2FnZX1gIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKiBcdTYzQTJcdTZENEJcdTRGRTFcdTYwNkZcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZGV0ZWN0SW5mbygpOiB7IGRzaEJpbjogc3RyaW5nIHwgbnVsbDsgZHNoTm90ZXM6IHN0cmluZ1tdOyBub2RlTm90ZXM6IHN0cmluZ1tdIH0ge1xuICAgIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbih0aGlzLnNldHRpbmdzLmRzaEJpbilcbiAgICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4odGhpcy5zZXR0aW5ncy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKVxuICAgIHJldHVybiB7XG4gICAgICBkc2hCaW46IGZvdW5kLmJpbixcbiAgICAgIGRzaE5vdGVzOiBmb3VuZC5ub3RlcyxcbiAgICAgIG5vZGVOb3Rlczogbm9kZS5ub3RlcyxcbiAgICB9XG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0IERTSF9IT01FXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGVmZmVjdGl2ZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTdBRUZcdTUzRTNcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOSAqL1xuICBlZmZlY3RpdmVQb3J0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRiA9IH4vLmRzaFx1RkYwQ1x1NTE3Nlx1NEY1OVx1NjVFMFx1RkYwOSAqL1xuICBlZmZlY3RpdmVTaGFyZWRDb25maWdSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgYXMgUGFydGlhbDxEc2hEb2NrU2V0dGluZ3M+IHwgbnVsbFxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBkYXRhID8/IHt9KVxuICAgIC8vIFx1NjVFN1x1NzI0OFx1RkYwOGRzaC1ob3N0IFYwLjFcdUZGMDlcdThCQkVcdTdGNkVcdThGQzFcdTc5RkJcdUZGMUFkc2hIb21lIFx1NUI1N1x1N0IyNlx1NEUzMiBcdTIxOTIgY3VzdG9tIFx1NkEyMVx1NUYwRlxuICAgIGNvbnN0IGxlZ2FjeTogeyBkc2hIb21lPzogc3RyaW5nIH0gfCBudWxsID0gZGF0YVxuICAgIGlmIChsZWdhY3k/LmRzaEhvbWUgJiYgdHlwZW9mIGxlZ2FjeS5kc2hIb21lID09PSAnc3RyaW5nJyAmJiBsZWdhY3kuZHNoSG9tZS50cmltKCkpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSAnY3VzdG9tJ1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lID0gbGVnYWN5LmRzaEhvbWUudHJpbSgpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBVSVxuXG4gIGFzeW5jIG9wZW5QYW5lbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHBcbiAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERTSF9XRUJfVklFV19UWVBFKVxuICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IGxlYXZlc1swXSA/PyBudWxsXG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSlcbiAgICAgIGlmICghbGVhZikgcmV0dXJuXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9XG4gICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZilcbiAgfVxuXG4gIGFzeW5jIG9wZW5JbkJyb3dzZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgc2hlbGwub3BlbkV4dGVybmFsKHRoaXMuYmFzZVVybClcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhPYnNpZGlhbiBwb3BvdXRcdUZGMDlcdUZGMUFEU0ggXHU5NzYyXHU2NzdGXHU4RkRCXHU1MTY1XHU3MkVDXHU3QUNCIEJyb3dzZXJXaW5kb3cgPVxuICAgKiBcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTRFMEUgT2JzaWRpYW4gXHU0RTNCXHU3QTk3XHU1M0UzXHU5Njk0XHU3OUJCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHU2ODA3XHU3QjdFXHU5ODc1XHUzMDAyXG4gICAqL1xuICBhc3luYyBvcGVuUG9wb3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLm9wZW5Qb3BvdXRMZWFmKClcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICBuZXcgTm90aWNlKGBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdTU5MzFcdThEMjU6ICR7bXNnfWApXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBsYXVuY2hlci50cyBcdTIwMTRcdTIwMTQgXHU3RUFGXHU1NDJGXHU1MkE4XHU5MDNCXHU4RjkxXHVGRjA4XHU5NkY2IE9ic2lkaWFuIFx1NEY5RFx1OEQ1Nlx1RkYwQ1x1NTNFRlx1NzJFQ1x1N0FDQlx1NTE5Mlx1NzBERlx1NkQ0Qlx1OEJENVx1RkYwOVx1MzAwMlxuICpcbiAqIFx1ODA0Q1x1OEQyM1x1RkYxQVx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYgXHUyMTkyIHNwYXduIGBkc2ggd2ViYFxuICogXHVGRjA4MTI3LjAuMC4xOjxwb3J0Plx1RkYwOVx1MjE5MiBcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUEgXHUyMTkyIFx1NTA1Q1x1NkI2Mlx1MzAwMlxuICpcbiAqIFx1NTE3M1x1OTUyRVx1NEU4Qlx1NUI5RVx1RkYwOFx1NURGMlx1NTcyOFx1NUI5OFx1NjVCOSBAZGVlcHNlZWstYWkvZHNoQDAuMS4wLXJjLjYgXHU0RTBBXHU5QThDXHU4QkMxXHVGRjA5XHVGRjFBXG4gKiAtIGBub2RlIDxkc2g+L2xpYi9iaW4uanMgd2ViIC0taG9zdCAxMjcuMC4wLjEgLS1wb3J0IDxwb3J0PmAgXHU1MzczXHU1Qjk4XHU2NUI5IFdlYiBVSVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTQgaG9zdD0xMjcuMC4wLjFcdTMwMDFwb3J0PTMwODBcdUZGMDhcdTUzRUZcdTg5ODZcdTc2RDZcdUZGMDlcdUZGMUJcbiAqIC0gXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU4MUVBXHU1MkE4XHU1MjFEXHU1OUNCXHU1MzE2ICREU0hfSE9NRS9wcm9maWxlcy93ZWJcdUZGMDhidW5kbGVzID0gZHNoLWJhc2UgKyBkc2gtd2ViLWFwcFx1RkYwOVx1RkYwQ1xuICogICBcdTZBMjFcdTU3NTdcdTg5RTNcdTY3OTBcdThENzAgJERTSF9IT01FL3Byb2ZpbGVzL25vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTdCMjZcdTUzRjdcdTk0RkVcdTYzQTVcdUZGMENcdTY1RTBcdTk3MDAgcG5wbS9cdTgwNTRcdTdGNTFcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0XHU5MTREXHU3RjZFXHU0RTBCIFNRTGl0ZVx1RkYwOG5vZGU6c3FsaXRlXHVGRjBDXHU5NzAwIE5vZGUgXHUyMjY1MjIuNVx1RkYwOVx1NEUwRFx1NEYxQVx1NjI1M1x1NUYwMFx1RkYwOG9wZW5BdDogbmV2ZXJcdUZGMDlcdUZGMENcbiAqICAgXHU1NkUwXHU2QjY0IE5vZGUgMjArIFx1NEU1Rlx1ODBGRFx1OEREMVx1OUVEOFx1OEJBNCB3ZWIgcHJvZmlsZVx1RkYxQlx1NTQyRlx1NzUyOFx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NjVGNlx1NjI0RFx1OTcwMFx1ODk4MSBOb2RlIFx1MjI2NTIyLjVcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBzcGF3biwgc3Bhd25TeW5jLCB0eXBlIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCdcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5leHBvcnQgY29uc3QgRFNIX1JFTEFUSVZFX0JJTiA9IHBhdGguam9pbignQGRlZXBzZWVrLWFpJywgJ2RzaCcsICdsaWInLCAnYmluLmpzJylcblxuLyoqIE5vZGUgXHU0RTNCXHU3MjQ4XHU2NzJDXHU1M0Y3XHU2QkQ0XHU4RjgzXHVGRjFBbm9kZTpzcWxpdGUgXHU5NzAwXHU4OTgxIFx1MjI2NTIyLjVcdUZGMDhcdTRFQzVcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTUyOUZcdTgwRkRcdTc1MjhcdTUyMzBcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBOT0RFX1NRTElURV9NSU5fTUFKT1IgPSAyMlxuXG4vKiogXHU3QTMzXHU1QjlBXHU3N0VEXHU1NEM4XHU1RTBDXHVGRjA4ZGpiMlx1RkYwOVx1RkYwQ1x1NzUyOFx1NEU4RSB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdTZEODhcdTZCNjdcdUZGMENcdTkwN0ZcdTUxNERcdTRFMkRcdTY1ODdcdTU0MERcdTZFMDVcdTZEMTdcdTc4QjBcdTY0OUUgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFibGVIYXNoKGlucHV0OiBzdHJpbmcsIGxlbiA9IDYpOiBzdHJpbmcge1xuICBsZXQgaCA9IDUzODFcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykgaCA9ICgoaCA8PCA1KSArIGggKyBpbnB1dC5jaGFyQ29kZUF0KGkpKSA+Pj4gMFxuICByZXR1cm4gaC50b1N0cmluZygzNikucGFkU3RhcnQobGVuLCAnMCcpLnNsaWNlKDAsIGxlbilcbn1cblxuLyoqIFx1NTNFRlx1OEJGQlx1NzY4NCB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdUZGMDhcdTRGRERcdTc1NTkgVW5pY29kZSBcdTVCNTdcdTZCQ0RcdTY1NzBcdTVCNTdcdUZGMENcdTUxNzZcdTRGNTlcdThGNkMgLVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOSAndmF1bHQnICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZVZhdWx0TmFtZSh2YXVsdFJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNsZWFuZWQgPSBwYXRoXG4gICAgLmJhc2VuYW1lKHZhdWx0Um9vdClcbiAgICAucmVwbGFjZSgvW15cXHB7TH1cXHB7Tn1fLV0rL2d1LCAnLScpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgJycpXG4gIHJldHVybiAoY2xlYW5lZCB8fCAndmF1bHQnKS5zbGljZSgwLCA0MClcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hPcHRpb25zIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1x1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbj86IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTkgKi9cbiAgbm9kZUJpbj86IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydD86IG51bWJlclxuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTQgMTI3LjAuMC4xXHVGRjBDXHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q/OiBzdHJpbmdcbiAgLyoqICREU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERC9cdTVCQzZcdTk0QTUvXHU2QTIxXHU1NzhCXHU5MTREXHU3RjZFXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjFCXHU5RUQ4XHU4QkE0IDx2YXVsdD4vLmRzaFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqXG4gICAqIFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODQgYH4vLmRzaGBcdUZGMDlcdUZGMUFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1N0Y2RVx1N0M3Qlx1NjU4N1x1NEVGNlxuICAgKiBcdTYzMDdcdTU0MTFcdTZCNjRcdTc2RUVcdTVGNTVcdUZGMENcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU0RTAwXHU0RUZEXHVGRjFCc2Vzc2lvbnMgXHU3QjQ5XHU2NTcwXHU2MzZFXHU0RUNEXHU1NzI4IGBkc2hIb21lYCBcdTk2OTRcdTc5QkJcdTMwMDJcbiAgICogXHU3NTU5XHU3QTdBID0gXHU0RTBEXHU1NDJGXHU3NTI4XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4ZHNoSG9tZSBcdTgxRUFcdThFQUJcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDlcdTMwMDJcbiAgICovXG4gIHNoYXJlZENvbmZpZ1Jvb3Q/OiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlPzogYm9vbGVhblxuICAvKiogXHU1QzMxXHU3RUVBXHU3QjQ5XHU1Rjg1XHU0RTBBXHU5NjUwXHVGRjA4XHU5RUQ4XHU4QkE0IDEyMHNcdUZGMDkgKi9cbiAgdGltZW91dE1zPzogbnVtYmVyXG4gIC8qKiBcdTk2NDRcdTUyQTBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgKi9cbiAgZW52PzogTm9kZUpTLlByb2Nlc3NFbnZcbiAgLyoqXG4gICAqIFx1NUI1MFx1OEZEQlx1N0EwQlx1NURFNVx1NEY1Q1x1NzZFRVx1NUY1NVx1MzAwMnBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRGMjAgdmF1bHQgXHU2ODM5XHVGRjFBXHU2NUIwXHU1RUZBXHU0RjFBXHU4QkREXHU3Njg0IGN3ZCBcdTUzNzNcdTY3MkNcdTVFOTNcdTY4MzlcdUZGMENcbiAgICogdmF1bHQgXHU1REU1XHU1MTc3XHU4OUUzXHU2NzkwXHU5ODdBXHU1RThGXHU3QjJDIDMgXHU0RjREXHVGRjA4XHU0RjFBXHU4QkREIGN3ZCBcdTgyRTVcdTY2MkZcdTVFOTNcdUZGMDlcdTc2RjRcdTYzQTVcdTU0N0RcdTRFMkQgXHUyMDE0XHUyMDE0IFx1NTcyOFx1NzUxRlx1NzI2OVx1NTkwN1x1OEJGRVx1NzY4NFxuICAgKiBcdTY3MERcdTUyQTFcdTkxQ0NcdTYzRDBcdTk1RUVcdTdFRERcdTRFMERcdTRGMUFcdTg5RTNcdTY3OTBcdTYyMTBcdTc1MUZcdTcyNjlcdTk4OThcdTVFOTNcdTMwMDJzaGFyZWQgXHU2QTIxXHU1RjBGXHU0RTBEXHU0RjIwXHVGRjA4XHU2MjQwXHU2NzA5XHU1RTkzXHU1MTcxXHU3NTI4XHU0RTAwXHU0RTJBXHU2NzBEXHU1MkExXHVGRjBDXG4gICAqIFx1OTc2MFx1NzEyNlx1NzBCOVx1NjgwN1x1OEJCMFx1OERERlx1OTY4Rlx1RkYwOVx1MzAwMlxuICAgKi9cbiAgY3dkPzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWROb2RlIHtcbiAgLyoqIFx1NzUyOFx1NEU4RSBzcGF3biBcdTc2ODQgbm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU2MjhBIE9ic2lkaWFuIFx1NzY4NCBFbGVjdHJvbiBcdTRFOENcdThGREJcdTUyMzZcdTVGNTMgTm9kZSBcdTc1MjggKi9cbiAgdXNlRWxlY3Ryb25Bc05vZGU6IGJvb2xlYW5cbiAgLyoqIFx1OEJFNSBOb2RlIFx1NzY4NCBtYWpvciBcdTcyNDhcdTY3MkNcdUZGMDhcdTYzQTJcdTZENEJcdTU5MzFcdThEMjVcdTRFM0EgMFx1RkYwOSAqL1xuICBub2RlTWFqb3I6IG51bWJlclxuICAvKiogXHU2M0EyXHU2RDRCL1x1NTFCM1x1N0I1Nlx1OEJGNFx1NjYwRVx1RkYwOFx1NEY5Qlx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBub3Rlczogc3RyaW5nW11cbn1cblxuZXhwb3J0IHR5cGUgU2VydmVyU3RhdHVzID1cbiAgfCB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHwgeyBraW5kOiAnc3RhcnRpbmcnIH1cbiAgfCB7IGtpbmQ6ICdydW5uaW5nJzsgcG9ydDogbnVtYmVyOyBob3N0OiBzdHJpbmc7IHVybDogc3RyaW5nOyBhdHRhY2hlZDogYm9vbGVhbiB9XG4gIHwgeyBraW5kOiAnZXJyb3InOyBtZXNzYWdlOiBzdHJpbmcgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1OERFRlx1NUY4NFx1NUI5QVx1NEY0RFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTYyOEFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTUxNjVcdTUzRTNcdTg5QzRcdTgzMDNcdTUzMTZcdUZGMUFcdTYzMDdcdTU0MTEgYmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU5MEZEXHU2M0E1XHU1M0Q3ICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRHNoQmluKGlucHV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghaW5wdXQpIHJldHVybiBudWxsXG4gIGNvbnN0IHAgPSBpbnB1dC50cmltKClcbiAgaWYgKCFwKSByZXR1cm4gbnVsbFxuICBjb25zdCBleHBhbmRlZCA9IHAucmVwbGFjZSgvXn4oPz0kfFxcL3xcXFxcKS8sIG9zLmhvbWVkaXIoKSlcbiAgY29uc3QgYWJzID0gcGF0aC5pc0Fic29sdXRlKGV4cGFuZGVkKSA/IHBhdGgubm9ybWFsaXplKGV4cGFuZGVkKSA6IHBhdGgucmVzb2x2ZShleHBhbmRlZClcbiAgdHJ5IHtcbiAgICBjb25zdCBzdCA9IGZzLnN0YXRTeW5jKGFicylcbiAgICBpZiAoc3QuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKGFicywgJ2xpYicsICdiaW4uanMnKVxuICAgICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IG51bGxcbiAgICB9XG4gICAgaWYgKHN0LmlzRmlsZSgpKSByZXR1cm4gYWJzXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuLyoqIFx1NUUzOFx1ODlDMSBucG0gXHU1MTY4XHU1QzQwIG5vZGVfbW9kdWxlcyBcdTY4MzlcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxNb2R1bGVSb290cygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJvb3RzOiBzdHJpbmdbXSA9IFtdXG4gIGlmIChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpIHJvb3RzLnB1c2gocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKVxuICBjb25zdCBucG1Sb290ID0gc3Bhd25TeW5jKCducG0nLCBbJ3Jvb3QnLCAnLWcnXSwge1xuICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgdGltZW91dDogMTBfMDAwLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxuICBpZiAobnBtUm9vdC5zdGF0dXMgPT09IDAgJiYgbnBtUm9vdC5zdGRvdXQpIHtcbiAgICBjb25zdCBsaW5lID0gbnBtUm9vdC5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLylbMF1cbiAgICBpZiAobGluZSkgcm9vdHMucHVzaChsaW5lKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIHJvb3RzLnB1c2goJy9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICByb290cy5wdXNoKCcvdXNyL2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdsaWInLCAnbm9kZV9tb2R1bGVzJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIGNvbnN0IGFwcERhdGEgPSBwcm9jZXNzLmVudi5BUFBEQVRBXG4gICAgaWYgKGFwcERhdGEpIHJvb3RzLnB1c2gocGF0aC5qb2luKGFwcERhdGEsICducG0nLCAnbm9kZV9tb2R1bGVzJykpXG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXG4gIHJldHVybiBbLi4ubmV3IFNldChyb290cyldXG59XG5cbi8qKlxuICogXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1MTY1XHU1M0UzXHUzMDAyXHU0RjE4XHU1MTQ4XHU3RUE3XHVGRjFBXG4gKiAxLiBcdTY2M0VcdTVGMEZcdTRGMjBcdTUxNjVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdUZGMDlcdTIxOTIgMi4gXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIERTSF9CSU4gXHUyMTkyIDMuIG5wbSByb290IC1nIFx1MjE5MiA0LiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTY4MzlcdTMwMDJcbiAqIFx1NjcyQVx1NjI3RVx1NTIzMFx1NjVGNiBiaW4gXHU0RTNBIG51bGxcdUZGMENub3RlcyBcdThCRjRcdTY2MEVcdTUzOUZcdTU2RTBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEc2hCaW4oZXhwbGljaXQ/OiBzdHJpbmcpOiB7IGJpbjogc3RyaW5nIHwgbnVsbDsgbm90ZXM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IG5vcm1hbGl6ZURzaEJpbihleHBsaWNpdCA/PyBwcm9jZXNzLmVudi5EU0hfQklOKVxuICBpZiAoZXhwbGljaXRCaW4gJiYgZnMuZXhpc3RzU3luYyhleHBsaWNpdEJpbikpIHtcbiAgICByZXR1cm4geyBiaW46IGV4cGxpY2l0QmluLCBub3RlczogW2BcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEZcdThERUZcdTVGODQ6ICR7ZXhwbGljaXRCaW59YF0gfVxuICB9XG4gIGlmIChleHBsaWNpdCkgbm90ZXMucHVzaChgXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0XHU0RTBEXHU1QjU4XHU1NzI4OiAke2V4cGxpY2l0fWApXG5cbiAgZm9yIChjb25zdCByb290IG9mIGdsb2JhbE1vZHVsZVJvb3RzKCkpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4ocm9vdCwgRFNIX1JFTEFUSVZFX0JJTilcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICByZXR1cm4geyBiaW46IGNhbmRpZGF0ZSwgbm90ZXM6IFsuLi5ub3RlcywgYFx1NEVDRVx1NTE2OFx1NUM0MFx1NkEyMVx1NTc1N1x1NjgzOVx1NTNEMVx1NzNCMDogJHtjYW5kaWRhdGV9YF0gfVxuICAgIH1cbiAgfVxuICBub3Rlcy5wdXNoKCdcdTY3MkFcdTYyN0VcdTUyMzAgZHNoIFx1NUI4OVx1ODhDNVx1MzAwMlx1OEJGN1x1NTE0OFx1NjI2N1x1ODg0QzogbnBtIGluc3RhbGwgLWcgQGRlZXBzZWVrLWFpL2RzaFx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBkc2ggXHU4REVGXHU1Rjg0JylcbiAgcmV0dXJuIHsgYmluOiBudWxsLCBub3RlcyB9XG59XG5cbi8qKlxuICogXHU1RTM4XHU4OUMxIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjBDXHU2M0EyXHU2RDRCXHU3NTI4XHVGRjA5XHUzMDAyXG4gKiBPYnNpZGlhbiBcdTRGNUNcdTRFM0EgR1VJIFx1NUU5NFx1NzUyOFx1NEVDRSBGaW5kZXIgXHU1NDJGXHU1MkE4XHU2NUY2XHVGRjBDUEFUSCBcdTkwMUFcdTVFMzhcdTUzRUFcdTY3MDlcdTdDRkJcdTdFREZcdTc2RUVcdTVGNTVcbiAqIFx1RkYwOC91c3IvYmluOi9iaW46L3Vzci9zYmluOi9zYmluXHVGRjA5XHVGRjBDXHU0RTBEXHU1NDJCIEhvbWVicmV3IFx1N0I0OVx1NzUyOFx1NjIzN1x1NUI4OVx1ODhDNVx1NzZFRVx1NUY1NVx1RkYwQ1xuICogXHU1NkUwXHU2QjY0IHNwYXduKCdub2RlJykgXHU0RjFBXHU3NkY0XHU2M0E1IEVOT0VOVFx1MzAwMlx1OEZEOVx1OTFDQ1x1NjI4QVx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1NEY0RFx1N0Y2RVx1ODg2NVx1OUY1MFx1RkYxQVxuICogLSBQQVRIIFx1NEUyRFx1NzY4NCBub2RlXHVGRjA4c2hlbGwgXHU5MUNDXHU4RkQwXHU4ODRDXHU2NUY2XHU1QjU4XHU1NzI4XHVGRjA5XHVGRjFCXG4gKiAtIG1hY09TOiAvb3B0L2hvbWVicmV3L2Jpbi9ub2RlXHVGRjA4QXBwbGUgU2lsaWNvblx1RkYwOVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdUZGMDhJbnRlbFx1RkYwOVx1RkYxQlxuICogLSBMaW51eDogL3Vzci9iaW4vbm9kZVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdTMwMDF+Ly5sb2NhbC9iaW4vbm9kZVx1RkYxQlxuICogLSBXaW5kb3dzOiBcdTkwMUFcdThGQzcgYHdoZXJlIG5vZGVgIFx1ODlFM1x1Njc5MFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tbW9uTm9kZUJpbnMoKTogc3RyaW5nW10ge1xuICBjb25zdCBiaW5zOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IHBhdGhFbnYgPSBwcm9jZXNzLmVudi5QQVRIID8/ICcnXG4gIGZvciAoY29uc3QgZGlyIG9mIHBhdGhFbnYuc3BsaXQocGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgaWYgKGRpci50cmltKCkpIGJpbnMucHVzaChwYXRoLmpvaW4oZGlyLCAnbm9kZScpKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIGJpbnMucHVzaCgnL29wdC9ob21lYnJldy9iaW4vbm9kZScsICcvdXNyL2xvY2FsL2Jpbi9ub2RlJylcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnbGludXgnKSB7XG4gICAgYmlucy5wdXNoKCcvdXNyL2Jpbi9ub2RlJywgJy91c3IvbG9jYWwvYmluL25vZGUnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2JpbicsICdub2RlJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB3aGVyZSA9IHNwYXduU3luYygnd2hlcmUnLCBbJ25vZGUnXSwgeyBlbmNvZGluZzogJ3V0ZjgnLCB0aW1lb3V0OiAxMF8wMDAsIHdpbmRvd3NIaWRlOiB0cnVlIH0pXG4gICAgICBpZiAod2hlcmUuc3RhdHVzID09PSAwICYmIHdoZXJlLnN0ZG91dCkge1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2Ygd2hlcmUuc3Rkb3V0LnRyaW0oKS5zcGxpdCgvXFxyP1xcbi8pKSB7XG4gICAgICAgICAgaWYgKGxpbmUudHJpbSgpKSBiaW5zLnB1c2gobGluZS50cmltKCkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcdUZGMENcdTRGRERcdTc1NTlcdTdCMkNcdTRFMDBcdTRFMkFcdTVCNThcdTU3MjhcdTc2ODRcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KGJpbnMpXVxufVxuXG4vKipcbiAqIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNlx1MzAwMlxuICogXHU5RUQ4XHU4QkE0XHU5ODdBXHU1RThGXHVGRjFBXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0IFx1MjE5MiBcdTdDRkJcdTdFREYgYG5vZGVgXHVGRjA4UEFUSCArIFx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1OERFRlx1NUY4NFx1RkYwQ1x1OEZENFx1NTZERVx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1xuICogXHU5MDdGXHU1MTREIE9ic2lkaWFuIEdVSSBcdTczQUZcdTU4ODMgUEFUSCBcdTdGM0FcdTU5MzFcdTVCRkNcdTgxRjQgc3Bhd24gRU5PRU5UXHVGRjA5XHUyMTkyIFx1NjI3RVx1NEUwRFx1NTIzMFx1NjVGNlx1N0VEOVx1NTFGQVx1NjYwRVx1Nzg2RVx1OTUxOVx1OEJFRlx1MzAwMlxuICogRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlIFx1NUI5RVx1NkQ0Qlx1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwOE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlxuICogXHU0RTBEXHU2MzA5XHU2NjZFXHU5MDFBIEVsZWN0cm9uIFx1OEJFRFx1NEU0OVx1NTRDRFx1NUU5NFx1RkYwOVx1RkYwQ1x1NTZFMFx1NkI2NFx1NEVDNVx1NUY1MyB1c2VFbWJlZGRlZE5vZGUgXHU2NjNFXHU1RjBGXHU1RjAwXHU1NDJGXHU2NUY2XHU2MjREXHU1QzFEXHU4QkQ1XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTm9kZUJpbihleHBsaWNpdD86IHN0cmluZywgZW1iZWRkZWROb2RlVmVyc2lvbj86IHN0cmluZywgdXNlRW1iZWRkZWQgPSBmYWxzZSk6IFJlc29sdmVkTm9kZSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gZXhwbGljaXQ/LnRyaW0oKSB8fCBwcm9jZXNzLmVudi5EU0hfTk9ERVxuICBpZiAoZXhwbGljaXRCaW4pIHtcbiAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEYgTm9kZTogJHtleHBsaWNpdEJpbn1gKVxuICAgIHJldHVybiB7IG5vZGVCaW46IGV4cGxpY2l0QmluLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZCAmJiBwcm9jZXNzLmV4ZWNQYXRoICYmIGVtYmVkZGVkTm9kZVZlcnNpb24pIHtcbiAgICBjb25zdCBtYWpvciA9IE51bWJlcihlbWJlZGRlZE5vZGVWZXJzaW9uLnNwbGl0KCcuJylbMF0pIHx8IDBcbiAgICBpZiAobWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufVx1RkYwOEVMRUNUUk9OX1JVTl9BU19OT0RFXHVGRjA5YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IHByb2Nlc3MuZXhlY1BhdGgsIHVzZUVsZWN0cm9uQXNOb2RlOiB0cnVlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICAgIG5vdGVzLnB1c2goYE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn0gPCAke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMENcdTY1RTBcdTZDRDVcdTU0MkZcdTc1MjhgKVxuICB9XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNvbW1vbk5vZGVCaW5zKCkpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTdDRkJcdTdFREYgTm9kZTogJHtjYW5kaWRhdGV9YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IGNhbmRpZGF0ZSwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIE5vZGVcdTMwMDJcdThCRjdcdTVCODlcdTg4QzUgTm9kZVx1RkYwOGh0dHBzOi8vbm9kZWpzLm9yZ1x1RkYwOVx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IG5vZGVCaW46ICcnLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1N0FFRlx1NTNFM1x1NjNBMlx1NkQ0Qlx1NEUwRVx1N0I0OVx1NUY4NVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTVGNTNcdTUyNERcdThGRDBcdTg4NENcdTczQUZcdTU4ODNcdUZGMDhPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMDlcdTgxRUFcdTVFMjZcdTc2ODQgTm9kZSBcdTcyNDhcdTY3MkNcdUZGMUJcdTY1RTBcdTUyMTkgdW5kZWZpbmVkICovXG5leHBvcnQgZnVuY3Rpb24gZW1iZWRkZWROb2RlVmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIGNvbnN0IHYgPSAocHJvY2Vzcy52ZXJzaW9ucyBhcyB7IG5vZGU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/Lm5vZGVcbiAgICByZXR1cm4gdiB8fCB1bmRlZmluZWRcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogXHU3QUVGXHU1M0UzXHU2NjJGXHU1NDI2XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHUzMDAyXG4gKiBcdTc1Mjggbm9kZTpodHRwIFx1ODAwQ1x1OTc1RVx1NkQ0Rlx1ODlDOFx1NTY2OCBmZXRjaFx1RkYxQU9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1NzY4NCBDU1AgXHU0RjFBXHU2MkU2XHU2MjJBXG4gKiBcdTVCRjkgaHR0cDovLzEyNy4wLjAuMSBcdTc2ODQgZmV0Y2hcdUZGMENcdTVCRkNcdTgxRjRcIlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVwiXHU4QkVGXHU1MjI0XHU0RTNBXCJcdTZDQTFcdTY3MDlcIlx1MzAwMlxuICogTm9kZSBcdTc2ODQgaHR0cCBcdTZBMjFcdTU3NTdcdTRFMERcdTUzRDdcdTk4NzVcdTk3NjIgQ1NQIFx1N0VBNlx1Njc1Rlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQb3J0VXAoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDE1MDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgcmVxID0gaHR0cC5nZXQoeyBob3N0LCBwb3J0LCBwYXRoOiAnLycsIHRpbWVvdXQ6IHRpbWVvdXRNcyB9LCAocmVzKSA9PiB7XG4gICAgICByZXMucmVzdW1lKClcbiAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICB9KVxuICAgIHJlcS5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIHJlcS5kZXN0cm95KClcbiAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgfSlcbiAgICByZXEub24oJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZShmYWxzZSkpXG4gIH0pXG59XG5cbi8qKiBcdThGNkVcdThCRTJcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUFcdUZGMUJcdThEODVcdTY1RjZcdThGRDRcdTU2REUgZmFsc2UgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yUmVhZHkoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDEyMF8wMDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVhZGxpbmUgPSBEYXRlLm5vdygpICsgdGltZW91dE1zXG4gIGZvciAoOzspIHtcbiAgICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCwgMTUwMCkpIHJldHVybiB0cnVlXG4gICAgaWYgKERhdGUubm93KCkgPiBkZWFkbGluZSkgcmV0dXJuIGZhbHNlXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IGdsb2JhbFRoaXMuc2V0VGltZW91dChyLCA1MDApKVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hlZFNlcnZlciB7XG4gIHByb2M6IENoaWxkUHJvY2Vzc1xuICB1cmw6IHN0cmluZ1xuICAvKiogdHJ1ZSA9IFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwQ1x1NjcyQVx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQiAqL1xuICBhdHRhY2hlZDogYm9vbGVhblxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFcdTYyOEEgcGVyLXZhdWx0IERTSF9IT01FIFx1NzY4NCBgcHJvZmlsZXMvYCBcdTY2RkZcdTYzNjJcdTRFM0FcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUJcbiAqIGB+Ly5kc2gvcHJvZmlsZXNgIFx1NzY4NFx1OEY2Rlx1OTRGRVx1MzAwMlx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1RkYwOFx1N0VBNiAxOTUgXHU0RTJBIEBkZWVwc2Vlay1haSBcdTUzMDVcdUZGMDlcdTUxNjhcdTVDNDBcbiAqIFx1NEUwMFx1NEVGRFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NkJDRlx1NEUyQSB2YXVsdCBcdTU0MDRcdTgxRUFcdTk0RkFcdTUxRTBcdTc2N0UgTUIgXHU3Njg0IG5vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTk0RkVcdTYzQTVcdUZGMUJza2lsbCBcdTVCOUFcdTRFNDlcbiAqIFx1NEU1Rlx1OTY4Rlx1NTE3MVx1NEVBQiBwcm9maWxlcy9hZ2VudC1wcmVzZXRzIFx1NEUwMFx1NUU3Nlx1NTkwRFx1NzUyOFx1MzAwMlxuICpcbiAqIFx1NTQwQ1x1NjVGNlx1NjI4QSBgLmFnZW50LXByZXNldHMvYCBcdThGNkZcdTk0RkVcdTUyMzBcdTUxNzFcdTRFQUIgYH4vLmRzaC8uYWdlbnQtcHJlc2V0c2BcdUZGMUFhZ2VudCBwcmVzZXRcbiAqIFx1NzY4NFx1NTNEMVx1NzNCMFx1NjgzOVx1NjYyRiBgZHNoSG9tZVBhdGgoJy5hZ2VudC1wcmVzZXRzJylgXHVGRjA4XHU4RERGXHU5NjhGIERTSF9IT01FXHVGRjA5XHVGRjBDcGVyLXZhdWx0XG4gKiBcdTZBMjFcdTVGMEZcdTgyRTVcdTRFMERcdTU0MENcdTZCNjVcdThGNkZcdTk0RkVcdUZGMENkc2ggXHU0RjFBXHU0RUNFIHBlci12YXVsdCBcdTc2RUVcdTVGNTVcdTYyN0UgcHJlc2V0IFx1MjAxNFx1MjAxNCBcdTc1MjhcdTYyMzdcdTgxRUFcdTVCOUFcdTRFNDlcdTc2ODRcbiAqIGBvYnNpZGlhbmAgcHJlc2V0XHVGRjA4XHU2MzAyXHU4RjdEIHZhdWx0IFx1NURFNVx1NTE3NyArIG9ic2lkaWFuLWNvbnZlbnRpb25zIHNraWxsXHVGRjA5XHU1QzMxXHU2MjdFXHU0RTBEXHU1MjMwXHVGRjBDXG4gKiBcdTg4NjhcdTczQjBcdTRFM0FcdTk3NjJcdTY3N0ZcdTkxQ0NcdTZDQTFcdTY3MDkgdmF1bHQgXHU1REU1XHU1MTc3XHUzMDAyXG4gKlxuICogXHU1REYyXHU1QjU4XHU1NzI4XHU3Njg0XHU3NzFGXHU1QjlFXHU3NkVFXHU1RjU1XHU0RjFBXHU4OEFCXHU2NkZGXHU2MzYyXHU0RTNBXHU4RjZGXHU5NEZFXHVGRjA4XHU2NUU3XHU3NkVFXHU1RjU1XHU1MTQ4XHU2NTM5XHU1NDBEXHU1OTA3XHU0RUZEXHU0RTNBIGA8bmFtZT4uYmFrLTx0cz5gXHVGRjBDXG4gKiBcdTc4NkVcdThCQTRcdTUxNzFcdTRFQUJcdTUzRUZcdTc1MjhcdTU0MEVcdTUzRUZcdTYyNEJcdTUyQThcdTUyMjBcdTk2NjRcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYXJlZFByb2ZpbGVzKGRzaEhvbWU6IHN0cmluZywgc2hhcmVkUm9vdDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghc2hhcmVkUm9vdCB8fCBkc2hIb21lID09PSBzaGFyZWRSb290KSByZXR1cm5cbiAgY29uc3QgbGlua0RpciA9IChuYW1lOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gcGF0aC5qb2luKGRzaEhvbWUsIG5hbWUpXG4gICAgICBjb25zdCBzaGFyZWRUYXJnZXQgPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgbmFtZSlcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzaGFyZWRUYXJnZXQpKSByZXR1cm5cbiAgICAgIGxldCBzdDogZnMuU3RhdHMgfCBudWxsID0gbnVsbFxuICAgICAgdHJ5IHtcbiAgICAgICAgc3QgPSBmcy5sc3RhdFN5bmModGFyZ2V0KVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHN0ID0gbnVsbFxuICAgICAgfVxuICAgICAgaWYgKHN0Py5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGlmIChmcy5yZWFscGF0aFN5bmModGFyZ2V0KSA9PT0gZnMucmVhbHBhdGhTeW5jKHNoYXJlZFRhcmdldCkpIHJldHVyblxuICAgICAgICBmcy51bmxpbmtTeW5jKHRhcmdldClcbiAgICAgICAgc3QgPSBudWxsXG4gICAgICB9XG4gICAgICBpZiAoc3Q/LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgY29uc3QgYmFrID0gYCR7dGFyZ2V0fS5iYWstJHtEYXRlLm5vdygpfWBcbiAgICAgICAgZnMucmVuYW1lU3luYyh0YXJnZXQsIGJhaylcbiAgICAgIH1cbiAgICAgIGZzLm1rZGlyU3luYyhkc2hIb21lLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgICAgZnMuc3ltbGlua1N5bmMoc2hhcmVkVGFyZ2V0LCB0YXJnZXQsICdkaXInKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS53YXJuKGBbZHNoLWhvc3RdIFx1NUVGQVx1N0FDQlx1NTE3MVx1NEVBQiAke25hbWV9IFx1OEY2Rlx1OTRGRVx1NTkzMVx1OEQyNVx1RkYwOHBlci12YXVsdCBcdTVDMDZcdTc1MjhcdTcyRUNcdTdBQ0JcdTc2RUVcdTVGNTVcdUZGMDlgLCBlcnIpXG4gICAgfVxuICB9XG4gIGxpbmtEaXIoJ3Byb2ZpbGVzJylcbiAgbGlua0RpcignLmFnZW50LXByZXNldHMnKVxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODRcIlx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlwiXHVGRjFBXHU2MjhBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgYH4vLmRzaGBcdUZGMENcbiAqIFx1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1NjU3MFx1NjM2RVx1MzAwMlxuICpcbiAqIFx1NTM5Rlx1NzQwNlx1RkYxQWRzaCBcdTc2ODQgYHNldHRpbmdzYFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtc2V0dGluZ3MtZmlsZVx1RkYwOVx1NEUwRSBgY3JlZGVudGlhbHNgXG4gKiBcdUZGMDhAZGVlcHNlZWstYWkvZHNoLWNyZWRlbnRpYWxzLWxvY2FsXHVGRjA5XHU2M0QyXHU0RUY2XHU5MEZEXHU2NTJGXHU2MzAxIGBwYXRoYCBcdTg5ODZcdTc2RDZcdUZGMENcdTlFRDhcdThCQTRcdThERUZcdTVGODRcdTY2MkZcbiAqIGA8ZHNoSG9tZT4vc2V0dGluZ3MueWFtbGAgLyBgPGRzaEhvbWU+Ly5jcmVkZW50aWFscy55YW1sYFx1MzAwMlx1NTcyOFx1NTE3MVx1NEVBQiBwcm9maWxlXG4gKiBcdTc2ODQgYGNvcmRpcy5wYXRjaC55bWxgIFx1OTFDQ1x1NjI4QVx1OEZEOVx1NEUyNFx1NEUyQVx1NjNEMlx1NEVGNlx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlx1NjgzOVx1NzY4NFx1NjU4N1x1NEVGNlx1RkYwQ1x1NkEyMVx1NTc4Qlx1OTAwOVx1NjJFOVx1MzAwMUFQSSBcdTVCQzZcdTk0QTVcdTMwMDFcbiAqIFx1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1NEUwMFx1NkIyMVx1RkYwOFx1NTcyOFx1NEVGQlx1NjEwRiB2YXVsdCBcdTc2ODQgRFNIIFx1OTc2Mlx1Njc3Rlx1NjIxNlx1NzZGNFx1NjNBNVx1NjUzOSB+Ly5kc2hcdUZGMDlcdTUzNzNcdTUzRUZcdTUxNjggdmF1bHQgXHU3NTFGXHU2NTQ4XHUzMDAyXG4gKiBcdTZDRThcdTYxMEZcdUZGMUFwcm9maWxlcyBcdTVERjJcdThGNkZcdTk0RkVcdTUxNzFcdTRFQUJcdUZGMENcdTYyNDBcdTRFRTVcdThGRDlcdTkxQ0NcdTUxOTlcdTUxNjVcdTc2ODRcdTZCNjNcdTY2MkZcdTUxNzFcdTRFQUIgcGF0Y2ggXHUyMDE0XHUyMDE0IFx1NzUyOFx1NjIzN1x1ODFFQVx1ODhDNVx1NzY4NFxuICogXHU2M0QyXHU0RUY2XHU2NzYxXHU3NkVFXHVGRjA4aW5zZXJ0XHVGRjA5XHU1RkM1XHU5ODdCXHU0RkREXHU3NTU5XHVGRjBDXHU1M0VBXHU1NDA4XHU1RTc2L1x1NjZGNFx1NjVCMCBzZXR0aW5ncy9jcmVkZW50aWFscyBcdTRFMjRcdTRFMkFcdTY3NjFcdTc2RUVcdTMwMDJcbiAqXG4gKiBwYXRjaCBcdTY4M0NcdTVGMEZcdUZGMDhjb3JkaXMgbG9hZGVyIFx1NzY4NCBhcHBseUVudHJ5UGF0Y2hlc1x1RkYwOVx1RkYxQVx1NTIxN1x1ODg2OFx1OTFDQ1x1NkJDRlx1NEUyQVx1NTE0M1x1N0QyMFx1NzZGNFx1NjNBNVx1NjYyRlxuICogYHsgaWQsIGluc2VydD8sIG5hbWU/LCAuLi5vdmVycmlkZXMgfWBcdUZGMENvdmVycmlkZXMgXHU5NTJFXHU4OTg2XHU3NkQ2XHU1NDBDXHU1NDBEIHRhcmdldCBcdTY3NjFcdTc2RUVcdUZGMENcbiAqIFx1NkNBMVx1NjcwOSBgdXBkYXRlOmAgXHU1MzA1XHU4OEM1XHU1QzQyXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChkc2hIb21lOiBzdHJpbmcsIHNoYXJlZFJvb3Q6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXNoYXJlZFJvb3QgfHwgZHNoSG9tZSA9PT0gc2hhcmVkUm9vdCkgcmV0dXJuXG4gIHRyeSB7XG4gICAgY29uc3Qgc2hhcmVkUHJvZmlsZXMgPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJ3Byb2ZpbGVzJylcbiAgICBjb25zdCBwYXRjaEZpbGUgPSBwYXRoLmpvaW4oc2hhcmVkUHJvZmlsZXMsICd3ZWInLCAnY29yZGlzLnBhdGNoLnltbCcpXG4gICAgY29uc3Qgc2V0dGluZ3NQYXRoID0gcGF0aC5qb2luKHNoYXJlZFJvb3QsICdzZXR0aW5ncy55YW1sJylcbiAgICBjb25zdCBjcmVkZW50aWFsc1BhdGggPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJy5jcmVkZW50aWFscy55YW1sJylcblxuICAgIGNvbnN0IGJsb2NrU2V0dGluZ3MgPSBgLSBpZDogc2V0dGluZ3NcbiAgY29uZmlnOlxuICAgIHBhdGg6ICR7c2V0dGluZ3NQYXRofVxuYFxuICAgIGNvbnN0IGJsb2NrQ3JlZGVudGlhbHMgPSBgLSBpZDogY3JlZGVudGlhbHNcbiAgY29uZmlnOlxuICAgIHBhdGg6ICR7Y3JlZGVudGlhbHNQYXRofVxuYFxuXG4gICAgbGV0IGNvbnRlbnQgPSAnJ1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGNoRmlsZSkpIHtcbiAgICAgIGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGF0Y2hGaWxlLCAndXRmOCcpXG4gICAgfVxuICAgIGNvbnN0IHN0cmlwID0gKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXHMrL2csICcnKVxuICAgIGNvbnN0IGhhc1NldHRpbmdzID0gc3RyaXAoY29udGVudCkuaW5jbHVkZXMoc3RyaXAoYmxvY2tTZXR0aW5ncykpXG4gICAgY29uc3QgaGFzQ3JlZGVudGlhbHMgPSBzdHJpcChjb250ZW50KS5pbmNsdWRlcyhzdHJpcChibG9ja0NyZWRlbnRpYWxzKSlcbiAgICBpZiAoaGFzU2V0dGluZ3MgJiYgaGFzQ3JlZGVudGlhbHMpIHJldHVyblxuXG4gICAgLy8gXHU1M0VBXHU1NzI4XHU1MTcxXHU0RUFCIHBhdGNoIFx1NEUzQVx1N0E3QVx1NjU3MFx1N0VDNCBgW11gXHVGRjA4XHU1MTQxXHU4QkI4XHU2Q0U4XHU5MUNBXHVGRjBDXHU2MjE2XHU2NTg3XHU0RUY2XHU0RTBEXHU1QjU4XHU1NzI4XHVGRjA5XHU2NUY2XHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXG4gICAgLy8gXHU2NzYxXHU3NkVFXHVGRjFCXHU4MkU1XHU3NTI4XHU2MjM3XHU1REYyXHU4MUVBXHU1QjlBXHU0RTQ5IHBhdGNoXHVGRjA4XHU1OTgyXHU4MUVBXHU4OEM1XHU2M0QyXHU0RUY2XHVGRjA5XHVGRjBDXHU0RTBEXHU1RjNBXHU4ODRDXHU2NTM5XHU1MTk5IFx1MjAxNFx1MjAxNCBcdTYzRDBcdTc5M0FcdTYyNEJcdTUyQThcdTUyQTBcdTMwMDJcbiAgICBjb25zdCB3aXRob3V0Q29tbWVudHMgPSBjb250ZW50XG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAuZmlsdGVyKChsKSA9PiAhbC50cmltKCkuc3RhcnRzV2l0aCgnIycpKVxuICAgICAgLmpvaW4oJ1xcbicpXG4gICAgICAudHJpbSgpXG4gICAgaWYgKHdpdGhvdXRDb21tZW50cyA9PT0gJycgfHwgd2l0aG91dENvbW1lbnRzID09PSAnW10nKSB7XG4gICAgICAgIGNvbnN0IGluc2VydGlvbiA9IGJsb2NrU2V0dGluZ3MgKyBibG9ja0NyZWRlbnRpYWxzXG4gICAgICAgIGNvbnRlbnQgPSBgIyBkc2gtZG9jayBcdTgxRUFcdTUyQThcdTdFRjRcdTYyQTRcdUZGMUFwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU0RjFBXHU4QkREXHU0RUNEXHU5Njk0XHU3OUJCXHVGRjA5XG4ke2luc2VydGlvbi50cmltRW5kKCl9XG5gXG4gICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUocGF0Y2hGaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRjaEZpbGUsIGNvbnRlbnQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJ1tkc2gtaG9zdF0gXHU1MTcxXHU0RUFCIGNvcmRpcy5wYXRjaC55bWwgXHU1REYyXHU2NzA5XHU4MUVBXHU1QjlBXHU0RTQ5XHU1MTg1XHU1QkI5XHVGRjBDXHU4REYzXHU4RkM3XHU4MUVBXHU1MkE4XHU1MTk5XHU1MTY1XHVGRjFCJyArXG4gICAgICAgICAgJ1x1NTk4Mlx1OTcwMFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwQ1x1OEJGN1x1NTcyOCB+Ly5kc2gvcHJvZmlsZXMvd2ViL2NvcmRpcy5wYXRjaC55bWwgXHU2MjRCXHU1MkE4XHU1MkEwXHU1MTY1IHNldHRpbmdzL2NyZWRlbnRpYWxzIFx1NzY4NCBwYXRoIFx1ODk4Nlx1NzZENicsXG4gICAgICAgIClcbiAgICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWhvc3RdIFx1NTE5OVx1NTE2NVx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQiBwYXRjaCBcdTU5MzFcdThEMjVcdUZGMDhcdTVDMDZcdTYzMDkgcGVyLXZhdWx0IFx1NzJFQ1x1N0FDQlx1OTE0RFx1N0Y2RVx1NTQyRlx1NTJBOFx1RkYwOScsIGVycilcbiAgfVxufVxuXG4vKiogXHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IGRzaCB3ZWJcdTMwMDJcdThDMDNcdTc1MjhcdTY1QjlcdThEMUZcdThEMjNcdTc2RDFcdTU0MkMgcHJvYyBcdTc2ODQgZXhpdC9lcnJvclx1MzAwMiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxhdW5jaERzaChvcHRzOiBMYXVuY2hPcHRpb25zICYgeyBkc2hCaW46IHN0cmluZzsgbm9kZUJpbjogc3RyaW5nOyB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhbiB9KTogQ2hpbGRQcm9jZXNzIHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgYXJncyA9IFtvcHRzLmRzaEJpbiwgJ3dlYicsICctLWhvc3QnLCBob3N0LCAnLS1wb3J0JywgU3RyaW5nKHBvcnQpXVxuICBjb25zdCBlbnY6IE5vZGVKUy5Qcm9jZXNzRW52ID0ge1xuICAgIC4uLihvcHRzLmVudiA/PyBwcm9jZXNzLmVudiA/PyB7fSksXG4gICAgRFNIX0hPTUU6IG9wdHMuZHNoSG9tZSxcbiAgfVxuICBpZiAob3B0cy51c2VFbGVjdHJvbkFzTm9kZSkgZW52LkVMRUNUUk9OX1JVTl9BU19OT0RFID0gJzEnXG4gIHJldHVybiBzcGF3bihvcHRzLm5vZGVCaW4sIGFyZ3MsIHtcbiAgICBlbnYsXG4gICAgY3dkOiBvcHRzLmN3ZCxcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdwaXBlJ10sXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG59XG5cbi8qKlxuICogXHU0RTAwXHU5NTJFXCJcdTc4NkVcdTRGRERcdThGRDBcdTg4NENcIlx1RkYxQVxuICogMS4gXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTc2RjRcdTYzQTVcdTYzMDJcdTYzQTVcdUZGMDhhdHRhY2hlZFx1RkYwQ1x1NEUwRFx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQlx1RkYwOVx1RkYxQlxuICogMi4gXHU1NDI2XHU1MjE5XHU1QjlBXHU0RjREIGRzaCBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHUyMTkyIHNwYXduIFx1MjE5MiBcdTdCNDlcdTVGODVcdTVDMzFcdTdFRUFcdUZGMUJcbiAqIDMuIFx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1RkYwOFx1NTk4Mlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MCBFQUREUklOVVNFXHVGRjA5XHUyMTkyIFx1N0FDQlx1NTM3M1x1OEZENFx1NTZERVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlx1RkYwQ1x1NEUwRFx1NTE4RFx1NzZGMlx1N0I0OVx1MzAwMlxuICogXHU4RkQ0XHU1NkRFIFNlcnZlclN0YXR1c1x1MzAwMlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRHNoUnVubmluZyhvcHRzOiBMYXVuY2hPcHRpb25zKTogUHJvbWlzZTx7IHN0YXR1czogU2VydmVyU3RhdHVzOyBwcm9jPzogQ2hpbGRQcm9jZXNzIH0+IHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgdXJsID0gYGh0dHA6Ly8ke2hvc3R9OiR7cG9ydH0vYFxuXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfSB9XG4gIH1cblxuICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4ob3B0cy5kc2hCaW4pXG4gIGlmICghZm91bmQuYmluKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGZvdW5kLm5vdGVzW2ZvdW5kLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgZHNoIENMSScgfSB9XG4gIH1cbiAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKG9wdHMubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCBvcHRzLnVzZUVtYmVkZGVkTm9kZSlcbiAgaWYgKCFub2RlLm5vZGVCaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbm9kZS5ub3Rlc1tub2RlLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYnIH0gfVxuICB9XG4gIC8vIHBlci12YXVsdCBcdTUxNzFcdTRFQUJcdUZGMUFwcm9maWxlc1x1RkYwOFx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1RkYwOVx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQlx1NjgzOVx1RkYwQ3NldHRpbmdzL2NyZWRlbnRpYWxzXG4gIC8vIFx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQlx1NjgzOSBcdTIwMTRcdTIwMTQgXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU1MTY4XHU1QzQwXHU0RTAwXHU0RUZEXHVGRjBDXHU0RUM1XHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCXHUzMDAyXG4gIGlmIChvcHRzLnNoYXJlZENvbmZpZ1Jvb3QpIHtcbiAgICBlbnN1cmVTaGFyZWRQcm9maWxlcyhvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgICBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgfVxuICBjb25zdCBwcm9jID0gbGF1bmNoRHNoKHsgLi4ub3B0cywgZHNoQmluOiBmb3VuZC5iaW4sIG5vZGVCaW46IG5vZGUubm9kZUJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IG5vZGUudXNlRWxlY3Ryb25Bc05vZGUgfSlcblxuICAvLyBcdTY1MzZcdTk2QzYgc3RkZXJyIFx1NUMzRVx1OTBFOFx1RkYxQVx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1NjVGNlx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1NTM5Rlx1NTZFMFx1RkYwOFx1NTk4MiBFQUREUklOVVNFXHVGRjA5XG4gIGxldCBzdGRlcnJUYWlsID0gJydcbiAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4ge1xuICAgIHN0ZGVyclRhaWwgPSAoc3RkZXJyVGFpbCArIGQudG9TdHJpbmcoKSkuc2xpY2UoLTQwMDApXG4gIH0pXG5cbiAgY29uc3QgY2hpbGREaWVkID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICAgIHByb2Mub25jZSgnZXJyb3InLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICB9KVxuXG4gIGNvbnN0IHJlYWR5ID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICB3YWl0Rm9yUmVhZHkoaG9zdCwgcG9ydCwgb3B0cy50aW1lb3V0TXMgPz8gMTIwXzAwMCkudGhlbigoKSA9PiB0cnVlKSxcbiAgICBjaGlsZERpZWQudGhlbigoKSA9PiBmYWxzZSksXG4gIF0pXG5cbiAgaWYgKHJlYWR5KSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogZmFsc2UgfSwgcHJvYyB9XG4gIH1cblxuICAvLyBcdTVCNTBcdThGREJcdTdBMEJcdTVERjJcdTkwMDBcdTUxRkFcdUZGMUFcdTUxOERcdTYzQTJcdTRFMDBcdTZCMjFcdTdBRUZcdTUzRTNcdUZGMDhcdTUzRUZcdTgwRkRcdTg4QUJcdTUyMkJcdTc2ODRcdTVCOUVcdTRGOEJcdTYyQTJcdThERDFcdTdFRDFcdTVCOUFcdUZGMDlcdUZGMENcdTU0MjZcdTUyMTlcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTk1MTlcdThCRUZcbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9LCBwcm9jIH1cbiAgfVxuICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsKSB9LCBwcm9jIH1cbn1cblxuLyoqIFx1NEVDRSBzdGRlcnIgXHU1QzNFXHU5MEU4XHU2M0QwXHU3MEJDXHU1M0VGXHU4QkZCXHU5NTE5XHU4QkVGICovXG5mdW5jdGlvbiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gc3RkZXJyVGFpbC5zcGxpdCgvXFxyP1xcbi8pLmZpbHRlcihCb29sZWFuKVxuICBjb25zdCBhZGRyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0VBRERSSU5VU0UnKSlcbiAgY29uc3QgZXJyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0Vycm9yOicpKVxuICBpZiAoYWRkckxpbmUpIHtcbiAgICByZXR1cm4gJ1x1N0FFRlx1NTNFM1x1NURGMlx1ODhBQlx1NTM2MFx1NzUyOFx1RkYwOEVBRERSSU5VU0VcdUZGMDlcdTMwMDJcdThCRjdcdTYzNjJcdTRFMDBcdTRFMkFcdTdBRUZcdTUzRTNcdUZGMENcdTYyMTZcdTUxNDhcdTUwNUNcdTYzODlcdTUzNjBcdTc1MjhcdThCRTVcdTdBRUZcdTUzRTNcdTc2ODRcdTY3MERcdTUyQTFcdTU0MEVcdTkxQ0RcdThCRDUnXG4gIH1cbiAgaWYgKGVyckxpbmUpIHtcbiAgICBjb25zdCBjbGVhbmVkID0gZXJyTGluZS50cmltKCkuc2xpY2UoMCwgMzAwKVxuICAgIHJldHVybiBgZHNoIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtjbGVhbmVkfWBcbiAgfVxuICByZXR1cm4gJ0RTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkFcdUZGMDhcdTY1RTBcdThCRTZcdTdFQzZcdTk1MTlcdThCRUZcdUZGMDlcdTMwMDJcdThCRjdcdTY3RTVcdTc3MEIgT2JzaWRpYW4gXHU2M0E3XHU1MjM2XHU1M0YwIFtkc2hdIFx1NjVFNVx1NUZENydcbn1cblxuLyoqIFx1NTA1Q1x1NkI2Mlx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOFNJR1RFUk1cdUZGMENcdTdCNDlcdTVGODVcdTkwMDBcdTUxRkFcdUZGMUJcdThEODVcdTY1RjZcdTU0MEUgU0lHS0lMTFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BQcm9jZXNzKHByb2M6IENoaWxkUHJvY2VzcyB8IG51bGwgfCB1bmRlZmluZWQsIHRpbWVvdXRNcyA9IDUwMDApOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFwcm9jIHx8IHByb2MuZXhpdENvZGUgIT09IG51bGwgfHwgcHJvYy5zaWduYWxDb2RlICE9PSBudWxsKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgdGltZXIgPSBnbG9iYWxUaGlzLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcHJvYy5raWxsKCdTSUdLSUxMJylcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9LCB0aW1lb3V0TXMpXG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4ge1xuICAgICAgZ2xvYmFsVGhpcy5jbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9KVxuICAgIHRyeSB7XG4gICAgICBwcm9jLmtpbGwoJ1NJR1RFUk0nKVxuICAgIH0gY2F0Y2gge1xuICAgICAgZ2xvYmFsVGhpcy5jbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9XG4gIH0pXG59XG4iLCAiLyoqXG4gKiBcdThCQkVcdTdGNkVcdUZGMUFcdTVCNTdcdTZCQjUgKyBcdThCQkVcdTdGNkVcdTk4NzUgVUlcdTMwMDJcbiAqIFYwLjJcdUZGMUFEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdUZGMDhcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCIC8gXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIC8gXHU4MUVBXHU1QjlBXHU0RTQ5XHVGRjA5XHVGRjBDXHU5RUQ4XHU4QkE0IHBlci12YXVsdFx1MzAwMlxuICovXG5cbmltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCB0eXBlIERzaEhvbWVNb2RlID0gJ3NoYXJlZCcgfCAncGVyLXZhdWx0JyB8ICdjdXN0b20nXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHNoRG9ja1NldHRpbmdzIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbjogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NEYxOFx1NTE0OFx1RkYwOSAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0XHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q6IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydDogbnVtYmVyXG4gIC8qKiBEU0hfSE9NRSBcdTZBMjFcdTVGMEZcdUZGMUFwZXItdmF1bHQ9XHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQlx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQnNoYXJlZD1cdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjFCY3VzdG9tPVx1ODFFQVx1NUI5QVx1NEU0OSAqL1xuICBkc2hIb21lTW9kZTogRHNoSG9tZU1vZGVcbiAgLyoqIFx1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODRcdUZGMDhcdTRFQzUgY3VzdG9tIFx1NkEyMVx1NUYwRlx1NzUxRlx1NjU0OFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqIFx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlOiBib29sZWFuXG4gIC8qKiBPYnNpZGlhbiBcdTU0MkZcdTUyQThcdTY1RjZcdTgxRUFcdTUyQThcdTYyQzlcdThENzcgRFNIICovXG4gIGF1dG9zdGFydDogYm9vbGVhblxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRHNoRG9ja1NldHRpbmdzID0ge1xuICBkc2hCaW46ICcnLFxuICBub2RlQmluOiAnJyxcbiAgaG9zdDogJzEyNy4wLjAuMScsXG4gIHBvcnQ6IDMwODAsXG4gIGRzaEhvbWVNb2RlOiAncGVyLXZhdWx0JyxcbiAgZHNoSG9tZTogJycsXG4gIHVzZUVtYmVkZGVkTm9kZTogZmFsc2UsXG4gIGF1dG9zdGFydDogdHJ1ZSxcbn1cblxuZXhwb3J0IGNsYXNzIERzaERvY2tTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIGN1c3RvbUhvbWVFbD86IFNldHRpbmdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pXG4gIH1cblxuICBvdmVycmlkZSBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXNcbiAgICBjb250YWluZXJFbC5lbXB0eSgpXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1Njk4Mlx1ODlDOCAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1MjZGNSBEU0ggRG9jaycpLnNldEhlYWRpbmcoKVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge1xuICAgICAgY2xzOiAnZHNoLWRvY2stc2V0dGluZ3MtZGVzYycsXG4gICAgICB0ZXh0OiAnXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgV2ViIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhblx1RkYxQVx1NUI5QVx1NEY0RCBkc2ggXHUyMTkyIFx1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0QyBcdTIxOTIgXHU5NzYyXHU2NzdGXHU1RDRDXHU1MTY1XHUzMDAyXHU1Qjk4XHU2NUI5XHU1MzlGXHU3NTFGXHVGRjBDXHU1Qjk4XHU2NUI5IFVJIFx1NTM5Rlx1NjgzN1x1NUQ0Q1x1NTE2NVx1MzAwMicsXG4gICAgfSlcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2NzBEXHU1MkExXHU2M0E3XHU1MjM2IC0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnXHU2NzBEXHU1MkExJykuc2V0SGVhZGluZygpXG4gICAgY29uc3Qgc3RhdHVzTGluZSA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NjcwRFx1NTJBMVx1NzJCNlx1NjAwMScpXG4gICAgICAuc2V0RGVzYyh0aGlzLmRlc2NyaWJlU3RhdHVzKCkpXG4gICAgY29uc3QgYnRucyA9IHN0YXR1c0xpbmUuY29udHJvbEVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJ0bnMnIH0pXG4gICAgY29uc3Qgc3RhcnRCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ21vZC1jdGEnLCB0ZXh0OiAnXHUyNUI2IFx1NTQyRlx1NTJBOCcgfSlcbiAgICBzdGFydEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5kaXNwbGF5KCkpXG4gICAgfVxuICAgIGNvbnN0IHN0b3BCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTI1QTAgXHU1MDVDXHU2QjYyJyB9KVxuICAgIHN0b3BCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RvcCgpLnRoZW4oKCkgPT4gdGhpcy5kaXNwbGF5KCkpXG4gICAgfVxuICAgIGNvbnN0IG9wZW5CdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0YnIH0pXG4gICAgb3BlbkJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuUGFuZWwoKVxuICAgIH1cblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1OTY4RiBPYnNpZGlhbiBcdTgxRUFcdTUyQThcdTU0MkZcdTUyQTgnKVxuICAgICAgLmFkZFRvZ2dsZSgodCkgPT5cbiAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b3N0YXJ0ID0gdlxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdThGRDBcdTg4NENcdTY1RjYgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdcdThGRDBcdTg4NENcdTY1RjYnKS5zZXRIZWFkaW5nKClcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdkc2ggQ0xJIFx1OERFRlx1NUY4NCcpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCXHVGRjA4RFNIX0JJTiBcdTIxOTIgbnBtIHJvb3QgLWcgXHUyMTkyIFx1NUUzOFx1ODlDMVx1NTE2OFx1NUM0MFx1NzZFRVx1NUY1NVx1RkYwOVx1MzAwMlx1NTNFRlx1NTg2QiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU2MjE2IGJpbi5qcyBcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvb3B0L2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvQGRlZXBzZWVrLWFpL2RzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEJpbilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEJpbiA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG4gICAgdGhpcy5kZXRlY3RMaW5lID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYnKVxuICAgICAgLnNldERlc2MoJ1x1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NjcwMFx1N0EzM1x1NUI5QVx1RkYwOVx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvYmluL25vZGUnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm9kZUJpbiA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUnKVxuICAgICAgLnNldERlc2MoJ0VMRUNUUk9OX1JVTl9BU19OT0RFXHUzMDAyXHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHUyMDE0XHUyMDE0XHU1QjlFXHU2RDRCIE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlx1NEVFNSBOb2RlIFx1NkEyMVx1NUYwRlx1OEZEMFx1ODg0Q1x1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwQ1x1NEVDNVx1NTcyOFx1OUE4Q1x1OEJDMVx1NTNFRlx1NzUyOFx1NjVGNlx1NUYwMFx1NTQyRlx1MzAwMicpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1N0Y1MVx1N0VEQyAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1N0Y1MVx1N0VEQycpLnNldEhlYWRpbmcoKVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1NTdGQVx1NTFDNlx1RkYwOScpXG4gICAgICAuc2V0RGVzYygnXHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdTMwMDJzaGFyZWQvY3VzdG9tIFx1NkEyMVx1NUYwRlx1NzZGNFx1NjNBNVx1NEY3Rlx1NzUyOFx1RkYxQnBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTU3MjhcdTZCNjRcdTU3RkFcdTc4NDBcdTRFMEFcdTYzMDkgdmF1bHQgXHU2RDNFXHU3NTFGXHU3MkVDXHU3QUNCXHU3QUVGXHU1M0UzXHVGRjA4XHU2QkNGIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEYxQVx1OEJERFx1NEU5Mlx1NEUwRFx1NTNFRlx1ODlDMVx1RkYwOVx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignMzA4MCcpXG4gICAgICAgICAgLnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5wb3J0KSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG4gPSBOdW1iZXIodi50cmltKCkpXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wb3J0ID0gTnVtYmVyLmlzSW50ZWdlcihuKSAmJiBuID49IDAgJiYgbiA8PSA2NTUzNSA/IG4gOiAzMDgwXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5uZXRQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZU5ldCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG4gICAgdGhpcy5uZXRQcmV2aWV3ID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTUgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTVcdUZGMDhEU0hfSE9NRVx1RkYwOVx1NEUwRVx1NEYxQVx1OEJERFx1OTY5NFx1NzlCQicpLnNldEhlYWRpbmcoKVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NkEyMVx1NUYwRicpXG4gICAgICAuc2V0RGVzYygncGVyLXZhdWx0IFx1NkEyMVx1NUYwRiA9IFx1NEYxQVx1OEJERFx1NjMwOVx1NUU5M1x1OTY5NFx1NzlCQlx1RkYwOFx1NTQwNFx1NUU5M1x1OTc2Mlx1Njc3Rlx1NTNFQVx1NjYzRVx1NzkzQVx1NjcyQ1x1NUU5M1x1NTIxQlx1NUVGQVx1NzY4NFx1NEYxQVx1OEJERFx1RkYwOVx1RkYwQ1x1NEY0Nlx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU3RjZFXHU0RTBFXHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHU1MTY4XHU1QzQwXHU1MTcxXHU0RUFCXHU0RTAwXHU0RUZEXHVGRjBDXHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4XHU1RTkzXHU3NTFGXHU2NTQ4XHUzMDAyJylcbiAgICAgIC5hZGREcm9wZG93bigoZGQpID0+IHtcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdwZXItdmF1bHQnLCAnXHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERCB+Ly5kc2gvdmF1bHRzLzxcdTU0MEQ+LTxoYXNoPlx1RkYwOFx1OUVEOFx1OEJBNFx1RkYxQlx1OTE0RFx1N0Y2RVx1NEUwRVx1NjNEMlx1NEVGNlx1NEVDRFx1NTE3MVx1NEVBQlx1RkYwOScpXG4gICAgICAgIGRkLmFkZE9wdGlvbignc2hhcmVkJywgJ1x1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMDhcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU0RTAwXHU1OTU3XHU5MTREXHU3RjZFXHUzMDAxXHU2M0QyXHU0RUY2XHU0RTBFXHU0RjFBXHU4QkREXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdjdXN0b20nLCAnXHU4MUVBXHU1QjlBXHU0RTQ5XHU4REVGXHU1Rjg0JylcbiAgICAgICAgZGQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUpXG4gICAgICAgIGRkLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSB2IGFzIERzaEhvbWVNb2RlXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB0aGlzLmN1c3RvbUhvbWVFbD8uc2V0RGlzYWJsZWQodiAhPT0gJ2N1c3RvbScpXG4gICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICB0aGlzLmN1c3RvbUhvbWVFbCA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODQnKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvVXNlcnMveW91Ly5kc2gnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZSA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmN1c3RvbUhvbWVFbC5zZXREaXNhYmxlZCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSAhPT0gJ2N1c3RvbScpXG5cbiAgICB0aGlzLmhvbWVQcmV2aWV3ID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgfVxuXG4gIHByaXZhdGUgZGV0ZWN0TGluZSE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgaG9tZVByZXZpZXchOiBIVE1MRWxlbWVudFxuICBwcml2YXRlIG5ldFByZXZpZXchOiBIVE1MRWxlbWVudFxuXG4gIHByaXZhdGUgZGVzY3JpYmVTdGF0dXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHJldHVybiBgJHtzLnVybH1cdUZGMDgke3MuYXR0YWNoZWQgPyAnXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICdcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NENcdTRFMkQnfVx1RkYwOWBcbiAgICB9XG4gICAgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykgcmV0dXJuICdcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjZcdUZGMDhcdTk5OTZcdTZCMjFcdTdFQTYgMTAgXHU3OUQyXHVGRjBDXHU5NzAwXHU1MjFEXHU1OUNCXHU1MzE2IHByb2ZpbGVcdUZGMDknXG4gICAgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykgcmV0dXJuIGBcdTU5MzFcdThEMjU6ICR7cy5tZXNzYWdlfWBcbiAgICByZXR1cm4gJ1x1NjcyQVx1OEZEMFx1ODg0QydcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEZXRlY3QoKTogc3RyaW5nIHtcbiAgICBjb25zdCBpbmZvID0gdGhpcy5wbHVnaW4uZGV0ZWN0SW5mbygpXG4gICAgcmV0dXJuIFtcbiAgICAgIGBkc2g6ICR7aW5mby5kc2hCaW4gPz8gJ1x1NjcyQVx1NjI3RVx1NTIzMCd9JHtpbmZvLmRzaE5vdGVzLmxlbmd0aCA/IGBcdUZGMDgke2luZm8uZHNoTm90ZXMuam9pbignXHVGRjFCJyl9XHVGRjA5YCA6ICcnfWAsXG4gICAgICBgbm9kZTogJHtpbmZvLm5vZGVOb3Rlcy5qb2luKCdcdUZGMUInKX1gLFxuICAgIF0uam9pbignXFxuJylcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEc2hIb21lKCk6IHN0cmluZyB7XG4gICAgY29uc3QgaG9tZSA9IHRoaXMucGx1Z2luLmVmZmVjdGl2ZURzaEhvbWUoKVxuICAgIGNvbnN0IHNoYXJlZCA9IHRoaXMucGx1Z2luLmVmZmVjdGl2ZVNoYXJlZENvbmZpZ1Jvb3QoKVxuICAgIGlmIChzaGFyZWQpIHtcbiAgICAgIHJldHVybiBgXHU0RjFBXHU4QkREXHU3NkVFXHU1RjU1OiAke2hvbWV9XFxuXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCOiAke3NoYXJlZH1cdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1NEUwMFx1NkIyMVx1NTE2OFx1NUU5M1x1NzUxRlx1NjU0OFx1RkYwOWBcbiAgICB9XG4gICAgcmV0dXJuIGBcdTc1MUZcdTY1NDhcdThERUZcdTVGODQ6ICR7aG9tZX1gXG4gIH1cblxuICBwcml2YXRlIGRlc2NyaWJlTmV0KCk6IHN0cmluZyB7XG4gICAgY29uc3QgcG9ydCA9IHRoaXMucGx1Z2luLmVmZmVjdGl2ZVBvcnQoKVxuICAgIGNvbnN0IG1vZGUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZVxuICAgIGNvbnN0IHN1ZmZpeCA9IG1vZGUgPT09ICdwZXItdmF1bHQnID8gJ1x1RkYwOFx1NjcyQyB2YXVsdCBcdTcyRUNcdTUzNjBcdUZGMENcdTRFMEVcdTUxNzZcdTRFRDYgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjA5JyA6ICdcdUZGMDhzaGFyZWQvY3VzdG9tXHVGRjFBXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1RkYwOSdcbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1N0FFRlx1NTNFMzogJHtwb3J0fSR7c3VmZml4fWBcbiAgfVxufVxuIiwgIi8qKlxuICogRHNoV2ViVmlldyBcdTIwMTRcdTIwMTQgXHU2MjhBXHU1Qjk4XHU2NUI5IERTSCBXZWIgKDEyNy4wLjAuMTo8cG9ydD4pIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhbiBcdTk3NjJcdTY3N0ZcdTMwMDJcbiAqIFx1NUUyNlx1NUI4Q1x1NjU3NFx1OEZDN1x1N0EwQlx1NzJCNlx1NjAwMVx1RkYxQVx1NTJBMFx1OEY3RFx1NTJBOFx1NzUzQiAvIFx1OTUxOVx1OEJFRlx1NTM2MVx1NzI0N1x1RkYwOFx1NTQyQlx1OTFDRFx1OEJENVx1RkYwOS8gXHU2NzJBXHU1NDJGXHU1MkE4XHU3QTdBXHU3MkI2XHU2MDAxIC8gXHU1NkZFXHU2ODA3XHU1REU1XHU1MTc3XHU2ODBGXHUzMDAyXG4gKiBpZnJhbWUgXHU2MzA3XHU1NDExXHU1Qjk4XHU2NUI5XHU2NzBEXHU1MkExXHVGRjBDVUkgXHU1M0VBXHU2NjJGXCJcdTgyMzlcdTU3NUVcIlx1NTkxNlx1NThGM1x1MzAwMlxuICovXG5cbmltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBzZXRJY29uIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IGNvbnN0IERTSF9XRUJfVklFV19UWVBFID0gJ2RzaC1kb2NrLXdlYidcblxudHlwZSBVaVN0YXRlID0gJ3J1bm5pbmcnIHwgJ3N0YXJ0aW5nJyB8ICdlcnJvcicgfCAnc3RvcHBlZCdcblxuZXhwb3J0IGNsYXNzIERzaFdlYlZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHByaXZhdGUgaWZyYW1lRWw6IEhUTUxJRnJhbWVFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBwaWxsRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBvdmVybGF5RWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSB0b2dnbGVCdG46IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBjdXJyZW50OiBVaVN0YXRlID0gJ3N0b3BwZWQnXG5cbiAgY29uc3RydWN0b3IoXG4gICAgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIobGVhZilcbiAgfVxuXG4gIG92ZXJyaWRlIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIERTSF9XRUJfVklFV19UWVBFXG4gIH1cblxuICBvdmVycmlkZSBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnRFNIIERvY2snXG4gIH1cblxuICBvdmVycmlkZSBnZXRJY29uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdhbmNob3InXG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrJyB9KVxuXG4gICAgLy8gLS0tLSBcdTU5MzRcdTkwRThcdTVERTVcdTUxNzdcdTY4MEYgLS0tLVxuICAgIGNvbnN0IGhlYWRlciA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2staGVhZGVyJyB9KVxuICAgIGNvbnN0IGxvZ28gPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stbG9nbycgfSlcbiAgICBzZXRJY29uKGxvZ28sICdhbmNob3InKVxuICAgIGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stdGl0bGUnLCB0ZXh0OiAnRFNIIERvY2snIH0pXG4gICAgdGhpcy5waWxsRWwgPSBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXBpbGwnIH0pXG4gICAgaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwYWNlcicgfSlcblxuICAgIHRoaXMudG9nZ2xlQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICB0aGlzLnRvZ2dsZUJ0bi5vbmNsaWNrID0gKCkgPT4gdm9pZCB0aGlzLm9uVG9nZ2xlKClcblxuICAgIGNvbnN0IHJlZnJlc2hCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24ocmVmcmVzaEJ0biwgJ3JlZnJlc2gtY3cnKVxuICAgIHJlZnJlc2hCdG4udGl0bGUgPSAnXHU1MjM3XHU2NUIwJ1xuICAgIHJlZnJlc2hCdG4ub25jbGljayA9ICgpID0+IHRoaXMucmVsb2FkKClcblxuICAgIGNvbnN0IHBvcG91dEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihwb3BvdXRCdG4sICdtYXhpbWl6ZS0yJylcbiAgICBwb3BvdXRCdG4udGl0bGUgPSAnXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4XHU3MkVDXHU3QUNCXHU4RkRCXHU3QTBCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHVGRjA5J1xuICAgIHBvcG91dEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuUG9wb3V0KClcbiAgICB9XG5cbiAgICBjb25zdCBicm93c2VyQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKGJyb3dzZXJCdG4sICdleHRlcm5hbC1saW5rJylcbiAgICBicm93c2VyQnRuLnRpdGxlID0gJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCdcbiAgICBicm93c2VyQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5JbkJyb3dzZXIoKVxuICAgIH1cblxuICAgIC8vIC0tLS0gXHU0RTNCXHU0RjUzXHVGRjFBaWZyYW1lICsgXHU3MkI2XHU2MDAxXHU4OTg2XHU3NkQ2XHU1QzQyIC0tLS1cbiAgICBjb25zdCBib2R5ID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1ib2R5JyB9KVxuICAgIHRoaXMuaWZyYW1lRWwgPSBib2R5LmNyZWF0ZUVsKCdpZnJhbWUnLCB7IGNsczogJ2RzaC1kb2NrLWZyYW1lJyB9KVxuICAgIHRoaXMub3ZlcmxheUVsID0gYm9keS5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1vdmVybGF5JyB9KVxuXG4gICAgLy8gXHU3MkI2XHU2MDAxXHU4MDU0XHU1MkE4XG4gICAgdGhpcy5wbHVnaW4ub25TdGF0dXNDaGFuZ2UoKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgdGhpcy5yZWZyZXNoKClcblxuICAgIC8vIFx1NTE1Q1x1NUU5NVx1RkYxQVx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1ODJFNVx1NjcwRFx1NTJBMVx1NjcyQVx1NTQyRlx1NTJBOFx1NEUxNFx1N0FFRlx1NTNFM1x1NTNFRlx1NzUyOFx1RkYwQ1x1NUMxRFx1OEJENVx1NjJDOVx1OEQ3N1xuICAgIHZvaWQgdGhpcy5lbnN1cmVTdGFydGVkKClcblxuICAgIC8vIFx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1NTIzN1x1NjVCMFx1NEUwMFx1NkIyMVx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcdUZGMUFcdTc1MjhcdTYyMzdcdTZCNjRcdTUyM0JcdTZCNjNcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1NzY4NFx1N0E5N1x1NTNFM1xuICAgIC8vIFx1NUMzMVx1NjYyRlwiXHU1RjUzXHU1MjREIHZhdWx0XCJcdUZGMENcdTY1RTBcdTk3MDBcdTdCNDkgZm9jdXMvYWN0aXZlLWxlYWYtY2hhbmdlIFx1NEU4Qlx1NEVGNlx1MzAwMlxuICAgIHRoaXMucGx1Z2luLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICB9XG5cbiAgb3ZlcnJpZGUgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25Ub2dnbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoKClcbiAgfVxuXG4gIC8qKiBcdTk3NjJcdTY3N0ZcdTYyNTNcdTVGMDBcdTY1RjZcdTc4NkVcdTRGRERcdTY3MERcdTUyQTFcdTU3MjhcdThERDFcdUZGMDhcdTVERjJcdTU3MjhcdThERDFcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDkgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVTdGFydGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdzdG9wcGVkJyB8fCBzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICAgIHRoaXMucmVmcmVzaCgpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGxldCB1aTogVWlTdGF0ZVxuICAgIGxldCBwaWxsVGV4dCA9ICcnXG4gICAgbGV0IHBpbGxDbHMgPSAnJ1xuXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB1aSA9ICdydW5uaW5nJ1xuICAgICAgcGlsbFRleHQgPSBgXHUyNUNGICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICcgXHUwMEI3IFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnJ31gXG4gICAgICBwaWxsQ2xzID0gJ2lzLXJ1bm5pbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHVpID0gJ3N0YXJ0aW5nJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNDIFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNidcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RhcnRpbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHVpID0gJ2Vycm9yJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNzE1IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNSdcbiAgICAgIHBpbGxDbHMgPSAnaXMtZXJyb3InXG4gICAgfSBlbHNlIHtcbiAgICAgIHVpID0gJ3N0b3BwZWQnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0IgXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICAgICAgcGlsbENscyA9ICdpcy1zdG9wcGVkJ1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHVpXG4gICAgaWYgKHRoaXMucGlsbEVsKSB7XG4gICAgICB0aGlzLnBpbGxFbC5zZXRUZXh0KHBpbGxUZXh0KVxuICAgICAgdGhpcy5waWxsRWwuY2xhc3NOYW1lID0gYGRzaC1kb2NrLXBpbGwgJHtwaWxsQ2xzfWBcbiAgICB9XG4gICAgaWYgKHRoaXMudG9nZ2xlQnRuKSB7XG4gICAgICB0aGlzLnRvZ2dsZUJ0bi5lbXB0eSgpXG4gICAgICBzZXRJY29uKHRoaXMudG9nZ2xlQnRuLCBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgIHRoaXMudG9nZ2xlQnRuLnRpdGxlID0gcy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4J1xuICAgIH1cblxuICAgIC8vIGlmcmFtZSBcdTRFMEVcdTg5ODZcdTc2RDZcdTVDNDJcbiAgICBpZiAodWkgPT09ICdydW5uaW5nJykge1xuICAgICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5pZnJhbWVFbC5zcmMgIT09IHRoaXMucGx1Z2luLmJhc2VVcmwpIHtcbiAgICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgICB9XG4gICAgICB0aGlzLnNob3dPdmVybGF5KG51bGwpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0YXJ0aW5nKCkpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlckVycm9yKHMua2luZCA9PT0gJ2Vycm9yJyA/IHMubWVzc2FnZSA6ICdcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUYnKSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0b3BwZWQoKSlcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tIFx1ODk4Nlx1NzZENlx1NUM0Mlx1NkUzMlx1NjdEMyAtLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBzaG93T3ZlcmxheShjb250ZW50OiBIVE1MRWxlbWVudCB8IG51bGwpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMub3ZlcmxheUVsKSByZXR1cm5cbiAgICB0aGlzLm92ZXJsYXlFbC5lbXB0eSgpXG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgIHRoaXMub3ZlcmxheUVsLmFwcGVuZENoaWxkKGNvbnRlbnQpXG4gICAgICB0aGlzLm92ZXJsYXlFbC5yZW1vdmVBdHRyaWJ1dGUoJ2hpZGRlbicpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFx1OEZEMFx1ODg0Q1x1NEUyRFx1RkYxQVx1NjYzRVx1NUYwRlx1OTY5MFx1ODVDRlx1ODk4Nlx1NzZENlx1NUM0Mlx1RkYwOFx1NTQyNlx1NTIxOVx1N0E3QVx1NzY4NFx1N0VERFx1NUJGOVx1NUI5QVx1NEY0RFx1NUM0Mlx1NEYxQVx1NjMyMVx1NEY0RiBpZnJhbWVcdUZGMDlcbiAgICAgIHRoaXMub3ZlcmxheUVsLnNldEF0dHJpYnV0ZSgnaGlkZGVuJywgJycpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGFydGluZygpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwaW5uZXInIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ1x1NkI2M1x1NTcyOFx1NTQyRlx1NTJBOFx1NUI5OFx1NjVCOSBEU0ggV2ViXHUyMDI2JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoe1xuICAgICAgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJyxcbiAgICAgIHRleHQ6ICdcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOFx1N0VBNiAxMCBcdTc5RDJcdUZGMDlcdUZGMUJcdTdBRUZcdTUzRTNcdTg4QUJcdTUzNjBcdTc1MjhcdTY1RjZcdTVDMDZcdTgxRUFcdTUyQThcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnLFxuICAgIH0pXG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FsZXJ0LXRyaWFuZ2xlJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtbXNnJywgdGV4dDogbWVzc2FnZSB9KVxuICAgIGNvbnN0IHJldHJ5ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0bicsIHRleHQ6ICdcdTkxQ0RcdThCRDUnIH0pXG4gICAgcmV0cnkub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0b3BwZWQoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbmNob3InKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU2NzJBXHU4RkQwXHU4ODRDJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLCB0ZXh0OiAnXHU3MEI5XHU1MUZCXHU1NDJGXHU1MkE4XHVGRjBDXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgXHU1MDVDXHU5NzYwXHU4RkRCXHU2NzY1JyB9KVxuICAgIGNvbnN0IHN0YXJ0ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0biBtb2QtY3RhJywgdGV4dDogJ1x1NTQyRlx1NTJBOCBEU0gnIH0pXG4gICAgc3RhcnQub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbG9hZCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBjdXJyZW50VmF1bHQudHMgXHUyMDE0XHUyMDE0IFx1NjI4QVwiXHU1RjUzXHU1MjREXHU3MTI2XHU3MEI5IHZhdWx0XCJcdThERThcdThGREJcdTdBMEJcdTU0NEFcdThCQzkgRFNIIFx1NEZBN1x1MzAwMlxuICpcbiAqIGRzaC1kb2NrIFx1OEREMVx1NTcyOCBPYnNpZGlhbiBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTgwRkRcdTYyRkZcdTUyMzBcdTY3MDBcdTY3NDNcdTVBMDFcdTc2ODRcdTVGNTNcdTUyNEQgdmF1bHRcdUZGMDhcdTdBOTdcdTUzRTNcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTY1RjZcdUZGMENcbiAqIGBhcHAudmF1bHQuZ2V0TmFtZSgpYCArIGBhZGFwdGVyLmdldEJhc2VQYXRoKClgXHVGRjA5XHUzMDAyRFNIIFx1NzY4NFx1NURFNVx1NTE3N1x1NjNEMlx1NEVGNlxuICogZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHQgXHU4REQxXHU1NzI4XHU3MkVDXHU3QUNCIG5vZGUgXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU0RTI0XHU4MDA1XHU5MDFBXHU4RkM3XHU0RTAwXHU0RTJBXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU4OUUzXHU4MDI2XHU5MDFBXHU0RkUxXHVGRjFBXG4gKlxuICogICA8aG9tZWRpcj4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gICB7IG5hbWUsIHBhdGgsIHVwZGF0ZWRBdCB9XG4gKlxuICogLSBcdTRGNERcdTdGNkVcdTU2RkFcdTVCOUFcdTU3MjggYH4vLmRzaGBcdUZGMDhcdTRFMEUgZHNoLWRvY2sgXHU3Njg0IERTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1NjVFMFx1NTE3M1x1RkYwOVx1RkYwQ1x1NEVGQlx1NEY1NVx1NkEyMVx1NUYwRlxuICogICBcdTRFMEIgRFNIIFx1NEZBN1x1OTBGRFx1OEJGQlx1NUY5N1x1NTIzMFx1RkYxQlxuICogLSBcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdUZGMUFcdTZCQ0ZcdTRFMkEgT2JzaWRpYW4gXHU3QTk3XHU1M0UzXHVGRjA4XHU0RTNCXHU3QTk3XHU1M0UzIC8gcG9wb3V0XHVGRjA5XHU5MEZEXHU2NjJGXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU1NDA0XG4gKiAgIFx1ODFFQVx1NzZEMVx1NTQyQ1x1ODFFQVx1NURGMVx1NzY4NCB3aW5kb3cgZm9jdXMgXHUyMDE0XHUyMDE0IFx1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NkI2M1x1NjYyRlwiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXG4gKiAgIFx1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHVGRjFCXG4gKiAtIFx1NTkzMVx1OEQyNVx1OTc1OVx1OUVEOFx1RkYxQVx1NTE5OVx1NEUwRFx1OEZEQlx1RkYwOFx1Njc0M1x1OTY1MC9cdTc4QzFcdTc2RDhcdUZGMDlcdTUzRUEgY29uc29sZS53YXJuXHVGRjBDXHU3RUREXHU0RTBEXHU2MjUzXHU2NUFEXHU2M0QyXHU0RUY2XHU0RTNCXHU2RDQxXHU3QTBCXHVGRjFCXG4gKiAgIFx1NjU4N1x1NEVGNlx1NjM1Rlx1NTc0Ri9cdTdGM0FcdTU5MzFcdTY1RjYgRFNIIFx1NEZBN1x1NTZERVx1OTAwMFx1NTM5Rlx1NjcwOVx1NEZFMVx1NTNGN1x1RkYwQ1x1NTQxMVx1NTQwRVx1NTE3Q1x1NUJCOVx1NEUwRFx1ODhDNSBkc2gtZG9jayBcdTc2ODRcdTU3M0FcdTY2NkZcdTMwMDJcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG4vKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1NkZBXHU1QjlBXHU0RjREXHU3RjZFXHVGRjFBfi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZHNoJywgJ2N1cnJlbnQtdmF1bHQuanNvbicpXG59XG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUxODVcdTVCQjlcdUZGMDhEU0ggXHU0RkE3XHU1M0VBXHU4QkZCIG5hbWUvcGF0aFx1RkYwQ3VwZGF0ZWRBdCBcdTRGOUJcdThCQ0FcdTY1QURcdUZGMDkgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ3VycmVudFZhdWx0TWFya2VyIHtcbiAgbmFtZTogc3RyaW5nXG4gIHBhdGg6IHN0cmluZ1xuICB1cGRhdGVkQXQ6IG51bWJlclxufVxuXG4vKipcbiAqIFx1NTM5Rlx1NUI1MFx1NTE5OVx1NTE2NVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYxQVx1NTE0OFx1NTE5OVx1NTQwQ1x1NzZFRVx1NUY1NSAudG1wIFx1NTE4RCByZW5hbWVcdUZGMENcdTkwN0ZcdTUxNEQgRFNIIFx1NEZBN1x1OEJGQlx1NTIzMFx1NTM0QVx1NjIyQVx1NTE4NVx1NUJCOVx1MzAwMlxuICogXHU1OTMxXHU4RDI1XHU1M0VBXHU1NDRBXHU4QjY2XHVGRjBDXHU0RTBEXHU2MjlCXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlcihuYW1lOiBzdHJpbmcsIHZhdWx0UGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgZmlsZSA9IGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKVxuICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgY29uc3QgcGF5bG9hZDogQ3VycmVudFZhdWx0TWFya2VyID0geyBuYW1lLCBwYXRoOiB2YXVsdFBhdGgsIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSB9XG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYFxuICAgIGZzLndyaXRlRmlsZVN5bmModG1wLCBKU09OLnN0cmluZ2lmeShwYXlsb2FkLCBudWxsLCAyKSlcbiAgICBmcy5yZW5hbWVTeW5jKHRtcCwgZmlsZSlcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWRvY2tdIFx1NTE5OVx1NTE2NSBjdXJyZW50LXZhdWx0IFx1NjgwN1x1OEJCMFx1NTkzMVx1OEQyNScsIGVycilcbiAgfVxufVxuXG4vKiogXHU0RUNFIE9ic2lkaWFuIGFwcCBcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1NDBEXHU0RTBFXHU2ODM5XHU4REVGXHU1Rjg0XHVGRjFCXHU1M0Q2XHU0RTBEXHU1MjMwXHU4RkQ0XHU1NkRFIG51bGwgKi9cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50VmF1bHRJbmZvKGFwcDoge1xuICB2YXVsdDogeyBnZXROYW1lKCk6IHN0cmluZzsgYWRhcHRlcjogdW5rbm93biB9XG59KTogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9IHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgLy8gZ2V0QmFzZVBhdGggXHU0RTBEXHU1NzI4IG9ic2lkaWFuIFx1NzY4NFx1N0M3Qlx1NTc4Qlx1NUI5QVx1NEU0OVx1OTFDQ1x1RkYwOFx1OEZEMFx1ODg0Q1x1NjVGNiBEYXRhQWRhcHRlciBcdTYyNERcdTY3MDlcdUZGMDlcdUZGMENcbiAgICAvLyBcdTYyNDBcdTRFRTVcdThGRDlcdTkxQ0NcdTYyOEEgYWRhcHRlciBcdTVGNTMgdW5rbm93biBcdTU5MDRcdTc0MDZcdTUxOERcdTY1QURcdThBMDBcdTMwMDJcbiAgICBjb25zdCBiYXNlID0gKGFwcC52YXVsdC5hZGFwdGVyIGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfSkuZ2V0QmFzZVBhdGg/LigpXG4gICAgaWYgKCFiYXNlKSByZXR1cm4gbnVsbFxuICAgIHJldHVybiB7IG5hbWU6IGFwcC52YXVsdC5nZXROYW1lKCksIHBhdGg6IGJhc2UgfVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBUUEsSUFBQUEsbUJBQThDO0FBQzlDLHNCQUFzQjtBQUV0QixJQUFBQyxNQUFvQjtBQUNwQixJQUFBQyxRQUFzQjs7O0FDR3RCLDJCQUFvRDtBQUNwRCxTQUFvQjtBQUNwQixXQUFzQjtBQUN0QixTQUFvQjtBQUNwQixXQUFzQjtBQUVmLElBQU0sbUJBQXdCLFVBQUssZ0JBQWdCLE9BQU8sT0FBTyxRQUFRO0FBR3pFLElBQU0sd0JBQXdCO0FBRzlCLFNBQVMsV0FBVyxPQUFlLE1BQU0sR0FBVztBQUN6RCxNQUFJLElBQUk7QUFDUixXQUFTLElBQUksR0FBRyxJQUFJLE1BQU0sUUFBUSxJQUFLLE1BQU0sS0FBSyxLQUFLLElBQUksTUFBTSxXQUFXLENBQUMsTUFBTztBQUNwRixTQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsU0FBUyxLQUFLLEdBQUcsRUFBRSxNQUFNLEdBQUcsR0FBRztBQUN2RDtBQUdPLFNBQVMsY0FBYyxXQUEyQjtBQUN2RCxRQUFNLFVBQ0gsY0FBUyxTQUFTLEVBQ2xCLFFBQVEsc0JBQXNCLEdBQUcsRUFDakMsUUFBUSxZQUFZLEVBQUU7QUFDekIsVUFBUSxXQUFXLFNBQVMsTUFBTSxHQUFHLEVBQUU7QUFDekM7QUF3RE8s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LFlBQVksWUFBWSxPQUFPLFFBQVEsS0FBSyxHQUFHO0FBQ2xGLFdBQUssU0FBUyxjQUFjO0FBQzVCLFdBQUssU0FBUyxVQUFVLE9BQU8sUUFBUSxLQUFLO0FBQUEsSUFDOUM7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLGVBQThCO0FBQ2xDLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUFBLEVBQ25DO0FBQUE7QUFBQSxFQUlBLE1BQU0sWUFBMkI7QUFDL0IsVUFBTSxFQUFFLFVBQVUsSUFBSSxLQUFLO0FBQzNCLFVBQU0sU0FBUyxVQUFVLGdCQUFnQixpQkFBaUI7QUFDMUQsUUFBSSxPQUE2QixPQUFPLENBQUMsS0FBSztBQUM5QyxRQUFJLENBQUMsTUFBTTtBQUNULGFBQU8sVUFBVSxhQUFhLEtBQUs7QUFDbkMsVUFBSSxDQUFDLEtBQU07QUFDWCxZQUFNLEtBQUssYUFBYSxFQUFFLE1BQU0sbUJBQW1CLFFBQVEsS0FBSyxDQUFDO0FBQUEsSUFDbkU7QUFDQSxjQUFVLGNBQWMsSUFBSTtBQUFBLEVBQzlCO0FBQUEsRUFFQSxNQUFNLGdCQUErQjtBQUNuQyxVQUFNLHNCQUFNLGFBQWEsS0FBSyxPQUFPO0FBQUEsRUFDdkM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTUEsTUFBTSxhQUE0QjtBQUNoQyxRQUFJO0FBQ0YsWUFBTSxPQUFPLEtBQUssSUFBSSxVQUFVLGVBQWU7QUFDL0MsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ25FLFNBQVMsS0FBSztBQUNaLFlBQU0sTUFBTSxlQUFlLFFBQVEsSUFBSSxVQUFVLE9BQU8sR0FBRztBQUMzRCxVQUFJLHdCQUFPLHFEQUFhLEdBQUcsRUFBRTtBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAib3MiLCAicGF0aCIsICJlbWJlZGRlZE5vZGVWZXJzaW9uIiwgInJlc29sdmUiLCAiaW1wb3J0X29ic2lkaWFuIiwgImZzIiwgIm9zIiwgInBhdGgiXQp9Cg==
