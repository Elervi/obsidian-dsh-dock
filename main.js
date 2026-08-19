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
    await new Promise((r) => window.setTimeout(r, 500));
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
    const timer = window.setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
      }
    }, timeoutMs);
    proc.once("exit", () => {
      window.clearTimeout(timer);
      resolve2();
    });
    try {
      proc.kill("SIGTERM");
    } catch {
      window.clearTimeout(timer);
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
    containerEl.createEl("p", {
      cls: "dsh-dock-settings-desc",
      text: "\u628A\u5B98\u65B9 DeepSeek Harness Web \u505C\u9760\u8FDB Obsidian\uFF1A\u5B9A\u4F4D dsh \u2192 \u5B50\u8FDB\u7A0B\u8FD0\u884C \u2192 \u9762\u677F\u5D4C\u5165\u3002\u5B98\u65B9\u539F\u751F\uFF0C\u5B98\u65B9 UI \u539F\u6837\u5D4C\u5165\u3002"
    });
    containerEl.createEl("p", {
      cls: "dsh-dock-settings-desc",
      text: '\u{1F91D} \u4E0E dsh-tool-obsidian-vault \u73E0\u8054\u74A7\u5408\uFF1A\u914D\u5408 DSH \u4FA7\u7684 16 \u4E2A vault_* \u5DE5\u5177\uFF0C\u5F00\u7BB1\u5373\u7528\u300CObsidian \u5185 Agent \u7B14\u8BB0\u5DE5\u4F5C\u6D41\u300D\u2014\u2014\u9762\u677F\u91CC\u76F4\u63A5\u8BF4"\u8BFB\u4E00\u4E0B\u4ECA\u5929\u7684\u7B14\u8BB0"\uFF0CAgent \u81EA\u52A8\u5B9A\u4F4D\u5F53\u524D\u5E93\u8BFB\u5199\u3002'
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgeyBzaGVsbCB9IGZyb20gJ2VsZWN0cm9uJ1xuaW1wb3J0IHR5cGUgeyBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQge1xuICBlbWJlZGRlZE5vZGVWZXJzaW9uLFxuICBlbnN1cmVEc2hSdW5uaW5nLFxuICByZXNvbHZlRHNoQmluLFxuICByZXNvbHZlTm9kZUJpbixcbiAgc2FmZVZhdWx0TmFtZSxcbiAgc3RhYmxlSGFzaCxcbiAgc3RvcFByb2Nlc3MsXG4gIHR5cGUgU2VydmVyU3RhdHVzLFxufSBmcm9tICcuL2xhdW5jaGVyJ1xuaW1wb3J0IHsgRHNoRG9ja1NldHRpbmdzVGFiLCBERUZBVUxUX1NFVFRJTkdTLCB0eXBlIERzaERvY2tTZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnXG5pbXBvcnQgeyBEc2hXZWJWaWV3LCBEU0hfV0VCX1ZJRVdfVFlQRSB9IGZyb20gJy4vdmlldydcbmltcG9ydCB7IGN1cnJlbnRWYXVsdEluZm8sIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyIH0gZnJvbSAnLi9jdXJyZW50VmF1bHQnXG5cbi8qKlxuICogXHU4QkExXHU3Qjk3IERTSF9IT01FXHVGRjFBXG4gKiAtIHBlci12YXVsdFx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIHNoYXJlZFx1RkYxQX4vLmRzaCBcdTIwMTRcdTIwMTQgXHU0RTBFXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1QjhDXHU1MTY4XHU0RTAwXHU4MUY0XHVGRjBDXHU1OTBEXHU3NTI4XHU1REYyXHU2NzA5XHU5MTREXHU3RjZFL1x1NEYxQVx1OEJERFx1RkYxQlxuICogLSBjdXN0b21cdUZGMUFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEc2hIb21lKHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnIHwgJ2RzaEhvbWUnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpXG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAnY3VzdG9tJykge1xuICAgIHJldHVybiBzLmRzaEhvbWUudHJpbSgpIHx8IHBhdGguam9pbihob21lLCAnLmRzaCcpXG4gIH1cbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnKSB7XG4gICAgY29uc3QgbmFtZSA9IHZhdWx0Um9vdCA/IGAke3NhZmVWYXVsdE5hbWUodmF1bHRSb290KX0tJHtzdGFibGVIYXNoKHZhdWx0Um9vdCl9YCA6ICd2YXVsdCdcbiAgICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJywgJ3ZhdWx0cycsIG5hbWUpXG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbihob21lLCAnLmRzaCcpXG59XG5cbi8qKlxuICogXHU4QkExXHU3Qjk3XHU2NzJDIHZhdWx0IFx1NzY4NFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1MzAwMlxuICogLSBzaGFyZWQgLyBjdXN0b21cdUZGMUFzZXR0aW5ncy5wb3J0XHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDlcdTIwMTRcdTIwMTQgXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NTQwQ1x1NEUwMFx1NjcwRFx1NTJBMVx1NEUwRVx1NEYxQVx1OEJERFx1RkYxQlxuICogLSBwZXItdmF1bHRcdUZGMUFzZXR0aW5ncy5wb3J0ICsgKHN0YWJsZUhhc2ggJSA0MDk2KSBcdTIwMTRcdTIwMTQgXHU2QkNGXHU0RTJBIHZhdWx0IFx1NzJFQ1x1NTM2MFx1N0FFRlx1NTNFM1x1RkYwQ1x1NTQwNFx1ODFFQVxuICogICBzcGF3biBcdTcyRUNcdTdBQ0JcdTc2ODQgZHNoIFx1OEZEQlx1N0EwQlx1RkYxQlx1OTE0RFx1NTQwOFx1NzJFQ1x1N0FDQlx1NzY4NCBEU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERFx1NUI1OFx1NTBBOFx1NjgzOVx1RkYwOVx1RkYwQ1x1NEUwRFx1NTQwQyB2YXVsdCBcdTc2ODRcbiAqICAgXHU0RjFBXHU4QkREXHU1QjhDXHU1MTY4XHU5Njk0XHU3OUJCXHVGRjBDXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHUzMDAyXHU3QUVGXHU1M0UzXHU1MUIyXHU3QTgxXHU2OTgyXHU3Mzg3IH4xLzQwOTZcdUZGMENcdTUzRUZcdTYzQTVcdTUzRDdcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVQb3J0KHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnIHwgJ3BvcnQnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBudW1iZXIge1xuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcgJiYgdmF1bHRSb290KSB7XG4gICAgY29uc3Qgb2Zmc2V0ID0gcGFyc2VJbnQoc3RhYmxlSGFzaCh2YXVsdFJvb3QpLCAzNikgJSA0MDk2XG4gICAgcmV0dXJuIHMucG9ydCArIG9mZnNldFxuICB9XG4gIHJldHVybiBzLnBvcnRcbn1cblxuLyoqXG4gKiBwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTUxNzFcdTc1MjhcdTRFMDBcdTRFRkRcdUZGMENcdTUzRUFcdTk2OTRcdTc5QkJcdTRGMUFcdThCRERcdUZGMDlcdTMwMDJcbiAqIC0gc2hhcmVkXHVGRjFBZHNoSG9tZSBcdTgxRUFcdThFQUJcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMENcdTY1RTBcdTk3MDBcdTUxNzFcdTRFQUJcdTVDNDJcdUZGMUJcbiAqIC0gY3VzdG9tXHVGRjFBXHU3NTI4XHU2MjM3XHU2MzA3XHU1QjlBXHU4REVGXHU1Rjg0XHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjBDXHU2NUUwXHU5NzAwXHU1MTcxXHU0RUFCXHU1QzQyXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQVx1OEZENFx1NTZERVx1NTE3MVx1NEVBQiBgfi8uZHNoYFx1RkYwQ1x1OEJBOVx1NkJDRlx1NEUyQSB2YXVsdCBcdTc2ODQgc2V0dGluZ3MvY3JlZGVudGlhbHNcbiAqICAgXHU2MzA3XHU1NkRFXHU1QjgzIFx1MjAxNFx1MjAxNCBcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjggdmF1bHQgXHU3NTFGXHU2NTQ4XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdChzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnICYmIHZhdWx0Um9vdCkge1xuICAgIHJldHVybiBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmRzaCcpXG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZFxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEc2hEb2NrUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IERzaERvY2tTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1NcbiAgcHJpdmF0ZSBwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1czogU2VydmVyU3RhdHVzID0geyBraW5kOiAnc3RvcHBlZCcgfVxuICBwcml2YXRlIHN0YXJ0aW5nID0gZmFsc2VcbiAgcHJpdmF0ZSBzdGF0dXNCYXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1c0xpc3RlbmVycyA9IG5ldyBTZXQ8KCkgPT4gdm9pZD4oKVxuICAvKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTk5XHU1MTY1XHU5NjMyXHU2Mjk2IHRpbWVyXHVGRjA4XHU3QTk3XHU1M0UzIGZvY3VzIFx1NTNFRlx1ODBGRFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1RkYwOSAqL1xuICBwcml2YXRlIG1hcmtlclRpbWVyOiBudW1iZXIgfCBudWxsID0gbnVsbFxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcblxuICBvdmVycmlkZSBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKVxuXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoRFNIX1dFQl9WSUVXX1RZUEUsIChsZWFmKSA9PiBuZXcgRHNoV2ViVmlldyhsZWFmLCB0aGlzKSlcblxuICAgIC8vIFx1NjI4QVwiXHU1RjUzXHU1MjREXHU3MTI2XHU3MEI5IHZhdWx0XCJcdThERThcdThGREJcdTdBMEJcdTU0NEFcdThCQzkgRFNIIFx1NEZBN1x1RkYxQVx1NjcyQ1x1N0E5N1x1NTNFM1x1NjI1M1x1NUYwMFx1RkYwOG9ubG9hZFx1RkYwOVx1NEUwRVx1NkJDRlx1NkIyMVx1ODNCN1x1NUY5N1xuICAgIC8vIFx1NzEyNlx1NzBCOVx1NjVGNlx1NTIzN1x1NjVCMFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1MzAwMlx1NTkxQVx1N0E5N1x1NTNFM1x1NTczQVx1NjY2Rlx1NEUwQlx1NkJDRlx1NEUyQVx1N0E5N1x1NTNFM1x1OTBGRFx1NzJFQ1x1N0FDQlx1NTJBMFx1OEY3RFx1NjcyQ1x1NjNEMlx1NEVGNlx1RkYwQ1x1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1xuICAgIC8vIFx1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NTM3M1wiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXHU1NzI4XHU3NzBCXHU3Njg0IHZhdWx0XCJcdTMwMDJcbiAgICB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgIGNvbnN0IG9uV2luZG93Rm9jdXMgPSAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uV2luZG93Rm9jdXMpXG4gICAgdGhpcy5yZWdpc3RlcigoKSA9PiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbldpbmRvd0ZvY3VzKSlcbiAgICAvLyBcdTg4NjVcdTUxNDVcdTRGRTFcdTUzRjdcdUZGMUFcdTc1MjhcdTYyMzdcdTU3MjhcdTdBOTdcdTUzRTNcdTUxODVcdTUyMDdcdTYzNjJcdTY1ODdcdTRFRjYvXHU1RTAzXHU1QzQwXHU1RkM1XHU3MTM2XHU4OUU2XHU1M0QxIGFjdGl2ZS1sZWFmLWNoYW5nZVx1RkYwQ1xuICAgIC8vIFx1ODk4Nlx1NzZENiB3aW5kb3cgZm9jdXMgXHU0RThCXHU0RUY2XHU0RTBEXHU2RDNFXHU1M0QxXHU3Njg0XHU1NzNBXHU2NjZGXHUzMDAyXHU5NjMyXHU2Mjk2XHU1MTcxXHU3NTI4XHU0RTAwXHU0RTJBIHRpbWVyXHVGRjBDXHU0RTkyXHU0RTBEXHU1RTcyXHU2MjcwXHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignYWN0aXZlLWxlYWYtY2hhbmdlJywgKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCkpKVxuXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdib3QnLCAnRFNIIERvY2tcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0YnLCAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCkpXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1kc2gtcGFuZWwnLFxuICAgICAgbmFtZTogJ1x1NjI1M1x1NUYwMCBEU0ggXHU5NzYyXHU2NzdGJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdGFydC1kc2gnLFxuICAgICAgbmFtZTogJ1x1NTQyRlx1NTJBOCBEU0ggXHU2NzBEXHU1MkExJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc3RhcnQoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N0b3AtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTUwNUNcdTZCNjIgRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0b3AoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLWJyb3dzZXInLFxuICAgICAgbmFtZTogJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCBEU0gnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuSW5Ccm93c2VyKCksXG4gICAgfSlcblxuICAgIHRoaXMuc3RhdHVzQmFyRWwgPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKVxuICAgIHRoaXMucmVuZGVyU3RhdHVzQmFyKClcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IERzaERvY2tTZXR0aW5nc1RhYih0aGlzLmFwcCwgdGhpcykpXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5hdXRvc3RhcnQpIHtcbiAgICAgIHZvaWQgdGhpcy5zdGFydCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0b3BwZWQnIH0pXG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgb251bmxvYWQoKTogdm9pZCB7XG4gICAgdm9pZCB0aGlzLnN0b3AoKVxuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmNsZWFyKClcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDkgKi9cbiAgcHJpdmF0ZSB2YXVsdFJvb3QoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgfVxuXG4gIG9uU3RhdHVzQ2hhbmdlKGZuOiAoKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuYWRkKGZuKVxuICAgIHJldHVybiAoKSA9PiB0aGlzLnN0YXR1c0xpc3RlbmVycy5kZWxldGUoZm4pXG4gIH1cblxuICBwcml2YXRlIHNldFN0YXR1cyhzdGF0dXM6IFNlcnZlclN0YXR1cyk6IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIGZvciAoY29uc3QgZm4gb2YgdGhpcy5zdGF0dXNMaXN0ZW5lcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZuKClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXR1c0JhcigpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc3RhdHVzQmFyRWwpIHJldHVyblxuICAgIGNvbnN0IHMgPSB0aGlzLnN0YXR1c1xuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KGBEU0g6ICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICdcdUZGMDhcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMDknIDogJyd9YClcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNicpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU2NzJBXHU4RkQwXHU4ODRDJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcblxuICAvKiogXHU4QkZCXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLm1hcmtlclRpbWVyKVxuICAgIHRoaXMubWFya2VyVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgpXG4gICAgfSwgMzAwKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuXG4gIC8qKiBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NjMwMlx1NjNBNVx1RkYxQlx1NTQyNlx1NTIxOSBzcGF3biBcdTVCOThcdTY1QjkgZHNoIHdlYiAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xuICAgIGlmICh0aGlzLnN0YXJ0aW5nKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICB0aGlzLnN0YXJ0aW5nID0gdHJ1ZVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0YXJ0aW5nJyB9KVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgICBjb25zdCBkc2hIb21lID0gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHNoYXJlZENvbmZpZ1Jvb3QgPSBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgaG9zdDogdGhpcy5zZXR0aW5ncy5ob3N0LFxuICAgICAgICBkc2hIb21lLFxuICAgICAgICAvLyBwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHUzMDAyXG4gICAgICAgIC4uLihzaGFyZWRDb25maWdSb290ID8geyBzaGFyZWRDb25maWdSb290IH0gOiB7fSksXG4gICAgICAgIHVzZUVtYmVkZGVkTm9kZTogdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUsXG4gICAgICAgIC8vIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFcdTZDRThcdTUxNjVcdTY3MkNcdTY3MERcdTUyQTFcdTYyNDBcdTVDNUVcdTVFOTMgZW52XHVGRjA4XHU3QjJDXHU0RThDXHU5MDFBXHU5MDUzXHVGRjA5XHUzMDAyXHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XHU4OUUzXHU2NzkwXHU2NUY2XG4gICAgICAgIC8vIFx1NEYxOFx1NTE0OFx1NzUyOFx1NjcyQyBlbnYgXHU4QkM2XHU1MjJCXCJcdTY3MkNcdTY3MERcdTUyQTFcdTY3MERcdTUyQTFcdTc2ODRcdTVFOTNcIlx1RkYwQ2N3ZCBcdTRGRERcdTYzMDEgZHNoIFx1OEZEQlx1N0EwQlx1OUVEOFx1OEJBNFx1NURFNVx1NEY1Q1x1NzZFRVx1NUY1NVxuICAgICAgICAvLyBcdTRFMERcdTUzRDggXHUyMDE0XHUyMDE0IGN3ZCBcdTRFMEUgT2JzaWRpYW4gXHU1RTkzXHU2NjJGXHU0RTI0XHU0RTJBXHU3MkVDXHU3QUNCXHU2OTgyXHU1RkY1XHVGRjBDXHU0RTBEXHU1NDA4XHU1RTc2XHUzMDAyXG4gICAgICAgIGVudjogc2hhcmVkQ29uZmlnUm9vdCAmJiB2YXVsdEluZm9cbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgRFNIX09CU0lESUFOX1ZBVUxUX05BTUU6IHZhdWx0SW5mby5uYW1lLFxuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfUEFUSDogdmF1bHRJbmZvLnBhdGgsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiB7fSxcbiAgICAgIH0pXG4gICAgICB0aGlzLnByb2MgPSByZXN1bHQucHJvYyA/PyBudWxsXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgcmVzdWx0LnByb2MpIHtcbiAgICAgICAgdGhpcy5ob29rQ2hpbGRMb2dzKHJlc3VsdC5wcm9jKVxuICAgICAgfVxuICAgICAgdGhpcy5zZXRTdGF0dXMocmVzdWx0LnN0YXR1cylcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtyZXN1bHQuc3RhdHVzLm1lc3NhZ2V9YClcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgIXJlc3VsdC5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFdlYiBcdTVERjJcdTVDMzFcdTdFRUE6ICR7cmVzdWx0LnN0YXR1cy51cmx9YClcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBtc2cgfSlcbiAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTVGMDJcdTVFMzg6ICR7bXNnfWApXG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgaWYgKHRoaXMucHJvYykge1xuICAgICAgYXdhaXQgc3RvcFByb2Nlc3ModGhpcy5wcm9jKVxuICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgIH1cbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICB9XG5cbiAgcHJpdmF0ZSBob29rQ2hpbGRMb2dzKHByb2M6IENoaWxkUHJvY2Vzcyk6IHZvaWQge1xuICAgIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUud2FybignW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhdGhpcy5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBOiBjb2RlPSR7Y29kZX0gc2lnbmFsPSR7c2lnbmFsID8/ICcnfWAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tkc2gtZG9ja10gXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGJywgZXJyKVxuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRjogJHtlcnIubWVzc2FnZX1gIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKiBcdTYzQTJcdTZENEJcdTRGRTFcdTYwNkZcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZGV0ZWN0SW5mbygpOiB7IGRzaEJpbjogc3RyaW5nIHwgbnVsbDsgZHNoTm90ZXM6IHN0cmluZ1tdOyBub2RlTm90ZXM6IHN0cmluZ1tdIH0ge1xuICAgIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbih0aGlzLnNldHRpbmdzLmRzaEJpbilcbiAgICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4odGhpcy5zZXR0aW5ncy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKVxuICAgIHJldHVybiB7XG4gICAgICBkc2hCaW46IGZvdW5kLmJpbixcbiAgICAgIGRzaE5vdGVzOiBmb3VuZC5ub3RlcyxcbiAgICAgIG5vZGVOb3Rlczogbm9kZS5ub3RlcyxcbiAgICB9XG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0IERTSF9IT01FXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGVmZmVjdGl2ZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTdBRUZcdTUzRTNcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOSAqL1xuICBlZmZlY3RpdmVQb3J0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRiA9IH4vLmRzaFx1RkYwQ1x1NTE3Nlx1NEY1OVx1NjVFMFx1RkYwOSAqL1xuICBlZmZlY3RpdmVTaGFyZWRDb25maWdSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgYXMgUGFydGlhbDxEc2hEb2NrU2V0dGluZ3M+IHwgbnVsbFxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBkYXRhID8/IHt9KVxuICAgIC8vIFx1NjVFN1x1NzI0OFx1RkYwOGRzaC1ob3N0IFYwLjFcdUZGMDlcdThCQkVcdTdGNkVcdThGQzFcdTc5RkJcdUZGMUFkc2hIb21lIFx1NUI1N1x1N0IyNlx1NEUzMiBcdTIxOTIgY3VzdG9tIFx1NkEyMVx1NUYwRlxuICAgIGNvbnN0IGxlZ2FjeTogeyBkc2hIb21lPzogc3RyaW5nIH0gfCBudWxsID0gZGF0YVxuICAgIGlmIChsZWdhY3k/LmRzaEhvbWUgJiYgdHlwZW9mIGxlZ2FjeS5kc2hIb21lID09PSAnc3RyaW5nJyAmJiBsZWdhY3kuZHNoSG9tZS50cmltKCkpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSAnY3VzdG9tJ1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lID0gbGVnYWN5LmRzaEhvbWUudHJpbSgpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBVSVxuXG4gIGFzeW5jIG9wZW5QYW5lbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHBcbiAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERTSF9XRUJfVklFV19UWVBFKVxuICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IGxlYXZlc1swXSA/PyBudWxsXG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSlcbiAgICAgIGlmICghbGVhZikgcmV0dXJuXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9XG4gICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZilcbiAgfVxuXG4gIGFzeW5jIG9wZW5JbkJyb3dzZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgc2hlbGwub3BlbkV4dGVybmFsKHRoaXMuYmFzZVVybClcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhPYnNpZGlhbiBwb3BvdXRcdUZGMDlcdUZGMUFEU0ggXHU5NzYyXHU2NzdGXHU4RkRCXHU1MTY1XHU3MkVDXHU3QUNCIEJyb3dzZXJXaW5kb3cgPVxuICAgKiBcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTRFMEUgT2JzaWRpYW4gXHU0RTNCXHU3QTk3XHU1M0UzXHU5Njk0XHU3OUJCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHU2ODA3XHU3QjdFXHU5ODc1XHUzMDAyXG4gICAqL1xuICBhc3luYyBvcGVuUG9wb3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLm9wZW5Qb3BvdXRMZWFmKClcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICBuZXcgTm90aWNlKGBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdTU5MzFcdThEMjU6ICR7bXNnfWApXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBsYXVuY2hlci50cyBcdTIwMTRcdTIwMTQgXHU3RUFGXHU1NDJGXHU1MkE4XHU5MDNCXHU4RjkxXHVGRjA4XHU5NkY2IE9ic2lkaWFuIFx1NEY5RFx1OEQ1Nlx1RkYwQ1x1NTNFRlx1NzJFQ1x1N0FDQlx1NTE5Mlx1NzBERlx1NkQ0Qlx1OEJENVx1RkYwOVx1MzAwMlxuICpcbiAqIFx1ODA0Q1x1OEQyM1x1RkYxQVx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYgXHUyMTkyIHNwYXduIGBkc2ggd2ViYFxuICogXHVGRjA4MTI3LjAuMC4xOjxwb3J0Plx1RkYwOVx1MjE5MiBcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUEgXHUyMTkyIFx1NTA1Q1x1NkI2Mlx1MzAwMlxuICpcbiAqIFx1NTE3M1x1OTUyRVx1NEU4Qlx1NUI5RVx1RkYwOFx1NURGMlx1NTcyOFx1NUI5OFx1NjVCOSBAZGVlcHNlZWstYWkvZHNoQDAuMS4wLXJjLjYgXHU0RTBBXHU5QThDXHU4QkMxXHVGRjA5XHVGRjFBXG4gKiAtIGBub2RlIDxkc2g+L2xpYi9iaW4uanMgd2ViIC0taG9zdCAxMjcuMC4wLjEgLS1wb3J0IDxwb3J0PmAgXHU1MzczXHU1Qjk4XHU2NUI5IFdlYiBVSVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTQgaG9zdD0xMjcuMC4wLjFcdTMwMDFwb3J0PTMwODBcdUZGMDhcdTUzRUZcdTg5ODZcdTc2RDZcdUZGMDlcdUZGMUJcbiAqIC0gXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU4MUVBXHU1MkE4XHU1MjFEXHU1OUNCXHU1MzE2ICREU0hfSE9NRS9wcm9maWxlcy93ZWJcdUZGMDhidW5kbGVzID0gZHNoLWJhc2UgKyBkc2gtd2ViLWFwcFx1RkYwOVx1RkYwQ1xuICogICBcdTZBMjFcdTU3NTdcdTg5RTNcdTY3OTBcdThENzAgJERTSF9IT01FL3Byb2ZpbGVzL25vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTdCMjZcdTUzRjdcdTk0RkVcdTYzQTVcdUZGMENcdTY1RTBcdTk3MDAgcG5wbS9cdTgwNTRcdTdGNTFcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0XHU5MTREXHU3RjZFXHU0RTBCIFNRTGl0ZVx1RkYwOG5vZGU6c3FsaXRlXHVGRjBDXHU5NzAwIE5vZGUgXHUyMjY1MjIuNVx1RkYwOVx1NEUwRFx1NEYxQVx1NjI1M1x1NUYwMFx1RkYwOG9wZW5BdDogbmV2ZXJcdUZGMDlcdUZGMENcbiAqICAgXHU1NkUwXHU2QjY0IE5vZGUgMjArIFx1NEU1Rlx1ODBGRFx1OEREMVx1OUVEOFx1OEJBNCB3ZWIgcHJvZmlsZVx1RkYxQlx1NTQyRlx1NzUyOFx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NjVGNlx1NjI0RFx1OTcwMFx1ODk4MSBOb2RlIFx1MjI2NTIyLjVcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBzcGF3biwgc3Bhd25TeW5jLCB0eXBlIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCdcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5leHBvcnQgY29uc3QgRFNIX1JFTEFUSVZFX0JJTiA9IHBhdGguam9pbignQGRlZXBzZWVrLWFpJywgJ2RzaCcsICdsaWInLCAnYmluLmpzJylcblxuLyoqIE5vZGUgXHU0RTNCXHU3MjQ4XHU2NzJDXHU1M0Y3XHU2QkQ0XHU4RjgzXHVGRjFBbm9kZTpzcWxpdGUgXHU5NzAwXHU4OTgxIFx1MjI2NTIyLjVcdUZGMDhcdTRFQzVcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTUyOUZcdTgwRkRcdTc1MjhcdTUyMzBcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBOT0RFX1NRTElURV9NSU5fTUFKT1IgPSAyMlxuXG4vKiogXHU3QTMzXHU1QjlBXHU3N0VEXHU1NEM4XHU1RTBDXHVGRjA4ZGpiMlx1RkYwOVx1RkYwQ1x1NzUyOFx1NEU4RSB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdTZEODhcdTZCNjdcdUZGMENcdTkwN0ZcdTUxNERcdTRFMkRcdTY1ODdcdTU0MERcdTZFMDVcdTZEMTdcdTc4QjBcdTY0OUUgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFibGVIYXNoKGlucHV0OiBzdHJpbmcsIGxlbiA9IDYpOiBzdHJpbmcge1xuICBsZXQgaCA9IDUzODFcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykgaCA9ICgoaCA8PCA1KSArIGggKyBpbnB1dC5jaGFyQ29kZUF0KGkpKSA+Pj4gMFxuICByZXR1cm4gaC50b1N0cmluZygzNikucGFkU3RhcnQobGVuLCAnMCcpLnNsaWNlKDAsIGxlbilcbn1cblxuLyoqIFx1NTNFRlx1OEJGQlx1NzY4NCB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdUZGMDhcdTRGRERcdTc1NTkgVW5pY29kZSBcdTVCNTdcdTZCQ0RcdTY1NzBcdTVCNTdcdUZGMENcdTUxNzZcdTRGNTlcdThGNkMgLVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOSAndmF1bHQnICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZVZhdWx0TmFtZSh2YXVsdFJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNsZWFuZWQgPSBwYXRoXG4gICAgLmJhc2VuYW1lKHZhdWx0Um9vdClcbiAgICAucmVwbGFjZSgvW15cXHB7TH1cXHB7Tn1fLV0rL2d1LCAnLScpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgJycpXG4gIHJldHVybiAoY2xlYW5lZCB8fCAndmF1bHQnKS5zbGljZSgwLCA0MClcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hPcHRpb25zIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1x1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbj86IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTkgKi9cbiAgbm9kZUJpbj86IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydD86IG51bWJlclxuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTQgMTI3LjAuMC4xXHVGRjBDXHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q/OiBzdHJpbmdcbiAgLyoqICREU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERC9cdTVCQzZcdTk0QTUvXHU2QTIxXHU1NzhCXHU5MTREXHU3RjZFXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjFCXHU5RUQ4XHU4QkE0IDx2YXVsdD4vLmRzaFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqXG4gICAqIFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODQgYH4vLmRzaGBcdUZGMDlcdUZGMUFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1N0Y2RVx1N0M3Qlx1NjU4N1x1NEVGNlxuICAgKiBcdTYzMDdcdTU0MTFcdTZCNjRcdTc2RUVcdTVGNTVcdUZGMENcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU0RTAwXHU0RUZEXHVGRjFCc2Vzc2lvbnMgXHU3QjQ5XHU2NTcwXHU2MzZFXHU0RUNEXHU1NzI4IGBkc2hIb21lYCBcdTk2OTRcdTc5QkJcdTMwMDJcbiAgICogXHU3NTU5XHU3QTdBID0gXHU0RTBEXHU1NDJGXHU3NTI4XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4ZHNoSG9tZSBcdTgxRUFcdThFQUJcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDlcdTMwMDJcbiAgICovXG4gIHNoYXJlZENvbmZpZ1Jvb3Q/OiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlPzogYm9vbGVhblxuICAvKiogXHU1QzMxXHU3RUVBXHU3QjQ5XHU1Rjg1XHU0RTBBXHU5NjUwXHVGRjA4XHU5RUQ4XHU4QkE0IDEyMHNcdUZGMDkgKi9cbiAgdGltZW91dE1zPzogbnVtYmVyXG4gIC8qKiBcdTk2NDRcdTUyQTBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgKi9cbiAgZW52PzogTm9kZUpTLlByb2Nlc3NFbnZcbiAgLyoqXG4gICAqIFx1NUI1MFx1OEZEQlx1N0EwQlx1NURFNVx1NEY1Q1x1NzZFRVx1NUY1NVx1MzAwMnBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRGMjAgdmF1bHQgXHU2ODM5XHVGRjFBXHU2NUIwXHU1RUZBXHU0RjFBXHU4QkREXHU3Njg0IGN3ZCBcdTUzNzNcdTY3MkNcdTVFOTNcdTY4MzlcdUZGMENcbiAgICogdmF1bHQgXHU1REU1XHU1MTc3XHU4OUUzXHU2NzkwXHU5ODdBXHU1RThGXHU3QjJDIDMgXHU0RjREXHVGRjA4XHU0RjFBXHU4QkREIGN3ZCBcdTgyRTVcdTY2MkZcdTVFOTNcdUZGMDlcdTc2RjRcdTYzQTVcdTU0N0RcdTRFMkQgXHUyMDE0XHUyMDE0IFx1NTcyOFx1NzUxRlx1NzI2OVx1NTkwN1x1OEJGRVx1NzY4NFxuICAgKiBcdTY3MERcdTUyQTFcdTkxQ0NcdTYzRDBcdTk1RUVcdTdFRERcdTRFMERcdTRGMUFcdTg5RTNcdTY3OTBcdTYyMTBcdTc1MUZcdTcyNjlcdTk4OThcdTVFOTNcdTMwMDJzaGFyZWQgXHU2QTIxXHU1RjBGXHU0RTBEXHU0RjIwXHVGRjA4XHU2MjQwXHU2NzA5XHU1RTkzXHU1MTcxXHU3NTI4XHU0RTAwXHU0RTJBXHU2NzBEXHU1MkExXHVGRjBDXG4gICAqIFx1OTc2MFx1NzEyNlx1NzBCOVx1NjgwN1x1OEJCMFx1OERERlx1OTY4Rlx1RkYwOVx1MzAwMlxuICAgKi9cbiAgY3dkPzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWROb2RlIHtcbiAgLyoqIFx1NzUyOFx1NEU4RSBzcGF3biBcdTc2ODQgbm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU2MjhBIE9ic2lkaWFuIFx1NzY4NCBFbGVjdHJvbiBcdTRFOENcdThGREJcdTUyMzZcdTVGNTMgTm9kZSBcdTc1MjggKi9cbiAgdXNlRWxlY3Ryb25Bc05vZGU6IGJvb2xlYW5cbiAgLyoqIFx1OEJFNSBOb2RlIFx1NzY4NCBtYWpvciBcdTcyNDhcdTY3MkNcdUZGMDhcdTYzQTJcdTZENEJcdTU5MzFcdThEMjVcdTRFM0EgMFx1RkYwOSAqL1xuICBub2RlTWFqb3I6IG51bWJlclxuICAvKiogXHU2M0EyXHU2RDRCL1x1NTFCM1x1N0I1Nlx1OEJGNFx1NjYwRVx1RkYwOFx1NEY5Qlx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBub3Rlczogc3RyaW5nW11cbn1cblxuZXhwb3J0IHR5cGUgU2VydmVyU3RhdHVzID1cbiAgfCB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHwgeyBraW5kOiAnc3RhcnRpbmcnIH1cbiAgfCB7IGtpbmQ6ICdydW5uaW5nJzsgcG9ydDogbnVtYmVyOyBob3N0OiBzdHJpbmc7IHVybDogc3RyaW5nOyBhdHRhY2hlZDogYm9vbGVhbiB9XG4gIHwgeyBraW5kOiAnZXJyb3InOyBtZXNzYWdlOiBzdHJpbmcgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1OERFRlx1NUY4NFx1NUI5QVx1NEY0RFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTYyOEFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTUxNjVcdTUzRTNcdTg5QzRcdTgzMDNcdTUzMTZcdUZGMUFcdTYzMDdcdTU0MTEgYmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU5MEZEXHU2M0E1XHU1M0Q3ICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRHNoQmluKGlucHV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghaW5wdXQpIHJldHVybiBudWxsXG4gIGNvbnN0IHAgPSBpbnB1dC50cmltKClcbiAgaWYgKCFwKSByZXR1cm4gbnVsbFxuICBjb25zdCBleHBhbmRlZCA9IHAucmVwbGFjZSgvXn4oPz0kfFxcL3xcXFxcKS8sIG9zLmhvbWVkaXIoKSlcbiAgY29uc3QgYWJzID0gcGF0aC5pc0Fic29sdXRlKGV4cGFuZGVkKSA/IHBhdGgubm9ybWFsaXplKGV4cGFuZGVkKSA6IHBhdGgucmVzb2x2ZShleHBhbmRlZClcbiAgdHJ5IHtcbiAgICBjb25zdCBzdCA9IGZzLnN0YXRTeW5jKGFicylcbiAgICBpZiAoc3QuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKGFicywgJ2xpYicsICdiaW4uanMnKVxuICAgICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IG51bGxcbiAgICB9XG4gICAgaWYgKHN0LmlzRmlsZSgpKSByZXR1cm4gYWJzXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuLyoqIFx1NUUzOFx1ODlDMSBucG0gXHU1MTY4XHU1QzQwIG5vZGVfbW9kdWxlcyBcdTY4MzlcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxNb2R1bGVSb290cygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJvb3RzOiBzdHJpbmdbXSA9IFtdXG4gIGlmIChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpIHJvb3RzLnB1c2gocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKVxuICBjb25zdCBucG1Sb290ID0gc3Bhd25TeW5jKCducG0nLCBbJ3Jvb3QnLCAnLWcnXSwge1xuICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgdGltZW91dDogMTBfMDAwLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxuICBpZiAobnBtUm9vdC5zdGF0dXMgPT09IDAgJiYgbnBtUm9vdC5zdGRvdXQpIHtcbiAgICBjb25zdCBsaW5lID0gbnBtUm9vdC5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLylbMF1cbiAgICBpZiAobGluZSkgcm9vdHMucHVzaChsaW5lKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIHJvb3RzLnB1c2goJy9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICByb290cy5wdXNoKCcvdXNyL2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdsaWInLCAnbm9kZV9tb2R1bGVzJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIGNvbnN0IGFwcERhdGEgPSBwcm9jZXNzLmVudi5BUFBEQVRBXG4gICAgaWYgKGFwcERhdGEpIHJvb3RzLnB1c2gocGF0aC5qb2luKGFwcERhdGEsICducG0nLCAnbm9kZV9tb2R1bGVzJykpXG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXG4gIHJldHVybiBbLi4ubmV3IFNldChyb290cyldXG59XG5cbi8qKlxuICogXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1MTY1XHU1M0UzXHUzMDAyXHU0RjE4XHU1MTQ4XHU3RUE3XHVGRjFBXG4gKiAxLiBcdTY2M0VcdTVGMEZcdTRGMjBcdTUxNjVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdUZGMDlcdTIxOTIgMi4gXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIERTSF9CSU4gXHUyMTkyIDMuIG5wbSByb290IC1nIFx1MjE5MiA0LiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTY4MzlcdTMwMDJcbiAqIFx1NjcyQVx1NjI3RVx1NTIzMFx1NjVGNiBiaW4gXHU0RTNBIG51bGxcdUZGMENub3RlcyBcdThCRjRcdTY2MEVcdTUzOUZcdTU2RTBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEc2hCaW4oZXhwbGljaXQ/OiBzdHJpbmcpOiB7IGJpbjogc3RyaW5nIHwgbnVsbDsgbm90ZXM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IG5vcm1hbGl6ZURzaEJpbihleHBsaWNpdCA/PyBwcm9jZXNzLmVudi5EU0hfQklOKVxuICBpZiAoZXhwbGljaXRCaW4gJiYgZnMuZXhpc3RzU3luYyhleHBsaWNpdEJpbikpIHtcbiAgICByZXR1cm4geyBiaW46IGV4cGxpY2l0QmluLCBub3RlczogW2BcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEZcdThERUZcdTVGODQ6ICR7ZXhwbGljaXRCaW59YF0gfVxuICB9XG4gIGlmIChleHBsaWNpdCkgbm90ZXMucHVzaChgXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0XHU0RTBEXHU1QjU4XHU1NzI4OiAke2V4cGxpY2l0fWApXG5cbiAgZm9yIChjb25zdCByb290IG9mIGdsb2JhbE1vZHVsZVJvb3RzKCkpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4ocm9vdCwgRFNIX1JFTEFUSVZFX0JJTilcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICByZXR1cm4geyBiaW46IGNhbmRpZGF0ZSwgbm90ZXM6IFsuLi5ub3RlcywgYFx1NEVDRVx1NTE2OFx1NUM0MFx1NkEyMVx1NTc1N1x1NjgzOVx1NTNEMVx1NzNCMDogJHtjYW5kaWRhdGV9YF0gfVxuICAgIH1cbiAgfVxuICBub3Rlcy5wdXNoKCdcdTY3MkFcdTYyN0VcdTUyMzAgZHNoIFx1NUI4OVx1ODhDNVx1MzAwMlx1OEJGN1x1NTE0OFx1NjI2N1x1ODg0QzogbnBtIGluc3RhbGwgLWcgQGRlZXBzZWVrLWFpL2RzaFx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBkc2ggXHU4REVGXHU1Rjg0JylcbiAgcmV0dXJuIHsgYmluOiBudWxsLCBub3RlcyB9XG59XG5cbi8qKlxuICogXHU1RTM4XHU4OUMxIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjBDXHU2M0EyXHU2RDRCXHU3NTI4XHVGRjA5XHUzMDAyXG4gKiBPYnNpZGlhbiBcdTRGNUNcdTRFM0EgR1VJIFx1NUU5NFx1NzUyOFx1NEVDRSBGaW5kZXIgXHU1NDJGXHU1MkE4XHU2NUY2XHVGRjBDUEFUSCBcdTkwMUFcdTVFMzhcdTUzRUFcdTY3MDlcdTdDRkJcdTdFREZcdTc2RUVcdTVGNTVcbiAqIFx1RkYwOC91c3IvYmluOi9iaW46L3Vzci9zYmluOi9zYmluXHVGRjA5XHVGRjBDXHU0RTBEXHU1NDJCIEhvbWVicmV3IFx1N0I0OVx1NzUyOFx1NjIzN1x1NUI4OVx1ODhDNVx1NzZFRVx1NUY1NVx1RkYwQ1xuICogXHU1NkUwXHU2QjY0IHNwYXduKCdub2RlJykgXHU0RjFBXHU3NkY0XHU2M0E1IEVOT0VOVFx1MzAwMlx1OEZEOVx1OTFDQ1x1NjI4QVx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1NEY0RFx1N0Y2RVx1ODg2NVx1OUY1MFx1RkYxQVxuICogLSBQQVRIIFx1NEUyRFx1NzY4NCBub2RlXHVGRjA4c2hlbGwgXHU5MUNDXHU4RkQwXHU4ODRDXHU2NUY2XHU1QjU4XHU1NzI4XHVGRjA5XHVGRjFCXG4gKiAtIG1hY09TOiAvb3B0L2hvbWVicmV3L2Jpbi9ub2RlXHVGRjA4QXBwbGUgU2lsaWNvblx1RkYwOVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdUZGMDhJbnRlbFx1RkYwOVx1RkYxQlxuICogLSBMaW51eDogL3Vzci9iaW4vbm9kZVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdTMwMDF+Ly5sb2NhbC9iaW4vbm9kZVx1RkYxQlxuICogLSBXaW5kb3dzOiBcdTkwMUFcdThGQzcgYHdoZXJlIG5vZGVgIFx1ODlFM1x1Njc5MFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tbW9uTm9kZUJpbnMoKTogc3RyaW5nW10ge1xuICBjb25zdCBiaW5zOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IHBhdGhFbnYgPSBwcm9jZXNzLmVudi5QQVRIID8/ICcnXG4gIGZvciAoY29uc3QgZGlyIG9mIHBhdGhFbnYuc3BsaXQocGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgaWYgKGRpci50cmltKCkpIGJpbnMucHVzaChwYXRoLmpvaW4oZGlyLCAnbm9kZScpKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIGJpbnMucHVzaCgnL29wdC9ob21lYnJldy9iaW4vbm9kZScsICcvdXNyL2xvY2FsL2Jpbi9ub2RlJylcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnbGludXgnKSB7XG4gICAgYmlucy5wdXNoKCcvdXNyL2Jpbi9ub2RlJywgJy91c3IvbG9jYWwvYmluL25vZGUnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2JpbicsICdub2RlJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB3aGVyZSA9IHNwYXduU3luYygnd2hlcmUnLCBbJ25vZGUnXSwgeyBlbmNvZGluZzogJ3V0ZjgnLCB0aW1lb3V0OiAxMF8wMDAsIHdpbmRvd3NIaWRlOiB0cnVlIH0pXG4gICAgICBpZiAod2hlcmUuc3RhdHVzID09PSAwICYmIHdoZXJlLnN0ZG91dCkge1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2Ygd2hlcmUuc3Rkb3V0LnRyaW0oKS5zcGxpdCgvXFxyP1xcbi8pKSB7XG4gICAgICAgICAgaWYgKGxpbmUudHJpbSgpKSBiaW5zLnB1c2gobGluZS50cmltKCkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcdUZGMENcdTRGRERcdTc1NTlcdTdCMkNcdTRFMDBcdTRFMkFcdTVCNThcdTU3MjhcdTc2ODRcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KGJpbnMpXVxufVxuXG4vKipcbiAqIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNlx1MzAwMlxuICogXHU5RUQ4XHU4QkE0XHU5ODdBXHU1RThGXHVGRjFBXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0IFx1MjE5MiBcdTdDRkJcdTdFREYgYG5vZGVgXHVGRjA4UEFUSCArIFx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1OERFRlx1NUY4NFx1RkYwQ1x1OEZENFx1NTZERVx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1xuICogXHU5MDdGXHU1MTREIE9ic2lkaWFuIEdVSSBcdTczQUZcdTU4ODMgUEFUSCBcdTdGM0FcdTU5MzFcdTVCRkNcdTgxRjQgc3Bhd24gRU5PRU5UXHVGRjA5XHUyMTkyIFx1NjI3RVx1NEUwRFx1NTIzMFx1NjVGNlx1N0VEOVx1NTFGQVx1NjYwRVx1Nzg2RVx1OTUxOVx1OEJFRlx1MzAwMlxuICogRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlIFx1NUI5RVx1NkQ0Qlx1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwOE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlxuICogXHU0RTBEXHU2MzA5XHU2NjZFXHU5MDFBIEVsZWN0cm9uIFx1OEJFRFx1NEU0OVx1NTRDRFx1NUU5NFx1RkYwOVx1RkYwQ1x1NTZFMFx1NkI2NFx1NEVDNVx1NUY1MyB1c2VFbWJlZGRlZE5vZGUgXHU2NjNFXHU1RjBGXHU1RjAwXHU1NDJGXHU2NUY2XHU2MjREXHU1QzFEXHU4QkQ1XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTm9kZUJpbihleHBsaWNpdD86IHN0cmluZywgZW1iZWRkZWROb2RlVmVyc2lvbj86IHN0cmluZywgdXNlRW1iZWRkZWQgPSBmYWxzZSk6IFJlc29sdmVkTm9kZSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gZXhwbGljaXQ/LnRyaW0oKSB8fCBwcm9jZXNzLmVudi5EU0hfTk9ERVxuICBpZiAoZXhwbGljaXRCaW4pIHtcbiAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEYgTm9kZTogJHtleHBsaWNpdEJpbn1gKVxuICAgIHJldHVybiB7IG5vZGVCaW46IGV4cGxpY2l0QmluLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZCAmJiBwcm9jZXNzLmV4ZWNQYXRoICYmIGVtYmVkZGVkTm9kZVZlcnNpb24pIHtcbiAgICBjb25zdCBtYWpvciA9IE51bWJlcihlbWJlZGRlZE5vZGVWZXJzaW9uLnNwbGl0KCcuJylbMF0pIHx8IDBcbiAgICBpZiAobWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufVx1RkYwOEVMRUNUUk9OX1JVTl9BU19OT0RFXHVGRjA5YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IHByb2Nlc3MuZXhlY1BhdGgsIHVzZUVsZWN0cm9uQXNOb2RlOiB0cnVlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICAgIG5vdGVzLnB1c2goYE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn0gPCAke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMENcdTY1RTBcdTZDRDVcdTU0MkZcdTc1MjhgKVxuICB9XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNvbW1vbk5vZGVCaW5zKCkpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTdDRkJcdTdFREYgTm9kZTogJHtjYW5kaWRhdGV9YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IGNhbmRpZGF0ZSwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIE5vZGVcdTMwMDJcdThCRjdcdTVCODlcdTg4QzUgTm9kZVx1RkYwOGh0dHBzOi8vbm9kZWpzLm9yZ1x1RkYwOVx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IG5vZGVCaW46ICcnLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1N0FFRlx1NTNFM1x1NjNBMlx1NkQ0Qlx1NEUwRVx1N0I0OVx1NUY4NVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTVGNTNcdTUyNERcdThGRDBcdTg4NENcdTczQUZcdTU4ODNcdUZGMDhPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMDlcdTgxRUFcdTVFMjZcdTc2ODQgTm9kZSBcdTcyNDhcdTY3MkNcdUZGMUJcdTY1RTBcdTUyMTkgdW5kZWZpbmVkICovXG5leHBvcnQgZnVuY3Rpb24gZW1iZWRkZWROb2RlVmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIGNvbnN0IHYgPSAocHJvY2Vzcy52ZXJzaW9ucyBhcyB7IG5vZGU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/Lm5vZGVcbiAgICByZXR1cm4gdiB8fCB1bmRlZmluZWRcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogXHU3QUVGXHU1M0UzXHU2NjJGXHU1NDI2XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHUzMDAyXG4gKiBcdTc1Mjggbm9kZTpodHRwIFx1ODAwQ1x1OTc1RVx1NkQ0Rlx1ODlDOFx1NTY2OCBmZXRjaFx1RkYxQU9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1NzY4NCBDU1AgXHU0RjFBXHU2MkU2XHU2MjJBXG4gKiBcdTVCRjkgaHR0cDovLzEyNy4wLjAuMSBcdTc2ODQgZmV0Y2hcdUZGMENcdTVCRkNcdTgxRjRcIlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVwiXHU4QkVGXHU1MjI0XHU0RTNBXCJcdTZDQTFcdTY3MDlcIlx1MzAwMlxuICogTm9kZSBcdTc2ODQgaHR0cCBcdTZBMjFcdTU3NTdcdTRFMERcdTUzRDdcdTk4NzVcdTk3NjIgQ1NQIFx1N0VBNlx1Njc1Rlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQb3J0VXAoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDE1MDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgcmVxID0gaHR0cC5nZXQoeyBob3N0LCBwb3J0LCBwYXRoOiAnLycsIHRpbWVvdXQ6IHRpbWVvdXRNcyB9LCAocmVzKSA9PiB7XG4gICAgICByZXMucmVzdW1lKClcbiAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICB9KVxuICAgIHJlcS5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIHJlcS5kZXN0cm95KClcbiAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgfSlcbiAgICByZXEub24oJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZShmYWxzZSkpXG4gIH0pXG59XG5cbi8qKiBcdThGNkVcdThCRTJcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUFcdUZGMUJcdThEODVcdTY1RjZcdThGRDRcdTU2REUgZmFsc2UgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yUmVhZHkoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDEyMF8wMDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVhZGxpbmUgPSBEYXRlLm5vdygpICsgdGltZW91dE1zXG4gIGZvciAoOzspIHtcbiAgICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCwgMTUwMCkpIHJldHVybiB0cnVlXG4gICAgaWYgKERhdGUubm93KCkgPiBkZWFkbGluZSkgcmV0dXJuIGZhbHNlXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHIsIDUwMCkpXG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaGVkU2VydmVyIHtcbiAgcHJvYzogQ2hpbGRQcm9jZXNzXG4gIHVybDogc3RyaW5nXG4gIC8qKiB0cnVlID0gXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjBDXHU2NzJBXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCICovXG4gIGF0dGFjaGVkOiBib29sZWFuXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1RkYxQVx1NjI4QSBwZXItdmF1bHQgRFNIX0hPTUUgXHU3Njg0IGBwcm9maWxlcy9gIFx1NjZGRlx1NjM2Mlx1NEUzQVx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlxuICogYH4vLmRzaC9wcm9maWxlc2AgXHU3Njg0XHU4RjZGXHU5NEZFXHUzMDAyXHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHVGRjA4XHU3RUE2IDE5NSBcdTRFMkEgQGRlZXBzZWVrLWFpIFx1NTMwNVx1RkYwOVx1NTE2OFx1NUM0MFxuICogXHU0RTAwXHU0RUZEXHVGRjBDXHU5MDdGXHU1MTREXHU2QkNGXHU0RTJBIHZhdWx0IFx1NTQwNFx1ODFFQVx1OTRGQVx1NTFFMFx1NzY3RSBNQiBcdTc2ODQgbm9kZV9tb2R1bGVzIFx1NUU3M1x1OTc2Mlx1OTRGRVx1NjNBNVx1RkYxQnNraWxsIFx1NUI5QVx1NEU0OVxuICogXHU0RTVGXHU5NjhGXHU1MTcxXHU0RUFCIHByb2ZpbGVzL2FnZW50LXByZXNldHMgXHU0RTAwXHU1RTc2XHU1OTBEXHU3NTI4XHUzMDAyXG4gKlxuICogXHU1NDBDXHU2NUY2XHU2MjhBIGAuYWdlbnQtcHJlc2V0cy9gIFx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQiBgfi8uZHNoLy5hZ2VudC1wcmVzZXRzYFx1RkYxQWFnZW50IHByZXNldFxuICogXHU3Njg0XHU1M0QxXHU3M0IwXHU2ODM5XHU2NjJGIGBkc2hIb21lUGF0aCgnLmFnZW50LXByZXNldHMnKWBcdUZGMDhcdThEREZcdTk2OEYgRFNIX0hPTUVcdUZGMDlcdUZGMENwZXItdmF1bHRcbiAqIFx1NkEyMVx1NUYwRlx1ODJFNVx1NEUwRFx1NTQwQ1x1NkI2NVx1OEY2Rlx1OTRGRVx1RkYwQ2RzaCBcdTRGMUFcdTRFQ0UgcGVyLXZhdWx0IFx1NzZFRVx1NUY1NVx1NjI3RSBwcmVzZXQgXHUyMDE0XHUyMDE0IFx1NzUyOFx1NjIzN1x1ODFFQVx1NUI5QVx1NEU0OVx1NzY4NFxuICogYG9ic2lkaWFuYCBwcmVzZXRcdUZGMDhcdTYzMDJcdThGN0QgdmF1bHQgXHU1REU1XHU1MTc3ICsgb2JzaWRpYW4tY29udmVudGlvbnMgc2tpbGxcdUZGMDlcdTVDMzFcdTYyN0VcdTRFMERcdTUyMzBcdUZGMENcbiAqIFx1ODg2OFx1NzNCMFx1NEUzQVx1OTc2Mlx1Njc3Rlx1OTFDQ1x1NkNBMVx1NjcwOSB2YXVsdCBcdTVERTVcdTUxNzdcdTMwMDJcbiAqXG4gKiBcdTVERjJcdTVCNThcdTU3MjhcdTc2ODRcdTc3MUZcdTVCOUVcdTc2RUVcdTVGNTVcdTRGMUFcdTg4QUJcdTY2RkZcdTYzNjJcdTRFM0FcdThGNkZcdTk0RkVcdUZGMDhcdTY1RTdcdTc2RUVcdTVGNTVcdTUxNDhcdTY1MzlcdTU0MERcdTU5MDdcdTRFRkRcdTRFM0EgYDxuYW1lPi5iYWstPHRzPmBcdUZGMENcbiAqIFx1Nzg2RVx1OEJBNFx1NTE3MVx1NEVBQlx1NTNFRlx1NzUyOFx1NTQwRVx1NTNFRlx1NjI0Qlx1NTJBOFx1NTIyMFx1OTY2NFx1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlU2hhcmVkUHJvZmlsZXMoZHNoSG9tZTogc3RyaW5nLCBzaGFyZWRSb290OiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFzaGFyZWRSb290IHx8IGRzaEhvbWUgPT09IHNoYXJlZFJvb3QpIHJldHVyblxuICBjb25zdCBsaW5rRGlyID0gKG5hbWU6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBwYXRoLmpvaW4oZHNoSG9tZSwgbmFtZSlcbiAgICAgIGNvbnN0IHNoYXJlZFRhcmdldCA9IHBhdGguam9pbihzaGFyZWRSb290LCBuYW1lKVxuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNoYXJlZFRhcmdldCkpIHJldHVyblxuICAgICAgbGV0IHN0OiBmcy5TdGF0cyB8IG51bGwgPSBudWxsXG4gICAgICB0cnkge1xuICAgICAgICBzdCA9IGZzLmxzdGF0U3luYyh0YXJnZXQpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgc3QgPSBudWxsXG4gICAgICB9XG4gICAgICBpZiAoc3Q/LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgaWYgKGZzLnJlYWxwYXRoU3luYyh0YXJnZXQpID09PSBmcy5yZWFscGF0aFN5bmMoc2hhcmVkVGFyZ2V0KSkgcmV0dXJuXG4gICAgICAgIGZzLnVubGlua1N5bmModGFyZ2V0KVxuICAgICAgICBzdCA9IG51bGxcbiAgICAgIH1cbiAgICAgIGlmIChzdD8uaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICBjb25zdCBiYWsgPSBgJHt0YXJnZXR9LmJhay0ke0RhdGUubm93KCl9YFxuICAgICAgICBmcy5yZW5hbWVTeW5jKHRhcmdldCwgYmFrKVxuICAgICAgfVxuICAgICAgZnMubWtkaXJTeW5jKGRzaEhvbWUsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgICBmcy5zeW1saW5rU3luYyhzaGFyZWRUYXJnZXQsIHRhcmdldCwgJ2RpcicpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtkc2gtaG9zdF0gXHU1RUZBXHU3QUNCXHU1MTcxXHU0RUFCICR7bmFtZX0gXHU4RjZGXHU5NEZFXHU1OTMxXHU4RDI1XHVGRjA4cGVyLXZhdWx0IFx1NUMwNlx1NzUyOFx1NzJFQ1x1N0FDQlx1NzZFRVx1NUY1NVx1RkYwOWAsIGVycilcbiAgICB9XG4gIH1cbiAgbGlua0RpcigncHJvZmlsZXMnKVxuICBsaW5rRGlyKCcuYWdlbnQtcHJlc2V0cycpXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NFwiXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXCJcdUZGMUFcdTYyOEFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1N0Y2RVx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQiBgfi8uZHNoYFx1RkYwQ1xuICogXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHU2NTcwXHU2MzZFXHUzMDAyXG4gKlxuICogXHU1MzlGXHU3NDA2XHVGRjFBZHNoIFx1NzY4NCBgc2V0dGluZ3NgXHVGRjA4QGRlZXBzZWVrLWFpL2RzaC1zZXR0aW5ncy1maWxlXHVGRjA5XHU0RTBFIGBjcmVkZW50aWFsc2BcbiAqIFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtY3JlZGVudGlhbHMtbG9jYWxcdUZGMDlcdTYzRDJcdTRFRjZcdTkwRkRcdTY1MkZcdTYzMDEgYHBhdGhgIFx1ODk4Nlx1NzZENlx1RkYwQ1x1OUVEOFx1OEJBNFx1OERFRlx1NUY4NFx1NjYyRlxuICogYDxkc2hIb21lPi9zZXR0aW5ncy55YW1sYCAvIGA8ZHNoSG9tZT4vLmNyZWRlbnRpYWxzLnlhbWxgXHUzMDAyXHU1NzI4XHU1MTcxXHU0RUFCIHByb2ZpbGVcbiAqIFx1NzY4NCBgY29yZGlzLnBhdGNoLnltbGAgXHU5MUNDXHU2MjhBXHU4RkQ5XHU0RTI0XHU0RTJBXHU2M0QyXHU0RUY2XHU2MzA3XHU1NDExXHU1MTcxXHU0RUFCXHU2ODM5XHU3Njg0XHU2NTg3XHU0RUY2XHVGRjBDXHU2QTIxXHU1NzhCXHU5MDA5XHU2MkU5XHUzMDAxQVBJIFx1NUJDNlx1OTRBNVx1MzAwMVxuICogXHU0RTNCXHU5ODk4XHU3QjQ5XHU5MTREXHU0RTAwXHU2QjIxXHVGRjA4XHU1NzI4XHU0RUZCXHU2MTBGIHZhdWx0IFx1NzY4NCBEU0ggXHU5NzYyXHU2NzdGXHU2MjE2XHU3NkY0XHU2M0E1XHU2NTM5IH4vLmRzaFx1RkYwOVx1NTM3M1x1NTNFRlx1NTE2OCB2YXVsdCBcdTc1MUZcdTY1NDhcdTMwMDJcbiAqIFx1NkNFOFx1NjEwRlx1RkYxQXByb2ZpbGVzIFx1NURGMlx1OEY2Rlx1OTRGRVx1NTE3MVx1NEVBQlx1RkYwQ1x1NjI0MFx1NEVFNVx1OEZEOVx1OTFDQ1x1NTE5OVx1NTE2NVx1NzY4NFx1NkI2M1x1NjYyRlx1NTE3MVx1NEVBQiBwYXRjaCBcdTIwMTRcdTIwMTQgXHU3NTI4XHU2MjM3XHU4MUVBXHU4OEM1XHU3Njg0XG4gKiBcdTYzRDJcdTRFRjZcdTY3NjFcdTc2RUVcdUZGMDhpbnNlcnRcdUZGMDlcdTVGQzVcdTk4N0JcdTRGRERcdTc1NTlcdUZGMENcdTUzRUFcdTU0MDhcdTVFNzYvXHU2NkY0XHU2NUIwIHNldHRpbmdzL2NyZWRlbnRpYWxzIFx1NEUyNFx1NEUyQVx1Njc2MVx1NzZFRVx1MzAwMlxuICpcbiAqIHBhdGNoIFx1NjgzQ1x1NUYwRlx1RkYwOGNvcmRpcyBsb2FkZXIgXHU3Njg0IGFwcGx5RW50cnlQYXRjaGVzXHVGRjA5XHVGRjFBXHU1MjE3XHU4ODY4XHU5MUNDXHU2QkNGXHU0RTJBXHU1MTQzXHU3RDIwXHU3NkY0XHU2M0E1XHU2NjJGXG4gKiBgeyBpZCwgaW5zZXJ0PywgbmFtZT8sIC4uLm92ZXJyaWRlcyB9YFx1RkYwQ292ZXJyaWRlcyBcdTk1MkVcdTg5ODZcdTc2RDZcdTU0MENcdTU0MEQgdGFyZ2V0IFx1Njc2MVx1NzZFRVx1RkYwQ1xuICogXHU2Q0ExXHU2NzA5IGB1cGRhdGU6YCBcdTUzMDVcdTg4QzVcdTVDNDJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYXJlZENvbmZpZ1BhdGNoKGRzaEhvbWU6IHN0cmluZywgc2hhcmVkUm9vdDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghc2hhcmVkUm9vdCB8fCBkc2hIb21lID09PSBzaGFyZWRSb290KSByZXR1cm5cbiAgdHJ5IHtcbiAgICBjb25zdCBzaGFyZWRQcm9maWxlcyA9IHBhdGguam9pbihzaGFyZWRSb290LCAncHJvZmlsZXMnKVxuICAgIGNvbnN0IHBhdGNoRmlsZSA9IHBhdGguam9pbihzaGFyZWRQcm9maWxlcywgJ3dlYicsICdjb3JkaXMucGF0Y2gueW1sJylcbiAgICBjb25zdCBzZXR0aW5nc1BhdGggPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJ3NldHRpbmdzLnlhbWwnKVxuICAgIGNvbnN0IGNyZWRlbnRpYWxzUGF0aCA9IHBhdGguam9pbihzaGFyZWRSb290LCAnLmNyZWRlbnRpYWxzLnlhbWwnKVxuXG4gICAgY29uc3QgYmxvY2tTZXR0aW5ncyA9IGAtIGlkOiBzZXR0aW5nc1xuICBjb25maWc6XG4gICAgcGF0aDogJHtzZXR0aW5nc1BhdGh9XG5gXG4gICAgY29uc3QgYmxvY2tDcmVkZW50aWFscyA9IGAtIGlkOiBjcmVkZW50aWFsc1xuICBjb25maWc6XG4gICAgcGF0aDogJHtjcmVkZW50aWFsc1BhdGh9XG5gXG5cbiAgICBsZXQgY29udGVudCA9ICcnXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0Y2hGaWxlKSkge1xuICAgICAgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhwYXRjaEZpbGUsICd1dGY4JylcbiAgICB9XG4gICAgY29uc3Qgc3RyaXAgPSAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xccysvZywgJycpXG4gICAgY29uc3QgaGFzU2V0dGluZ3MgPSBzdHJpcChjb250ZW50KS5pbmNsdWRlcyhzdHJpcChibG9ja1NldHRpbmdzKSlcbiAgICBjb25zdCBoYXNDcmVkZW50aWFscyA9IHN0cmlwKGNvbnRlbnQpLmluY2x1ZGVzKHN0cmlwKGJsb2NrQ3JlZGVudGlhbHMpKVxuICAgIGlmIChoYXNTZXR0aW5ncyAmJiBoYXNDcmVkZW50aWFscykgcmV0dXJuXG5cbiAgICAvLyBcdTUzRUFcdTU3MjhcdTUxNzFcdTRFQUIgcGF0Y2ggXHU0RTNBXHU3QTdBXHU2NTcwXHU3RUM0IGBbXWBcdUZGMDhcdTUxNDFcdThCQjhcdTZDRThcdTkxQ0FcdUZGMENcdTYyMTZcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdUZGMDlcdTY1RjZcdTUxOTlcdTUxNjVcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcbiAgICAvLyBcdTY3NjFcdTc2RUVcdUZGMUJcdTgyRTVcdTc1MjhcdTYyMzdcdTVERjJcdTgxRUFcdTVCOUFcdTRFNDkgcGF0Y2hcdUZGMDhcdTU5ODJcdTgxRUFcdTg4QzVcdTYzRDJcdTRFRjZcdUZGMDlcdUZGMENcdTRFMERcdTVGM0FcdTg4NENcdTY1MzlcdTUxOTkgXHUyMDE0XHUyMDE0IFx1NjNEMFx1NzkzQVx1NjI0Qlx1NTJBOFx1NTJBMFx1MzAwMlxuICAgIGNvbnN0IHdpdGhvdXRDb21tZW50cyA9IGNvbnRlbnRcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5maWx0ZXIoKGwpID0+ICFsLnRyaW0oKS5zdGFydHNXaXRoKCcjJykpXG4gICAgICAuam9pbignXFxuJylcbiAgICAgIC50cmltKClcbiAgICBpZiAod2l0aG91dENvbW1lbnRzID09PSAnJyB8fCB3aXRob3V0Q29tbWVudHMgPT09ICdbXScpIHtcbiAgICAgICAgY29uc3QgaW5zZXJ0aW9uID0gYmxvY2tTZXR0aW5ncyArIGJsb2NrQ3JlZGVudGlhbHNcbiAgICAgICAgY29udGVudCA9IGAjIGRzaC1kb2NrIFx1ODFFQVx1NTJBOFx1N0VGNFx1NjJBNFx1RkYxQXBlci12YXVsdCBcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMENcdTRGMUFcdThCRERcdTRFQ0RcdTk2OTRcdTc5QkJcdUZGMDlcbiR7aW5zZXJ0aW9uLnRyaW1FbmQoKX1cbmBcbiAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShwYXRjaEZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGNoRmlsZSwgY29udGVudClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnW2RzaC1ob3N0XSBcdTUxNzFcdTRFQUIgY29yZGlzLnBhdGNoLnltbCBcdTVERjJcdTY3MDlcdTgxRUFcdTVCOUFcdTRFNDlcdTUxODVcdTVCQjlcdUZGMENcdThERjNcdThGQzdcdTgxRUFcdTUyQThcdTUxOTlcdTUxNjVcdUZGMUInICtcbiAgICAgICAgICAnXHU1OTgyXHU5NzAwXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjBDXHU4QkY3XHU1NzI4IH4vLmRzaC9wcm9maWxlcy93ZWIvY29yZGlzLnBhdGNoLnltbCBcdTYyNEJcdTUyQThcdTUyQTBcdTUxNjUgc2V0dGluZ3MvY3JlZGVudGlhbHMgXHU3Njg0IHBhdGggXHU4OTg2XHU3NkQ2JyxcbiAgICAgICAgKVxuICAgICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtaG9zdF0gXHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCIHBhdGNoIFx1NTkzMVx1OEQyNVx1RkYwOFx1NUMwNlx1NjMwOSBwZXItdmF1bHQgXHU3MkVDXHU3QUNCXHU5MTREXHU3RjZFXHU1NDJGXHU1MkE4XHVGRjA5JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgZHNoIHdlYlx1MzAwMlx1OEMwM1x1NzUyOFx1NjVCOVx1OEQxRlx1OEQyM1x1NzZEMVx1NTQyQyBwcm9jIFx1NzY4NCBleGl0L2Vycm9yXHUzMDAyICovXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoRHNoKG9wdHM6IExhdW5jaE9wdGlvbnMgJiB7IGRzaEJpbjogc3RyaW5nOyBub2RlQmluOiBzdHJpbmc7IHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuIH0pOiBDaGlsZFByb2Nlc3Mge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCBhcmdzID0gW29wdHMuZHNoQmluLCAnd2ViJywgJy0taG9zdCcsIGhvc3QsICctLXBvcnQnLCBTdHJpbmcocG9ydCldXG4gIGNvbnN0IGVudjogTm9kZUpTLlByb2Nlc3NFbnYgPSB7XG4gICAgLi4uKG9wdHMuZW52ID8/IHByb2Nlc3MuZW52ID8/IHt9KSxcbiAgICBEU0hfSE9NRTogb3B0cy5kc2hIb21lLFxuICB9XG4gIGlmIChvcHRzLnVzZUVsZWN0cm9uQXNOb2RlKSBlbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSdcbiAgcmV0dXJuIHNwYXduKG9wdHMubm9kZUJpbiwgYXJncywge1xuICAgIGVudixcbiAgICBjd2Q6IG9wdHMuY3dkLFxuICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbn1cblxuLyoqXG4gKiBcdTRFMDBcdTk1MkVcIlx1Nzg2RVx1NEZERFx1OEZEMFx1ODg0Q1wiXHVGRjFBXG4gKiAxLiBcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NzZGNFx1NjNBNVx1NjMwMlx1NjNBNVx1RkYwOGF0dGFjaGVkXHVGRjBDXHU0RTBEXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCXHVGRjA5XHVGRjFCXG4gKiAyLiBcdTU0MjZcdTUyMTlcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdTIxOTIgc3Bhd24gXHUyMTkyIFx1N0I0OVx1NUY4NVx1NUMzMVx1N0VFQVx1RkYxQlxuICogMy4gXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHVGRjA4XHU1OTgyXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwIEVBRERSSU5VU0VcdUZGMDlcdTIxOTIgXHU3QUNCXHU1MzczXHU4RkQ0XHU1NkRFXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXHVGRjBDXHU0RTBEXHU1MThEXHU3NkYyXHU3QjQ5XHUzMDAyXG4gKiBcdThGRDRcdTU2REUgU2VydmVyU3RhdHVzXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEc2hSdW5uaW5nKG9wdHM6IExhdW5jaE9wdGlvbnMpOiBQcm9taXNlPHsgc3RhdHVzOiBTZXJ2ZXJTdGF0dXM7IHByb2M/OiBDaGlsZFByb2Nlc3MgfT4ge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCB1cmwgPSBgaHR0cDovLyR7aG9zdH06JHtwb3J0fS9gXG5cbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9IH1cbiAgfVxuXG4gIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbihvcHRzLmRzaEJpbilcbiAgaWYgKCFmb3VuZC5iaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogZm91bmQubm90ZXNbZm91bmQubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBkc2ggQ0xJJyB9IH1cbiAgfVxuICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4ob3B0cy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIG9wdHMudXNlRW1iZWRkZWROb2RlKVxuICBpZiAoIW5vZGUubm9kZUJpbikge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBub2RlLm5vdGVzW25vZGUubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNicgfSB9XG4gIH1cbiAgLy8gcGVyLXZhdWx0IFx1NTE3MVx1NEVBQlx1RkYxQXByb2ZpbGVzXHVGRjA4XHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHVGRjA5XHU4RjZGXHU5NEZFXHU1MjMwXHU1MTcxXHU0RUFCXHU2ODM5XHVGRjBDc2V0dGluZ3MvY3JlZGVudGlhbHNcbiAgLy8gXHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCXHU2ODM5IFx1MjAxNFx1MjAxNCBcdTkxNERcdTdGNkVcdTRFMEVcdTYzRDJcdTRFRjZcdTUxNjhcdTVDNDBcdTRFMDBcdTRFRkRcdUZGMENcdTRFQzVcdTRGMUFcdThCRERcdTk2OTRcdTc5QkJcdTMwMDJcbiAgaWYgKG9wdHMuc2hhcmVkQ29uZmlnUm9vdCkge1xuICAgIGVuc3VyZVNoYXJlZFByb2ZpbGVzKG9wdHMuZHNoSG9tZSwgb3B0cy5zaGFyZWRDb25maWdSb290KVxuICAgIGVuc3VyZVNoYXJlZENvbmZpZ1BhdGNoKG9wdHMuZHNoSG9tZSwgb3B0cy5zaGFyZWRDb25maWdSb290KVxuICB9XG4gIGNvbnN0IHByb2MgPSBsYXVuY2hEc2goeyAuLi5vcHRzLCBkc2hCaW46IGZvdW5kLmJpbiwgbm9kZUJpbjogbm9kZS5ub2RlQmluLCB1c2VFbGVjdHJvbkFzTm9kZTogbm9kZS51c2VFbGVjdHJvbkFzTm9kZSB9KVxuXG4gIC8vIFx1NjUzNlx1OTZDNiBzdGRlcnIgXHU1QzNFXHU5MEU4XHVGRjFBXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHU2NUY2XHU3RUQ5XHU1MUZBXHU3NzFGXHU1QjlFXHU1MzlGXHU1NkUwXHVGRjA4XHU1OTgyIEVBRERSSU5VU0VcdUZGMDlcbiAgbGV0IHN0ZGVyclRhaWwgPSAnJ1xuICBwcm9jLnN0ZGVycj8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiB7XG4gICAgc3RkZXJyVGFpbCA9IChzdGRlcnJUYWlsICsgZC50b1N0cmluZygpKS5zbGljZSgtNDAwMClcbiAgfSlcblxuICBjb25zdCBjaGlsZERpZWQgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gIH0pXG5cbiAgY29uc3QgcmVhZHkgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgIHdhaXRGb3JSZWFkeShob3N0LCBwb3J0LCBvcHRzLnRpbWVvdXRNcyA/PyAxMjBfMDAwKS50aGVuKCgpID0+IHRydWUpLFxuICAgIGNoaWxkRGllZC50aGVuKCgpID0+IGZhbHNlKSxcbiAgXSlcblxuICBpZiAocmVhZHkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiBmYWxzZSB9LCBwcm9jIH1cbiAgfVxuXG4gIC8vIFx1NUI1MFx1OEZEQlx1N0EwQlx1NURGMlx1OTAwMFx1NTFGQVx1RkYxQVx1NTE4RFx1NjNBMlx1NEUwMFx1NkIyMVx1N0FFRlx1NTNFM1x1RkYwOFx1NTNFRlx1ODBGRFx1ODhBQlx1NTIyQlx1NzY4NFx1NUI5RVx1NEY4Qlx1NjJBMlx1OEREMVx1N0VEMVx1NUI5QVx1RkYwOVx1RkYwQ1x1NTQyNlx1NTIxOVx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlxuICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiB0cnVlIH0sIHByb2MgfVxuICB9XG4gIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWwpIH0sIHByb2MgfVxufVxuXG4vKiogXHU0RUNFIHN0ZGVyciBcdTVDM0VcdTkwRThcdTYzRDBcdTcwQkNcdTUzRUZcdThCRkJcdTk1MTlcdThCRUYgKi9cbmZ1bmN0aW9uIHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBzdGRlcnJUYWlsLnNwbGl0KC9cXHI/XFxuLykuZmlsdGVyKEJvb2xlYW4pXG4gIGNvbnN0IGFkZHJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRUFERFJJTlVTRScpKVxuICBjb25zdCBlcnJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRXJyb3I6JykpXG4gIGlmIChhZGRyTGluZSkge1xuICAgIHJldHVybiAnXHU3QUVGXHU1M0UzXHU1REYyXHU4OEFCXHU1MzYwXHU3NTI4XHVGRjA4RUFERFJJTlVTRVx1RkYwOVx1MzAwMlx1OEJGN1x1NjM2Mlx1NEUwMFx1NEUyQVx1N0FFRlx1NTNFM1x1RkYwQ1x1NjIxNlx1NTE0OFx1NTA1Q1x1NjM4OVx1NTM2MFx1NzUyOFx1OEJFNVx1N0FFRlx1NTNFM1x1NzY4NFx1NjcwRFx1NTJBMVx1NTQwRVx1OTFDRFx1OEJENSdcbiAgfVxuICBpZiAoZXJyTGluZSkge1xuICAgIGNvbnN0IGNsZWFuZWQgPSBlcnJMaW5lLnRyaW0oKS5zbGljZSgwLCAzMDApXG4gICAgcmV0dXJuIGBkc2ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke2NsZWFuZWR9YFxuICB9XG4gIHJldHVybiAnRFNIIFx1OEZEQlx1N0EwQlx1OTAwMFx1NTFGQVx1RkYwOFx1NjVFMFx1OEJFNlx1N0VDNlx1OTUxOVx1OEJFRlx1RkYwOVx1MzAwMlx1OEJGN1x1NjdFNVx1NzcwQiBPYnNpZGlhbiBcdTYzQTdcdTUyMzZcdTUzRjAgW2RzaF0gXHU2NUU1XHU1RkQ3J1xufVxuXG4vKiogXHU1MDVDXHU2QjYyXHU1QjUwXHU4RkRCXHU3QTBCXHVGRjA4U0lHVEVSTVx1RkYwQ1x1N0I0OVx1NUY4NVx1OTAwMFx1NTFGQVx1RkYxQlx1OEQ4NVx1NjVGNlx1NTQwRSBTSUdLSUxMXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcFByb2Nlc3MocHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCB8IHVuZGVmaW5lZCwgdGltZW91dE1zID0gNTAwMCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXByb2MgfHwgcHJvYy5leGl0Q29kZSAhPT0gbnVsbCB8fCBwcm9jLnNpZ25hbENvZGUgIT09IG51bGwpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Mua2lsbCgnU0lHS0lMTCcpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfSwgdGltZW91dE1zKVxuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9KVxuICAgIHRyeSB7XG4gICAgICBwcm9jLmtpbGwoJ1NJR1RFUk0nKVxuICAgIH0gY2F0Y2gge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIFx1OEJCRVx1N0Y2RVx1RkYxQVx1NUI1N1x1NkJCNSArIFx1OEJCRVx1N0Y2RVx1OTg3NSBVSVx1MzAwMlxuICogVjAuMlx1RkYxQURTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1RkYwOFx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkIgLyBcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgLyBcdTgxRUFcdTVCOUFcdTRFNDlcdUZGMDlcdUZGMENcdTlFRDhcdThCQTQgcGVyLXZhdWx0XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IHR5cGUgRHNoSG9tZU1vZGUgPSAnc2hhcmVkJyB8ICdwZXItdmF1bHQnIHwgJ2N1c3RvbSdcblxuZXhwb3J0IGludGVyZmFjZSBEc2hEb2NrU2V0dGluZ3Mge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluOiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU0RjE4XHU1MTQ4XHVGRjA5ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTRcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdDogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0OiBudW1iZXJcbiAgLyoqIERTSF9IT01FIFx1NkEyMVx1NUYwRlx1RkYxQXBlci12YXVsdD1cdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFCc2hhcmVkPVx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMUJjdXN0b209XHU4MUVBXHU1QjlBXHU0RTQ5ICovXG4gIGRzaEhvbWVNb2RlOiBEc2hIb21lTW9kZVxuICAvKiogXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NFx1RkYwOFx1NEVDNSBjdXN0b20gXHU2QTIxXHU1RjBGXHU3NTFGXHU2NTQ4XHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKiogXHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU6IGJvb2xlYW5cbiAgLyoqIE9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NjVGNlx1ODFFQVx1NTJBOFx1NjJDOVx1OEQ3NyBEU0ggKi9cbiAgYXV0b3N0YXJ0OiBib29sZWFuXG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEc2hEb2NrU2V0dGluZ3MgPSB7XG4gIGRzaEJpbjogJycsXG4gIG5vZGVCaW46ICcnLFxuICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgcG9ydDogMzA4MCxcbiAgZHNoSG9tZU1vZGU6ICdwZXItdmF1bHQnLFxuICBkc2hIb21lOiAnJyxcbiAgdXNlRW1iZWRkZWROb2RlOiBmYWxzZSxcbiAgYXV0b3N0YXJ0OiB0cnVlLFxufVxuXG5leHBvcnQgY2xhc3MgRHNoRG9ja1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgY3VzdG9tSG9tZUVsPzogU2V0dGluZ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbilcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpc1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2OTgyXHU4OUM4IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXNldHRpbmdzLWRlc2MnLFxuICAgICAgdGV4dDogJ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFdlYiBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW5cdUZGMUFcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NEMgXHUyMTkyIFx1OTc2Mlx1Njc3Rlx1NUQ0Q1x1NTE2NVx1MzAwMlx1NUI5OFx1NjVCOVx1NTM5Rlx1NzUxRlx1RkYwQ1x1NUI5OFx1NjVCOSBVSSBcdTUzOUZcdTY4MzdcdTVENENcdTUxNjVcdTMwMDInLFxuICAgIH0pXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zZXR0aW5ncy1kZXNjJyxcbiAgICAgIHRleHQ6ICdcdUQ4M0VcdUREMUQgXHU0RTBFIGRzaC10b29sLW9ic2lkaWFuLXZhdWx0IFx1NzNFMFx1ODA1NFx1NzRBN1x1NTQwOFx1RkYxQVx1OTE0RFx1NTQwOCBEU0ggXHU0RkE3XHU3Njg0IDE2IFx1NEUyQSB2YXVsdF8qIFx1NURFNVx1NTE3N1x1RkYwQ1x1NUYwMFx1N0JCMVx1NTM3M1x1NzUyOFx1MzAwQ09ic2lkaWFuIFx1NTE4NSBBZ2VudCBcdTdCMTRcdThCQjBcdTVERTVcdTRGNUNcdTZENDFcdTMwMERcdTIwMTRcdTIwMTRcdTk3NjJcdTY3N0ZcdTkxQ0NcdTc2RjRcdTYzQTVcdThCRjRcIlx1OEJGQlx1NEUwMFx1NEUwQlx1NEVDQVx1NTkyOVx1NzY4NFx1N0IxNFx1OEJCMFwiXHVGRjBDQWdlbnQgXHU4MUVBXHU1MkE4XHU1QjlBXHU0RjREXHU1RjUzXHU1MjREXHU1RTkzXHU4QkZCXHU1MTk5XHUzMDAyJyxcbiAgICB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY3MERcdTUyQTFcdTYzQTdcdTUyMzYgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdcdTY3MERcdTUyQTEnKS5zZXRIZWFkaW5nKClcbiAgICBjb25zdCBzdGF0dXNMaW5lID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NzBEXHU1MkExXHU3MkI2XHU2MDAxJylcbiAgICAgIC5zZXREZXNjKHRoaXMuZGVzY3JpYmVTdGF0dXMoKSlcbiAgICBjb25zdCBidG5zID0gc3RhdHVzTGluZS5jb250cm9sRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYnRucycgfSlcbiAgICBjb25zdCBzdGFydEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnbW9kLWN0YScsIHRleHQ6ICdcdTI1QjYgXHU1NDJGXHU1MkE4JyB9KVxuICAgIHN0YXJ0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgc3RvcEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVBMCBcdTUwNUNcdTZCNjInIH0pXG4gICAgc3RvcEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdG9wKCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgb3BlbkJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicgfSlcbiAgICBvcGVuQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5QYW5lbCgpXG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5NjhGIE9ic2lkaWFuIFx1ODFFQVx1NTJBOFx1NTQyRlx1NTJBOCcpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1OEZEMFx1ODg0Q1x1NjVGNiAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1OEZEMFx1ODg0Q1x1NjVGNicpLnNldEhlYWRpbmcoKVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ2RzaCBDTEkgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEJcdUZGMDhEU0hfQklOIFx1MjE5MiBucG0gcm9vdCAtZyBcdTIxOTIgXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXHU1M0VGXHU1ODZCIGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTYyMTYgYmluLmpzIFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcy9AZGVlcHNlZWstYWkvZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmRldGVjdExpbmUgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNicpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9iaW4vbm9kZScpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZScpXG4gICAgICAuc2V0RGVzYygnRUxFQ1RST05fUlVOX0FTX05PREVcdTMwMDJcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdTIwMTRcdTIwMTRcdTVCOUVcdTZENEIgT2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XHU0RUU1IE5vZGUgXHU2QTIxXHU1RjBGXHU4RkQwXHU4ODRDXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjBDXHU0RUM1XHU1NzI4XHU5QThDXHU4QkMxXHU1M0VGXHU3NTI4XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyJylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU3RjUxXHU3RURDIC0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnXHU3RjUxXHU3RURDJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1N0ZBXHU1MUM2XHVGRjA5JylcbiAgICAgIC5zZXREZXNjKCdcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1MzAwMnNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXHU3NkY0XHU2M0E1XHU0RjdGXHU3NTI4XHVGRjFCcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NTcyOFx1NkI2NFx1NTdGQVx1Nzg0MFx1NEUwQVx1NjMwOSB2YXVsdCBcdTZEM0VcdTc1MUZcdTcyRUNcdTdBQ0JcdTdBRUZcdTUzRTNcdUZGMDhcdTZCQ0YgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RjFBXHU4QkREXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCczMDgwJylcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQpKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbiA9IE51bWJlcih2LnRyaW0oKSlcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQgPSBOdW1iZXIuaXNJbnRlZ2VyKG4pICYmIG4gPj0gMCAmJiBuIDw9IDY1NTM1ID8gbiA6IDMwODBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLm5ldFByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NSAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVx1RkYwOERTSF9IT01FXHVGRjA5XHU0RTBFXHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2QTIxXHU1RjBGJylcbiAgICAgIC5zZXREZXNjKCdwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gXHU0RjFBXHU4QkREXHU2MzA5XHU1RTkzXHU5Njk0XHU3OUJCXHVGRjA4XHU1NDA0XHU1RTkzXHU5NzYyXHU2NzdGXHU1M0VBXHU2NjNFXHU3OTNBXHU2NzJDXHU1RTkzXHU1MjFCXHU1RUZBXHU3Njg0XHU0RjFBXHU4QkREXHVGRjA5XHVGRjBDXHU0RjQ2XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTRFMEVcdThGRDBcdTg4NENcdTY1RjZcdTYzRDJcdTRFRjZcdTUxNjhcdTVDNDBcdTUxNzFcdTRFQUJcdTRFMDBcdTRFRkRcdUZGMENcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjhcdTVFOTNcdTc1MUZcdTY1NDhcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICBkZC5hZGRPcHRpb24oJ3Blci12YXVsdCcsICdcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREIH4vLmRzaC92YXVsdHMvPFx1NTQwRD4tPGhhc2g+XHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjFCXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU0RUNEXHU1MTcxXHU0RUFCXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdzaGFyZWQnLCAnXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTRFMDBcdTU5NTdcdTkxNERcdTdGNkVcdTMwMDFcdTYzRDJcdTRFRjZcdTRFMEVcdTRGMUFcdThCRERcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2N1c3RvbScsICdcdTgxRUFcdTVCOUFcdTRFNDlcdThERUZcdTVGODQnKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSlcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSA9IHYgYXMgRHNoSG9tZU1vZGVcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuY3VzdG9tSG9tZUVsPy5zZXREaXNhYmxlZCh2ICE9PSAnY3VzdG9tJylcbiAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIHRoaXMuY3VzdG9tSG9tZUVsID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NCcpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9Vc2Vycy95b3UvLmRzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuY3VzdG9tSG9tZUVsLnNldERpc2FibGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlICE9PSAnY3VzdG9tJylcblxuICAgIHRoaXMuaG9tZVByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RMaW5lITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBob21lUHJldmlldyE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgbmV0UHJldmlldyE6IEhUTUxFbGVtZW50XG5cbiAgcHJpdmF0ZSBkZXNjcmliZVN0YXR1cygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgcmV0dXJuIGAke3MudXJsfVx1RkYwOCR7cy5hdHRhY2hlZCA/ICdcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJ1x1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0Q1x1NEUyRCd9XHVGRjA5YFxuICAgIH1cbiAgICBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSByZXR1cm4gJ1x1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNlx1RkYwOFx1OTk5Nlx1NkIyMVx1N0VBNiAxMCBcdTc5RDJcdUZGMENcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOSdcbiAgICBpZiAocy5raW5kID09PSAnZXJyb3InKSByZXR1cm4gYFx1NTkzMVx1OEQyNTogJHtzLm1lc3NhZ2V9YFxuICAgIHJldHVybiAnXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURldGVjdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnBsdWdpbi5kZXRlY3RJbmZvKClcbiAgICByZXR1cm4gW1xuICAgICAgYGRzaDogJHtpbmZvLmRzaEJpbiA/PyAnXHU2NzJBXHU2MjdFXHU1MjMwJ30ke2luZm8uZHNoTm90ZXMubGVuZ3RoID8gYFx1RkYwOCR7aW5mby5kc2hOb3Rlcy5qb2luKCdcdUZGMUInKX1cdUZGMDlgIDogJyd9YCxcbiAgICAgIGBub2RlOiAke2luZm8ubm9kZU5vdGVzLmpvaW4oJ1x1RkYxQicpfWAsXG4gICAgXS5qb2luKCdcXG4nKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICBjb25zdCBob21lID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlRHNoSG9tZSgpXG4gICAgY29uc3Qgc2hhcmVkID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlU2hhcmVkQ29uZmlnUm9vdCgpXG4gICAgaWYgKHNoYXJlZCkge1xuICAgICAgcmV0dXJuIGBcdTRGMUFcdThCRERcdTc2RUVcdTVGNTU6ICR7aG9tZX1cXG5cdTkxNERcdTdGNkVcdTUxNzFcdTRFQUI6ICR7c2hhcmVkfVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4XHU1RTkzXHU3NTFGXHU2NTQ4XHVGRjA5YFxuICAgIH1cbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1OERFRlx1NUY4NDogJHtob21lfWBcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVOZXQoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlUG9ydCgpXG4gICAgY29uc3QgbW9kZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlXG4gICAgY29uc3Qgc3VmZml4ID0gbW9kZSA9PT0gJ3Blci12YXVsdCcgPyAnXHVGRjA4XHU2NzJDIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEUwRVx1NTE3Nlx1NEVENiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMDknIDogJ1x1RkYwOHNoYXJlZC9jdXN0b21cdUZGMUFcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHVGRjA5J1xuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU3QUVGXHU1M0UzOiAke3BvcnR9JHtzdWZmaXh9YFxuICB9XG59XG4iLCAiLyoqXG4gKiBEc2hXZWJWaWV3IFx1MjAxNFx1MjAxNCBcdTYyOEFcdTVCOThcdTY1QjkgRFNIIFdlYiAoMTI3LjAuMC4xOjxwb3J0PikgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuIFx1OTc2Mlx1Njc3Rlx1MzAwMlxuICogXHU1RTI2XHU1QjhDXHU2NTc0XHU4RkM3XHU3QTBCXHU3MkI2XHU2MDAxXHVGRjFBXHU1MkEwXHU4RjdEXHU1MkE4XHU3NTNCIC8gXHU5NTE5XHU4QkVGXHU1MzYxXHU3MjQ3XHVGRjA4XHU1NDJCXHU5MUNEXHU4QkQ1XHVGRjA5LyBcdTY3MkFcdTU0MkZcdTUyQThcdTdBN0FcdTcyQjZcdTYwMDEgLyBcdTU2RkVcdTY4MDdcdTVERTVcdTUxNzdcdTY4MEZcdTMwMDJcbiAqIGlmcmFtZSBcdTYzMDdcdTU0MTFcdTVCOThcdTY1QjlcdTY3MERcdTUyQTFcdUZGMENVSSBcdTUzRUFcdTY2MkZcIlx1ODIzOVx1NTc1RVwiXHU1OTE2XHU1OEYzXHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24gfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgY29uc3QgRFNIX1dFQl9WSUVXX1RZUEUgPSAnZHNoLWRvY2std2ViJ1xuXG50eXBlIFVpU3RhdGUgPSAncnVubmluZycgfCAnc3RhcnRpbmcnIHwgJ2Vycm9yJyB8ICdzdG9wcGVkJ1xuXG5leHBvcnQgY2xhc3MgRHNoV2ViVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBpZnJhbWVFbDogSFRNTElGcmFtZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHBpbGxFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIG92ZXJsYXlFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHRvZ2dsZUJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIGN1cnJlbnQ6IFVpU3RhdGUgPSAnc3RvcHBlZCdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihsZWFmKVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gRFNIX1dFQl9WSUVXX1RZUEVcbiAgfVxuXG4gIG92ZXJyaWRlIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdEU0ggRG9jaydcbiAgfVxuXG4gIG92ZXJyaWRlIGdldEljb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ2FuY2hvcidcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2snIH0pXG5cbiAgICAvLyAtLS0tIFx1NTkzNFx1OTBFOFx1NURFNVx1NTE3N1x1NjgwRiAtLS0tXG4gICAgY29uc3QgaGVhZGVyID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1oZWFkZXInIH0pXG4gICAgY29uc3QgbG9nbyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1sb2dvJyB9KVxuICAgIHNldEljb24obG9nbywgJ2FuY2hvcicpXG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay10aXRsZScsIHRleHQ6ICdEU0ggRG9jaycgfSlcbiAgICB0aGlzLnBpbGxFbCA9IGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stcGlsbCcgfSlcbiAgICBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3BhY2VyJyB9KVxuXG4gICAgdGhpcy50b2dnbGVCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHRoaXMudG9nZ2xlQnRuLm9uY2xpY2sgPSAoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKVxuXG4gICAgY29uc3QgcmVmcmVzaEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihyZWZyZXNoQnRuLCAncmVmcmVzaC1jdycpXG4gICAgcmVmcmVzaEJ0bi50aXRsZSA9ICdcdTUyMzdcdTY1QjAnXG4gICAgcmVmcmVzaEJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5yZWxvYWQoKVxuXG4gICAgY29uc3QgcG9wb3V0QnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHBvcG91dEJ0biwgJ21heGltaXplLTInKVxuICAgIHBvcG91dEJ0bi50aXRsZSA9ICdcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhcdTcyRUNcdTdBQ0JcdThGREJcdTdBMEJcdUZGMENcdTYwMjdcdTgwRkRcdTdCNDlcdTU0MENcdTZENEZcdTg5QzhcdTU2NjhcdUZGMDknXG4gICAgcG9wb3V0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5Qb3BvdXQoKVxuICAgIH1cblxuICAgIGNvbnN0IGJyb3dzZXJCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24oYnJvd3NlckJ0biwgJ2V4dGVybmFsLWxpbmsnKVxuICAgIGJyb3dzZXJCdG4udGl0bGUgPSAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJ1xuICAgIGJyb3dzZXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlbkluQnJvd3NlcigpXG4gICAgfVxuXG4gICAgLy8gLS0tLSBcdTRFM0JcdTRGNTNcdUZGMUFpZnJhbWUgKyBcdTcyQjZcdTYwMDFcdTg5ODZcdTc2RDZcdTVDNDIgLS0tLVxuICAgIGNvbnN0IGJvZHkgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJvZHknIH0pXG4gICAgdGhpcy5pZnJhbWVFbCA9IGJvZHkuY3JlYXRlRWwoJ2lmcmFtZScsIHsgY2xzOiAnZHNoLWRvY2stZnJhbWUnIH0pXG4gICAgdGhpcy5vdmVybGF5RWwgPSBib2R5LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLW92ZXJsYXknIH0pXG5cbiAgICAvLyBcdTcyQjZcdTYwMDFcdTgwNTRcdTUyQThcbiAgICB0aGlzLnBsdWdpbi5vblN0YXR1c0NoYW5nZSgoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB0aGlzLnJlZnJlc2goKVxuXG4gICAgLy8gXHU1MTVDXHU1RTk1XHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGXHU2NUY2XHU4MkU1XHU2NzBEXHU1MkExXHU2NzJBXHU1NDJGXHU1MkE4XHU0RTE0XHU3QUVGXHU1M0UzXHU1M0VGXHU3NTI4XHVGRjBDXHU1QzFEXHU4QkQ1XHU2MkM5XHU4RDc3XG4gICAgdm9pZCB0aGlzLmVuc3VyZVN0YXJ0ZWQoKVxuXG4gICAgLy8gXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGXHU2NUY2XHU1MjM3XHU2NUIwXHU0RTAwXHU2QjIxXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgwN1x1OEJCMFx1RkYxQVx1NzUyOFx1NjIzN1x1NkI2NFx1NTIzQlx1NkI2M1x1NjI1M1x1NUYwMCBEU0ggXHU5NzYyXHU2NzdGXHU3Njg0XHU3QTk3XHU1M0UzXG4gICAgLy8gXHU1QzMxXHU2NjJGXCJcdTVGNTNcdTUyNEQgdmF1bHRcIlx1RkYwQ1x1NjVFMFx1OTcwMFx1N0I0OSBmb2N1cy9hY3RpdmUtbGVhZi1jaGFuZ2UgXHU0RThCXHU0RUY2XHUzMDAyXG4gICAgdGhpcy5wbHVnaW4ucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gIH1cblxuICBvdmVycmlkZSBvbkNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBvblRvZ2dsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdG9wKClcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgIH1cbiAgICB0aGlzLnJlZnJlc2goKVxuICB9XG5cbiAgLyoqIFx1OTc2Mlx1Njc3Rlx1NjI1M1x1NUYwMFx1NjVGNlx1Nzg2RVx1NEZERFx1NjcwRFx1NTJBMVx1NTcyOFx1OEREMVx1RkYwOFx1NURGMlx1NTcyOFx1OEREMVx1NTIxOVx1NjMwMlx1NjNBNVx1RkYwOSAqL1xuICBwcml2YXRlIGFzeW5jIGVuc3VyZVN0YXJ0ZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3N0b3BwZWQnIHx8IHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgICAgdGhpcy5yZWZyZXNoKClcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlZnJlc2goKTogdm9pZCB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgbGV0IHVpOiBVaVN0YXRlXG4gICAgbGV0IHBpbGxUZXh0ID0gJydcbiAgICBsZXQgcGlsbENscyA9ICcnXG5cbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHVpID0gJ3J1bm5pbmcnXG4gICAgICBwaWxsVGV4dCA9IGBcdTI1Q0YgJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJyBcdTAwQjcgXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICcnfWBcbiAgICAgIHBpbGxDbHMgPSAnaXMtcnVubmluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdWkgPSAnc3RhcnRpbmcnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0MgXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2J1xuICAgICAgcGlsbENscyA9ICdpcy1zdGFydGluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdWkgPSAnZXJyb3InXG4gICAgICBwaWxsVGV4dCA9ICdcdTI3MTUgXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1J1xuICAgICAgcGlsbENscyA9ICdpcy1lcnJvcidcbiAgICB9IGVsc2Uge1xuICAgICAgdWkgPSAnc3RvcHBlZCdcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjVDQiBcdTY3MkFcdThGRDBcdTg4NEMnXG4gICAgICBwaWxsQ2xzID0gJ2lzLXN0b3BwZWQnXG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdWlcbiAgICBpZiAodGhpcy5waWxsRWwpIHtcbiAgICAgIHRoaXMucGlsbEVsLnNldFRleHQocGlsbFRleHQpXG4gICAgICB0aGlzLnBpbGxFbC5jbGFzc05hbWUgPSBgZHNoLWRvY2stcGlsbCAke3BpbGxDbHN9YFxuICAgIH1cbiAgICBpZiAodGhpcy50b2dnbGVCdG4pIHtcbiAgICAgIHRoaXMudG9nZ2xlQnRuLmVtcHR5KClcbiAgICAgIHNldEljb24odGhpcy50b2dnbGVCdG4sIHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJyA/ICdzcXVhcmUnIDogJ3BsYXknKVxuICAgICAgdGhpcy50b2dnbGVCdG4udGl0bGUgPSBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycgPyAnXHU1MDVDXHU2QjYyJyA6ICdcdTU0MkZcdTUyQTgnXG4gICAgfVxuXG4gICAgLy8gaWZyYW1lIFx1NEUwRVx1ODk4Nlx1NzZENlx1NUM0MlxuICAgIGlmICh1aSA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmlmcmFtZUVsLnNyYyAhPT0gdGhpcy5wbHVnaW4uYmFzZVVybCkge1xuICAgICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICAgIH1cbiAgICAgIHRoaXMuc2hvd092ZXJsYXkobnVsbClcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RhcnRpbmcoKSlcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyRXJyb3Iocy5raW5kID09PSAnZXJyb3InID8gcy5tZXNzYWdlIDogJ1x1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRicpKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RvcHBlZCgpKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0gXHU4OTg2XHU3NkQ2XHU1QzQyXHU2RTMyXHU2N0QzIC0tLS0tLS0tLS1cblxuICBwcml2YXRlIHNob3dPdmVybGF5KGNvbnRlbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5vdmVybGF5RWwpIHJldHVyblxuICAgIHRoaXMub3ZlcmxheUVsLmVtcHR5KClcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgdGhpcy5vdmVybGF5RWwuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgICAgIHRoaXMub3ZlcmxheUVsLnJlbW92ZUF0dHJpYnV0ZSgnaGlkZGVuJylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gXHU4RkQwXHU4ODRDXHU0RTJEXHVGRjFBXHU2NjNFXHU1RjBGXHU5NjkwXHU4NUNGXHU4OTg2XHU3NkQ2XHU1QzQyXHVGRjA4XHU1NDI2XHU1MjE5XHU3QTdBXHU3Njg0XHU3RUREXHU1QkY5XHU1QjlBXHU0RjREXHU1QzQyXHU0RjFBXHU2MzIxXHU0RjRGIGlmcmFtZVx1RkYwOVxuICAgICAgdGhpcy5vdmVybGF5RWwuc2V0QXR0cmlidXRlKCdoaWRkZW4nLCAnJylcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXJ0aW5nKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3Bpbm5lcicgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnXHU2QjYzXHU1NzI4XHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IERTSCBXZWJcdTIwMjYnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLFxuICAgICAgdGV4dDogJ1x1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1OTcwMFx1NTIxRFx1NTlDQlx1NTMxNiBwcm9maWxlXHVGRjA4XHU3RUE2IDEwIFx1NzlEMlx1RkYwOVx1RkYxQlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MFx1NzUyOFx1NjVGNlx1NUMwNlx1ODFFQVx1NTJBOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScsXG4gICAgfSlcbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYWxlcnQtdHJpYW5nbGUnKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1tc2cnLCB0ZXh0OiBtZXNzYWdlIH0pXG4gICAgY29uc3QgcmV0cnkgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuJywgdGV4dDogJ1x1OTFDRFx1OEJENScgfSlcbiAgICByZXRyeS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RvcHBlZCgpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FuY2hvcicpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTY3MkFcdThGRDBcdTg4NEMnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsIHRleHQ6ICdcdTcwQjlcdTUxRkJcdTU0MkZcdTUyQThcdUZGMENcdTYyOEFcdTVCOThcdTY1QjkgRGVlcFNlZWsgSGFybmVzcyBcdTUwNUNcdTk3NjBcdThGREJcdTY3NjUnIH0pXG4gICAgY29uc3Qgc3RhcnQgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuIG1vZC1jdGEnLCB0ZXh0OiAnXHU1NDJGXHU1MkE4IERTSCcgfSlcbiAgICBzdGFydC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVsb2FkKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGN1cnJlbnRWYXVsdC50cyBcdTIwMTRcdTIwMTQgXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHRcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHUzMDAyXG4gKlxuICogZHNoLWRvY2sgXHU4REQxXHU1NzI4IE9ic2lkaWFuIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1ODBGRFx1NjJGRlx1NTIzMFx1NjcwMFx1Njc0M1x1NUEwMVx1NzY4NFx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1N0E5N1x1NTNFM1x1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NjVGNlx1RkYwQ1xuICogYGFwcC52YXVsdC5nZXROYW1lKClgICsgYGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKWBcdUZGMDlcdTMwMDJEU0ggXHU3Njg0XHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XG4gKiBkc2gtdG9vbC1vYnNpZGlhbi12YXVsdCBcdThERDFcdTU3MjhcdTcyRUNcdTdBQ0Igbm9kZSBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTRFMjRcdTgwMDVcdTkwMUFcdThGQzdcdTRFMDBcdTRFMkFcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTg5RTNcdTgwMjZcdTkwMUFcdTRGRTFcdUZGMUFcbiAqXG4gKiAgIDxob21lZGlyPi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAgIHsgbmFtZSwgcGF0aCwgdXBkYXRlZEF0IH1cbiAqXG4gKiAtIFx1NEY0RFx1N0Y2RVx1NTZGQVx1NUI5QVx1NTcyOCBgfi8uZHNoYFx1RkYwOFx1NEUwRSBkc2gtZG9jayBcdTc2ODQgRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHU2NUUwXHU1MTczXHVGRjA5XHVGRjBDXHU0RUZCXHU0RjU1XHU2QTIxXHU1RjBGXG4gKiAgIFx1NEUwQiBEU0ggXHU0RkE3XHU5MEZEXHU4QkZCXHU1Rjk3XHU1MjMwXHVGRjFCXG4gKiAtIFx1NTkxQVx1N0E5N1x1NTNFM1x1NTczQVx1NjY2Rlx1RkYxQVx1NkJDRlx1NEUyQSBPYnNpZGlhbiBcdTdBOTdcdTUzRTNcdUZGMDhcdTRFM0JcdTdBOTdcdTUzRTMgLyBwb3BvdXRcdUZGMDlcdTkwRkRcdTY2MkZcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTU0MDRcbiAqICAgXHU4MUVBXHU3NkQxXHU1NDJDXHU4MUVBXHU1REYxXHU3Njg0IHdpbmRvdyBmb2N1cyBcdTIwMTRcdTIwMTQgXHU2NzAwXHU1NDBFXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU3Njg0XHU3QTk3XHU1M0UzXHU1MTk5XHU1MTY1XHVGRjBDXHU2QjYzXHU2NjJGXCJcdTc1MjhcdTYyMzdcdTVGNTNcdTUyNERcdTZCNjNcbiAqICAgXHU1NzI4XHU3NzBCXHU3Njg0IHZhdWx0XCJcdUZGMUJcbiAqIC0gXHU1OTMxXHU4RDI1XHU5NzU5XHU5RUQ4XHVGRjFBXHU1MTk5XHU0RTBEXHU4RkRCXHVGRjA4XHU2NzQzXHU5NjUwL1x1NzhDMVx1NzZEOFx1RkYwOVx1NTNFQSBjb25zb2xlLndhcm5cdUZGMENcdTdFRERcdTRFMERcdTYyNTNcdTY1QURcdTYzRDJcdTRFRjZcdTRFM0JcdTZENDFcdTdBMEJcdUZGMUJcbiAqICAgXHU2NTg3XHU0RUY2XHU2MzVGXHU1NzRGL1x1N0YzQVx1NTkzMVx1NjVGNiBEU0ggXHU0RkE3XHU1NkRFXHU5MDAwXHU1MzlGXHU2NzA5XHU0RkUxXHU1M0Y3XHVGRjBDXHU1NDExXHU1NDBFXHU1MTdDXHU1QkI5XHU0RTBEXHU4OEM1IGRzaC1kb2NrIFx1NzY4NFx1NTczQVx1NjY2Rlx1MzAwMlxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTU2RkFcdTVCOUFcdTRGNERcdTdGNkVcdUZGMUF+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnLCAnY3VycmVudC12YXVsdC5qc29uJylcbn1cblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE4NVx1NUJCOVx1RkYwOERTSCBcdTRGQTdcdTUzRUFcdThCRkIgbmFtZS9wYXRoXHVGRjBDdXBkYXRlZEF0IFx1NEY5Qlx1OEJDQVx1NjVBRFx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBDdXJyZW50VmF1bHRNYXJrZXIge1xuICBuYW1lOiBzdHJpbmdcbiAgcGF0aDogc3RyaW5nXG4gIHVwZGF0ZWRBdDogbnVtYmVyXG59XG5cbi8qKlxuICogXHU1MzlGXHU1QjUwXHU1MTk5XHU1MTY1XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjFBXHU1MTQ4XHU1MTk5XHU1NDBDXHU3NkVFXHU1RjU1IC50bXAgXHU1MThEIHJlbmFtZVx1RkYwQ1x1OTA3Rlx1NTE0RCBEU0ggXHU0RkE3XHU4QkZCXHU1MjMwXHU1MzRBXHU2MjJBXHU1MTg1XHU1QkI5XHUzMDAyXG4gKiBcdTU5MzFcdThEMjVcdTUzRUFcdTU0NEFcdThCNjZcdUZGMENcdTRFMERcdTYyOUJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKG5hbWU6IHN0cmluZywgdmF1bHRQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlID0gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpXG4gICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShmaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBjb25zdCBwYXlsb2FkOiBDdXJyZW50VmF1bHRNYXJrZXIgPSB7IG5hbWUsIHBhdGg6IHZhdWx0UGF0aCwgdXBkYXRlZEF0OiBEYXRlLm5vdygpIH1cbiAgICBjb25zdCB0bXAgPSBgJHtmaWxlfS50bXBgXG4gICAgZnMud3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpKVxuICAgIGZzLnJlbmFtZVN5bmModG1wLCBmaWxlKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gXHU1MTk5XHU1MTY1IGN1cnJlbnQtdmF1bHQgXHU2ODA3XHU4QkIwXHU1OTMxXHU4RDI1JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTRFQ0UgT2JzaWRpYW4gYXBwIFx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdCBcdTU0MERcdTRFMEVcdTY4MzlcdThERUZcdTVGODRcdUZGMUJcdTUzRDZcdTRFMERcdTUyMzBcdThGRDRcdTU2REUgbnVsbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdEluZm8oYXBwOiB7XG4gIHZhdWx0OiB7IGdldE5hbWUoKTogc3RyaW5nOyBhZGFwdGVyOiB1bmtub3duIH1cbn0pOiB7IG5hbWU6IHN0cmluZzsgcGF0aDogc3RyaW5nIH0gfCBudWxsIHtcbiAgdHJ5IHtcbiAgICAvLyBnZXRCYXNlUGF0aCBcdTRFMERcdTU3Mjggb2JzaWRpYW4gXHU3Njg0XHU3QzdCXHU1NzhCXHU1QjlBXHU0RTQ5XHU5MUNDXHVGRjA4XHU4RkQwXHU4ODRDXHU2NUY2IERhdGFBZGFwdGVyIFx1NjI0RFx1NjcwOVx1RkYwOVx1RkYwQ1xuICAgIC8vIFx1NjI0MFx1NEVFNVx1OEZEOVx1OTFDQ1x1NjI4QSBhZGFwdGVyIFx1NUY1MyB1bmtub3duIFx1NTkwNFx1NzQwNlx1NTE4RFx1NjVBRFx1OEEwMFx1MzAwMlxuICAgIGNvbnN0IGJhc2UgPSAoYXBwLnZhdWx0LmFkYXB0ZXIgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9KS5nZXRCYXNlUGF0aD8uKClcbiAgICBpZiAoIWJhc2UpIHJldHVybiBudWxsXG4gICAgcmV0dXJuIHsgbmFtZTogYXBwLnZhdWx0LmdldE5hbWUoKSwgcGF0aDogYmFzZSB9XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRQSxJQUFBQSxtQkFBOEM7QUFDOUMsc0JBQXNCO0FBRXRCLElBQUFDLE1BQW9CO0FBQ3BCLElBQUFDLFFBQXNCOzs7QUNHdEIsMkJBQW9EO0FBQ3BELFNBQW9CO0FBQ3BCLFdBQXNCO0FBQ3RCLFNBQW9CO0FB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QUFNO0FBQUEsTUFDaEIsV0FBVyxLQUFLO0FBQUEsSUFDbEI7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLG1CQUEyQjtBQUN6QixXQUFPLGVBQWUsS0FBSyxVQUFVLEtBQUssVUFBVSxDQUFDO0FBQUEsRUFDdkQ7QUFBQTtBQUFBLEVBR0EsZ0JBQXdCO0FBQ3RCLFdBQU8sWUFBWSxLQUFLLFVBQVUsS0FBSyxVQUFVLENBQUM7QUFBQSxFQUNwRDtBQUFBO0FBQUEsRUFHQSw0QkFBZ0Q7QUFDOUMsV0FBTyx3QkFBd0IsS0FBSyxVQUFVLEtBQUssVUFBVSxDQUFDO0FBQUEsRUFDaEU7QUFBQSxFQUVBLE1BQWMsZUFBOEI7QUFDMUMsVUFBTSxPQUFRLE1BQU0sS0FBSyxTQUFTO0FBQ2xDLFNBQUssV0FBVyxPQUFPLE9BQU8sQ0FBQyxHQUFHLGtCQUFrQixRQUFRLENBQUMsQ0FBQztBQUU5RCxVQUFNLFNBQXNDO0FBQzVDLFFBQUksUUFBUSxXQUFXLE9BQU8sT0FBTyxZQUFZLFlBQVksT0FBTyxRQUFRLEtBQUssR0FBRztBQUNsRixXQUFLLFNBQVMsY0FBYztBQUM1QixXQUFLLFNBQVMsVUFBVSxPQUFPLFFBQVEsS0FBSztBQUFBLElBQzlDO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxlQUE4QjtBQUNsQyxVQUFNLEtBQUssU0FBUyxLQUFLLFFBQVE7QUFBQSxFQUNuQztBQUFBO0FBQUEsRUFJQSxNQUFNLFlBQTJCO0FBQy9CLFVBQU0sRUFBRSxVQUFVLElBQUksS0FBSztBQUMzQixVQUFNLFNBQVMsVUFBVSxnQkFBZ0IsaUJBQWlCO0FBQzFELFFBQUksT0FBNkIsT0FBTyxDQUFDLEtBQUs7QUFDOUMsUUFBSSxDQUFDLE1BQU07QUFDVCxhQUFPLFVBQVUsYUFBYSxLQUFLO0FBQ25DLFVBQUksQ0FBQyxLQUFNO0FBQ1gsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ25FO0FBQ0EsY0FBVSxjQUFjLElBQUk7QUFBQSxFQUM5QjtBQUFBLEVBRUEsTUFBTSxnQkFBK0I7QUFDbkMsVUFBTSxzQkFBTSxhQUFhLEtBQUssT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLE1BQU0sYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sT0FBTyxLQUFLLElBQUksVUFBVSxlQUFlO0FBQy9DLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRSxTQUFTLEtBQUs7QUFDWixZQUFNLE1BQU0sZUFBZSxRQUFRLElBQUksVUFBVSxPQUFPLEdBQUc7QUFDM0QsVUFBSSx3QkFBTyxxREFBYSxHQUFHLEVBQUU7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIm9zIiwgInBhdGgiLCAiZW1iZWRkZWROb2RlVmVyc2lvbiIsICJyZXNvbHZlIiwgImltcG9ydF9vYnNpZGlhbiIsICJmcyIsICJvcyIsICJwYXRoIl0KfQo=
