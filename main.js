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
        // per-vault 模式：spawn cwd = vault 根 —— 新建会话的 cwd 即本库根，
        // vault 工具解析顺序第 3 位（会话 cwd 若是库）直接命中，本库服务里
        // 提问绝不解析成其他库。shared 模式不传（共用一个服务，靠焦点标记）。
        ...sharedConfigRoot && vaultRoot ? { cwd: vaultRoot } : {},
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSB7IENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7XG4gIGVtYmVkZGVkTm9kZVZlcnNpb24sXG4gIGVuc3VyZURzaFJ1bm5pbmcsXG4gIHJlc29sdmVEc2hCaW4sXG4gIHJlc29sdmVOb2RlQmluLFxuICBzYWZlVmF1bHROYW1lLFxuICBzdGFibGVIYXNoLFxuICBzdG9wUHJvY2VzcyxcbiAgdHlwZSBTZXJ2ZXJTdGF0dXMsXG59IGZyb20gJy4vbGF1bmNoZXInXG5pbXBvcnQgeyBEc2hEb2NrU2V0dGluZ3NUYWIsIERFRkFVTFRfU0VUVElOR1MsIHR5cGUgRHNoRG9ja1NldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncydcbmltcG9ydCB7IERzaFdlYlZpZXcsIERTSF9XRUJfVklFV19UWVBFIH0gZnJvbSAnLi92aWV3J1xuaW1wb3J0IHsgY3VycmVudFZhdWx0SW5mbywgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIgfSBmcm9tICcuL2N1cnJlbnRWYXVsdCdcblxuLyoqXG4gKiBcdThCQTFcdTdCOTcgRFNIX0hPTUVcdUZGMUFcbiAqIC0gc2hhcmVkXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFBfi8uZHNoIFx1MjAxNFx1MjAxNCBcdTRFMEVcdTVCOThcdTY1QjkgZHNoIENMSSBcdTVCOENcdTUxNjhcdTRFMDBcdTgxRjRcdUZGMENcdTU5MERcdTc1MjhcdTVERjJcdTY3MDlcdTkxNERcdTdGNkUvXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NTg2Qlx1NTE5OVx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURzaEhvbWUoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAnZHNoSG9tZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKClcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgcmV0dXJuIHMuZHNoSG9tZS50cmltKCkgfHwgcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbiAgfVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcpIHtcbiAgICBjb25zdCBuYW1lID0gdmF1bHRSb290ID8gYCR7c2FmZVZhdWx0TmFtZSh2YXVsdFJvb3QpfS0ke3N0YWJsZUhhc2godmF1bHRSb290KX1gIDogJ3ZhdWx0J1xuICAgIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnLCAndmF1bHRzJywgbmFtZSlcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJylcbn1cblxuLyoqXG4gKiBcdThCQTFcdTdCOTdcdTY3MkMgdmF1bHQgXHU3Njg0XHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHUzMDAyXG4gKiAtIHNoYXJlZCAvIGN1c3RvbVx1RkYxQXNldHRpbmdzLnBvcnRcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOVx1MjAxNFx1MjAxNCBcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHU1NDBDXHU0RTAwXHU2NzBEXHU1MkExXHU0RTBFXHU0RjFBXHU4QkREXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQXNldHRpbmdzLnBvcnQgKyAoc3RhYmxlSGFzaCAlIDQwOTYpIFx1MjAxNFx1MjAxNCBcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3MkVDXHU1MzYwXHU3QUVGXHU1M0UzXHVGRjBDXHU1NDA0XHU4MUVBXG4gKiAgIHNwYXduIFx1NzJFQ1x1N0FDQlx1NzY4NCBkc2ggXHU4RkRCXHU3QTBCXHVGRjFCXHU5MTREXHU1NDA4XHU3MkVDXHU3QUNCXHU3Njg0IERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREXHU1QjU4XHU1MEE4XHU2ODM5XHVGRjA5XHVGRjBDXHU0RTBEXHU1NDBDIHZhdWx0IFx1NzY4NFxuICogICBcdTRGMUFcdThCRERcdTVCOENcdTUxNjhcdTk2OTRcdTc5QkJcdUZGMENcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdTMwMDJcdTdBRUZcdTUzRTNcdTUxQjJcdTdBODFcdTY5ODJcdTczODcgfjEvNDA5Nlx1RkYwQ1x1NTNFRlx1NjNBNVx1NTNEN1x1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVBvcnQoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZScgfCAncG9ydCc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludChzdGFibGVIYXNoKHZhdWx0Um9vdCksIDM2KSAlIDQwOTZcbiAgICByZXR1cm4gcy5wb3J0ICsgb2Zmc2V0XG4gIH1cbiAgcmV0dXJuIHMucG9ydFxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODRcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NTE3MVx1NzUyOFx1NEUwMFx1NEVGRFx1RkYwQ1x1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1RkYwOVx1MzAwMlxuICogLSBzaGFyZWRcdUZGMUFkc2hIb21lIFx1ODFFQVx1OEVBQlx1NTM3M1x1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwQ1x1NjVFMFx1OTcwMFx1NTE3MVx1NEVBQlx1NUM0Mlx1RkYxQlxuICogLSBjdXN0b21cdUZGMUFcdTc1MjhcdTYyMzdcdTYzMDdcdTVCOUFcdThERUZcdTVGODRcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMENcdTY1RTBcdTk3MDBcdTUxNzFcdTRFQUJcdTVDNDJcdUZGMUJcbiAqIC0gcGVyLXZhdWx0XHVGRjFBXHU4RkQ0XHU1NkRFXHU1MTcxXHU0RUFCIGB+Ly5kc2hgXHVGRjBDXHU4QkE5XHU2QkNGXHU0RTJBIHZhdWx0IFx1NzY4NCBzZXR0aW5ncy9jcmVkZW50aWFsc1xuICogICBcdTYzMDdcdTU2REVcdTVCODMgXHUyMDE0XHUyMDE0IFx1OTE0RFx1NEUwMFx1NkIyMVx1NTE2OCB2YXVsdCBcdTc1MUZcdTY1NDhcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcgJiYgdmF1bHRSb290KSB7XG4gICAgcmV0dXJuIHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZHNoJylcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERzaERvY2tQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogRHNoRG9ja1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HU1xuICBwcml2YXRlIHByb2M6IENoaWxkUHJvY2VzcyB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgc3RhdHVzOiBTZXJ2ZXJTdGF0dXMgPSB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHByaXZhdGUgc3RhcnRpbmcgPSBmYWxzZVxuICBwcml2YXRlIHN0YXR1c0JhckVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgc3RhdHVzTGlzdGVuZXJzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpXG4gIC8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUxOTlcdTUxNjVcdTk2MzJcdTYyOTYgdGltZXJcdUZGMDhcdTdBOTdcdTUzRTMgZm9jdXMgXHU1M0VGXHU4MEZEXHU5QUQ4XHU5ODkxXHU4OUU2XHU1M0QxXHVGRjA5ICovXG4gIHByaXZhdGUgbWFya2VyVGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IG51bGxcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKClcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KERTSF9XRUJfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IERzaFdlYlZpZXcobGVhZiwgdGhpcykpXG5cbiAgICAvLyBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdUZGMUFcdTY3MkNcdTdBOTdcdTUzRTNcdTYyNTNcdTVGMDBcdUZGMDhvbmxvYWRcdUZGMDlcdTRFMEVcdTZCQ0ZcdTZCMjFcdTgzQjdcdTVGOTdcbiAgICAvLyBcdTcxMjZcdTcwQjlcdTY1RjZcdTUyMzdcdTY1QjBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTMwMDJcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdTRFMEJcdTZCQ0ZcdTRFMkFcdTdBOTdcdTUzRTNcdTkwRkRcdTcyRUNcdTdBQ0JcdTUyQTBcdThGN0RcdTY3MkNcdTYzRDJcdTRFRjZcdUZGMENcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcbiAgICAvLyBcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTUzNzNcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1x1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHUzMDAyXG4gICAgdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICBjb25zdCBvbldpbmRvd0ZvY3VzID0gKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvbldpbmRvd0ZvY3VzKVxuICAgIHRoaXMucmVnaXN0ZXIoKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25XaW5kb3dGb2N1cykpXG4gICAgLy8gXHU4ODY1XHU1MTQ1XHU0RkUxXHU1M0Y3XHVGRjFBXHU3NTI4XHU2MjM3XHU1NzI4XHU3QTk3XHU1M0UzXHU1MTg1XHU1MjA3XHU2MzYyXHU2NTg3XHU0RUY2L1x1NUUwM1x1NUM0MFx1NUZDNVx1NzEzNlx1ODlFNlx1NTNEMSBhY3RpdmUtbGVhZi1jaGFuZ2VcdUZGMENcbiAgICAvLyBcdTg5ODZcdTc2RDYgd2luZG93IGZvY3VzIFx1NEU4Qlx1NEVGNlx1NEUwRFx1NkQzRVx1NTNEMVx1NzY4NFx1NTczQVx1NjY2Rlx1MzAwMlx1OTYzMlx1NjI5Nlx1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQSB0aW1lclx1RkYwQ1x1NEU5Mlx1NEUwRFx1NUU3Mlx1NjI3MFx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2FjdGl2ZS1sZWFmLWNoYW5nZScsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignYm90JywgJ0RTSCBEb2NrXHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJywgKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLXBhbmVsJyxcbiAgICAgIG5hbWU6ICdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3RicsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RhcnQtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTU0MkZcdTUyQTggRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0YXJ0KCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdG9wLWRzaCcsXG4gICAgICBuYW1lOiAnXHU1MDVDXHU2QjYyIERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdG9wKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1icm93c2VyJyxcbiAgICAgIG5hbWU6ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAgRFNIJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlbkluQnJvd3NlcigpLFxuICAgIH0pXG5cbiAgICB0aGlzLnN0YXR1c0JhckVsID0gdGhpcy5hZGRTdGF0dXNCYXJJdGVtKClcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEc2hEb2NrU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKVxuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b3N0YXJ0KSB7XG4gICAgICB2b2lkIHRoaXMuc3RhcnQoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9udW5sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc3RvcCgpXG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2xlYXIoKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NzJCNlx1NjAwMVxuXG4gIGdldFN0YXR1cygpOiBTZXJ2ZXJTdGF0dXMge1xuICAgIHJldHVybiB0aGlzLnN0YXR1c1xuICB9XG5cbiAgZ2V0IGNoaWxkUHJvYygpOiBDaGlsZFByb2Nlc3MgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5wcm9jXG4gIH1cblxuICBnZXQgYmFzZVVybCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhdWx0Um9vdCA9IHRoaXMudmF1bHRSb290KClcbiAgICBjb25zdCBwb3J0ID0gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgIHJldHVybiBgaHR0cDovLyR7dGhpcy5zZXR0aW5ncy5ob3N0fToke3BvcnR9L2BcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODM5XHU3NkVFXHU1RjU1XHVGRjA4XHU2NUUwXHU1MjE5IHVuZGVmaW5lZFx1RkYwOSAqL1xuICBwcml2YXRlIHZhdWx0Um9vdCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiAodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH0pLmdldEJhc2VQYXRoPy4oKVxuICB9XG5cbiAgb25TdGF0dXNDaGFuZ2UoZm46ICgpID0+IHZvaWQpOiAoKSA9PiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1c0xpc3RlbmVycy5hZGQoZm4pXG4gICAgcmV0dXJuICgpID0+IHRoaXMuc3RhdHVzTGlzdGVuZXJzLmRlbGV0ZShmbilcbiAgfVxuXG4gIHByaXZhdGUgc2V0U3RhdHVzKHN0YXR1czogU2VydmVyU3RhdHVzKTogdm9pZCB7XG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXNcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgZm9yIChjb25zdCBmbiBvZiB0aGlzLnN0YXR1c0xpc3RlbmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm4oKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhdHVzQmFyKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5zdGF0dXNCYXJFbCkgcmV0dXJuXG4gICAgY29uc3QgcyA9IHRoaXMuc3RhdHVzXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoYERTSDogJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJ1x1RkYwOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOScgOiAnJ31gKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTY3MkFcdThGRDBcdTg4NEMnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgwN1x1OEJCMFxuXG4gIC8qKiBcdThCRkJcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1RTc2XHU1MTk5XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjA4XHU5NjMyXHU2Mjk2IDMwMG1zXHVGRjBDXHU5MDdGXHU1MTREIGZvY3VzIFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1NTNDRFx1NTkwRFx1NTE5OVx1NzZEOFx1RkYwOSAqL1xuICByZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm1hcmtlclRpbWVyKSBjbGVhclRpbWVvdXQodGhpcy5tYXJrZXJUaW1lcilcbiAgICB0aGlzLm1hcmtlclRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgpXG4gICAgfSwgMzAwKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuXG4gIC8qKiBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NjMwMlx1NjNBNVx1RkYxQlx1NTQyNlx1NTIxOSBzcGF3biBcdTVCOThcdTY1QjkgZHNoIHdlYiAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xuICAgIGlmICh0aGlzLnN0YXJ0aW5nKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICB0aGlzLnN0YXJ0aW5nID0gdHJ1ZVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0YXJ0aW5nJyB9KVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgICBjb25zdCBkc2hIb21lID0gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHNoYXJlZENvbmZpZ1Jvb3QgPSBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW5zdXJlRHNoUnVubmluZyh7XG4gICAgICAgIGRzaEJpbjogdGhpcy5zZXR0aW5ncy5kc2hCaW4sXG4gICAgICAgIG5vZGVCaW46IHRoaXMuc2V0dGluZ3Mubm9kZUJpbixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgaG9zdDogdGhpcy5zZXR0aW5ncy5ob3N0LFxuICAgICAgICBkc2hIb21lLFxuICAgICAgICAvLyBwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHUzMDAyXG4gICAgICAgIC4uLihzaGFyZWRDb25maWdSb290ID8geyBzaGFyZWRDb25maWdSb290IH0gOiB7fSksXG4gICAgICAgIHVzZUVtYmVkZGVkTm9kZTogdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUsXG4gICAgICAgIC8vIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFzcGF3biBjd2QgPSB2YXVsdCBcdTY4MzkgXHUyMDE0XHUyMDE0IFx1NjVCMFx1NUVGQVx1NEYxQVx1OEJERFx1NzY4NCBjd2QgXHU1MzczXHU2NzJDXHU1RTkzXHU2ODM5XHVGRjBDXG4gICAgICAgIC8vIHZhdWx0IFx1NURFNVx1NTE3N1x1ODlFM1x1Njc5MFx1OTg3QVx1NUU4Rlx1N0IyQyAzIFx1NEY0RFx1RkYwOFx1NEYxQVx1OEJERCBjd2QgXHU4MkU1XHU2NjJGXHU1RTkzXHVGRjA5XHU3NkY0XHU2M0E1XHU1NDdEXHU0RTJEXHVGRjBDXHU2NzJDXHU1RTkzXHU2NzBEXHU1MkExXHU5MUNDXG4gICAgICAgIC8vIFx1NjNEMFx1OTVFRVx1N0VERFx1NEUwRFx1ODlFM1x1Njc5MFx1NjIxMFx1NTE3Nlx1NEVENlx1NUU5M1x1MzAwMnNoYXJlZCBcdTZBMjFcdTVGMEZcdTRFMERcdTRGMjBcdUZGMDhcdTUxNzFcdTc1MjhcdTRFMDBcdTRFMkFcdTY3MERcdTUyQTFcdUZGMENcdTk3NjBcdTcxMjZcdTcwQjlcdTY4MDdcdThCQjBcdUZGMDlcdTMwMDJcbiAgICAgICAgLi4uKHNoYXJlZENvbmZpZ1Jvb3QgJiYgdmF1bHRSb290ID8geyBjd2Q6IHZhdWx0Um9vdCB9IDoge30pLFxuICAgICAgICAvLyBwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHVGRjFBXHU2MjhBXHU2NzJDXHU2NzBEXHU1MkExXHU2MjQwXHU1QzVFIHZhdWx0IFx1NkNFOFx1NTE2NVx1NUI1MFx1OEZEQlx1N0EwQiBlbnZcdUZGMDhcdTdCMkNcdTRFOENcdTkwMUFcdTkwNTNcdUZGMENcdTY4MDdcdThCQjBcbiAgICAgICAgLy8gXHU2NTg3XHU0RUY2XHU0RTRCXHU1OTE2XHU3Njg0XHU1MTVDXHU1RTk1XHVGRjA5XHUzMDAyXHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XHU4OUUzXHU2NzkwXHU2NUY2XHU0RjE4XHU1MTQ4XHU3NTI4XHU2NzJDIGVudlx1RkYwQ1x1NEZERFx1OEJDMVx1NTcyOFx1NzUxRlx1NzI2OVx1NTkwN1x1OEJGRVx1NzY4NFxuICAgICAgICAvLyBcdTY3MERcdTUyQTFcdTkxQ0NcdTYzRDBcdTk1RUVcdTRFMERcdTRGMUFcdTU2RTBcdTcxMjZcdTcwQjlcdTU3MjhcdTc1MUZcdTcyNjlcdTk4OThcdTVFOTNcdTgwMENcdTg5RTNcdTY3OTBcdTYyMTBcdTc1MUZcdTcyNjlcdTk4OThcdTVFOTNcdTMwMDJcbiAgICAgICAgLy8gc2hhcmVkIFx1NkEyMVx1NUYwRlx1RkYxQVx1NjI0MFx1NjcwOVx1NUU5M1x1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQVx1NjcwRFx1NTJBMVx1RkYwQ1x1NEUwRFx1NkNFOFx1NTE2NSBcdTIwMTRcdTIwMTQgXHU1REU1XHU1MTc3XHU0RUNEXHU4RERGXHU5NjhGXHU3MTI2XHU3MEI5XHU3QTk3XHU1M0UzXHUzMDAyXG4gICAgICAgIGVudjogc2hhcmVkQ29uZmlnUm9vdCAmJiB2YXVsdEluZm9cbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgRFNIX09CU0lESUFOX1ZBVUxUX05BTUU6IHZhdWx0SW5mby5uYW1lLFxuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfUEFUSDogdmF1bHRJbmZvLnBhdGgsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiB7fSxcbiAgICAgIH0pXG4gICAgICB0aGlzLnByb2MgPSByZXN1bHQucHJvYyA/PyBudWxsXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgcmVzdWx0LnByb2MpIHtcbiAgICAgICAgdGhpcy5ob29rQ2hpbGRMb2dzKHJlc3VsdC5wcm9jKVxuICAgICAgfVxuICAgICAgdGhpcy5zZXRTdGF0dXMocmVzdWx0LnN0YXR1cylcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtyZXN1bHQuc3RhdHVzLm1lc3NhZ2V9YClcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgIXJlc3VsdC5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIIFdlYiBcdTVERjJcdTVDMzFcdTdFRUE6ICR7cmVzdWx0LnN0YXR1cy51cmx9YClcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBtc2cgfSlcbiAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTVGMDJcdTVFMzg6ICR7bXNnfWApXG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgaWYgKHRoaXMucHJvYykge1xuICAgICAgYXdhaXQgc3RvcFByb2Nlc3ModGhpcy5wcm9jKVxuICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgIH1cbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICB9XG5cbiAgcHJpdmF0ZSBob29rQ2hpbGRMb2dzKHByb2M6IENoaWxkUHJvY2Vzcyk6IHZvaWQge1xuICAgIHByb2Muc3Rkb3V0Py5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUuaW5mbygnW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLnN0ZGVycj8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiBjb25zb2xlLndhcm4oJ1tkc2hdJywgZC50b1N0cmluZygpLnRyaW1FbmQoKSkpXG4gICAgcHJvYy5vbmNlKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIGlmICh0aGlzLnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgIXRoaXMuc3RhdHVzLmF0dGFjaGVkKSB7XG4gICAgICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBgRFNIIFx1OEZEQlx1N0EwQlx1OTAwMFx1NTFGQTogY29kZT0ke2NvZGV9IHNpZ25hbD0ke3NpZ25hbCA/PyAnJ31gIH0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIHByb2Mub25jZSgnZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbZHNoLWRvY2tdIFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRicsIGVycilcbiAgICAgIGlmICh0aGlzLnByb2MgPT09IHByb2MpIHtcbiAgICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBcdTVCNTBcdThGREJcdTdBMEJcdTk1MTlcdThCRUY6ICR7ZXJyLm1lc3NhZ2V9YCB9KVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKiogXHU2M0EyXHU2RDRCXHU0RkUxXHU2MDZGXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGRldGVjdEluZm8oKTogeyBkc2hCaW46IHN0cmluZyB8IG51bGw7IGRzaE5vdGVzOiBzdHJpbmdbXTsgbm9kZU5vdGVzOiBzdHJpbmdbXSB9IHtcbiAgICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4odGhpcy5zZXR0aW5ncy5kc2hCaW4pXG4gICAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKHRoaXMuc2V0dGluZ3Mubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCB0aGlzLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSlcbiAgICByZXR1cm4ge1xuICAgICAgZHNoQmluOiBmb3VuZC5iaW4sXG4gICAgICBkc2hOb3RlczogZm91bmQubm90ZXMsXG4gICAgICBub2RlTm90ZXM6IG5vZGUubm90ZXMsXG4gICAgfVxuICB9XG5cbiAgLyoqIFx1NUY1M1x1NTI0RFx1OEJCRVx1N0Y2RVx1NEUwQlx1NzUxRlx1NjU0OFx1NzY4NCBEU0hfSE9NRVx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBlZmZlY3RpdmVEc2hIb21lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0XHU3QUVGXHU1M0UzXHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NkJDRiB2YXVsdCBcdTcyRUNcdTdBQ0JcdUZGMDkgKi9cbiAgZWZmZWN0aXZlUG9ydCgpOiBudW1iZXIge1xuICAgIHJldHVybiBjb21wdXRlUG9ydCh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKVxuICB9XG5cbiAgLyoqIFx1NUY1M1x1NTI0RFx1OEJCRVx1N0Y2RVx1NEUwQlx1NzUxRlx1NjU0OFx1NzY4NFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEYgPSB+Ly5kc2hcdUZGMENcdTUxNzZcdTRGNTlcdTY1RTBcdUZGMDkgKi9cbiAgZWZmZWN0aXZlU2hhcmVkQ29uZmlnUm9vdCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdCh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMubG9hZERhdGEoKVxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBkYXRhID8/IHt9KVxuICAgIC8vIFx1NjVFN1x1NzI0OFx1RkYwOGRzaC1ob3N0IFYwLjFcdUZGMDlcdThCQkVcdTdGNkVcdThGQzFcdTc5RkJcdUZGMUFkc2hIb21lIFx1NUI1N1x1N0IyNlx1NEUzMiBcdTIxOTIgY3VzdG9tIFx1NkEyMVx1NUYwRlxuICAgIGNvbnN0IGxlZ2FjeSA9IGRhdGEgYXMgeyBkc2hIb21lPzogc3RyaW5nIH0gfCB1bmRlZmluZWRcbiAgICBpZiAobGVnYWN5Py5kc2hIb21lICYmIHR5cGVvZiBsZWdhY3kuZHNoSG9tZSA9PT0gJ3N0cmluZycgJiYgbGVnYWN5LmRzaEhvbWUudHJpbSgpKSB7XG4gICAgICB0aGlzLnNldHRpbmdzLmRzaEhvbWVNb2RlID0gJ2N1c3RvbSdcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZSA9IGxlZ2FjeS5kc2hIb21lLnRyaW0oKVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gVUlcblxuICBhc3luYyBvcGVuUGFuZWwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwXG4gICAgY29uc3QgbGVhdmVzID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShEU0hfV0VCX1ZJRVdfVFlQRSlcbiAgICBsZXQgbGVhZjogV29ya3NwYWNlTGVhZiB8IG51bGwgPSBsZWF2ZXNbMF0gPz8gbnVsbFxuICAgIGlmICghbGVhZikge1xuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpXG4gICAgICBpZiAoIWxlYWYpIHJldHVyblxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfVxuICAgIHdvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGxlYWYpXG4gIH1cblxuICBhc3luYyBvcGVuSW5Ccm93c2VyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgc2hlbGwgfSA9IHJlcXVpcmUoJ2VsZWN0cm9uJykgYXMgeyBzaGVsbDogeyBvcGVuRXh0ZXJuYWwodXJsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IH0gfVxuICAgIGF3YWl0IHNoZWxsLm9wZW5FeHRlcm5hbCh0aGlzLmJhc2VVcmwpXG4gIH1cblxuICAvKipcbiAgICogXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4T2JzaWRpYW4gcG9wb3V0XHVGRjA5XHVGRjFBRFNIIFx1OTc2Mlx1Njc3Rlx1OEZEQlx1NTE2NVx1NzJFQ1x1N0FDQiBCcm93c2VyV2luZG93ID1cbiAgICogXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU0RTBFIE9ic2lkaWFuIFx1NEUzQlx1N0E5N1x1NTNFM1x1OTY5NFx1NzlCQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1NjgwN1x1N0I3RVx1OTg3NVx1MzAwMlxuICAgKi9cbiAgYXN5bmMgb3BlblBvcG91dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5vcGVuUG9wb3V0TGVhZigpXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgbmV3IE5vdGljZShgXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHU1OTMxXHU4RDI1OiAke21zZ31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogbGF1bmNoZXIudHMgXHUyMDE0XHUyMDE0IFx1N0VBRlx1NTQyRlx1NTJBOFx1OTAzQlx1OEY5MVx1RkYwOFx1OTZGNiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMENcdTUzRUZcdTcyRUNcdTdBQ0JcdTUxOTJcdTcwREZcdTZENEJcdThCRDVcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTgwNENcdThEMjNcdUZGMUFcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2IFx1MjE5MiBzcGF3biBgZHNoIHdlYmBcbiAqIFx1RkYwODEyNy4wLjAuMTo8cG9ydD5cdUZGMDlcdTIxOTIgXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBIFx1MjE5MiBcdTUwNUNcdTZCNjJcdTMwMDJcbiAqXG4gKiBcdTUxNzNcdTk1MkVcdTRFOEJcdTVCOUVcdUZGMDhcdTVERjJcdTU3MjhcdTVCOThcdTY1QjkgQGRlZXBzZWVrLWFpL2RzaEAwLjEuMC1yYy42IFx1NEUwQVx1OUE4Q1x1OEJDMVx1RkYwOVx1RkYxQVxuICogLSBgbm9kZSA8ZHNoPi9saWIvYmluLmpzIHdlYiAtLWhvc3QgMTI3LjAuMC4xIC0tcG9ydCA8cG9ydD5gIFx1NTM3M1x1NUI5OFx1NjVCOSBXZWIgVUlcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0IGhvc3Q9MTI3LjAuMC4xXHUzMDAxcG9ydD0zMDgwXHVGRjA4XHU1M0VGXHU4OTg2XHU3NkQ2XHVGRjA5XHVGRjFCXG4gKiAtIFx1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1ODFFQVx1NTJBOFx1NTIxRFx1NTlDQlx1NTMxNiAkRFNIX0hPTUUvcHJvZmlsZXMvd2ViXHVGRjA4YnVuZGxlcyA9IGRzaC1iYXNlICsgZHNoLXdlYi1hcHBcdUZGMDlcdUZGMENcbiAqICAgXHU2QTIxXHU1NzU3XHU4OUUzXHU2NzkwXHU4RDcwICREU0hfSE9NRS9wcm9maWxlcy9ub2RlX21vZHVsZXMgXHU1RTczXHU5NzYyXHU3QjI2XHU1M0Y3XHU5NEZFXHU2M0E1XHVGRjBDXHU2NUUwXHU5NzAwIHBucG0vXHU4MDU0XHU3RjUxXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNFx1OTE0RFx1N0Y2RVx1NEUwQiBTUUxpdGVcdUZGMDhub2RlOnNxbGl0ZVx1RkYwQ1x1OTcwMCBOb2RlIFx1MjI2NTIyLjVcdUZGMDlcdTRFMERcdTRGMUFcdTYyNTNcdTVGMDBcdUZGMDhvcGVuQXQ6IG5ldmVyXHVGRjA5XHVGRjBDXG4gKiAgIFx1NTZFMFx1NkI2NCBOb2RlIDIwKyBcdTRFNUZcdTgwRkRcdThERDFcdTlFRDhcdThCQTQgd2ViIHByb2ZpbGVcdUZGMUJcdTU0MkZcdTc1MjhcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTY1RjZcdTYyNERcdTk3MDBcdTg5ODEgTm9kZSBcdTIyNjUyMi41XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgc3Bhd24sIHNwYXduU3luYywgdHlwZSBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IERTSF9SRUxBVElWRV9CSU4gPSBwYXRoLmpvaW4oJ0BkZWVwc2Vlay1haScsICdkc2gnLCAnbGliJywgJ2Jpbi5qcycpXG5cbi8qKiBOb2RlIFx1NEUzQlx1NzI0OFx1NjcyQ1x1NTNGN1x1NkJENFx1OEY4M1x1RkYxQW5vZGU6c3FsaXRlIFx1OTcwMFx1ODk4MSBcdTIyNjUyMi41XHVGRjA4XHU0RUM1XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU1MjlGXHU4MEZEXHU3NTI4XHU1MjMwXHVGRjA5ICovXG5leHBvcnQgY29uc3QgTk9ERV9TUUxJVEVfTUlOX01BSk9SID0gMjJcblxuLyoqIFx1N0EzM1x1NUI5QVx1NzdFRFx1NTRDOFx1NUUwQ1x1RkYwOGRqYjJcdUZGMDlcdUZGMENcdTc1MjhcdTRFOEUgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHU2RDg4XHU2QjY3XHVGRjBDXHU5MDdGXHU1MTREXHU0RTJEXHU2NTg3XHU1NDBEXHU2RTA1XHU2RDE3XHU3OEIwXHU2NDlFICovXG5leHBvcnQgZnVuY3Rpb24gc3RhYmxlSGFzaChpbnB1dDogc3RyaW5nLCBsZW4gPSA2KTogc3RyaW5nIHtcbiAgbGV0IGggPSA1MzgxXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIGggPSAoKGggPDwgNSkgKyBoICsgaW5wdXQuY2hhckNvZGVBdChpKSkgPj4+IDBcbiAgcmV0dXJuIGgudG9TdHJpbmcoMzYpLnBhZFN0YXJ0KGxlbiwgJzAnKS5zbGljZSgwLCBsZW4pXG59XG5cbi8qKiBcdTUzRUZcdThCRkJcdTc2ODQgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHVGRjA4XHU0RkREXHU3NTU5IFVuaWNvZGUgXHU1QjU3XHU2QkNEXHU2NTcwXHU1QjU3XHVGRjBDXHU1MTc2XHU0RjU5XHU4RjZDIC1cdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTkgJ3ZhdWx0JyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVWYXVsdE5hbWUodmF1bHRSb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjbGVhbmVkID0gcGF0aFxuICAgIC5iYXNlbmFtZSh2YXVsdFJvb3QpXG4gICAgLnJlcGxhY2UoL1teXFxwe0x9XFxwe059Xy1dKy9ndSwgJy0nKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csICcnKVxuICByZXR1cm4gKGNsZWFuZWQgfHwgJ3ZhdWx0Jykuc2xpY2UoMCwgNDApXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF1bmNoT3B0aW9ucyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMENcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW4/OiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5ICovXG4gIG5vZGVCaW4/OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ/OiBudW1iZXJcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0IDEyNy4wLjAuMVx1RkYwQ1x1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0Pzogc3RyaW5nXG4gIC8qKiAkRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCREQvXHU1QkM2XHU5NEE1L1x1NkEyMVx1NTc4Qlx1OTE0RFx1N0Y2RVx1NjgzOVx1NzZFRVx1NUY1NVx1RkYxQlx1OUVEOFx1OEJBNCA8dmF1bHQ+Ly5kc2hcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKlxuICAgKiBcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0IGB+Ly5kc2hgXHVGRjA5XHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTdCNDlcdTkxNERcdTdGNkVcdTdDN0JcdTY1ODdcdTRFRjZcbiAgICogXHU2MzA3XHU1NDExXHU2QjY0XHU3NkVFXHU1RjU1XHVGRjBDXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NEUwMFx1NEVGRFx1RkYxQnNlc3Npb25zIFx1N0I0OVx1NjU3MFx1NjM2RVx1NEVDRFx1NTcyOCBgZHNoSG9tZWAgXHU5Njk0XHU3OUJCXHUzMDAyXG4gICAqIFx1NzU1OVx1N0E3QSA9IFx1NEUwRFx1NTQyRlx1NzUyOFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwOGRzaEhvbWUgXHU4MUVBXHU4RUFCXHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA5XHUzMDAyXG4gICAqL1xuICBzaGFyZWRDb25maWdSb290Pzogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZT86IGJvb2xlYW5cbiAgLyoqIFx1NUMzMVx1N0VFQVx1N0I0OVx1NUY4NVx1NEUwQVx1OTY1MFx1RkYwOFx1OUVEOFx1OEJBNCAxMjBzXHVGRjA5ICovXG4gIHRpbWVvdXRNcz86IG51bWJlclxuICAvKiogXHU5NjQ0XHU1MkEwXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGICovXG4gIGVudj86IE5vZGVKUy5Qcm9jZXNzRW52XG4gIC8qKlxuICAgKiBcdTVCNTBcdThGREJcdTdBMEJcdTVERTVcdTRGNUNcdTc2RUVcdTVGNTVcdTMwMDJwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RjIwIHZhdWx0IFx1NjgzOVx1RkYxQVx1NjVCMFx1NUVGQVx1NEYxQVx1OEJERFx1NzY4NCBjd2QgXHU1MzczXHU2NzJDXHU1RTkzXHU2ODM5XHVGRjBDXG4gICAqIHZhdWx0IFx1NURFNVx1NTE3N1x1ODlFM1x1Njc5MFx1OTg3QVx1NUU4Rlx1N0IyQyAzIFx1NEY0RFx1RkYwOFx1NEYxQVx1OEJERCBjd2QgXHU4MkU1XHU2NjJGXHU1RTkzXHVGRjA5XHU3NkY0XHU2M0E1XHU1NDdEXHU0RTJEIFx1MjAxNFx1MjAxNCBcdTU3MjhcdTc1MUZcdTcyNjlcdTU5MDdcdThCRkVcdTc2ODRcbiAgICogXHU2NzBEXHU1MkExXHU5MUNDXHU2M0QwXHU5NUVFXHU3RUREXHU0RTBEXHU0RjFBXHU4OUUzXHU2NzkwXHU2MjEwXHU3NTFGXHU3MjY5XHU5ODk4XHU1RTkzXHUzMDAyc2hhcmVkIFx1NkEyMVx1NUYwRlx1NEUwRFx1NEYyMFx1RkYwOFx1NjI0MFx1NjcwOVx1NUU5M1x1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQVx1NjcwRFx1NTJBMVx1RkYwQ1xuICAgKiBcdTk3NjBcdTcxMjZcdTcwQjlcdTY4MDdcdThCQjBcdThEREZcdTk2OEZcdUZGMDlcdTMwMDJcbiAgICovXG4gIGN3ZD86IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkTm9kZSB7XG4gIC8qKiBcdTc1MjhcdTRFOEUgc3Bhd24gXHU3Njg0IG5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU2NjJGXHU1NDI2XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NjI4QSBPYnNpZGlhbiBcdTc2ODQgRWxlY3Ryb24gXHU0RThDXHU4RkRCXHU1MjM2XHU1RjUzIE5vZGUgXHU3NTI4ICovXG4gIHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuXG4gIC8qKiBcdThCRTUgTm9kZSBcdTc2ODQgbWFqb3IgXHU3MjQ4XHU2NzJDXHVGRjA4XHU2M0EyXHU2RDRCXHU1OTMxXHU4RDI1XHU0RTNBIDBcdUZGMDkgKi9cbiAgbm9kZU1ham9yOiBudW1iZXJcbiAgLyoqIFx1NjNBMlx1NkQ0Qi9cdTUxQjNcdTdCNTZcdThCRjRcdTY2MEVcdUZGMDhcdTRGOUJcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgbm90ZXM6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCB0eXBlIFNlcnZlclN0YXR1cyA9XG4gIHwgeyBraW5kOiAnc3RvcHBlZCcgfVxuICB8IHsga2luZDogJ3N0YXJ0aW5nJyB9XG4gIHwgeyBraW5kOiAncnVubmluZyc7IHBvcnQ6IG51bWJlcjsgaG9zdDogc3RyaW5nOyB1cmw6IHN0cmluZzsgYXR0YWNoZWQ6IGJvb2xlYW4gfVxuICB8IHsga2luZDogJ2Vycm9yJzsgbWVzc2FnZTogc3RyaW5nIH1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdThERUZcdTVGODRcdTVCOUFcdTRGNERcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogXHU2MjhBXHU3NTI4XHU2MjM3XHU1ODZCXHU1MTk5XHU3Njg0XHU1MTY1XHU1M0UzXHU4OUM0XHU4MzAzXHU1MzE2XHVGRjFBXHU2MzA3XHU1NDExIGJpbi5qcyBcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1OTBGRFx1NjNBNVx1NTNENyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZURzaEJpbihpbnB1dDogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWlucHV0KSByZXR1cm4gbnVsbFxuICBjb25zdCBwID0gaW5wdXQudHJpbSgpXG4gIGlmICghcCkgcmV0dXJuIG51bGxcbiAgY29uc3QgZXhwYW5kZWQgPSBwLnJlcGxhY2UoL15+KD89JHxcXC98XFxcXCkvLCBvcy5ob21lZGlyKCkpXG4gIGNvbnN0IGFicyA9IHBhdGguaXNBYnNvbHV0ZShleHBhbmRlZCkgPyBwYXRoLm5vcm1hbGl6ZShleHBhbmRlZCkgOiBwYXRoLnJlc29sdmUoZXhwYW5kZWQpXG4gIHRyeSB7XG4gICAgY29uc3Qgc3QgPSBmcy5zdGF0U3luYyhhYnMpXG4gICAgaWYgKHN0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihhYnMsICdsaWInLCAnYmluLmpzJylcbiAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkgPyBjYW5kaWRhdGUgOiBudWxsXG4gICAgfVxuICAgIGlmIChzdC5pc0ZpbGUoKSkgcmV0dXJuIGFic1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHJldHVybiBudWxsXG59XG5cbi8qKiBcdTVFMzhcdTg5QzEgbnBtIFx1NTE2OFx1NUM0MCBub2RlX21vZHVsZXMgXHU2ODM5XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gZ2xvYmFsTW9kdWxlUm9vdHMoKTogc3RyaW5nW10ge1xuICBjb25zdCByb290czogc3RyaW5nW10gPSBbXVxuICBpZiAocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKSByb290cy5wdXNoKHByb2Nlc3MuZW52LkRTSF9HTE9CQUxfTU9EVUxFUylcbiAgY29uc3QgbnBtUm9vdCA9IHNwYXduU3luYygnbnBtJywgWydyb290JywgJy1nJ10sIHtcbiAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgIHRpbWVvdXQ6IDEwXzAwMCxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbiAgaWYgKG5wbVJvb3Quc3RhdHVzID09PSAwICYmIG5wbVJvb3Quc3Rkb3V0KSB7XG4gICAgY29uc3QgbGluZSA9IG5wbVJvb3Quc3Rkb3V0LnRyaW0oKS5zcGxpdCgvXFxyP1xcbi8pWzBdXG4gICAgaWYgKGxpbmUpIHJvb3RzLnB1c2gobGluZSlcbiAgfVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2RhcndpbicpIHtcbiAgICByb290cy5wdXNoKCcvb3B0L2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJylcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnbGludXgnKSB7XG4gICAgcm9vdHMucHVzaCgnL3Vzci9saWIvbm9kZV9tb2R1bGVzJywgJy91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcycsIHBhdGguam9pbihvcy5ob21lZGlyKCksICcubG9jYWwnLCAnbGliJywgJ25vZGVfbW9kdWxlcycpKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICBjb25zdCBhcHBEYXRhID0gcHJvY2Vzcy5lbnYuQVBQREFUQVxuICAgIGlmIChhcHBEYXRhKSByb290cy5wdXNoKHBhdGguam9pbihhcHBEYXRhLCAnbnBtJywgJ25vZGVfbW9kdWxlcycpKVxuICB9XG4gIC8vIFx1NTNCQlx1OTFDRFx1NEZERFx1NUU4RlxuICByZXR1cm4gWy4uLm5ldyBTZXQocm9vdHMpXVxufVxuXG4vKipcbiAqIFx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1MzAwMlx1NEYxOFx1NTE0OFx1N0VBN1x1RkYxQVxuICogMS4gXHU2NjNFXHU1RjBGXHU0RjIwXHU1MTY1XHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHVGRjA5XHUyMTkyIDIuIFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiBEU0hfQklOIFx1MjE5MiAzLiBucG0gcm9vdCAtZyBcdTIxOTIgNC4gXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU2ODM5XHUzMDAyXG4gKiBcdTY3MkFcdTYyN0VcdTUyMzBcdTY1RjYgYmluIFx1NEUzQSBudWxsXHVGRjBDbm90ZXMgXHU4QkY0XHU2NjBFXHU1MzlGXHU1NkUwXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRHNoQmluKGV4cGxpY2l0Pzogc3RyaW5nKTogeyBiaW46IHN0cmluZyB8IG51bGw7IG5vdGVzOiBzdHJpbmdbXSB9IHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBub3JtYWxpemVEc2hCaW4oZXhwbGljaXQgPz8gcHJvY2Vzcy5lbnYuRFNIX0JJTilcbiAgaWYgKGV4cGxpY2l0QmluICYmIGZzLmV4aXN0c1N5bmMoZXhwbGljaXRCaW4pKSB7XG4gICAgcmV0dXJuIHsgYmluOiBleHBsaWNpdEJpbiwgbm90ZXM6IFtgXHU0RjdGXHU3NTI4XHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0OiAke2V4cGxpY2l0QmlufWBdIH1cbiAgfVxuICBpZiAoZXhwbGljaXQpIG5vdGVzLnB1c2goYFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NFx1NEUwRFx1NUI1OFx1NTcyODogJHtleHBsaWNpdH1gKVxuXG4gIGZvciAoY29uc3Qgcm9vdCBvZiBnbG9iYWxNb2R1bGVSb290cygpKSB7XG4gICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKHJvb3QsIERTSF9SRUxBVElWRV9CSU4pXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSkge1xuICAgICAgcmV0dXJuIHsgYmluOiBjYW5kaWRhdGUsIG5vdGVzOiBbLi4ubm90ZXMsIGBcdTRFQ0VcdTUxNjhcdTVDNDBcdTZBMjFcdTU3NTdcdTY4MzlcdTUzRDFcdTczQjA6ICR7Y2FuZGlkYXRlfWBdIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIGRzaCBcdTVCODlcdTg4QzVcdTMwMDJcdThCRjdcdTUxNDhcdTYyNjdcdTg4NEM6IG5wbSBpbnN0YWxsIC1nIEBkZWVwc2Vlay1haS9kc2hcdUZGMENcdTYyMTZcdTU3MjhcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgZHNoIFx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IGJpbjogbnVsbCwgbm90ZXMgfVxufVxuXG4vKipcbiAqIFx1NUUzOFx1ODlDMSBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOFx1NjMwOVx1NUU3M1x1NTNGMFx1RkYwQ1x1NjNBMlx1NkQ0Qlx1NzUyOFx1RkYwOVx1MzAwMlxuICogT2JzaWRpYW4gXHU0RjVDXHU0RTNBIEdVSSBcdTVFOTRcdTc1MjhcdTRFQ0UgRmluZGVyIFx1NTQyRlx1NTJBOFx1NjVGNlx1RkYwQ1BBVEggXHU5MDFBXHU1RTM4XHU1M0VBXHU2NzA5XHU3Q0ZCXHU3RURGXHU3NkVFXHU1RjU1XG4gKiBcdUZGMDgvdXNyL2JpbjovYmluOi91c3Ivc2Jpbjovc2Jpblx1RkYwOVx1RkYwQ1x1NEUwRFx1NTQyQiBIb21lYnJldyBcdTdCNDlcdTc1MjhcdTYyMzdcdTVCODlcdTg4QzVcdTc2RUVcdTVGNTVcdUZGMENcbiAqIFx1NTZFMFx1NkI2NCBzcGF3bignbm9kZScpIFx1NEYxQVx1NzZGNFx1NjNBNSBFTk9FTlRcdTMwMDJcdThGRDlcdTkxQ0NcdTYyOEFcdTVFMzhcdTg5QzFcdTVCODlcdTg4QzVcdTRGNERcdTdGNkVcdTg4NjVcdTlGNTBcdUZGMUFcbiAqIC0gUEFUSCBcdTRFMkRcdTc2ODQgbm9kZVx1RkYwOHNoZWxsIFx1OTFDQ1x1OEZEMFx1ODg0Q1x1NjVGNlx1NUI1OFx1NTcyOFx1RkYwOVx1RkYxQlxuICogLSBtYWNPUzogL29wdC9ob21lYnJldy9iaW4vbm9kZVx1RkYwOEFwcGxlIFNpbGljb25cdUZGMDlcdTMwMDEvdXNyL2xvY2FsL2Jpbi9ub2RlXHVGRjA4SW50ZWxcdUZGMDlcdUZGMUJcbiAqIC0gTGludXg6IC91c3IvYmluL25vZGVcdTMwMDEvdXNyL2xvY2FsL2Jpbi9ub2RlXHUzMDAxfi8ubG9jYWwvYmluL25vZGVcdUZGMUJcbiAqIC0gV2luZG93czogXHU5MDFBXHU4RkM3IGB3aGVyZSBub2RlYCBcdTg5RTNcdTY3OTBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbW1vbk5vZGVCaW5zKCk6IHN0cmluZ1tdIHtcbiAgY29uc3QgYmluczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBwYXRoRW52ID0gcHJvY2Vzcy5lbnYuUEFUSCA/PyAnJ1xuICBmb3IgKGNvbnN0IGRpciBvZiBwYXRoRW52LnNwbGl0KHBhdGguZGVsaW1pdGVyKSkge1xuICAgIGlmIChkaXIudHJpbSgpKSBiaW5zLnB1c2gocGF0aC5qb2luKGRpciwgJ25vZGUnKSlcbiAgfVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2RhcndpbicpIHtcbiAgICBiaW5zLnB1c2goJy9vcHQvaG9tZWJyZXcvYmluL25vZGUnLCAnL3Vzci9sb2NhbC9iaW4vbm9kZScpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2xpbnV4Jykge1xuICAgIGJpbnMucHVzaCgnL3Vzci9iaW4vbm9kZScsICcvdXNyL2xvY2FsL2Jpbi9ub2RlJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdiaW4nLCAnbm9kZScpKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgd2hlcmUgPSBzcGF3blN5bmMoJ3doZXJlJywgWydub2RlJ10sIHsgZW5jb2Rpbmc6ICd1dGY4JywgdGltZW91dDogMTBfMDAwLCB3aW5kb3dzSGlkZTogdHJ1ZSB9KVxuICAgICAgaWYgKHdoZXJlLnN0YXR1cyA9PT0gMCAmJiB3aGVyZS5zdGRvdXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIHdoZXJlLnN0ZG91dC50cmltKCkuc3BsaXQoL1xccj9cXG4vKSkge1xuICAgICAgICAgIGlmIChsaW5lLnRyaW0oKSkgYmlucy5wdXNoKGxpbmUudHJpbSgpKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXHVGRjBDXHU0RkREXHU3NTU5XHU3QjJDXHU0RTAwXHU0RTJBXHU1QjU4XHU1NzI4XHU3Njg0XG4gIHJldHVybiBbLi4ubmV3IFNldChiaW5zKV1cbn1cblxuLyoqXG4gKiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjZcdTMwMDJcbiAqIFx1OUVEOFx1OEJBNFx1OTg3QVx1NUU4Rlx1RkYxQVx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NCBcdTIxOTIgXHU3Q0ZCXHU3RURGIGBub2RlYFx1RkYwOFBBVEggKyBcdTVFMzhcdTg5QzFcdTVCODlcdTg4QzVcdThERUZcdTVGODRcdUZGMENcdThGRDRcdTU2REVcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMENcbiAqIFx1OTA3Rlx1NTE0RCBPYnNpZGlhbiBHVUkgXHU3M0FGXHU1ODgzIFBBVEggXHU3RjNBXHU1OTMxXHU1QkZDXHU4MUY0IHNwYXduIEVOT0VOVFx1RkYwOVx1MjE5MiBcdTYyN0VcdTRFMERcdTUyMzBcdTY1RjZcdTdFRDlcdTUxRkFcdTY2MEVcdTc4NkVcdTk1MTlcdThCRUZcdTMwMDJcbiAqIEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSBcdTVCOUVcdTZENEJcdTRGMUFcdTYzMDJcdThENzdcdUZGMDhPYnNpZGlhbiBcdTRFOENcdThGREJcdTUyMzZcbiAqIFx1NEUwRFx1NjMwOVx1NjY2RVx1OTAxQSBFbGVjdHJvbiBcdThCRURcdTRFNDlcdTU0Q0RcdTVFOTRcdUZGMDlcdUZGMENcdTU2RTBcdTZCNjRcdTRFQzVcdTVGNTMgdXNlRW1iZWRkZWROb2RlIFx1NjYzRVx1NUYwRlx1NUYwMFx1NTQyRlx1NjVGNlx1NjI0RFx1NUMxRFx1OEJENVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU5vZGVCaW4oZXhwbGljaXQ/OiBzdHJpbmcsIGVtYmVkZGVkTm9kZVZlcnNpb24/OiBzdHJpbmcsIHVzZUVtYmVkZGVkID0gZmFsc2UpOiBSZXNvbHZlZE5vZGUge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IGV4cGxpY2l0Py50cmltKCkgfHwgcHJvY2Vzcy5lbnYuRFNIX05PREVcbiAgaWYgKGV4cGxpY2l0QmluKSB7XG4gICAgbm90ZXMucHVzaChgXHU0RjdGXHU3NTI4XHU2NjNFXHU1RjBGIE5vZGU6ICR7ZXhwbGljaXRCaW59YClcbiAgICByZXR1cm4geyBub2RlQmluOiBleHBsaWNpdEJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbiAgfVxuICBpZiAodXNlRW1iZWRkZWQgJiYgcHJvY2Vzcy5leGVjUGF0aCAmJiBlbWJlZGRlZE5vZGVWZXJzaW9uKSB7XG4gICAgY29uc3QgbWFqb3IgPSBOdW1iZXIoZW1iZWRkZWROb2RlVmVyc2lvbi5zcGxpdCgnLicpWzBdKSB8fCAwXG4gICAgaWYgKG1ham9yID49IE5PREVfU1FMSVRFX01JTl9NQUpPUikge1xuICAgICAgbm90ZXMucHVzaChgXHU0RjdGXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn1cdUZGMDhFTEVDVFJPTl9SVU5fQVNfTk9ERVx1RkYwOWApXG4gICAgICByZXR1cm4geyBub2RlQmluOiBwcm9jZXNzLmV4ZWNQYXRoLCB1c2VFbGVjdHJvbkFzTm9kZTogdHJ1ZSwgbm9kZU1ham9yOiBtYWpvciwgbm90ZXMgfVxuICAgIH1cbiAgICBub3Rlcy5wdXNoKGBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSAke2VtYmVkZGVkTm9kZVZlcnNpb259IDwgJHtOT0RFX1NRTElURV9NSU5fTUFKT1J9XHVGRjBDXHU2NUUwXHU2Q0Q1XHU1NDJGXHU3NTI4YClcbiAgfVxuICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjb21tb25Ob2RlQmlucygpKSB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSkge1xuICAgICAgbm90ZXMucHVzaChgXHU0RjdGXHU3NTI4XHU3Q0ZCXHU3RURGIE5vZGU6ICR7Y2FuZGlkYXRlfWApXG4gICAgICByZXR1cm4geyBub2RlQmluOiBjYW5kaWRhdGUsIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiAwLCBub3RlcyB9XG4gICAgfVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NjcyQVx1NjI3RVx1NTIzMCBOb2RlXHUzMDAyXHU4QkY3XHU1Qjg5XHU4OEM1IE5vZGVcdUZGMDhodHRwczovL25vZGVqcy5vcmdcdUZGMDlcdUZGMENcdTYyMTZcdTU3MjhcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdThERUZcdTVGODQnKVxuICByZXR1cm4geyBub2RlQmluOiAnJywgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTdBRUZcdTUzRTNcdTYzQTJcdTZENEJcdTRFMEVcdTdCNDlcdTVGODVcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogXHU1RjUzXHU1MjREXHU4RkQwXHU4ODRDXHU3M0FGXHU1ODgzXHVGRjA4T2JzaWRpYW4gXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjA5XHU4MUVBXHU1RTI2XHU3Njg0IE5vZGUgXHU3MjQ4XHU2NzJDXHVGRjFCXHU2NUUwXHU1MjE5IHVuZGVmaW5lZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVtYmVkZGVkTm9kZVZlcnNpb24oKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB2ID0gKHByb2Nlc3MudmVyc2lvbnMgYXMgeyBub2RlPzogc3RyaW5nIH0gfCB1bmRlZmluZWQpPy5ub2RlXG4gICAgcmV0dXJuIHYgfHwgdW5kZWZpbmVkXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFx1N0FFRlx1NTNFM1x1NjYyRlx1NTQyNlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1MzAwMlxuICogXHU3NTI4IG5vZGU6aHR0cCBcdTgwMENcdTk3NUVcdTZENEZcdTg5QzhcdTU2NjggZmV0Y2hcdUZGMUFPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTc2ODQgQ1NQIFx1NEYxQVx1NjJFNlx1NjIyQVxuICogXHU1QkY5IGh0dHA6Ly8xMjcuMC4wLjEgXHU3Njg0IGZldGNoXHVGRjBDXHU1QkZDXHU4MUY0XCJcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcIlx1OEJFRlx1NTIyNFx1NEUzQVwiXHU2Q0ExXHU2NzA5XCJcdTMwMDJcbiAqIE5vZGUgXHU3Njg0IGh0dHAgXHU2QTIxXHU1NzU3XHU0RTBEXHU1M0Q3XHU5ODc1XHU5NzYyIENTUCBcdTdFQTZcdTY3NUZcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUG9ydFVwKGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCB0aW1lb3V0TXMgPSAxNTAwKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHJlcSA9IGh0dHAuZ2V0KHsgaG9zdCwgcG9ydCwgcGF0aDogJy8nLCB0aW1lb3V0OiB0aW1lb3V0TXMgfSwgKHJlcykgPT4ge1xuICAgICAgcmVzLnJlc3VtZSgpXG4gICAgICByZXNvbHZlKHRydWUpXG4gICAgfSlcbiAgICByZXEub24oJ3RpbWVvdXQnLCAoKSA9PiB7XG4gICAgICByZXEuZGVzdHJveSgpXG4gICAgICByZXNvbHZlKGZhbHNlKVxuICAgIH0pXG4gICAgcmVxLm9uKCdlcnJvcicsICgpID0+IHJlc29sdmUoZmFsc2UpKVxuICB9KVxufVxuXG4vKiogXHU4RjZFXHU4QkUyXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBXHVGRjFCXHU4RDg1XHU2NUY2XHU4RkQ0XHU1NkRFIGZhbHNlICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2FpdEZvclJlYWR5KGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCB0aW1lb3V0TXMgPSAxMjBfMDAwKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGRlYWRsaW5lID0gRGF0ZS5ub3coKSArIHRpbWVvdXRNc1xuICBmb3IgKDs7KSB7XG4gICAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQsIDE1MDApKSByZXR1cm4gdHJ1ZVxuICAgIGlmIChEYXRlLm5vdygpID4gZGVhZGxpbmUpIHJldHVybiBmYWxzZVxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDUwMCkpXG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaGVkU2VydmVyIHtcbiAgcHJvYzogQ2hpbGRQcm9jZXNzXG4gIHVybDogc3RyaW5nXG4gIC8qKiB0cnVlID0gXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjBDXHU2NzJBXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCICovXG4gIGF0dGFjaGVkOiBib29sZWFuXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1RkYxQVx1NjI4QSBwZXItdmF1bHQgRFNIX0hPTUUgXHU3Njg0IGBwcm9maWxlcy9gIFx1NjZGRlx1NjM2Mlx1NEUzQVx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlxuICogYH4vLmRzaC9wcm9maWxlc2AgXHU3Njg0XHU4RjZGXHU5NEZFXHUzMDAyXHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHVGRjA4XHU3RUE2IDE5NSBcdTRFMkEgQGRlZXBzZWVrLWFpIFx1NTMwNVx1RkYwOVx1NTE2OFx1NUM0MFxuICogXHU0RTAwXHU0RUZEXHVGRjBDXHU5MDdGXHU1MTREXHU2QkNGXHU0RTJBIHZhdWx0IFx1NTQwNFx1ODFFQVx1OTRGQVx1NTFFMFx1NzY3RSBNQiBcdTc2ODQgbm9kZV9tb2R1bGVzIFx1NUU3M1x1OTc2Mlx1OTRGRVx1NjNBNVx1RkYxQnNraWxsIFx1NUI5QVx1NEU0OVxuICogXHU0RTVGXHU5NjhGXHU1MTcxXHU0RUFCIHByb2ZpbGVzL2FnZW50LXByZXNldHMgXHU0RTAwXHU1RTc2XHU1OTBEXHU3NTI4XHUzMDAyXG4gKlxuICogXHU1NDBDXHU2NUY2XHU2MjhBIGAuYWdlbnQtcHJlc2V0cy9gIFx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQiBgfi8uZHNoLy5hZ2VudC1wcmVzZXRzYFx1RkYxQWFnZW50IHByZXNldFxuICogXHU3Njg0XHU1M0QxXHU3M0IwXHU2ODM5XHU2NjJGIGBkc2hIb21lUGF0aCgnLmFnZW50LXByZXNldHMnKWBcdUZGMDhcdThEREZcdTk2OEYgRFNIX0hPTUVcdUZGMDlcdUZGMENwZXItdmF1bHRcbiAqIFx1NkEyMVx1NUYwRlx1ODJFNVx1NEUwRFx1NTQwQ1x1NkI2NVx1OEY2Rlx1OTRGRVx1RkYwQ2RzaCBcdTRGMUFcdTRFQ0UgcGVyLXZhdWx0IFx1NzZFRVx1NUY1NVx1NjI3RSBwcmVzZXQgXHUyMDE0XHUyMDE0IFx1NzUyOFx1NjIzN1x1ODFFQVx1NUI5QVx1NEU0OVx1NzY4NFxuICogYG9ic2lkaWFuYCBwcmVzZXRcdUZGMDhcdTYzMDJcdThGN0QgdmF1bHQgXHU1REU1XHU1MTc3ICsgb2JzaWRpYW4tY29udmVudGlvbnMgc2tpbGxcdUZGMDlcdTVDMzFcdTYyN0VcdTRFMERcdTUyMzBcdUZGMENcbiAqIFx1ODg2OFx1NzNCMFx1NEUzQVx1OTc2Mlx1Njc3Rlx1OTFDQ1x1NkNBMVx1NjcwOSB2YXVsdCBcdTVERTVcdTUxNzdcdTMwMDJcbiAqXG4gKiBcdTVERjJcdTVCNThcdTU3MjhcdTc2ODRcdTc3MUZcdTVCOUVcdTc2RUVcdTVGNTVcdTRGMUFcdTg4QUJcdTY2RkZcdTYzNjJcdTRFM0FcdThGNkZcdTk0RkVcdUZGMDhcdTY1RTdcdTc2RUVcdTVGNTVcdTUxNDhcdTY1MzlcdTU0MERcdTU5MDdcdTRFRkRcdTRFM0EgYDxuYW1lPi5iYWstPHRzPmBcdUZGMENcbiAqIFx1Nzg2RVx1OEJBNFx1NTE3MVx1NEVBQlx1NTNFRlx1NzUyOFx1NTQwRVx1NTNFRlx1NjI0Qlx1NTJBOFx1NTIyMFx1OTY2NFx1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlU2hhcmVkUHJvZmlsZXMoZHNoSG9tZTogc3RyaW5nLCBzaGFyZWRSb290OiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFzaGFyZWRSb290IHx8IGRzaEhvbWUgPT09IHNoYXJlZFJvb3QpIHJldHVyblxuICBjb25zdCBsaW5rRGlyID0gKG5hbWU6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBwYXRoLmpvaW4oZHNoSG9tZSwgbmFtZSlcbiAgICAgIGNvbnN0IHNoYXJlZFRhcmdldCA9IHBhdGguam9pbihzaGFyZWRSb290LCBuYW1lKVxuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNoYXJlZFRhcmdldCkpIHJldHVyblxuICAgICAgbGV0IHN0OiBmcy5TdGF0cyB8IG51bGwgPSBudWxsXG4gICAgICB0cnkge1xuICAgICAgICBzdCA9IGZzLmxzdGF0U3luYyh0YXJnZXQpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgc3QgPSBudWxsXG4gICAgICB9XG4gICAgICBpZiAoc3Q/LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgaWYgKGZzLnJlYWxwYXRoU3luYyh0YXJnZXQpID09PSBmcy5yZWFscGF0aFN5bmMoc2hhcmVkVGFyZ2V0KSkgcmV0dXJuXG4gICAgICAgIGZzLnVubGlua1N5bmModGFyZ2V0KVxuICAgICAgICBzdCA9IG51bGxcbiAgICAgIH1cbiAgICAgIGlmIChzdD8uaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICBjb25zdCBiYWsgPSBgJHt0YXJnZXR9LmJhay0ke0RhdGUubm93KCl9YFxuICAgICAgICBmcy5yZW5hbWVTeW5jKHRhcmdldCwgYmFrKVxuICAgICAgICBjb25zb2xlLmluZm8oYFtkc2gtaG9zdF0gcGVyLXZhdWx0ICR7bmFtZX0gXHU1REYyXHU1OTA3XHU0RUZEXHU0RTNBICR7YmFrfVx1RkYwQ1x1NjUzOVx1NzUyOFx1NTE3MVx1NEVBQmApXG4gICAgICB9XG4gICAgICBmcy5ta2RpclN5bmMoZHNoSG9tZSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICAgIGZzLnN5bWxpbmtTeW5jKHNoYXJlZFRhcmdldCwgdGFyZ2V0LCAnZGlyJylcbiAgICAgIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBwZXItdmF1bHQgJHtuYW1lfSAtPiAke3NoYXJlZFRhcmdldH1cdUZGMDhcdThGNkZcdTk0RkVcdTUxNzFcdTRFQUJcdUZGMDlgKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS53YXJuKGBbZHNoLWhvc3RdIFx1NUVGQVx1N0FDQlx1NTE3MVx1NEVBQiAke25hbWV9IFx1OEY2Rlx1OTRGRVx1NTkzMVx1OEQyNVx1RkYwOHBlci12YXVsdCBcdTVDMDZcdTc1MjhcdTcyRUNcdTdBQ0JcdTc2RUVcdTVGNTVcdUZGMDlgLCBlcnIpXG4gICAgfVxuICB9XG4gIGxpbmtEaXIoJ3Byb2ZpbGVzJylcbiAgbGlua0RpcignLmFnZW50LXByZXNldHMnKVxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODRcIlx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlwiXHVGRjFBXHU2MjhBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgYH4vLmRzaGBcdUZGMENcbiAqIFx1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1NjU3MFx1NjM2RVx1MzAwMlxuICpcbiAqIFx1NTM5Rlx1NzQwNlx1RkYxQWRzaCBcdTc2ODQgYHNldHRpbmdzYFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtc2V0dGluZ3MtZmlsZVx1RkYwOVx1NEUwRSBgY3JlZGVudGlhbHNgXG4gKiBcdUZGMDhAZGVlcHNlZWstYWkvZHNoLWNyZWRlbnRpYWxzLWxvY2FsXHVGRjA5XHU2M0QyXHU0RUY2XHU5MEZEXHU2NTJGXHU2MzAxIGBwYXRoYCBcdTg5ODZcdTc2RDZcdUZGMENcdTlFRDhcdThCQTRcdThERUZcdTVGODRcdTY2MkZcbiAqIGA8ZHNoSG9tZT4vc2V0dGluZ3MueWFtbGAgLyBgPGRzaEhvbWU+Ly5jcmVkZW50aWFscy55YW1sYFx1MzAwMlx1NTcyOFx1NTE3MVx1NEVBQiBwcm9maWxlXG4gKiBcdTc2ODQgYGNvcmRpcy5wYXRjaC55bWxgIFx1OTFDQ1x1NjI4QVx1OEZEOVx1NEUyNFx1NEUyQVx1NjNEMlx1NEVGNlx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlx1NjgzOVx1NzY4NFx1NjU4N1x1NEVGNlx1RkYwQ1x1NkEyMVx1NTc4Qlx1OTAwOVx1NjJFOVx1MzAwMUFQSSBcdTVCQzZcdTk0QTVcdTMwMDFcbiAqIFx1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1NEUwMFx1NkIyMVx1RkYwOFx1NTcyOFx1NEVGQlx1NjEwRiB2YXVsdCBcdTc2ODQgRFNIIFx1OTc2Mlx1Njc3Rlx1NjIxNlx1NzZGNFx1NjNBNVx1NjUzOSB+Ly5kc2hcdUZGMDlcdTUzNzNcdTUzRUZcdTUxNjggdmF1bHQgXHU3NTFGXHU2NTQ4XHUzMDAyXG4gKiBcdTZDRThcdTYxMEZcdUZGMUFwcm9maWxlcyBcdTVERjJcdThGNkZcdTk0RkVcdTUxNzFcdTRFQUJcdUZGMENcdTYyNDBcdTRFRTVcdThGRDlcdTkxQ0NcdTUxOTlcdTUxNjVcdTc2ODRcdTZCNjNcdTY2MkZcdTUxNzFcdTRFQUIgcGF0Y2ggXHUyMDE0XHUyMDE0IFx1NzUyOFx1NjIzN1x1ODFFQVx1ODhDNVx1NzY4NFxuICogXHU2M0QyXHU0RUY2XHU2NzYxXHU3NkVFXHVGRjA4aW5zZXJ0XHVGRjA5XHU1RkM1XHU5ODdCXHU0RkREXHU3NTU5XHVGRjBDXHU1M0VBXHU1NDA4XHU1RTc2L1x1NjZGNFx1NjVCMCBzZXR0aW5ncy9jcmVkZW50aWFscyBcdTRFMjRcdTRFMkFcdTY3NjFcdTc2RUVcdTMwMDJcbiAqXG4gKiBwYXRjaCBcdTY4M0NcdTVGMEZcdUZGMDhjb3JkaXMgbG9hZGVyIFx1NzY4NCBhcHBseUVudHJ5UGF0Y2hlc1x1RkYwOVx1RkYxQVx1NTIxN1x1ODg2OFx1OTFDQ1x1NkJDRlx1NEUyQVx1NTE0M1x1N0QyMFx1NzZGNFx1NjNBNVx1NjYyRlxuICogYHsgaWQsIGluc2VydD8sIG5hbWU/LCAuLi5vdmVycmlkZXMgfWBcdUZGMENvdmVycmlkZXMgXHU5NTJFXHU4OTg2XHU3NkQ2XHU1NDBDXHU1NDBEIHRhcmdldCBcdTY3NjFcdTc2RUVcdUZGMENcbiAqIFx1NkNBMVx1NjcwOSBgdXBkYXRlOmAgXHU1MzA1XHU4OEM1XHU1QzQyXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChkc2hIb21lOiBzdHJpbmcsIHNoYXJlZFJvb3Q6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXNoYXJlZFJvb3QgfHwgZHNoSG9tZSA9PT0gc2hhcmVkUm9vdCkgcmV0dXJuXG4gIHRyeSB7XG4gICAgY29uc3Qgc2hhcmVkUHJvZmlsZXMgPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJ3Byb2ZpbGVzJylcbiAgICBjb25zdCBwYXRjaEZpbGUgPSBwYXRoLmpvaW4oc2hhcmVkUHJvZmlsZXMsICd3ZWInLCAnY29yZGlzLnBhdGNoLnltbCcpXG4gICAgY29uc3Qgc2V0dGluZ3NQYXRoID0gcGF0aC5qb2luKHNoYXJlZFJvb3QsICdzZXR0aW5ncy55YW1sJylcbiAgICBjb25zdCBjcmVkZW50aWFsc1BhdGggPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJy5jcmVkZW50aWFscy55YW1sJylcblxuICAgIGNvbnN0IGJsb2NrU2V0dGluZ3MgPSBgLSBpZDogc2V0dGluZ3NcbiAgY29uZmlnOlxuICAgIHBhdGg6ICR7c2V0dGluZ3NQYXRofVxuYFxuICAgIGNvbnN0IGJsb2NrQ3JlZGVudGlhbHMgPSBgLSBpZDogY3JlZGVudGlhbHNcbiAgY29uZmlnOlxuICAgIHBhdGg6ICR7Y3JlZGVudGlhbHNQYXRofVxuYFxuXG4gICAgbGV0IGNvbnRlbnQgPSAnJ1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGNoRmlsZSkpIHtcbiAgICAgIGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGF0Y2hGaWxlLCAndXRmOCcpXG4gICAgfVxuICAgIGNvbnN0IHN0cmlwID0gKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXHMrL2csICcnKVxuICAgIGNvbnN0IGhhc1NldHRpbmdzID0gc3RyaXAoY29udGVudCkuaW5jbHVkZXMoc3RyaXAoYmxvY2tTZXR0aW5ncykpXG4gICAgY29uc3QgaGFzQ3JlZGVudGlhbHMgPSBzdHJpcChjb250ZW50KS5pbmNsdWRlcyhzdHJpcChibG9ja0NyZWRlbnRpYWxzKSlcbiAgICBpZiAoaGFzU2V0dGluZ3MgJiYgaGFzQ3JlZGVudGlhbHMpIHJldHVyblxuXG4gICAgLy8gXHU1M0VBXHU1NzI4XHU1MTcxXHU0RUFCIHBhdGNoIFx1NEUzQVx1N0E3QVx1NjU3MFx1N0VDNCBgW11gXHVGRjA4XHU1MTQxXHU4QkI4XHU2Q0U4XHU5MUNBXHVGRjBDXHU2MjE2XHU2NTg3XHU0RUY2XHU0RTBEXHU1QjU4XHU1NzI4XHVGRjA5XHU2NUY2XHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXG4gICAgLy8gXHU2NzYxXHU3NkVFXHVGRjFCXHU4MkU1XHU3NTI4XHU2MjM3XHU1REYyXHU4MUVBXHU1QjlBXHU0RTQ5IHBhdGNoXHVGRjA4XHU1OTgyXHU4MUVBXHU4OEM1XHU2M0QyXHU0RUY2XHVGRjA5XHVGRjBDXHU0RTBEXHU1RjNBXHU4ODRDXHU2NTM5XHU1MTk5IFx1MjAxNFx1MjAxNCBcdTYzRDBcdTc5M0FcdTYyNEJcdTUyQThcdTUyQTBcdTMwMDJcbiAgICBjb25zdCB3aXRob3V0Q29tbWVudHMgPSBjb250ZW50XG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAuZmlsdGVyKChsKSA9PiAhbC50cmltKCkuc3RhcnRzV2l0aCgnIycpKVxuICAgICAgLmpvaW4oJ1xcbicpXG4gICAgICAudHJpbSgpXG4gICAgaWYgKHdpdGhvdXRDb21tZW50cyA9PT0gJycgfHwgd2l0aG91dENvbW1lbnRzID09PSAnW10nKSB7XG4gICAgICAgIGNvbnN0IGluc2VydGlvbiA9IGJsb2NrU2V0dGluZ3MgKyBibG9ja0NyZWRlbnRpYWxzXG4gICAgICAgIGNvbnRlbnQgPSBgIyBkc2gtZG9jayBcdTgxRUFcdTUyQThcdTdFRjRcdTYyQTRcdUZGMUFwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU0RjFBXHU4QkREXHU0RUNEXHU5Njk0XHU3OUJCXHVGRjA5XG4ke2luc2VydGlvbi50cmltRW5kKCl9XG5gXG4gICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUocGF0Y2hGaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRjaEZpbGUsIGNvbnRlbnQpXG4gICAgICAgIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCOiBzZXR0aW5ncy9jcmVkZW50aWFscyAtPiAke3NoYXJlZFJvb3R9YClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnW2RzaC1ob3N0XSBcdTUxNzFcdTRFQUIgY29yZGlzLnBhdGNoLnltbCBcdTVERjJcdTY3MDlcdTgxRUFcdTVCOUFcdTRFNDlcdTUxODVcdTVCQjlcdUZGMENcdThERjNcdThGQzdcdTgxRUFcdTUyQThcdTUxOTlcdTUxNjVcdUZGMUInICtcbiAgICAgICAgICAnXHU1OTgyXHU5NzAwXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjBDXHU4QkY3XHU1NzI4IH4vLmRzaC9wcm9maWxlcy93ZWIvY29yZGlzLnBhdGNoLnltbCBcdTYyNEJcdTUyQThcdTUyQTBcdTUxNjUgc2V0dGluZ3MvY3JlZGVudGlhbHMgXHU3Njg0IHBhdGggXHU4OTg2XHU3NkQ2JyxcbiAgICAgICAgKVxuICAgICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtaG9zdF0gXHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCIHBhdGNoIFx1NTkzMVx1OEQyNVx1RkYwOFx1NUMwNlx1NjMwOSBwZXItdmF1bHQgXHU3MkVDXHU3QUNCXHU5MTREXHU3RjZFXHU1NDJGXHU1MkE4XHVGRjA5JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgZHNoIHdlYlx1MzAwMlx1OEMwM1x1NzUyOFx1NjVCOVx1OEQxRlx1OEQyM1x1NzZEMVx1NTQyQyBwcm9jIFx1NzY4NCBleGl0L2Vycm9yXHUzMDAyICovXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoRHNoKG9wdHM6IExhdW5jaE9wdGlvbnMgJiB7IGRzaEJpbjogc3RyaW5nOyBub2RlQmluOiBzdHJpbmc7IHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuIH0pOiBDaGlsZFByb2Nlc3Mge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCBhcmdzID0gW29wdHMuZHNoQmluLCAnd2ViJywgJy0taG9zdCcsIGhvc3QsICctLXBvcnQnLCBTdHJpbmcocG9ydCldXG4gIGNvbnN0IGVudjogTm9kZUpTLlByb2Nlc3NFbnYgPSB7XG4gICAgLi4uKG9wdHMuZW52ID8/IHByb2Nlc3MuZW52ID8/IHt9KSxcbiAgICBEU0hfSE9NRTogb3B0cy5kc2hIb21lLFxuICB9XG4gIGlmIChvcHRzLnVzZUVsZWN0cm9uQXNOb2RlKSBlbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSdcbiAgY29uc29sZS5pbmZvKGBbZHNoLWhvc3RdIHNwYXduICR7b3B0cy5ub2RlQmlufSAke2FyZ3Muam9pbignICcpfWApXG4gIGNvbnNvbGUuaW5mbyhgW2RzaC1ob3N0XSBEU0hfSE9NRT0ke29wdHMuZHNoSG9tZX0ke29wdHMuY3dkID8gYCBjd2Q9JHtvcHRzLmN3ZH1gIDogJyd9YClcbiAgcmV0dXJuIHNwYXduKG9wdHMubm9kZUJpbiwgYXJncywge1xuICAgIGVudixcbiAgICBjd2Q6IG9wdHMuY3dkLFxuICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbn1cblxuLyoqXG4gKiBcdTRFMDBcdTk1MkVcIlx1Nzg2RVx1NEZERFx1OEZEMFx1ODg0Q1wiXHVGRjFBXG4gKiAxLiBcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NzZGNFx1NjNBNVx1NjMwMlx1NjNBNVx1RkYwOGF0dGFjaGVkXHVGRjBDXHU0RTBEXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCXHVGRjA5XHVGRjFCXG4gKiAyLiBcdTU0MjZcdTUyMTlcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdTIxOTIgc3Bhd24gXHUyMTkyIFx1N0I0OVx1NUY4NVx1NUMzMVx1N0VFQVx1RkYxQlxuICogMy4gXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHVGRjA4XHU1OTgyXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwIEVBRERSSU5VU0VcdUZGMDlcdTIxOTIgXHU3QUNCXHU1MzczXHU4RkQ0XHU1NkRFXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXHVGRjBDXHU0RTBEXHU1MThEXHU3NkYyXHU3QjQ5XHUzMDAyXG4gKiBcdThGRDRcdTU2REUgU2VydmVyU3RhdHVzXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEc2hSdW5uaW5nKG9wdHM6IExhdW5jaE9wdGlvbnMpOiBQcm9taXNlPHsgc3RhdHVzOiBTZXJ2ZXJTdGF0dXM7IHByb2M/OiBDaGlsZFByb2Nlc3MgfT4ge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCB1cmwgPSBgaHR0cDovLyR7aG9zdH06JHtwb3J0fS9gXG5cbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9IH1cbiAgfVxuXG4gIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbihvcHRzLmRzaEJpbilcbiAgaWYgKCFmb3VuZC5iaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogZm91bmQubm90ZXNbZm91bmQubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBkc2ggQ0xJJyB9IH1cbiAgfVxuICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4ob3B0cy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIG9wdHMudXNlRW1iZWRkZWROb2RlKVxuICBpZiAoIW5vZGUubm9kZUJpbikge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBub2RlLm5vdGVzW25vZGUubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNicgfSB9XG4gIH1cbiAgLy8gcGVyLXZhdWx0IFx1NTE3MVx1NEVBQlx1RkYxQXByb2ZpbGVzXHVGRjA4XHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHVGRjA5XHU4RjZGXHU5NEZFXHU1MjMwXHU1MTcxXHU0RUFCXHU2ODM5XHVGRjBDc2V0dGluZ3MvY3JlZGVudGlhbHNcbiAgLy8gXHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCXHU2ODM5IFx1MjAxNFx1MjAxNCBcdTkxNERcdTdGNkVcdTRFMEVcdTYzRDJcdTRFRjZcdTUxNjhcdTVDNDBcdTRFMDBcdTRFRkRcdUZGMENcdTRFQzVcdTRGMUFcdThCRERcdTk2OTRcdTc5QkJcdTMwMDJcbiAgaWYgKG9wdHMuc2hhcmVkQ29uZmlnUm9vdCkge1xuICAgIGVuc3VyZVNoYXJlZFByb2ZpbGVzKG9wdHMuZHNoSG9tZSwgb3B0cy5zaGFyZWRDb25maWdSb290KVxuICAgIGVuc3VyZVNoYXJlZENvbmZpZ1BhdGNoKG9wdHMuZHNoSG9tZSwgb3B0cy5zaGFyZWRDb25maWdSb290KVxuICB9XG4gIGNvbnN0IHByb2MgPSBsYXVuY2hEc2goeyAuLi5vcHRzLCBkc2hCaW46IGZvdW5kLmJpbiwgbm9kZUJpbjogbm9kZS5ub2RlQmluLCB1c2VFbGVjdHJvbkFzTm9kZTogbm9kZS51c2VFbGVjdHJvbkFzTm9kZSB9KVxuXG4gIC8vIFx1NjUzNlx1OTZDNiBzdGRlcnIgXHU1QzNFXHU5MEU4XHVGRjFBXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHU2NUY2XHU3RUQ5XHU1MUZBXHU3NzFGXHU1QjlFXHU1MzlGXHU1NkUwXHVGRjA4XHU1OTgyIEVBRERSSU5VU0VcdUZGMDlcbiAgbGV0IHN0ZGVyclRhaWwgPSAnJ1xuICBwcm9jLnN0ZGVycj8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiB7XG4gICAgc3RkZXJyVGFpbCA9IChzdGRlcnJUYWlsICsgZC50b1N0cmluZygpKS5zbGljZSgtNDAwMClcbiAgfSlcblxuICBjb25zdCBjaGlsZERpZWQgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gIH0pXG5cbiAgY29uc3QgcmVhZHkgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgIHdhaXRGb3JSZWFkeShob3N0LCBwb3J0LCBvcHRzLnRpbWVvdXRNcyA/PyAxMjBfMDAwKS50aGVuKCgpID0+IHRydWUpLFxuICAgIGNoaWxkRGllZC50aGVuKCgpID0+IGZhbHNlKSxcbiAgXSlcblxuICBpZiAocmVhZHkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiBmYWxzZSB9LCBwcm9jIH1cbiAgfVxuXG4gIC8vIFx1NUI1MFx1OEZEQlx1N0EwQlx1NURGMlx1OTAwMFx1NTFGQVx1RkYxQVx1NTE4RFx1NjNBMlx1NEUwMFx1NkIyMVx1N0FFRlx1NTNFM1x1RkYwOFx1NTNFRlx1ODBGRFx1ODhBQlx1NTIyQlx1NzY4NFx1NUI5RVx1NEY4Qlx1NjJBMlx1OEREMVx1N0VEMVx1NUI5QVx1RkYwOVx1RkYwQ1x1NTQyNlx1NTIxOVx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlxuICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiB0cnVlIH0sIHByb2MgfVxuICB9XG4gIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWwpIH0sIHByb2MgfVxufVxuXG4vKiogXHU0RUNFIHN0ZGVyciBcdTVDM0VcdTkwRThcdTYzRDBcdTcwQkNcdTUzRUZcdThCRkJcdTk1MTlcdThCRUYgKi9cbmZ1bmN0aW9uIHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBzdGRlcnJUYWlsLnNwbGl0KC9cXHI/XFxuLykuZmlsdGVyKEJvb2xlYW4pXG4gIGNvbnN0IGFkZHJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRUFERFJJTlVTRScpKVxuICBjb25zdCBlcnJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRXJyb3I6JykpXG4gIGlmIChhZGRyTGluZSkge1xuICAgIHJldHVybiAnXHU3QUVGXHU1M0UzXHU1REYyXHU4OEFCXHU1MzYwXHU3NTI4XHVGRjA4RUFERFJJTlVTRVx1RkYwOVx1MzAwMlx1OEJGN1x1NjM2Mlx1NEUwMFx1NEUyQVx1N0FFRlx1NTNFM1x1RkYwQ1x1NjIxNlx1NTE0OFx1NTA1Q1x1NjM4OVx1NTM2MFx1NzUyOFx1OEJFNVx1N0FFRlx1NTNFM1x1NzY4NFx1NjcwRFx1NTJBMVx1NTQwRVx1OTFDRFx1OEJENSdcbiAgfVxuICBpZiAoZXJyTGluZSkge1xuICAgIGNvbnN0IGNsZWFuZWQgPSBlcnJMaW5lLnRyaW0oKS5zbGljZSgwLCAzMDApXG4gICAgcmV0dXJuIGBkc2ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke2NsZWFuZWR9YFxuICB9XG4gIHJldHVybiAnRFNIIFx1OEZEQlx1N0EwQlx1OTAwMFx1NTFGQVx1RkYwOFx1NjVFMFx1OEJFNlx1N0VDNlx1OTUxOVx1OEJFRlx1RkYwOVx1MzAwMlx1OEJGN1x1NjdFNVx1NzcwQiBPYnNpZGlhbiBcdTYzQTdcdTUyMzZcdTUzRjAgW2RzaF0gXHU2NUU1XHU1RkQ3J1xufVxuXG4vKiogXHU1MDVDXHU2QjYyXHU1QjUwXHU4RkRCXHU3QTBCXHVGRjA4U0lHVEVSTVx1RkYwQ1x1N0I0OVx1NUY4NVx1OTAwMFx1NTFGQVx1RkYxQlx1OEQ4NVx1NjVGNlx1NTQwRSBTSUdLSUxMXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcFByb2Nlc3MocHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCB8IHVuZGVmaW5lZCwgdGltZW91dE1zID0gNTAwMCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXByb2MgfHwgcHJvYy5leGl0Q29kZSAhPT0gbnVsbCB8fCBwcm9jLnNpZ25hbENvZGUgIT09IG51bGwpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcHJvYy5raWxsKCdTSUdLSUxMJylcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9LCB0aW1lb3V0TXMpXG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4ge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfSlcbiAgICB0cnkge1xuICAgICAgcHJvYy5raWxsKCdTSUdURVJNJylcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIFx1OEJCRVx1N0Y2RVx1RkYxQVx1NUI1N1x1NkJCNSArIFx1OEJCRVx1N0Y2RVx1OTg3NSBVSVx1MzAwMlxuICogVjAuMlx1RkYxQURTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1RkYwOFx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiAvIFx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkIgLyBcdTgxRUFcdTVCOUFcdTRFNDlcdUZGMDlcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgdHlwZSBEc2hIb21lTW9kZSA9ICdzaGFyZWQnIHwgJ3Blci12YXVsdCcgfCAnY3VzdG9tJ1xuXG5leHBvcnQgaW50ZXJmYWNlIERzaERvY2tTZXR0aW5ncyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW46IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTlcdUZGMDhcdTdDRkJcdTdFREYgbm9kZSBcdTRGMThcdTUxNDhcdUZGMDkgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkMgaG9zdFx1RkYwOFx1OUVEOFx1OEJBNFx1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1NUI5OFx1NjVCOVx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ6IG51bWJlclxuICAvKiogRFNIX0hPTUUgXHU2QTIxXHU1RjBGXHVGRjFBc2hhcmVkPVx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMDhcdTlFRDhcdThCQTRcdUZGMDlcdUZGMUJwZXItdmF1bHQ9XHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQlx1RkYxQmN1c3RvbT1cdTgxRUFcdTVCOUFcdTRFNDkgKi9cbiAgZHNoSG9tZU1vZGU6IERzaEhvbWVNb2RlXG4gIC8qKiBcdTgxRUFcdTVCOUFcdTRFNDkgRFNIX0hPTUUgXHU4REVGXHU1Rjg0XHVGRjA4XHU0RUM1IGN1c3RvbSBcdTZBMjFcdTVGMEZcdTc1MUZcdTY1NDhcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKiBcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZTogYm9vbGVhblxuICAvKiogT2JzaWRpYW4gXHU1NDJGXHU1MkE4XHU2NUY2XHU4MUVBXHU1MkE4XHU2MkM5XHU4RDc3IERTSCAqL1xuICBhdXRvc3RhcnQ6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IERzaERvY2tTZXR0aW5ncyA9IHtcbiAgZHNoQmluOiAnJyxcbiAgbm9kZUJpbjogJycsXG4gIGhvc3Q6ICcxMjcuMC4wLjEnLFxuICBwb3J0OiAzMDgwLFxuICBkc2hIb21lTW9kZTogJ3NoYXJlZCcsXG4gIGRzaEhvbWU6ICcnLFxuICB1c2VFbWJlZGRlZE5vZGU6IGZhbHNlLFxuICBhdXRvc3RhcnQ6IHRydWUsXG59XG5cbmV4cG9ydCBjbGFzcyBEc2hEb2NrU2V0dGluZ3NUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcHJpdmF0ZSBjdXN0b21Ib21lRWw/OiBTZXR0aW5nXG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSBwbHVnaW46IERzaERvY2tQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKVxuICB9XG5cbiAgb3ZlcnJpZGUgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzXG4gICAgY29udGFpbmVyRWwuZW1wdHkoKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY5ODJcdTg5QzggLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ1x1MjZGNSBEU0ggRG9jaycgfSlcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXNldHRpbmdzLWRlc2MnLFxuICAgICAgdGV4dDogJ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFdlYiBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW5cdUZGMUFcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NEMgXHUyMTkyIFx1OTc2Mlx1Njc3Rlx1NUQ0Q1x1NTE2NVx1MzAwMlx1NTE2OFx1N0EwQlx1NUI5OFx1NjVCOVx1RkYwQ1x1OTZGNlx1ODFFQVx1NzgxNFx1MzAwMicsXG4gICAgfSlcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2NzBEXHU1MkExXHU2M0E3XHU1MjM2IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdcdTY3MERcdTUyQTEnIH0pXG4gICAgY29uc3Qgc3RhdHVzTGluZSA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NjcwRFx1NTJBMVx1NzJCNlx1NjAwMScpXG4gICAgICAuc2V0RGVzYyh0aGlzLmRlc2NyaWJlU3RhdHVzKCkpXG4gICAgY29uc3QgYnRucyA9IHN0YXR1c0xpbmUuY29udHJvbEVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJ0bnMnIH0pXG4gICAgY29uc3Qgc3RhcnRCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ21vZC1jdGEnLCB0ZXh0OiAnXHUyNUI2IFx1NTQyRlx1NTJBOCcgfSlcbiAgICBzdGFydEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5kaXNwbGF5KCkpXG4gICAgfVxuICAgIGNvbnN0IHN0b3BCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTI1QTAgXHU1MDVDXHU2QjYyJyB9KVxuICAgIHN0b3BCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RvcCgpLnRoZW4oKCkgPT4gdGhpcy5kaXNwbGF5KCkpXG4gICAgfVxuICAgIGNvbnN0IG9wZW5CdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0YnIH0pXG4gICAgb3BlbkJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuUGFuZWwoKVxuICAgIH1cblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1OTY4RiBPYnNpZGlhbiBcdTgxRUFcdTUyQThcdTU0MkZcdTUyQTgnKVxuICAgICAgLmFkZFRvZ2dsZSgodCkgPT5cbiAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b3N0YXJ0ID0gdlxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdThGRDBcdTg4NENcdTY1RjYgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1OEZEMFx1ODg0Q1x1NjVGNicgfSlcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdkc2ggQ0xJIFx1OERFRlx1NUY4NCcpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCXHVGRjA4RFNIX0JJTiBcdTIxOTIgbnBtIHJvb3QgLWcgXHUyMTkyIFx1NUUzOFx1ODlDMVx1NTE2OFx1NUM0MFx1NzZFRVx1NUY1NVx1RkYwOVx1MzAwMlx1NTNFRlx1NTg2QiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU2MjE2IGJpbi5qcyBcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvb3B0L2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvQGRlZXBzZWVrLWFpL2RzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEJpbilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEJpbiA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG4gICAgdGhpcy5kZXRlY3RMaW5lID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYnKVxuICAgICAgLnNldERlc2MoJ1x1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NjcwMFx1N0EzM1x1NUI5QVx1RkYwOVx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvYmluL25vZGUnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm9kZUJpbiA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUnKVxuICAgICAgLnNldERlc2MoJ0VMRUNUUk9OX1JVTl9BU19OT0RFXHUzMDAyXHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHUyMDE0XHUyMDE0XHU1QjlFXHU2RDRCIE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlx1NEVFNSBOb2RlIFx1NkEyMVx1NUYwRlx1OEZEMFx1ODg0Q1x1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwQ1x1NEVDNVx1NTcyOFx1OUE4Q1x1OEJDMVx1NTNFRlx1NzUyOFx1NjVGNlx1NUYwMFx1NTQyRlx1MzAwMicpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1N0Y1MVx1N0VEQyAtLS0tLS0tLS0tXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnXHU3RjUxXHU3RURDJyB9KVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1NTdGQVx1NTFDNlx1RkYwOScpXG4gICAgICAuc2V0RGVzYygnXHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdTMwMDJzaGFyZWQvY3VzdG9tIFx1NkEyMVx1NUYwRlx1NzZGNFx1NjNBNVx1NEY3Rlx1NzUyOFx1RkYxQnBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTU3MjhcdTZCNjRcdTU3RkFcdTc4NDBcdTRFMEFcdTYzMDkgdmF1bHQgXHU2RDNFXHU3NTFGXHU3MkVDXHU3QUNCXHU3QUVGXHU1M0UzXHVGRjA4XHU2QkNGIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEYxQVx1OEJERFx1NEU5Mlx1NEUwRFx1NTNFRlx1ODlDMVx1RkYwOVx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignMzA4MCcpXG4gICAgICAgICAgLnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5wb3J0KSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG4gPSBOdW1iZXIodi50cmltKCkpXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wb3J0ID0gTnVtYmVyLmlzSW50ZWdlcihuKSAmJiBuID49IDAgJiYgbiA8PSA2NTUzNSA/IG4gOiAzMDgwXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5uZXRQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZU5ldCgpXG4gICAgICAgICAgfSksXG4gICAgICApXG4gICAgdGhpcy5uZXRQcmV2aWV3ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTUgLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVx1RkYwOERTSF9IT01FXHVGRjA5XHU0RTBFXHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCJyB9KVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NkEyMVx1NUYwRicpXG4gICAgICAuc2V0RGVzYygncGVyLXZhdWx0IFx1NkEyMVx1NUYwRiA9IFx1NEYxQVx1OEJERFx1NjMwOVx1NUU5M1x1OTY5NFx1NzlCQlx1RkYwOFx1NTQwNFx1NUU5M1x1OTc2Mlx1Njc3Rlx1NTNFQVx1NjYzRVx1NzkzQVx1NjcyQ1x1NUU5M1x1NTIxQlx1NUVGQVx1NzY4NFx1NEYxQVx1OEJERFx1RkYwOVx1RkYwQ1x1NEY0Nlx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU3RjZFXHU0RTBFXHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHU1MTY4XHU1QzQwXHU1MTcxXHU0RUFCXHU0RTAwXHU0RUZEXHVGRjBDXHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4XHU1RTkzXHU3NTFGXHU2NTQ4XHUzMDAyJylcbiAgICAgIC5hZGREcm9wZG93bigoZGQpID0+IHtcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdzaGFyZWQnLCAnXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTRFMDBcdTU5NTdcdTkxNERcdTdGNkVcdTMwMDFcdTYzRDJcdTRFRjZcdTRFMEVcdTRGMUFcdThCRERcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ3Blci12YXVsdCcsICdcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREIH4vLmRzaC92YXVsdHMvPFx1NTQwRD4tPGhhc2g+XHVGRjA4XHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU0RUNEXHU1MTcxXHU0RUFCXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdjdXN0b20nLCAnXHU4MUVBXHU1QjlBXHU0RTQ5XHU4REVGXHU1Rjg0JylcbiAgICAgICAgZGQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUpXG4gICAgICAgIGRkLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSB2IGFzIERzaEhvbWVNb2RlXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICB0aGlzLmN1c3RvbUhvbWVFbD8uc2V0RGlzYWJsZWQodiAhPT0gJ2N1c3RvbScpXG4gICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICB0aGlzLmN1c3RvbUhvbWVFbCA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODQnKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvVXNlcnMveW91Ly5kc2gnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZSA9IHYudHJpbSgpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmN1c3RvbUhvbWVFbC5zZXREaXNhYmxlZCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSAhPT0gJ2N1c3RvbScpXG5cbiAgICB0aGlzLmhvbWVQcmV2aWV3ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2RpdicsIHsgY2xzOiAnZHNoLWRvY2stZGV0ZWN0JyB9KVxuXG4gICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgdGhpcy5ob21lUHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEc2hIb21lKClcbiAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgfVxuXG4gIHByaXZhdGUgZGV0ZWN0TGluZSE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgaG9tZVByZXZpZXchOiBIVE1MRWxlbWVudFxuICBwcml2YXRlIG5ldFByZXZpZXchOiBIVE1MRWxlbWVudFxuXG4gIHByaXZhdGUgZGVzY3JpYmVTdGF0dXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHJldHVybiBgJHtzLnVybH1cdUZGMDgke3MuYXR0YWNoZWQgPyAnXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICdcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NENcdTRFMkQnfVx1RkYwOWBcbiAgICB9XG4gICAgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykgcmV0dXJuICdcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjZcdUZGMDhcdTk5OTZcdTZCMjFcdTdFQTYgMTAgXHU3OUQyXHVGRjBDXHU5NzAwXHU1MjFEXHU1OUNCXHU1MzE2IHByb2ZpbGVcdUZGMDknXG4gICAgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykgcmV0dXJuIGBcdTU5MzFcdThEMjU6ICR7cy5tZXNzYWdlfWBcbiAgICByZXR1cm4gJ1x1NjcyQVx1OEZEMFx1ODg0QydcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEZXRlY3QoKTogc3RyaW5nIHtcbiAgICBjb25zdCBpbmZvID0gdGhpcy5wbHVnaW4uZGV0ZWN0SW5mbygpXG4gICAgcmV0dXJuIFtcbiAgICAgIGBkc2g6ICR7aW5mby5kc2hCaW4gPz8gJ1x1NjcyQVx1NjI3RVx1NTIzMCd9JHtpbmZvLmRzaE5vdGVzLmxlbmd0aCA/IGBcdUZGMDgke2luZm8uZHNoTm90ZXMuam9pbignXHVGRjFCJyl9XHVGRjA5YCA6ICcnfWAsXG4gICAgICBgbm9kZTogJHtpbmZvLm5vZGVOb3Rlcy5qb2luKCdcdUZGMUInKX1gLFxuICAgIF0uam9pbignXFxuJylcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVEc2hIb21lKCk6IHN0cmluZyB7XG4gICAgY29uc3QgaG9tZSA9IHRoaXMucGx1Z2luLmVmZmVjdGl2ZURzaEhvbWUoKVxuICAgIGNvbnN0IHNoYXJlZCA9IHRoaXMucGx1Z2luLmVmZmVjdGl2ZVNoYXJlZENvbmZpZ1Jvb3QoKVxuICAgIGlmIChzaGFyZWQpIHtcbiAgICAgIHJldHVybiBgXHU0RjFBXHU4QkREXHU3NkVFXHU1RjU1OiAke2hvbWV9XFxuXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCOiAke3NoYXJlZH1cdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1NEUwMFx1NkIyMVx1NTE2OFx1NUU5M1x1NzUxRlx1NjU0OFx1RkYwOWBcbiAgICB9XG4gICAgcmV0dXJuIGBcdTc1MUZcdTY1NDhcdThERUZcdTVGODQ6ICR7aG9tZX1gXG4gIH1cblxuICBwcml2YXRlIGRlc2NyaWJlTmV0KCk6IHN0cmluZyB7XG4gICAgY29uc3QgcG9ydCA9IHRoaXMucGx1Z2luLmVmZmVjdGl2ZVBvcnQoKVxuICAgIGNvbnN0IG1vZGUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZVxuICAgIGNvbnN0IHN1ZmZpeCA9IG1vZGUgPT09ICdwZXItdmF1bHQnID8gJ1x1RkYwOFx1NjcyQyB2YXVsdCBcdTcyRUNcdTUzNjBcdUZGMENcdTRFMEVcdTUxNzZcdTRFRDYgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjA5JyA6ICdcdUZGMDhzaGFyZWQvY3VzdG9tXHVGRjFBXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1RkYwOSdcbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1N0FFRlx1NTNFMzogJHtwb3J0fSR7c3VmZml4fWBcbiAgfVxufVxuIiwgIi8qKlxuICogRHNoV2ViVmlldyBcdTIwMTRcdTIwMTQgXHU2MjhBXHU1Qjk4XHU2NUI5IERTSCBXZWIgKDEyNy4wLjAuMTo8cG9ydD4pIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhbiBcdTk3NjJcdTY3N0ZcdTMwMDJcbiAqIFx1NUUyNlx1NUI4Q1x1NjU3NFx1OEZDN1x1N0EwQlx1NzJCNlx1NjAwMVx1RkYxQVx1NTJBMFx1OEY3RFx1NTJBOFx1NzUzQiAvIFx1OTUxOVx1OEJFRlx1NTM2MVx1NzI0N1x1RkYwOFx1NTQyQlx1OTFDRFx1OEJENVx1RkYwOS8gXHU2NzJBXHU1NDJGXHU1MkE4XHU3QTdBXHU3MkI2XHU2MDAxIC8gXHU1NkZFXHU2ODA3XHU1REU1XHU1MTc3XHU2ODBGXHUzMDAyXG4gKiBpZnJhbWUgXHU2MzA3XHU1NDExXHU1Qjk4XHU2NUI5XHU2NzBEXHU1MkExXHVGRjBDVUkgXHU1M0VBXHU2NjJGXCJcdTgyMzlcdTU3NUVcIlx1NTkxNlx1NThGM1x1MzAwMlxuICovXG5cbmltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBzZXRJY29uIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IGNvbnN0IERTSF9XRUJfVklFV19UWVBFID0gJ2RzaC1kb2NrLXdlYidcblxudHlwZSBVaVN0YXRlID0gJ3J1bm5pbmcnIHwgJ3N0YXJ0aW5nJyB8ICdlcnJvcicgfCAnc3RvcHBlZCdcblxuZXhwb3J0IGNsYXNzIERzaFdlYlZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHByaXZhdGUgaWZyYW1lRWw6IEhUTUxJRnJhbWVFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBwaWxsRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBvdmVybGF5RWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSB0b2dnbGVCdG46IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBjdXJyZW50OiBVaVN0YXRlID0gJ3N0b3BwZWQnXG5cbiAgY29uc3RydWN0b3IoXG4gICAgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIobGVhZilcbiAgfVxuXG4gIG92ZXJyaWRlIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIERTSF9XRUJfVklFV19UWVBFXG4gIH1cblxuICBvdmVycmlkZSBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnRFNIIERvY2snXG4gIH1cblxuICBvdmVycmlkZSBnZXRJY29uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdhbmNob3InXG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrJyB9KVxuXG4gICAgLy8gLS0tLSBcdTU5MzRcdTkwRThcdTVERTVcdTUxNzdcdTY4MEYgLS0tLVxuICAgIGNvbnN0IGhlYWRlciA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2staGVhZGVyJyB9KVxuICAgIGNvbnN0IGxvZ28gPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stbG9nbycgfSlcbiAgICBzZXRJY29uKGxvZ28sICdhbmNob3InKVxuICAgIGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stdGl0bGUnLCB0ZXh0OiAnRFNIIERvY2snIH0pXG4gICAgdGhpcy5waWxsRWwgPSBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXBpbGwnIH0pXG4gICAgaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwYWNlcicgfSlcblxuICAgIHRoaXMudG9nZ2xlQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICB0aGlzLnRvZ2dsZUJ0bi5vbmNsaWNrID0gKCkgPT4gdm9pZCB0aGlzLm9uVG9nZ2xlKClcblxuICAgIGNvbnN0IHJlZnJlc2hCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24ocmVmcmVzaEJ0biwgJ3JlZnJlc2gtY3cnKVxuICAgIHJlZnJlc2hCdG4udGl0bGUgPSAnXHU1MjM3XHU2NUIwJ1xuICAgIHJlZnJlc2hCdG4ub25jbGljayA9ICgpID0+IHRoaXMucmVsb2FkKClcblxuICAgIGNvbnN0IHBvcG91dEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihwb3BvdXRCdG4sICdtYXhpbWl6ZS0yJylcbiAgICBwb3BvdXRCdG4udGl0bGUgPSAnXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4XHU3MkVDXHU3QUNCXHU4RkRCXHU3QTBCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHVGRjA5J1xuICAgIHBvcG91dEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuUG9wb3V0KClcbiAgICB9XG5cbiAgICBjb25zdCBicm93c2VyQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKGJyb3dzZXJCdG4sICdleHRlcm5hbC1saW5rJylcbiAgICBicm93c2VyQnRuLnRpdGxlID0gJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCdcbiAgICBicm93c2VyQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5JbkJyb3dzZXIoKVxuICAgIH1cblxuICAgIC8vIC0tLS0gXHU0RTNCXHU0RjUzXHVGRjFBaWZyYW1lICsgXHU3MkI2XHU2MDAxXHU4OTg2XHU3NkQ2XHU1QzQyIC0tLS1cbiAgICBjb25zdCBib2R5ID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1ib2R5JyB9KVxuICAgIHRoaXMuaWZyYW1lRWwgPSBib2R5LmNyZWF0ZUVsKCdpZnJhbWUnLCB7IGNsczogJ2RzaC1kb2NrLWZyYW1lJyB9KVxuICAgIHRoaXMub3ZlcmxheUVsID0gYm9keS5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1vdmVybGF5JyB9KVxuXG4gICAgLy8gXHU3MkI2XHU2MDAxXHU4MDU0XHU1MkE4XG4gICAgdGhpcy5wbHVnaW4ub25TdGF0dXNDaGFuZ2UoKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgdGhpcy5yZWZyZXNoKClcblxuICAgIC8vIFx1NTE1Q1x1NUU5NVx1RkYxQVx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1ODJFNVx1NjcwRFx1NTJBMVx1NjcyQVx1NTQyRlx1NTJBOFx1NEUxNFx1N0FFRlx1NTNFM1x1NTNFRlx1NzUyOFx1RkYwQ1x1NUMxRFx1OEJENVx1NjJDOVx1OEQ3N1xuICAgIHZvaWQgdGhpcy5lbnN1cmVTdGFydGVkKClcblxuICAgIC8vIFx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1NTIzN1x1NjVCMFx1NEUwMFx1NkIyMVx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcdUZGMUFcdTc1MjhcdTYyMzdcdTZCNjRcdTUyM0JcdTZCNjNcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1NzY4NFx1N0E5N1x1NTNFM1xuICAgIC8vIFx1NUMzMVx1NjYyRlwiXHU1RjUzXHU1MjREIHZhdWx0XCJcdUZGMENcdTY1RTBcdTk3MDBcdTdCNDkgZm9jdXMvYWN0aXZlLWxlYWYtY2hhbmdlIFx1NEU4Qlx1NEVGNlx1MzAwMlxuICAgIHRoaXMucGx1Z2luLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICB9XG5cbiAgb3ZlcnJpZGUgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25Ub2dnbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoKClcbiAgfVxuXG4gIC8qKiBcdTk3NjJcdTY3N0ZcdTYyNTNcdTVGMDBcdTY1RjZcdTc4NkVcdTRGRERcdTY3MERcdTUyQTFcdTU3MjhcdThERDFcdUZGMDhcdTVERjJcdTU3MjhcdThERDFcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDkgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVTdGFydGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdzdG9wcGVkJyB8fCBzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICAgIHRoaXMucmVmcmVzaCgpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGxldCB1aTogVWlTdGF0ZVxuICAgIGxldCBwaWxsVGV4dCA9ICcnXG4gICAgbGV0IHBpbGxDbHMgPSAnJ1xuXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB1aSA9ICdydW5uaW5nJ1xuICAgICAgcGlsbFRleHQgPSBgXHUyNUNGICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICcgXHUwMEI3IFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnJ31gXG4gICAgICBwaWxsQ2xzID0gJ2lzLXJ1bm5pbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHVpID0gJ3N0YXJ0aW5nJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNDIFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNidcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RhcnRpbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHVpID0gJ2Vycm9yJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNzE1IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNSdcbiAgICAgIHBpbGxDbHMgPSAnaXMtZXJyb3InXG4gICAgfSBlbHNlIHtcbiAgICAgIHVpID0gJ3N0b3BwZWQnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0IgXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICAgICAgcGlsbENscyA9ICdpcy1zdG9wcGVkJ1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHVpXG4gICAgaWYgKHRoaXMucGlsbEVsKSB7XG4gICAgICB0aGlzLnBpbGxFbC5zZXRUZXh0KHBpbGxUZXh0KVxuICAgICAgdGhpcy5waWxsRWwuY2xhc3NOYW1lID0gYGRzaC1kb2NrLXBpbGwgJHtwaWxsQ2xzfWBcbiAgICB9XG4gICAgaWYgKHRoaXMudG9nZ2xlQnRuKSB7XG4gICAgICB0aGlzLnRvZ2dsZUJ0bi5lbXB0eSgpXG4gICAgICBzZXRJY29uKHRoaXMudG9nZ2xlQnRuLCBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZycgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgIHRoaXMudG9nZ2xlQnRuLnRpdGxlID0gcy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4J1xuICAgIH1cblxuICAgIC8vIGlmcmFtZSBcdTRFMEVcdTg5ODZcdTc2RDZcdTVDNDJcbiAgICBpZiAodWkgPT09ICdydW5uaW5nJykge1xuICAgICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5pZnJhbWVFbC5zcmMgIT09IHRoaXMucGx1Z2luLmJhc2VVcmwpIHtcbiAgICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgICB9XG4gICAgICB0aGlzLnNob3dPdmVybGF5KG51bGwpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0YXJ0aW5nKCkpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlckVycm9yKHMua2luZCA9PT0gJ2Vycm9yJyA/IHMubWVzc2FnZSA6ICdcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUYnKSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0b3BwZWQoKSlcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tIFx1ODk4Nlx1NzZENlx1NUM0Mlx1NkUzMlx1NjdEMyAtLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBzaG93T3ZlcmxheShjb250ZW50OiBIVE1MRWxlbWVudCB8IG51bGwpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMub3ZlcmxheUVsKSByZXR1cm5cbiAgICB0aGlzLm92ZXJsYXlFbC5lbXB0eSgpXG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgIHRoaXMub3ZlcmxheUVsLmFwcGVuZENoaWxkKGNvbnRlbnQpXG4gICAgICB0aGlzLm92ZXJsYXlFbC5yZW1vdmVBdHRyaWJ1dGUoJ2hpZGRlbicpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFx1OEZEMFx1ODg0Q1x1NEUyRFx1RkYxQVx1NjYzRVx1NUYwRlx1OTY5MFx1ODVDRlx1ODk4Nlx1NzZENlx1NUM0Mlx1RkYwOFx1NTQyNlx1NTIxOVx1N0E3QVx1NzY4NFx1N0VERFx1NUJGOVx1NUI5QVx1NEY0RFx1NUM0Mlx1NEYxQVx1NjMyMVx1NEY0RiBpZnJhbWVcdUZGMDlcbiAgICAgIHRoaXMub3ZlcmxheUVsLnNldEF0dHJpYnV0ZSgnaGlkZGVuJywgJycpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGFydGluZygpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwaW5uZXInIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ1x1NkI2M1x1NTcyOFx1NTQyRlx1NTJBOFx1NUI5OFx1NjVCOSBEU0ggV2ViXHUyMDI2JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoe1xuICAgICAgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJyxcbiAgICAgIHRleHQ6ICdcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOFx1N0VBNiAxMCBcdTc5RDJcdUZGMDlcdUZGMUJcdTdBRUZcdTUzRTNcdTg4QUJcdTUzNjBcdTc1MjhcdTY1RjZcdTVDMDZcdTgxRUFcdTUyQThcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnLFxuICAgIH0pXG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FsZXJ0LXRyaWFuZ2xlJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtbXNnJywgdGV4dDogbWVzc2FnZSB9KVxuICAgIGNvbnN0IHJldHJ5ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0bicsIHRleHQ6ICdcdTkxQ0RcdThCRDUnIH0pXG4gICAgcmV0cnkub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0b3BwZWQoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbmNob3InKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU2NzJBXHU4RkQwXHU4ODRDJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLCB0ZXh0OiAnXHU3MEI5XHU1MUZCXHU1NDJGXHU1MkE4XHVGRjBDXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgXHU1MDVDXHU5NzYwXHU4RkRCXHU2NzY1JyB9KVxuICAgIGNvbnN0IHN0YXJ0ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0biBtb2QtY3RhJywgdGV4dDogJ1x1NTQyRlx1NTJBOCBEU0gnIH0pXG4gICAgc3RhcnQub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbG9hZCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBjdXJyZW50VmF1bHQudHMgXHUyMDE0XHUyMDE0IFx1NjI4QVwiXHU1RjUzXHU1MjREXHU3MTI2XHU3MEI5IHZhdWx0XCJcdThERThcdThGREJcdTdBMEJcdTU0NEFcdThCQzkgRFNIIFx1NEZBN1x1MzAwMlxuICpcbiAqIGRzaC1kb2NrIFx1OEREMVx1NTcyOCBPYnNpZGlhbiBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTgwRkRcdTYyRkZcdTUyMzBcdTY3MDBcdTY3NDNcdTVBMDFcdTc2ODRcdTVGNTNcdTUyNEQgdmF1bHRcdUZGMDhcdTdBOTdcdTUzRTNcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTY1RjZcdUZGMENcbiAqIGBhcHAudmF1bHQuZ2V0TmFtZSgpYCArIGBhZGFwdGVyLmdldEJhc2VQYXRoKClgXHVGRjA5XHUzMDAyRFNIIFx1NzY4NFx1NURFNVx1NTE3N1x1NjNEMlx1NEVGNlxuICogZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHQgXHU4REQxXHU1NzI4XHU3MkVDXHU3QUNCIG5vZGUgXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU0RTI0XHU4MDA1XHU5MDFBXHU4RkM3XHU0RTAwXHU0RTJBXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU4OUUzXHU4MDI2XHU5MDFBXHU0RkUxXHVGRjFBXG4gKlxuICogICA8aG9tZWRpcj4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gICB7IG5hbWUsIHBhdGgsIHVwZGF0ZWRBdCB9XG4gKlxuICogLSBcdTRGNERcdTdGNkVcdTU2RkFcdTVCOUFcdTU3MjggYH4vLmRzaGBcdUZGMDhcdTRFMEUgZHNoLWRvY2sgXHU3Njg0IERTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1NjVFMFx1NTE3M1x1RkYwOVx1RkYwQ1x1NEVGQlx1NEY1NVx1NkEyMVx1NUYwRlxuICogICBcdTRFMEIgRFNIIFx1NEZBN1x1OTBGRFx1OEJGQlx1NUY5N1x1NTIzMFx1RkYxQlxuICogLSBcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdUZGMUFcdTZCQ0ZcdTRFMkEgT2JzaWRpYW4gXHU3QTk3XHU1M0UzXHVGRjA4XHU0RTNCXHU3QTk3XHU1M0UzIC8gcG9wb3V0XHVGRjA5XHU5MEZEXHU2NjJGXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU1NDA0XG4gKiAgIFx1ODFFQVx1NzZEMVx1NTQyQ1x1ODFFQVx1NURGMVx1NzY4NCB3aW5kb3cgZm9jdXMgXHUyMDE0XHUyMDE0IFx1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NkI2M1x1NjYyRlwiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXG4gKiAgIFx1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHVGRjFCXG4gKiAtIFx1NTkzMVx1OEQyNVx1OTc1OVx1OUVEOFx1RkYxQVx1NTE5OVx1NEUwRFx1OEZEQlx1RkYwOFx1Njc0M1x1OTY1MC9cdTc4QzFcdTc2RDhcdUZGMDlcdTUzRUEgY29uc29sZS53YXJuXHVGRjBDXHU3RUREXHU0RTBEXHU2MjUzXHU2NUFEXHU2M0QyXHU0RUY2XHU0RTNCXHU2RDQxXHU3QTBCXHVGRjFCXG4gKiAgIFx1NjU4N1x1NEVGNlx1NjM1Rlx1NTc0Ri9cdTdGM0FcdTU5MzFcdTY1RjYgRFNIIFx1NEZBN1x1NTZERVx1OTAwMFx1NTM5Rlx1NjcwOVx1NEZFMVx1NTNGN1x1RkYwQ1x1NTQxMVx1NTQwRVx1NTE3Q1x1NUJCOVx1NEUwRFx1ODhDNSBkc2gtZG9jayBcdTc2ODRcdTU3M0FcdTY2NkZcdTMwMDJcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG4vKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1NkZBXHU1QjlBXHU0RjREXHU3RjZFXHVGRjFBfi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZHNoJywgJ2N1cnJlbnQtdmF1bHQuanNvbicpXG59XG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUxODVcdTVCQjlcdUZGMDhEU0ggXHU0RkE3XHU1M0VBXHU4QkZCIG5hbWUvcGF0aFx1RkYwQ3VwZGF0ZWRBdCBcdTRGOUJcdThCQ0FcdTY1QURcdUZGMDkgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ3VycmVudFZhdWx0TWFya2VyIHtcbiAgbmFtZTogc3RyaW5nXG4gIHBhdGg6IHN0cmluZ1xuICB1cGRhdGVkQXQ6IG51bWJlclxufVxuXG4vKipcbiAqIFx1NTM5Rlx1NUI1MFx1NTE5OVx1NTE2NVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYxQVx1NTE0OFx1NTE5OVx1NTQwQ1x1NzZFRVx1NUY1NSAudG1wIFx1NTE4RCByZW5hbWVcdUZGMENcdTkwN0ZcdTUxNEQgRFNIIFx1NEZBN1x1OEJGQlx1NTIzMFx1NTM0QVx1NjIyQVx1NTE4NVx1NUJCOVx1MzAwMlxuICogXHU1OTMxXHU4RDI1XHU1M0VBXHU1NDRBXHU4QjY2XHVGRjBDXHU0RTBEXHU2MjlCXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlcihuYW1lOiBzdHJpbmcsIHZhdWx0UGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgZmlsZSA9IGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKVxuICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgY29uc3QgcGF5bG9hZDogQ3VycmVudFZhdWx0TWFya2VyID0geyBuYW1lLCBwYXRoOiB2YXVsdFBhdGgsIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSB9XG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYFxuICAgIGZzLndyaXRlRmlsZVN5bmModG1wLCBKU09OLnN0cmluZ2lmeShwYXlsb2FkLCBudWxsLCAyKSlcbiAgICBmcy5yZW5hbWVTeW5jKHRtcCwgZmlsZSlcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWRvY2tdIFx1NTE5OVx1NTE2NSBjdXJyZW50LXZhdWx0IFx1NjgwN1x1OEJCMFx1NTkzMVx1OEQyNScsIGVycilcbiAgfVxufVxuXG4vKiogXHU0RUNFIE9ic2lkaWFuIGFwcCBcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1NDBEXHU0RTBFXHU2ODM5XHU4REVGXHU1Rjg0XHVGRjFCXHU1M0Q2XHU0RTBEXHU1MjMwXHU4RkQ0XHU1NkRFIG51bGwgKi9cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50VmF1bHRJbmZvKGFwcDoge1xuICB2YXVsdDogeyBnZXROYW1lKCk6IHN0cmluZzsgYWRhcHRlcjogdW5rbm93biB9XG59KTogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9IHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgLy8gZ2V0QmFzZVBhdGggXHU0RTBEXHU1NzI4IG9ic2lkaWFuIFx1NzY4NFx1N0M3Qlx1NTc4Qlx1NUI5QVx1NEU0OVx1OTFDQ1x1RkYwOFx1OEZEMFx1ODg0Q1x1NjVGNiBEYXRhQWRhcHRlciBcdTYyNERcdTY3MDlcdUZGMDlcdUZGMENcbiAgICAvLyBcdTYyNDBcdTRFRTVcdThGRDlcdTkxQ0NcdTYyOEEgYWRhcHRlciBcdTVGNTMgdW5rbm93biBcdTU5MDRcdTc0MDZcdTUxOERcdTY1QURcdThBMDBcdTMwMDJcbiAgICBjb25zdCBiYXNlID0gKGFwcC52YXVsdC5hZGFwdGVyIGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfSkuZ2V0QmFzZVBhdGg/LigpXG4gICAgaWYgKCFiYXNlKSByZXR1cm4gbnVsbFxuICAgIHJldHVybiB7IG5hbWU6IGFwcC52YXVsdC5nZXROYW1lKCksIHBhdGg6IGJhc2UgfVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBUUEsSUFBQUEsbUJBQThDO0FBRTlDLElBQUFDLE1BQW9CO0FBQ3BCLElBQUFDLFFBQXNCOzs7QUNJdEIsMkJBQW9EO0FBQ3BELFNBQW9CO0FBQ3BCLFdBQXNCO0FBQ3RCLFNBQW9CO0FBQ3BCLFdBQXNC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RUEsTUFBTSxlQUE4QjtBQUNsQyxVQUFNLEtBQUssU0FBUyxLQUFLLFFBQVE7QUFBQSxFQUNuQztBQUFBO0FBQUEsRUFJQSxNQUFNLFlBQTJCO0FBQy9CLFVBQU0sRUFBRSxVQUFVLElBQUksS0FBSztBQUMzQixVQUFNLFNBQVMsVUFBVSxnQkFBZ0IsaUJBQWlCO0FBQzFELFFBQUksT0FBNkIsT0FBTyxDQUFDLEtBQUs7QUFDOUMsUUFBSSxDQUFDLE1BQU07QUFDVCxhQUFPLFVBQVUsYUFBYSxLQUFLO0FBQ25DLFVBQUksQ0FBQyxLQUFNO0FBQ1gsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ25FO0FBQ0EsY0FBVSxjQUFjLElBQUk7QUFBQSxFQUM5QjtBQUFBLEVBRUEsTUFBTSxnQkFBK0I7QUFDbkMsVUFBTSxFQUFFLE1BQU0sSUFBSSxRQUFRLFVBQVU7QUFDcEMsVUFBTSxNQUFNLGFBQWEsS0FBSyxPQUFPO0FBQUEsRUFDdkM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTUEsTUFBTSxhQUE0QjtBQUNoQyxRQUFJO0FBQ0YsWUFBTSxPQUFPLEtBQUssSUFBSSxVQUFVLGVBQWU7QUFDL0MsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ25FLFNBQVMsS0FBSztBQUNaLFlBQU0sTUFBTSxlQUFlLFFBQVEsSUFBSSxVQUFVLE9BQU8sR0FBRztBQUMzRCxVQUFJLHdCQUFPLHFEQUFhLEdBQUcsRUFBRTtBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAib3MiLCAicGF0aCIsICJlbWJlZGRlZE5vZGVWZXJzaW9uIiwgInJlc29sdmUiLCAiaW1wb3J0X29ic2lkaWFuIiwgImZzIiwgIm9zIiwgInBhdGgiXQp9Cg==
