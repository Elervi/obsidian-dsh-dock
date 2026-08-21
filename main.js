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
var import_obsidian4 = require("obsidian");
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
async function attachStatus(opts, host, port, url) {
  if (!opts.verifyBrand) {
    return { kind: "running", port, host, url, attached: true };
  }
  let isBrand = false;
  try {
    isBrand = await opts.verifyBrand(url);
  } catch {
    isBrand = false;
  }
  if (isBrand) {
    return { kind: "running", port, host, url, attached: true };
  }
  return {
    kind: "error",
    message: `\u7AEF\u53E3 ${port} \u5DF2\u88AB\u975E DSH \u670D\u52A1\u5360\u7528\uFF08\u54C1\u724C\u7279\u5F81\u6821\u9A8C\u672A\u901A\u8FC7\uFF09\u3002\u8BF7\u6362\u4E00\u4E2A\u7AEF\u53E3\uFF0C\u6216\u5148\u505C\u6389\u5360\u7528\u8BE5\u7AEF\u53E3\u7684\u670D\u52A1`
  };
}
async function ensureDshRunning(opts) {
  const port = opts.port ?? 3080;
  const host = opts.host ?? "127.0.0.1";
  const url = `http://${host}:${port}/`;
  if (await isPortUp(host, port)) {
    return { status: await attachStatus(opts, host, port, url) };
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
    return { status: await attachStatus(opts, host, port, url), proc };
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
function dshPidFilePath(dshHome) {
  return path.join(dshHome, ".dsh-dock.pid");
}
function writeDshPidFile(dshHome, port, pid) {
  try {
    fs.mkdirSync(dshHome, { recursive: true });
    fs.writeFileSync(dshPidFilePath(dshHome), JSON.stringify({ pid, port, ts: Date.now() }));
  } catch (err) {
    console.warn("[dsh-dock] \u5199\u5165 PID \u6587\u4EF6\u5931\u8D25", err);
  }
}
function readDshPidFile(dshHome) {
  try {
    const raw = fs.readFileSync(dshPidFilePath(dshHome), "utf8");
    const rec = JSON.parse(raw);
    if (typeof rec.pid === "number" && typeof rec.port === "number") return rec;
  } catch {
  }
  return null;
}
function removeDshPidFile(dshHome) {
  try {
    fs.unlinkSync(dshPidFilePath(dshHome));
  } catch {
  }
}
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function isDshWebOnPort(pid, port) {
  try {
    if (process.platform === "win32") {
      const out2 = (0, import_child_process.spawnSync)("wmic", ["process", "where", `processid=${pid}`, "get", "commandline"], {
        encoding: "utf8",
        timeout: 5e3,
        windowsHide: true
      });
      const cmd2 = out2.stdout || "";
      return cmd2.includes("dsh") && cmd2.includes(`--port ${port}`);
    }
    const out = (0, import_child_process.spawnSync)("ps", ["-ww", "-o", "command=", "-p", String(pid)], {
      encoding: "utf8",
      timeout: 5e3
    });
    const cmd = (out.stdout || "").trim();
    return cmd.includes("dsh") && cmd.includes(`--port ${port}`);
  } catch {
    return false;
  }
}
function processPpid(pid) {
  try {
    const out = (0, import_child_process.spawnSync)("ps", ["-o", "ppid=", "-p", String(pid)], { encoding: "utf8", timeout: 5e3 });
    const ppid = parseInt((out.stdout || "").trim(), 10);
    return Number.isFinite(ppid) ? ppid : -1;
  } catch {
    return -1;
  }
}
function isOrphanPid(pid, pidFileTs) {
  if (process.platform === "win32") {
    return pidFileTs < Date.now() - process.uptime() * 1e3;
  }
  return processPpid(pid) === 1;
}
async function stopProcessByPid(pid, timeoutMs = 3e3) {
  if (!isProcessAlive(pid)) return;
  if (process.platform === "win32") {
    try {
      (0, import_child_process.spawnSync)("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
    } catch {
    }
    return;
  }
  await new Promise((resolve2) => {
    const timer = setTimeout(() => {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
      }
    }, timeoutMs);
    const poll = setInterval(() => {
      if (!isProcessAlive(pid)) {
        clearInterval(poll);
        clearTimeout(timer);
        resolve2();
      }
    }, 100);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      clearInterval(poll);
      clearTimeout(timer);
      resolve2();
    }
  });
}
async function sweepOrphanDsh(dshHome, port) {
  const candidates = /* @__PURE__ */ new Set();
  const rec = readDshPidFile(dshHome);
  if (rec && rec.port === port && isProcessAlive(rec.pid) && isDshWebOnPort(rec.pid, port)) {
    candidates.add(rec.pid);
  }
  if (process.platform !== "win32") {
    try {
      const out = (0, import_child_process.spawnSync)("pgrep", ["-f", `dsh.*--port ${port}`], { encoding: "utf8", timeout: 5e3 });
      for (const line of (out.stdout || "").split(/\s+/)) {
        const pid = parseInt(line, 10);
        if (Number.isFinite(pid) && pid > 0 && isDshWebOnPort(pid, port)) candidates.add(pid);
      }
    } catch {
    }
  }
  let swept = false;
  for (const pid of candidates) {
    if (!isOrphanPid(pid, rec?.ts ?? 0)) continue;
    console.warn(`[dsh-dock] \u6E05\u7406\u5B64\u513F dsh web (pid=${pid}, port=${port})`);
    await stopProcessByPid(pid);
    swept = true;
  }
  if (swept) removeDshPidFile(dshHome);
  return swept;
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
  /** 标题栏"启动/停止"动作按钮（addAction 返回的元素，图标随状态切换） */
  toggleActionEl = null;
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
    this.toggleActionEl = this.addAction("play", "\u542F\u52A8", () => void this.onToggle());
    this.addAction("refresh-cw", "\u5237\u65B0", () => this.reload());
    this.addAction("maximize-2", "\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3\uFF08\u72EC\u7ACB\u8FDB\u7A0B\uFF0C\u6027\u80FD\u7B49\u540C\u6D4F\u89C8\u5668\uFF09", () => void this.plugin.openPopout());
    this.addAction("external-link", "\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00", () => void this.plugin.openInBrowser());
    const body = root.createDiv({ cls: "dsh-dock-body" });
    this.iframeEl = body.createEl("iframe", {
      cls: "dsh-dock-frame",
      attr: { sandbox: "allow-scripts allow-same-origin allow-forms allow-modals allow-popups" }
    });
    this.overlayEl = body.createDiv({ cls: "dsh-dock-overlay" });
    this.plugin.onStatusChange(() => this.refresh());
    this.refresh();
    void this.ensureStarted();
    this.plugin.refreshCurrentVaultMarker();
  }
  onClose() {
    return Promise.resolve();
  }
  /** D5：右键菜单（View.onPaneMenu, obsidian.d.ts:7709）——多面板/标签头右键自动获得 */
  onPaneMenu(menu, _source) {
    menu.addItem(
      (item) => item.setTitle(this.current === "running" || this.current === "starting" ? "\u505C\u6B62 DSH \u670D\u52A1" : "\u542F\u52A8 DSH \u670D\u52A1").setIcon(this.current === "running" || this.current === "starting" ? "square" : "play").onClick(() => void this.onToggle())
    );
    menu.addItem((item) => item.setTitle("\u5237\u65B0").setIcon("refresh-cw").onClick(() => this.reload()));
    menu.addItem(
      (item) => item.setTitle("\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3").setIcon("maximize-2").onClick(() => void this.plugin.openPopout())
    );
    menu.addItem(
      (item) => item.setTitle("\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00").setIcon("external-link").onClick(() => void this.plugin.openInBrowser())
    );
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
    const running = s.kind === "running" || s.kind === "starting";
    if (this.toggleActionEl) {
      this.toggleActionEl.empty();
      (0, import_obsidian2.setIcon)(this.toggleActionEl, running ? "square" : "play");
      this.toggleActionEl.title = running ? "\u505C\u6B62" : "\u542F\u52A8";
      this.toggleActionEl.setAttribute("aria-label", running ? "\u505C\u6B62" : "\u542F\u52A8");
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
var import_obsidian3 = require("obsidian");
var fs2 = __toESM(require("fs"), 1);
var os2 = __toESM(require("os"), 1);
var path2 = __toESM(require("path"), 1);
function currentVaultMarkerPath() {
  return path2.join(os2.homedir(), ".dsh", "current-vault.json");
}
function writeCurrentVaultMarker(name, vaultPath, activeFile) {
  try {
    const file = currentVaultMarkerPath();
    fs2.mkdirSync(path2.dirname(file), { recursive: true });
    const payload = { name, path: vaultPath, updatedAt: Date.now() };
    if (activeFile) payload.activeFile = activeFile;
    const tmp = `${file}.tmp`;
    fs2.writeFileSync(tmp, JSON.stringify(payload, null, 2));
    fs2.renameSync(tmp, file);
  } catch (err) {
    console.warn("[dsh-dock] \u5199\u5165 current-vault \u6807\u8BB0\u5931\u8D25", err);
  }
}
function currentVaultInfo(app) {
  try {
    const adapter = app.vault.adapter;
    if (!(adapter instanceof import_obsidian3.FileSystemAdapter)) return null;
    const activeFile = app.workspace.getActiveFile()?.path;
    const info = {
      name: app.vault.getName(),
      path: adapter.getBasePath()
    };
    if (activeFile) info.activeFile = activeFile;
    return info;
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
var DshDockPlugin = class extends import_obsidian4.Plugin {
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
    this.registerDomEvent(window, "focus", () => this.refreshCurrentVaultMarker());
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshCurrentVaultMarker()));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshCurrentVaultMarker()));
    this.registerEvent(this.app.workspace.on("window-open", () => this.refreshCurrentVaultMarker()));
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
    this.registerObsidianProtocolHandler("dsh-dock", (data) => {
      if (data.action === "open") void this.openPanel();
    });
    this.registerEvent(
      this.app.workspace.on("quit", async () => {
        await this.stop();
        this.refreshCurrentVaultMarker();
      })
    );
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
  /**
   * D7：首次"用户手动启用"时只跑一次的钩子（Plugin.onUserEnable,
   * obsidian.d.ts:5073，Obsidian 1.7.2+ 调用；旧版本忽略该钩子，插件照常工作，
   * 因此无需抬 minAppVersion）。只做引导提示，不做任何初始化。
   */
  onUserEnable() {
    new import_obsidian4.Notice("DSH Dock \u5DF2\u542F\u7528\uFF1A\u70B9\u51FB\u5DE6\u4FA7\u680F\u673A\u5668\u4EBA\u56FE\u6807\u6253\u5F00 DSH \u9762\u677F\uFF0C\u6216\u6267\u884C obsidian://dsh-dock?action=open");
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
  /** 当前 vault 根目录（无则 undefined）。D1：instanceof 取代强转，类型安全 */
  vaultRoot() {
    const adapter = this.app.vault.adapter;
    return adapter instanceof import_obsidian4.FileSystemAdapter ? adapter.getBasePath() : void 0;
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
  /** 读取当前 vault（含当前打开的笔记）并写标记文件（防抖 300ms，避免 focus 高频触发反复写盘） */
  refreshCurrentVaultMarker() {
    if (this.markerTimer) window.clearTimeout(this.markerTimer);
    this.markerTimer = window.setTimeout(() => {
      this.markerTimer = null;
      const info = currentVaultInfo(this.app);
      if (info) writeCurrentVaultMarker(info.name, info.path, info.activeFile);
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
      const swept = await sweepOrphanDsh(dshHome, port);
      if (swept) {
        new import_obsidian4.Notice(`DSH: \u5DF2\u6E05\u7406\u4E0A\u6B21\u6B8B\u7559\u7684\u670D\u52A1 (\u7AEF\u53E3 ${port})`);
      }
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port,
        host: this.settings.host,
        dshHome,
        // per-vault 配置共享：模型/密钥/主题指回共享 ~/.dsh，只隔离会话。
        ...sharedConfigRoot ? { sharedConfigRoot } : {},
        useEmbeddedNode: this.settings.useEmbeddedNode,
        // D3：端口已有服务时做品牌特征校验 —— 是 dsh web 才挂接，否则按
        // 「端口被非 DSH 服务占用」报错，把"误挂非 DSH 服务"从偶发变成不可能。
        // requestUrl 是 Obsidian 官方 CSP 豁免的 HTTP 助手（obsidian.d.ts:5442），
        // RequestUrlParam 没有 timeout 字段，所以 1.5s 快速存活探测仍走
        // node:http（launcher.ts isPortUp），这里只做慢速响应体特征校验。
        verifyBrand: (url) => this.verifyDshBrand(url),
        // per-vault 模式：注入本服务所属库 env（第二通道）。工具插件解析时
        // 优先用本 env 识别"本服务服务的库"，cwd 保持 dsh 进程默认工作目录
        // 不变 —— cwd 与 Obsidian 库是两个独立概念，不合并。
        env: sharedConfigRoot && vaultInfo ? {
          DSH_OBSIDIAN_VAULT_NAME: vaultInfo.name,
          DSH_OBSIDIAN_VAULT_PATH: vaultInfo.path
        } : {}
      });
      this.proc = result.proc ?? null;
      if (result.status.kind === "running" && result.proc && !result.status.attached) {
        if (result.proc.pid != null) {
          writeDshPidFile(dshHome, port, result.proc.pid);
        }
        this.hookChildLogs(result.proc);
      }
      this.setStatus(result.status);
      if (result.status.kind === "error") {
        new import_obsidian4.Notice(`DSH \u542F\u52A8\u5931\u8D25: ${result.status.message}`);
      } else if (result.status.kind === "running" && !result.status.attached) {
        new import_obsidian4.Notice(`DSH Web \u5DF2\u5C31\u7EEA: ${result.status.url}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus({ kind: "error", message: msg });
      new import_obsidian4.Notice(`DSH \u542F\u52A8\u5F02\u5E38: ${msg}`);
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
    removeDshPidFile(computeDshHome(this.settings, this.vaultRoot()));
    this.setStatus({ kind: "stopped" });
  }
  /**
   * D3：品牌特征校验 —— GET 服务根路径，响应体含 "DeepSeek Harness"
   * （官方 dsh web 前端 index.html 的 <title>）才认定是 dsh web。
   * requestUrl 是渲染进程里 CSP 豁免的官方 HTTP 助手（obsidian.d.ts:5442）；
   * throw: false 让 4xx/5xx 也走正常返回路径，统一按特征判断。
   */
  async verifyDshBrand(url) {
    try {
      const resp = await (0, import_obsidian4.requestUrl)({ url, method: "GET", throw: false });
      return resp.status === 200 && resp.text.includes("DeepSeek Harness");
    } catch {
      return false;
    }
  }
  hookChildLogs(proc) {
    proc.stderr?.on("data", (d) => console.warn("[dsh]", d.toString().trimEnd()));
    proc.once("exit", (code, signal) => {
      if (this.proc === proc) {
        this.proc = null;
        removeDshPidFile(computeDshHome(this.settings, this.vaultRoot()));
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
      new import_obsidian4.Notice(`\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3\u5931\u8D25: ${msg}`);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeDshHome,
  computePort,
  computeSharedConfigRoot
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmLCByZXF1ZXN0VXJsLCBGaWxlU3lzdGVtQWRhcHRlciB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHsgc2hlbGwgfSBmcm9tICdlbGVjdHJvbidcbmltcG9ydCB0eXBlIHsgQ2hpbGRQcm9jZXNzIH0gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHtcbiAgZW1iZWRkZWROb2RlVmVyc2lvbixcbiAgZW5zdXJlRHNoUnVubmluZyxcbiAgcmVtb3ZlRHNoUGlkRmlsZSxcbiAgcmVzb2x2ZURzaEJpbixcbiAgcmVzb2x2ZU5vZGVCaW4sXG4gIHNhZmVWYXVsdE5hbWUsXG4gIHN0YWJsZUhhc2gsXG4gIHN0b3BQcm9jZXNzLFxuICBzd2VlcE9ycGhhbkRzaCxcbiAgd3JpdGVEc2hQaWRGaWxlLFxuICB0eXBlIFNlcnZlclN0YXR1cyxcbn0gZnJvbSAnLi9sYXVuY2hlcidcbmltcG9ydCB7IERzaERvY2tTZXR0aW5nc1RhYiwgREVGQVVMVF9TRVRUSU5HUywgdHlwZSBEc2hEb2NrU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJ1xuaW1wb3J0IHsgRHNoV2ViVmlldywgRFNIX1dFQl9WSUVXX1RZUEUgfSBmcm9tICcuL3ZpZXcnXG5pbXBvcnQgeyBjdXJyZW50VmF1bHRJbmZvLCB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlciB9IGZyb20gJy4vY3VycmVudFZhdWx0J1xuXG4vKipcbiAqIFx1OEJBMVx1N0I5NyBEU0hfSE9NRVx1RkYxQVxuICogLSBwZXItdmF1bHRcdUZGMDhcdTlFRDhcdThCQTRcdUZGMDlcdUZGMUF+Ly5kc2gvdmF1bHRzLzxcdTUzRUZcdThCRkJcdTU0MEQ+LTxoYXNoNj4gXHUyMDE0XHUyMDE0IFx1NkJDRiB2YXVsdCBcdTcyRUNcdTdBQ0JcdUZGMDhoYXNoIFx1NkQ4OFx1NkI2N1x1RkYwQ1x1NEUyRFx1NjU4N1x1NTQwRFx1NEUwRFx1NzhCMFx1NjQ5RVx1RkYwOVx1RkYxQlxuICogLSBzaGFyZWRcdUZGMUF+Ly5kc2ggXHUyMDE0XHUyMDE0IFx1NEUwRVx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1NUI4Q1x1NTE2OFx1NEUwMFx1ODFGNFx1RkYwQ1x1NTkwRFx1NzUyOFx1NURGMlx1NjcwOVx1OTE0RFx1N0Y2RS9cdTRGMUFcdThCRERcdUZGMUJcbiAqIC0gY3VzdG9tXHVGRjFBXHU3NTI4XHU2MjM3XHU1ODZCXHU1MTk5XHU3Njg0XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlRHNoSG9tZShzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJyB8ICdkc2hIb21lJz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICByZXR1cm4gcy5kc2hIb21lLnRyaW0oKSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnKVxuICB9XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0Jykge1xuICAgIGNvbnN0IG5hbWUgPSB2YXVsdFJvb3QgPyBgJHtzYWZlVmF1bHROYW1lKHZhdWx0Um9vdCl9LSR7c3RhYmxlSGFzaCh2YXVsdFJvb3QpfWAgOiAndmF1bHQnXG4gICAgcmV0dXJuIHBhdGguam9pbihob21lLCAnLmRzaCcsICd2YXVsdHMnLCBuYW1lKVxuICB9XG4gIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnKVxufVxuXG4vKipcbiAqIFx1OEJBMVx1N0I5N1x1NjcyQyB2YXVsdCBcdTc2ODRcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdTMwMDJcbiAqIC0gc2hhcmVkIC8gY3VzdG9tXHVGRjFBc2V0dGluZ3MucG9ydFx1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5XHUyMDE0XHUyMDE0IFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTU0MENcdTRFMDBcdTY3MERcdTUyQTFcdTRFMEVcdTRGMUFcdThCRERcdUZGMUJcbiAqIC0gcGVyLXZhdWx0XHVGRjFBc2V0dGluZ3MucG9ydCArIChzdGFibGVIYXNoICUgNDA5NikgXHUyMDE0XHUyMDE0IFx1NkJDRlx1NEUyQSB2YXVsdCBcdTcyRUNcdTUzNjBcdTdBRUZcdTUzRTNcdUZGMENcdTU0MDRcdTgxRUFcbiAqICAgc3Bhd24gXHU3MkVDXHU3QUNCXHU3Njg0IGRzaCBcdThGREJcdTdBMEJcdUZGMUJcdTkxNERcdTU0MDhcdTcyRUNcdTdBQ0JcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCRERcdTVCNThcdTUwQThcdTY4MzlcdUZGMDlcdUZGMENcdTRFMERcdTU0MEMgdmF1bHQgXHU3Njg0XG4gKiAgIFx1NEYxQVx1OEJERFx1NUI4Q1x1NTE2OFx1OTY5NFx1NzlCQlx1RkYwQ1x1NEU5Mlx1NEUwRFx1NTNFRlx1ODlDMVx1MzAwMlx1N0FFRlx1NTNFM1x1NTFCMlx1N0E4MVx1Njk4Mlx1NzM4NyB+MS80MDk2XHVGRjBDXHU1M0VGXHU2M0E1XHU1M0Q3XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlUG9ydChzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJyB8ICdwb3J0Jz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogbnVtYmVyIHtcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnICYmIHZhdWx0Um9vdCkge1xuICAgIGNvbnN0IG9mZnNldCA9IHBhcnNlSW50KHN0YWJsZUhhc2godmF1bHRSb290KSwgMzYpICUgNDA5NlxuICAgIHJldHVybiBzLnBvcnQgKyBvZmZzZXRcbiAgfVxuICByZXR1cm4gcy5wb3J0XG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU1MTcxXHU3NTI4XHU0RTAwXHU0RUZEXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHVGRjA5XHUzMDAyXG4gKiAtIHNoYXJlZFx1RkYxQWRzaEhvbWUgXHU4MUVBXHU4RUFCXHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjBDXHU2NUUwXHU5NzAwXHU1MTcxXHU0RUFCXHU1QzQyXHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NjMwN1x1NUI5QVx1OERFRlx1NUY4NFx1NTM3M1x1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwQ1x1NjVFMFx1OTcwMFx1NTE3MVx1NEVBQlx1NUM0Mlx1RkYxQlxuICogLSBwZXItdmF1bHRcdUZGMUFcdThGRDRcdTU2REVcdTUxNzFcdTRFQUIgYH4vLmRzaGBcdUZGMENcdThCQTlcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3Njg0IHNldHRpbmdzL2NyZWRlbnRpYWxzXG4gKiAgIFx1NjMwN1x1NTZERVx1NUI4MyBcdTIwMTRcdTIwMTQgXHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4IHZhdWx0IFx1NzUxRlx1NjU0OFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVNoYXJlZENvbmZpZ1Jvb3QoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnKVxuICB9XG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHNoRG9ja1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBEc2hEb2NrU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTXG4gIHByaXZhdGUgcHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXM6IFNlcnZlclN0YXR1cyA9IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgcHJpdmF0ZSBzdGFydGluZyA9IGZhbHNlXG4gIHByaXZhdGUgc3RhdHVzQmFyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXNMaXN0ZW5lcnMgPSBuZXcgU2V0PCgpID0+IHZvaWQ+KClcbiAgLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE5OVx1NTE2NVx1OTYzMlx1NjI5NiB0aW1lclx1RkYwOFx1N0E5N1x1NTNFMyBmb2N1cyBcdTUzRUZcdTgwRkRcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdUZGMDkgKi9cbiAgcHJpdmF0ZSBtYXJrZXJUaW1lcjogbnVtYmVyIHwgbnVsbCA9IG51bGxcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKClcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KERTSF9XRUJfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IERzaFdlYlZpZXcobGVhZiwgdGhpcykpXG5cbiAgICAvLyBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdCArIFx1NUY1M1x1NTI0RFx1N0IxNFx1OEJCMFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdUZGMUFcdTY3MkNcdTdBOTdcdTUzRTNcdTYyNTNcdTVGMDBcdUZGMDhvbmxvYWRcdUZGMDlcdTRFMEVcbiAgICAvLyBcdTZCQ0ZcdTZCMjFcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTY1RjZcdTUyMzdcdTY1QjBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTMwMDJcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdTRFMEJcdTZCQ0ZcdTRFMkFcdTdBOTdcdTUzRTNcdTkwRkRcdTcyRUNcdTdBQ0JcdTUyQTBcdThGN0RcdTY3MkNcdTYzRDJcdTRFRjZcdUZGMENcbiAgICAvLyBcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTUzNzNcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1x1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHUzMDAyXG4gICAgdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICAvLyBEMlx1RkYxQXJlZ2lzdGVyRG9tRXZlbnQgXHU1M0Q2XHU0RUUzXHU2MjRCXHU1REU1IGFkZEV2ZW50TGlzdGVuZXIgKyByZWdpc3RlcigpXHVGRjBDXG4gICAgLy8gXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4XHUzMDAxXHU1Mzc4XHU4RjdEXHU4MUVBXHU1MkE4XHU2RTA1XHU3NDA2XHVGRjA4Q29tcG9uZW50LnJlZ2lzdGVyRG9tRXZlbnQsIG9ic2lkaWFuLmQudHM6MTg5Mlx1RkYwOVx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudCh3aW5kb3csICdmb2N1cycsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKVxuICAgIC8vIFx1ODg2NVx1NTE0NVx1NEZFMVx1NTNGN1x1RkYxQVx1NTE0OVx1NjgwN1x1NTIwN1x1NjM2Mlx1NjU4N1x1NEVGNlx1RkYwOGZpbGUtb3Blblx1RkYwOVx1MzAwMVx1NjVCMFx1N0E5N1x1NTNFMy9cdTVGMzlcdTdBOTdcdTYyNTNcdTVGMDBcdUZGMDh3aW5kb3ctb3Blblx1RkYwOVx1MzAwMVxuICAgIC8vIFx1NUUwM1x1NUM0MC9cdTZEM0JcdTUyQThcdTUzRjZcdTVCNTBcdTUzRDhcdTUzMTZcdUZGMDhhY3RpdmUtbGVhZi1jaGFuZ2VcdUZGMDlcdTkwRkRcdTUyMzdcdTRFMDBcdTZCMjEgXHUyMDE0XHUyMDE0IFx1ODk4Nlx1NzZENiB3aW5kb3cgZm9jdXNcbiAgICAvLyBcdTRFMERcdTZEM0VcdTUzRDFcdTc2ODRcdTU3M0FcdTY2NkZcdUZGMUJcdTk2MzJcdTYyOTZcdTUxNzFcdTc1MjhcdTRFMDBcdTRFMkEgdGltZXJcdUZGMENcdTRFOTJcdTRFMERcdTVFNzJcdTYyNzBcdTMwMDJcdTRFOEJcdTRFRjZcdTcyNDhcdTY3MkNcdTk1RThcdTY5REJcdUZGMUFcbiAgICAvLyBhY3RpdmUtbGVhZi1jaGFuZ2UvZmlsZS1vcGVuIDAuMTAuOStcdUZGMEN3aW5kb3ctb3BlbiAwLjE1LjMrXHVGRjBDXHU1NzQ3IFx1MjI2NCBtaW5BcHBWZXJzaW9uXHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignYWN0aXZlLWxlYWYtY2hhbmdlJywgKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCkpKVxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2ZpbGUtb3BlbicsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKCd3aW5kb3ctb3BlbicsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignYm90JywgJ0RTSCBEb2NrXHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJywgKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLXBhbmVsJyxcbiAgICAgIG5hbWU6ICdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3RicsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RhcnQtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTU0MkZcdTUyQTggRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0YXJ0KCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdG9wLWRzaCcsXG4gICAgICBuYW1lOiAnXHU1MDVDXHU2QjYyIERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdG9wKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1icm93c2VyJyxcbiAgICAgIG5hbWU6ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAgRFNIJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlbkluQnJvd3NlcigpLFxuICAgIH0pXG5cbiAgICAvLyBENlx1RkYxQVx1NkNFOFx1NTE4QyBvYnNpZGlhbjovL2RzaC1kb2NrIFx1NTM0Rlx1OEJBRVx1NTE2NVx1NTNFM1x1RkYwOFBsdWdpbi5yZWdpc3Rlck9ic2lkaWFuUHJvdG9jb2xIYW5kbGVyLFxuICAgIC8vIG9ic2lkaWFuLmQudHM6NTAyOFx1RkYwOVx1MzAwMkRTSCBXZWIgXHU0RkE3L1x1NTkxNlx1OTBFOFx1ODFFQVx1NTJBOFx1NTMxNlx1NTNFRlx1NzUyOFxuICAgIC8vIGBvYnNpZGlhbjovL2RzaC1kb2NrP2FjdGlvbj1vcGVuYCBcdTRFMDBcdTk1MkVcdTU1MjRcdThENzdcdTk3NjJcdTY3N0YgXHUyMDE0XHUyMDE0IFx1OTE0RFx1NTQwOFx1NTRDMVx1NzI0Q1x1NjgyMVx1OUE4Q1x1RkYwQ1xuICAgIC8vIFx1MzAwQ1x1NEVDRVx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTZERVx1NTIzMCBPYnNpZGlhblx1MzAwRFx1OTVFRFx1NzNBRlx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJPYnNpZGlhblByb3RvY29sSGFuZGxlcignZHNoLWRvY2snLCAoZGF0YSkgPT4ge1xuICAgICAgaWYgKGRhdGEuYWN0aW9uID09PSAnb3BlbicpIHZvaWQgdGhpcy5vcGVuUGFuZWwoKVxuICAgIH0pXG5cbiAgICAvLyBEN1x1RkYxQVx1OTAwMFx1NTFGQVx1NTI0RCBmbHVzaFx1MzAwMmB3b3Jrc3BhY2Uub24oJ3F1aXQnKWBcdUZGMDgwLjEwLjIrXHVGRjBDT2JzaWRpYW4gXHU1QzNEXHU1MjlCXHU4QzAzXHU3NTI4XHVGRjBDXG4gICAgLy8gXHU0RTBEXHU0RkREXHU4QkMxXHU2MjY3XHU4ODRDXHVGRjA5XHU5MUNDIGF3YWl0IFx1NTA1Q1x1NjcwRFx1NTJBMSArIFx1ODQzRFx1NzZEOFx1NjgwN1x1OEJCMFx1RkYwQ1x1ODg2NVx1NEUwQSBvbnVubG9hZCBcdTkxQ0NcbiAgICAvLyBgdm9pZCB0aGlzLnN0b3AoKWAgXHU0RTBEXHU3QjQ5XHU3RUQzXHU2NzlDXHU3Njg0XHU3RjNBXHU1M0UzXHVGRjA4XHU1RjNBXHU5MDAwXHU2NUY2IFBJRCBcdTY1ODdcdTRFRjYvXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1M0VGXHU4MEZEXHU2Q0ExXHU4NDNEXHU3NkQ4XHVGRjA5XHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdxdWl0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3AoKVxuICAgICAgICB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgICAgfSksXG4gICAgKVxuXG4gICAgdGhpcy5zdGF0dXNCYXJFbCA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRHNoRG9ja1NldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSlcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9zdGFydCkge1xuICAgICAgdm9pZCB0aGlzLnN0YXJ0KClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB2b2lkIHRoaXMuc3RvcCgpXG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2xlYXIoKVxuICB9XG5cbiAgLyoqXG4gICAqIEQ3XHVGRjFBXHU5OTk2XHU2QjIxXCJcdTc1MjhcdTYyMzdcdTYyNEJcdTUyQThcdTU0MkZcdTc1MjhcIlx1NjVGNlx1NTNFQVx1OEREMVx1NEUwMFx1NkIyMVx1NzY4NFx1OTRBOVx1NUI1MFx1RkYwOFBsdWdpbi5vblVzZXJFbmFibGUsXG4gICAqIG9ic2lkaWFuLmQudHM6NTA3M1x1RkYwQ09ic2lkaWFuIDEuNy4yKyBcdThDMDNcdTc1MjhcdUZGMUJcdTY1RTdcdTcyNDhcdTY3MkNcdTVGRkRcdTc1NjVcdThCRTVcdTk0QTlcdTVCNTBcdUZGMENcdTYzRDJcdTRFRjZcdTcxNjdcdTVFMzhcdTVERTVcdTRGNUNcdUZGMENcbiAgICogXHU1NkUwXHU2QjY0XHU2NUUwXHU5NzAwXHU2MkFDIG1pbkFwcFZlcnNpb25cdUZGMDlcdTMwMDJcdTUzRUFcdTUwNUFcdTVGMTVcdTVCRkNcdTYzRDBcdTc5M0FcdUZGMENcdTRFMERcdTUwNUFcdTRFRkJcdTRGNTVcdTUyMURcdTU5Q0JcdTUzMTZcdTMwMDJcbiAgICovXG4gIG92ZXJyaWRlIG9uVXNlckVuYWJsZSgpOiB2b2lkIHtcbiAgICBuZXcgTm90aWNlKCdEU0ggRG9jayBcdTVERjJcdTU0MkZcdTc1MjhcdUZGMUFcdTcwQjlcdTUxRkJcdTVERTZcdTRGQTdcdTY4MEZcdTY3M0FcdTU2NjhcdTRFQkFcdTU2RkVcdTY4MDdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1RkYwQ1x1NjIxNlx1NjI2N1x1ODg0QyBvYnNpZGlhbjovL2RzaC1kb2NrP2FjdGlvbj1vcGVuJylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDlcdTMwMDJEMVx1RkYxQWluc3RhbmNlb2YgXHU1M0Q2XHU0RUUzXHU1RjNBXHU4RjZDXHVGRjBDXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4ICovXG4gIHByaXZhdGUgdmF1bHRSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXJcbiAgICByZXR1cm4gYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyID8gYWRhcHRlci5nZXRCYXNlUGF0aCgpIDogdW5kZWZpbmVkXG4gIH1cblxuICBvblN0YXR1c0NoYW5nZShmbjogKCkgPT4gdm9pZCk6ICgpID0+IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmFkZChmbilcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zdGF0dXNMaXN0ZW5lcnMuZGVsZXRlKGZuKVxuICB9XG5cbiAgcHJpdmF0ZSBzZXRTdGF0dXMoc3RhdHVzOiBTZXJ2ZXJTdGF0dXMpOiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1cyA9IHN0YXR1c1xuICAgIHRoaXMucmVuZGVyU3RhdHVzQmFyKClcbiAgICBmb3IgKGNvbnN0IGZuIG9mIHRoaXMuc3RhdHVzTGlzdGVuZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmbigpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGF0dXNCYXIoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnN0YXR1c0JhckVsKSByZXR1cm5cbiAgICBjb25zdCBzID0gdGhpcy5zdGF0dXNcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dChgRFNIOiAke3MucG9ydH0ke3MuYXR0YWNoZWQgPyAnXHVGRjA4XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjA5JyA6ICcnfWApXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjYnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NjcyQVx1OEZEMFx1ODg0QycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXG5cbiAgLyoqIFx1OEJGQlx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1NTQyQlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYwOVx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLm1hcmtlclRpbWVyKVxuICAgIHRoaXMubWFya2VyVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgsIGluZm8uYWN0aXZlRmlsZSlcbiAgICB9LCAzMDApXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG5cbiAgLyoqIFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMSBcdTIxOTIgXHU2MzAyXHU2M0E1XHVGRjFCXHU1NDI2XHU1MjE5IHNwYXduIFx1NUI5OFx1NjVCOSBkc2ggd2ViICovXG4gIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XG4gICAgaWYgKHRoaXMuc3RhcnRpbmcpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIGlmICh0aGlzLnN0YXR1cy5raW5kID09PSAncnVubmluZycpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIHRoaXMuc3RhcnRpbmcgPSB0cnVlXG4gICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RhcnRpbmcnIH0pXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhdWx0Um9vdCA9IHRoaXMudmF1bHRSb290KClcbiAgICAgIGNvbnN0IGRzaEhvbWUgPSBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCBwb3J0ID0gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3Qgc2hhcmVkQ29uZmlnUm9vdCA9IGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHZhdWx0SW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICAvLyBcdTVCNjRcdTUxM0ZcdTZFMDVcdTYyNkJcdUZGMUFcdTRFMEFcdTZCMjEgT2JzaWRpYW4gXHU1RDI5XHU2RTgzL1x1NUYzQVx1OTAwMFx1NkI4Qlx1NzU1OVx1NzY4NFx1NjcyQ1x1N0FFRlx1NTNFMyBkc2ggd2ViIFx1NTE0OFx1NkUwNVx1NjM4OVx1NTE4RFx1NjJDOVx1OEQ3N1x1RkYwQ1xuICAgICAgLy8gXHU5MDdGXHU1MTREXCJcdTYzMDJcdTYzQTVcdTVCNjRcdTUxM0ZcIlx1OEJBOVx1NkI4Qlx1NzU1OVx1NkMzOFx1NEU0NVx1N0QyRlx1NzlFRlx1RkYwOFx1NTkxQVx1NUU5My9cdTU5MUFcdTdBOTdcdTUzRTNcdTVFNzZcdTUzRDFcdTVCODlcdTUxNjhcdUZGMENcdTg5QzEgbGF1bmNoZXIudHNcdUZGMDlcdTMwMDJcbiAgICAgIGNvbnN0IHN3ZXB0ID0gYXdhaXQgc3dlZXBPcnBoYW5Ec2goZHNoSG9tZSwgcG9ydClcbiAgICAgIGlmIChzd2VwdCkge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0g6IFx1NURGMlx1NkUwNVx1NzQwNlx1NEUwQVx1NkIyMVx1NkI4Qlx1NzU1OVx1NzY4NFx1NjcwRFx1NTJBMSAoXHU3QUVGXHU1M0UzICR7cG9ydH0pYClcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGVuc3VyZURzaFJ1bm5pbmcoe1xuICAgICAgICBkc2hCaW46IHRoaXMuc2V0dGluZ3MuZHNoQmluLFxuICAgICAgICBub2RlQmluOiB0aGlzLnNldHRpbmdzLm5vZGVCaW4sXG4gICAgICAgIHBvcnQsXG4gICAgICAgIGhvc3Q6IHRoaXMuc2V0dGluZ3MuaG9zdCxcbiAgICAgICAgZHNoSG9tZSxcbiAgICAgICAgLy8gcGVyLXZhdWx0IFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYxQVx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwQ1x1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1MzAwMlxuICAgICAgICAuLi4oc2hhcmVkQ29uZmlnUm9vdCA/IHsgc2hhcmVkQ29uZmlnUm9vdCB9IDoge30pLFxuICAgICAgICB1c2VFbWJlZGRlZE5vZGU6IHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlLFxuICAgICAgICAvLyBEM1x1RkYxQVx1N0FFRlx1NTNFM1x1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1NjVGNlx1NTA1QVx1NTRDMVx1NzI0Q1x1NzI3OVx1NUY4MVx1NjgyMVx1OUE4QyBcdTIwMTRcdTIwMTQgXHU2NjJGIGRzaCB3ZWIgXHU2MjREXHU2MzAyXHU2M0E1XHVGRjBDXHU1NDI2XHU1MjE5XHU2MzA5XG4gICAgICAgIC8vIFx1MzAwQ1x1N0FFRlx1NTNFM1x1ODhBQlx1OTc1RSBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHUzMDBEXHU2MkE1XHU5NTE5XHVGRjBDXHU2MjhBXCJcdThCRUZcdTYzMDJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVwiXHU0RUNFXHU1MDc2XHU1M0QxXHU1M0Q4XHU2MjEwXHU0RTBEXHU1M0VGXHU4MEZEXHUzMDAyXG4gICAgICAgIC8vIHJlcXVlc3RVcmwgXHU2NjJGIE9ic2lkaWFuIFx1NUI5OFx1NjVCOSBDU1AgXHU4QzQxXHU1MTREXHU3Njg0IEhUVFAgXHU1MkE5XHU2MjRCXHVGRjA4b2JzaWRpYW4uZC50czo1NDQyXHVGRjA5XHVGRjBDXG4gICAgICAgIC8vIFJlcXVlc3RVcmxQYXJhbSBcdTZDQTFcdTY3MDkgdGltZW91dCBcdTVCNTdcdTZCQjVcdUZGMENcdTYyNDBcdTRFRTUgMS41cyBcdTVGRUJcdTkwMUZcdTVCNThcdTZEM0JcdTYzQTJcdTZENEJcdTRFQ0RcdThENzBcbiAgICAgICAgLy8gbm9kZTpodHRwXHVGRjA4bGF1bmNoZXIudHMgaXNQb3J0VXBcdUZGMDlcdUZGMENcdThGRDlcdTkxQ0NcdTUzRUFcdTUwNUFcdTYxNjJcdTkwMUZcdTU0Q0RcdTVFOTRcdTRGNTNcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcdTMwMDJcbiAgICAgICAgdmVyaWZ5QnJhbmQ6ICh1cmwpID0+IHRoaXMudmVyaWZ5RHNoQnJhbmQodXJsKSxcbiAgICAgICAgLy8gcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1RkYxQVx1NkNFOFx1NTE2NVx1NjcyQ1x1NjcwRFx1NTJBMVx1NjI0MFx1NUM1RVx1NUU5MyBlbnZcdUZGMDhcdTdCMkNcdTRFOENcdTkwMUFcdTkwNTNcdUZGMDlcdTMwMDJcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjZcdTg5RTNcdTY3OTBcdTY1RjZcbiAgICAgICAgLy8gXHU0RjE4XHU1MTQ4XHU3NTI4XHU2NzJDIGVudiBcdThCQzZcdTUyMkJcIlx1NjcyQ1x1NjcwRFx1NTJBMVx1NjcwRFx1NTJBMVx1NzY4NFx1NUU5M1wiXHVGRjBDY3dkIFx1NEZERFx1NjMwMSBkc2ggXHU4RkRCXHU3QTBCXHU5RUQ4XHU4QkE0XHU1REU1XHU0RjVDXHU3NkVFXHU1RjU1XG4gICAgICAgIC8vIFx1NEUwRFx1NTNEOCBcdTIwMTRcdTIwMTQgY3dkIFx1NEUwRSBPYnNpZGlhbiBcdTVFOTNcdTY2MkZcdTRFMjRcdTRFMkFcdTcyRUNcdTdBQ0JcdTY5ODJcdTVGRjVcdUZGMENcdTRFMERcdTU0MDhcdTVFNzZcdTMwMDJcbiAgICAgICAgZW52OiBzaGFyZWRDb25maWdSb290ICYmIHZhdWx0SW5mb1xuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfTkFNRTogdmF1bHRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgIERTSF9PQlNJRElBTl9WQVVMVF9QQVRIOiB2YXVsdEluZm8ucGF0aCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9LFxuICAgICAgfSlcbiAgICAgIHRoaXMucHJvYyA9IHJlc3VsdC5wcm9jID8/IG51bGxcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiByZXN1bHQucHJvYyAmJiAhcmVzdWx0LnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAvLyBcdTY1QjBcdThENzdcdThGREJcdTdBMEJcdUZGMUFcdTUxOTlcdTUxNjUgUElEIFx1NjU4N1x1NEVGNlx1RkYwQ1x1NEY5Qlx1NEUwQlx1NkIyMVx1NTQyRlx1NTJBOFx1NkUwNVx1NjI2Qlx1NUI2NFx1NTEzRlx1NjVGNlx1OEJDNlx1NTIyQlx1NUY1Mlx1NUM1RVx1MzAwMlxuICAgICAgICBpZiAocmVzdWx0LnByb2MucGlkICE9IG51bGwpIHtcbiAgICAgICAgICB3cml0ZURzaFBpZEZpbGUoZHNoSG9tZSwgcG9ydCwgcmVzdWx0LnByb2MucGlkKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaG9va0NoaWxkTG9ncyhyZXN1bHQucHJvYylcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U3RhdHVzKHJlc3VsdC5zdGF0dXMpXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7cmVzdWx0LnN0YXR1cy5tZXNzYWdlfWApXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICFyZXN1bHQuc3RhdHVzLmF0dGFjaGVkKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBXZWIgXHU1REYyXHU1QzMxXHU3RUVBOiAke3Jlc3VsdC5zdGF0dXMudXJsfWApXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbXNnIH0pXG4gICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1RjAyXHU1RTM4OiAke21zZ31gKVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzXG4gIH1cblxuICBhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIGlmICh0aGlzLnByb2MpIHtcbiAgICAgIGF3YWl0IHN0b3BQcm9jZXNzKHRoaXMucHJvYylcbiAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICB9XG4gICAgcmVtb3ZlRHNoUGlkRmlsZShjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKSlcbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEQzXHVGRjFBXHU1NEMxXHU3MjRDXHU3Mjc5XHU1RjgxXHU2ODIxXHU5QThDIFx1MjAxNFx1MjAxNCBHRVQgXHU2NzBEXHU1MkExXHU2ODM5XHU4REVGXHU1Rjg0XHVGRjBDXHU1NENEXHU1RTk0XHU0RjUzXHU1NDJCIFwiRGVlcFNlZWsgSGFybmVzc1wiXG4gICAqIFx1RkYwOFx1NUI5OFx1NjVCOSBkc2ggd2ViIFx1NTI0RFx1N0FFRiBpbmRleC5odG1sIFx1NzY4NCA8dGl0bGU+XHVGRjA5XHU2MjREXHU4QkE0XHU1QjlBXHU2NjJGIGRzaCB3ZWJcdTMwMDJcbiAgICogcmVxdWVzdFVybCBcdTY2MkZcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTkxQ0MgQ1NQIFx1OEM0MVx1NTE0RFx1NzY4NFx1NUI5OFx1NjVCOSBIVFRQIFx1NTJBOVx1NjI0Qlx1RkYwOG9ic2lkaWFuLmQudHM6NTQ0Mlx1RkYwOVx1RkYxQlxuICAgKiB0aHJvdzogZmFsc2UgXHU4QkE5IDR4eC81eHggXHU0RTVGXHU4RDcwXHU2QjYzXHU1RTM4XHU4RkQ0XHU1NkRFXHU4REVGXHU1Rjg0XHVGRjBDXHU3RURGXHU0RTAwXHU2MzA5XHU3Mjc5XHU1RjgxXHU1MjI0XHU2NUFEXHUzMDAyXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHZlcmlmeURzaEJyYW5kKHVybDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCByZXF1ZXN0VXJsKHsgdXJsLCBtZXRob2Q6ICdHRVQnLCB0aHJvdzogZmFsc2UgfSlcbiAgICAgIHJldHVybiByZXNwLnN0YXR1cyA9PT0gMjAwICYmIHJlc3AudGV4dC5pbmNsdWRlcygnRGVlcFNlZWsgSGFybmVzcycpXG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGhvb2tDaGlsZExvZ3MocHJvYzogQ2hpbGRQcm9jZXNzKTogdm9pZCB7XG4gICAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS53YXJuKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Mub25jZSgnZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIGlmICh0aGlzLnByb2MgPT09IHByb2MpIHtcbiAgICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgICAgICByZW1vdmVEc2hQaWRGaWxlKGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpKVxuICAgICAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICF0aGlzLnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYERTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkE6IGNvZGU9JHtjb2RlfSBzaWduYWw9JHtzaWduYWwgPz8gJyd9YCB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW2RzaC1kb2NrXSBcdTVCNTBcdThGREJcdTdBMEJcdTk1MTlcdThCRUYnLCBlcnIpXG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBgXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGOiAke2Vyci5tZXNzYWdlfWAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqIFx1NjNBMlx1NkQ0Qlx1NEZFMVx1NjA2Rlx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBkZXRlY3RJbmZvKCk6IHsgZHNoQmluOiBzdHJpbmcgfCBudWxsOyBkc2hOb3Rlczogc3RyaW5nW107IG5vZGVOb3Rlczogc3RyaW5nW10gfSB7XG4gICAgY29uc3QgZm91bmQgPSByZXNvbHZlRHNoQmluKHRoaXMuc2V0dGluZ3MuZHNoQmluKVxuICAgIGNvbnN0IG5vZGUgPSByZXNvbHZlTm9kZUJpbih0aGlzLnNldHRpbmdzLm5vZGVCaW4sIGVtYmVkZGVkTm9kZVZlcnNpb24oKSwgdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpXG4gICAgcmV0dXJuIHtcbiAgICAgIGRzaEJpbjogZm91bmQuYmluLFxuICAgICAgZHNoTm90ZXM6IGZvdW5kLm5vdGVzLFxuICAgICAgbm9kZU5vdGVzOiBub2RlLm5vdGVzLFxuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZWZmZWN0aXZlRHNoSG9tZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKVxuICB9XG5cbiAgLyoqIFx1NUY1M1x1NTI0RFx1OEJCRVx1N0Y2RVx1NEUwQlx1NzUxRlx1NjU0OFx1NzY4NFx1N0FFRlx1NTNFM1x1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTZCQ0YgdmF1bHQgXHU3MkVDXHU3QUNCXHVGRjA5ICovXG4gIGVmZmVjdGl2ZVBvcnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gfi8uZHNoXHVGRjBDXHU1MTc2XHU0RjU5XHU2NUUwXHVGRjA5ICovXG4gIGVmZmVjdGl2ZVNoYXJlZENvbmZpZ1Jvb3QoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gY29tcHV0ZVNoYXJlZENvbmZpZ1Jvb3QodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSAoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSBhcyBQYXJ0aWFsPERzaERvY2tTZXR0aW5ncz4gfCBudWxsXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGRhdGEgPz8ge30pXG4gICAgLy8gXHU2NUU3XHU3MjQ4XHVGRjA4ZHNoLWhvc3QgVjAuMVx1RkYwOVx1OEJCRVx1N0Y2RVx1OEZDMVx1NzlGQlx1RkYxQWRzaEhvbWUgXHU1QjU3XHU3QjI2XHU0RTMyIFx1MjE5MiBjdXN0b20gXHU2QTIxXHU1RjBGXG4gICAgY29uc3QgbGVnYWN5OiB7IGRzaEhvbWU/OiBzdHJpbmcgfSB8IG51bGwgPSBkYXRhXG4gICAgaWYgKGxlZ2FjeT8uZHNoSG9tZSAmJiB0eXBlb2YgbGVnYWN5LmRzaEhvbWUgPT09ICdzdHJpbmcnICYmIGxlZ2FjeS5kc2hIb21lLnRyaW0oKSkge1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lTW9kZSA9ICdjdXN0b20nXG4gICAgICB0aGlzLnNldHRpbmdzLmRzaEhvbWUgPSBsZWdhY3kuZHNoSG9tZS50cmltKClcbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFVJXG5cbiAgYXN5bmMgb3BlblBhbmVsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcFxuICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRFNIX1dFQl9WSUVXX1RZUEUpXG4gICAgbGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCBudWxsID0gbGVhdmVzWzBdID8/IG51bGxcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIC8vIEQ4XHVGRjFBZ2V0UmlnaHRMZWFmKGZhbHNlKSBcdTU3MjggMS4xMy54IFx1NzY4NCBkLnRzIFx1NEUwRVx1NUI5OFx1NjVCOSBkb2NzIFx1NEUyRFx1NTc0N1x1NjVFMFxuICAgICAgLy8gQGRlcHJlY2F0ZWQgXHU2ODA3XHU4QkIwXHVGRjA4XHU2OEMwXHU2RDRCXHU2MkE1XHU1NDRBIFx1MDBBNzUuMVx1RkYwOVx1RkYwQ1x1OEJFRFx1NEU0OVx1NTM3M1wiXHU1M0YzXHU0RkE3XHU2ODBGXHU1M0Y2XHU1QjUwXCJcdUZGMENcdTUzRUZcdTdFRTdcdTdFRURcdTc1MjhcdUZGMUJcbiAgICAgIC8vIGVuc3VyZVNpZGVMZWFmIFx1OTcwMCBPYnNpZGlhbiAxLjcuMitcdUZGMENcdTgwMEMgbWluQXBwVmVyc2lvbiBcdTRGRERcdTYzMDEgMS41LjBcdUZGMENcbiAgICAgIC8vIFx1NEUwRFx1NUYxNVx1NTE2NVx1OTg5RFx1NTkxNlx1NzI0OFx1NjcyQ1x1OTVFOFx1NjlEQlx1MzAwMlxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpXG4gICAgICBpZiAoIWxlYWYpIHJldHVyblxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfVxuICAgIHdvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGxlYWYpXG4gIH1cblxuICBhc3luYyBvcGVuSW5Ccm93c2VyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHNoZWxsLm9wZW5FeHRlcm5hbCh0aGlzLmJhc2VVcmwpXG4gIH1cblxuICAvKipcbiAgICogXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4T2JzaWRpYW4gcG9wb3V0XHVGRjA5XHVGRjFBRFNIIFx1OTc2Mlx1Njc3Rlx1OEZEQlx1NTE2NVx1NzJFQ1x1N0FDQiBCcm93c2VyV2luZG93ID1cbiAgICogXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU0RTBFIE9ic2lkaWFuIFx1NEUzQlx1N0E5N1x1NTNFM1x1OTY5NFx1NzlCQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1NjgwN1x1N0I3RVx1OTg3NVx1MzAwMlxuICAgKi9cbiAgYXN5bmMgb3BlblBvcG91dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5vcGVuUG9wb3V0TGVhZigpXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgbmV3IE5vdGljZShgXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHU1OTMxXHU4RDI1OiAke21zZ31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogbGF1bmNoZXIudHMgXHUyMDE0XHUyMDE0IFx1N0VBRlx1NTQyRlx1NTJBOFx1OTAzQlx1OEY5MVx1RkYwOFx1OTZGNiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMENcdTUzRUZcdTcyRUNcdTdBQ0JcdTUxOTJcdTcwREZcdTZENEJcdThCRDVcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTgwNENcdThEMjNcdUZGMUFcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2IFx1MjE5MiBzcGF3biBgZHNoIHdlYmBcbiAqIFx1RkYwODEyNy4wLjAuMTo8cG9ydD5cdUZGMDlcdTIxOTIgXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBIFx1MjE5MiBcdTUwNUNcdTZCNjJcdTMwMDJcbiAqXG4gKiBcdTUxNzNcdTk1MkVcdTRFOEJcdTVCOUVcdUZGMDhcdTVERjJcdTU3MjhcdTVCOThcdTY1QjkgQGRlZXBzZWVrLWFpL2RzaEAwLjEuMC1yYy42IFx1NEUwQVx1OUE4Q1x1OEJDMVx1RkYwOVx1RkYxQVxuICogLSBgbm9kZSA8ZHNoPi9saWIvYmluLmpzIHdlYiAtLWhvc3QgMTI3LjAuMC4xIC0tcG9ydCA8cG9ydD5gIFx1NTM3M1x1NUI5OFx1NjVCOSBXZWIgVUlcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0IGhvc3Q9MTI3LjAuMC4xXHUzMDAxcG9ydD0zMDgwXHVGRjA4XHU1M0VGXHU4OTg2XHU3NkQ2XHVGRjA5XHVGRjFCXG4gKiAtIFx1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1ODFFQVx1NTJBOFx1NTIxRFx1NTlDQlx1NTMxNiAkRFNIX0hPTUUvcHJvZmlsZXMvd2ViXHVGRjA4YnVuZGxlcyA9IGRzaC1iYXNlICsgZHNoLXdlYi1hcHBcdUZGMDlcdUZGMENcbiAqICAgXHU2QTIxXHU1NzU3XHU4OUUzXHU2NzkwXHU4RDcwICREU0hfSE9NRS9wcm9maWxlcy9ub2RlX21vZHVsZXMgXHU1RTczXHU5NzYyXHU3QjI2XHU1M0Y3XHU5NEZFXHU2M0E1XHVGRjBDXHU2NUUwXHU5NzAwIHBucG0vXHU4MDU0XHU3RjUxXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNFx1OTE0RFx1N0Y2RVx1NEUwQiBTUUxpdGVcdUZGMDhub2RlOnNxbGl0ZVx1RkYwQ1x1OTcwMCBOb2RlIFx1MjI2NTIyLjVcdUZGMDlcdTRFMERcdTRGMUFcdTYyNTNcdTVGMDBcdUZGMDhvcGVuQXQ6IG5ldmVyXHVGRjA5XHVGRjBDXG4gKiAgIFx1NTZFMFx1NkI2NCBOb2RlIDIwKyBcdTRFNUZcdTgwRkRcdThERDFcdTlFRDhcdThCQTQgd2ViIHByb2ZpbGVcdUZGMUJcdTU0MkZcdTc1MjhcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTY1RjZcdTYyNERcdTk3MDBcdTg5ODEgTm9kZSBcdTIyNjUyMi41XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgc3Bhd24sIHNwYXduU3luYywgdHlwZSBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IERTSF9SRUxBVElWRV9CSU4gPSBwYXRoLmpvaW4oJ0BkZWVwc2Vlay1haScsICdkc2gnLCAnbGliJywgJ2Jpbi5qcycpXG5cbi8qKiBOb2RlIFx1NEUzQlx1NzI0OFx1NjcyQ1x1NTNGN1x1NkJENFx1OEY4M1x1RkYxQW5vZGU6c3FsaXRlIFx1OTcwMFx1ODk4MSBcdTIyNjUyMi41XHVGRjA4XHU0RUM1XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU1MjlGXHU4MEZEXHU3NTI4XHU1MjMwXHVGRjA5ICovXG5leHBvcnQgY29uc3QgTk9ERV9TUUxJVEVfTUlOX01BSk9SID0gMjJcblxuLyoqIFx1N0EzM1x1NUI5QVx1NzdFRFx1NTRDOFx1NUUwQ1x1RkYwOGRqYjJcdUZGMDlcdUZGMENcdTc1MjhcdTRFOEUgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHU2RDg4XHU2QjY3XHVGRjBDXHU5MDdGXHU1MTREXHU0RTJEXHU2NTg3XHU1NDBEXHU2RTA1XHU2RDE3XHU3OEIwXHU2NDlFICovXG5leHBvcnQgZnVuY3Rpb24gc3RhYmxlSGFzaChpbnB1dDogc3RyaW5nLCBsZW4gPSA2KTogc3RyaW5nIHtcbiAgbGV0IGggPSA1MzgxXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIGggPSAoKGggPDwgNSkgKyBoICsgaW5wdXQuY2hhckNvZGVBdChpKSkgPj4+IDBcbiAgcmV0dXJuIGgudG9TdHJpbmcoMzYpLnBhZFN0YXJ0KGxlbiwgJzAnKS5zbGljZSgwLCBsZW4pXG59XG5cbi8qKiBcdTUzRUZcdThCRkJcdTc2ODQgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHVGRjA4XHU0RkREXHU3NTU5IFVuaWNvZGUgXHU1QjU3XHU2QkNEXHU2NTcwXHU1QjU3XHVGRjBDXHU1MTc2XHU0RjU5XHU4RjZDIC1cdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTkgJ3ZhdWx0JyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVWYXVsdE5hbWUodmF1bHRSb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjbGVhbmVkID0gcGF0aFxuICAgIC5iYXNlbmFtZSh2YXVsdFJvb3QpXG4gICAgLnJlcGxhY2UoL1teXFxwe0x9XFxwe059Xy1dKy9ndSwgJy0nKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csICcnKVxuICByZXR1cm4gKGNsZWFuZWQgfHwgJ3ZhdWx0Jykuc2xpY2UoMCwgNDApXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF1bmNoT3B0aW9ucyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMENcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW4/OiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5ICovXG4gIG5vZGVCaW4/OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ/OiBudW1iZXJcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0IDEyNy4wLjAuMVx1RkYwQ1x1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0Pzogc3RyaW5nXG4gIC8qKiAkRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCREQvXHU1QkM2XHU5NEE1L1x1NkEyMVx1NTc4Qlx1OTE0RFx1N0Y2RVx1NjgzOVx1NzZFRVx1NUY1NVx1RkYxQlx1OUVEOFx1OEJBNCA8dmF1bHQ+Ly5kc2hcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKlxuICAgKiBcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0IGB+Ly5kc2hgXHVGRjA5XHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTdCNDlcdTkxNERcdTdGNkVcdTdDN0JcdTY1ODdcdTRFRjZcbiAgICogXHU2MzA3XHU1NDExXHU2QjY0XHU3NkVFXHU1RjU1XHVGRjBDXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NEUwMFx1NEVGRFx1RkYxQnNlc3Npb25zIFx1N0I0OVx1NjU3MFx1NjM2RVx1NEVDRFx1NTcyOCBgZHNoSG9tZWAgXHU5Njk0XHU3OUJCXHUzMDAyXG4gICAqIFx1NzU1OVx1N0E3QSA9IFx1NEUwRFx1NTQyRlx1NzUyOFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwOGRzaEhvbWUgXHU4MUVBXHU4RUFCXHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA5XHUzMDAyXG4gICAqL1xuICBzaGFyZWRDb25maWdSb290Pzogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZT86IGJvb2xlYW5cbiAgLyoqIFx1NUMzMVx1N0VFQVx1N0I0OVx1NUY4NVx1NEUwQVx1OTY1MFx1RkYwOFx1OUVEOFx1OEJBNCAxMjBzXHVGRjA5ICovXG4gIHRpbWVvdXRNcz86IG51bWJlclxuICAvKiogXHU5NjQ0XHU1MkEwXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGICovXG4gIGVudj86IE5vZGVKUy5Qcm9jZXNzRW52XG4gIC8qKlxuICAgKiBcdTVCNTBcdThGREJcdTdBMEJcdTVERTVcdTRGNUNcdTc2RUVcdTVGNTVcdTMwMDJwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RjIwIHZhdWx0IFx1NjgzOVx1RkYxQVx1NjVCMFx1NUVGQVx1NEYxQVx1OEJERFx1NzY4NCBjd2QgXHU1MzczXHU2NzJDXHU1RTkzXHU2ODM5XHVGRjBDXG4gICAqIHZhdWx0IFx1NURFNVx1NTE3N1x1ODlFM1x1Njc5MFx1OTg3QVx1NUU4Rlx1N0IyQyAzIFx1NEY0RFx1RkYwOFx1NEYxQVx1OEJERCBjd2QgXHU4MkU1XHU2NjJGXHU1RTkzXHVGRjA5XHU3NkY0XHU2M0E1XHU1NDdEXHU0RTJEIFx1MjAxNFx1MjAxNCBcdTU3MjhcdTc1MUZcdTcyNjlcdTU5MDdcdThCRkVcdTc2ODRcbiAgICogXHU2NzBEXHU1MkExXHU5MUNDXHU2M0QwXHU5NUVFXHU3RUREXHU0RTBEXHU0RjFBXHU4OUUzXHU2NzkwXHU2MjEwXHU3NTFGXHU3MjY5XHU5ODk4XHU1RTkzXHUzMDAyc2hhcmVkIFx1NkEyMVx1NUYwRlx1NEUwRFx1NEYyMFx1RkYwOFx1NjI0MFx1NjcwOVx1NUU5M1x1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQVx1NjcwRFx1NTJBMVx1RkYwQ1xuICAgKiBcdTk3NjBcdTcxMjZcdTcwQjlcdTY4MDdcdThCQjBcdThEREZcdTk2OEZcdUZGMDlcdTMwMDJcbiAgICovXG4gIGN3ZD86IHN0cmluZ1xuICAvKipcbiAgICogXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHU2NUY2XHU3Njg0XCJcdTU0QzFcdTcyNENcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcIlx1RkYwOFx1NzUzMVx1NjNEMlx1NEVGNlx1NEZBN1x1NkNFOFx1NTE2NVx1RkYwQ2xhdW5jaGVyIFx1NEZERFx1NjMwMVx1OTZGNlxuICAgKiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMDlcdUZGMUFcdThGRDRcdTU2REUgdHJ1ZSBcdTYyNERcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMUJcdThGRDRcdTU2REUgZmFsc2UgXHU2MzA5XHUzMDBDXHU3QUVGXHU1M0UzXHU4OEFCXHU5NzVFXG4gICAqIERTSCBcdTY3MERcdTUyQTFcdTUzNjBcdTc1MjhcdTMwMERcdTYyQTVcdTk1MTlcdUZGMENcdTkwN0ZcdTUxNERcdTYyOEFcdTUyMkJcdTc2ODRcdTY3MERcdTUyQTFcdThCRUZcdTVGNTNcdTYyMTAgZHNoIHdlYlx1MzAwMlx1NEUwRFx1NEYyMCA9IFx1OERGM1x1OEZDN1x1NjgyMVx1OUE4Q1xuICAgKiBcdUZGMDhcdTY1RTdcdTg4NENcdTRFM0FcdUZGMENcdTdBRUZcdTUzRTNcdTY3MDlcdTY3MERcdTUyQTFcdTUzNzNcdTYzMDJcdTYzQTVcdUZGMDlcdTMwMDJcbiAgICovXG4gIHZlcmlmeUJyYW5kPzogKHVybDogc3RyaW5nKSA9PiBQcm9taXNlPGJvb2xlYW4+XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWROb2RlIHtcbiAgLyoqIFx1NzUyOFx1NEU4RSBzcGF3biBcdTc2ODQgbm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU2MjhBIE9ic2lkaWFuIFx1NzY4NCBFbGVjdHJvbiBcdTRFOENcdThGREJcdTUyMzZcdTVGNTMgTm9kZSBcdTc1MjggKi9cbiAgdXNlRWxlY3Ryb25Bc05vZGU6IGJvb2xlYW5cbiAgLyoqIFx1OEJFNSBOb2RlIFx1NzY4NCBtYWpvciBcdTcyNDhcdTY3MkNcdUZGMDhcdTYzQTJcdTZENEJcdTU5MzFcdThEMjVcdTRFM0EgMFx1RkYwOSAqL1xuICBub2RlTWFqb3I6IG51bWJlclxuICAvKiogXHU2M0EyXHU2RDRCL1x1NTFCM1x1N0I1Nlx1OEJGNFx1NjYwRVx1RkYwOFx1NEY5Qlx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBub3Rlczogc3RyaW5nW11cbn1cblxuZXhwb3J0IHR5cGUgU2VydmVyU3RhdHVzID1cbiAgfCB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHwgeyBraW5kOiAnc3RhcnRpbmcnIH1cbiAgfCB7IGtpbmQ6ICdydW5uaW5nJzsgcG9ydDogbnVtYmVyOyBob3N0OiBzdHJpbmc7IHVybDogc3RyaW5nOyBhdHRhY2hlZDogYm9vbGVhbiB9XG4gIHwgeyBraW5kOiAnZXJyb3InOyBtZXNzYWdlOiBzdHJpbmcgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1OERFRlx1NUY4NFx1NUI5QVx1NEY0RFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTYyOEFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTUxNjVcdTUzRTNcdTg5QzRcdTgzMDNcdTUzMTZcdUZGMUFcdTYzMDdcdTU0MTEgYmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU5MEZEXHU2M0E1XHU1M0Q3ICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRHNoQmluKGlucHV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghaW5wdXQpIHJldHVybiBudWxsXG4gIGNvbnN0IHAgPSBpbnB1dC50cmltKClcbiAgaWYgKCFwKSByZXR1cm4gbnVsbFxuICBjb25zdCBleHBhbmRlZCA9IHAucmVwbGFjZSgvXn4oPz0kfFxcL3xcXFxcKS8sIG9zLmhvbWVkaXIoKSlcbiAgY29uc3QgYWJzID0gcGF0aC5pc0Fic29sdXRlKGV4cGFuZGVkKSA/IHBhdGgubm9ybWFsaXplKGV4cGFuZGVkKSA6IHBhdGgucmVzb2x2ZShleHBhbmRlZClcbiAgdHJ5IHtcbiAgICBjb25zdCBzdCA9IGZzLnN0YXRTeW5jKGFicylcbiAgICBpZiAoc3QuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKGFicywgJ2xpYicsICdiaW4uanMnKVxuICAgICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IG51bGxcbiAgICB9XG4gICAgaWYgKHN0LmlzRmlsZSgpKSByZXR1cm4gYWJzXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuLyoqIFx1NUUzOFx1ODlDMSBucG0gXHU1MTY4XHU1QzQwIG5vZGVfbW9kdWxlcyBcdTY4MzlcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxNb2R1bGVSb290cygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJvb3RzOiBzdHJpbmdbXSA9IFtdXG4gIGlmIChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpIHJvb3RzLnB1c2gocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKVxuICBjb25zdCBucG1Sb290ID0gc3Bhd25TeW5jKCducG0nLCBbJ3Jvb3QnLCAnLWcnXSwge1xuICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgdGltZW91dDogMTBfMDAwLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxuICBpZiAobnBtUm9vdC5zdGF0dXMgPT09IDAgJiYgbnBtUm9vdC5zdGRvdXQpIHtcbiAgICBjb25zdCBsaW5lID0gbnBtUm9vdC5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLylbMF1cbiAgICBpZiAobGluZSkgcm9vdHMucHVzaChsaW5lKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIHJvb3RzLnB1c2goJy9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICByb290cy5wdXNoKCcvdXNyL2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdsaWInLCAnbm9kZV9tb2R1bGVzJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIGNvbnN0IGFwcERhdGEgPSBwcm9jZXNzLmVudi5BUFBEQVRBXG4gICAgaWYgKGFwcERhdGEpIHJvb3RzLnB1c2gocGF0aC5qb2luKGFwcERhdGEsICducG0nLCAnbm9kZV9tb2R1bGVzJykpXG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXG4gIHJldHVybiBbLi4ubmV3IFNldChyb290cyldXG59XG5cbi8qKlxuICogXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1MTY1XHU1M0UzXHUzMDAyXHU0RjE4XHU1MTQ4XHU3RUE3XHVGRjFBXG4gKiAxLiBcdTY2M0VcdTVGMEZcdTRGMjBcdTUxNjVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdUZGMDlcdTIxOTIgMi4gXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIERTSF9CSU4gXHUyMTkyIDMuIG5wbSByb290IC1nIFx1MjE5MiA0LiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTY4MzlcdTMwMDJcbiAqIFx1NjcyQVx1NjI3RVx1NTIzMFx1NjVGNiBiaW4gXHU0RTNBIG51bGxcdUZGMENub3RlcyBcdThCRjRcdTY2MEVcdTUzOUZcdTU2RTBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEc2hCaW4oZXhwbGljaXQ/OiBzdHJpbmcpOiB7IGJpbjogc3RyaW5nIHwgbnVsbDsgbm90ZXM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IG5vcm1hbGl6ZURzaEJpbihleHBsaWNpdCA/PyBwcm9jZXNzLmVudi5EU0hfQklOKVxuICBpZiAoZXhwbGljaXRCaW4gJiYgZnMuZXhpc3RzU3luYyhleHBsaWNpdEJpbikpIHtcbiAgICByZXR1cm4geyBiaW46IGV4cGxpY2l0QmluLCBub3RlczogW2BcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEZcdThERUZcdTVGODQ6ICR7ZXhwbGljaXRCaW59YF0gfVxuICB9XG4gIGlmIChleHBsaWNpdCkgbm90ZXMucHVzaChgXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0XHU0RTBEXHU1QjU4XHU1NzI4OiAke2V4cGxpY2l0fWApXG5cbiAgZm9yIChjb25zdCByb290IG9mIGdsb2JhbE1vZHVsZVJvb3RzKCkpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4ocm9vdCwgRFNIX1JFTEFUSVZFX0JJTilcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICByZXR1cm4geyBiaW46IGNhbmRpZGF0ZSwgbm90ZXM6IFsuLi5ub3RlcywgYFx1NEVDRVx1NTE2OFx1NUM0MFx1NkEyMVx1NTc1N1x1NjgzOVx1NTNEMVx1NzNCMDogJHtjYW5kaWRhdGV9YF0gfVxuICAgIH1cbiAgfVxuICBub3Rlcy5wdXNoKCdcdTY3MkFcdTYyN0VcdTUyMzAgZHNoIFx1NUI4OVx1ODhDNVx1MzAwMlx1OEJGN1x1NTE0OFx1NjI2N1x1ODg0QzogbnBtIGluc3RhbGwgLWcgQGRlZXBzZWVrLWFpL2RzaFx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBkc2ggXHU4REVGXHU1Rjg0JylcbiAgcmV0dXJuIHsgYmluOiBudWxsLCBub3RlcyB9XG59XG5cbi8qKlxuICogXHU1RTM4XHU4OUMxIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjBDXHU2M0EyXHU2RDRCXHU3NTI4XHVGRjA5XHUzMDAyXG4gKiBPYnNpZGlhbiBcdTRGNUNcdTRFM0EgR1VJIFx1NUU5NFx1NzUyOFx1NEVDRSBGaW5kZXIgXHU1NDJGXHU1MkE4XHU2NUY2XHVGRjBDUEFUSCBcdTkwMUFcdTVFMzhcdTUzRUFcdTY3MDlcdTdDRkJcdTdFREZcdTc2RUVcdTVGNTVcbiAqIFx1RkYwOC91c3IvYmluOi9iaW46L3Vzci9zYmluOi9zYmluXHVGRjA5XHVGRjBDXHU0RTBEXHU1NDJCIEhvbWVicmV3IFx1N0I0OVx1NzUyOFx1NjIzN1x1NUI4OVx1ODhDNVx1NzZFRVx1NUY1NVx1RkYwQ1xuICogXHU1NkUwXHU2QjY0IHNwYXduKCdub2RlJykgXHU0RjFBXHU3NkY0XHU2M0E1IEVOT0VOVFx1MzAwMlx1OEZEOVx1OTFDQ1x1NjI4QVx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1NEY0RFx1N0Y2RVx1ODg2NVx1OUY1MFx1RkYxQVxuICogLSBQQVRIIFx1NEUyRFx1NzY4NCBub2RlXHVGRjA4c2hlbGwgXHU5MUNDXHU4RkQwXHU4ODRDXHU2NUY2XHU1QjU4XHU1NzI4XHVGRjA5XHVGRjFCXG4gKiAtIG1hY09TOiAvb3B0L2hvbWVicmV3L2Jpbi9ub2RlXHVGRjA4QXBwbGUgU2lsaWNvblx1RkYwOVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdUZGMDhJbnRlbFx1RkYwOVx1RkYxQlxuICogLSBMaW51eDogL3Vzci9iaW4vbm9kZVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdTMwMDF+Ly5sb2NhbC9iaW4vbm9kZVx1RkYxQlxuICogLSBXaW5kb3dzOiBcdTkwMUFcdThGQzcgYHdoZXJlIG5vZGVgIFx1ODlFM1x1Njc5MFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tbW9uTm9kZUJpbnMoKTogc3RyaW5nW10ge1xuICBjb25zdCBiaW5zOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IHBhdGhFbnYgPSBwcm9jZXNzLmVudi5QQVRIID8/ICcnXG4gIGZvciAoY29uc3QgZGlyIG9mIHBhdGhFbnYuc3BsaXQocGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgaWYgKGRpci50cmltKCkpIGJpbnMucHVzaChwYXRoLmpvaW4oZGlyLCAnbm9kZScpKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIGJpbnMucHVzaCgnL29wdC9ob21lYnJldy9iaW4vbm9kZScsICcvdXNyL2xvY2FsL2Jpbi9ub2RlJylcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnbGludXgnKSB7XG4gICAgYmlucy5wdXNoKCcvdXNyL2Jpbi9ub2RlJywgJy91c3IvbG9jYWwvYmluL25vZGUnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2JpbicsICdub2RlJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB3aGVyZSA9IHNwYXduU3luYygnd2hlcmUnLCBbJ25vZGUnXSwgeyBlbmNvZGluZzogJ3V0ZjgnLCB0aW1lb3V0OiAxMF8wMDAsIHdpbmRvd3NIaWRlOiB0cnVlIH0pXG4gICAgICBpZiAod2hlcmUuc3RhdHVzID09PSAwICYmIHdoZXJlLnN0ZG91dCkge1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2Ygd2hlcmUuc3Rkb3V0LnRyaW0oKS5zcGxpdCgvXFxyP1xcbi8pKSB7XG4gICAgICAgICAgaWYgKGxpbmUudHJpbSgpKSBiaW5zLnB1c2gobGluZS50cmltKCkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcdUZGMENcdTRGRERcdTc1NTlcdTdCMkNcdTRFMDBcdTRFMkFcdTVCNThcdTU3MjhcdTc2ODRcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KGJpbnMpXVxufVxuXG4vKipcbiAqIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNlx1MzAwMlxuICogXHU5RUQ4XHU4QkE0XHU5ODdBXHU1RThGXHVGRjFBXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0IFx1MjE5MiBcdTdDRkJcdTdFREYgYG5vZGVgXHVGRjA4UEFUSCArIFx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1OERFRlx1NUY4NFx1RkYwQ1x1OEZENFx1NTZERVx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1xuICogXHU5MDdGXHU1MTREIE9ic2lkaWFuIEdVSSBcdTczQUZcdTU4ODMgUEFUSCBcdTdGM0FcdTU5MzFcdTVCRkNcdTgxRjQgc3Bhd24gRU5PRU5UXHVGRjA5XHUyMTkyIFx1NjI3RVx1NEUwRFx1NTIzMFx1NjVGNlx1N0VEOVx1NTFGQVx1NjYwRVx1Nzg2RVx1OTUxOVx1OEJFRlx1MzAwMlxuICogRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlIFx1NUI5RVx1NkQ0Qlx1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwOE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlxuICogXHU0RTBEXHU2MzA5XHU2NjZFXHU5MDFBIEVsZWN0cm9uIFx1OEJFRFx1NEU0OVx1NTRDRFx1NUU5NFx1RkYwOVx1RkYwQ1x1NTZFMFx1NkI2NFx1NEVDNVx1NUY1MyB1c2VFbWJlZGRlZE5vZGUgXHU2NjNFXHU1RjBGXHU1RjAwXHU1NDJGXHU2NUY2XHU2MjREXHU1QzFEXHU4QkQ1XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTm9kZUJpbihleHBsaWNpdD86IHN0cmluZywgZW1iZWRkZWROb2RlVmVyc2lvbj86IHN0cmluZywgdXNlRW1iZWRkZWQgPSBmYWxzZSk6IFJlc29sdmVkTm9kZSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gZXhwbGljaXQ/LnRyaW0oKSB8fCBwcm9jZXNzLmVudi5EU0hfTk9ERVxuICBpZiAoZXhwbGljaXRCaW4pIHtcbiAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEYgTm9kZTogJHtleHBsaWNpdEJpbn1gKVxuICAgIHJldHVybiB7IG5vZGVCaW46IGV4cGxpY2l0QmluLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZCAmJiBwcm9jZXNzLmV4ZWNQYXRoICYmIGVtYmVkZGVkTm9kZVZlcnNpb24pIHtcbiAgICBjb25zdCBtYWpvciA9IE51bWJlcihlbWJlZGRlZE5vZGVWZXJzaW9uLnNwbGl0KCcuJylbMF0pIHx8IDBcbiAgICBpZiAobWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufVx1RkYwOEVMRUNUUk9OX1JVTl9BU19OT0RFXHVGRjA5YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IHByb2Nlc3MuZXhlY1BhdGgsIHVzZUVsZWN0cm9uQXNOb2RlOiB0cnVlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICAgIG5vdGVzLnB1c2goYE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn0gPCAke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMENcdTY1RTBcdTZDRDVcdTU0MkZcdTc1MjhgKVxuICB9XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNvbW1vbk5vZGVCaW5zKCkpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTdDRkJcdTdFREYgTm9kZTogJHtjYW5kaWRhdGV9YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IGNhbmRpZGF0ZSwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIE5vZGVcdTMwMDJcdThCRjdcdTVCODlcdTg4QzUgTm9kZVx1RkYwOGh0dHBzOi8vbm9kZWpzLm9yZ1x1RkYwOVx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IG5vZGVCaW46ICcnLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1N0FFRlx1NTNFM1x1NjNBMlx1NkQ0Qlx1NEUwRVx1N0I0OVx1NUY4NVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTVGNTNcdTUyNERcdThGRDBcdTg4NENcdTczQUZcdTU4ODNcdUZGMDhPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMDlcdTgxRUFcdTVFMjZcdTc2ODQgTm9kZSBcdTcyNDhcdTY3MkNcdUZGMUJcdTY1RTBcdTUyMTkgdW5kZWZpbmVkICovXG5leHBvcnQgZnVuY3Rpb24gZW1iZWRkZWROb2RlVmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIGNvbnN0IHYgPSAocHJvY2Vzcy52ZXJzaW9ucyBhcyB7IG5vZGU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/Lm5vZGVcbiAgICByZXR1cm4gdiB8fCB1bmRlZmluZWRcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogXHU3QUVGXHU1M0UzXHU2NjJGXHU1NDI2XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHUzMDAyXG4gKiBcdTc1Mjggbm9kZTpodHRwIFx1ODAwQ1x1OTc1RVx1NkQ0Rlx1ODlDOFx1NTY2OCBmZXRjaFx1RkYxQU9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1NzY4NCBDU1AgXHU0RjFBXHU2MkU2XHU2MjJBXG4gKiBcdTVCRjkgaHR0cDovLzEyNy4wLjAuMSBcdTc2ODQgZmV0Y2hcdUZGMENcdTVCRkNcdTgxRjRcIlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVwiXHU4QkVGXHU1MjI0XHU0RTNBXCJcdTZDQTFcdTY3MDlcIlx1MzAwMlxuICogTm9kZSBcdTc2ODQgaHR0cCBcdTZBMjFcdTU3NTdcdTRFMERcdTUzRDdcdTk4NzVcdTk3NjIgQ1NQIFx1N0VBNlx1Njc1Rlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQb3J0VXAoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDE1MDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgcmVxID0gaHR0cC5nZXQoeyBob3N0LCBwb3J0LCBwYXRoOiAnLycsIHRpbWVvdXQ6IHRpbWVvdXRNcyB9LCAocmVzKSA9PiB7XG4gICAgICByZXMucmVzdW1lKClcbiAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICB9KVxuICAgIHJlcS5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIHJlcS5kZXN0cm95KClcbiAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgfSlcbiAgICByZXEub24oJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZShmYWxzZSkpXG4gIH0pXG59XG5cbi8qKiBcdThGNkVcdThCRTJcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUFcdUZGMUJcdThEODVcdTY1RjZcdThGRDRcdTU2REUgZmFsc2UgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yUmVhZHkoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDEyMF8wMDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVhZGxpbmUgPSBEYXRlLm5vdygpICsgdGltZW91dE1zXG4gIGZvciAoOzspIHtcbiAgICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCwgMTUwMCkpIHJldHVybiB0cnVlXG4gICAgaWYgKERhdGUubm93KCkgPiBkZWFkbGluZSkgcmV0dXJuIGZhbHNlXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHIsIDUwMCkpXG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaGVkU2VydmVyIHtcbiAgcHJvYzogQ2hpbGRQcm9jZXNzXG4gIHVybDogc3RyaW5nXG4gIC8qKiB0cnVlID0gXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjBDXHU2NzJBXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCICovXG4gIGF0dGFjaGVkOiBib29sZWFuXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1RkYxQVx1NjI4QSBwZXItdmF1bHQgRFNIX0hPTUUgXHU3Njg0IGBwcm9maWxlcy9gIFx1NjZGRlx1NjM2Mlx1NEUzQVx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlxuICogYH4vLmRzaC9wcm9maWxlc2AgXHU3Njg0XHU4RjZGXHU5NEZFXHUzMDAyXHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHVGRjA4XHU3RUE2IDE5NSBcdTRFMkEgQGRlZXBzZWVrLWFpIFx1NTMwNVx1RkYwOVx1NTE2OFx1NUM0MFxuICogXHU0RTAwXHU0RUZEXHVGRjBDXHU5MDdGXHU1MTREXHU2QkNGXHU0RTJBIHZhdWx0IFx1NTQwNFx1ODFFQVx1OTRGQVx1NTFFMFx1NzY3RSBNQiBcdTc2ODQgbm9kZV9tb2R1bGVzIFx1NUU3M1x1OTc2Mlx1OTRGRVx1NjNBNVx1RkYxQnNraWxsIFx1NUI5QVx1NEU0OVxuICogXHU0RTVGXHU5NjhGXHU1MTcxXHU0RUFCIHByb2ZpbGVzL2FnZW50LXByZXNldHMgXHU0RTAwXHU1RTc2XHU1OTBEXHU3NTI4XHUzMDAyXG4gKlxuICogXHU1NDBDXHU2NUY2XHU2MjhBIGAuYWdlbnQtcHJlc2V0cy9gIFx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQiBgfi8uZHNoLy5hZ2VudC1wcmVzZXRzYFx1RkYxQWFnZW50IHByZXNldFxuICogXHU3Njg0XHU1M0QxXHU3M0IwXHU2ODM5XHU2NjJGIGBkc2hIb21lUGF0aCgnLmFnZW50LXByZXNldHMnKWBcdUZGMDhcdThEREZcdTk2OEYgRFNIX0hPTUVcdUZGMDlcdUZGMENwZXItdmF1bHRcbiAqIFx1NkEyMVx1NUYwRlx1ODJFNVx1NEUwRFx1NTQwQ1x1NkI2NVx1OEY2Rlx1OTRGRVx1RkYwQ2RzaCBcdTRGMUFcdTRFQ0UgcGVyLXZhdWx0IFx1NzZFRVx1NUY1NVx1NjI3RSBwcmVzZXQgXHUyMDE0XHUyMDE0IFx1NzUyOFx1NjIzN1x1ODFFQVx1NUI5QVx1NEU0OVx1NzY4NFxuICogYG9ic2lkaWFuYCBwcmVzZXRcdUZGMDhcdTYzMDJcdThGN0QgdmF1bHQgXHU1REU1XHU1MTc3ICsgb2JzaWRpYW4tY29udmVudGlvbnMgc2tpbGxcdUZGMDlcdTVDMzFcdTYyN0VcdTRFMERcdTUyMzBcdUZGMENcbiAqIFx1ODg2OFx1NzNCMFx1NEUzQVx1OTc2Mlx1Njc3Rlx1OTFDQ1x1NkNBMVx1NjcwOSB2YXVsdCBcdTVERTVcdTUxNzdcdTMwMDJcbiAqXG4gKiBcdTVERjJcdTVCNThcdTU3MjhcdTc2ODRcdTc3MUZcdTVCOUVcdTc2RUVcdTVGNTVcdTRGMUFcdTg4QUJcdTY2RkZcdTYzNjJcdTRFM0FcdThGNkZcdTk0RkVcdUZGMDhcdTY1RTdcdTc2RUVcdTVGNTVcdTUxNDhcdTY1MzlcdTU0MERcdTU5MDdcdTRFRkRcdTRFM0EgYDxuYW1lPi5iYWstPHRzPmBcdUZGMENcbiAqIFx1Nzg2RVx1OEJBNFx1NTE3MVx1NEVBQlx1NTNFRlx1NzUyOFx1NTQwRVx1NTNFRlx1NjI0Qlx1NTJBOFx1NTIyMFx1OTY2NFx1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlU2hhcmVkUHJvZmlsZXMoZHNoSG9tZTogc3RyaW5nLCBzaGFyZWRSb290OiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFzaGFyZWRSb290IHx8IGRzaEhvbWUgPT09IHNoYXJlZFJvb3QpIHJldHVyblxuICBjb25zdCBsaW5rRGlyID0gKG5hbWU6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBwYXRoLmpvaW4oZHNoSG9tZSwgbmFtZSlcbiAgICAgIGNvbnN0IHNoYXJlZFRhcmdldCA9IHBhdGguam9pbihzaGFyZWRSb290LCBuYW1lKVxuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNoYXJlZFRhcmdldCkpIHJldHVyblxuICAgICAgbGV0IHN0OiBmcy5TdGF0cyB8IG51bGwgPSBudWxsXG4gICAgICB0cnkge1xuICAgICAgICBzdCA9IGZzLmxzdGF0U3luYyh0YXJnZXQpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgc3QgPSBudWxsXG4gICAgICB9XG4gICAgICBpZiAoc3Q/LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgaWYgKGZzLnJlYWxwYXRoU3luYyh0YXJnZXQpID09PSBmcy5yZWFscGF0aFN5bmMoc2hhcmVkVGFyZ2V0KSkgcmV0dXJuXG4gICAgICAgIGZzLnVubGlua1N5bmModGFyZ2V0KVxuICAgICAgICBzdCA9IG51bGxcbiAgICAgIH1cbiAgICAgIGlmIChzdD8uaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICBjb25zdCBiYWsgPSBgJHt0YXJnZXR9LmJhay0ke0RhdGUubm93KCl9YFxuICAgICAgICBmcy5yZW5hbWVTeW5jKHRhcmdldCwgYmFrKVxuICAgICAgfVxuICAgICAgZnMubWtkaXJTeW5jKGRzaEhvbWUsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgICBmcy5zeW1saW5rU3luYyhzaGFyZWRUYXJnZXQsIHRhcmdldCwgJ2RpcicpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtkc2gtaG9zdF0gXHU1RUZBXHU3QUNCXHU1MTcxXHU0RUFCICR7bmFtZX0gXHU4RjZGXHU5NEZFXHU1OTMxXHU4RDI1XHVGRjA4cGVyLXZhdWx0IFx1NUMwNlx1NzUyOFx1NzJFQ1x1N0FDQlx1NzZFRVx1NUY1NVx1RkYwOWAsIGVycilcbiAgICB9XG4gIH1cbiAgbGlua0RpcigncHJvZmlsZXMnKVxuICBsaW5rRGlyKCcuYWdlbnQtcHJlc2V0cycpXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NFwiXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXCJcdUZGMUFcdTYyOEFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1N0Y2RVx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQiBgfi8uZHNoYFx1RkYwQ1xuICogXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHU2NTcwXHU2MzZFXHUzMDAyXG4gKlxuICogXHU1MzlGXHU3NDA2XHVGRjFBZHNoIFx1NzY4NCBgc2V0dGluZ3NgXHVGRjA4QGRlZXBzZWVrLWFpL2RzaC1zZXR0aW5ncy1maWxlXHVGRjA5XHU0RTBFIGBjcmVkZW50aWFsc2BcbiAqIFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtY3JlZGVudGlhbHMtbG9jYWxcdUZGMDlcdTYzRDJcdTRFRjZcdTkwRkRcdTY1MkZcdTYzMDEgYHBhdGhgIFx1ODk4Nlx1NzZENlx1RkYwQ1x1OUVEOFx1OEJBNFx1OERFRlx1NUY4NFx1NjYyRlxuICogYDxkc2hIb21lPi9zZXR0aW5ncy55YW1sYCAvIGA8ZHNoSG9tZT4vLmNyZWRlbnRpYWxzLnlhbWxgXHUzMDAyXHU1NzI4XHU1MTcxXHU0RUFCIHByb2ZpbGVcbiAqIFx1NzY4NCBgY29yZGlzLnBhdGNoLnltbGAgXHU5MUNDXHU2MjhBXHU4RkQ5XHU0RTI0XHU0RTJBXHU2M0QyXHU0RUY2XHU2MzA3XHU1NDExXHU1MTcxXHU0RUFCXHU2ODM5XHU3Njg0XHU2NTg3XHU0RUY2XHVGRjBDXHU2QTIxXHU1NzhCXHU5MDA5XHU2MkU5XHUzMDAxQVBJIFx1NUJDNlx1OTRBNVx1MzAwMVxuICogXHU0RTNCXHU5ODk4XHU3QjQ5XHU5MTREXHU0RTAwXHU2QjIxXHVGRjA4XHU1NzI4XHU0RUZCXHU2MTBGIHZhdWx0IFx1NzY4NCBEU0ggXHU5NzYyXHU2NzdGXHU2MjE2XHU3NkY0XHU2M0E1XHU2NTM5IH4vLmRzaFx1RkYwOVx1NTM3M1x1NTNFRlx1NTE2OCB2YXVsdCBcdTc1MUZcdTY1NDhcdTMwMDJcbiAqIFx1NkNFOFx1NjEwRlx1RkYxQXByb2ZpbGVzIFx1NURGMlx1OEY2Rlx1OTRGRVx1NTE3MVx1NEVBQlx1RkYwQ1x1NjI0MFx1NEVFNVx1OEZEOVx1OTFDQ1x1NTE5OVx1NTE2NVx1NzY4NFx1NkI2M1x1NjYyRlx1NTE3MVx1NEVBQiBwYXRjaCBcdTIwMTRcdTIwMTQgXHU3NTI4XHU2MjM3XHU4MUVBXHU4OEM1XHU3Njg0XG4gKiBcdTYzRDJcdTRFRjZcdTY3NjFcdTc2RUVcdUZGMDhpbnNlcnRcdUZGMDlcdTVGQzVcdTk4N0JcdTRGRERcdTc1NTlcdUZGMENcdTUzRUFcdTU0MDhcdTVFNzYvXHU2NkY0XHU2NUIwIHNldHRpbmdzL2NyZWRlbnRpYWxzIFx1NEUyNFx1NEUyQVx1Njc2MVx1NzZFRVx1MzAwMlxuICpcbiAqIHBhdGNoIFx1NjgzQ1x1NUYwRlx1RkYwOGNvcmRpcyBsb2FkZXIgXHU3Njg0IGFwcGx5RW50cnlQYXRjaGVzXHVGRjA5XHVGRjFBXHU1MjE3XHU4ODY4XHU5MUNDXHU2QkNGXHU0RTJBXHU1MTQzXHU3RDIwXHU3NkY0XHU2M0E1XHU2NjJGXG4gKiBgeyBpZCwgaW5zZXJ0PywgbmFtZT8sIC4uLm92ZXJyaWRlcyB9YFx1RkYwQ292ZXJyaWRlcyBcdTk1MkVcdTg5ODZcdTc2RDZcdTU0MENcdTU0MEQgdGFyZ2V0IFx1Njc2MVx1NzZFRVx1RkYwQ1xuICogXHU2Q0ExXHU2NzA5IGB1cGRhdGU6YCBcdTUzMDVcdTg4QzVcdTVDNDJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYXJlZENvbmZpZ1BhdGNoKGRzaEhvbWU6IHN0cmluZywgc2hhcmVkUm9vdDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghc2hhcmVkUm9vdCB8fCBkc2hIb21lID09PSBzaGFyZWRSb290KSByZXR1cm5cbiAgdHJ5IHtcbiAgICBjb25zdCBzaGFyZWRQcm9maWxlcyA9IHBhdGguam9pbihzaGFyZWRSb290LCAncHJvZmlsZXMnKVxuICAgIGNvbnN0IHBhdGNoRmlsZSA9IHBhdGguam9pbihzaGFyZWRQcm9maWxlcywgJ3dlYicsICdjb3JkaXMucGF0Y2gueW1sJylcbiAgICBjb25zdCBzZXR0aW5nc1BhdGggPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJ3NldHRpbmdzLnlhbWwnKVxuICAgIGNvbnN0IGNyZWRlbnRpYWxzUGF0aCA9IHBhdGguam9pbihzaGFyZWRSb290LCAnLmNyZWRlbnRpYWxzLnlhbWwnKVxuXG4gICAgY29uc3QgYmxvY2tTZXR0aW5ncyA9IGAtIGlkOiBzZXR0aW5nc1xuICBjb25maWc6XG4gICAgcGF0aDogJHtzZXR0aW5nc1BhdGh9XG5gXG4gICAgY29uc3QgYmxvY2tDcmVkZW50aWFscyA9IGAtIGlkOiBjcmVkZW50aWFsc1xuICBjb25maWc6XG4gICAgcGF0aDogJHtjcmVkZW50aWFsc1BhdGh9XG5gXG5cbiAgICBsZXQgY29udGVudCA9ICcnXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0Y2hGaWxlKSkge1xuICAgICAgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhwYXRjaEZpbGUsICd1dGY4JylcbiAgICB9XG4gICAgY29uc3Qgc3RyaXAgPSAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xccysvZywgJycpXG4gICAgY29uc3QgaGFzU2V0dGluZ3MgPSBzdHJpcChjb250ZW50KS5pbmNsdWRlcyhzdHJpcChibG9ja1NldHRpbmdzKSlcbiAgICBjb25zdCBoYXNDcmVkZW50aWFscyA9IHN0cmlwKGNvbnRlbnQpLmluY2x1ZGVzKHN0cmlwKGJsb2NrQ3JlZGVudGlhbHMpKVxuICAgIGlmIChoYXNTZXR0aW5ncyAmJiBoYXNDcmVkZW50aWFscykgcmV0dXJuXG5cbiAgICAvLyBcdTUzRUFcdTU3MjhcdTUxNzFcdTRFQUIgcGF0Y2ggXHU0RTNBXHU3QTdBXHU2NTcwXHU3RUM0IGBbXWBcdUZGMDhcdTUxNDFcdThCQjhcdTZDRThcdTkxQ0FcdUZGMENcdTYyMTZcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdUZGMDlcdTY1RjZcdTUxOTlcdTUxNjVcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcbiAgICAvLyBcdTY3NjFcdTc2RUVcdUZGMUJcdTgyRTVcdTc1MjhcdTYyMzdcdTVERjJcdTgxRUFcdTVCOUFcdTRFNDkgcGF0Y2hcdUZGMDhcdTU5ODJcdTgxRUFcdTg4QzVcdTYzRDJcdTRFRjZcdUZGMDlcdUZGMENcdTRFMERcdTVGM0FcdTg4NENcdTY1MzlcdTUxOTkgXHUyMDE0XHUyMDE0IFx1NjNEMFx1NzkzQVx1NjI0Qlx1NTJBOFx1NTJBMFx1MzAwMlxuICAgIGNvbnN0IHdpdGhvdXRDb21tZW50cyA9IGNvbnRlbnRcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5maWx0ZXIoKGwpID0+ICFsLnRyaW0oKS5zdGFydHNXaXRoKCcjJykpXG4gICAgICAuam9pbignXFxuJylcbiAgICAgIC50cmltKClcbiAgICBpZiAod2l0aG91dENvbW1lbnRzID09PSAnJyB8fCB3aXRob3V0Q29tbWVudHMgPT09ICdbXScpIHtcbiAgICAgICAgY29uc3QgaW5zZXJ0aW9uID0gYmxvY2tTZXR0aW5ncyArIGJsb2NrQ3JlZGVudGlhbHNcbiAgICAgICAgY29udGVudCA9IGAjIGRzaC1kb2NrIFx1ODFFQVx1NTJBOFx1N0VGNFx1NjJBNFx1RkYxQXBlci12YXVsdCBcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMENcdTRGMUFcdThCRERcdTRFQ0RcdTk2OTRcdTc5QkJcdUZGMDlcbiR7aW5zZXJ0aW9uLnRyaW1FbmQoKX1cbmBcbiAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShwYXRjaEZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGNoRmlsZSwgY29udGVudClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnW2RzaC1ob3N0XSBcdTUxNzFcdTRFQUIgY29yZGlzLnBhdGNoLnltbCBcdTVERjJcdTY3MDlcdTgxRUFcdTVCOUFcdTRFNDlcdTUxODVcdTVCQjlcdUZGMENcdThERjNcdThGQzdcdTgxRUFcdTUyQThcdTUxOTlcdTUxNjVcdUZGMUInICtcbiAgICAgICAgICAnXHU1OTgyXHU5NzAwXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjBDXHU4QkY3XHU1NzI4IH4vLmRzaC9wcm9maWxlcy93ZWIvY29yZGlzLnBhdGNoLnltbCBcdTYyNEJcdTUyQThcdTUyQTBcdTUxNjUgc2V0dGluZ3MvY3JlZGVudGlhbHMgXHU3Njg0IHBhdGggXHU4OTg2XHU3NkQ2JyxcbiAgICAgICAgKVxuICAgICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtaG9zdF0gXHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCIHBhdGNoIFx1NTkzMVx1OEQyNVx1RkYwOFx1NUMwNlx1NjMwOSBwZXItdmF1bHQgXHU3MkVDXHU3QUNCXHU5MTREXHU3RjZFXHU1NDJGXHU1MkE4XHVGRjA5JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgZHNoIHdlYlx1MzAwMlx1OEMwM1x1NzUyOFx1NjVCOVx1OEQxRlx1OEQyM1x1NzZEMVx1NTQyQyBwcm9jIFx1NzY4NCBleGl0L2Vycm9yXHUzMDAyICovXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoRHNoKG9wdHM6IExhdW5jaE9wdGlvbnMgJiB7IGRzaEJpbjogc3RyaW5nOyBub2RlQmluOiBzdHJpbmc7IHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuIH0pOiBDaGlsZFByb2Nlc3Mge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCBhcmdzID0gW29wdHMuZHNoQmluLCAnd2ViJywgJy0taG9zdCcsIGhvc3QsICctLXBvcnQnLCBTdHJpbmcocG9ydCldXG4gIGNvbnN0IGVudjogTm9kZUpTLlByb2Nlc3NFbnYgPSB7XG4gICAgLi4uKG9wdHMuZW52ID8/IHByb2Nlc3MuZW52ID8/IHt9KSxcbiAgICBEU0hfSE9NRTogb3B0cy5kc2hIb21lLFxuICB9XG4gIGlmIChvcHRzLnVzZUVsZWN0cm9uQXNOb2RlKSBlbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSdcbiAgcmV0dXJuIHNwYXduKG9wdHMubm9kZUJpbiwgYXJncywge1xuICAgIGVudixcbiAgICBjd2Q6IG9wdHMuY3dkLFxuICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbn1cblxuLyoqXG4gKiBcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdTY1RjZcdTUxQjNcdTVCOUFcIlx1NjMwMlx1NjNBNSBvciBcdTYyQTVcdTk1MTlcIlx1RkYxQVxuICogLSBcdTY3MkFcdTZDRThcdTUxNjUgdmVyaWZ5QnJhbmRcdUZGMUFcdTc2RjRcdTYzQTVcdTYzMDJcdTYzQTVcdUZGMDhcdTY1RTdcdTg4NENcdTRFM0FcdUZGMDlcdUZGMUJcbiAqIC0gXHU2Q0U4XHU1MTY1XHU0RTE0XHU2ODIxXHU5QThDXHU5MDFBXHU4RkM3XHVGRjFBXHU2MzAyXHU2M0E1XHVGRjFCXG4gKiAtIFx1NkNFOFx1NTE2NVx1NEY0Nlx1NjgyMVx1OUE4Q1x1NTkzMVx1OEQyNS9cdTVGMDJcdTVFMzhcdUZGMUFcdTYzMDlcdTMwMENcdTdBRUZcdTUzRTNcdTg4QUJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVx1NTM2MFx1NzUyOFx1MzAwRFx1OEZENFx1NTZERSBlcnJvclx1MzAwMlxuICovXG5hc3luYyBmdW5jdGlvbiBhdHRhY2hTdGF0dXMoXG4gIG9wdHM6IExhdW5jaE9wdGlvbnMsXG4gIGhvc3Q6IHN0cmluZyxcbiAgcG9ydDogbnVtYmVyLFxuICB1cmw6IHN0cmluZyxcbik6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XG4gIGlmICghb3B0cy52ZXJpZnlCcmFuZCkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9XG4gIH1cbiAgbGV0IGlzQnJhbmQgPSBmYWxzZVxuICB0cnkge1xuICAgIGlzQnJhbmQgPSBhd2FpdCBvcHRzLnZlcmlmeUJyYW5kKHVybClcbiAgfSBjYXRjaCB7XG4gICAgaXNCcmFuZCA9IGZhbHNlXG4gIH1cbiAgaWYgKGlzQnJhbmQpIHtcbiAgICByZXR1cm4geyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfVxuICB9XG4gIHJldHVybiB7XG4gICAga2luZDogJ2Vycm9yJyxcbiAgICBtZXNzYWdlOiBgXHU3QUVGXHU1M0UzICR7cG9ydH0gXHU1REYyXHU4OEFCXHU5NzVFIERTSCBcdTY3MERcdTUyQTFcdTUzNjBcdTc1MjhcdUZGMDhcdTU0QzFcdTcyNENcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcdTY3MkFcdTkwMUFcdThGQzdcdUZGMDlcdTMwMDJcdThCRjdcdTYzNjJcdTRFMDBcdTRFMkFcdTdBRUZcdTUzRTNcdUZGMENcdTYyMTZcdTUxNDhcdTUwNUNcdTYzODlcdTUzNjBcdTc1MjhcdThCRTVcdTdBRUZcdTUzRTNcdTc2ODRcdTY3MERcdTUyQTFgLFxuICB9XG59XG5cbi8qKlxuICogXHU0RTAwXHU5NTJFXCJcdTc4NkVcdTRGRERcdThGRDBcdTg4NENcIlx1RkYxQVxuICogMS4gXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTU0QzFcdTcyNENcdTY4MjFcdTlBOENcdUZGMDhcdTUzRUZcdTkwMDlcdUZGMDlcdTIxOTIgXHU5MDFBXHU4RkM3XHU1MjE5XHU2MzAyXHU2M0E1XHVGRjA4YXR0YWNoZWRcdUZGMENcdTRFMERcdTY1QjBcdThENzdcdThGREJcdTdBMEJcdUZGMDlcdUZGMENcbiAqICAgIFx1NTQyNlx1NTIxOVx1NjMwOVx1MzAwQ1x1N0FFRlx1NTNFM1x1ODhBQlx1OTc1RSBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHUzMDBEXHU2MkE1XHU5NTE5XHVGRjBDXHU3RUREXHU0RTBEXHU4QkVGXHU2MzAyXHVGRjFCXG4gKiAyLiBcdTU0MjZcdTUyMTlcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdTIxOTIgc3Bhd24gXHUyMTkyIFx1N0I0OVx1NUY4NVx1NUMzMVx1N0VFQVx1RkYxQlxuICogMy4gXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHVGRjA4XHU1OTgyXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwIEVBRERSSU5VU0VcdUZGMDlcdTIxOTIgXHU3QUNCXHU1MzczXHU4RkQ0XHU1NkRFXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXHVGRjBDXHU0RTBEXHU1MThEXHU3NkYyXHU3QjQ5XHUzMDAyXG4gKiBcdThGRDRcdTU2REUgU2VydmVyU3RhdHVzXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEc2hSdW5uaW5nKG9wdHM6IExhdW5jaE9wdGlvbnMpOiBQcm9taXNlPHsgc3RhdHVzOiBTZXJ2ZXJTdGF0dXM7IHByb2M/OiBDaGlsZFByb2Nlc3MgfT4ge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCB1cmwgPSBgaHR0cDovLyR7aG9zdH06JHtwb3J0fS9gXG5cbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBhd2FpdCBhdHRhY2hTdGF0dXMob3B0cywgaG9zdCwgcG9ydCwgdXJsKSB9XG4gIH1cblxuICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4ob3B0cy5kc2hCaW4pXG4gIGlmICghZm91bmQuYmluKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGZvdW5kLm5vdGVzW2ZvdW5kLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgZHNoIENMSScgfSB9XG4gIH1cbiAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKG9wdHMubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCBvcHRzLnVzZUVtYmVkZGVkTm9kZSlcbiAgaWYgKCFub2RlLm5vZGVCaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbm9kZS5ub3Rlc1tub2RlLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYnIH0gfVxuICB9XG4gIC8vIHBlci12YXVsdCBcdTUxNzFcdTRFQUJcdUZGMUFwcm9maWxlc1x1RkYwOFx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1RkYwOVx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQlx1NjgzOVx1RkYwQ3NldHRpbmdzL2NyZWRlbnRpYWxzXG4gIC8vIFx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQlx1NjgzOSBcdTIwMTRcdTIwMTQgXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU1MTY4XHU1QzQwXHU0RTAwXHU0RUZEXHVGRjBDXHU0RUM1XHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCXHUzMDAyXG4gIGlmIChvcHRzLnNoYXJlZENvbmZpZ1Jvb3QpIHtcbiAgICBlbnN1cmVTaGFyZWRQcm9maWxlcyhvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgICBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgfVxuICBjb25zdCBwcm9jID0gbGF1bmNoRHNoKHsgLi4ub3B0cywgZHNoQmluOiBmb3VuZC5iaW4sIG5vZGVCaW46IG5vZGUubm9kZUJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IG5vZGUudXNlRWxlY3Ryb25Bc05vZGUgfSlcblxuICAvLyBcdTY1MzZcdTk2QzYgc3RkZXJyIFx1NUMzRVx1OTBFOFx1RkYxQVx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1NjVGNlx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1NTM5Rlx1NTZFMFx1RkYwOFx1NTk4MiBFQUREUklOVVNFXHVGRjA5XG4gIGxldCBzdGRlcnJUYWlsID0gJydcbiAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4ge1xuICAgIHN0ZGVyclRhaWwgPSAoc3RkZXJyVGFpbCArIGQudG9TdHJpbmcoKSkuc2xpY2UoLTQwMDApXG4gIH0pXG5cbiAgY29uc3QgY2hpbGREaWVkID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICAgIHByb2Mub25jZSgnZXJyb3InLCAoKSA9PiByZXNvbHZlKHRydWUpKVxuICB9KVxuXG4gIGNvbnN0IHJlYWR5ID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICB3YWl0Rm9yUmVhZHkoaG9zdCwgcG9ydCwgb3B0cy50aW1lb3V0TXMgPz8gMTIwXzAwMCkudGhlbigoKSA9PiB0cnVlKSxcbiAgICBjaGlsZERpZWQudGhlbigoKSA9PiBmYWxzZSksXG4gIF0pXG5cbiAgaWYgKHJlYWR5KSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogZmFsc2UgfSwgcHJvYyB9XG4gIH1cblxuICAvLyBcdTVCNTBcdThGREJcdTdBMEJcdTVERjJcdTkwMDBcdTUxRkFcdUZGMUFcdTUxOERcdTYzQTJcdTRFMDBcdTZCMjFcdTdBRUZcdTUzRTNcdUZGMDhcdTUzRUZcdTgwRkRcdTg4QUJcdTUyMkJcdTc2ODRcdTVCOUVcdTRGOEJcdTYyQTJcdThERDFcdTdFRDFcdTVCOUFcdUZGMDlcdUZGMENcdTU0MjZcdTUyMTlcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTk1MTlcdThCRUZcbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBhd2FpdCBhdHRhY2hTdGF0dXMob3B0cywgaG9zdCwgcG9ydCwgdXJsKSwgcHJvYyB9XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbCkgfSwgcHJvYyB9XG59XG5cbi8qKiBcdTRFQ0Ugc3RkZXJyIFx1NUMzRVx1OTBFOFx1NjNEMFx1NzBCQ1x1NTNFRlx1OEJGQlx1OTUxOVx1OEJFRiAqL1xuZnVuY3Rpb24gc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IHN0ZGVyclRhaWwuc3BsaXQoL1xccj9cXG4vKS5maWx0ZXIoQm9vbGVhbilcbiAgY29uc3QgYWRkckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFQUREUklOVVNFJykpXG4gIGNvbnN0IGVyckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFcnJvcjonKSlcbiAgaWYgKGFkZHJMaW5lKSB7XG4gICAgcmV0dXJuICdcdTdBRUZcdTUzRTNcdTVERjJcdTg4QUJcdTUzNjBcdTc1MjhcdUZGMDhFQUREUklOVVNFXHVGRjA5XHUzMDAyXHU4QkY3XHU2MzYyXHU0RTAwXHU0RTJBXHU3QUVGXHU1M0UzXHVGRjBDXHU2MjE2XHU1MTQ4XHU1MDVDXHU2Mzg5XHU1MzYwXHU3NTI4XHU4QkU1XHU3QUVGXHU1M0UzXHU3Njg0XHU2NzBEXHU1MkExXHU1NDBFXHU5MUNEXHU4QkQ1J1xuICB9XG4gIGlmIChlcnJMaW5lKSB7XG4gICAgY29uc3QgY2xlYW5lZCA9IGVyckxpbmUudHJpbSgpLnNsaWNlKDAsIDMwMClcbiAgICByZXR1cm4gYGRzaCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7Y2xlYW5lZH1gXG4gIH1cbiAgcmV0dXJuICdEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBXHVGRjA4XHU2NUUwXHU4QkU2XHU3RUM2XHU5NTE5XHU4QkVGXHVGRjA5XHUzMDAyXHU4QkY3XHU2N0U1XHU3NzBCIE9ic2lkaWFuIFx1NjNBN1x1NTIzNlx1NTNGMCBbZHNoXSBcdTY1RTVcdTVGRDcnXG59XG5cbi8qKiBcdTUwNUNcdTZCNjJcdTVCNTBcdThGREJcdTdBMEJcdUZGMDhTSUdURVJNXHVGRjBDXHU3QjQ5XHU1Rjg1XHU5MDAwXHU1MUZBXHVGRjFCXHU4RDg1XHU2NUY2XHU1NDBFIFNJR0tJTExcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wUHJvY2Vzcyhwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsIHwgdW5kZWZpbmVkLCB0aW1lb3V0TXMgPSA1MDAwKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghcHJvYyB8fCBwcm9jLmV4aXRDb2RlICE9PSBudWxsIHx8IHByb2Muc2lnbmFsQ29kZSAhPT0gbnVsbCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcHJvYy5raWxsKCdTSUdLSUxMJylcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9LCB0aW1lb3V0TXMpXG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4ge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH0pXG4gICAgdHJ5IHtcbiAgICAgIHByb2Mua2lsbCgnU0lHVEVSTScpXG4gICAgfSBjYXRjaCB7XG4gICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuICB9KVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1NUI2NFx1NTEzRlx1OEZEQlx1N0EwQlx1NkUwNVx1NjI2Qlx1RkYwOFBJRCBcdTY1ODdcdTRFRjYgKyBcdTU0N0RcdTRFRTRcdTg4NENcdThFQUJcdTRFRkRcdTY4MjFcdTlBOEMgKyBQUElEIFx1NTIyNFx1NUI5QVx1RkYwOVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vL1xuLy8gXHU4MENDXHU2NjZGXHVGRjFBT2JzaWRpYW4gXHU1RDI5XHU2RTgzL1x1NUYzQVx1OTAwMFx1NjVGNiBvbnVubG9hZCBcdTRFMERcdTRGMUFcdTYyNjdcdTg4NENcdUZGMENcdTYzRDJcdTRFRjYgc3Bhd24gXHU3Njg0IGBkc2ggd2ViYFxuLy8gXHU1QjUwXHU4RkRCXHU3QTBCXHU0RjFBXHU1M0Q4XHU2MjEwXHU1QjY0XHU1MTNGXHVGRjA4bWFjT1MvTGludXggXHU0RTBCXHU4OEFCIHJlcGFyZW50IFx1NTIzMCBsYXVuY2hkXHVGRjBDcHBpZD0xXHVGRjA5XHVGRjBDXHU0RTE0XHU2NUU3XHU3MjQ4XG4vLyBcdTYzRDJcdTRFRjZcIlx1N0FFRlx1NTNFM1x1NjcwOVx1NjcwRFx1NTJBMVx1NUMzMVx1NjMwMlx1NjNBNVwiXHU0RjFBXHU2MjhBXHU1QjY0XHU1MTNGXHU2QzM4XHU0RTQ1XHU0RkREXHU3NTU5XHUzMDAyXHU2NzJDXHU2QTIxXHU1NzU3XHU1NzI4XHU2QkNGXHU2QjIxXHU1NDJGXHU1MkE4XHU1MjREXHU2RTA1XHU2MjZCXHU2NzJDXHU1RTkzXHU3QUVGXHU1M0UzXG4vLyBcdTRFMEFcdTc2ODRcdTVCNjRcdTUxM0ZcdUZGMUFcdTUxNDggU0lHVEVSTVx1MzAwMVx1OEQ4NVx1NjVGNiBTSUdLSUxMXHVGRjBDXHU1MThEXHU3NTMxXHU4QzAzXHU3NTI4XHU2NUI5XHU5MUNEXHU2NUIwIHNwYXduXHUzMDAyXG4vL1xuLy8gXHU1Qjg5XHU1MTY4XHU4QkJFXHU4QkExXHVGRjA4XHU1OTFBXHU1RTkzL1x1NTkxQVx1N0E5N1x1NTNFM1x1NUU3Nlx1NTNEMVx1NUI4OVx1NTE2OFx1RkYwOVx1RkYxQVxuLy8gLSBcdTUzRUFcdTUyQThcIlx1NjcyQ1x1NUU5M1x1NkQzRVx1NzUxRlx1N0FFRlx1NTNFM1wiXHU0RTBBXHU3Njg0XHU2NzBEXHU1MkExXHVGRjBDXHU3RUREXHU0RTBEXHU3OEIwXHU1MTc2XHU0RUQ2XHU1RTkzXHU3Njg0XHU3QUVGXHU1M0UzXHVGRjFCXG4vLyAtIFx1NTNFQVx1Njc0MFwiXHU3ODZFXHU1QjlFXHU2NjJGIGRzaCB3ZWIgXHU0RTE0XHU3NkQxXHU1NDJDXHU2NzJDXHU3QUVGXHU1M0UzXCJcdTc2ODRcdThGREJcdTdBMEJcdUZGMDhcdTU0N0RcdTRFRTRcdTg4NENcdThFQUJcdTRFRkRcdTY4MjFcdTlBOENcdUZGMENcdTk2MzIgcGlkIFx1NTkwRFx1NzUyOFx1OEJFRlx1Njc0MFx1RkYwOVx1RkYxQlxuLy8gLSBcdTUzRUFcdTY3NDBcdTVCNjRcdTUxM0ZcdUZGMDhQT1NJWDogcHBpZD09MVx1RkYxQldpbmRvd3M6IFx1NTQyRlx1NTJBOFx1NjVGNlx1OTVGNFx1NjVFOVx1NEU4RVx1NjcyQ1x1NkIyMVx1NEYxQVx1OEJERFx1RkYwOVx1RkYwQ1xuLy8gICBcdTVGNTNcdTUyNERcdTRGMUFcdThCRERcdTkxQ0NcdTUxNzZcdTRFRDZcdTdBOTdcdTUzRTNcdTYyQzlcdThENzdcdTc2ODRcdTZEM0JcdTY3MERcdTUyQTFcdTdFRERcdTRFMERcdTRGMUFcdTg4QUJcdThCRUZcdTY3NDBcdTMwMDJcblxuZXhwb3J0IGludGVyZmFjZSBEc2hQaWRSZWNvcmQge1xuICBwaWQ6IG51bWJlclxuICBwb3J0OiBudW1iZXJcbiAgdHM6IG51bWJlclxufVxuXG4vKiogUElEIFx1NjU4N1x1NEVGNlx1OERFRlx1NUY4NFx1RkYxQVx1NjUzRVx1NTcyOCBwZXItdmF1bHQgXHU3Njg0IERTSF9IT01FIFx1OTFDQ1x1RkYwQ1x1OTY4Rlx1NUU5M1x1OTY5NFx1NzlCQlx1MzAwMVx1OTY4Rlx1NEYxQVx1OEJERFx1NUY1Mlx1NUM1RSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRzaFBpZEZpbGVQYXRoKGRzaEhvbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4oZHNoSG9tZSwgJy5kc2gtZG9jay5waWQnKVxufVxuXG4vKiogXHU4QkIwXHU1RjU1XHU2NzJDXHU2QjIxIHNwYXduIFx1NzY4NFx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOFx1NjcwRFx1NTJBMVx1NUMzMVx1N0VFQVx1NTQwRVx1OEMwM1x1NzUyOFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRHNoUGlkRmlsZShkc2hIb21lOiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgcGlkOiBudW1iZXIpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBmcy5ta2RpclN5bmMoZHNoSG9tZSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBmcy53cml0ZUZpbGVTeW5jKGRzaFBpZEZpbGVQYXRoKGRzaEhvbWUpLCBKU09OLnN0cmluZ2lmeSh7IHBpZCwgcG9ydCwgdHM6IERhdGUubm93KCkgfSkpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignW2RzaC1kb2NrXSBcdTUxOTlcdTUxNjUgUElEIFx1NjU4N1x1NEVGNlx1NTkzMVx1OEQyNScsIGVycilcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZERzaFBpZEZpbGUoZHNoSG9tZTogc3RyaW5nKTogRHNoUGlkUmVjb3JkIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gZnMucmVhZEZpbGVTeW5jKGRzaFBpZEZpbGVQYXRoKGRzaEhvbWUpLCAndXRmOCcpXG4gICAgY29uc3QgcmVjID0gSlNPTi5wYXJzZShyYXcpIGFzIFBhcnRpYWw8RHNoUGlkUmVjb3JkPlxuICAgIGlmICh0eXBlb2YgcmVjLnBpZCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHJlYy5wb3J0ID09PSAnbnVtYmVyJykgcmV0dXJuIHJlYyBhcyBEc2hQaWRSZWNvcmRcbiAgfSBjYXRjaCB7XG4gICAgLyogXHU2NUUwXHU2NTg3XHU0RUY2XHU2MjE2XHU2MzVGXHU1NzRGIFx1MjE5MiBudWxsICovXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZURzaFBpZEZpbGUoZHNoSG9tZTogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgZnMudW5saW5rU3luYyhkc2hQaWRGaWxlUGF0aChkc2hIb21lKSlcbiAgfSBjYXRjaCB7XG4gICAgLyogaWdub3JlICovXG4gIH1cbn1cblxuLyoqIFx1OEZEQlx1N0EwQlx1NjYyRlx1NTQyNlx1NUI1OFx1NkQzQlx1RkYwOHNpZ25hbCAwIFx1NjNBMlx1NkQ0Qlx1RkYwQ1x1OERFOFx1NUU3M1x1NTNGMFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJvY2Vzc0FsaXZlKHBpZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgcHJvY2Vzcy5raWxsKHBpZCwgMClcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKiogXHU4QkU1IHBpZCBcdTc2ODRcdThGREJcdTdBMEJcdTU0N0RcdTRFRTRcdTg4NENcdTY2MkZcdTU0MjZcdTVDMzFcdTY2MkZcdTc2RDFcdTU0MkMgPHBvcnQ+IFx1NzY4NCBkc2ggd2ViXHVGRjA4XHU5NjMyIHBpZCBcdTU5MERcdTc1MjhcdThCRUZcdTY3NDBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RzaFdlYk9uUG9ydChwaWQ6IG51bWJlciwgcG9ydDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgIGNvbnN0IG91dCA9IHNwYXduU3luYygnd21pYycsIFsncHJvY2VzcycsICd3aGVyZScsIGBwcm9jZXNzaWQ9JHtwaWR9YCwgJ2dldCcsICdjb21tYW5kbGluZSddLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICAgICAgfSlcbiAgICAgIGNvbnN0IGNtZCA9IG91dC5zdGRvdXQgfHwgJydcbiAgICAgIHJldHVybiBjbWQuaW5jbHVkZXMoJ2RzaCcpICYmIGNtZC5pbmNsdWRlcyhgLS1wb3J0ICR7cG9ydH1gKVxuICAgIH1cbiAgICBjb25zdCBvdXQgPSBzcGF3blN5bmMoJ3BzJywgWyctd3cnLCAnLW8nLCAnY29tbWFuZD0nLCAnLXAnLCBTdHJpbmcocGlkKV0sIHtcbiAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgIH0pXG4gICAgY29uc3QgY21kID0gKG91dC5zdGRvdXQgfHwgJycpLnRyaW0oKVxuICAgIHJldHVybiBjbWQuaW5jbHVkZXMoJ2RzaCcpICYmIGNtZC5pbmNsdWRlcyhgLS1wb3J0ICR7cG9ydH1gKVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKiogUE9TSVg6IFx1OEJGQlx1NTNENlx1OEZEQlx1N0EwQlx1NzIzNiBwaWRcdUZGMUJcdTU5MzFcdThEMjVcdThGRDRcdTU2REUgLTEgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzUHBpZChwaWQ6IG51bWJlcik6IG51bWJlciB7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKCdwcycsIFsnLW8nLCAncHBpZD0nLCAnLXAnLCBTdHJpbmcocGlkKV0sIHsgZW5jb2Rpbmc6ICd1dGY4JywgdGltZW91dDogNTAwMCB9KVxuICAgIGNvbnN0IHBwaWQgPSBwYXJzZUludCgob3V0LnN0ZG91dCB8fCAnJykudHJpbSgpLCAxMClcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBwaWQpID8gcHBpZCA6IC0xXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiAtMVxuICB9XG59XG5cbi8qKlxuICogXHU1QjY0XHU1MTNGXHU1MjI0XHU1QjlBXHVGRjFBXG4gKiAtIFBPU0lYXHVGRjFBXHU1QjY0XHU1MTNGXHU4OEFCIHJlcGFyZW50IFx1NTIzMCBsYXVuY2hkXHVGRjBDcHBpZCA9PT0gMVx1RkYwOFx1OERFOFx1NEYxQVx1OEJERFx1NTIyNFx1NUI5QVx1NjcwMFx1NTNFRlx1OTc2MFx1RkYwOVx1RkYxQlxuICogLSBXaW5kb3dzXHVGRjFBXHU2NUUwIHJlcGFyZW50IFx1OEJFRFx1NEU0OVx1RkYwQ1x1OTAwMFx1NTZERVwiXHU4RkRCXHU3QTBCXHU1NDJGXHU1MkE4XHU2NUU5XHU0RThFXHU2NzJDXHU2QjIxIE9ic2lkaWFuIFx1NEYxQVx1OEJERFwiXHVGRjA4UElEIFx1NjU4N1x1NEVGNiB0c1x1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPcnBoYW5QaWQocGlkOiBudW1iZXIsIHBpZEZpbGVUczogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgcmV0dXJuIHBpZEZpbGVUcyA8IERhdGUubm93KCkgLSBwcm9jZXNzLnVwdGltZSgpICogMTAwMFxuICB9XG4gIHJldHVybiBwcm9jZXNzUHBpZChwaWQpID09PSAxXG59XG5cbi8qKiBcdTYzMDkgcGlkIFx1NTA1Q1x1NkI2Mlx1RkYxQVNJR1RFUk0gXHUyMTkyIFx1OEQ4NVx1NjVGNiBTSUdLSUxMXHVGRjA4UE9TSVhcdUZGMDlcdUZGMUJXaW5kb3dzIFx1NzUyOCB0YXNra2lsbCAvRiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0b3BQcm9jZXNzQnlQaWQocGlkOiBudW1iZXIsIHRpbWVvdXRNcyA9IDMwMDApOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFpc1Byb2Nlc3NBbGl2ZShwaWQpKSByZXR1cm5cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICB0cnkge1xuICAgICAgc3Bhd25TeW5jKCd0YXNra2lsbCcsIFsnL1BJRCcsIFN0cmluZyhwaWQpLCAnL1QnLCAnL0YnXSwgeyB3aW5kb3dzSGlkZTogdHJ1ZSB9KVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICAgIHJldHVyblxuICB9XG4gIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Nlc3Mua2lsbChwaWQsICdTSUdLSUxMJylcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9LCB0aW1lb3V0TXMpXG4gICAgY29uc3QgcG9sbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICghaXNQcm9jZXNzQWxpdmUocGlkKSkge1xuICAgICAgICBjbGVhckludGVydmFsKHBvbGwpXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgcmVzb2x2ZSgpXG4gICAgICB9XG4gICAgfSwgMTAwKVxuICAgIHRyeSB7XG4gICAgICBwcm9jZXNzLmtpbGwocGlkLCAnU0lHVEVSTScpXG4gICAgfSBjYXRjaCB7XG4gICAgICBjbGVhckludGVydmFsKHBvbGwpXG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9XG4gIH0pXG59XG5cbi8qKlxuICogXHU1NDJGXHU1MkE4XHU1MjREXHU1QjY0XHU1MTNGXHU2RTA1XHU2MjZCXHUzMDAyXHU4RkQ0XHU1NkRFXHU2NjJGXHU1NDI2XHU2RTA1XHU3NDA2XHU0RTg2XHU2QjhCXHU3NTU5XHU2NzBEXHU1MkExXHUzMDAyXG4gKlxuICogMS4gUElEIFx1NjU4N1x1NEVGNlx1NTQ3RFx1NEUyRCBcdTIxOTIgXHU2ODIxXHU5QThDXHU1NDdEXHU0RUU0XHU4ODRDXHU4RUFCXHU0RUZEXHVGRjA4ZHNoIHdlYiAtLXBvcnQgPHBvcnQ+XHVGRjA5XHUyMTkyIFx1NUI2NFx1NTEzRlx1NTIxOVx1Njc0MFx1NjM4OVx1RkYxQlxuICogMi4gXHU2NUUwIFBJRCBcdTY1ODdcdTRFRjZcdUZGMDhcdTY1RTdcdTcyNDhcdTUzNDdcdTdFQTcvXHU2NTg3XHU0RUY2XHU0RTIyXHU1OTMxXHVGRjA5XHUyMTkyIHBncmVwIFx1NjMwOVx1N0FFRlx1NTNFM1x1NTNDRFx1NjdFNSBcdTIxOTIgXHU1NDBDXHU2ODM3XHU2ODIxXHU5QThDXHU1NDBFXHU2RTA1XHU3NDA2XHUzMDAyXG4gKlxuICogXHU1M0VBXHU2RTA1XHU3NDA2XCJcdTc2RDFcdTU0MkNcdTY3MkNcdTdBRUZcdTUzRTNcdTRFMTRcdTcyMzZcdThGREJcdTdBMEJcdTVERjJcdTRFMERcdTU3MjhcIlx1NzY4NCBkc2ggd2ViXHVGRjFCXHU1RjUzXHU1MjREXHU0RjFBXHU4QkREXHU1MTc2XHU0RUQ2XHU3QTk3XHU1M0UzXHU2MkM5XHU4RDc3XHU3Njg0XG4gKiBcdTZEM0JcdTY3MERcdTUyQTEgcHBpZCAhPSAxXHVGRjBDXHU3RUREXHU0RTBEXHU0RjFBXHU4OEFCXHU4QkVGXHU2NzQwXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzd2VlcE9ycGhhbkRzaChkc2hIb21lOiBzdHJpbmcsIHBvcnQ6IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBjYW5kaWRhdGVzID0gbmV3IFNldDxudW1iZXI+KClcbiAgY29uc3QgcmVjID0gcmVhZERzaFBpZEZpbGUoZHNoSG9tZSlcbiAgaWYgKHJlYyAmJiByZWMucG9ydCA9PT0gcG9ydCAmJiBpc1Byb2Nlc3NBbGl2ZShyZWMucGlkKSAmJiBpc0RzaFdlYk9uUG9ydChyZWMucGlkLCBwb3J0KSkge1xuICAgIGNhbmRpZGF0ZXMuYWRkKHJlYy5waWQpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09ICd3aW4zMicpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKCdwZ3JlcCcsIFsnLWYnLCBgZHNoLiotLXBvcnQgJHtwb3J0fWBdLCB7IGVuY29kaW5nOiAndXRmOCcsIHRpbWVvdXQ6IDUwMDAgfSlcbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiAob3V0LnN0ZG91dCB8fCAnJykuc3BsaXQoL1xccysvKSkge1xuICAgICAgICBjb25zdCBwaWQgPSBwYXJzZUludChsaW5lLCAxMClcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShwaWQpICYmIHBpZCA+IDAgJiYgaXNEc2hXZWJPblBvcnQocGlkLCBwb3J0KSkgY2FuZGlkYXRlcy5hZGQocGlkKVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICB9XG4gIGxldCBzd2VwdCA9IGZhbHNlXG4gIGZvciAoY29uc3QgcGlkIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICBpZiAoIWlzT3JwaGFuUGlkKHBpZCwgcmVjPy50cyA/PyAwKSkgY29udGludWVcbiAgICBjb25zb2xlLndhcm4oYFtkc2gtZG9ja10gXHU2RTA1XHU3NDA2XHU1QjY0XHU1MTNGIGRzaCB3ZWIgKHBpZD0ke3BpZH0sIHBvcnQ9JHtwb3J0fSlgKVxuICAgIGF3YWl0IHN0b3BQcm9jZXNzQnlQaWQocGlkKVxuICAgIHN3ZXB0ID0gdHJ1ZVxuICB9XG4gIGlmIChzd2VwdCkgcmVtb3ZlRHNoUGlkRmlsZShkc2hIb21lKVxuICByZXR1cm4gc3dlcHRcbn1cbiIsICIvKipcbiAqIFx1OEJCRVx1N0Y2RVx1RkYxQVx1NUI1N1x1NkJCNSArIFx1OEJCRVx1N0Y2RVx1OTg3NSBVSVx1MzAwMlxuICogVjAuMlx1RkYxQURTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1RkYwOFx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkIgLyBcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgLyBcdTgxRUFcdTVCOUFcdTRFNDlcdUZGMDlcdUZGMENcdTlFRDhcdThCQTQgcGVyLXZhdWx0XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IHR5cGUgRHNoSG9tZU1vZGUgPSAnc2hhcmVkJyB8ICdwZXItdmF1bHQnIHwgJ2N1c3RvbSdcblxuZXhwb3J0IGludGVyZmFjZSBEc2hEb2NrU2V0dGluZ3Mge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluOiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU0RjE4XHU1MTQ4XHVGRjA5ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTRcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdDogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0OiBudW1iZXJcbiAgLyoqIERTSF9IT01FIFx1NkEyMVx1NUYwRlx1RkYxQXBlci12YXVsdD1cdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFCc2hhcmVkPVx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMUJjdXN0b209XHU4MUVBXHU1QjlBXHU0RTQ5ICovXG4gIGRzaEhvbWVNb2RlOiBEc2hIb21lTW9kZVxuICAvKiogXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NFx1RkYwOFx1NEVDNSBjdXN0b20gXHU2QTIxXHU1RjBGXHU3NTFGXHU2NTQ4XHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKiogXHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU6IGJvb2xlYW5cbiAgLyoqIE9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NjVGNlx1ODFFQVx1NTJBOFx1NjJDOVx1OEQ3NyBEU0ggKi9cbiAgYXV0b3N0YXJ0OiBib29sZWFuXG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEc2hEb2NrU2V0dGluZ3MgPSB7XG4gIGRzaEJpbjogJycsXG4gIG5vZGVCaW46ICcnLFxuICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgcG9ydDogMzA4MCxcbiAgZHNoSG9tZU1vZGU6ICdwZXItdmF1bHQnLFxuICBkc2hIb21lOiAnJyxcbiAgdXNlRW1iZWRkZWROb2RlOiBmYWxzZSxcbiAgYXV0b3N0YXJ0OiB0cnVlLFxufVxuXG5leHBvcnQgY2xhc3MgRHNoRG9ja1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgY3VzdG9tSG9tZUVsPzogU2V0dGluZ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbilcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpc1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2OTgyXHU4OUM4IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXNldHRpbmdzLWRlc2MnLFxuICAgICAgdGV4dDogJ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFdlYiBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW5cdUZGMUFcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NEMgXHUyMTkyIFx1OTc2Mlx1Njc3Rlx1NUQ0Q1x1NTE2NVx1MzAwMlx1NUI5OFx1NjVCOVx1NTM5Rlx1NzUxRlx1RkYwQ1x1NUI5OFx1NjVCOSBVSSBcdTUzOUZcdTY4MzdcdTVENENcdTUxNjVcdTMwMDInLFxuICAgIH0pXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zZXR0aW5ncy1kZXNjJyxcbiAgICAgIHRleHQ6ICdcdUQ4M0VcdUREMUQgXHU0RTBFIGRzaC10b29sLW9ic2lkaWFuLXZhdWx0IFx1NzNFMFx1ODA1NFx1NzRBN1x1NTQwOFx1RkYxQVx1OTE0RFx1NTQwOCBEU0ggXHU0RkE3XHU3Njg0IDE2IFx1NEUyQSB2YXVsdF8qIFx1NURFNVx1NTE3N1x1RkYwQ1x1NUYwMFx1N0JCMVx1NTM3M1x1NzUyOFx1MzAwQ09ic2lkaWFuIFx1NTE4NSBBZ2VudCBcdTdCMTRcdThCQjBcdTVERTVcdTRGNUNcdTZENDFcdTMwMERcdTIwMTRcdTIwMTRcdTk3NjJcdTY3N0ZcdTkxQ0NcdTc2RjRcdTYzQTVcdThCRjRcIlx1OEJGQlx1NEUwMFx1NEUwQlx1NEVDQVx1NTkyOVx1NzY4NFx1N0IxNFx1OEJCMFwiXHVGRjBDQWdlbnQgXHU4MUVBXHU1MkE4XHU1QjlBXHU0RjREXHU1RjUzXHU1MjREXHU1RTkzXHU4QkZCXHU1MTk5XHUzMDAyJyxcbiAgICB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY3MERcdTUyQTFcdTYzQTdcdTUyMzYgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdcdTY3MERcdTUyQTEnKS5zZXRIZWFkaW5nKClcbiAgICBjb25zdCBzdGF0dXNMaW5lID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NzBEXHU1MkExXHU3MkI2XHU2MDAxJylcbiAgICAgIC5zZXREZXNjKHRoaXMuZGVzY3JpYmVTdGF0dXMoKSlcbiAgICBjb25zdCBidG5zID0gc3RhdHVzTGluZS5jb250cm9sRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYnRucycgfSlcbiAgICBjb25zdCBzdGFydEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnbW9kLWN0YScsIHRleHQ6ICdcdTI1QjYgXHU1NDJGXHU1MkE4JyB9KVxuICAgIHN0YXJ0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgc3RvcEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVBMCBcdTUwNUNcdTZCNjInIH0pXG4gICAgc3RvcEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdG9wKCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgb3BlbkJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicgfSlcbiAgICBvcGVuQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5QYW5lbCgpXG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5NjhGIE9ic2lkaWFuIFx1ODFFQVx1NTJBOFx1NTQyRlx1NTJBOCcpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1OEZEMFx1ODg0Q1x1NjVGNiAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1OEZEMFx1ODg0Q1x1NjVGNicpLnNldEhlYWRpbmcoKVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ2RzaCBDTEkgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEJcdUZGMDhEU0hfQklOIFx1MjE5MiBucG0gcm9vdCAtZyBcdTIxOTIgXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXHU1M0VGXHU1ODZCIGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTYyMTYgYmluLmpzIFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcy9AZGVlcHNlZWstYWkvZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmRldGVjdExpbmUgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNicpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9iaW4vbm9kZScpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZScpXG4gICAgICAuc2V0RGVzYygnRUxFQ1RST05fUlVOX0FTX05PREVcdTMwMDJcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdTIwMTRcdTIwMTRcdTVCOUVcdTZENEIgT2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XHU0RUU1IE5vZGUgXHU2QTIxXHU1RjBGXHU4RkQwXHU4ODRDXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjBDXHU0RUM1XHU1NzI4XHU5QThDXHU4QkMxXHU1M0VGXHU3NTI4XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyJylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU3RjUxXHU3RURDIC0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnXHU3RjUxXHU3RURDJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1N0ZBXHU1MUM2XHVGRjA5JylcbiAgICAgIC5zZXREZXNjKCdcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1MzAwMnNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXHU3NkY0XHU2M0E1XHU0RjdGXHU3NTI4XHVGRjFCcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NTcyOFx1NkI2NFx1NTdGQVx1Nzg0MFx1NEUwQVx1NjMwOSB2YXVsdCBcdTZEM0VcdTc1MUZcdTcyRUNcdTdBQ0JcdTdBRUZcdTUzRTNcdUZGMDhcdTZCQ0YgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RjFBXHU4QkREXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCczMDgwJylcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQpKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbiA9IE51bWJlcih2LnRyaW0oKSlcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQgPSBOdW1iZXIuaXNJbnRlZ2VyKG4pICYmIG4gPj0gMCAmJiBuIDw9IDY1NTM1ID8gbiA6IDMwODBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLm5ldFByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NSAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVx1RkYwOERTSF9IT01FXHVGRjA5XHU0RTBFXHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2QTIxXHU1RjBGJylcbiAgICAgIC5zZXREZXNjKCdwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gXHU0RjFBXHU4QkREXHU2MzA5XHU1RTkzXHU5Njk0XHU3OUJCXHVGRjA4XHU1NDA0XHU1RTkzXHU5NzYyXHU2NzdGXHU1M0VBXHU2NjNFXHU3OTNBXHU2NzJDXHU1RTkzXHU1MjFCXHU1RUZBXHU3Njg0XHU0RjFBXHU4QkREXHVGRjA5XHVGRjBDXHU0RjQ2XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTRFMEVcdThGRDBcdTg4NENcdTY1RjZcdTYzRDJcdTRFRjZcdTUxNjhcdTVDNDBcdTUxNzFcdTRFQUJcdTRFMDBcdTRFRkRcdUZGMENcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjhcdTVFOTNcdTc1MUZcdTY1NDhcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICBkZC5hZGRPcHRpb24oJ3Blci12YXVsdCcsICdcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREIH4vLmRzaC92YXVsdHMvPFx1NTQwRD4tPGhhc2g+XHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjFCXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU0RUNEXHU1MTcxXHU0RUFCXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdzaGFyZWQnLCAnXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTRFMDBcdTU5NTdcdTkxNERcdTdGNkVcdTMwMDFcdTYzRDJcdTRFRjZcdTRFMEVcdTRGMUFcdThCRERcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2N1c3RvbScsICdcdTgxRUFcdTVCOUFcdTRFNDlcdThERUZcdTVGODQnKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSlcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSA9IHYgYXMgRHNoSG9tZU1vZGVcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuY3VzdG9tSG9tZUVsPy5zZXREaXNhYmxlZCh2ICE9PSAnY3VzdG9tJylcbiAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIHRoaXMuY3VzdG9tSG9tZUVsID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NCcpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9Vc2Vycy95b3UvLmRzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuY3VzdG9tSG9tZUVsLnNldERpc2FibGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlICE9PSAnY3VzdG9tJylcblxuICAgIHRoaXMuaG9tZVByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RMaW5lITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBob21lUHJldmlldyE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgbmV0UHJldmlldyE6IEhUTUxFbGVtZW50XG5cbiAgcHJpdmF0ZSBkZXNjcmliZVN0YXR1cygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgcmV0dXJuIGAke3MudXJsfVx1RkYwOCR7cy5hdHRhY2hlZCA/ICdcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJ1x1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0Q1x1NEUyRCd9XHVGRjA5YFxuICAgIH1cbiAgICBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSByZXR1cm4gJ1x1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNlx1RkYwOFx1OTk5Nlx1NkIyMVx1N0VBNiAxMCBcdTc5RDJcdUZGMENcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOSdcbiAgICBpZiAocy5raW5kID09PSAnZXJyb3InKSByZXR1cm4gYFx1NTkzMVx1OEQyNTogJHtzLm1lc3NhZ2V9YFxuICAgIHJldHVybiAnXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURldGVjdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnBsdWdpbi5kZXRlY3RJbmZvKClcbiAgICByZXR1cm4gW1xuICAgICAgYGRzaDogJHtpbmZvLmRzaEJpbiA/PyAnXHU2NzJBXHU2MjdFXHU1MjMwJ30ke2luZm8uZHNoTm90ZXMubGVuZ3RoID8gYFx1RkYwOCR7aW5mby5kc2hOb3Rlcy5qb2luKCdcdUZGMUInKX1cdUZGMDlgIDogJyd9YCxcbiAgICAgIGBub2RlOiAke2luZm8ubm9kZU5vdGVzLmpvaW4oJ1x1RkYxQicpfWAsXG4gICAgXS5qb2luKCdcXG4nKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICBjb25zdCBob21lID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlRHNoSG9tZSgpXG4gICAgY29uc3Qgc2hhcmVkID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlU2hhcmVkQ29uZmlnUm9vdCgpXG4gICAgaWYgKHNoYXJlZCkge1xuICAgICAgcmV0dXJuIGBcdTRGMUFcdThCRERcdTc2RUVcdTVGNTU6ICR7aG9tZX1cXG5cdTkxNERcdTdGNkVcdTUxNzFcdTRFQUI6ICR7c2hhcmVkfVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4XHU1RTkzXHU3NTFGXHU2NTQ4XHVGRjA5YFxuICAgIH1cbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1OERFRlx1NUY4NDogJHtob21lfWBcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVOZXQoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlUG9ydCgpXG4gICAgY29uc3QgbW9kZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlXG4gICAgY29uc3Qgc3VmZml4ID0gbW9kZSA9PT0gJ3Blci12YXVsdCcgPyAnXHVGRjA4XHU2NzJDIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEUwRVx1NTE3Nlx1NEVENiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMDknIDogJ1x1RkYwOHNoYXJlZC9jdXN0b21cdUZGMUFcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHVGRjA5J1xuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU3QUVGXHU1M0UzOiAke3BvcnR9JHtzdWZmaXh9YFxuICB9XG59XG4iLCAiLyoqXG4gKiBEc2hXZWJWaWV3IFx1MjAxNFx1MjAxNCBcdTYyOEFcdTVCOThcdTY1QjkgRFNIIFdlYiAoMTI3LjAuMC4xOjxwb3J0PikgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuIFx1OTc2Mlx1Njc3Rlx1MzAwMlxuICogXHU1RTI2XHU1QjhDXHU2NTc0XHU4RkM3XHU3QTBCXHU3MkI2XHU2MDAxXHVGRjFBXHU1MkEwXHU4RjdEXHU1MkE4XHU3NTNCIC8gXHU5NTE5XHU4QkVGXHU1MzYxXHU3MjQ3XHVGRjA4XHU1NDJCXHU5MUNEXHU4QkQ1XHVGRjA5LyBcdTY3MkFcdTU0MkZcdTUyQThcdTdBN0FcdTcyQjZcdTYwMDFcdTMwMDJcbiAqIGlmcmFtZSBcdTYzMDdcdTU0MTFcdTVCOThcdTY1QjlcdTY3MERcdTUyQTFcdUZGMENVSSBcdTUzRUFcdTY2MkZcIlx1ODIzOVx1NTc1RVwiXHU1OTE2XHU1OEYzXHVGRjFCXHU1REU1XHU1MTc3XHU2ODBGXHU1MkE4XHU0RjVDXHU4RDcwIE9ic2lkaWFuIFx1NTM5Rlx1NzUxRlxuICogXHU2ODA3XHU5ODk4XHU2ODBGXHVGRjA4SXRlbVZpZXcuYWRkQWN0aW9uXHVGRjA5XHU0RTBFXHU1M0YzXHU5NTJFXHU4M0RDXHU1MzU1XHVGRjA4b25QYW5lTWVudVx1RkYwOVx1MzAwMlxuICovXG5cbmltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBzZXRJY29uLCB0eXBlIE1lbnUgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgY29uc3QgRFNIX1dFQl9WSUVXX1RZUEUgPSAnZHNoLWRvY2std2ViJ1xuXG50eXBlIFVpU3RhdGUgPSAncnVubmluZycgfCAnc3RhcnRpbmcnIHwgJ2Vycm9yJyB8ICdzdG9wcGVkJ1xuXG5leHBvcnQgY2xhc3MgRHNoV2ViVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBpZnJhbWVFbDogSFRNTElGcmFtZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHBpbGxFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIG92ZXJsYXlFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICAvKiogXHU2ODA3XHU5ODk4XHU2ODBGXCJcdTU0MkZcdTUyQTgvXHU1MDVDXHU2QjYyXCJcdTUyQThcdTRGNUNcdTYzMDlcdTk0QUVcdUZGMDhhZGRBY3Rpb24gXHU4RkQ0XHU1NkRFXHU3Njg0XHU1MTQzXHU3RDIwXHVGRjBDXHU1NkZFXHU2ODA3XHU5NjhGXHU3MkI2XHU2MDAxXHU1MjA3XHU2MzYyXHVGRjA5ICovXG4gIHByaXZhdGUgdG9nZ2xlQWN0aW9uRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBjdXJyZW50OiBVaVN0YXRlID0gJ3N0b3BwZWQnXG5cbiAgY29uc3RydWN0b3IoXG4gICAgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHBsdWdpbjogRHNoRG9ja1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIobGVhZilcbiAgfVxuXG4gIG92ZXJyaWRlIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIERTSF9XRUJfVklFV19UWVBFXG4gIH1cblxuICBvdmVycmlkZSBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnRFNIIERvY2snXG4gIH1cblxuICBvdmVycmlkZSBnZXRJY29uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdhbmNob3InXG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrJyB9KVxuXG4gICAgLy8gLS0tLSBcdTU5MzRcdTkwRThcdUZGMUFcdTRFQzVcdTRGRERcdTc1NTkgbG9nbyArIFx1NjgwN1x1OTg5OCArIFx1NzJCNlx1NjAwMSBwaWxsXHVGRjA4XHU1MkE4XHU0RjVDXHU1MTY4XHU5MEU4XHU4RDcwXHU2ODA3XHU5ODk4XHU2ODBGL1x1NTNGM1x1OTUyRVx1ODNEQ1x1NTM1NVx1RkYwOSAtLS0tXG4gICAgY29uc3QgaGVhZGVyID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1oZWFkZXInIH0pXG4gICAgY29uc3QgbG9nbyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1sb2dvJyB9KVxuICAgIHNldEljb24obG9nbywgJ2FuY2hvcicpXG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay10aXRsZScsIHRleHQ6ICdEU0ggRG9jaycgfSlcbiAgICB0aGlzLnBpbGxFbCA9IGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiAnZHNoLWRvY2stcGlsbCcgfSlcbiAgICBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3BhY2VyJyB9KVxuXG4gICAgLy8gRDVcdUZGMUFcdTVERTVcdTUxNzdcdTY4MEZcdTUyQThcdTRGNUNcdThGREIgT2JzaWRpYW4gXHU1MzlGXHU3NTFGXHU2ODA3XHU5ODk4XHU2ODBGXHVGRjA4SXRlbVZpZXcuYWRkQWN0aW9uLCBvYnNpZGlhbi5kLnRzOjM2MDRcdUZGMDlcdUZGMENcbiAgICAvLyBcdTU5MUFcdTk3NjJcdTY3N0ZcdTgxRUFcdTUyQThcdTgzQjdcdTVGOTdcdUZGMUJhZGRBY3Rpb24gXHU4RkQ0XHU1NkRFXHU2MzA5XHU5NEFFXHU1MTQzXHU3RDIwXHVGRjBDXHU1NDJGXHU1MkE4L1x1NTA1Q1x1NkI2Mlx1NTZGRVx1NjgwN1x1OTY4Rlx1NzJCNlx1NjAwMVx1NTIwN1x1NjM2Mlx1MzAwMlxuICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwgPSB0aGlzLmFkZEFjdGlvbigncGxheScsICdcdTU0MkZcdTUyQTgnLCAoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKSlcbiAgICB0aGlzLmFkZEFjdGlvbigncmVmcmVzaC1jdycsICdcdTUyMzdcdTY1QjAnLCAoKSA9PiB0aGlzLnJlbG9hZCgpKVxuICAgIHRoaXMuYWRkQWN0aW9uKCdtYXhpbWl6ZS0yJywgJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOFx1NzJFQ1x1N0FDQlx1OEZEQlx1N0EwQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOScsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpKVxuICAgIHRoaXMuYWRkQWN0aW9uKCdleHRlcm5hbC1saW5rJywgJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCcsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlbkluQnJvd3NlcigpKVxuXG4gICAgLy8gLS0tLSBcdTRFM0JcdTRGNTNcdUZGMUFpZnJhbWUgKyBcdTcyQjZcdTYwMDFcdTg5ODZcdTc2RDZcdTVDNDIgLS0tLVxuICAgIGNvbnN0IGJvZHkgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJvZHknIH0pXG4gICAgLy8gRDRcdUZGMUFcdTY2M0VcdTVGMEYgc2FuZGJveCBcdTc2N0RcdTU0MERcdTUzNTVcdUZGMDhhbGxvdy1zY3JpcHRzICsgYWxsb3ctc2FtZS1vcmlnaW4gXHU0RjlCIFNQQSBcdTc1MjhcbiAgICAvLyBsb2NhbFN0b3JhZ2VcdUZGMENhbGxvdy1mb3Jtcy9tb2RhbHMvcG9wdXBzIFx1ODk4Nlx1NzZENlx1NzY3Qlx1NUY1NS9cdTVGMzlcdTdBOTdcdTU3M0FcdTY2NkZcdUZGMUJcdTRFQzVcdTU2REVcdTczQUZcdTUzRUZcdTRGRTFcbiAgICAvLyBcdTY3MERcdTUyQTFcdUZGMENcdTRGNDZcdTY2M0VcdTVGMEZcdTU4RjBcdTY2MEVcdTY2MkZcdTg5QzRcdTgzMDNcdTg5ODFcdTZDNDJcdUZGMENDdXN0b20gRnJhbWVzIFx1NTQwQ1x1NkIzRVx1RkYwOVx1MzAwMlxuICAgIHRoaXMuaWZyYW1lRWwgPSBib2R5LmNyZWF0ZUVsKCdpZnJhbWUnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1mcmFtZScsXG4gICAgICBhdHRyOiB7IHNhbmRib3g6ICdhbGxvdy1zY3JpcHRzIGFsbG93LXNhbWUtb3JpZ2luIGFsbG93LWZvcm1zIGFsbG93LW1vZGFscyBhbGxvdy1wb3B1cHMnIH0sXG4gICAgfSlcbiAgICB0aGlzLm92ZXJsYXlFbCA9IGJvZHkuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stb3ZlcmxheScgfSlcblxuICAgIC8vIFx1NzJCNlx1NjAwMVx1ODA1NFx1NTJBOFxuICAgIHRoaXMucGx1Z2luLm9uU3RhdHVzQ2hhbmdlKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIHRoaXMucmVmcmVzaCgpXG5cbiAgICAvLyBcdTUxNUNcdTVFOTVcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTgyRTVcdTY3MERcdTUyQTFcdTY3MkFcdTU0MkZcdTUyQThcdTRFMTRcdTdBRUZcdTUzRTNcdTUzRUZcdTc1MjhcdUZGMENcdTVDMURcdThCRDVcdTYyQzlcdThENzdcbiAgICB2b2lkIHRoaXMuZW5zdXJlU3RhcnRlZCgpXG5cbiAgICAvLyBcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTUyMzdcdTY1QjBcdTRFMDBcdTZCMjFcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXHVGRjFBXHU3NTI4XHU2MjM3XHU2QjY0XHU1MjNCXHU2QjYzXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0ZcdTc2ODRcdTdBOTdcdTUzRTNcbiAgICAvLyBcdTVDMzFcdTY2MkZcIlx1NUY1M1x1NTI0RCB2YXVsdFwiXHVGRjBDXHU2NUUwXHU5NzAwXHU3QjQ5IGZvY3VzL2FjdGl2ZS1sZWFmLWNoYW5nZSBcdTRFOEJcdTRFRjZcdTMwMDJcbiAgICB0aGlzLnBsdWdpbi5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgfVxuXG4gIG92ZXJyaWRlIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIH1cblxuICAvKiogRDVcdUZGMUFcdTUzRjNcdTk1MkVcdTgzRENcdTUzNTVcdUZGMDhWaWV3Lm9uUGFuZU1lbnUsIG9ic2lkaWFuLmQudHM6NzcwOVx1RkYwOVx1MjAxNFx1MjAxNFx1NTkxQVx1OTc2Mlx1Njc3Ri9cdTY4MDdcdTdCN0VcdTU5MzRcdTUzRjNcdTk1MkVcdTgxRUFcdTUyQThcdTgzQjdcdTVGOTcgKi9cbiAgb3ZlcnJpZGUgb25QYW5lTWVudShtZW51OiBNZW51LCBfc291cmNlOiAnbW9yZS1vcHRpb25zJyB8ICd0YWItaGVhZGVyJyB8IHN0cmluZyk6IHZvaWQge1xuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT5cbiAgICAgIGl0ZW1cbiAgICAgICAgLnNldFRpdGxlKHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnIHx8IHRoaXMuY3VycmVudCA9PT0gJ3N0YXJ0aW5nJyA/ICdcdTUwNUNcdTZCNjIgRFNIIFx1NjcwRFx1NTJBMScgOiAnXHU1NDJGXHU1MkE4IERTSCBcdTY3MERcdTUyQTEnKVxuICAgICAgICAuc2V0SWNvbih0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJyB8fCB0aGlzLmN1cnJlbnQgPT09ICdzdGFydGluZycgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgICAgLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLm9uVG9nZ2xlKCkpLFxuICAgIClcbiAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IGl0ZW0uc2V0VGl0bGUoJ1x1NTIzN1x1NjVCMCcpLnNldEljb24oJ3JlZnJlc2gtY3cnKS5vbkNsaWNrKCgpID0+IHRoaXMucmVsb2FkKCkpKVxuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT5cbiAgICAgIGl0ZW0uc2V0VGl0bGUoJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFMycpLnNldEljb24oJ21heGltaXplLTInKS5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpKSxcbiAgICApXG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PlxuICAgICAgaXRlbS5zZXRUaXRsZSgnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJykuc2V0SWNvbignZXh0ZXJuYWwtbGluaycpLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKCkpLFxuICAgIClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25Ub2dnbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoKClcbiAgfVxuXG4gIC8qKiBcdTk3NjJcdTY3N0ZcdTYyNTNcdTVGMDBcdTY1RjZcdTc4NkVcdTRGRERcdTY3MERcdTUyQTFcdTU3MjhcdThERDFcdUZGMDhcdTVERjJcdTU3MjhcdThERDFcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDkgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVTdGFydGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdzdG9wcGVkJyB8fCBzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICAgIHRoaXMucmVmcmVzaCgpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGxldCB1aTogVWlTdGF0ZVxuICAgIGxldCBwaWxsVGV4dCA9ICcnXG4gICAgbGV0IHBpbGxDbHMgPSAnJ1xuXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB1aSA9ICdydW5uaW5nJ1xuICAgICAgcGlsbFRleHQgPSBgXHUyNUNGICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICcgXHUwMEI3IFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnJ31gXG4gICAgICBwaWxsQ2xzID0gJ2lzLXJ1bm5pbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHVpID0gJ3N0YXJ0aW5nJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNDIFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNidcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RhcnRpbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHVpID0gJ2Vycm9yJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNzE1IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNSdcbiAgICAgIHBpbGxDbHMgPSAnaXMtZXJyb3InXG4gICAgfSBlbHNlIHtcbiAgICAgIHVpID0gJ3N0b3BwZWQnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0IgXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICAgICAgcGlsbENscyA9ICdpcy1zdG9wcGVkJ1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHVpXG4gICAgaWYgKHRoaXMucGlsbEVsKSB7XG4gICAgICB0aGlzLnBpbGxFbC5zZXRUZXh0KHBpbGxUZXh0KVxuICAgICAgdGhpcy5waWxsRWwuY2xhc3NOYW1lID0gYGRzaC1kb2NrLXBpbGwgJHtwaWxsQ2xzfWBcbiAgICB9XG4gICAgLy8gXHU2ODA3XHU5ODk4XHU2ODBGXHU1MkE4XHU0RjVDXHU2MzA5XHU5NEFFXHU1NkZFXHU2ODA3XHU5NjhGXHU3MkI2XHU2MDAxXHU1MjA3XHU2MzYyXHVGRjA4YWRkQWN0aW9uIFx1OEZENFx1NTZERVx1NzY4NFx1NTE0M1x1N0QyMFx1NTNFRlx1ODhBQiBzZXRJY29uIFx1OTFDRFx1N0VEOFx1RkYwOVxuICAgIGNvbnN0IHJ1bm5pbmcgPSBzLmtpbmQgPT09ICdydW5uaW5nJyB8fCBzLmtpbmQgPT09ICdzdGFydGluZydcbiAgICBpZiAodGhpcy50b2dnbGVBY3Rpb25FbCkge1xuICAgICAgdGhpcy50b2dnbGVBY3Rpb25FbC5lbXB0eSgpXG4gICAgICBzZXRJY29uKHRoaXMudG9nZ2xlQWN0aW9uRWwsIHJ1bm5pbmcgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwudGl0bGUgPSBydW5uaW5nID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4J1xuICAgICAgdGhpcy50b2dnbGVBY3Rpb25FbC5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCBydW5uaW5nID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4JylcbiAgICB9XG5cbiAgICAvLyBpZnJhbWUgXHU0RTBFXHU4OTg2XHU3NkQ2XHU1QzQyXG4gICAgaWYgKHVpID09PSAncnVubmluZycpIHtcbiAgICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuaWZyYW1lRWwuc3JjICE9PSB0aGlzLnBsdWdpbi5iYXNlVXJsKSB7XG4gICAgICAgIHRoaXMuaWZyYW1lRWwuc3JjID0gdGhpcy5wbHVnaW4uYmFzZVVybFxuICAgICAgfVxuICAgICAgdGhpcy5zaG93T3ZlcmxheShudWxsKVxuICAgIH0gZWxzZSBpZiAodWkgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJTdGFydGluZygpKVxuICAgIH0gZWxzZSBpZiAodWkgPT09ICdlcnJvcicpIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJFcnJvcihzLmtpbmQgPT09ICdlcnJvcicgPyBzLm1lc3NhZ2UgOiAnXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGJykpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvd092ZXJsYXkodGhpcy5yZW5kZXJTdG9wcGVkKCkpXG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLSBcdTg5ODZcdTc2RDZcdTVDNDJcdTZFMzJcdTY3RDMgLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgc2hvd092ZXJsYXkoY29udGVudDogSFRNTEVsZW1lbnQgfCBudWxsKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLm92ZXJsYXlFbCkgcmV0dXJuXG4gICAgdGhpcy5vdmVybGF5RWwuZW1wdHkoKVxuICAgIGlmIChjb250ZW50KSB7XG4gICAgICB0aGlzLm92ZXJsYXlFbC5hcHBlbmRDaGlsZChjb250ZW50KVxuICAgICAgdGhpcy5vdmVybGF5RWwucmVtb3ZlQXR0cmlidXRlKCdoaWRkZW4nKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBcdThGRDBcdTg4NENcdTRFMkRcdUZGMUFcdTY2M0VcdTVGMEZcdTk2OTBcdTg1Q0ZcdTg5ODZcdTc2RDZcdTVDNDJcdUZGMDhcdTU0MjZcdTUyMTlcdTdBN0FcdTc2ODRcdTdFRERcdTVCRjlcdTVCOUFcdTRGNERcdTVDNDJcdTRGMUFcdTYzMjFcdTRGNEYgaWZyYW1lXHVGRjA5XG4gICAgICB0aGlzLm92ZXJsYXlFbC5zZXRBdHRyaWJ1dGUoJ2hpZGRlbicsICcnKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhcnRpbmcoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGlubmVyJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdcdTZCNjNcdTU3MjhcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgRFNIIFdlYlx1MjAyNicgfSlcbiAgICBib3guY3JlYXRlRGl2KHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsXG4gICAgICB0ZXh0OiAnXHU5OTk2XHU2QjIxXHU1NDJGXHU1MkE4XHU5NzAwXHU1MjFEXHU1OUNCXHU1MzE2IHByb2ZpbGVcdUZGMDhcdTdFQTYgMTAgXHU3OUQyXHVGRjA5XHVGRjFCXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwXHU3NTI4XHU2NUY2XHU1QzA2XHU4MUVBXHU1MkE4XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyxcbiAgICB9KVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRXJyb3IobWVzc2FnZTogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbGVydC10cmlhbmdsZScpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLW1zZycsIHRleHQ6IG1lc3NhZ2UgfSlcbiAgICBjb25zdCByZXRyeSA9IGJveC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1idG4nLCB0ZXh0OiAnXHU5MUNEXHU4QkQ1JyB9KVxuICAgIHJldHJ5Lm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB9XG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdG9wcGVkKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYW5jaG9yJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NjcyQVx1OEZEMFx1ODg0QycgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJywgdGV4dDogJ1x1NzBCOVx1NTFGQlx1NTQyRlx1NTJBOFx1RkYwQ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFx1NTA1Q1x1OTc2MFx1OEZEQlx1Njc2NScgfSlcbiAgICBjb25zdCBzdGFydCA9IGJveC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1idG4gbW9kLWN0YScsIHRleHQ6ICdcdTU0MkZcdTUyQTggRFNIJyB9KVxuICAgIHN0YXJ0Lm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLnJlZnJlc2goKSlcbiAgICB9XG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZWxvYWQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5jdXJyZW50ID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuaWZyYW1lRWwuc3JjID0gdGhpcy5wbHVnaW4uYmFzZVVybFxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogY3VycmVudFZhdWx0LnRzIFx1MjAxNFx1MjAxNCBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdCArIFx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdTMwMDJcbiAqXG4gKiBkc2gtZG9jayBcdThERDFcdTU3MjggT2JzaWRpYW4gXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU4MEZEXHU2MkZGXHU1MjMwXHU2NzAwXHU2NzQzXHU1QTAxXHU3Njg0XHU1RjUzXHU1MjREIHZhdWx0XHVGRjA4XHU3QTk3XHU1M0UzXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU2NUY2XHVGRjBDXG4gKiBgYXBwLnZhdWx0LmdldE5hbWUoKWAgKyBgRmlsZVN5c3RlbUFkYXB0ZXIuZ2V0QmFzZVBhdGgoKWBcdUZGMDlcdTRFMEVcdTVGNTNcdTUyNERcdTYyNTNcdTVGMDBcdTc2ODRcdTdCMTRcdThCQjBcbiAqIFx1RkYwOGBhcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKWBcdUZGMDlcdTMwMDJEU0ggXHU3Njg0XHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2IGRzaC10b29sLW9ic2lkaWFuLXZhdWx0XG4gKiBcdThERDFcdTU3MjhcdTcyRUNcdTdBQ0Igbm9kZSBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTRFMjRcdTgwMDVcdTkwMUFcdThGQzdcdTRFMDBcdTRFMkFcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTg5RTNcdTgwMjZcdTkwMUFcdTRGRTFcdUZGMUFcbiAqXG4gKiAgIDxob21lZGlyPi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAgIHsgbmFtZSwgcGF0aCwgYWN0aXZlRmlsZT8sIHVwZGF0ZWRBdCB9XG4gKlxuICogLSBcdTRGNERcdTdGNkVcdTU2RkFcdTVCOUFcdTU3MjggYH4vLmRzaGBcdUZGMDhcdTRFMEUgZHNoLWRvY2sgXHU3Njg0IERTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1NjVFMFx1NTE3M1x1RkYwOVx1RkYwQ1x1NEVGQlx1NEY1NVx1NkEyMVx1NUYwRlxuICogICBcdTRFMEIgRFNIIFx1NEZBN1x1OTBGRFx1OEJGQlx1NUY5N1x1NTIzMFx1RkYxQlxuICogLSBgYWN0aXZlRmlsZWAgXHU2NjJGIHZhdWx0IFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOFx1NjVFMCBgLm1kYCBcdThCRURcdTRFNDlcdUZGMENcdTUzOUZcdTY4MzdcdUZGMDlcdUZGMENcdTUzRUFcdTU3MjhcdTc4NkVcdTVCOUVcdTY3MDlcdTYyNTNcdTVGMDBcdTc2ODRcbiAqICAgXHU3QjE0XHU4QkIwXHU2NUY2XHU1MTk5XHU1MTY1XHVGRjFCRFNIIFx1NEZBN1x1NzY4NCBgdmF1bHRfY3VycmVudGAvYHZhdWx0X2FjdGl2ZWAgXHU2MzZFXHU2QjY0XHU0RUNFXCJcdTczMUNcdTY3MDBcdThGRDFcdTZEM0JcdThEQzNcdTVFOTNcIlxuICogICBcdTUzNDdcdTdFQTdcdTRFM0FcIlx1NzcxRlx1MDBCN1x1NUY1M1x1NTI0RFx1NUU5MyArIFx1NUY1M1x1NTI0RFx1N0IxNFx1OEJCMFwiXHVGRjFCXG4gKiAtIFx1NTkxQVx1N0E5N1x1NTNFM1x1NTczQVx1NjY2Rlx1RkYxQVx1NkJDRlx1NEUyQSBPYnNpZGlhbiBcdTdBOTdcdTUzRTNcdUZGMDhcdTRFM0JcdTdBOTdcdTUzRTMgLyBwb3BvdXRcdUZGMDlcdTkwRkRcdTY2MkZcdTcyRUNcdTdBQ0JcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMENcdTU0MDRcbiAqICAgXHU4MUVBXHU3NkQxXHU1NDJDXHU4MUVBXHU1REYxXHU3Njg0IHdpbmRvdyBmb2N1cyBcdTIwMTRcdTIwMTQgXHU2NzAwXHU1NDBFXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU3Njg0XHU3QTk3XHU1M0UzXHU1MTk5XHU1MTY1XHVGRjBDXHU2QjYzXHU2NjJGXCJcdTc1MjhcdTYyMzdcdTVGNTNcdTUyNERcdTZCNjNcbiAqICAgXHU1NzI4XHU3NzBCXHU3Njg0IHZhdWx0XCJcdUZGMUJcbiAqIC0gXHU1OTMxXHU4RDI1XHU5NzU5XHU5RUQ4XHVGRjFBXHU1MTk5XHU0RTBEXHU4RkRCXHVGRjA4XHU2NzQzXHU5NjUwL1x1NzhDMVx1NzZEOFx1RkYwOVx1NTNFQSBjb25zb2xlLndhcm5cdUZGMENcdTdFRERcdTRFMERcdTYyNTNcdTY1QURcdTYzRDJcdTRFRjZcdTRFM0JcdTZENDFcdTdBMEJcdUZGMUJcbiAqICAgXHU2NTg3XHU0RUY2XHU2MzVGXHU1NzRGL1x1N0YzQVx1NTkzMVx1NjVGNiBEU0ggXHU0RkE3XHU1NkRFXHU5MDAwXHU1MzlGXHU2NzA5XHU0RkUxXHU1M0Y3XHVGRjBDXHU1NDExXHU1NDBFXHU1MTdDXHU1QkI5XHU0RTBEXHU4OEM1IGRzaC1kb2NrIFx1NzY4NFx1NTczQVx1NjY2Rlx1MzAwMlxuICovXG5cbmltcG9ydCB7IEZpbGVTeXN0ZW1BZGFwdGVyLCB0eXBlIEFwcCB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTZGQVx1NUI5QVx1NEY0RFx1N0Y2RVx1RkYxQX4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gKi9cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50VmF1bHRNYXJrZXJQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmRzaCcsICdjdXJyZW50LXZhdWx0Lmpzb24nKVxufVxuXG4vKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTg1XHU1QkI5XHVGRjA4RFNIIFx1NEZBN1x1NTNFQVx1OEJGQiBuYW1lL3BhdGgvYWN0aXZlRmlsZVx1RkYwQ3VwZGF0ZWRBdCBcdTRGOUJcdThCQ0FcdTY1QURcdUZGMDkgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ3VycmVudFZhdWx0TWFya2VyIHtcbiAgbmFtZTogc3RyaW5nXG4gIHBhdGg6IHN0cmluZ1xuICAvKiogXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU3QjE0XHU4QkIwXHVGRjA4dmF1bHQgXHU3NkY4XHU1QkY5XHU4REVGXHU1Rjg0XHVGRjA5XHVGRjFCXHU2NUUwXHU2MjUzXHU1RjAwXHU3QjE0XHU4QkIwXHU2NUY2XHU0RTBEXHU1MTk5XHU2QjY0XHU1QjU3XHU2QkI1ICovXG4gIGFjdGl2ZUZpbGU/OiBzdHJpbmdcbiAgdXBkYXRlZEF0OiBudW1iZXJcbn1cblxuLyoqXG4gKiBcdTUzOUZcdTVCNTBcdTUxOTlcdTUxNjVcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdUZGMUFcdTUxNDhcdTUxOTlcdTU0MENcdTc2RUVcdTVGNTUgLnRtcCBcdTUxOEQgcmVuYW1lXHVGRjBDXHU5MDdGXHU1MTREIERTSCBcdTRGQTdcdThCRkJcdTUyMzBcdTUzNEFcdTYyMkFcdTUxODVcdTVCQjlcdTMwMDJcbiAqIFx1NTkzMVx1OEQyNVx1NTNFQVx1NTQ0QVx1OEI2Nlx1RkYwQ1x1NEUwRFx1NjI5Qlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIobmFtZTogc3RyaW5nLCB2YXVsdFBhdGg6IHN0cmluZywgYWN0aXZlRmlsZT86IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGNvbnN0IGZpbGUgPSBjdXJyZW50VmF1bHRNYXJrZXJQYXRoKClcbiAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgIGNvbnN0IHBheWxvYWQ6IEN1cnJlbnRWYXVsdE1hcmtlciA9IHsgbmFtZSwgcGF0aDogdmF1bHRQYXRoLCB1cGRhdGVkQXQ6IERhdGUubm93KCkgfVxuICAgIGlmIChhY3RpdmVGaWxlKSBwYXlsb2FkLmFjdGl2ZUZpbGUgPSBhY3RpdmVGaWxlXG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYFxuICAgIGZzLndyaXRlRmlsZVN5bmModG1wLCBKU09OLnN0cmluZ2lmeShwYXlsb2FkLCBudWxsLCAyKSlcbiAgICBmcy5yZW5hbWVTeW5jKHRtcCwgZmlsZSlcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWRvY2tdIFx1NTE5OVx1NTE2NSBjdXJyZW50LXZhdWx0IFx1NjgwN1x1OEJCMFx1NTkzMVx1OEQyNScsIGVycilcbiAgfVxufVxuXG4vKipcbiAqIFx1NEVDRSBPYnNpZGlhbiBhcHAgXHU1M0Q2XHU1RjUzXHU1MjREIHZhdWx0IFx1NTQwRFx1MzAwMVx1NjgzOVx1OERFRlx1NUY4NFx1NEUwRVx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYxQlx1NTNENlx1NEUwRFx1NTIzMFx1OEZENFx1NTZERSBudWxsXHUzMDAyXG4gKlxuICogXHU3NTI4IGBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyYFx1RkYwOG9ic2lkaWFuLmQudHM6Mjk5Nlx1RkYwQ1x1Njg0Q1x1OTc2Mlx1N0FFRlx1NUI5RVx1NzNCMFx1RkYwOVx1NjZGRlx1NEVFM1xuICogXHU2NUU3XHU3Njg0IGBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH1gIFx1NUYzQVx1OEY2Q1x1RkYxQVx1N0M3Qlx1NTc4Qlx1NUI4OVx1NTE2OFx1RkYwQ1x1NEUxNFx1NzlGQlx1NTJBOFx1N0FFRlxuICogXHVGRjA4Q2FwYWNpdG9yQWRhcHRlclx1RkYwOVx1ODFFQVx1NzEzNlx1OEZENFx1NTZERSBudWxsXHUzMDAyRmlsZVN5c3RlbUFkYXB0ZXIgXHU0RUNFXHU1Qjk4XHU2NUI5IGBvYnNpZGlhbmBcbiAqIFx1NkEyMVx1NTc1N1x1NUJGQ1x1NTE2NVx1RkYwOFx1NjNEMlx1NEVGNlx1NzY4NFx1OEZEMFx1ODg0Q1x1NjVGNlx1NUJCRlx1NEUzQlx1NkNFOFx1NTE2NVx1RkYwOVx1RkYwQ1x1NEUwRSBkc2gtZG9jayBcdTVCOUVcdTk2NDVcdTdGMTZcdThCRDFcdTc2ODQgb2JzaWRpYW5AMS4xMy4xXG4gKiBcdTdDN0JcdTU3OEJcdTRFMDBcdTgxRjRcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdEluZm8oYXBwOiBBcHApOiB7IG5hbWU6IHN0cmluZzsgcGF0aDogc3RyaW5nOyBhY3RpdmVGaWxlPzogc3RyaW5nIH0gfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBhZGFwdGVyID0gYXBwLnZhdWx0LmFkYXB0ZXJcbiAgICBpZiAoIShhZGFwdGVyIGluc3RhbmNlb2YgRmlsZVN5c3RlbUFkYXB0ZXIpKSByZXR1cm4gbnVsbFxuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSBhcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKT8ucGF0aFxuICAgIGNvbnN0IGluZm86IHsgbmFtZTogc3RyaW5nOyBwYXRoOiBzdHJpbmc7IGFjdGl2ZUZpbGU/OiBzdHJpbmcgfSA9IHtcbiAgICAgIG5hbWU6IGFwcC52YXVsdC5nZXROYW1lKCksXG4gICAgICBwYXRoOiBhZGFwdGVyLmdldEJhc2VQYXRoKCksXG4gICAgfVxuICAgIGlmIChhY3RpdmVGaWxlKSBpbmZvLmFjdGl2ZUZpbGUgPSBhY3RpdmVGaWxlXG4gICAgcmV0dXJuIGluZm9cbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVFBLElBQUFBLG1CQUE2RTtBQUM3RSxzQkFBc0I7QUFFdEIsSUFBQUMsTUFBb0I7QUFDcEIsSUFBQUMsUUFBc0I7OztBQ0d0QiwyQkFBb0Q7QUFDcEQsU0FBb0I7QUFDcEIsV0FBc0I7QUFDdEIsU0FBb0I7QUFDcEIsV0FBc0I7QUFFZixJQUFNLG1CQUF3QixVQUFLLGdCQUFnQixPQUFPLE9BQU8sUUFBUTtBQUd6RSxJQUFNLHdCQUF3QjtBQUc5QixTQUFTLFdBQVcsT0FBZSxNQUFNLEdBQVc7QUFDekQsTUFBSSxJQUFJO0FBQ1IsV0FBUyxJQUFJLEdBQUcsSUFBSSxNQUFNLFFBQVEsSUFBSyxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFDLE1BQU87QUFDcEYsU0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLFNBQVMsS0FBSyxHQUFHLEVBQUUsTUFBTSxHQUFHLEdBQUc7QUFDdkQ7QUFHTyxTQUFTLGNBQWMsV0FBMkI7QUFDdkQs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TSxnQkFBK0I7QUFDbkMsVUFBTSxzQkFBTSxhQUFhLEtBQUssT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLE1BQU0sYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sT0FBTyxLQUFLLElBQUksVUFBVSxlQUFlO0FBQy9DLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRSxTQUFTLEtBQUs7QUFDWixZQUFNLE1BQU0sZUFBZSxRQUFRLElBQUksVUFBVSxPQUFPLEdBQUc7QUFDM0QsVUFBSSx3QkFBTyxxREFBYSxHQUFHLEVBQUU7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIm9zIiwgInBhdGgiLCAiZW1iZWRkZWROb2RlVmVyc2lvbiIsICJyZXNvbHZlIiwgIm91dCIsICJjbWQiLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJmcyIsICJvcyIsICJwYXRoIl0KfQo=
