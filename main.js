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
        console.info(`[dsh-host] per-vault ${name} \u5DF2\u5907\u4EFD\u4E3A ${bak}\uFF0C\u6539\u7528\u5171\u4EAB`);
      }
      fs.mkdirSync(dshHome, { recursive: true });
      fs.symlinkSync(sharedTarget, target, "dir");
      console.info(`[dsh-host] per-vault ${name} -> ${sharedTarget}\uFF08\u8F6F\u94FE\u5171\u4EAB\uFF09`);
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
      console.info(`[dsh-host] per-vault \u914D\u7F6E\u5171\u4EAB: settings/credentials -> ${sharedRoot}`);
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
    new import_obsidian.Setting(containerEl).setName("\u6A21\u5F0F").setDesc("per-vault \u6A21\u5F0F = \u4F1A\u8BDD\u6309\u5E93\u9694\u79BB\uFF08\u5404\u5E93\u9762\u677F\u53EA\u663E\u793A\u672C\u5E93\u521B\u5EFA\u7684\u4F1A\u8BDD\uFF09\uFF0C\u4F46\u6A21\u578B/\u5BC6\u94A5/\u4E3B\u9898\u914D\u7F6E\u4E0E\u8FD0\u884C\u65F6\u63D2\u4EF6\u5168\u5C40\u5171\u4EAB\u4E00\u4EFD\uFF0C\u914D\u4E00\u6B21\u5168\u5E93\u751F\u6548\u3002").addDropdown((dd) => {
      dd.addOption("shared", "\u5B98\u65B9\u5171\u4EAB ~/.dsh\uFF08\u6240\u6709 vault \u5171\u7528\u4E00\u5957\u914D\u7F6E\u3001\u63D2\u4EF6\u4E0E\u4F1A\u8BDD\uFF09");
      dd.addOption("per-vault", "\u6BCF vault \u9694\u79BB\u4F1A\u8BDD ~/.dsh/vaults/<\u540D>-<hash>\uFF08\u914D\u7F6E\u4E0E\u63D2\u4EF6\u4ECD\u5171\u4EAB\uFF09");
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
        // per-vault 模式：把本服务所属 vault 注入子进程 env（第二通道，标记
        // 文件之外的兜底）。工具插件解析时优先用本 env，保证在生物备课的
        // 服务里提问不会因焦点在生物题库而解析成生物题库。
        // shared 模式：所有库共用一个服务，不注入 —— 工具仍跟随焦点窗口。
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSB7IENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7XG4gIGVtYmVkZGVkTm9kZVZlcnNpb24sXG4gIGVuc3VyZURzaFJ1bm5pbmcsXG4gIHJlc29sdmVEc2hCaW4sXG4gIHJlc29sdmVOb2RlQmluLFxuICBzYWZlVmF1bHROYW1lLFxuICBzdGFibGVIYXNoLFxuICBzdG9wUHJvY2VzcyxcbiAgdHlwZSBTZXJ2ZXJTdGF0dXMsXG59IGZyb20gJy4vbGF1bmNoZXInXG5pbXBvcnQgeyBEc2hEb2NrU2V0dGluZ3NUYWIsIERFRkFVTFRfU0VUVElOR1MsIHR5cGUgRHNoRG9ja1NldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncydcbmltcG9ydCB7IERzaFdlYlZpZXcsIERTSF9XRUJfVklFV19UWVBFIH0gZnJvbSAnLi92aWV3J1xuaW1wb3J0IHsgY3VycmVudFZhdWx0SW5mbywgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIgfSBmcm9tICcuL2N1cnJlbnRWYXVsdCdcblxuLyoqXG4gKiBcdThCQTFcdTdCOTcgRFNIX0hPTUVcdUZGMUFcbiAqIC0gc2hhcmVkXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFBfi8uZHNoIFx1MjAxNFx1MjAxNCBcdTRFMEVcdTVCOThcdTY1QjkgZHNoIENMSSBcdTVCOENcdTUxNjhcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTVERjJcdTY3MDlcdTkxNERcdTdGNkUvXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURzaEhvbWUoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAnZHNoSG9tZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKClcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgcmV0dXJuIHMuZHNoSG9tZS50cmltKCkgfHwgcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbiAgfVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcpIHtcbiAgICBjb25zdCBuYW1lID0gdmF1bHRSb290ID8gYCR7c2FmZVZhdWx0TmFtZSh2YXVsdFJvb3QpfS0ke3N0YWJsZUhhc2godmF1bHRSb290KX1gIDogJ3ZhdWx0J1xuICAgIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnLCAndmF1bHRzJywgbmFtZSlcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbn1cblxuLyoqXG4gKiBcdThCQTFcdTdCOTdcdTY3MkMgdmF1bHQgXHU3Njg0XHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHUzMDAyXG4gKiAtIHNoYXJlZCAvIGN1c3RvbVx1RkYxQXNldHRpbmdzLnBvcnRcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOVx1MjAxNFx1MjAxNCBcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU1NDBDXHU0RTAwXHU2NzBEXHU1MkExXHU0RTBFXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQXNldHRpbmdzLnBvcnQgKyAoc3RhYmxlSGFzaCAlIDQwOTYpIFx1MjAxNFx1MjAxNCBcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3MkVDXHU1MzYwXHU3QUVGXHU1M0UzXHVGRjBDXHU1NDA0XHU4MUVBXG4gKiAgIHNwYXduIFx1NzJFQ1x1N0FDQlx1NzY4NCBkc2ggXHU4RkRCXHU3QTBCXHVGRjFCXHU5MTREXHU1NDA4XHU3MkVDXHU3QUNCXHU3Njg0IERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREXHU1QjU4XHU1MEE4XHU2ODM5XHVGRjA5XHVGRjBDXHU0RTBEXHU1NDBDIHZhdWx0IFx1NzY4NFxuICogICBcdTRGMUFcdThCRERcdTVCOENcdTUxNjhcdTk2OTRcdTc5QkJcdUZGMENcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdTMwMDJcdTdBRUZcdTUzRTNcdTUxQjJcdTdBODFcdTY5ODJcdTczODcgfjEvNDA5Nlx1RkYwQ1x1NTNFRlx1NjNBNVx1NTNEN1x1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVBvcnQoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAncG9ydCc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludChzdGFibGVIYXNoKHZhdWx0Um9vdCksIDM2KSAlIDQwOTZcbiAgICByZXR1cm4gcy5wb3J0ICsgb2Zmc2V0XG4gIH1cbiAgcmV0dXJuIHMucG9ydFxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODRcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NTE3MVx1NzUyOFx1NEUwMFx1NEVGRFx1RkYwQ1x1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1RkYwOVx1MzAwMlxuICogLSBzaGFyZWRcdUZGMUFkc2hIb21lIFx1ODFFQVx1OEVBQlx1NTM3M1x1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwQ1x1NjVFMFx1OTcwMFx1NTE3MVx1NEVBQlx1NUM0Mlx1RkYxQlxuICogLSBjdXN0b21cdUZGMUFcdTc1MjhcdTYyMzdcdTYzMDdcdTVCOUFcdThERUZcdTVGODRcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMENcdTY1RTBcdTk3MDBcdTUxNzFcdTRFQUJcdTVDNDJcdUZGMUJcbiAqIC0gcGVyLXZhdWx0XHVGRjFBXHU4RkQ0XHU1NkRFXHU1MTcxXHU0RUFCIGB+Ly5kc2hgXHVGRjBDXHU4QkE5XHU2QkNGXHU0RTJBIHZhdWx0IFx1NzY4NCBzZXR0aW5ncy9jcmVkZW50aWFsc1xuICogICBcdTYzMDdcdTU2REVcdTVCODMgXHUyMDE0XHUyMDE0IFx1OTE0RFx1NEUwMFx1NkIyMVx1NTE2OCB2YXVsdCBcdTc1MUZcdTY1NDhcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcgJiYgdmF1bHRSb290KSB7XG4gICAgcmV0dXJuIHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZHNoJylcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERzaERvY2tQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogRHNoRG9ja1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HU1xuICBwcml2YXRlIHByb2M6IENoaWxkUHJvY2VzcyB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgc3RhdHVzOiBTZXJ2ZXJTdGF0dXMgPSB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHByaXZhdGUgc3RhcnRpbmcgPSBmYWxzZVxuICBwcml2YXRlIHN0YXR1c0JhckVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgc3RhdHVzTGlzdGVuZXJzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpXG4gIC8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUxOTlcdTUxNjVcdTk2MzJcdTYyOTYgdGltZXJcdUZGMDhcdTdBOTdcdTUzRTMgZm9jdXMgXHU1M0VGXHU4MEZEXHU5QUQ4XHU5ODkxXHU4OUU2XHU1M0QxXHVGRjA5ICovXG4gIHByaXZhdGUgbWFya2VyVGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IG51bGxcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKClcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KERTSF9XRUJfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IERzaFdlYlZpZXcobGVhZiwgdGhpcykpXG5cbiAgICAvLyBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdUZGMUFcdTY3MkNcdTdBOTdcdTUzRTNcdTYyNTNcdTVGMDBcdUZGMDhvbmxvYWRcdUZGMDlcdTRFMEVcdTZCQ0ZcdTZCMjFcdTgzQjdcdTVGOTdcbiAgICAvLyBcdTcxMjZcdTcwQjlcdTY1RjZcdTUyMzdcdTY1QjBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTMwMDJcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdTRFMEJcdTZCQ0ZcdTRFMkFcdTdBOTdcdTUzRTNcdTkwRkRcdTcyRUNcdTdBQ0JcdTUyQTBcdThGN0RcdTY3MkNcdTYzRDJcdTRFRjZcdUZGMENcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcbiAgICAvLyBcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTUzNzNcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1x1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHUzMDAyXG4gICAgdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICBjb25zdCBvbldpbmRvd0ZvY3VzID0gKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbldpbmRvd0ZvY3VzKVxuICAgIHRoaXMucmVnaXN0ZXIoKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25XaW5kb3dGb2N1cykpXG4gICAgLy8gXHU4ODY1XHU1MTQ1XHU0RkUxXHU1M0Y3XHVGRjFBXHU3NTI4XHU2MjM3XHU1NzI4XHU3QTk3XHU1M0UzXHU1MTg1XHU1MjA3XHU2MzYyXHU2NTg3XHU0RUY2L1x1NUUwM1x1NUM0MFx1NUZDNVx1NzEzNlx1ODlFNlx1NTNEMSBhY3RpdmUtbGVhZi1jaGFuZ2VcdUZGMENcbiAgICAvLyBcdTg5ODZcdTc2RDYgd2luZG93IGZvY3VzIFx1NEU4Qlx1NEVGNlx1NEUwRFx1NkQzRVx1NTNEMVx1NzY4NFx1NTczQVx1NjY2Rlx1MzAwMlx1OTYzMlx1NjI5Nlx1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQSB0aW1lclx1RkYwQ1x1NEU5Mlx1NEUwRFx1NUU3Mlx1NjI3MFx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2FjdGl2ZS1sZWFmLWNoYW5nZScsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignYm90JywgJ0RTSCBEb2NrXHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJywgKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLXBhbmVsJyxcbiAgICAgIG5hbWU6ICdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3RicsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RhcnQtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTU0MkZcdTUyQTggRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0YXJ0KCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdG9wLWRzaCcsXG4gICAgICBuYW1lOiAnXHU1MDVDXHU2QjYyIERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdG9wKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1icm93c2VyJyxcbiAgICAgIG5hbWU6ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAgRFNIJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlbkluQnJvd3NlcigpLFxuICAgIH0pXG5cbiAgICB0aGlzLnN0YXR1c0JhckVsID0gdGhpcy5hZGRTdGF0dXNCYXJJdGVtKClcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEc2hEb2NrU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKVxuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b3N0YXJ0KSB7XG4gICAgICB2b2lkIHRoaXMuc3RhcnQoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9udW5sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc3RvcCgpXG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2xlYXIoKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NzJCNlx1NjAwMVxuXG4gIGdldFN0YXR1cygpOiBTZXJ2ZXJTdGF0dXMge1xuICAgIHJldHVybiB0aGlzLnN0YXR1c1xuICB9XG5cbiAgZ2V0IGNoaWxkUHJvYygpOiBDaGlsZFByb2Nlc3MgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5wcm9jXG4gIH1cblxuICBnZXQgYmFzZVVybCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhdWx0Um9vdCA9IHRoaXMudmF1bHRSb290KClcbiAgICBjb25zdCBwb3J0ID0gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgIHJldHVybiBgaHR0cDovLyR7dGhpcy5zZXR0aW5ncy5ob3N0fToke3BvcnR9L2BcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjA4XHU2NUUwXHU1MjE5IHVuZGVmaW5lZFx1RkYwOSAqL1xuICBwcml2YXRlIHZhdWx0Um9vdCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiAodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH0pLmdldEJhc2VQYXRoPy4oKVxuICB9XG5cbiAgb25TdGF0dXNDaGFuZ2UoZm46ICgpID0+IHZvaWQpOiAoKSA9PiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1c0xpc3RlbmVycy5hZGQoZm4pXG4gICAgcmV0dXJuICgpID0+IHRoaXMuc3RhdHVzTGlzdGVuZXJzLmRlbGV0ZShmbilcbiAgfVxuXG4gIHByaXZhdGUgc2V0U3RhdHVzKHN0YXR1czogU2VydmVyU3RhdHVzKTogdm9pZCB7XG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXNcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgZm9yIChjb25zdCBmbiBvZiB0aGlzLnN0YXR1c0xpc3RlbmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm4oKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhdHVzQmFyKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5zdGF0dXNCYXJFbCkgcmV0dXJuXG4gICAgY29uc3QgcyA9IHRoaXMuc3RhdHVzXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoYERTSDogJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJ1x1RkYwOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOScgOiAnJ31gKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTY3MkFcdThGRDBcdTg4NEMnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgwN1x1OEJCMFxuXG4gIC8qKiBcdThCRkJcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1RTc2XHU1MTk5XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjA4XHU5NjMyXHU2Mjk2IDMwMG1zXHVGRjBDXHU5MDdGXHU1MTREIGZvY3VzIFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1NTNDRFx1NTkwRFx1NTE5OVx1NzZEOFx1RkYwOSAqL1xuICByZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm1hcmtlclRpbWVyKSBjbGVhclRpbWVvdXQodGhpcy5tYXJrZXJUaW1lcilcbiAgICB0aGlzLm1hcmtlclRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgpXG4gICAgfSwgMzAwKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuXG4gIC8qKiBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NjMwMlx1NjNBNVx1RkYxQlx1NTQyNlx1NTIxOSBzcGF3biBcdTVCOThcdTY1QjkgZHNoIHdlYiAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xuICAgIGlmICh0aGlzLnN0YXJ0aW5nKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICB0aGlzLnN0YXJ0aW5nID0gdHJ1ZVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0YXJ0aW5nJyB9KVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgICBjb25zdCBkc2hIb21lID0gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHNoYXJlZENvbmZpZ1Jvb3QgPSBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgaG9zdDogdGhpcy5zZXR0aW5ncy5ob3N0LFxuICAgICAgICBkc2hIb21lLFxuICAgICAgICAvLyBwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHUzMDAyXG4gICAgICAgIC4uLihzaGFyZWRDb25maWdSb290ID8geyBzaGFyZWRDb25maWdSb290IH0gOiB7fSksXG4gICAgICAgIHVzZUVtYmVkZGVkTm9kZTogdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUsXG4gICAgICAgIC8vIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFcdTYyOEFcdTY3MkNcdTY3MERcdTUyQTFcdTYyNDBcdTVDNUUgdmF1bHQgXHU2Q0U4XHU1MTY1XHU1QjUwXHU4RkRCXHU3QTBCIGVudlx1RkYwOFx1N0IyQ1x1NEU4Q1x1OTAxQVx1OTA1M1x1RkYwQ1x1NjgwN1x1OEJCMFxuICAgICAgICAvLyBcdTY1ODdcdTRFRjZcdTRFNEJcdTU5MTZcdTc2ODRcdTUxNUNcdTVFOTVcdUZGMDlcdTMwMDJcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjZcdTg5RTNcdTY3OTBcdTY1RjZcdTRGMThcdTUxNDhcdTc1MjhcdTY3MkMgZW52XHVGRjBDXHU0RkREXHU4QkMxXHU1NzI4XHU3NTFGXHU3MjY5XHU1OTA3XHU4QkZFXHU3Njg0XG4gICAgICAgIC8vIFx1NjcwRFx1NTJBMVx1OTFDQ1x1NjNEMFx1OTVFRVx1NEUwRFx1NEYxQVx1NTZFMFx1NzEyNlx1NzBCOVx1NTcyOFx1NzUxRlx1NzI2OVx1OTg5OFx1NUU5M1x1ODAwQ1x1ODlFM1x1Njc5MFx1NjIxMFx1NzUxRlx1NzI2OVx1OTg5OFx1NUU5M1x1MzAwMlxuICAgICAgICAvLyBzaGFyZWQgXHU2QTIxXHU1RjBGXHVGRjFBXHU2MjQwXHU2NzA5XHU1RTkzXHU1MTcxXHU3NTI4XHU0RTAwXHU0RTJBXHU2NzBEXHU1MkExXHVGRjBDXHU0RTBEXHU2Q0U4XHU1MTY1IFx1MjAxNFx1MjAxNCBcdTVERTVcdTUxNzdcdTRFQ0RcdThEREZcdTk2OEZcdTcxMjZcdTcwQjlcdTdBOTdcdTUzRTNcdTMwMDJcbiAgICAgICAgZW52OiBzaGFyZWRDb25maWdSb290ICYmIHZhdWx0SW5mb1xuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfTkFNRTogdmF1bHRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgIERTSF9PQlNJRElBTl9WQVVMVF9QQVRIOiB2YXVsdEluZm8ucGF0aCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9LFxuICAgICAgfSlcbiAgICAgIHRoaXMucHJvYyA9IHJlc3VsdC5wcm9jID8/IG51bGxcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiByZXN1bHQucHJvYykge1xuICAgICAgICB0aGlzLmhvb2tDaGlsZExvZ3MocmVzdWx0LnByb2MpXG4gICAgICB9XG4gICAgICB0aGlzLnNldFN0YXR1cyhyZXN1bHQuc3RhdHVzKVxuICAgICAgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke3Jlc3VsdC5zdGF0dXMubWVzc2FnZX1gKVxuICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhcmVzdWx0LnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggV2ViIFx1NURGMlx1NUMzMVx1N0VFQTogJHtyZXN1bHQuc3RhdHVzLnVybH1gKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IG1zZyB9KVxuICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NUYwMlx1NUUzODogJHttc2d9YClcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXR1c1xuICB9XG5cbiAgYXN5bmMgc3RvcCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICBpZiAodGhpcy5wcm9jKSB7XG4gICAgICBhd2FpdCBzdG9wUHJvY2Vzcyh0aGlzLnByb2MpXG4gICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgfVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0b3BwZWQnIH0pXG4gIH1cblxuICBwcml2YXRlIGhvb2tDaGlsZExvZ3MocHJvYzogQ2hpbGRQcm9jZXNzKTogdm9pZCB7XG4gICAgcHJvYy5zdGRvdXQ/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS5pbmZvKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUud2FybignW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhdGhpcy5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBOiBjb2RlPSR7Y29kZX0gc2lnbmFsPSR7c2lnbmFsID8/ICcnfWAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tkc2gtZG9ja10gXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGJywgZXJyKVxuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRjogJHtlcnIubWVzc2FnZX1gIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKiBcdTYzQTJcdTZENEJcdTRGRTFcdTYwNkZcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZGV0ZWN0SW5mbygpOiB7IGRzaEJpbjogc3RyaW5nIHwgbnVsbDsgZHNoTm90ZXM6IHN0cmluZ1tdOyBub2RlTm90ZXM6IHN0cmluZ1tdIH0ge1xuICAgIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbih0aGlzLnNldHRpbmdzLmRzaEJpbilcbiAgICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4odGhpcy5zZXR0aW5ncy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKVxuICAgIHJldHVybiB7XG4gICAgICBkc2hCaW46IGZvdW5kLmJpbixcbiAgICAgIGRzaE5vdGVzOiBmb3VuZC5ub3RlcyxcbiAgICAgIG5vZGVOb3Rlczogbm9kZS5ub3RlcyxcbiAgICB9XG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0IERTSF9IT01FXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGVmZmVjdGl2ZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTdBRUZcdTUzRTNcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOSAqL1xuICBlZmZlY3RpdmVQb3J0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRiA9IH4vLmRzaFx1RkYwQ1x1NTE3Nlx1NEY1OVx1NjVFMFx1RkYwOSAqL1xuICBlZmZlY3RpdmVTaGFyZWRDb25maWdSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGRhdGEgPz8ge30pXG4gICAgLy8gXHU2NUU3XHU3MjQ4XHVGRjA4ZHNoLWhvc3QgVjAuMVx1RkYwOVx1OEJCRVx1N0Y2RVx1OEZDMVx1NzlGQlx1RkYxQWRzaEhvbWUgXHU1QjU3XHU3QjI2XHU0RTMyIFx1MjE5MiBjdXN0b20gXHU2QTIxXHU1RjBGXG4gICAgY29uc3QgbGVnYWN5ID0gZGF0YSBhcyB7IGRzaEhvbWU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZFxuICAgIGlmIChsZWdhY3k/LmRzaEhvbWUgJiYgdHlwZW9mIGxlZ2FjeS5kc2hIb21lID09PSAnc3RyaW5nJyAmJiBsZWdhY3kuZHNoSG9tZS50cmltKCkpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSAnY3VzdG9tJ1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lID0gbGVnYWN5LmRzaEhvbWUudHJpbSgpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBVSVxuXG4gIGFzeW5jIG9wZW5QYW5lbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHBcbiAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERTSF9XRUJfVklFV19UWVBFKVxuICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IGxlYXZlc1swXSA/PyBudWxsXG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSlcbiAgICAgIGlmICghbGVhZikgcmV0dXJuXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9XG4gICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZilcbiAgfVxuXG4gIGFzeW5jIG9wZW5JbkJyb3dzZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBzaGVsbCB9ID0gcmVxdWlyZSgnZWxlY3Ryb24nKSBhcyB7IHNoZWxsOiB7IG9wZW5FeHRlcm5hbCh1cmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gfSB9XG4gICAgYXdhaXQgc2hlbGwub3BlbkV4dGVybmFsKHRoaXMuYmFzZVVybClcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdUZGMDhPYnNpZGlhbiBwb3BvdXRcdUZGMDlcdUZGMUFEU0ggXHU5NzYyXHU2NzdGXHU4RkRCXHU1MTY1XHU3MkVDXHU3QUNCIEJyb3dzZXJXaW5kb3cgPVxuICAgKiBcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTRFMEUgT2JzaWRpYW4gXHU0RTNCXHU3QTk3XHU1M0UzXHU5Njk0XHU3OUJCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHU2ODA3XHU3QjdFXHU5ODc1XHUzMDAyXG4gICAqL1xuICBhc3luYyBvcGVuUG9wb3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLm9wZW5Qb3BvdXRMZWFmKClcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICBuZXcgTm90aWNlKGBcdTVGMzlcdTUxRkFcdTcyRUNcdTdBQ0JcdTdBOTdcdTUzRTNcdTU5MzFcdThEMjU6ICR7bXNnfWApXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBsYXVuY2hlci50cyBcdTIwMTRcdTIwMTQgXHU3RUFGXHU1NDJGXHU1MkE4XHU5MDNCXHU4RjkxXHVGRjA4XHU5NkY2IE9ic2lkaWFuIFx1NEY5RFx1OEQ1Nlx1RkYwQ1x1NTNFRlx1NzJFQ1x1N0FDQlx1NTE5Mlx1NzBERlx1NkQ0Qlx1OEJENVx1RkYwOVx1MzAwMlxuICpcbiAqIFx1ODA0Q1x1OEQyM1x1RkYxQVx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYgXHUyMTkyIHNwYXduIGBkc2ggd2ViYFxuICogXHVGRjA4MTI3LjAuMC4xOjxwb3J0Plx1RkYwOVx1MjE5MiBcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUEgXHUyMTkyIFx1NTA1Q1x1NkI2Mlx1MzAwMlxuICpcbiAqIFx1NTE3M1x1OTUyRVx1NEU4Qlx1NUI5RVx1RkYwOFx1NURGMlx1NTcyOFx1NUI5OFx1NjVCOSBAZGVlcHNlZWstYWkvZHNoQDAuMS4wLXJjLjYgXHU0RTBBXHU5QThDXHU4QkMxXHVGRjA5XHVGRjFBXG4gKiAtIGBub2RlIDxkc2g+L2xpYi9iaW4uanMgd2ViIC0taG9zdCAxMjcuMC4wLjEgLS1wb3J0IDxwb3J0PmAgXHU1MzczXHU1Qjk4XHU2NUI5IFdlYiBVSVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTQgaG9zdD0xMjcuMC4wLjFcdTMwMDFwb3J0PTMwODBcdUZGMDhcdTUzRUZcdTg5ODZcdTc2RDZcdUZGMDlcdUZGMUJcbiAqIC0gXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU4MUVBXHU1MkE4XHU1MjFEXHU1OUNCXHU1MzE2ICREU0hfSE9NRS9wcm9maWxlcy93ZWJcdUZGMDhidW5kbGVzID0gZHNoLWJhc2UgKyBkc2gtd2ViLWFwcFx1RkYwOVx1RkYwQ1xuICogICBcdTZBMjFcdTU3NTdcdTg5RTNcdTY3OTBcdThENzAgJERTSF9IT01FL3Byb2ZpbGVzL25vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTdCMjZcdTUzRjdcdTk0RkVcdTYzQTVcdUZGMENcdTY1RTBcdTk3MDAgcG5wbS9cdTgwNTRcdTdGNTFcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0XHU5MTREXHU3RjZFXHU0RTBCIFNRTGl0ZVx1RkYwOG5vZGU6c3FsaXRlXHVGRjBDXHU5NzAwIE5vZGUgXHUyMjY1MjIuNVx1RkYwOVx1NEUwRFx1NEYxQVx1NjI1M1x1NUYwMFx1RkYwOG9wZW5BdDogbmV2ZXJcdUZGMDlcdUZGMENcbiAqICAgXHU1NkUwXHU2QjY0IE5vZGUgMjArIFx1NEU1Rlx1ODBGRFx1OEREMVx1OUVEOFx1OEJBNCB3ZWIgcHJvZmlsZVx1RkYxQlx1NTQyRlx1NzUyOFx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NjVGNlx1NjI0RFx1OTcwMFx1ODk4MSBOb2RlIFx1MjI2NTIyLjVcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBzcGF3biwgc3Bhd25TeW5jLCB0eXBlIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCdcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5leHBvcnQgY29uc3QgRFNIX1JFTEFUSVZFX0JJTiA9IHBhdGguam9pbignQGRlZXBzZWVrLWFpJywgJ2RzaCcsICdsaWInLCAnYmluLmpzJylcblxuLyoqIE5vZGUgXHU0RTNCXHU3MjQ4XHU2NzJDXHU1M0Y3XHU2QkQ0XHU4RjgzXHVGRjFBbm9kZTpzcWxpdGUgXHU5NzAwXHU4OTgxIFx1MjI2NTIyLjVcdUZGMDhcdTRFQzVcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTUyOUZcdTgwRkRcdTc1MjhcdTUyMzBcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBOT0RFX1NRTElURV9NSU5fTUFKT1IgPSAyMlxuXG4vKiogXHU3QTMzXHU1QjlBXHU3N0VEXHU1NEM4XHU1RTBDXHVGRjA4ZGpiMlx1RkYwOVx1RkYwQ1x1NzUyOFx1NEU4RSB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdTZEODhcdTZCNjdcdUZGMENcdTkwN0ZcdTUxNERcdTRFMkRcdTY1ODdcdTU0MERcdTZFMDVcdTZEMTdcdTc4QjBcdTY0OUUgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFibGVIYXNoKGlucHV0OiBzdHJpbmcsIGxlbiA9IDYpOiBzdHJpbmcge1xuICBsZXQgaCA9IDUzODFcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykgaCA9ICgoaCA8PCA1KSArIGggKyBpbnB1dC5jaGFyQ29kZUF0KGkpKSA+Pj4gMFxuICByZXR1cm4gaC50b1N0cmluZygzNikucGFkU3RhcnQobGVuLCAnMCcpLnNsaWNlKDAsIGxlbilcbn1cblxuLyoqIFx1NTNFRlx1OEJGQlx1NzY4NCB2YXVsdCBcdTc2RUVcdTVGNTVcdTU0MERcdUZGMDhcdTRGRERcdTc1NTkgVW5pY29kZSBcdTVCNTdcdTZCQ0RcdTY1NzBcdTVCNTdcdUZGMENcdTUxNzZcdTRGNTlcdThGNkMgLVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOSAndmF1bHQnICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZVZhdWx0TmFtZSh2YXVsdFJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNsZWFuZWQgPSBwYXRoXG4gICAgLmJhc2VuYW1lKHZhdWx0Um9vdClcbiAgICAucmVwbGFjZSgvW15cXHB7TH1cXHB7Tn1fLV0rL2d1LCAnLScpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgJycpXG4gIHJldHVybiAoY2xlYW5lZCB8fCAndmF1bHQnKS5zbGljZSgwLCA0MClcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hPcHRpb25zIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1x1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbj86IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTkgKi9cbiAgbm9kZUJpbj86IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydD86IG51bWJlclxuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTQgMTI3LjAuMC4xXHVGRjBDXHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q/OiBzdHJpbmdcbiAgLyoqICREU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERC9cdTVCQzZcdTk0QTUvXHU2QTIxXHU1NzhCXHU5MTREXHU3RjZFXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjFCXHU5RUQ4XHU4QkE0IDx2YXVsdD4vLmRzaFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqXG4gICAqIFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODQgYH4vLmRzaGBcdUZGMDlcdUZGMUFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1N0Y2RVx1N0M3Qlx1NjU4N1x1NEVGNlxuICAgKiBcdTYzMDdcdTU0MTFcdTZCNjRcdTc2RUVcdTVGNTVcdUZGMENcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU0RTAwXHU0RUZEXHVGRjFCc2Vzc2lvbnMgXHU3QjQ5XHU2NTcwXHU2MzZFXHU0RUNEXHU1NzI4IGBkc2hIb21lYCBcdTk2OTRcdTc5QkJcdTMwMDJcbiAgICogXHU3NTU5XHU3QTdBID0gXHU0RTBEXHU1NDJGXHU3NTI4XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4ZHNoSG9tZSBcdTgxRUFcdThFQUJcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDlcdTMwMDJcbiAgICovXG4gIHNoYXJlZENvbmZpZ1Jvb3Q/OiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlPzogYm9vbGVhblxuICAvKiogXHU1QzMxXHU3RUVBXHU3QjQ5XHU1Rjg1XHU0RTBBXHU5NjUwXHVGRjA4XHU5RUQ4XHU4QkE0IDEyMHNcdUZGMDkgKi9cbiAgdGltZW91dE1zPzogbnVtYmVyXG4gIC8qKiBcdTk2NDRcdTUyQTBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgKi9cbiAgZW52PzogTm9kZUpTLlByb2Nlc3NFbnZcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZE5vZGUge1xuICAvKiogXHU3NTI4XHU0RThFIHNwYXduIFx1NzY4NCBub2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNiAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTYyOEEgT2JzaWRpYW4gXHU3Njg0IEVsZWN0cm9uIFx1NEU4Q1x1OEZEQlx1NTIzNlx1NUY1MyBOb2RlIFx1NzUyOCAqL1xuICB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhblxuICAvKiogXHU4QkU1IE5vZGUgXHU3Njg0IG1ham9yIFx1NzI0OFx1NjcyQ1x1RkYwOFx1NjNBMlx1NkQ0Qlx1NTkzMVx1OEQyNVx1NEUzQSAwXHVGRjA5ICovXG4gIG5vZGVNYWpvcjogbnVtYmVyXG4gIC8qKiBcdTYzQTJcdTZENEIvXHU1MUIzXHU3QjU2XHU4QkY0XHU2NjBFXHVGRjA4XHU0RjlCXHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIG5vdGVzOiBzdHJpbmdbXVxufVxuXG5leHBvcnQgdHlwZSBTZXJ2ZXJTdGF0dXMgPVxuICB8IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgfCB7IGtpbmQ6ICdzdGFydGluZycgfVxuICB8IHsga2luZDogJ3J1bm5pbmcnOyBwb3J0OiBudW1iZXI7IGhvc3Q6IHN0cmluZzsgdXJsOiBzdHJpbmc7IGF0dGFjaGVkOiBib29sZWFuIH1cbiAgfCB7IGtpbmQ6ICdlcnJvcic7IG1lc3NhZ2U6IHN0cmluZyB9XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU4REVGXHU1Rjg0XHU1QjlBXHU0RjREXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFx1NjI4QVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1NTE2NVx1NTNFM1x1ODlDNFx1ODMwM1x1NTMxNlx1RkYxQVx1NjMwN1x1NTQxMSBiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTkwRkRcdTYzQTVcdTUzRDcgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVEc2hCaW4oaW5wdXQ6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCFpbnB1dCkgcmV0dXJuIG51bGxcbiAgY29uc3QgcCA9IGlucHV0LnRyaW0oKVxuICBpZiAoIXApIHJldHVybiBudWxsXG4gIGNvbnN0IGV4cGFuZGVkID0gcC5yZXBsYWNlKC9efig/PSR8XFwvfFxcXFwpLywgb3MuaG9tZWRpcigpKVxuICBjb25zdCBhYnMgPSBwYXRoLmlzQWJzb2x1dGUoZXhwYW5kZWQpID8gcGF0aC5ub3JtYWxpemUoZXhwYW5kZWQpIDogcGF0aC5yZXNvbHZlKGV4cGFuZGVkKVxuICB0cnkge1xuICAgIGNvbnN0IHN0ID0gZnMuc3RhdFN5bmMoYWJzKVxuICAgIGlmIChzdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4oYWJzLCAnbGliJywgJ2Jpbi5qcycpXG4gICAgICByZXR1cm4gZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpID8gY2FuZGlkYXRlIDogbnVsbFxuICAgIH1cbiAgICBpZiAoc3QuaXNGaWxlKCkpIHJldHVybiBhYnNcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKiogXHU1RTM4XHU4OUMxIG5wbSBcdTUxNjhcdTVDNDAgbm9kZV9tb2R1bGVzIFx1NjgzOVx1RkYwOFx1NjMwOVx1NUU3M1x1NTNGMFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdsb2JhbE1vZHVsZVJvb3RzKCk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgcm9vdHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKHByb2Nlc3MuZW52LkRTSF9HTE9CQUxfTU9EVUxFUykgcm9vdHMucHVzaChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpXG4gIGNvbnN0IG5wbVJvb3QgPSBzcGF3blN5bmMoJ25wbScsIFsncm9vdCcsICctZyddLCB7XG4gICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICB0aW1lb3V0OiAxMF8wMDAsXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG4gIGlmIChucG1Sb290LnN0YXR1cyA9PT0gMCAmJiBucG1Sb290LnN0ZG91dCkge1xuICAgIGNvbnN0IGxpbmUgPSBucG1Sb290LnN0ZG91dC50cmltKCkuc3BsaXQoL1xccj9cXG4vKVswXVxuICAgIGlmIChsaW5lKSByb290cy5wdXNoKGxpbmUpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgcm9vdHMucHVzaCgnL29wdC9ob21lYnJldy9saWIvbm9kZV9tb2R1bGVzJywgJy91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcycpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2xpbnV4Jykge1xuICAgIHJvb3RzLnB1c2goJy91c3IvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2xpYicsICdub2RlX21vZHVsZXMnKSlcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgY29uc3QgYXBwRGF0YSA9IHByb2Nlc3MuZW52LkFQUERBVEFcbiAgICBpZiAoYXBwRGF0YSkgcm9vdHMucHVzaChwYXRoLmpvaW4oYXBwRGF0YSwgJ25wbScsICdub2RlX21vZHVsZXMnKSlcbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KHJvb3RzKV1cbn1cblxuLyoqXG4gKiBcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTUxNjVcdTUzRTNcdTMwMDJcdTRGMThcdTUxNDhcdTdFQTdcdUZGMUFcbiAqIDEuIFx1NjYzRVx1NUYwRlx1NEYyMFx1NTE2NVx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1RkYwOVx1MjE5MiAyLiBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgRFNIX0JJTiBcdTIxOTIgMy4gbnBtIHJvb3QgLWcgXHUyMTkyIDQuIFx1NUUzOFx1ODlDMVx1NTE2OFx1NUM0MFx1NjgzOVx1MzAwMlxuICogXHU2NzJBXHU2MjdFXHU1MjMwXHU2NUY2IGJpbiBcdTRFM0EgbnVsbFx1RkYwQ25vdGVzIFx1OEJGNFx1NjYwRVx1NTM5Rlx1NTZFMFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURzaEJpbihleHBsaWNpdD86IHN0cmluZyk6IHsgYmluOiBzdHJpbmcgfCBudWxsOyBub3Rlczogc3RyaW5nW10gfSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gbm9ybWFsaXplRHNoQmluKGV4cGxpY2l0ID8/IHByb2Nlc3MuZW52LkRTSF9CSU4pXG4gIGlmIChleHBsaWNpdEJpbiAmJiBmcy5leGlzdHNTeW5jKGV4cGxpY2l0QmluKSkge1xuICAgIHJldHVybiB7IGJpbjogZXhwbGljaXRCaW4sIG5vdGVzOiBbYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NDogJHtleHBsaWNpdEJpbn1gXSB9XG4gIH1cbiAgaWYgKGV4cGxpY2l0KSBub3Rlcy5wdXNoKGBcdTY2M0VcdTVGMEZcdThERUZcdTVGODRcdTRFMERcdTVCNThcdTU3Mjg6ICR7ZXhwbGljaXR9YClcblxuICBmb3IgKGNvbnN0IHJvb3Qgb2YgZ2xvYmFsTW9kdWxlUm9vdHMoKSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihyb290LCBEU0hfUkVMQVRJVkVfQklOKVxuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHJldHVybiB7IGJpbjogY2FuZGlkYXRlLCBub3RlczogWy4uLm5vdGVzLCBgXHU0RUNFXHU1MTY4XHU1QzQwXHU2QTIxXHU1NzU3XHU2ODM5XHU1M0QxXHU3M0IwOiAke2NhbmRpZGF0ZX1gXSB9XG4gICAgfVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NjcyQVx1NjI3RVx1NTIzMCBkc2ggXHU1Qjg5XHU4OEM1XHUzMDAyXHU4QkY3XHU1MTQ4XHU2MjY3XHU4ODRDOiBucG0gaW5zdGFsbCAtZyBAZGVlcHNlZWstYWkvZHNoXHVGRjBDXHU2MjE2XHU1NzI4XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IGRzaCBcdThERUZcdTVGODQnKVxuICByZXR1cm4geyBiaW46IG51bGwsIG5vdGVzIH1cbn1cblxuLyoqXG4gKiBcdTVFMzhcdTg5QzEgTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMENcdTYzQTJcdTZENEJcdTc1MjhcdUZGMDlcdTMwMDJcbiAqIE9ic2lkaWFuIFx1NEY1Q1x1NEUzQSBHVUkgXHU1RTk0XHU3NTI4XHU0RUNFIEZpbmRlciBcdTU0MkZcdTUyQThcdTY1RjZcdUZGMENQQVRIIFx1OTAxQVx1NUUzOFx1NTNFQVx1NjcwOVx1N0NGQlx1N0VERlx1NzZFRVx1NUY1NVxuICogXHVGRjA4L3Vzci9iaW46L2JpbjovdXNyL3NiaW46L3NiaW5cdUZGMDlcdUZGMENcdTRFMERcdTU0MkIgSG9tZWJyZXcgXHU3QjQ5XHU3NTI4XHU2MjM3XHU1Qjg5XHU4OEM1XHU3NkVFXHU1RjU1XHVGRjBDXG4gKiBcdTU2RTBcdTZCNjQgc3Bhd24oJ25vZGUnKSBcdTRGMUFcdTc2RjRcdTYzQTUgRU5PRU5UXHUzMDAyXHU4RkQ5XHU5MUNDXHU2MjhBXHU1RTM4XHU4OUMxXHU1Qjg5XHU4OEM1XHU0RjREXHU3RjZFXHU4ODY1XHU5RjUwXHVGRjFBXG4gKiAtIFBBVEggXHU0RTJEXHU3Njg0IG5vZGVcdUZGMDhzaGVsbCBcdTkxQ0NcdThGRDBcdTg4NENcdTY1RjZcdTVCNThcdTU3MjhcdUZGMDlcdUZGMUJcbiAqIC0gbWFjT1M6IC9vcHQvaG9tZWJyZXcvYmluL25vZGVcdUZGMDhBcHBsZSBTaWxpY29uXHVGRjA5XHUzMDAxL3Vzci9sb2NhbC9iaW4vbm9kZVx1RkYwOEludGVsXHVGRjA5XHVGRjFCXG4gKiAtIExpbnV4OiAvdXNyL2Jpbi9ub2RlXHUzMDAxL3Vzci9sb2NhbC9iaW4vbm9kZVx1MzAwMX4vLmxvY2FsL2Jpbi9ub2RlXHVGRjFCXG4gKiAtIFdpbmRvd3M6IFx1OTAxQVx1OEZDNyBgd2hlcmUgbm9kZWAgXHU4OUUzXHU2NzkwXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21tb25Ob2RlQmlucygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGJpbnM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgcGF0aEVudiA9IHByb2Nlc3MuZW52LlBBVEggPz8gJydcbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aEVudi5zcGxpdChwYXRoLmRlbGltaXRlcikpIHtcbiAgICBpZiAoZGlyLnRyaW0oKSkgYmlucy5wdXNoKHBhdGguam9pbihkaXIsICdub2RlJykpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgYmlucy5wdXNoKCcvb3B0L2hvbWVicmV3L2Jpbi9ub2RlJywgJy91c3IvbG9jYWwvYmluL25vZGUnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICBiaW5zLnB1c2goJy91c3IvYmluL25vZGUnLCAnL3Vzci9sb2NhbC9iaW4vbm9kZScsIHBhdGguam9pbihvcy5ob21lZGlyKCksICcubG9jYWwnLCAnYmluJywgJ25vZGUnKSlcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHdoZXJlID0gc3Bhd25TeW5jKCd3aGVyZScsIFsnbm9kZSddLCB7IGVuY29kaW5nOiAndXRmOCcsIHRpbWVvdXQ6IDEwXzAwMCwgd2luZG93c0hpZGU6IHRydWUgfSlcbiAgICAgIGlmICh3aGVyZS5zdGF0dXMgPT09IDAgJiYgd2hlcmUuc3Rkb3V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiB3aGVyZS5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLykpIHtcbiAgICAgICAgICBpZiAobGluZS50cmltKCkpIGJpbnMucHVzaChsaW5lLnRyaW0oKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICB9XG4gIC8vIFx1NTNCQlx1OTFDRFx1NEZERFx1NUU4Rlx1RkYwQ1x1NEZERFx1NzU1OVx1N0IyQ1x1NEUwMFx1NEUyQVx1NUI1OFx1NTcyOFx1NzY4NFxuICByZXR1cm4gWy4uLm5ldyBTZXQoYmlucyldXG59XG5cbi8qKlxuICogXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2XHUzMDAyXG4gKiBcdTlFRDhcdThCQTRcdTk4N0FcdTVFOEZcdUZGMUFcdTY2M0VcdTVGMEZcdThERUZcdTVGODQgXHUyMTkyIFx1N0NGQlx1N0VERiBgbm9kZWBcdUZGMDhQQVRIICsgXHU1RTM4XHU4OUMxXHU1Qjg5XHU4OEM1XHU4REVGXHU1Rjg0XHVGRjBDXHU4RkQ0XHU1NkRFXHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXG4gKiBcdTkwN0ZcdTUxNEQgT2JzaWRpYW4gR1VJIFx1NzNBRlx1NTg4MyBQQVRIIFx1N0YzQVx1NTkzMVx1NUJGQ1x1ODFGNCBzcGF3biBFTk9FTlRcdUZGMDlcdTIxOTIgXHU2MjdFXHU0RTBEXHU1MjMwXHU2NUY2XHU3RUQ5XHU1MUZBXHU2NjBFXHU3ODZFXHU5NTE5XHU4QkVGXHUzMDAyXG4gKiBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgXHU1QjlFXHU2RDRCXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjA4T2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XG4gKiBcdTRFMERcdTYzMDlcdTY2NkVcdTkwMUEgRWxlY3Ryb24gXHU4QkVEXHU0RTQ5XHU1NENEXHU1RTk0XHVGRjA5XHVGRjBDXHU1NkUwXHU2QjY0XHU0RUM1XHU1RjUzIHVzZUVtYmVkZGVkTm9kZSBcdTY2M0VcdTVGMEZcdTVGMDBcdTU0MkZcdTY1RjZcdTYyNERcdTVDMURcdThCRDVcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVOb2RlQmluKGV4cGxpY2l0Pzogc3RyaW5nLCBlbWJlZGRlZE5vZGVWZXJzaW9uPzogc3RyaW5nLCB1c2VFbWJlZGRlZCA9IGZhbHNlKTogUmVzb2x2ZWROb2RlIHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBleHBsaWNpdD8udHJpbSgpIHx8IHByb2Nlc3MuZW52LkRTSF9OT0RFXG4gIGlmIChleHBsaWNpdEJpbikge1xuICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRiBOb2RlOiAke2V4cGxpY2l0QmlufWApXG4gICAgcmV0dXJuIHsgbm9kZUJpbjogZXhwbGljaXRCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG4gIH1cbiAgaWYgKHVzZUVtYmVkZGVkICYmIHByb2Nlc3MuZXhlY1BhdGggJiYgZW1iZWRkZWROb2RlVmVyc2lvbikge1xuICAgIGNvbnN0IG1ham9yID0gTnVtYmVyKGVtYmVkZGVkTm9kZVZlcnNpb24uc3BsaXQoJy4nKVswXSkgfHwgMFxuICAgIGlmIChtYWpvciA+PSBOT0RFX1NRTElURV9NSU5fTUFKT1IpIHtcbiAgICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSAke2VtYmVkZGVkTm9kZVZlcnNpb259XHVGRjA4RUxFQ1RST05fUlVOX0FTX05PREVcdUZGMDlgKVxuICAgICAgcmV0dXJuIHsgbm9kZUJpbjogcHJvY2Vzcy5leGVjUGF0aCwgdXNlRWxlY3Ryb25Bc05vZGU6IHRydWUsIG5vZGVNYWpvcjogbWFqb3IsIG5vdGVzIH1cbiAgICB9XG4gICAgbm90ZXMucHVzaChgT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufSA8ICR7Tk9ERV9TUUxJVEVfTUlOX01BSk9SfVx1RkYwQ1x1NjVFMFx1NkNENVx1NTQyRlx1NzUyOGApXG4gIH1cbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY29tbW9uTm9kZUJpbnMoKSkge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOFx1N0NGQlx1N0VERiBOb2RlOiAke2NhbmRpZGF0ZX1gKVxuICAgICAgcmV0dXJuIHsgbm9kZUJpbjogY2FuZGlkYXRlLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICAgIH1cbiAgfVxuICBub3Rlcy5wdXNoKCdcdTY3MkFcdTYyN0VcdTUyMzAgTm9kZVx1MzAwMlx1OEJGN1x1NUI4OVx1ODhDNSBOb2RlXHVGRjA4aHR0cHM6Ly9ub2RlanMub3JnXHVGRjA5XHVGRjBDXHU2MjE2XHU1NzI4XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0JylcbiAgcmV0dXJuIHsgbm9kZUJpbjogJycsIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU3QUVGXHU1M0UzXHU2M0EyXHU2RDRCXHU0RTBFXHU3QjQ5XHU1Rjg1XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFx1NUY1M1x1NTI0RFx1OEZEMFx1ODg0Q1x1NzNBRlx1NTg4M1x1RkYwOE9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwOVx1ODFFQVx1NUUyNlx1NzY4NCBOb2RlIFx1NzI0OFx1NjcyQ1x1RkYxQlx1NjVFMFx1NTIxOSB1bmRlZmluZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWJlZGRlZE5vZGVWZXJzaW9uKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgdiA9IChwcm9jZXNzLnZlcnNpb25zIGFzIHsgbm9kZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkKT8ubm9kZVxuICAgIHJldHVybiB2IHx8IHVuZGVmaW5lZFxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBcdTdBRUZcdTUzRTNcdTY2MkZcdTU0MjZcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdTMwMDJcbiAqIFx1NzUyOCBub2RlOmh0dHAgXHU4MDBDXHU5NzVFXHU2RDRGXHU4OUM4XHU1NjY4IGZldGNoXHVGRjFBT2JzaWRpYW4gXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHU3Njg0IENTUCBcdTRGMUFcdTYyRTZcdTYyMkFcbiAqIFx1NUJGOSBodHRwOi8vMTI3LjAuMC4xIFx1NzY4NCBmZXRjaFx1RkYwQ1x1NUJGQ1x1ODFGNFwiXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXCJcdThCRUZcdTUyMjRcdTRFM0FcIlx1NkNBMVx1NjcwOVwiXHUzMDAyXG4gKiBOb2RlIFx1NzY4NCBodHRwIFx1NkEyMVx1NTc1N1x1NEUwRFx1NTNEN1x1OTg3NVx1OTc2MiBDU1AgXHU3RUE2XHU2NzVGXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BvcnRVcChob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTUwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCByZXEgPSBodHRwLmdldCh7IGhvc3QsIHBvcnQsIHBhdGg6ICcvJywgdGltZW91dDogdGltZW91dE1zIH0sIChyZXMpID0+IHtcbiAgICAgIHJlcy5yZXN1bWUoKVxuICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgIH0pXG4gICAgcmVxLm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgcmVxLmRlc3Ryb3koKVxuICAgICAgcmVzb2x2ZShmYWxzZSlcbiAgICB9KVxuICAgIHJlcS5vbignZXJyb3InLCAoKSA9PiByZXNvbHZlKGZhbHNlKSlcbiAgfSlcbn1cblxuLyoqIFx1OEY2RVx1OEJFMlx1N0I0OVx1NUY4NSBIVFRQIFx1NUMzMVx1N0VFQVx1RkYxQlx1OEQ4NVx1NjVGNlx1OEZENFx1NTZERSBmYWxzZSAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JSZWFkeShob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgdGltZW91dE1zID0gMTIwXzAwMCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWFkbGluZSA9IERhdGUubm93KCkgKyB0aW1lb3V0TXNcbiAgZm9yICg7Oykge1xuICAgIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0LCAxNTAwKSkgcmV0dXJuIHRydWVcbiAgICBpZiAoRGF0ZS5ub3coKSA+IGRlYWRsaW5lKSByZXR1cm4gZmFsc2VcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA1MDApKVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hlZFNlcnZlciB7XG4gIHByb2M6IENoaWxkUHJvY2Vzc1xuICB1cmw6IHN0cmluZ1xuICAvKiogdHJ1ZSA9IFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwQ1x1NjcyQVx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQiAqL1xuICBhdHRhY2hlZDogYm9vbGVhblxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFcdTYyOEEgcGVyLXZhdWx0IERTSF9IT01FIFx1NzY4NCBgcHJvZmlsZXMvYCBcdTY2RkZcdTYzNjJcdTRFM0FcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUJcbiAqIGB+Ly5kc2gvcHJvZmlsZXNgIFx1NzY4NFx1OEY2Rlx1OTRGRVx1MzAwMlx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1RkYwOFx1N0VBNiAxOTUgXHU0RTJBIEBkZWVwc2Vlay1haSBcdTUzMDVcdUZGMDlcdTUxNjhcdTVDNDBcbiAqIFx1NEUwMFx1NEVGRFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NkJDRlx1NEUyQSB2YXVsdCBcdTU0MDRcdTgxRUFcdTk0RkFcdTUxRTBcdTc2N0UgTUIgXHU3Njg0IG5vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTk0RkVcdTYzQTVcdUZGMUJza2lsbCBcdTVCOUFcdTRFNDlcbiAqIFx1NEU1Rlx1OTY4Rlx1NTE3MVx1NEVBQiBwcm9maWxlcy9hZ2VudC1wcmVzZXRzIFx1NEUwMFx1NUU3Nlx1NTkwRFx1NzUyOFx1MzAwMlxuICpcbiAqIFx1NTQwQ1x1NjVGNlx1NjI4QSBgLmFnZW50LXByZXNldHMvYCBcdThGNkZcdTk0RkVcdTUyMzBcdTUxNzFcdTRFQUIgYH4vLmRzaC8uYWdlbnQtcHJlc2V0c2BcdUZGMUFhZ2VudCBwcmVzZXRcbiAqIFx1NzY4NFx1NTNEMVx1NzNCMFx1NjgzOVx1NjYyRiBgZHNoSG9tZVBhdGgoJy5hZ2VudC1wcmVzZXRzJylgXHVGRjA4XHU4RERGXHU5NjhGIERTSF9IT01FXHVGRjA5XHVGRjBDcGVyLXZhdWx0XG4gKiBcdTZBMjFcdTVGMEZcdTgyRTVcdTRFMERcdTU0MENcdTZCNjVcdThGNkZcdTk0RkVcdUZGMENkc2ggXHU0RjFBXHU0RUNFIHBlci12YXVsdCBcdTc2RUVcdTVGNTVcdTYyN0UgcHJlc2V0IFx1MjAxNFx1MjAxNCBcdTc1MjhcdTYyMzdcdTgxRUFcdTVCOUFcdTRFNDlcdTc2ODRcbiAqIGBvYnNpZGlhbmAgcHJlc2V0XHVGRjA4XHU2MzAyXHU4RjdEIHZhdWx0IFx1NURFNVx1NTE3NyArIG9ic2lkaWFuLWNvbnZlbnRpb25zIHNraWxsXHVGRjA5XHU1QzMxXHU2MjdFXHU0RTBEXHU1MjMwXHVGRjBDXG4gKiBcdTg4NjhcdTczQjBcdTRFM0FcdTk3NjJcdTY3N0ZcdTkxQ0NcdTZDQTFcdTY3MDkgdmF1bHQgXHU1REU1XHU1MTc3XHUzMDAyXG4gKlxuICogXHU1REYyXHU1QjU4XHU1NzI4XHU3Njg0XHU3NzFGXHU1QjlFXHU3NkVFXHU1RjU1XHU0RjFBXHU4OEFCXHU2NkZGXHU2MzYyXHU0RTNBXHU4RjZGXHU5NEZFXHVGRjA4XHU2NUU3XHU3NkVFXHU1RjU1XHU1MTQ4XHU2NTM5XHU1NDBEXHU1OTA3XHU0RUZEXHU0RTNBIGA8bmFtZT4uYmFrLTx0cz5gXHVGRjBDXG4gKiBcdTc4NkVcdThCQTRcdTUxNzFcdTRFQUJcdTUzRUZcdTc1MjhcdTU0MEVcdTUzRUZcdTYyNEJcdTUyQThcdTUyMjBcdTk2NjRcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYXJlZFByb2ZpbGVzKGRzaEhvbWU6IHN0cmluZywgc2hhcmVkUm9vdDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghc2hhcmVkUm9vdCB8fCBkc2hIb21lID09PSBzaGFyZWRSb290KSByZXR1cm5cbiAgY29uc3QgbGlua0RpciA9IChuYW1lOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gcGF0aC5qb2luKGRzaEhvbWUsIG5hbWUpXG4gICAgICBjb25zdCBzaGFyZWRUYXJnZXQgPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgbmFtZSlcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzaGFyZWRUYXJnZXQpKSByZXR1cm5cbiAgICAgIGxldCBzdDogZnMuU3RhdHMgfCBudWxsID0gbnVsbFxuICAgICAgdHJ5IHtcbiAgICAgICAgc3QgPSBmcy5sc3RhdFN5bmModGFyZ2V0KVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHN0ID0gbnVsbFxuICAgICAgfVxuICAgICAgaWYgKHN0Py5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGlmIChmcy5yZWFscGF0aFN5bmModGFyZ2V0KSA9PT0gZnMucmVhbHBhdGhTeW5jKHNoYXJlZFRhcmdldCkpIHJldHVyblxuICAgICAgICBmcy51bmxpbmtTeW5jKHRhcmdldClcbiAgICAgICAgc3QgPSBudWxsXG4gICAgICB9XG4gICAgICBpZiAoc3Q/LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgY29uc3QgYmFrID0gYCR7dGFyZ2V0fS5iYWstJHtEYXRlLm5vdygpfWBcbiAgICAgICAgZnMucmVuYW1lU3luYyh0YXJnZXQsIGJhaylcbiAgICAgICAgY29uc29sZS5pbmZvKGBbZHNoLWhvc3RdIHBlci12YXVsdCAke25hbWV9IFx1NURGMlx1NTkwN1x1NEVGRFx1NEUzQSAke2Jha31cdUZGMENcdTY1MzlcdTc1MjhcdTUxNzFcdTRFQUJgKVxuICAgICAgfVxuICAgICAgZnMubWtkaXJTeW5jKGRzaEhvbWUsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgICBmcy5zeW1saW5rU3luYyhzaGFyZWRUYXJnZXQsIHRhcmdldCwgJ2RpcicpXG4gICAgICBjb25zb2xlLmluZm8oYFtkc2gtaG9zdF0gcGVyLXZhdWx0ICR7bmFtZX0gLT4gJHtzaGFyZWRUYXJnZXR9XHVGRjA4XHU4RjZGXHU5NEZFXHU1MTcxXHU0RUFCXHVGRjA5YClcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW2RzaC1ob3N0XSBcdTVFRkFcdTdBQ0JcdTUxNzFcdTRFQUIgJHtuYW1lfSBcdThGNkZcdTk0RkVcdTU5MzFcdThEMjVcdUZGMDhwZXItdmF1bHQgXHU1QzA2XHU3NTI4XHU3MkVDXHU3QUNCXHU3NkVFXHU1RjU1XHVGRjA5YCwgZXJyKVxuICAgIH1cbiAgfVxuICBsaW5rRGlyKCdwcm9maWxlcycpXG4gIGxpbmtEaXIoJy5hZ2VudC1wcmVzZXRzJylcbn1cblxuLyoqXG4gKiBwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0XCJcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcIlx1RkYxQVx1NjI4QVx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU3RjZFXHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCIGB+Ly5kc2hgXHVGRjBDXG4gKiBcdTUzRUFcdTk2OTRcdTc5QkJcdTRGMUFcdThCRERcdTY1NzBcdTYzNkVcdTMwMDJcbiAqXG4gKiBcdTUzOUZcdTc0MDZcdUZGMUFkc2ggXHU3Njg0IGBzZXR0aW5nc2BcdUZGMDhAZGVlcHNlZWstYWkvZHNoLXNldHRpbmdzLWZpbGVcdUZGMDlcdTRFMEUgYGNyZWRlbnRpYWxzYFxuICogXHVGRjA4QGRlZXBzZWVrLWFpL2RzaC1jcmVkZW50aWFscy1sb2NhbFx1RkYwOVx1NjNEMlx1NEVGNlx1OTBGRFx1NjUyRlx1NjMwMSBgcGF0aGAgXHU4OTg2XHU3NkQ2XHVGRjBDXHU5RUQ4XHU4QkE0XHU4REVGXHU1Rjg0XHU2NjJGXG4gKiBgPGRzaEhvbWU+L3NldHRpbmdzLnlhbWxgIC8gYDxkc2hIb21lPi8uY3JlZGVudGlhbHMueWFtbGBcdTMwMDJcdTU3MjhcdTUxNzFcdTRFQUIgcHJvZmlsZVxuICogXHU3Njg0IGBjb3JkaXMucGF0Y2gueW1sYCBcdTkxQ0NcdTYyOEFcdThGRDlcdTRFMjRcdTRFMkFcdTYzRDJcdTRFRjZcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUJcdTY4MzlcdTc2ODRcdTY1ODdcdTRFRjZcdUZGMENcdTZBMjFcdTU3OEJcdTkwMDlcdTYyRTlcdTMwMDFBUEkgXHU1QkM2XHU5NEE1XHUzMDAxXG4gKiBcdTRFM0JcdTk4OThcdTdCNDlcdTkxNERcdTRFMDBcdTZCMjFcdUZGMDhcdTU3MjhcdTRFRkJcdTYxMEYgdmF1bHQgXHU3Njg0IERTSCBcdTk3NjJcdTY3N0ZcdTYyMTZcdTc2RjRcdTYzQTVcdTY1Mzkgfi8uZHNoXHVGRjA5XHU1MzczXHU1M0VGXHU1MTY4IHZhdWx0IFx1NzUxRlx1NjU0OFx1MzAwMlxuICogXHU2Q0U4XHU2MTBGXHVGRjFBcHJvZmlsZXMgXHU1REYyXHU4RjZGXHU5NEZFXHU1MTcxXHU0RUFCXHVGRjBDXHU2MjQwXHU0RUU1XHU4RkQ5XHU5MUNDXHU1MTk5XHU1MTY1XHU3Njg0XHU2QjYzXHU2NjJGXHU1MTcxXHU0RUFCIHBhdGNoIFx1MjAxNFx1MjAxNCBcdTc1MjhcdTYyMzdcdTgxRUFcdTg4QzVcdTc2ODRcbiAqIFx1NjNEMlx1NEVGNlx1Njc2MVx1NzZFRVx1RkYwOGluc2VydFx1RkYwOVx1NUZDNVx1OTg3Qlx1NEZERFx1NzU1OVx1RkYwQ1x1NTNFQVx1NTQwOFx1NUU3Ni9cdTY2RjRcdTY1QjAgc2V0dGluZ3MvY3JlZGVudGlhbHMgXHU0RTI0XHU0RTJBXHU2NzYxXHU3NkVFXHUzMDAyXG4gKlxuICogcGF0Y2ggXHU2ODNDXHU1RjBGXHVGRjA4Y29yZGlzIGxvYWRlciBcdTc2ODQgYXBwbHlFbnRyeVBhdGNoZXNcdUZGMDlcdUZGMUFcdTUyMTdcdTg4NjhcdTkxQ0NcdTZCQ0ZcdTRFMkFcdTUxNDNcdTdEMjBcdTc2RjRcdTYzQTVcdTY2MkZcbiAqIGB7IGlkLCBpbnNlcnQ/LCBuYW1lPywgLi4ub3ZlcnJpZGVzIH1gXHVGRjBDb3ZlcnJpZGVzIFx1OTUyRVx1ODk4Nlx1NzZENlx1NTQwQ1x1NTQwRCB0YXJnZXQgXHU2NzYxXHU3NkVFXHVGRjBDXG4gKiBcdTZDQTFcdTY3MDkgYHVwZGF0ZTpgIFx1NTMwNVx1ODhDNVx1NUM0Mlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlU2hhcmVkQ29uZmlnUGF0Y2goZHNoSG9tZTogc3RyaW5nLCBzaGFyZWRSb290OiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFzaGFyZWRSb290IHx8IGRzaEhvbWUgPT09IHNoYXJlZFJvb3QpIHJldHVyblxuICB0cnkge1xuICAgIGNvbnN0IHNoYXJlZFByb2ZpbGVzID0gcGF0aC5qb2luKHNoYXJlZFJvb3QsICdwcm9maWxlcycpXG4gICAgY29uc3QgcGF0Y2hGaWxlID0gcGF0aC5qb2luKHNoYXJlZFByb2ZpbGVzLCAnd2ViJywgJ2NvcmRpcy5wYXRjaC55bWwnKVxuICAgIGNvbnN0IHNldHRpbmdzUGF0aCA9IHBhdGguam9pbihzaGFyZWRSb290LCAnc2V0dGluZ3MueWFtbCcpXG4gICAgY29uc3QgY3JlZGVudGlhbHNQYXRoID0gcGF0aC5qb2luKHNoYXJlZFJvb3QsICcuY3JlZGVudGlhbHMueWFtbCcpXG5cbiAgICBjb25zdCBibG9ja1NldHRpbmdzID0gYC0gaWQ6IHNldHRpbmdzXG4gIGNvbmZpZzpcbiAgICBwYXRoOiAke3NldHRpbmdzUGF0aH1cbmBcbiAgICBjb25zdCBibG9ja0NyZWRlbnRpYWxzID0gYC0gaWQ6IGNyZWRlbnRpYWxzXG4gIGNvbmZpZzpcbiAgICBwYXRoOiAke2NyZWRlbnRpYWxzUGF0aH1cbmBcblxuICAgIGxldCBjb250ZW50ID0gJydcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXRjaEZpbGUpKSB7XG4gICAgICBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHBhdGNoRmlsZSwgJ3V0ZjgnKVxuICAgIH1cbiAgICBjb25zdCBzdHJpcCA9IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvXFxzKy9nLCAnJylcbiAgICBjb25zdCBoYXNTZXR0aW5ncyA9IHN0cmlwKGNvbnRlbnQpLmluY2x1ZGVzKHN0cmlwKGJsb2NrU2V0dGluZ3MpKVxuICAgIGNvbnN0IGhhc0NyZWRlbnRpYWxzID0gc3RyaXAoY29udGVudCkuaW5jbHVkZXMoc3RyaXAoYmxvY2tDcmVkZW50aWFscykpXG4gICAgaWYgKGhhc1NldHRpbmdzICYmIGhhc0NyZWRlbnRpYWxzKSByZXR1cm5cblxuICAgIC8vIFx1NTNFQVx1NTcyOFx1NTE3MVx1NEVBQiBwYXRjaCBcdTRFM0FcdTdBN0FcdTY1NzBcdTdFQzQgYFtdYFx1RkYwOFx1NTE0MVx1OEJCOFx1NkNFOFx1OTFDQVx1RkYwQ1x1NjIxNlx1NjU4N1x1NEVGNlx1NEUwRFx1NUI1OFx1NTcyOFx1RkYwOVx1NjVGNlx1NTE5OVx1NTE2NVx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlxuICAgIC8vIFx1Njc2MVx1NzZFRVx1RkYxQlx1ODJFNVx1NzUyOFx1NjIzN1x1NURGMlx1ODFFQVx1NUI5QVx1NEU0OSBwYXRjaFx1RkYwOFx1NTk4Mlx1ODFFQVx1ODhDNVx1NjNEMlx1NEVGNlx1RkYwOVx1RkYwQ1x1NEUwRFx1NUYzQVx1ODg0Q1x1NjUzOVx1NTE5OSBcdTIwMTRcdTIwMTQgXHU2M0QwXHU3OTNBXHU2MjRCXHU1MkE4XHU1MkEwXHUzMDAyXG4gICAgY29uc3Qgd2l0aG91dENvbW1lbnRzID0gY29udGVudFxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLmZpbHRlcigobCkgPT4gIWwudHJpbSgpLnN0YXJ0c1dpdGgoJyMnKSlcbiAgICAgIC5qb2luKCdcXG4nKVxuICAgICAgLnRyaW0oKVxuICAgIGlmICh3aXRob3V0Q29tbWVudHMgPT09ICcnIHx8IHdpdGhvdXRDb21tZW50cyA9PT0gJ1tdJykge1xuICAgICAgICBjb25zdCBpbnNlcnRpb24gPSBibG9ja1NldHRpbmdzICsgYmxvY2tDcmVkZW50aWFsc1xuICAgICAgICBjb250ZW50ID0gYCMgZHNoLWRvY2sgXHU4MUVBXHU1MkE4XHU3RUY0XHU2MkE0XHVGRjFBcGVyLXZhdWx0IFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU2MzA3XHU1NDExXHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwQ1x1NEYxQVx1OEJERFx1NEVDRFx1OTY5NFx1NzlCQlx1RkYwOVxuJHtpbnNlcnRpb24udHJpbUVuZCgpfVxuYFxuICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKHBhdGNoRmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0Y2hGaWxlLCBjb250ZW50KVxuICAgICAgICBjb25zb2xlLmluZm8oYFtkc2gtaG9zdF0gcGVyLXZhdWx0IFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQjogc2V0dGluZ3MvY3JlZGVudGlhbHMgLT4gJHtzaGFyZWRSb290fWApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJ1tkc2gtaG9zdF0gXHU1MTcxXHU0RUFCIGNvcmRpcy5wYXRjaC55bWwgXHU1REYyXHU2NzA5XHU4MUVBXHU1QjlBXHU0RTQ5XHU1MTg1XHU1QkI5XHVGRjBDXHU4REYzXHU4RkM3XHU4MUVBXHU1MkE4XHU1MTk5XHU1MTY1XHVGRjFCJyArXG4gICAgICAgICAgJ1x1NTk4Mlx1OTcwMFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwQ1x1OEJGN1x1NTcyOCB+Ly5kc2gvcHJvZmlsZXMvd2ViL2NvcmRpcy5wYXRjaC55bWwgXHU2MjRCXHU1MkE4XHU1MkEwXHU1MTY1IHNldHRpbmdzL2NyZWRlbnRpYWxzIFx1NzY4NCBwYXRoIFx1ODk4Nlx1NzZENicsXG4gICAgICAgIClcbiAgICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWhvc3RdIFx1NTE5OVx1NTE2NVx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQiBwYXRjaCBcdTU5MzFcdThEMjVcdUZGMDhcdTVDMDZcdTYzMDkgcGVyLXZhdWx0IFx1NzJFQ1x1N0FDQlx1OTE0RFx1N0Y2RVx1NTQyRlx1NTJBOFx1RkYwOScsIGVycilcbiAgfVxufVxuXG4vKiogXHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IGRzaCB3ZWJcdTMwMDJcdThDMDNcdTc1MjhcdTY1QjlcdThEMUZcdThEMjNcdTc2RDFcdTU0MkMgcHJvYyBcdTc2ODQgZXhpdC9lcnJvclx1MzAwMiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxhdW5jaERzaChvcHRzOiBMYXVuY2hPcHRpb25zICYgeyBkc2hCaW46IHN0cmluZzsgbm9kZUJpbjogc3RyaW5nOyB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhbiB9KTogQ2hpbGRQcm9jZXNzIHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgYXJncyA9IFtvcHRzLmRzaEJpbiwgJ3dlYicsICctLWhvc3QnLCBob3N0LCAnLS1wb3J0JywgU3RyaW5nKHBvcnQpXVxuICBjb25zdCBlbnY6IE5vZGVKUy5Qcm9jZXNzRW52ID0ge1xuICAgIC4uLihvcHRzLmVudiA/PyBwcm9jZXNzLmVudiA/PyB7fSksXG4gICAgRFNIX0hPTUU6IG9wdHMuZHNoSG9tZSxcbiAgfVxuICBpZiAob3B0cy51c2VFbGVjdHJvbkFzTm9kZSkgZW52LkVMRUNUUk9OX1JVTl9BU19OT0RFID0gJzEnXG4gIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBzcGF3biAke29wdHMubm9kZUJpbn0gJHthcmdzLmpvaW4oJyAnKX1gKVxuICBjb25zb2xlLmluZm8oYFtkc2gtaG9zdF0gRFNIX0hPTUU9JHtvcHRzLmRzaEhvbWV9YClcbiAgcmV0dXJuIHNwYXduKG9wdHMubm9kZUJpbiwgYXJncywge1xuICAgIGVudixcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdwaXBlJ10sXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG59XG5cbi8qKlxuICogXHU0RTAwXHU5NTJFXCJcdTc4NkVcdTRGRERcdThGRDBcdTg4NENcIlx1RkYxQVxuICogMS4gXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTc2RjRcdTYzQTVcdTYzMDJcdTYzQTVcdUZGMDhhdHRhY2hlZFx1RkYwQ1x1NEUwRFx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQlx1RkYwOVx1RkYxQlxuICogMi4gXHU1NDI2XHU1MjE5XHU1QjlBXHU0RjREIGRzaCBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHUyMTkyIHNwYXduIFx1MjE5MiBcdTdCNDlcdTVGODVcdTVDMzFcdTdFRUFcdUZGMUJcbiAqIDMuIFx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1RkYwOFx1NTk4Mlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MCBFQUREUklOVVNFXHVGRjA5XHUyMTkyIFx1N0FDQlx1NTM3M1x1OEZENFx1NTZERVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlx1RkYwQ1x1NEUwRFx1NTE4RFx1NzZGMlx1N0I0OVx1MzAwMlxuICogXHU4RkQ0XHU1NkRFIFNlcnZlclN0YXR1c1x1MzAwMlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRHNoUnVubmluZyhvcHRzOiBMYXVuY2hPcHRpb25zKTogUHJvbWlzZTx7IHN0YXR1czogU2VydmVyU3RhdHVzOyBwcm9jPzogQ2hpbGRQcm9jZXNzIH0+IHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgdXJsID0gYGh0dHA6Ly8ke2hvc3R9OiR7cG9ydH0vYFxuXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfSB9XG4gIH1cblxuICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4ob3B0cy5kc2hCaW4pXG4gIGlmICghZm91bmQuYmluKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGZvdW5kLm5vdGVzW2ZvdW5kLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgZHNoIENMSScgfSB9XG4gIH1cbiAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKG9wdHMubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCBvcHRzLnVzZUVtYmVkZGVkTm9kZSlcbiAgaWYgKCFub2RlLm5vZGVCaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbm9kZS5ub3Rlc1tub2RlLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYnIH0gfVxuICB9XG4gIC8vIHBlci12YXVsdCBcdTUxNzFcdTRFQUJcdUZGMUFwcm9maWxlc1x1RkYwOFx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1RkYwOVx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQlx1NjgzOVx1RkYwQ3NldHRpbmdzL2NyZWRlbnRpYWxzXG4gIC8vIFx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQlx1NjgzOSBcdTIwMTRcdTIwMTQgXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU1MTY4XHU1QzQwXHU0RTAwXHU0RUZEXHVGRjBDXHU0RUM1XHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCXHUzMDAyXG4gIGlmIChvcHRzLnNoYXJlZENvbmZpZ1Jvb3QpIHtcbiAgICBlbnN1cmVTaGFyZWRQcm9maWxlcyhvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgICBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgfVxuICBjb25zdCBwcm9jID0gbGF1bmNoRHNoKHsgLi4ub3B0cywgZHNoQmluOiBmb3VuZC5iaW4sIG5vZGVCaW46IG5vZGUubm9kZUJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IG5vZGUudXNlRWxlY3Ryb25Bc05vZGUgfSlcblxuICAvLyBcdTY1MzZcdTk2QzYgc3RkZXJyIFx1NUMzRVx1OTBFOFx1RkYxQVx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1NjVGNlx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1NTM5Rlx1NTZFMFx1RkYwOFx1NTk4MiBFQUREUklOVVNFXHVGRjA5XG4gIGxldCBzdGRlcnJUYWlsID0gJydcbiAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4ge1xuICAgIHN0ZGVyclRhaWwgPSAoc3RkZXJyVGFpbCArIGQudG9TdHJpbmcoKSkuc2xpY2UoLTQwMDApXG4gIH0pXG5cbiAgY29uc3QgY2hpbGREaWVkID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICAgIHByb2Mub25jZSgnZXJyb3InLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICB9KVxuXG4gIGNvbnN0IHJlYWR5ID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICB3YWl0Rm9yUmVhZHkoaG9zdCwgcG9ydCwgb3B0cy50aW1lb3V0TXMgPz8gMTIwXzAwMCkudGhlbigoKSA9PiB0cnVlKSxcbiAgICBjaGlsZERpZWQudGhlbigoKSA9PiBmYWxzZSksXG4gIF0pXG5cbiAgaWYgKHJlYWR5KSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogZmFsc2UgfSwgcHJvYyB9XG4gIH1cblxuICAvLyBcdTVCNTBcdThGREJcdTdBMEJcdTVERjJcdTkwMDBcdTUxRkFcdUZGMUFcdTUxOERcdTYzQTJcdTRFMDBcdTZCMjFcdTdBRUZcdTUzRTNcdUZGMDhcdTUzRUZcdTgwRkRcdTg4QUJcdTUyMkJcdTc2ODRcdTVCOUVcdTRGOEJcdTYyQTJcdThERDFcdTdFRDFcdTVCOUFcdUZGMDlcdUZGMENcdTU0MjZcdTUyMTlcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTk1MTlcdThCRUZcbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9LCBwcm9jIH1cbiAgfVxuICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsKSB9LCBwcm9jIH1cbn1cblxuLyoqIFx1NEVDRSBzdGRlcnIgXHU1QzNFXHU5MEU4XHU2M0QwXHU3MEJDXHU1M0VGXHU4QkZCXHU5NTE5XHU4QkVGICovXG5mdW5jdGlvbiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gc3RkZXJyVGFpbC5zcGxpdCgvXFxyP1xcbi8pLmZpbHRlcihCb29sZWFuKVxuICBjb25zdCBhZGRyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0VBRERSSU5VU0UnKSlcbiAgY29uc3QgZXJyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0Vycm9yOicpKVxuICBpZiAoYWRkckxpbmUpIHtcbiAgICByZXR1cm4gJ1x1N0FFRlx1NTNFM1x1NURGMlx1ODhBQlx1NTM2MFx1NzUyOFx1RkYwOEVBRERSSU5VU0VcdUZGMDlcdTMwMDJcdThCRjdcdTYzNjJcdTRFMDBcdTRFMkFcdTdBRUZcdTUzRTNcdUZGMENcdTYyMTZcdTUxNDhcdTUwNUNcdTYzODlcdTUzNjBcdTc1MjhcdThCRTVcdTdBRUZcdTUzRTNcdTc2ODRcdTY3MERcdTUyQTFcdTU0MEVcdTkxQ0RcdThCRDUnXG4gIH1cbiAgaWYgKGVyckxpbmUpIHtcbiAgICBjb25zdCBjbGVhbmVkID0gZXJyTGluZS50cmltKCkuc2xpY2UoMCwgMzAwKVxuICAgIHJldHVybiBgZHNoIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtjbGVhbmVkfWBcbiAgfVxuICByZXR1cm4gJ0RTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkFcdUZGMDhcdTY1RTBcdThCRTZcdTdFQzZcdTk1MTlcdThCRUZcdUZGMDlcdTMwMDJcdThCRjdcdTY3RTVcdTc3MEIgT2JzaWRpYW4gXHU2M0E3XHU1MjM2XHU1M0YwIFtkc2hdIFx1NjVFNVx1NUZENydcbn1cblxuLyoqIFx1NTA1Q1x1NkI2Mlx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOFNJR1RFUk1cdUZGMENcdTdCNDlcdTVGODVcdTkwMDBcdTUxRkFcdUZGMUJcdThEODVcdTY1RjZcdTU0MEUgU0lHS0lMTFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BQcm9jZXNzKHByb2M6IENoaWxkUHJvY2VzcyB8IG51bGwgfCB1bmRlZmluZWQsIHRpbWVvdXRNcyA9IDUwMDApOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFwcm9jIHx8IHByb2MuZXhpdENvZGUgIT09IG51bGwgfHwgcHJvYy5zaWduYWxDb2RlICE9PSBudWxsKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Mua2lsbCgnU0lHS0lMTCcpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfSwgdGltZW91dE1zKVxuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH0pXG4gICAgdHJ5IHtcbiAgICAgIHByb2Mua2lsbCgnU0lHVEVSTScpXG4gICAgfSBjYXRjaCB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9XG4gIH0pXG59XG4iLCAiLyoqXG4gKiBcdThCQkVcdTdGNkVcdUZGMUFcdTVCNTdcdTZCQjUgKyBcdThCQkVcdTdGNkVcdTk4NzUgVUlcdTMwMDJcbiAqIFYwLjJcdUZGMUFEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdUZGMDhcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgLyBcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCIC8gXHU4MUVBXHU1QjlBXHU0RTQ5XHVGRjA5XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IHR5cGUgRHNoSG9tZU1vZGUgPSAnc2hhcmVkJyB8ICdwZXItdmF1bHQnIHwgJ2N1c3RvbSdcblxuZXhwb3J0IGludGVyZmFjZSBEc2hEb2NrU2V0dGluZ3Mge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluOiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU0RjE4XHU1MTQ4XHVGRjA5ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTRcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdDogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0OiBudW1iZXJcbiAgLyoqIERTSF9IT01FIFx1NkEyMVx1NUYwRlx1RkYxQXNoYXJlZD1cdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFCcGVyLXZhdWx0PVx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMUJjdXN0b209XHU4MUVBXHU1QjlBXHU0RTQ5ICovXG4gIGRzaEhvbWVNb2RlOiBEc2hIb21lTW9kZVxuICAvKiogXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NFx1RkYwOFx1NEVDNSBjdXN0b20gXHU2QTIxXHU1RjBGXHU3NTFGXHU2NTQ4XHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKiogXHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU6IGJvb2xlYW5cbiAgLyoqIE9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NjVGNlx1ODFFQVx1NTJBOFx1NjJDOVx1OEQ3NyBEU0ggKi9cbiAgYXV0b3N0YXJ0OiBib29sZWFuXG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEc2hEb2NrU2V0dGluZ3MgPSB7XG4gIGRzaEJpbjogJycsXG4gIG5vZGVCaW46ICcnLFxuICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgcG9ydDogMzA4MCxcbiAgZHNoSG9tZU1vZGU6ICdzaGFyZWQnLFxuICBkc2hIb21lOiAnJyxcbiAgdXNlRW1iZWRkZWROb2RlOiBmYWxzZSxcbiAgYXV0b3N0YXJ0OiB0cnVlLFxufVxuXG5leHBvcnQgY2xhc3MgRHNoRG9ja1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgY3VzdG9tSG9tZUVsPzogU2V0dGluZ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbilcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpc1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2OTgyXHU4OUM4IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdcdTI2RjUgRFNIIERvY2snIH0pXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zZXR0aW5ncy1kZXNjJyxcbiAgICAgIHRleHQ6ICdcdTYyOEFcdTVCOThcdTY1QjkgRGVlcFNlZWsgSGFybmVzcyBXZWIgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuXHVGRjFBXHU1QjlBXHU0RjREIGRzaCBcdTIxOTIgXHU1QjUwXHU4RkRCXHU3QTBCXHU4RkQwXHU4ODRDIFx1MjE5MiBcdTk3NjJcdTY3N0ZcdTVENENcdTUxNjVcdTMwMDJcdTUxNjhcdTdBMEJcdTVCOThcdTY1QjlcdUZGMENcdTk2RjZcdTgxRUFcdTc4MTRcdTMwMDInLFxuICAgIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjcwRFx1NTJBMVx1NjNBN1x1NTIzNiAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU2NzBEXHU1MkExJyB9KVxuICAgIGNvbnN0IHN0YXR1c0xpbmUgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTY3MERcdTUyQTFcdTcyQjZcdTYwMDEnKVxuICAgICAgLnNldERlc2ModGhpcy5kZXNjcmliZVN0YXR1cygpKVxuICAgIGNvbnN0IGJ0bnMgPSBzdGF0dXNMaW5lLmNvbnRyb2xFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1idG5zJyB9KVxuICAgIGNvbnN0IHN0YXJ0QnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdtb2QtY3RhJywgdGV4dDogJ1x1MjVCNiBcdTU0MkZcdTUyQTgnIH0pXG4gICAgc3RhcnRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMuZGlzcGxheSgpKVxuICAgIH1cbiAgICBjb25zdCBzdG9wQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHUyNUEwIFx1NTA1Q1x1NkI2MicgfSlcbiAgICBzdG9wQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0b3AoKS50aGVuKCgpID0+IHRoaXMuZGlzcGxheSgpKVxuICAgIH1cbiAgICBjb25zdCBvcGVuQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJyB9KVxuICAgIG9wZW5CdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlblBhbmVsKClcbiAgICB9XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTk2OEYgT2JzaWRpYW4gXHU4MUVBXHU1MkE4XHU1NDJGXHU1MkE4JylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b3N0YXJ0KS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU4RkQwXHU4ODRDXHU2NUY2IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdThGRDBcdTg4NENcdTY1RjYnIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnZHNoIENMSSBcdThERUZcdTVGODQnKVxuICAgICAgLnNldERlc2MoJ1x1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0Qlx1RkYwOERTSF9CSU4gXHUyMTkyIG5wbSByb290IC1nIFx1MjE5MiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTc2RUVcdTVGNTVcdUZGMDlcdTMwMDJcdTUzRUZcdTU4NkIgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1NjIxNiBiaW4uanMgXHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9saWIvbm9kZV9tb2R1bGVzL0BkZWVwc2Vlay1haS9kc2gnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hCaW4gPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuZGV0ZWN0TGluZSA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ05vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTlcdUZGMDhcdTdDRkJcdTdFREYgbm9kZSBcdTY3MDBcdTdBMzNcdTVCOUFcdUZGMDlcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvb3B0L2hvbWVicmV3L2Jpbi9ub2RlJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mubm9kZUJpbilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4gPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlJylcbiAgICAgIC5zZXREZXNjKCdFTEVDVFJPTl9SVU5fQVNfTk9ERVx1MzAwMlx1OUVEOFx1OEJBNFx1NTE3M1x1OTVFRFx1MjAxNFx1MjAxNFx1NUI5RVx1NkQ0QiBPYnNpZGlhbiBcdTRFOENcdThGREJcdTUyMzZcdTRFRTUgTm9kZSBcdTZBMjFcdTVGMEZcdThGRDBcdTg4NENcdTRGMUFcdTYzMDJcdThENzdcdUZGMENcdTRFQzVcdTU3MjhcdTlBOENcdThCQzFcdTUzRUZcdTc1MjhcdTY1RjZcdTVGMDBcdTU0MkZcdTMwMDInKVxuICAgICAgLmFkZFRvZ2dsZSgodCkgPT5cbiAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlID0gdlxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTdGNTFcdTdFREMgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1N0Y1MVx1N0VEQycgfSlcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTU3RkFcdTUxQzZcdUZGMDknKVxuICAgICAgLnNldERlc2MoJ1x1NUI5OFx1NjVCOVx1OUVEOFx1OEJBNCAzMDgwXHUzMDAyc2hhcmVkL2N1c3RvbSBcdTZBMjFcdTVGMEZcdTc2RjRcdTYzQTVcdTRGN0ZcdTc1MjhcdUZGMUJwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU1NzI4XHU2QjY0XHU1N0ZBXHU3ODQwXHU0RTBBXHU2MzA5IHZhdWx0IFx1NkQzRVx1NzUxRlx1NzJFQ1x1N0FDQlx1N0FFRlx1NTNFM1x1RkYwOFx1NkJDRiB2YXVsdCBcdTcyRUNcdTUzNjBcdUZGMENcdTRGMUFcdThCRERcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdUZGMDlcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJzMwODAnKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuID0gTnVtYmVyKHYudHJpbSgpKVxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCA9IE51bWJlci5pc0ludGVnZXIobikgJiYgbiA+PSAwICYmIG4gPD0gNjU1MzUgPyBuIDogMzA4MFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMubmV0UHJldmlldyA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTVcdUZGMDhEU0hfSE9NRVx1RkYwOVx1NEUwRVx1NEYxQVx1OEJERFx1OTY5NFx1NzlCQicgfSlcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTZBMjFcdTVGMEYnKVxuICAgICAgLnNldERlc2MoJ3Blci12YXVsdCBcdTZBMjFcdTVGMEYgPSBcdTRGMUFcdThCRERcdTYzMDlcdTVFOTNcdTk2OTRcdTc5QkJcdUZGMDhcdTU0MDRcdTVFOTNcdTk3NjJcdTY3N0ZcdTUzRUFcdTY2M0VcdTc5M0FcdTY3MkNcdTVFOTNcdTUyMUJcdTVFRkFcdTc2ODRcdTRGMUFcdThCRERcdUZGMDlcdUZGMENcdTRGNDZcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1N0Y2RVx1NEUwRVx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1NTE2OFx1NUM0MFx1NTE3MVx1NEVBQlx1NEUwMFx1NEVGRFx1RkYwQ1x1OTE0RFx1NEUwMFx1NkIyMVx1NTE2OFx1NUU5M1x1NzUxRlx1NjU0OFx1MzAwMicpXG4gICAgICAuYWRkRHJvcGRvd24oKGRkKSA9PiB7XG4gICAgICAgIGRkLmFkZE9wdGlvbignc2hhcmVkJywgJ1x1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMDhcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU0RTAwXHU1OTU3XHU5MTREXHU3RjZFXHUzMDAxXHU2M0QyXHU0RUY2XHU0RTBFXHU0RjFBXHU4QkREXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdwZXItdmF1bHQnLCAnXHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERCB+Ly5kc2gvdmF1bHRzLzxcdTU0MEQ+LTxoYXNoPlx1RkYwOFx1OTE0RFx1N0Y2RVx1NEUwRVx1NjNEMlx1NEVGNlx1NEVDRFx1NTE3MVx1NEVBQlx1RkYwOScpXG4gICAgICAgIGRkLmFkZE9wdGlvbignY3VzdG9tJywgJ1x1ODFFQVx1NUI5QVx1NEU0OVx1OERFRlx1NUY4NCcpXG4gICAgICAgIGRkLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlKVxuICAgICAgICBkZC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlID0gdiBhcyBEc2hIb21lTW9kZVxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgdGhpcy5jdXN0b21Ib21lRWw/LnNldERpc2FibGVkKHYgIT09ICdjdXN0b20nKVxuICAgICAgICAgIHRoaXMuaG9tZVByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRHNoSG9tZSgpXG4gICAgICAgICAgdGhpcy5uZXRQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZU5ldCgpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgdGhpcy5jdXN0b21Ib21lRWwgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTgxRUFcdTVCOUFcdTRFNDkgRFNIX0hPTUUgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL1VzZXJzL3lvdS8uZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUgPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuaG9tZVByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRHNoSG9tZSgpXG4gICAgICAgICAgfSksXG4gICAgICApXG4gICAgdGhpcy5jdXN0b21Ib21lRWwuc2V0RGlzYWJsZWQodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUgIT09ICdjdXN0b20nKVxuXG4gICAgdGhpcy5ob21lUHJldmlldyA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgIHRoaXMuaG9tZVByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRHNoSG9tZSgpXG4gICAgdGhpcy5uZXRQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZU5ldCgpXG4gIH1cblxuICBwcml2YXRlIGRldGVjdExpbmUhOiBIVE1MRWxlbWVudFxuICBwcml2YXRlIGhvbWVQcmV2aWV3ITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBuZXRQcmV2aWV3ITogSFRNTEVsZW1lbnRcblxuICBwcml2YXRlIGRlc2NyaWJlU3RhdHVzKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICByZXR1cm4gYCR7cy51cmx9XHVGRjA4JHtzLmF0dGFjaGVkID8gJ1x1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnXHU1QjUwXHU4RkRCXHU3QTBCXHU4RkQwXHU4ODRDXHU0RTJEJ31cdUZGMDlgXG4gICAgfVxuICAgIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHJldHVybiAnXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2XHVGRjA4XHU5OTk2XHU2QjIxXHU3RUE2IDEwIFx1NzlEMlx1RkYwQ1x1OTcwMFx1NTIxRFx1NTlDQlx1NTMxNiBwcm9maWxlXHVGRjA5J1xuICAgIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHJldHVybiBgXHU1OTMxXHU4RDI1OiAke3MubWVzc2FnZX1gXG4gICAgcmV0dXJuICdcdTY3MkFcdThGRDBcdTg4NEMnXG4gIH1cblxuICBwcml2YXRlIGRlc2NyaWJlRGV0ZWN0KCk6IHN0cmluZyB7XG4gICAgY29uc3QgaW5mbyA9IHRoaXMucGx1Z2luLmRldGVjdEluZm8oKVxuICAgIHJldHVybiBbXG4gICAgICBgZHNoOiAke2luZm8uZHNoQmluID8/ICdcdTY3MkFcdTYyN0VcdTUyMzAnfSR7aW5mby5kc2hOb3Rlcy5sZW5ndGggPyBgXHVGRjA4JHtpbmZvLmRzaE5vdGVzLmpvaW4oJ1x1RkYxQicpfVx1RkYwOWAgOiAnJ31gLFxuICAgICAgYG5vZGU6ICR7aW5mby5ub2RlTm90ZXMuam9pbignXHVGRjFCJyl9YCxcbiAgICBdLmpvaW4oJ1xcbicpXG4gIH1cblxuICBwcml2YXRlIGRlc2NyaWJlRHNoSG9tZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGhvbWUgPSB0aGlzLnBsdWdpbi5lZmZlY3RpdmVEc2hIb21lKClcbiAgICBjb25zdCBzaGFyZWQgPSB0aGlzLnBsdWdpbi5lZmZlY3RpdmVTaGFyZWRDb25maWdSb290KClcbiAgICBpZiAoc2hhcmVkKSB7XG4gICAgICByZXR1cm4gYFx1NEYxQVx1OEJERFx1NzZFRVx1NUY1NTogJHtob21lfVxcblx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQjogJHtzaGFyZWR9XHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjhcdTVFOTNcdTc1MUZcdTY1NDhcdUZGMDlgXG4gICAgfVxuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU4REVGXHU1Rjg0OiAke2hvbWV9YFxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZU5ldCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBvcnQgPSB0aGlzLnBsdWdpbi5lZmZlY3RpdmVQb3J0KClcbiAgICBjb25zdCBtb2RlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGVcbiAgICBjb25zdCBzdWZmaXggPSBtb2RlID09PSAncGVyLXZhdWx0JyA/ICdcdUZGMDhcdTY3MkMgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RTBFXHU1MTc2XHU0RUQ2IHZhdWx0IFx1OTY5NFx1NzlCQlx1RkYwOScgOiAnXHVGRjA4c2hhcmVkL2N1c3RvbVx1RkYxQVx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdUZGMDknXG4gICAgcmV0dXJuIGBcdTc1MUZcdTY1NDhcdTdBRUZcdTUzRTM6ICR7cG9ydH0ke3N1ZmZpeH1gXG4gIH1cbn1cbiIsICIvKipcbiAqIERzaFdlYlZpZXcgXHUyMDE0XHUyMDE0IFx1NjI4QVx1NUI5OFx1NjVCOSBEU0ggV2ViICgxMjcuMC4wLjE6PHBvcnQ+KSBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW4gXHU5NzYyXHU2NzdGXHUzMDAyXG4gKiBcdTVFMjZcdTVCOENcdTY1NzRcdThGQzdcdTdBMEJcdTcyQjZcdTYwMDFcdUZGMUFcdTUyQTBcdThGN0RcdTUyQThcdTc1M0IgLyBcdTk1MTlcdThCRUZcdTUzNjFcdTcyNDdcdUZGMDhcdTU0MkJcdTkxQ0RcdThCRDVcdUZGMDkvIFx1NjcyQVx1NTQyRlx1NTJBOFx1N0E3QVx1NzJCNlx1NjAwMSAvIFx1NTZGRVx1NjgwN1x1NURFNVx1NTE3N1x1NjgwRlx1MzAwMlxuICogaWZyYW1lIFx1NjMwN1x1NTQxMVx1NUI5OFx1NjVCOVx1NjcwRFx1NTJBMVx1RkYwQ1VJIFx1NTNFQVx1NjYyRlwiXHU4MjM5XHU1NzVFXCJcdTU5MTZcdTU4RjNcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgc2V0SWNvbiB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCBjb25zdCBEU0hfV0VCX1ZJRVdfVFlQRSA9ICdkc2gtZG9jay13ZWInXG5cbnR5cGUgVWlTdGF0ZSA9ICdydW5uaW5nJyB8ICdzdGFydGluZycgfCAnZXJyb3InIHwgJ3N0b3BwZWQnXG5cbmV4cG9ydCBjbGFzcyBEc2hXZWJWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwcml2YXRlIGlmcmFtZUVsOiBIVE1MSUZyYW1lRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgcGlsbEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgb3ZlcmxheUVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgdG9nZ2xlQnRuOiBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgY3VycmVudDogVWlTdGF0ZSA9ICdzdG9wcGVkJ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSBwbHVnaW46IERzaERvY2tQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGxlYWYpXG4gIH1cblxuICBvdmVycmlkZSBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBEU0hfV0VCX1ZJRVdfVFlQRVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0RTSCBEb2NrJ1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiAnYW5jaG9yJ1xuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jaycgfSlcblxuICAgIC8vIC0tLS0gXHU1OTM0XHU5MEU4XHU1REU1XHU1MTc3XHU2ODBGIC0tLS1cbiAgICBjb25zdCBoZWFkZXIgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWhlYWRlcicgfSlcbiAgICBjb25zdCBsb2dvID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWxvZ28nIH0pXG4gICAgc2V0SWNvbihsb2dvLCAnYW5jaG9yJylcbiAgICBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXRpdGxlJywgdGV4dDogJ0RTSCBEb2NrJyB9KVxuICAgIHRoaXMucGlsbEVsID0gaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay1waWxsJyB9KVxuICAgIGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGFjZXInIH0pXG5cbiAgICB0aGlzLnRvZ2dsZUJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgdGhpcy50b2dnbGVCdG4ub25jbGljayA9ICgpID0+IHZvaWQgdGhpcy5vblRvZ2dsZSgpXG5cbiAgICBjb25zdCByZWZyZXNoQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHJlZnJlc2hCdG4sICdyZWZyZXNoLWN3JylcbiAgICByZWZyZXNoQnRuLnRpdGxlID0gJ1x1NTIzN1x1NjVCMCdcbiAgICByZWZyZXNoQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnJlbG9hZCgpXG5cbiAgICBjb25zdCBwb3BvdXRCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24ocG9wb3V0QnRuLCAnbWF4aW1pemUtMicpXG4gICAgcG9wb3V0QnRuLnRpdGxlID0gJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOFx1NzJFQ1x1N0FDQlx1OEZEQlx1N0EwQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOSdcbiAgICBwb3BvdXRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpXG4gICAgfVxuXG4gICAgY29uc3QgYnJvd3NlckJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihicm93c2VyQnRuLCAnZXh0ZXJuYWwtbGluaycpXG4gICAgYnJvd3NlckJ0bi50aXRsZSA9ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAnXG4gICAgYnJvd3NlckJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKClcbiAgICB9XG5cbiAgICAvLyAtLS0tIFx1NEUzQlx1NEY1M1x1RkYxQWlmcmFtZSArIFx1NzJCNlx1NjAwMVx1ODk4Nlx1NzZENlx1NUM0MiAtLS0tXG4gICAgY29uc3QgYm9keSA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYm9keScgfSlcbiAgICB0aGlzLmlmcmFtZUVsID0gYm9keS5jcmVhdGVFbCgnaWZyYW1lJywgeyBjbHM6ICdkc2gtZG9jay1mcmFtZScgfSlcbiAgICB0aGlzLm92ZXJsYXlFbCA9IGJvZHkuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stb3ZlcmxheScgfSlcblxuICAgIC8vIFx1NzJCNlx1NjAwMVx1ODA1NFx1NTJBOFxuICAgIHRoaXMucGx1Z2luLm9uU3RhdHVzQ2hhbmdlKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIHRoaXMucmVmcmVzaCgpXG5cbiAgICAvLyBcdTUxNUNcdTVFOTVcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTgyRTVcdTY3MERcdTUyQTFcdTY3MkFcdTU0MkZcdTUyQThcdTRFMTRcdTdBRUZcdTUzRTNcdTUzRUZcdTc1MjhcdUZGMENcdTVDMURcdThCRDVcdTYyQzlcdThENzdcbiAgICB2b2lkIHRoaXMuZW5zdXJlU3RhcnRlZCgpXG5cbiAgICAvLyBcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTUyMzdcdTY1QjBcdTRFMDBcdTZCMjFcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXHVGRjFBXHU3NTI4XHU2MjM3XHU2QjY0XHU1MjNCXHU2QjYzXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0ZcdTc2ODRcdTdBOTdcdTUzRTNcbiAgICAvLyBcdTVDMzFcdTY2MkZcIlx1NUY1M1x1NTI0RCB2YXVsdFwiXHVGRjBDXHU2NUUwXHU5NzAwXHU3QjQ5IGZvY3VzL2FjdGl2ZS1sZWFmLWNoYW5nZSBcdTRFOEJcdTRFRjZcdTMwMDJcbiAgICB0aGlzLnBsdWdpbi5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgfVxuXG4gIG92ZXJyaWRlIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9uVG9nZ2xlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0b3AoKVxuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdGFydCgpXG4gICAgfVxuICAgIHRoaXMucmVmcmVzaCgpXG4gIH1cblxuICAvKiogXHU5NzYyXHU2NzdGXHU2MjUzXHU1RjAwXHU2NUY2XHU3ODZFXHU0RkREXHU2NzBEXHU1MkExXHU1NzI4XHU4REQxXHVGRjA4XHU1REYyXHU1NzI4XHU4REQxXHU1MjE5XHU2MzAyXHU2M0E1XHVGRjA5ICovXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlU3RhcnRlZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAnc3RvcHBlZCcgfHwgcy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdGFydCgpXG4gICAgICB0aGlzLnJlZnJlc2goKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBsZXQgdWk6IFVpU3RhdGVcbiAgICBsZXQgcGlsbFRleHQgPSAnJ1xuICAgIGxldCBwaWxsQ2xzID0gJydcblxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgdWkgPSAncnVubmluZydcbiAgICAgIHBpbGxUZXh0ID0gYFx1MjVDRiAke3MucG9ydH0ke3MuYXR0YWNoZWQgPyAnIFx1MDBCNyBcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJyd9YFxuICAgICAgcGlsbENscyA9ICdpcy1ydW5uaW5nJ1xuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB1aSA9ICdzdGFydGluZydcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjVDQyBcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjYnXG4gICAgICBwaWxsQ2xzID0gJ2lzLXN0YXJ0aW5nJ1xuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICB1aSA9ICdlcnJvcidcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjcxNSBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnXG4gICAgICBwaWxsQ2xzID0gJ2lzLWVycm9yJ1xuICAgIH0gZWxzZSB7XG4gICAgICB1aSA9ICdzdG9wcGVkJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNCIFx1NjcyQVx1OEZEMFx1ODg0QydcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RvcHBlZCdcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnQgPSB1aVxuICAgIGlmICh0aGlzLnBpbGxFbCkge1xuICAgICAgdGhpcy5waWxsRWwuc2V0VGV4dChwaWxsVGV4dClcbiAgICAgIHRoaXMucGlsbEVsLmNsYXNzTmFtZSA9IGBkc2gtZG9jay1waWxsICR7cGlsbENsc31gXG4gICAgfVxuICAgIGlmICh0aGlzLnRvZ2dsZUJ0bikge1xuICAgICAgdGhpcy50b2dnbGVCdG4uZW1wdHkoKVxuICAgICAgc2V0SWNvbih0aGlzLnRvZ2dsZUJ0biwgcy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnID8gJ3NxdWFyZScgOiAncGxheScpXG4gICAgICB0aGlzLnRvZ2dsZUJ0bi50aXRsZSA9IHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJyA/ICdcdTUwNUNcdTZCNjInIDogJ1x1NTQyRlx1NTJBOCdcbiAgICB9XG5cbiAgICAvLyBpZnJhbWUgXHU0RTBFXHU4OTg2XHU3NkQ2XHU1QzQyXG4gICAgaWYgKHVpID09PSAncnVubmluZycpIHtcbiAgICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuaWZyYW1lRWwuc3JjICE9PSB0aGlzLnBsdWdpbi5iYXNlVXJsKSB7XG4gICAgICAgIHRoaXMuaWZyYW1lRWwuc3JjID0gdGhpcy5wbHVnaW4uYmFzZVVybFxuICAgICAgfVxuICAgICAgdGhpcy5zaG93T3ZlcmxheShudWxsKVxuICAgIH0gZWxzZSBpZiAodWkgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJTdGFydGluZygpKVxuICAgIH0gZWxzZSBpZiAodWkgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJFcnJvcihzLmtpbmQgPT09ICdlcnJvcicgPyBzLm1lc3NhZ2UgOiAnXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGJykpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJTdG9wcGVkKCkpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLSBcdTg5ODZcdTc2RDZcdTVDNDJcdTZFMzJcdTY3RDMgLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgc2hvd092ZXJsYXkoY29udGVudDogSFRNTEVsZW1lbnQgfCBudWxsKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLm92ZXJsYXlFbCkgcmV0dXJuXG4gICAgdGhpcy5vdmVybGF5RWwuZW1wdHkoKVxuICAgIGlmIChjb250ZW50KSB7XG4gICAgICB0aGlzLm92ZXJsYXlFbC5hcHBlbmRDaGlsZChjb250ZW50KVxuICAgICAgdGhpcy5vdmVybGF5RWwucmVtb3ZlQXR0cmlidXRlKCdoaWRkZW4nKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBcdThGRDBcdTg4NENcdTRFMkRcdUZGMUFcdTY2M0VcdTVGMEZcdTk2OTBcdTg1Q0ZcdTg5ODZcdTc2RDZcdTVDNDJcdUZGMDhcdTU0MjZcdTUyMTlcdTdBN0FcdTc2ODRcdTdFRERcdTVCRjlcdTVCOUFcdTRGNERcdTVDNDJcdTRGMUFcdTYzMjFcdTRGNEYgaWZyYW1lXHVGRjA5XG4gICAgICB0aGlzLm92ZXJsYXlFbC5zZXRBdHRyaWJ1dGUoJ2hpZGRlbicsICcnKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhcnRpbmcoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGlubmVyJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdcdTZCNjNcdTU3MjhcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgRFNIIFdlYlx1MjAyNicgfSlcbiAgICBib3guY3JlYXRlRGl2KHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsXG4gICAgICB0ZXh0OiAnXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU5NzAwXHU1MjFEXHU1OUNCXHU1MzE2IHByb2ZpbGVcdUZGMDhcdTdFQTYgMTAgXHU3OUQyXHVGRjA5XHVGRjFCXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwXHU3NTI4XHU2NUY2XHU1QzA2XHU4MUVBXHU1MkE4XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyxcbiAgICB9KVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRXJyb3IobWVzc2FnZTogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbGVydC10cmlhbmdsZScpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLW1zZycsIHRleHQ6IG1lc3NhZ2UgfSlcbiAgICBjb25zdCByZXRyeSA9IGJveC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1idG4nLCB0ZXh0OiAnXHU5MUNEXHU4QkQ1JyB9KVxuICAgIHJldHJ5Lm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB9XG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdG9wcGVkKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYW5jaG9yJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NjcyQVx1OEZEMFx1ODg0QycgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJywgdGV4dDogJ1x1NzBCOVx1NTFGQlx1NTQyRlx1NTJBOFx1RkYwQ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFx1NTA1Q1x1OTc2MFx1OEZEQlx1Njc2NScgfSlcbiAgICBjb25zdCBzdGFydCA9IGJveC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1idG4gbW9kLWN0YScsIHRleHQ6ICdcdTU0MkZcdTUyQTggRFNIJyB9KVxuICAgIHN0YXJ0Lm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB9XG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZWxvYWQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5jdXJyZW50ID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuaWZyYW1lRWwuc3JjID0gdGhpcy5wbHVnaW4uYmFzZVVybFxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogY3VycmVudFZhdWx0LnRzIFx1MjAxNFx1MjAxNCBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdTMwMDJcbiAqXG4gKiBkc2gtZG9jayBcdThERDFcdTU3MjggT2JzaWRpYW4gXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU4MEZEXHU2MkZGXHU1MjMwXHU2NzAwXHU2NzQzXHU1QTAxXHU3Njg0XHU1RjUzXHU1MjREIHZhdWx0XHVGRjA4XHU3QTk3XHU1M0UzXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU2NUY2XHVGRjBDXG4gKiBgYXBwLnZhdWx0LmdldE5hbWUoKWAgKyBgYWRhcHRlci5nZXRCYXNlUGF0aCgpYFx1RkYwOVx1MzAwMkRTSCBcdTc2ODRcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjZcbiAqIGRzaC10b29sLW9ic2lkaWFuLXZhdWx0IFx1OEREMVx1NTcyOFx1NzJFQ1x1N0FDQiBub2RlIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1NEUyNFx1ODAwNVx1OTAxQVx1OEZDN1x1NEUwMFx1NEUyQVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1ODlFM1x1ODAyNlx1OTAxQVx1NEZFMVx1RkYxQVxuICpcbiAqICAgPGhvbWVkaXI+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICAgeyBuYW1lLCBwYXRoLCB1cGRhdGVkQXQgfVxuICpcbiAqIC0gXHU0RjREXHU3RjZFXHU1NkZBXHU1QjlBXHU1NzI4IGB+Ly5kc2hgXHVGRjA4XHU0RTBFIGRzaC1kb2NrIFx1NzY4NCBEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdTY1RTBcdTUxNzNcdUZGMDlcdUZGMENcdTRFRkJcdTRGNTVcdTZBMjFcdTVGMEZcbiAqICAgXHU0RTBCIERTSCBcdTRGQTdcdTkwRkRcdThCRkJcdTVGOTdcdTUyMzBcdUZGMUJcbiAqIC0gXHU1OTFBXHU3QTk3XHU1M0UzXHU1NzNBXHU2NjZGXHVGRjFBXHU2QkNGXHU0RTJBIE9ic2lkaWFuIFx1N0E5N1x1NTNFM1x1RkYwOFx1NEUzQlx1N0E5N1x1NTNFMyAvIHBvcG91dFx1RkYwOVx1OTBGRFx1NjYyRlx1NzJFQ1x1N0FDQlx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwQ1x1NTQwNFxuICogICBcdTgxRUFcdTc2RDFcdTU0MkNcdTgxRUFcdTVERjFcdTc2ODQgd2luZG93IGZvY3VzIFx1MjAxNFx1MjAxNCBcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTZCNjNcdTY2MkZcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1xuICogICBcdTU3MjhcdTc3MEJcdTc2ODQgdmF1bHRcIlx1RkYxQlxuICogLSBcdTU5MzFcdThEMjVcdTk3NTlcdTlFRDhcdUZGMUFcdTUxOTlcdTRFMERcdThGREJcdUZGMDhcdTY3NDNcdTk2NTAvXHU3OEMxXHU3NkQ4XHVGRjA5XHU1M0VBIGNvbnNvbGUud2Fyblx1RkYwQ1x1N0VERFx1NEUwRFx1NjI1M1x1NjVBRFx1NjNEMlx1NEVGNlx1NEUzQlx1NkQ0MVx1N0EwQlx1RkYxQlxuICogICBcdTY1ODdcdTRFRjZcdTYzNUZcdTU3NEYvXHU3RjNBXHU1OTMxXHU2NUY2IERTSCBcdTRGQTdcdTU2REVcdTkwMDBcdTUzOUZcdTY3MDlcdTRGRTFcdTUzRjdcdUZGMENcdTU0MTFcdTU0MEVcdTUxN0NcdTVCQjlcdTRFMERcdTg4QzUgZHNoLWRvY2sgXHU3Njg0XHU1NzNBXHU2NjZGXHUzMDAyXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTZGQVx1NUI5QVx1NEY0RFx1N0Y2RVx1RkYxQX4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gKi9cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50VmF1bHRNYXJrZXJQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmRzaCcsICdjdXJyZW50LXZhdWx0Lmpzb24nKVxufVxuXG4vKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTg1XHU1QkI5XHVGRjA4RFNIIFx1NEZBN1x1NTNFQVx1OEJGQiBuYW1lL3BhdGhcdUZGMEN1cGRhdGVkQXQgXHU0RjlCXHU4QkNBXHU2NUFEXHVGRjA5ICovXG5leHBvcnQgaW50ZXJmYWNlIEN1cnJlbnRWYXVsdE1hcmtlciB7XG4gIG5hbWU6IHN0cmluZ1xuICBwYXRoOiBzdHJpbmdcbiAgdXBkYXRlZEF0OiBudW1iZXJcbn1cblxuLyoqXG4gKiBcdTUzOUZcdTVCNTBcdTUxOTlcdTUxNjVcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdUZGMUFcdTUxNDhcdTUxOTlcdTU0MENcdTc2RUVcdTVGNTUgLnRtcCBcdTUxOEQgcmVuYW1lXHVGRjBDXHU5MDdGXHU1MTREIERTSCBcdTRGQTdcdThCRkJcdTUyMzBcdTUzNEFcdTYyMkFcdTUxODVcdTVCQjlcdTMwMDJcbiAqIFx1NTkzMVx1OEQyNVx1NTNFQVx1NTQ0QVx1OEI2Nlx1RkYwQ1x1NEUwRFx1NjI5Qlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIobmFtZTogc3RyaW5nLCB2YXVsdFBhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGNvbnN0IGZpbGUgPSBjdXJyZW50VmF1bHRNYXJrZXJQYXRoKClcbiAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgIGNvbnN0IHBheWxvYWQ6IEN1cnJlbnRWYXVsdE1hcmtlciA9IHsgbmFtZSwgcGF0aDogdmF1bHRQYXRoLCB1cGRhdGVkQXQ6IERhdGUubm93KCkgfVxuICAgIGNvbnN0IHRtcCA9IGAke2ZpbGV9LnRtcGBcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRtcCwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMikpXG4gICAgZnMucmVuYW1lU3luYyh0bXAsIGZpbGUpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignW2RzaC1kb2NrXSBcdTUxOTlcdTUxNjUgY3VycmVudC12YXVsdCBcdTY4MDdcdThCQjBcdTU5MzFcdThEMjUnLCBlcnIpXG4gIH1cbn1cblxuLyoqIFx1NEVDRSBPYnNpZGlhbiBhcHAgXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NTQwRFx1NEUwRVx1NjgzOVx1OERFRlx1NUY4NFx1RkYxQlx1NTNENlx1NEUwRFx1NTIzMFx1OEZENFx1NTZERSBudWxsICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0SW5mbyhhcHA6IHtcbiAgdmF1bHQ6IHsgZ2V0TmFtZSgpOiBzdHJpbmc7IGFkYXB0ZXI6IHVua25vd24gfVxufSk6IHsgbmFtZTogc3RyaW5nOyBwYXRoOiBzdHJpbmcgfSB8IG51bGwge1xuICB0cnkge1xuICAgIC8vIGdldEJhc2VQYXRoIFx1NEUwRFx1NTcyOCBvYnNpZGlhbiBcdTc2ODRcdTdDN0JcdTU3OEJcdTVCOUFcdTRFNDlcdTkxQ0NcdUZGMDhcdThGRDBcdTg4NENcdTY1RjYgRGF0YUFkYXB0ZXIgXHU2MjREXHU2NzA5XHVGRjA5XHVGRjBDXG4gICAgLy8gXHU2MjQwXHU0RUU1XHU4RkQ5XHU5MUNDXHU2MjhBIGFkYXB0ZXIgXHU1RjUzIHVua25vd24gXHU1OTA0XHU3NDA2XHU1MThEXHU2NUFEXHU4QTAwXHUzMDAyXG4gICAgY29uc3QgYmFzZSA9IChhcHAudmF1bHQuYWRhcHRlciBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH0pLmdldEJhc2VQYXRoPy4oKVxuICAgIGlmICghYmFzZSkgcmV0dXJuIG51bGxcbiAgICByZXR1cm4geyBuYW1lOiBhcHAudmF1bHQuZ2V0TmFtZSgpLCBwYXRoOiBiYXNlIH1cbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVFBLElBQUFBLG1CQUE4QztBQUU5QyxJQUFBQyxNQUFvQjtBQUNwQixJQUFBQyxRQUFzQjs7O0FDSXRCLDJCQUFvRDtBQUNwRCxTQUFvQjtBQUNwQixXQUFzQjtBQUN0QixTQUFvQjtBQUNwQixXQUFzQjtBQUVmLElBQU0sbUJBQXdCLFVBQUssZ0JBQWdCLE9BQU8sT0FBTyxRQUFRO0FBR3pFLElBQU0sd0JBQXdCO0FBRzlCLFNBQVMsV0FBVyxPQUFlLE1BQU0sR0FBVztBQUN6RCxNQUFJLElBQUk7QUFDUixXQUFTLElBQUksR0FBRyxJQUFJLE1BQU0sUUFBUSxJQUFLLE1BQU0sS0FBSyxLQUFLLElBQUksTUFBTSxXQUFXLENBQUMsTUFBTztBQUNwRixTQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsU0FBUyxLQUFLLEdBQUcsRUFBRSxNQUFNLEdBQUcsR0FBRztBQUN2RDtBQUdPLFNBQVMsY0FBYyxXQUEyQjtBQUN2RCxRQUFNLFVBQ0gsY0FBUyxTQUFTLEVBQ2xCLFFBQVEsc0JBQXNCLEdBQUcsRUFDakMsUUFBUSxZQUFZLEVBQUU7QUFDekIsVUFBUSxXQUFXLFNBQVMsTUFBTSxHQUFHLEVBQUU7QUFD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LFVBQVUsS0FBSyxVQUFVLENBQUM7QUFBQSxFQUNwRDtBQUFBO0FBQUEsRUFHQSw0QkFBZ0Q7QUFDOUMsV0FBTyx3QkFBd0IsS0FBSyxVQUFVLEtBQUssVUFBVSxDQUFDO0FBQUEsRUFDaEU7QUFBQSxFQUVBLE1BQWMsZUFBOEI7QUFDMUMsVUFBTSxPQUFPLE1BQU0sS0FBSyxTQUFTO0FBQ2pDLFNBQUssV0FBVyxPQUFPLE9BQU8sQ0FBQyxHQUFHLGtCQUFrQixRQUFRLENBQUMsQ0FBQztBQUU5RCxVQUFNLFNBQVM7QUFDZixRQUFJLFFBQVEsV0FBVyxPQUFPLE9BQU8sWUFBWSxZQUFZLE9BQU8sUUFBUSxLQUFLLEdBQUc7QUFDbEYsV0FBSyxTQUFTLGNBQWM7QUFDNUIsV0FBSyxTQUFTLFVBQVUsT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQTtBQUFBLEVBSUEsTUFBTSxZQUEyQjtBQUMvQixVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsVUFBTSxTQUFTLFVBQVUsZ0JBQWdCLGlCQUFpQjtBQUMxRCxRQUFJLE9BQTZCLE9BQU8sQ0FBQyxLQUFLO0FBQzlDLFFBQUksQ0FBQyxNQUFNO0FBQ1QsYUFBTyxVQUFVLGFBQWEsS0FBSztBQUNuQyxVQUFJLENBQUMsS0FBTTtBQUNYLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRTtBQUNBLGNBQVUsY0FBYyxJQUFJO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sZ0JBQStCO0FBQ25DLFVBQU0sRUFBRSxNQUFNLElBQUksUUFBUSxVQUFVO0FBQ3BDLFVBQU0sTUFBTSxhQUFhLEtBQUssT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLE1BQU0sYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sT0FBTyxLQUFLLElBQUksVUFBVSxlQUFlO0FBQy9DLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRSxTQUFTLEtBQUs7QUFDWixZQUFNLE1BQU0sZUFBZSxRQUFRLElBQUksVUFBVSxPQUFPLEdBQUc7QUFDM0QsVUFBSSx3QkFBTyxxREFBYSxHQUFHLEVBQUU7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIm9zIiwgInBhdGgiLCAiZW1iZWRkZWROb2RlVmVyc2lvbiIsICJyZXNvbHZlIiwgImltcG9ydF9vYnNpZGlhbiIsICJmcyIsICJvcyIsICJwYXRoIl0KfQo=
