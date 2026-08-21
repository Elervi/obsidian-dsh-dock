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
  const args = [opts.dshBin, "web", "--host", host, "--port", String(port), "--no-open"];
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmLCByZXF1ZXN0VXJsLCBGaWxlU3lzdGVtQWRhcHRlciB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHsgc2hlbGwgfSBmcm9tICdlbGVjdHJvbidcbmltcG9ydCB0eXBlIHsgQ2hpbGRQcm9jZXNzIH0gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHtcbiAgZW1iZWRkZWROb2RlVmVyc2lvbixcbiAgZW5zdXJlRHNoUnVubmluZyxcbiAgcmVtb3ZlRHNoUGlkRmlsZSxcbiAgcmVzb2x2ZURzaEJpbixcbiAgcmVzb2x2ZU5vZGVCaW4sXG4gIHNhZmVWYXVsdE5hbWUsXG4gIHN0YWJsZUhhc2gsXG4gIHN0b3BQcm9jZXNzLFxuICBzd2VlcE9ycGhhbkRzaCxcbiAgd3JpdGVEc2hQaWRGaWxlLFxuICB0eXBlIFNlcnZlclN0YXR1cyxcbn0gZnJvbSAnLi9sYXVuY2hlcidcbmltcG9ydCB7IERzaERvY2tTZXR0aW5nc1RhYiwgREVGQVVMVF9TRVRUSU5HUywgdHlwZSBEc2hEb2NrU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJ1xuaW1wb3J0IHsgRHNoV2ViVmlldywgRFNIX1dFQl9WSUVXX1RZUEUgfSBmcm9tICcuL3ZpZXcnXG5pbXBvcnQgeyBjdXJyZW50VmF1bHRJbmZvLCB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlciB9IGZyb20gJy4vY3VycmVudFZhdWx0J1xuXG4vKipcbiAqIFx1OEJBMVx1N0I5NyBEU0hfSE9NRVx1RkYxQVxuICogLSBwZXItdmF1bHRcdUZGMDhcdTlFRDhcdThCQTRcdUZGMDlcdUZGMUF+Ly5kc2gvdmF1bHRzLzxcdTUzRUZcdThCRkJcdTU0MEQ+LTxoYXNoNj4gXHUyMDE0XHUyMDE0IFx1NkJDRiB2YXVsdCBcdTcyRUNcdTdBQ0JcdUZGMDhoYXNoIFx1NkQ4OFx1NkI2N1x1RkYwQ1x1NEUyRFx1NjU4N1x1NTQwRFx1NEUwRFx1NzhCMFx1NjQ5RVx1RkYwOVx1RkYxQlxuICogLSBzaGFyZWRcdUZGMUF+Ly5kc2ggXHUyMDE0XHUyMDE0IFx1NEUwRVx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1NUI4Q1x1NTE2OFx1NEUwMFx1ODFGNFx1RkYwQ1x1NTkwRFx1NzUyOFx1NURGMlx1NjcwOVx1OTE0RFx1N0Y2RS9cdTRGMUFcdThCRERcdUZGMUJcbiAqIC0gY3VzdG9tXHVGRjFBXHU3NTI4XHU2MjM3XHU1ODZCXHU1MTk5XHU3Njg0XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlRHNoSG9tZShzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJyB8ICdkc2hIb21lJz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICByZXR1cm4gcy5kc2hIb21lLnRyaW0oKSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnKVxuICB9XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0Jykge1xuICAgIGNvbnN0IG5hbWUgPSB2YXVsdFJvb3QgPyBgJHtzYWZlVmF1bHROYW1lKHZhdWx0Um9vdCl9LSR7c3RhYmxlSGFzaCh2YXVsdFJvb3QpfWAgOiAndmF1bHQnXG4gICAgcmV0dXJuIHBhdGguam9pbihob21lLCAnLmRzaCcsICd2YXVsdHMnLCBuYW1lKVxuICB9XG4gIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnKVxufVxuXG4vKipcbiAqIFx1OEJBMVx1N0I5N1x1NjcyQyB2YXVsdCBcdTc2ODRcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdTMwMDJcbiAqIC0gc2hhcmVkIC8gY3VzdG9tXHVGRjFBc2V0dGluZ3MucG9ydFx1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5XHUyMDE0XHUyMDE0IFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTU0MENcdTRFMDBcdTY3MERcdTUyQTFcdTRFMEVcdTRGMUFcdThCRERcdUZGMUJcbiAqIC0gcGVyLXZhdWx0XHVGRjFBc2V0dGluZ3MucG9ydCArIChzdGFibGVIYXNoICUgNDA5NikgXHUyMDE0XHUyMDE0IFx1NkJDRlx1NEUyQSB2YXVsdCBcdTcyRUNcdTUzNjBcdTdBRUZcdTUzRTNcdUZGMENcdTU0MDRcdTgxRUFcbiAqICAgc3Bhd24gXHU3MkVDXHU3QUNCXHU3Njg0IGRzaCBcdThGREJcdTdBMEJcdUZGMUJcdTkxNERcdTU0MDhcdTcyRUNcdTdBQ0JcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCRERcdTVCNThcdTUwQThcdTY4MzlcdUZGMDlcdUZGMENcdTRFMERcdTU0MEMgdmF1bHQgXHU3Njg0XG4gKiAgIFx1NEYxQVx1OEJERFx1NUI4Q1x1NTE2OFx1OTY5NFx1NzlCQlx1RkYwQ1x1NEU5Mlx1NEUwRFx1NTNFRlx1ODlDMVx1MzAwMlx1N0FFRlx1NTNFM1x1NTFCMlx1N0E4MVx1Njk4Mlx1NzM4NyB+MS80MDk2XHVGRjBDXHU1M0VGXHU2M0E1XHU1M0Q3XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlUG9ydChzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJyB8ICdwb3J0Jz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogbnVtYmVyIHtcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnICYmIHZhdWx0Um9vdCkge1xuICAgIGNvbnN0IG9mZnNldCA9IHBhcnNlSW50KHN0YWJsZUhhc2godmF1bHRSb290KSwgMzYpICUgNDA5NlxuICAgIHJldHVybiBzLnBvcnQgKyBvZmZzZXRcbiAgfVxuICByZXR1cm4gcy5wb3J0XG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU1MTcxXHU3NTI4XHU0RTAwXHU0RUZEXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHVGRjA5XHUzMDAyXG4gKiAtIHNoYXJlZFx1RkYxQWRzaEhvbWUgXHU4MUVBXHU4RUFCXHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjBDXHU2NUUwXHU5NzAwXHU1MTcxXHU0RUFCXHU1QzQyXHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NjMwN1x1NUI5QVx1OERFRlx1NUY4NFx1NTM3M1x1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwQ1x1NjVFMFx1OTcwMFx1NTE3MVx1NEVBQlx1NUM0Mlx1RkYxQlxuICogLSBwZXItdmF1bHRcdUZGMUFcdThGRDRcdTU2REVcdTUxNzFcdTRFQUIgYH4vLmRzaGBcdUZGMENcdThCQTlcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3Njg0IHNldHRpbmdzL2NyZWRlbnRpYWxzXG4gKiAgIFx1NjMwN1x1NTZERVx1NUI4MyBcdTIwMTRcdTIwMTQgXHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4IHZhdWx0IFx1NzUxRlx1NjU0OFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVNoYXJlZENvbmZpZ1Jvb3QoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnKVxuICB9XG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHNoRG9ja1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBEc2hEb2NrU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTXG4gIHByaXZhdGUgcHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXM6IFNlcnZlclN0YXR1cyA9IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgcHJpdmF0ZSBzdGFydGluZyA9IGZhbHNlXG4gIHByaXZhdGUgc3RhdHVzQmFyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXNMaXN0ZW5lcnMgPSBuZXcgU2V0PCgpID0+IHZvaWQ+KClcbiAgLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE5OVx1NTE2NVx1OTYzMlx1NjI5NiB0aW1lclx1RkYwOFx1N0E5N1x1NTNFMyBmb2N1cyBcdTUzRUZcdTgwRkRcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdUZGMDkgKi9cbiAgcHJpdmF0ZSBtYXJrZXJUaW1lcjogbnVtYmVyIHwgbnVsbCA9IG51bGxcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKClcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KERTSF9XRUJfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IERzaFdlYlZpZXcobGVhZiwgdGhpcykpXG5cbiAgICAvLyBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdCArIFx1NUY1M1x1NTI0RFx1N0IxNFx1OEJCMFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdUZGMUFcdTY3MkNcdTdBOTdcdTUzRTNcdTYyNTNcdTVGMDBcdUZGMDhvbmxvYWRcdUZGMDlcdTRFMEVcbiAgICAvLyBcdTZCQ0ZcdTZCMjFcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTY1RjZcdTUyMzdcdTY1QjBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTMwMDJcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdTRFMEJcdTZCQ0ZcdTRFMkFcdTdBOTdcdTUzRTNcdTkwRkRcdTcyRUNcdTdBQ0JcdTUyQTBcdThGN0RcdTY3MkNcdTYzRDJcdTRFRjZcdUZGMENcbiAgICAvLyBcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTUzNzNcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1x1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHUzMDAyXG4gICAgdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICAvLyBEMlx1RkYxQXJlZ2lzdGVyRG9tRXZlbnQgXHU1M0Q2XHU0RUUzXHU2MjRCXHU1REU1IGFkZEV2ZW50TGlzdGVuZXIgKyByZWdpc3RlcigpXHVGRjBDXG4gICAgLy8gXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4XHUzMDAxXHU1Mzc4XHU4RjdEXHU4MUVBXHU1MkE4XHU2RTA1XHU3NDA2XHVGRjA4Q29tcG9uZW50LnJlZ2lzdGVyRG9tRXZlbnQsIG9ic2lkaWFuLmQudHM6MTg5Mlx1RkYwOVx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudCh3aW5kb3csICdmb2N1cycsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKVxuICAgIC8vIFx1ODg2NVx1NTE0NVx1NEZFMVx1NTNGN1x1RkYxQVx1NTE0OVx1NjgwN1x1NTIwN1x1NjM2Mlx1NjU4N1x1NEVGNlx1RkYwOGZpbGUtb3Blblx1RkYwOVx1MzAwMVx1NjVCMFx1N0E5N1x1NTNFMy9cdTVGMzlcdTdBOTdcdTYyNTNcdTVGMDBcdUZGMDh3aW5kb3ctb3Blblx1RkYwOVx1MzAwMVxuICAgIC8vIFx1NUUwM1x1NUM0MC9cdTZEM0JcdTUyQThcdTUzRjZcdTVCNTBcdTUzRDhcdTUzMTZcdUZGMDhhY3RpdmUtbGVhZi1jaGFuZ2VcdUZGMDlcdTkwRkRcdTUyMzdcdTRFMDBcdTZCMjEgXHUyMDE0XHUyMDE0IFx1ODk4Nlx1NzZENiB3aW5kb3cgZm9jdXNcbiAgICAvLyBcdTRFMERcdTZEM0VcdTUzRDFcdTc2ODRcdTU3M0FcdTY2NkZcdUZGMUJcdTk2MzJcdTYyOTZcdTUxNzFcdTc1MjhcdTRFMDBcdTRFMkEgdGltZXJcdUZGMENcdTRFOTJcdTRFMERcdTVFNzJcdTYyNzBcdTMwMDJcdTRFOEJcdTRFRjZcdTcyNDhcdTY3MkNcdTk1RThcdTY5REJcdUZGMUFcbiAgICAvLyBhY3RpdmUtbGVhZi1jaGFuZ2UvZmlsZS1vcGVuIDAuMTAuOStcdUZGMEN3aW5kb3ctb3BlbiAwLjE1LjMrXHVGRjBDXHU1NzQ3IFx1MjI2NCBtaW5BcHBWZXJzaW9uXHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignYWN0aXZlLWxlYWYtY2hhbmdlJywgKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCkpKVxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2ZpbGUtb3BlbicsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKCd3aW5kb3ctb3BlbicsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignYm90JywgJ0RTSCBEb2NrXHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJywgKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLXBhbmVsJyxcbiAgICAgIG5hbWU6ICdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3RicsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RhcnQtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTU0MkZcdTUyQTggRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0YXJ0KCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdG9wLWRzaCcsXG4gICAgICBuYW1lOiAnXHU1MDVDXHU2QjYyIERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdG9wKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1icm93c2VyJyxcbiAgICAgIG5hbWU6ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAgRFNIJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlbkluQnJvd3NlcigpLFxuICAgIH0pXG5cbiAgICAvLyBENlx1RkYxQVx1NkNFOFx1NTE4QyBvYnNpZGlhbjovL2RzaC1kb2NrIFx1NTM0Rlx1OEJBRVx1NTE2NVx1NTNFM1x1RkYwOFBsdWdpbi5yZWdpc3Rlck9ic2lkaWFuUHJvdG9jb2xIYW5kbGVyLFxuICAgIC8vIG9ic2lkaWFuLmQudHM6NTAyOFx1RkYwOVx1MzAwMkRTSCBXZWIgXHU0RkE3L1x1NTkxNlx1OTBFOFx1ODFFQVx1NTJBOFx1NTMxNlx1NTNFRlx1NzUyOFxuICAgIC8vIGBvYnNpZGlhbjovL2RzaC1kb2NrP2FjdGlvbj1vcGVuYCBcdTRFMDBcdTk1MkVcdTU1MjRcdThENzdcdTk3NjJcdTY3N0YgXHUyMDE0XHUyMDE0IFx1OTE0RFx1NTQwOFx1NTRDMVx1NzI0Q1x1NjgyMVx1OUE4Q1x1RkYwQ1xuICAgIC8vIFx1MzAwQ1x1NEVDRVx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTZERVx1NTIzMCBPYnNpZGlhblx1MzAwRFx1OTVFRFx1NzNBRlx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJPYnNpZGlhblByb3RvY29sSGFuZGxlcignZHNoLWRvY2snLCAoZGF0YSkgPT4ge1xuICAgICAgaWYgKGRhdGEuYWN0aW9uID09PSAnb3BlbicpIHZvaWQgdGhpcy5vcGVuUGFuZWwoKVxuICAgIH0pXG5cbiAgICAvLyBEN1x1RkYxQVx1OTAwMFx1NTFGQVx1NTI0RCBmbHVzaFx1MzAwMmB3b3Jrc3BhY2Uub24oJ3F1aXQnKWBcdUZGMDgwLjEwLjIrXHVGRjBDT2JzaWRpYW4gXHU1QzNEXHU1MjlCXHU4QzAzXHU3NTI4XHVGRjBDXG4gICAgLy8gXHU0RTBEXHU0RkREXHU4QkMxXHU2MjY3XHU4ODRDXHVGRjA5XHU5MUNDIGF3YWl0IFx1NTA1Q1x1NjcwRFx1NTJBMSArIFx1ODQzRFx1NzZEOFx1NjgwN1x1OEJCMFx1RkYwQ1x1ODg2NVx1NEUwQSBvbnVubG9hZCBcdTkxQ0NcbiAgICAvLyBgdm9pZCB0aGlzLnN0b3AoKWAgXHU0RTBEXHU3QjQ5XHU3RUQzXHU2NzlDXHU3Njg0XHU3RjNBXHU1M0UzXHVGRjA4XHU1RjNBXHU5MDAwXHU2NUY2IFBJRCBcdTY1ODdcdTRFRjYvXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1M0VGXHU4MEZEXHU2Q0ExXHU4NDNEXHU3NkQ4XHVGRjA5XHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdxdWl0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3AoKVxuICAgICAgICB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgICAgfSksXG4gICAgKVxuXG4gICAgdGhpcy5zdGF0dXNCYXJFbCA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRHNoRG9ja1NldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSlcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9zdGFydCkge1xuICAgICAgdm9pZCB0aGlzLnN0YXJ0KClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB2b2lkIHRoaXMuc3RvcCgpXG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2xlYXIoKVxuICB9XG5cbiAgLyoqXG4gICAqIEQ3XHVGRjFBXHU5OTk2XHU2QjIxXCJcdTc1MjhcdTYyMzdcdTYyNEJcdTUyQThcdTU0MkZcdTc1MjhcIlx1NjVGNlx1NTNFQVx1OEREMVx1NEUwMFx1NkIyMVx1NzY4NFx1OTRBOVx1NUI1MFx1RkYwOFBsdWdpbi5vblVzZXJFbmFibGUsXG4gICAqIG9ic2lkaWFuLmQudHM6NTA3M1x1RkYwQ09ic2lkaWFuIDEuNy4yKyBcdThDMDNcdTc1MjhcdUZGMUJcdTY1RTdcdTcyNDhcdTY3MkNcdTVGRkRcdTc1NjVcdThCRTVcdTk0QTlcdTVCNTBcdUZGMENcdTYzRDJcdTRFRjZcdTcxNjdcdTVFMzhcdTVERTVcdTRGNUNcdUZGMENcbiAgICogXHU1NkUwXHU2QjY0XHU2NUUwXHU5NzAwXHU2MkFDIG1pbkFwcFZlcnNpb25cdUZGMDlcdTMwMDJcdTUzRUFcdTUwNUFcdTVGMTVcdTVCRkNcdTYzRDBcdTc5M0FcdUZGMENcdTRFMERcdTUwNUFcdTRFRkJcdTRGNTVcdTUyMURcdTU5Q0JcdTUzMTZcdTMwMDJcbiAgICovXG4gIG92ZXJyaWRlIG9uVXNlckVuYWJsZSgpOiB2b2lkIHtcbiAgICBuZXcgTm90aWNlKCdEU0ggRG9jayBcdTVERjJcdTU0MkZcdTc1MjhcdUZGMUFcdTcwQjlcdTUxRkJcdTVERTZcdTRGQTdcdTY4MEZcdTY3M0FcdTU2NjhcdTRFQkFcdTU2RkVcdTY4MDdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1RkYwQ1x1NjIxNlx1NjI2N1x1ODg0QyBvYnNpZGlhbjovL2RzaC1kb2NrP2FjdGlvbj1vcGVuJylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDlcdTMwMDJEMVx1RkYxQWluc3RhbmNlb2YgXHU1M0Q2XHU0RUUzXHU1RjNBXHU4RjZDXHVGRjBDXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4ICovXG4gIHByaXZhdGUgdmF1bHRSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXJcbiAgICByZXR1cm4gYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyID8gYWRhcHRlci5nZXRCYXNlUGF0aCgpIDogdW5kZWZpbmVkXG4gIH1cblxuICBvblN0YXR1c0NoYW5nZShmbjogKCkgPT4gdm9pZCk6ICgpID0+IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmFkZChmbilcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zdGF0dXNMaXN0ZW5lcnMuZGVsZXRlKGZuKVxuICB9XG5cbiAgcHJpdmF0ZSBzZXRTdGF0dXMoc3RhdHVzOiBTZXJ2ZXJTdGF0dXMpOiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1cyA9IHN0YXR1c1xuICAgIHRoaXMucmVuZGVyU3RhdHVzQmFyKClcbiAgICBmb3IgKGNvbnN0IGZuIG9mIHRoaXMuc3RhdHVzTGlzdGVuZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmbigpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGF0dXNCYXIoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnN0YXR1c0JhckVsKSByZXR1cm5cbiAgICBjb25zdCBzID0gdGhpcy5zdGF0dXNcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dChgRFNIOiAke3MucG9ydH0ke3MuYXR0YWNoZWQgPyAnXHVGRjA4XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjA5JyA6ICcnfWApXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjYnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NjcyQVx1OEZEMFx1ODg0QycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXG5cbiAgLyoqIFx1OEJGQlx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1NTQyQlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYwOVx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLm1hcmtlclRpbWVyKVxuICAgIHRoaXMubWFya2VyVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgsIGluZm8uYWN0aXZlRmlsZSlcbiAgICB9LCAzMDApXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG5cbiAgLyoqIFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMSBcdTIxOTIgXHU2MzAyXHU2M0E1XHVGRjFCXHU1NDI2XHU1MjE5IHNwYXduIFx1NUI5OFx1NjVCOSBkc2ggd2ViICovXG4gIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XG4gICAgaWYgKHRoaXMuc3RhcnRpbmcpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIGlmICh0aGlzLnN0YXR1cy5raW5kID09PSAncnVubmluZycpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIHRoaXMuc3RhcnRpbmcgPSB0cnVlXG4gICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RhcnRpbmcnIH0pXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhdWx0Um9vdCA9IHRoaXMudmF1bHRSb290KClcbiAgICAgIGNvbnN0IGRzaEhvbWUgPSBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCBwb3J0ID0gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3Qgc2hhcmVkQ29uZmlnUm9vdCA9IGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHZhdWx0SW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICAvLyBcdTVCNjRcdTUxM0ZcdTZFMDVcdTYyNkJcdUZGMUFcdTRFMEFcdTZCMjEgT2JzaWRpYW4gXHU1RDI5XHU2RTgzL1x1NUYzQVx1OTAwMFx1NkI4Qlx1NzU1OVx1NzY4NFx1NjcyQ1x1N0FFRlx1NTNFMyBkc2ggd2ViIFx1NTE0OFx1NkUwNVx1NjM4OVx1NTE4RFx1NjJDOVx1OEQ3N1x1RkYwQ1xuICAgICAgLy8gXHU5MDdGXHU1MTREXCJcdTYzMDJcdTYzQTVcdTVCNjRcdTUxM0ZcIlx1OEJBOVx1NkI4Qlx1NzU1OVx1NkMzOFx1NEU0NVx1N0QyRlx1NzlFRlx1RkYwOFx1NTkxQVx1NUU5My9cdTU5MUFcdTdBOTdcdTUzRTNcdTVFNzZcdTUzRDFcdTVCODlcdTUxNjhcdUZGMENcdTg5QzEgbGF1bmNoZXIudHNcdUZGMDlcdTMwMDJcbiAgICAgIGNvbnN0IHN3ZXB0ID0gYXdhaXQgc3dlZXBPcnBoYW5Ec2goZHNoSG9tZSwgcG9ydClcbiAgICAgIGlmIChzd2VwdCkge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0g6IFx1NURGMlx1NkUwNVx1NzQwNlx1NEUwQVx1NkIyMVx1NkI4Qlx1NzU1OVx1NzY4NFx1NjcwRFx1NTJBMSAoXHU3QUVGXHU1M0UzICR7cG9ydH0pYClcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGVuc3VyZURzaFJ1bm5pbmcoe1xuICAgICAgICBkc2hCaW46IHRoaXMuc2V0dGluZ3MuZHNoQmluLFxuICAgICAgICBub2RlQmluOiB0aGlzLnNldHRpbmdzLm5vZGVCaW4sXG4gICAgICAgIHBvcnQsXG4gICAgICAgIGhvc3Q6IHRoaXMuc2V0dGluZ3MuaG9zdCxcbiAgICAgICAgZHNoSG9tZSxcbiAgICAgICAgLy8gcGVyLXZhdWx0IFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYxQVx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwQ1x1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1MzAwMlxuICAgICAgICAuLi4oc2hhcmVkQ29uZmlnUm9vdCA/IHsgc2hhcmVkQ29uZmlnUm9vdCB9IDoge30pLFxuICAgICAgICB1c2VFbWJlZGRlZE5vZGU6IHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlLFxuICAgICAgICAvLyBEM1x1RkYxQVx1N0FFRlx1NTNFM1x1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1NjVGNlx1NTA1QVx1NTRDMVx1NzI0Q1x1NzI3OVx1NUY4MVx1NjgyMVx1OUE4QyBcdTIwMTRcdTIwMTQgXHU2NjJGIGRzaCB3ZWIgXHU2MjREXHU2MzAyXHU2M0E1XHVGRjBDXHU1NDI2XHU1MjE5XHU2MzA5XG4gICAgICAgIC8vIFx1MzAwQ1x1N0FFRlx1NTNFM1x1ODhBQlx1OTc1RSBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHUzMDBEXHU2MkE1XHU5NTE5XHVGRjBDXHU2MjhBXCJcdThCRUZcdTYzMDJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVwiXHU0RUNFXHU1MDc2XHU1M0QxXHU1M0Q4XHU2MjEwXHU0RTBEXHU1M0VGXHU4MEZEXHUzMDAyXG4gICAgICAgIC8vIHJlcXVlc3RVcmwgXHU2NjJGIE9ic2lkaWFuIFx1NUI5OFx1NjVCOSBDU1AgXHU4QzQxXHU1MTREXHU3Njg0IEhUVFAgXHU1MkE5XHU2MjRCXHVGRjA4b2JzaWRpYW4uZC50czo1NDQyXHVGRjA5XHVGRjBDXG4gICAgICAgIC8vIFJlcXVlc3RVcmxQYXJhbSBcdTZDQTFcdTY3MDkgdGltZW91dCBcdTVCNTdcdTZCQjVcdUZGMENcdTYyNDBcdTRFRTUgMS41cyBcdTVGRUJcdTkwMUZcdTVCNThcdTZEM0JcdTYzQTJcdTZENEJcdTRFQ0RcdThENzBcbiAgICAgICAgLy8gbm9kZTpodHRwXHVGRjA4bGF1bmNoZXIudHMgaXNQb3J0VXBcdUZGMDlcdUZGMENcdThGRDlcdTkxQ0NcdTUzRUFcdTUwNUFcdTYxNjJcdTkwMUZcdTU0Q0RcdTVFOTRcdTRGNTNcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcdTMwMDJcbiAgICAgICAgdmVyaWZ5QnJhbmQ6ICh1cmwpID0+IHRoaXMudmVyaWZ5RHNoQnJhbmQodXJsKSxcbiAgICAgICAgLy8gcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1RkYxQVx1NkNFOFx1NTE2NVx1NjcyQ1x1NjcwRFx1NTJBMVx1NjI0MFx1NUM1RVx1NUU5MyBlbnZcdUZGMDhcdTdCMkNcdTRFOENcdTkwMUFcdTkwNTNcdUZGMDlcdTMwMDJcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjZcdTg5RTNcdTY3OTBcdTY1RjZcbiAgICAgICAgLy8gXHU0RjE4XHU1MTQ4XHU3NTI4XHU2NzJDIGVudiBcdThCQzZcdTUyMkJcIlx1NjcyQ1x1NjcwRFx1NTJBMVx1NjcwRFx1NTJBMVx1NzY4NFx1NUU5M1wiXHVGRjBDY3dkIFx1NEZERFx1NjMwMSBkc2ggXHU4RkRCXHU3QTBCXHU5RUQ4XHU4QkE0XHU1REU1XHU0RjVDXHU3NkVFXHU1RjU1XG4gICAgICAgIC8vIFx1NEUwRFx1NTNEOCBcdTIwMTRcdTIwMTQgY3dkIFx1NEUwRSBPYnNpZGlhbiBcdTVFOTNcdTY2MkZcdTRFMjRcdTRFMkFcdTcyRUNcdTdBQ0JcdTY5ODJcdTVGRjVcdUZGMENcdTRFMERcdTU0MDhcdTVFNzZcdTMwMDJcbiAgICAgICAgZW52OiBzaGFyZWRDb25maWdSb290ICYmIHZhdWx0SW5mb1xuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfTkFNRTogdmF1bHRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgIERTSF9PQlNJRElBTl9WQVVMVF9QQVRIOiB2YXVsdEluZm8ucGF0aCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9LFxuICAgICAgfSlcbiAgICAgIHRoaXMucHJvYyA9IHJlc3VsdC5wcm9jID8/IG51bGxcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiByZXN1bHQucHJvYyAmJiAhcmVzdWx0LnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAvLyBcdTY1QjBcdThENzdcdThGREJcdTdBMEJcdUZGMUFcdTUxOTlcdTUxNjUgUElEIFx1NjU4N1x1NEVGNlx1RkYwQ1x1NEY5Qlx1NEUwQlx1NkIyMVx1NTQyRlx1NTJBOFx1NkUwNVx1NjI2Qlx1NUI2NFx1NTEzRlx1NjVGNlx1OEJDNlx1NTIyQlx1NUY1Mlx1NUM1RVx1MzAwMlxuICAgICAgICBpZiAocmVzdWx0LnByb2MucGlkICE9IG51bGwpIHtcbiAgICAgICAgICB3cml0ZURzaFBpZEZpbGUoZHNoSG9tZSwgcG9ydCwgcmVzdWx0LnByb2MucGlkKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaG9va0NoaWxkTG9ncyhyZXN1bHQucHJvYylcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U3RhdHVzKHJlc3VsdC5zdGF0dXMpXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7cmVzdWx0LnN0YXR1cy5tZXNzYWdlfWApXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICFyZXN1bHQuc3RhdHVzLmF0dGFjaGVkKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBXZWIgXHU1REYyXHU1QzMxXHU3RUVBOiAke3Jlc3VsdC5zdGF0dXMudXJsfWApXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbXNnIH0pXG4gICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1RjAyXHU1RTM4OiAke21zZ31gKVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzXG4gIH1cblxuICBhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIGlmICh0aGlzLnByb2MpIHtcbiAgICAgIGF3YWl0IHN0b3BQcm9jZXNzKHRoaXMucHJvYylcbiAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICB9XG4gICAgcmVtb3ZlRHNoUGlkRmlsZShjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKSlcbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEQzXHVGRjFBXHU1NEMxXHU3MjRDXHU3Mjc5XHU1RjgxXHU2ODIxXHU5QThDIFx1MjAxNFx1MjAxNCBHRVQgXHU2NzBEXHU1MkExXHU2ODM5XHU4REVGXHU1Rjg0XHVGRjBDXHU1NENEXHU1RTk0XHU0RjUzXHU1NDJCIFwiRGVlcFNlZWsgSGFybmVzc1wiXG4gICAqIFx1RkYwOFx1NUI5OFx1NjVCOSBkc2ggd2ViIFx1NTI0RFx1N0FFRiBpbmRleC5odG1sIFx1NzY4NCA8dGl0bGU+XHVGRjA5XHU2MjREXHU4QkE0XHU1QjlBXHU2NjJGIGRzaCB3ZWJcdTMwMDJcbiAgICogcmVxdWVzdFVybCBcdTY2MkZcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTkxQ0MgQ1NQIFx1OEM0MVx1NTE0RFx1NzY4NFx1NUI5OFx1NjVCOSBIVFRQIFx1NTJBOVx1NjI0Qlx1RkYwOG9ic2lkaWFuLmQudHM6NTQ0Mlx1RkYwOVx1RkYxQlxuICAgKiB0aHJvdzogZmFsc2UgXHU4QkE5IDR4eC81eHggXHU0RTVGXHU4RDcwXHU2QjYzXHU1RTM4XHU4RkQ0XHU1NkRFXHU4REVGXHU1Rjg0XHVGRjBDXHU3RURGXHU0RTAwXHU2MzA5XHU3Mjc5XHU1RjgxXHU1MjI0XHU2NUFEXHUzMDAyXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHZlcmlmeURzaEJyYW5kKHVybDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCByZXF1ZXN0VXJsKHsgdXJsLCBtZXRob2Q6ICdHRVQnLCB0aHJvdzogZmFsc2UgfSlcbiAgICAgIHJldHVybiByZXNwLnN0YXR1cyA9PT0gMjAwICYmIHJlc3AudGV4dC5pbmNsdWRlcygnRGVlcFNlZWsgSGFybmVzcycpXG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGhvb2tDaGlsZExvZ3MocHJvYzogQ2hpbGRQcm9jZXNzKTogdm9pZCB7XG4gICAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS53YXJuKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Mub25jZSgnZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIGlmICh0aGlzLnByb2MgPT09IHByb2MpIHtcbiAgICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgICAgICByZW1vdmVEc2hQaWRGaWxlKGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpKVxuICAgICAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICF0aGlzLnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYERTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkE6IGNvZGU9JHtjb2RlfSBzaWduYWw9JHtzaWduYWwgPz8gJyd9YCB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW2RzaC1kb2NrXSBcdTVCNTBcdThGREJcdTdBMEJcdTk1MTlcdThCRUYnLCBlcnIpXG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBgXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGOiAke2Vyci5tZXNzYWdlfWAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqIFx1NjNBMlx1NkQ0Qlx1NEZFMVx1NjA2Rlx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBkZXRlY3RJbmZvKCk6IHsgZHNoQmluOiBzdHJpbmcgfCBudWxsOyBkc2hOb3Rlczogc3RyaW5nW107IG5vZGVOb3Rlczogc3RyaW5nW10gfSB7XG4gICAgY29uc3QgZm91bmQgPSByZXNvbHZlRHNoQmluKHRoaXMuc2V0dGluZ3MuZHNoQmluKVxuICAgIGNvbnN0IG5vZGUgPSByZXNvbHZlTm9kZUJpbih0aGlzLnNldHRpbmdzLm5vZGVCaW4sIGVtYmVkZGVkTm9kZVZlcnNpb24oKSwgdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpXG4gICAgcmV0dXJuIHtcbiAgICAgIGRzaEJpbjogZm91bmQuYmluLFxuICAgICAgZHNoTm90ZXM6IGZvdW5kLm5vdGVzLFxuICAgICAgbm9kZU5vdGVzOiBub2RlLm5vdGVzLFxuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZWZmZWN0aXZlRHNoSG9tZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKVxuICB9XG5cbiAgLyoqIFx1NUY1M1x1NTI0RFx1OEJCRVx1N0Y2RVx1NEUwQlx1NzUxRlx1NjU0OFx1NzY4NFx1N0FFRlx1NTNFM1x1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTZCQ0YgdmF1bHQgXHU3MkVDXHU3QUNCXHVGRjA5ICovXG4gIGVmZmVjdGl2ZVBvcnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gfi8uZHNoXHVGRjBDXHU1MTc2XHU0RjU5XHU2NUUwXHVGRjA5ICovXG4gIGVmZmVjdGl2ZVNoYXJlZENvbmZpZ1Jvb3QoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gY29tcHV0ZVNoYXJlZENvbmZpZ1Jvb3QodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSAoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSBhcyBQYXJ0aWFsPERzaERvY2tTZXR0aW5ncz4gfCBudWxsXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGRhdGEgPz8ge30pXG4gICAgLy8gXHU2NUU3XHU3MjQ4XHVGRjA4ZHNoLWhvc3QgVjAuMVx1RkYwOVx1OEJCRVx1N0Y2RVx1OEZDMVx1NzlGQlx1RkYxQWRzaEhvbWUgXHU1QjU3XHU3QjI2XHU0RTMyIFx1MjE5MiBjdXN0b20gXHU2QTIxXHU1RjBGXG4gICAgY29uc3QgbGVnYWN5OiB7IGRzaEhvbWU/OiBzdHJpbmcgfSB8IG51bGwgPSBkYXRhXG4gICAgaWYgKGxlZ2FjeT8uZHNoSG9tZSAmJiB0eXBlb2YgbGVnYWN5LmRzaEhvbWUgPT09ICdzdHJpbmcnICYmIGxlZ2FjeS5kc2hIb21lLnRyaW0oKSkge1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lTW9kZSA9ICdjdXN0b20nXG4gICAgICB0aGlzLnNldHRpbmdzLmRzaEhvbWUgPSBsZWdhY3kuZHNoSG9tZS50cmltKClcbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFVJXG5cbiAgYXN5bmMgb3BlblBhbmVsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcFxuICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRFNIX1dFQl9WSUVXX1RZUEUpXG4gICAgbGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCBudWxsID0gbGVhdmVzWzBdID8/IG51bGxcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIC8vIEQ4XHVGRjFBZ2V0UmlnaHRMZWFmKGZhbHNlKSBcdTU3MjggMS4xMy54IFx1NzY4NCBkLnRzIFx1NEUwRVx1NUI5OFx1NjVCOSBkb2NzIFx1NEUyRFx1NTc0N1x1NjVFMFxuICAgICAgLy8gQGRlcHJlY2F0ZWQgXHU2ODA3XHU4QkIwXHVGRjA4XHU2OEMwXHU2RDRCXHU2MkE1XHU1NDRBIFx1MDBBNzUuMVx1RkYwOVx1RkYwQ1x1OEJFRFx1NEU0OVx1NTM3M1wiXHU1M0YzXHU0RkE3XHU2ODBGXHU1M0Y2XHU1QjUwXCJcdUZGMENcdTUzRUZcdTdFRTdcdTdFRURcdTc1MjhcdUZGMUJcbiAgICAgIC8vIGVuc3VyZVNpZGVMZWFmIFx1OTcwMCBPYnNpZGlhbiAxLjcuMitcdUZGMENcdTgwMEMgbWluQXBwVmVyc2lvbiBcdTRGRERcdTYzMDEgMS41LjBcdUZGMENcbiAgICAgIC8vIFx1NEUwRFx1NUYxNVx1NTE2NVx1OTg5RFx1NTkxNlx1NzI0OFx1NjcyQ1x1OTVFOFx1NjlEQlx1MzAwMlxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpXG4gICAgICBpZiAoIWxlYWYpIHJldHVyblxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfVxuICAgIHdvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGxlYWYpXG4gIH1cblxuICBhc3luYyBvcGVuSW5Ccm93c2VyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHNoZWxsLm9wZW5FeHRlcm5hbCh0aGlzLmJhc2VVcmwpXG4gIH1cblxuICAvKipcbiAgICogXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4T2JzaWRpYW4gcG9wb3V0XHVGRjA5XHVGRjFBRFNIIFx1OTc2Mlx1Njc3Rlx1OEZEQlx1NTE2NVx1NzJFQ1x1N0FDQiBCcm93c2VyV2luZG93ID1cbiAgICogXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU0RTBFIE9ic2lkaWFuIFx1NEUzQlx1N0E5N1x1NTNFM1x1OTY5NFx1NzlCQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1NjgwN1x1N0I3RVx1OTg3NVx1MzAwMlxuICAgKi9cbiAgYXN5bmMgb3BlblBvcG91dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5vcGVuUG9wb3V0TGVhZigpXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgbmV3IE5vdGljZShgXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHU1OTMxXHU4RDI1OiAke21zZ31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogbGF1bmNoZXIudHMgXHUyMDE0XHUyMDE0IFx1N0VBRlx1NTQyRlx1NTJBOFx1OTAzQlx1OEY5MVx1RkYwOFx1OTZGNiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMENcdTUzRUZcdTcyRUNcdTdBQ0JcdTUxOTJcdTcwREZcdTZENEJcdThCRDVcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTgwNENcdThEMjNcdUZGMUFcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2IFx1MjE5MiBzcGF3biBgZHNoIHdlYmBcbiAqIFx1RkYwODEyNy4wLjAuMTo8cG9ydD5cdUZGMDlcdTIxOTIgXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBIFx1MjE5MiBcdTUwNUNcdTZCNjJcdTMwMDJcbiAqXG4gKiBcdTUxNzNcdTk1MkVcdTRFOEJcdTVCOUVcdUZGMDhcdTVERjJcdTU3MjhcdTVCOThcdTY1QjkgQGRlZXBzZWVrLWFpL2RzaEAwLjEuMC1yYy42IFx1NEUwQVx1OUE4Q1x1OEJDMVx1RkYwOVx1RkYxQVxuICogLSBgbm9kZSA8ZHNoPi9saWIvYmluLmpzIHdlYiAtLWhvc3QgMTI3LjAuMC4xIC0tcG9ydCA8cG9ydD5gIFx1NTM3M1x1NUI5OFx1NjVCOSBXZWIgVUlcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0IGhvc3Q9MTI3LjAuMC4xXHUzMDAxcG9ydD0zMDgwXHVGRjA4XHU1M0VGXHU4OTg2XHU3NkQ2XHVGRjA5XHVGRjFCXG4gKiAtIFx1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1ODFFQVx1NTJBOFx1NTIxRFx1NTlDQlx1NTMxNiAkRFNIX0hPTUUvcHJvZmlsZXMvd2ViXHVGRjA4YnVuZGxlcyA9IGRzaC1iYXNlICsgZHNoLXdlYi1hcHBcdUZGMDlcdUZGMENcbiAqICAgXHU2QTIxXHU1NzU3XHU4OUUzXHU2NzkwXHU4RDcwICREU0hfSE9NRS9wcm9maWxlcy9ub2RlX21vZHVsZXMgXHU1RTczXHU5NzYyXHU3QjI2XHU1M0Y3XHU5NEZFXHU2M0E1XHVGRjBDXHU2NUUwXHU5NzAwIHBucG0vXHU4MDU0XHU3RjUxXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNFx1OTE0RFx1N0Y2RVx1NEUwQiBTUUxpdGVcdUZGMDhub2RlOnNxbGl0ZVx1RkYwQ1x1OTcwMCBOb2RlIFx1MjI2NTIyLjVcdUZGMDlcdTRFMERcdTRGMUFcdTYyNTNcdTVGMDBcdUZGMDhvcGVuQXQ6IG5ldmVyXHVGRjA5XHVGRjBDXG4gKiAgIFx1NTZFMFx1NkI2NCBOb2RlIDIwKyBcdTRFNUZcdTgwRkRcdThERDFcdTlFRDhcdThCQTQgd2ViIHByb2ZpbGVcdUZGMUJcdTU0MkZcdTc1MjhcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTY1RjZcdTYyNERcdTk3MDBcdTg5ODEgTm9kZSBcdTIyNjUyMi41XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgc3Bhd24sIHNwYXduU3luYywgdHlwZSBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IERTSF9SRUxBVElWRV9CSU4gPSBwYXRoLmpvaW4oJ0BkZWVwc2Vlay1haScsICdkc2gnLCAnbGliJywgJ2Jpbi5qcycpXG5cbi8qKiBOb2RlIFx1NEUzQlx1NzI0OFx1NjcyQ1x1NTNGN1x1NkJENFx1OEY4M1x1RkYxQW5vZGU6c3FsaXRlIFx1OTcwMFx1ODk4MSBcdTIyNjUyMi41XHVGRjA4XHU0RUM1XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU1MjlGXHU4MEZEXHU3NTI4XHU1MjMwXHVGRjA5ICovXG5leHBvcnQgY29uc3QgTk9ERV9TUUxJVEVfTUlOX01BSk9SID0gMjJcblxuLyoqIFx1N0EzM1x1NUI5QVx1NzdFRFx1NTRDOFx1NUUwQ1x1RkYwOGRqYjJcdUZGMDlcdUZGMENcdTc1MjhcdTRFOEUgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHU2RDg4XHU2QjY3XHVGRjBDXHU5MDdGXHU1MTREXHU0RTJEXHU2NTg3XHU1NDBEXHU2RTA1XHU2RDE3XHU3OEIwXHU2NDlFICovXG5leHBvcnQgZnVuY3Rpb24gc3RhYmxlSGFzaChpbnB1dDogc3RyaW5nLCBsZW4gPSA2KTogc3RyaW5nIHtcbiAgbGV0IGggPSA1MzgxXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIGggPSAoKGggPDwgNSkgKyBoICsgaW5wdXQuY2hhckNvZGVBdChpKSkgPj4+IDBcbiAgcmV0dXJuIGgudG9TdHJpbmcoMzYpLnBhZFN0YXJ0KGxlbiwgJzAnKS5zbGljZSgwLCBsZW4pXG59XG5cbi8qKiBcdTUzRUZcdThCRkJcdTc2ODQgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHVGRjA4XHU0RkREXHU3NTU5IFVuaWNvZGUgXHU1QjU3XHU2QkNEXHU2NTcwXHU1QjU3XHVGRjBDXHU1MTc2XHU0RjU5XHU4RjZDIC1cdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTkgJ3ZhdWx0JyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVWYXVsdE5hbWUodmF1bHRSb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjbGVhbmVkID0gcGF0aFxuICAgIC5iYXNlbmFtZSh2YXVsdFJvb3QpXG4gICAgLnJlcGxhY2UoL1teXFxwe0x9XFxwe059Xy1dKy9ndSwgJy0nKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csICcnKVxuICByZXR1cm4gKGNsZWFuZWQgfHwgJ3ZhdWx0Jykuc2xpY2UoMCwgNDApXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF1bmNoT3B0aW9ucyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMENcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW4/OiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5ICovXG4gIG5vZGVCaW4/OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ/OiBudW1iZXJcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0IDEyNy4wLjAuMVx1RkYwQ1x1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0Pzogc3RyaW5nXG4gIC8qKiAkRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCREQvXHU1QkM2XHU5NEE1L1x1NkEyMVx1NTc4Qlx1OTE0RFx1N0Y2RVx1NjgzOVx1NzZFRVx1NUY1NVx1RkYxQlx1OUVEOFx1OEJBNCA8dmF1bHQ+Ly5kc2hcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKlxuICAgKiBcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0IGB+Ly5kc2hgXHVGRjA5XHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTdCNDlcdTkxNERcdTdGNkVcdTdDN0JcdTY1ODdcdTRFRjZcbiAgICogXHU2MzA3XHU1NDExXHU2QjY0XHU3NkVFXHU1RjU1XHVGRjBDXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NEUwMFx1NEVGRFx1RkYxQnNlc3Npb25zIFx1N0I0OVx1NjU3MFx1NjM2RVx1NEVDRFx1NTcyOCBgZHNoSG9tZWAgXHU5Njk0XHU3OUJCXHUzMDAyXG4gICAqIFx1NzU1OVx1N0E3QSA9IFx1NEUwRFx1NTQyRlx1NzUyOFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwOGRzaEhvbWUgXHU4MUVBXHU4RUFCXHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA5XHUzMDAyXG4gICAqL1xuICBzaGFyZWRDb25maWdSb290Pzogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZT86IGJvb2xlYW5cbiAgLyoqIFx1NUMzMVx1N0VFQVx1N0I0OVx1NUY4NVx1NEUwQVx1OTY1MFx1RkYwOFx1OUVEOFx1OEJBNCAxMjBzXHVGRjA5ICovXG4gIHRpbWVvdXRNcz86IG51bWJlclxuICAvKiogXHU5NjQ0XHU1MkEwXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGICovXG4gIGVudj86IE5vZGVKUy5Qcm9jZXNzRW52XG4gIC8qKlxuICAgKiBcdTVCNTBcdThGREJcdTdBMEJcdTVERTVcdTRGNUNcdTc2RUVcdTVGNTVcdTMwMDJwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RjIwIHZhdWx0IFx1NjgzOVx1RkYxQVx1NjVCMFx1NUVGQVx1NEYxQVx1OEJERFx1NzY4NCBjd2QgXHU1MzczXHU2NzJDXHU1RTkzXHU2ODM5XHVGRjBDXG4gICAqIHZhdWx0IFx1NURFNVx1NTE3N1x1ODlFM1x1Njc5MFx1OTg3QVx1NUU4Rlx1N0IyQyAzIFx1NEY0RFx1RkYwOFx1NEYxQVx1OEJERCBjd2QgXHU4MkU1XHU2NjJGXHU1RTkzXHVGRjA5XHU3NkY0XHU2M0E1XHU1NDdEXHU0RTJEIFx1MjAxNFx1MjAxNCBcdTU3MjhcdTc1MUZcdTcyNjlcdTU5MDdcdThCRkVcdTc2ODRcbiAgICogXHU2NzBEXHU1MkExXHU5MUNDXHU2M0QwXHU5NUVFXHU3RUREXHU0RTBEXHU0RjFBXHU4OUUzXHU2NzkwXHU2MjEwXHU3NTFGXHU3MjY5XHU5ODk4XHU1RTkzXHUzMDAyc2hhcmVkIFx1NkEyMVx1NUYwRlx1NEUwRFx1NEYyMFx1RkYwOFx1NjI0MFx1NjcwOVx1NUU5M1x1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQVx1NjcwRFx1NTJBMVx1RkYwQ1xuICAgKiBcdTk3NjBcdTcxMjZcdTcwQjlcdTY4MDdcdThCQjBcdThEREZcdTk2OEZcdUZGMDlcdTMwMDJcbiAgICovXG4gIGN3ZD86IHN0cmluZ1xuICAvKipcbiAgICogXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHU2NUY2XHU3Njg0XCJcdTU0QzFcdTcyNENcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcIlx1RkYwOFx1NzUzMVx1NjNEMlx1NEVGNlx1NEZBN1x1NkNFOFx1NTE2NVx1RkYwQ2xhdW5jaGVyIFx1NEZERFx1NjMwMVx1OTZGNlxuICAgKiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMDlcdUZGMUFcdThGRDRcdTU2REUgdHJ1ZSBcdTYyNERcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMUJcdThGRDRcdTU2REUgZmFsc2UgXHU2MzA5XHUzMDBDXHU3QUVGXHU1M0UzXHU4OEFCXHU5NzVFXG4gICAqIERTSCBcdTY3MERcdTUyQTFcdTUzNjBcdTc1MjhcdTMwMERcdTYyQTVcdTk1MTlcdUZGMENcdTkwN0ZcdTUxNERcdTYyOEFcdTUyMkJcdTc2ODRcdTY3MERcdTUyQTFcdThCRUZcdTVGNTNcdTYyMTAgZHNoIHdlYlx1MzAwMlx1NEUwRFx1NEYyMCA9IFx1OERGM1x1OEZDN1x1NjgyMVx1OUE4Q1xuICAgKiBcdUZGMDhcdTY1RTdcdTg4NENcdTRFM0FcdUZGMENcdTdBRUZcdTUzRTNcdTY3MDlcdTY3MERcdTUyQTFcdTUzNzNcdTYzMDJcdTYzQTVcdUZGMDlcdTMwMDJcbiAgICovXG4gIHZlcmlmeUJyYW5kPzogKHVybDogc3RyaW5nKSA9PiBQcm9taXNlPGJvb2xlYW4+XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWROb2RlIHtcbiAgLyoqIFx1NzUyOFx1NEU4RSBzcGF3biBcdTc2ODQgbm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU2MjhBIE9ic2lkaWFuIFx1NzY4NCBFbGVjdHJvbiBcdTRFOENcdThGREJcdTUyMzZcdTVGNTMgTm9kZSBcdTc1MjggKi9cbiAgdXNlRWxlY3Ryb25Bc05vZGU6IGJvb2xlYW5cbiAgLyoqIFx1OEJFNSBOb2RlIFx1NzY4NCBtYWpvciBcdTcyNDhcdTY3MkNcdUZGMDhcdTYzQTJcdTZENEJcdTU5MzFcdThEMjVcdTRFM0EgMFx1RkYwOSAqL1xuICBub2RlTWFqb3I6IG51bWJlclxuICAvKiogXHU2M0EyXHU2RDRCL1x1NTFCM1x1N0I1Nlx1OEJGNFx1NjYwRVx1RkYwOFx1NEY5Qlx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBub3Rlczogc3RyaW5nW11cbn1cblxuZXhwb3J0IHR5cGUgU2VydmVyU3RhdHVzID1cbiAgfCB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHwgeyBraW5kOiAnc3RhcnRpbmcnIH1cbiAgfCB7IGtpbmQ6ICdydW5uaW5nJzsgcG9ydDogbnVtYmVyOyBob3N0OiBzdHJpbmc7IHVybDogc3RyaW5nOyBhdHRhY2hlZDogYm9vbGVhbiB9XG4gIHwgeyBraW5kOiAnZXJyb3InOyBtZXNzYWdlOiBzdHJpbmcgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1OERFRlx1NUY4NFx1NUI5QVx1NEY0RFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTYyOEFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTUxNjVcdTUzRTNcdTg5QzRcdTgzMDNcdTUzMTZcdUZGMUFcdTYzMDdcdTU0MTEgYmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU5MEZEXHU2M0E1XHU1M0Q3ICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRHNoQmluKGlucHV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghaW5wdXQpIHJldHVybiBudWxsXG4gIGNvbnN0IHAgPSBpbnB1dC50cmltKClcbiAgaWYgKCFwKSByZXR1cm4gbnVsbFxuICBjb25zdCBleHBhbmRlZCA9IHAucmVwbGFjZSgvXn4oPz0kfFxcL3xcXFxcKS8sIG9zLmhvbWVkaXIoKSlcbiAgY29uc3QgYWJzID0gcGF0aC5pc0Fic29sdXRlKGV4cGFuZGVkKSA/IHBhdGgubm9ybWFsaXplKGV4cGFuZGVkKSA6IHBhdGgucmVzb2x2ZShleHBhbmRlZClcbiAgdHJ5IHtcbiAgICBjb25zdCBzdCA9IGZzLnN0YXRTeW5jKGFicylcbiAgICBpZiAoc3QuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKGFicywgJ2xpYicsICdiaW4uanMnKVxuICAgICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IG51bGxcbiAgICB9XG4gICAgaWYgKHN0LmlzRmlsZSgpKSByZXR1cm4gYWJzXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuLyoqIFx1NUUzOFx1ODlDMSBucG0gXHU1MTY4XHU1QzQwIG5vZGVfbW9kdWxlcyBcdTY4MzlcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxNb2R1bGVSb290cygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJvb3RzOiBzdHJpbmdbXSA9IFtdXG4gIGlmIChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpIHJvb3RzLnB1c2gocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKVxuICBjb25zdCBucG1Sb290ID0gc3Bhd25TeW5jKCducG0nLCBbJ3Jvb3QnLCAnLWcnXSwge1xuICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgdGltZW91dDogMTBfMDAwLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxuICBpZiAobnBtUm9vdC5zdGF0dXMgPT09IDAgJiYgbnBtUm9vdC5zdGRvdXQpIHtcbiAgICBjb25zdCBsaW5lID0gbnBtUm9vdC5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLylbMF1cbiAgICBpZiAobGluZSkgcm9vdHMucHVzaChsaW5lKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIHJvb3RzLnB1c2goJy9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICByb290cy5wdXNoKCcvdXNyL2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdsaWInLCAnbm9kZV9tb2R1bGVzJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIGNvbnN0IGFwcERhdGEgPSBwcm9jZXNzLmVudi5BUFBEQVRBXG4gICAgaWYgKGFwcERhdGEpIHJvb3RzLnB1c2gocGF0aC5qb2luKGFwcERhdGEsICducG0nLCAnbm9kZV9tb2R1bGVzJykpXG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXG4gIHJldHVybiBbLi4ubmV3IFNldChyb290cyldXG59XG5cbi8qKlxuICogXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1MTY1XHU1M0UzXHUzMDAyXHU0RjE4XHU1MTQ4XHU3RUE3XHVGRjFBXG4gKiAxLiBcdTY2M0VcdTVGMEZcdTRGMjBcdTUxNjVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdUZGMDlcdTIxOTIgMi4gXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIERTSF9CSU4gXHUyMTkyIDMuIG5wbSByb290IC1nIFx1MjE5MiA0LiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTY4MzlcdTMwMDJcbiAqIFx1NjcyQVx1NjI3RVx1NTIzMFx1NjVGNiBiaW4gXHU0RTNBIG51bGxcdUZGMENub3RlcyBcdThCRjRcdTY2MEVcdTUzOUZcdTU2RTBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEc2hCaW4oZXhwbGljaXQ/OiBzdHJpbmcpOiB7IGJpbjogc3RyaW5nIHwgbnVsbDsgbm90ZXM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IG5vcm1hbGl6ZURzaEJpbihleHBsaWNpdCA/PyBwcm9jZXNzLmVudi5EU0hfQklOKVxuICBpZiAoZXhwbGljaXRCaW4gJiYgZnMuZXhpc3RzU3luYyhleHBsaWNpdEJpbikpIHtcbiAgICByZXR1cm4geyBiaW46IGV4cGxpY2l0QmluLCBub3RlczogW2BcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEZcdThERUZcdTVGODQ6ICR7ZXhwbGljaXRCaW59YF0gfVxuICB9XG4gIGlmIChleHBsaWNpdCkgbm90ZXMucHVzaChgXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0XHU0RTBEXHU1QjU4XHU1NzI4OiAke2V4cGxpY2l0fWApXG5cbiAgZm9yIChjb25zdCByb290IG9mIGdsb2JhbE1vZHVsZVJvb3RzKCkpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4ocm9vdCwgRFNIX1JFTEFUSVZFX0JJTilcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICByZXR1cm4geyBiaW46IGNhbmRpZGF0ZSwgbm90ZXM6IFsuLi5ub3RlcywgYFx1NEVDRVx1NTE2OFx1NUM0MFx1NkEyMVx1NTc1N1x1NjgzOVx1NTNEMVx1NzNCMDogJHtjYW5kaWRhdGV9YF0gfVxuICAgIH1cbiAgfVxuICBub3Rlcy5wdXNoKCdcdTY3MkFcdTYyN0VcdTUyMzAgZHNoIFx1NUI4OVx1ODhDNVx1MzAwMlx1OEJGN1x1NTE0OFx1NjI2N1x1ODg0QzogbnBtIGluc3RhbGwgLWcgQGRlZXBzZWVrLWFpL2RzaFx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBkc2ggXHU4REVGXHU1Rjg0JylcbiAgcmV0dXJuIHsgYmluOiBudWxsLCBub3RlcyB9XG59XG5cbi8qKlxuICogXHU1RTM4XHU4OUMxIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjBDXHU2M0EyXHU2RDRCXHU3NTI4XHVGRjA5XHUzMDAyXG4gKiBPYnNpZGlhbiBcdTRGNUNcdTRFM0EgR1VJIFx1NUU5NFx1NzUyOFx1NEVDRSBGaW5kZXIgXHU1NDJGXHU1MkE4XHU2NUY2XHVGRjBDUEFUSCBcdTkwMUFcdTVFMzhcdTUzRUFcdTY3MDlcdTdDRkJcdTdFREZcdTc2RUVcdTVGNTVcbiAqIFx1RkYwOC91c3IvYmluOi9iaW46L3Vzci9zYmluOi9zYmluXHVGRjA5XHVGRjBDXHU0RTBEXHU1NDJCIEhvbWVicmV3IFx1N0I0OVx1NzUyOFx1NjIzN1x1NUI4OVx1ODhDNVx1NzZFRVx1NUY1NVx1RkYwQ1xuICogXHU1NkUwXHU2QjY0IHNwYXduKCdub2RlJykgXHU0RjFBXHU3NkY0XHU2M0E1IEVOT0VOVFx1MzAwMlx1OEZEOVx1OTFDQ1x1NjI4QVx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1NEY0RFx1N0Y2RVx1ODg2NVx1OUY1MFx1RkYxQVxuICogLSBQQVRIIFx1NEUyRFx1NzY4NCBub2RlXHVGRjA4c2hlbGwgXHU5MUNDXHU4RkQwXHU4ODRDXHU2NUY2XHU1QjU4XHU1NzI4XHVGRjA5XHVGRjFCXG4gKiAtIG1hY09TOiAvb3B0L2hvbWVicmV3L2Jpbi9ub2RlXHVGRjA4QXBwbGUgU2lsaWNvblx1RkYwOVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdUZGMDhJbnRlbFx1RkYwOVx1RkYxQlxuICogLSBMaW51eDogL3Vzci9iaW4vbm9kZVx1MzAwMS91c3IvbG9jYWwvYmluL25vZGVcdTMwMDF+Ly5sb2NhbC9iaW4vbm9kZVx1RkYxQlxuICogLSBXaW5kb3dzOiBcdTkwMUFcdThGQzcgYHdoZXJlIG5vZGVgIFx1ODlFM1x1Njc5MFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tbW9uTm9kZUJpbnMoKTogc3RyaW5nW10ge1xuICBjb25zdCBiaW5zOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IHBhdGhFbnYgPSBwcm9jZXNzLmVudi5QQVRIID8/ICcnXG4gIGZvciAoY29uc3QgZGlyIG9mIHBhdGhFbnYuc3BsaXQocGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgaWYgKGRpci50cmltKCkpIGJpbnMucHVzaChwYXRoLmpvaW4oZGlyLCAnbm9kZScpKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIGJpbnMucHVzaCgnL29wdC9ob21lYnJldy9iaW4vbm9kZScsICcvdXNyL2xvY2FsL2Jpbi9ub2RlJylcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnbGludXgnKSB7XG4gICAgYmlucy5wdXNoKCcvdXNyL2Jpbi9ub2RlJywgJy91c3IvbG9jYWwvYmluL25vZGUnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2JpbicsICdub2RlJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB3aGVyZSA9IHNwYXduU3luYygnd2hlcmUnLCBbJ25vZGUnXSwgeyBlbmNvZGluZzogJ3V0ZjgnLCB0aW1lb3V0OiAxMF8wMDAsIHdpbmRvd3NIaWRlOiB0cnVlIH0pXG4gICAgICBpZiAod2hlcmUuc3RhdHVzID09PSAwICYmIHdoZXJlLnN0ZG91dCkge1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2Ygd2hlcmUuc3Rkb3V0LnRyaW0oKS5zcGxpdCgvXFxyP1xcbi8pKSB7XG4gICAgICAgICAgaWYgKGxpbmUudHJpbSgpKSBiaW5zLnB1c2gobGluZS50cmltKCkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcdUZGMENcdTRGRERcdTc1NTlcdTdCMkNcdTRFMDBcdTRFMkFcdTVCNThcdTU3MjhcdTc2ODRcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KGJpbnMpXVxufVxuXG4vKipcbiAqIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNlx1MzAwMlxuICogXHU5RUQ4XHU4QkE0XHU5ODdBXHU1RThGXHVGRjFBXHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0IFx1MjE5MiBcdTdDRkJcdTdFREYgYG5vZGVgXHVGRjA4UEFUSCArIFx1NUUzOFx1ODlDMVx1NUI4OVx1ODhDNVx1OERFRlx1NUY4NFx1RkYwQ1x1OEZENFx1NTZERVx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwQ1xuICogXHU5MDdGXHU1MTREIE9ic2lkaWFuIEdVSSBcdTczQUZcdTU4ODMgUEFUSCBcdTdGM0FcdTU5MzFcdTVCRkNcdTgxRjQgc3Bhd24gRU5PRU5UXHVGRjA5XHUyMTkyIFx1NjI3RVx1NEUwRFx1NTIzMFx1NjVGNlx1N0VEOVx1NTFGQVx1NjYwRVx1Nzg2RVx1OTUxOVx1OEJFRlx1MzAwMlxuICogRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlIFx1NUI5RVx1NkQ0Qlx1NEYxQVx1NjMwMlx1OEQ3N1x1RkYwOE9ic2lkaWFuIFx1NEU4Q1x1OEZEQlx1NTIzNlxuICogXHU0RTBEXHU2MzA5XHU2NjZFXHU5MDFBIEVsZWN0cm9uIFx1OEJFRFx1NEU0OVx1NTRDRFx1NUU5NFx1RkYwOVx1RkYwQ1x1NTZFMFx1NkI2NFx1NEVDNVx1NUY1MyB1c2VFbWJlZGRlZE5vZGUgXHU2NjNFXHU1RjBGXHU1RjAwXHU1NDJGXHU2NUY2XHU2MjREXHU1QzFEXHU4QkQ1XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTm9kZUJpbihleHBsaWNpdD86IHN0cmluZywgZW1iZWRkZWROb2RlVmVyc2lvbj86IHN0cmluZywgdXNlRW1iZWRkZWQgPSBmYWxzZSk6IFJlc29sdmVkTm9kZSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gZXhwbGljaXQ/LnRyaW0oKSB8fCBwcm9jZXNzLmVudi5EU0hfTk9ERVxuICBpZiAoZXhwbGljaXRCaW4pIHtcbiAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEYgTm9kZTogJHtleHBsaWNpdEJpbn1gKVxuICAgIHJldHVybiB7IG5vZGVCaW46IGV4cGxpY2l0QmluLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZCAmJiBwcm9jZXNzLmV4ZWNQYXRoICYmIGVtYmVkZGVkTm9kZVZlcnNpb24pIHtcbiAgICBjb25zdCBtYWpvciA9IE51bWJlcihlbWJlZGRlZE5vZGVWZXJzaW9uLnNwbGl0KCcuJylbMF0pIHx8IDBcbiAgICBpZiAobWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufVx1RkYwOEVMRUNUUk9OX1JVTl9BU19OT0RFXHVGRjA5YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IHByb2Nlc3MuZXhlY1BhdGgsIHVzZUVsZWN0cm9uQXNOb2RlOiB0cnVlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICAgIG5vdGVzLnB1c2goYE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn0gPCAke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMENcdTY1RTBcdTZDRDVcdTU0MkZcdTc1MjhgKVxuICB9XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNvbW1vbk5vZGVCaW5zKCkpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjhcdTdDRkJcdTdFREYgTm9kZTogJHtjYW5kaWRhdGV9YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IGNhbmRpZGF0ZSwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIE5vZGVcdTMwMDJcdThCRjdcdTVCODlcdTg4QzUgTm9kZVx1RkYwOGh0dHBzOi8vbm9kZWpzLm9yZ1x1RkYwOVx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IG5vZGVCaW46ICcnLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1N0FFRlx1NTNFM1x1NjNBMlx1NkQ0Qlx1NEUwRVx1N0I0OVx1NUY4NVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTVGNTNcdTUyNERcdThGRDBcdTg4NENcdTczQUZcdTU4ODNcdUZGMDhPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMDlcdTgxRUFcdTVFMjZcdTc2ODQgTm9kZSBcdTcyNDhcdTY3MkNcdUZGMUJcdTY1RTBcdTUyMTkgdW5kZWZpbmVkICovXG5leHBvcnQgZnVuY3Rpb24gZW1iZWRkZWROb2RlVmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIGNvbnN0IHYgPSAocHJvY2Vzcy52ZXJzaW9ucyBhcyB7IG5vZGU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/Lm5vZGVcbiAgICByZXR1cm4gdiB8fCB1bmRlZmluZWRcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogXHU3QUVGXHU1M0UzXHU2NjJGXHU1NDI2XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHUzMDAyXG4gKiBcdTc1Mjggbm9kZTpodHRwIFx1ODAwQ1x1OTc1RVx1NkQ0Rlx1ODlDOFx1NTY2OCBmZXRjaFx1RkYxQU9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1NzY4NCBDU1AgXHU0RjFBXHU2MkU2XHU2MjJBXG4gKiBcdTVCRjkgaHR0cDovLzEyNy4wLjAuMSBcdTc2ODQgZmV0Y2hcdUZGMENcdTVCRkNcdTgxRjRcIlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVwiXHU4QkVGXHU1MjI0XHU0RTNBXCJcdTZDQTFcdTY3MDlcIlx1MzAwMlxuICogTm9kZSBcdTc2ODQgaHR0cCBcdTZBMjFcdTU3NTdcdTRFMERcdTUzRDdcdTk4NzVcdTk3NjIgQ1NQIFx1N0VBNlx1Njc1Rlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQb3J0VXAoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDE1MDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgcmVxID0gaHR0cC5nZXQoeyBob3N0LCBwb3J0LCBwYXRoOiAnLycsIHRpbWVvdXQ6IHRpbWVvdXRNcyB9LCAocmVzKSA9PiB7XG4gICAgICByZXMucmVzdW1lKClcbiAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICB9KVxuICAgIHJlcS5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIHJlcS5kZXN0cm95KClcbiAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgfSlcbiAgICByZXEub24oJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZShmYWxzZSkpXG4gIH0pXG59XG5cbi8qKiBcdThGNkVcdThCRTJcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUFcdUZGMUJcdThEODVcdTY1RjZcdThGRDRcdTU2REUgZmFsc2UgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yUmVhZHkoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDEyMF8wMDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVhZGxpbmUgPSBEYXRlLm5vdygpICsgdGltZW91dE1zXG4gIGZvciAoOzspIHtcbiAgICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCwgMTUwMCkpIHJldHVybiB0cnVlXG4gICAgaWYgKERhdGUubm93KCkgPiBkZWFkbGluZSkgcmV0dXJuIGZhbHNlXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHIsIDUwMCkpXG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTU0MkZcdTUyQTggLyBcdTUwNUNcdTZCNjJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaGVkU2VydmVyIHtcbiAgcHJvYzogQ2hpbGRQcm9jZXNzXG4gIHVybDogc3RyaW5nXG4gIC8qKiB0cnVlID0gXHU3QUVGXHU1M0UzXHU0RTBBXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjBDXHU2NzJBXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCICovXG4gIGF0dGFjaGVkOiBib29sZWFuXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1RkYxQVx1NjI4QSBwZXItdmF1bHQgRFNIX0hPTUUgXHU3Njg0IGBwcm9maWxlcy9gIFx1NjZGRlx1NjM2Mlx1NEUzQVx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlxuICogYH4vLmRzaC9wcm9maWxlc2AgXHU3Njg0XHU4RjZGXHU5NEZFXHUzMDAyXHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHVGRjA4XHU3RUE2IDE5NSBcdTRFMkEgQGRlZXBzZWVrLWFpIFx1NTMwNVx1RkYwOVx1NTE2OFx1NUM0MFxuICogXHU0RTAwXHU0RUZEXHVGRjBDXHU5MDdGXHU1MTREXHU2QkNGXHU0RTJBIHZhdWx0IFx1NTQwNFx1ODFFQVx1OTRGQVx1NTFFMFx1NzY3RSBNQiBcdTc2ODQgbm9kZV9tb2R1bGVzIFx1NUU3M1x1OTc2Mlx1OTRGRVx1NjNBNVx1RkYxQnNraWxsIFx1NUI5QVx1NEU0OVxuICogXHU0RTVGXHU5NjhGXHU1MTcxXHU0RUFCIHByb2ZpbGVzL2FnZW50LXByZXNldHMgXHU0RTAwXHU1RTc2XHU1OTBEXHU3NTI4XHUzMDAyXG4gKlxuICogXHU1NDBDXHU2NUY2XHU2MjhBIGAuYWdlbnQtcHJlc2V0cy9gIFx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQiBgfi8uZHNoLy5hZ2VudC1wcmVzZXRzYFx1RkYxQWFnZW50IHByZXNldFxuICogXHU3Njg0XHU1M0QxXHU3M0IwXHU2ODM5XHU2NjJGIGBkc2hIb21lUGF0aCgnLmFnZW50LXByZXNldHMnKWBcdUZGMDhcdThEREZcdTk2OEYgRFNIX0hPTUVcdUZGMDlcdUZGMENwZXItdmF1bHRcbiAqIFx1NkEyMVx1NUYwRlx1ODJFNVx1NEUwRFx1NTQwQ1x1NkI2NVx1OEY2Rlx1OTRGRVx1RkYwQ2RzaCBcdTRGMUFcdTRFQ0UgcGVyLXZhdWx0IFx1NzZFRVx1NUY1NVx1NjI3RSBwcmVzZXQgXHUyMDE0XHUyMDE0IFx1NzUyOFx1NjIzN1x1ODFFQVx1NUI5QVx1NEU0OVx1NzY4NFxuICogYG9ic2lkaWFuYCBwcmVzZXRcdUZGMDhcdTYzMDJcdThGN0QgdmF1bHQgXHU1REU1XHU1MTc3ICsgb2JzaWRpYW4tY29udmVudGlvbnMgc2tpbGxcdUZGMDlcdTVDMzFcdTYyN0VcdTRFMERcdTUyMzBcdUZGMENcbiAqIFx1ODg2OFx1NzNCMFx1NEUzQVx1OTc2Mlx1Njc3Rlx1OTFDQ1x1NkNBMVx1NjcwOSB2YXVsdCBcdTVERTVcdTUxNzdcdTMwMDJcbiAqXG4gKiBcdTVERjJcdTVCNThcdTU3MjhcdTc2ODRcdTc3MUZcdTVCOUVcdTc2RUVcdTVGNTVcdTRGMUFcdTg4QUJcdTY2RkZcdTYzNjJcdTRFM0FcdThGNkZcdTk0RkVcdUZGMDhcdTY1RTdcdTc2RUVcdTVGNTVcdTUxNDhcdTY1MzlcdTU0MERcdTU5MDdcdTRFRkRcdTRFM0EgYDxuYW1lPi5iYWstPHRzPmBcdUZGMENcbiAqIFx1Nzg2RVx1OEJBNFx1NTE3MVx1NEVBQlx1NTNFRlx1NzUyOFx1NTQwRVx1NTNFRlx1NjI0Qlx1NTJBOFx1NTIyMFx1OTY2NFx1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlU2hhcmVkUHJvZmlsZXMoZHNoSG9tZTogc3RyaW5nLCBzaGFyZWRSb290OiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFzaGFyZWRSb290IHx8IGRzaEhvbWUgPT09IHNoYXJlZFJvb3QpIHJldHVyblxuICBjb25zdCBsaW5rRGlyID0gKG5hbWU6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBwYXRoLmpvaW4oZHNoSG9tZSwgbmFtZSlcbiAgICAgIGNvbnN0IHNoYXJlZFRhcmdldCA9IHBhdGguam9pbihzaGFyZWRSb290LCBuYW1lKVxuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNoYXJlZFRhcmdldCkpIHJldHVyblxuICAgICAgbGV0IHN0OiBmcy5TdGF0cyB8IG51bGwgPSBudWxsXG4gICAgICB0cnkge1xuICAgICAgICBzdCA9IGZzLmxzdGF0U3luYyh0YXJnZXQpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgc3QgPSBudWxsXG4gICAgICB9XG4gICAgICBpZiAoc3Q/LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgaWYgKGZzLnJlYWxwYXRoU3luYyh0YXJnZXQpID09PSBmcy5yZWFscGF0aFN5bmMoc2hhcmVkVGFyZ2V0KSkgcmV0dXJuXG4gICAgICAgIGZzLnVubGlua1N5bmModGFyZ2V0KVxuICAgICAgICBzdCA9IG51bGxcbiAgICAgIH1cbiAgICAgIGlmIChzdD8uaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICBjb25zdCBiYWsgPSBgJHt0YXJnZXR9LmJhay0ke0RhdGUubm93KCl9YFxuICAgICAgICBmcy5yZW5hbWVTeW5jKHRhcmdldCwgYmFrKVxuICAgICAgfVxuICAgICAgZnMubWtkaXJTeW5jKGRzaEhvbWUsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgICBmcy5zeW1saW5rU3luYyhzaGFyZWRUYXJnZXQsIHRhcmdldCwgJ2RpcicpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtkc2gtaG9zdF0gXHU1RUZBXHU3QUNCXHU1MTcxXHU0RUFCICR7bmFtZX0gXHU4RjZGXHU5NEZFXHU1OTMxXHU4RDI1XHVGRjA4cGVyLXZhdWx0IFx1NUMwNlx1NzUyOFx1NzJFQ1x1N0FDQlx1NzZFRVx1NUY1NVx1RkYwOWAsIGVycilcbiAgICB9XG4gIH1cbiAgbGlua0RpcigncHJvZmlsZXMnKVxuICBsaW5rRGlyKCcuYWdlbnQtcHJlc2V0cycpXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NFwiXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXCJcdUZGMUFcdTYyOEFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1N0Y2RVx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQiBgfi8uZHNoYFx1RkYwQ1xuICogXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHU2NTcwXHU2MzZFXHUzMDAyXG4gKlxuICogXHU1MzlGXHU3NDA2XHVGRjFBZHNoIFx1NzY4NCBgc2V0dGluZ3NgXHVGRjA4QGRlZXBzZWVrLWFpL2RzaC1zZXR0aW5ncy1maWxlXHVGRjA5XHU0RTBFIGBjcmVkZW50aWFsc2BcbiAqIFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtY3JlZGVudGlhbHMtbG9jYWxcdUZGMDlcdTYzRDJcdTRFRjZcdTkwRkRcdTY1MkZcdTYzMDEgYHBhdGhgIFx1ODk4Nlx1NzZENlx1RkYwQ1x1OUVEOFx1OEJBNFx1OERFRlx1NUY4NFx1NjYyRlxuICogYDxkc2hIb21lPi9zZXR0aW5ncy55YW1sYCAvIGA8ZHNoSG9tZT4vLmNyZWRlbnRpYWxzLnlhbWxgXHUzMDAyXHU1NzI4XHU1MTcxXHU0RUFCIHByb2ZpbGVcbiAqIFx1NzY4NCBgY29yZGlzLnBhdGNoLnltbGAgXHU5MUNDXHU2MjhBXHU4RkQ5XHU0RTI0XHU0RTJBXHU2M0QyXHU0RUY2XHU2MzA3XHU1NDExXHU1MTcxXHU0RUFCXHU2ODM5XHU3Njg0XHU2NTg3XHU0RUY2XHVGRjBDXHU2QTIxXHU1NzhCXHU5MDA5XHU2MkU5XHUzMDAxQVBJIFx1NUJDNlx1OTRBNVx1MzAwMVxuICogXHU0RTNCXHU5ODk4XHU3QjQ5XHU5MTREXHU0RTAwXHU2QjIxXHVGRjA4XHU1NzI4XHU0RUZCXHU2MTBGIHZhdWx0IFx1NzY4NCBEU0ggXHU5NzYyXHU2NzdGXHU2MjE2XHU3NkY0XHU2M0E1XHU2NTM5IH4vLmRzaFx1RkYwOVx1NTM3M1x1NTNFRlx1NTE2OCB2YXVsdCBcdTc1MUZcdTY1NDhcdTMwMDJcbiAqIFx1NkNFOFx1NjEwRlx1RkYxQXByb2ZpbGVzIFx1NURGMlx1OEY2Rlx1OTRGRVx1NTE3MVx1NEVBQlx1RkYwQ1x1NjI0MFx1NEVFNVx1OEZEOVx1OTFDQ1x1NTE5OVx1NTE2NVx1NzY4NFx1NkI2M1x1NjYyRlx1NTE3MVx1NEVBQiBwYXRjaCBcdTIwMTRcdTIwMTQgXHU3NTI4XHU2MjM3XHU4MUVBXHU4OEM1XHU3Njg0XG4gKiBcdTYzRDJcdTRFRjZcdTY3NjFcdTc2RUVcdUZGMDhpbnNlcnRcdUZGMDlcdTVGQzVcdTk4N0JcdTRGRERcdTc1NTlcdUZGMENcdTUzRUFcdTU0MDhcdTVFNzYvXHU2NkY0XHU2NUIwIHNldHRpbmdzL2NyZWRlbnRpYWxzIFx1NEUyNFx1NEUyQVx1Njc2MVx1NzZFRVx1MzAwMlxuICpcbiAqIHBhdGNoIFx1NjgzQ1x1NUYwRlx1RkYwOGNvcmRpcyBsb2FkZXIgXHU3Njg0IGFwcGx5RW50cnlQYXRjaGVzXHVGRjA5XHVGRjFBXHU1MjE3XHU4ODY4XHU5MUNDXHU2QkNGXHU0RTJBXHU1MTQzXHU3RDIwXHU3NkY0XHU2M0E1XHU2NjJGXG4gKiBgeyBpZCwgaW5zZXJ0PywgbmFtZT8sIC4uLm92ZXJyaWRlcyB9YFx1RkYwQ292ZXJyaWRlcyBcdTk1MkVcdTg5ODZcdTc2RDZcdTU0MENcdTU0MEQgdGFyZ2V0IFx1Njc2MVx1NzZFRVx1RkYwQ1xuICogXHU2Q0ExXHU2NzA5IGB1cGRhdGU6YCBcdTUzMDVcdTg4QzVcdTVDNDJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYXJlZENvbmZpZ1BhdGNoKGRzaEhvbWU6IHN0cmluZywgc2hhcmVkUm9vdDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghc2hhcmVkUm9vdCB8fCBkc2hIb21lID09PSBzaGFyZWRSb290KSByZXR1cm5cbiAgdHJ5IHtcbiAgICBjb25zdCBzaGFyZWRQcm9maWxlcyA9IHBhdGguam9pbihzaGFyZWRSb290LCAncHJvZmlsZXMnKVxuICAgIGNvbnN0IHBhdGNoRmlsZSA9IHBhdGguam9pbihzaGFyZWRQcm9maWxlcywgJ3dlYicsICdjb3JkaXMucGF0Y2gueW1sJylcbiAgICBjb25zdCBzZXR0aW5nc1BhdGggPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJ3NldHRpbmdzLnlhbWwnKVxuICAgIGNvbnN0IGNyZWRlbnRpYWxzUGF0aCA9IHBhdGguam9pbihzaGFyZWRSb290LCAnLmNyZWRlbnRpYWxzLnlhbWwnKVxuXG4gICAgY29uc3QgYmxvY2tTZXR0aW5ncyA9IGAtIGlkOiBzZXR0aW5nc1xuICBjb25maWc6XG4gICAgcGF0aDogJHtzZXR0aW5nc1BhdGh9XG5gXG4gICAgY29uc3QgYmxvY2tDcmVkZW50aWFscyA9IGAtIGlkOiBjcmVkZW50aWFsc1xuICBjb25maWc6XG4gICAgcGF0aDogJHtjcmVkZW50aWFsc1BhdGh9XG5gXG5cbiAgICBsZXQgY29udGVudCA9ICcnXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0Y2hGaWxlKSkge1xuICAgICAgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhwYXRjaEZpbGUsICd1dGY4JylcbiAgICB9XG4gICAgY29uc3Qgc3RyaXAgPSAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xccysvZywgJycpXG4gICAgY29uc3QgaGFzU2V0dGluZ3MgPSBzdHJpcChjb250ZW50KS5pbmNsdWRlcyhzdHJpcChibG9ja1NldHRpbmdzKSlcbiAgICBjb25zdCBoYXNDcmVkZW50aWFscyA9IHN0cmlwKGNvbnRlbnQpLmluY2x1ZGVzKHN0cmlwKGJsb2NrQ3JlZGVudGlhbHMpKVxuICAgIGlmIChoYXNTZXR0aW5ncyAmJiBoYXNDcmVkZW50aWFscykgcmV0dXJuXG5cbiAgICAvLyBcdTUzRUFcdTU3MjhcdTUxNzFcdTRFQUIgcGF0Y2ggXHU0RTNBXHU3QTdBXHU2NTcwXHU3RUM0IGBbXWBcdUZGMDhcdTUxNDFcdThCQjhcdTZDRThcdTkxQ0FcdUZGMENcdTYyMTZcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdUZGMDlcdTY1RjZcdTUxOTlcdTUxNjVcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcbiAgICAvLyBcdTY3NjFcdTc2RUVcdUZGMUJcdTgyRTVcdTc1MjhcdTYyMzdcdTVERjJcdTgxRUFcdTVCOUFcdTRFNDkgcGF0Y2hcdUZGMDhcdTU5ODJcdTgxRUFcdTg4QzVcdTYzRDJcdTRFRjZcdUZGMDlcdUZGMENcdTRFMERcdTVGM0FcdTg4NENcdTY1MzlcdTUxOTkgXHUyMDE0XHUyMDE0IFx1NjNEMFx1NzkzQVx1NjI0Qlx1NTJBOFx1NTJBMFx1MzAwMlxuICAgIGNvbnN0IHdpdGhvdXRDb21tZW50cyA9IGNvbnRlbnRcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5maWx0ZXIoKGwpID0+ICFsLnRyaW0oKS5zdGFydHNXaXRoKCcjJykpXG4gICAgICAuam9pbignXFxuJylcbiAgICAgIC50cmltKClcbiAgICBpZiAod2l0aG91dENvbW1lbnRzID09PSAnJyB8fCB3aXRob3V0Q29tbWVudHMgPT09ICdbXScpIHtcbiAgICAgICAgY29uc3QgaW5zZXJ0aW9uID0gYmxvY2tTZXR0aW5ncyArIGJsb2NrQ3JlZGVudGlhbHNcbiAgICAgICAgY29udGVudCA9IGAjIGRzaC1kb2NrIFx1ODFFQVx1NTJBOFx1N0VGNFx1NjJBNFx1RkYxQXBlci12YXVsdCBcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMENcdTRGMUFcdThCRERcdTRFQ0RcdTk2OTRcdTc5QkJcdUZGMDlcbiR7aW5zZXJ0aW9uLnRyaW1FbmQoKX1cbmBcbiAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShwYXRjaEZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGNoRmlsZSwgY29udGVudClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnW2RzaC1ob3N0XSBcdTUxNzFcdTRFQUIgY29yZGlzLnBhdGNoLnltbCBcdTVERjJcdTY3MDlcdTgxRUFcdTVCOUFcdTRFNDlcdTUxODVcdTVCQjlcdUZGMENcdThERjNcdThGQzdcdTgxRUFcdTUyQThcdTUxOTlcdTUxNjVcdUZGMUInICtcbiAgICAgICAgICAnXHU1OTgyXHU5NzAwXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjBDXHU4QkY3XHU1NzI4IH4vLmRzaC9wcm9maWxlcy93ZWIvY29yZGlzLnBhdGNoLnltbCBcdTYyNEJcdTUyQThcdTUyQTBcdTUxNjUgc2V0dGluZ3MvY3JlZGVudGlhbHMgXHU3Njg0IHBhdGggXHU4OTg2XHU3NkQ2JyxcbiAgICAgICAgKVxuICAgICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtaG9zdF0gXHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCIHBhdGNoIFx1NTkzMVx1OEQyNVx1RkYwOFx1NUMwNlx1NjMwOSBwZXItdmF1bHQgXHU3MkVDXHU3QUNCXHU5MTREXHU3RjZFXHU1NDJGXHU1MkE4XHVGRjA5JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgZHNoIHdlYlx1MzAwMlx1OEMwM1x1NzUyOFx1NjVCOVx1OEQxRlx1OEQyM1x1NzZEMVx1NTQyQyBwcm9jIFx1NzY4NCBleGl0L2Vycm9yXHUzMDAyICovXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoRHNoKG9wdHM6IExhdW5jaE9wdGlvbnMgJiB7IGRzaEJpbjogc3RyaW5nOyBub2RlQmluOiBzdHJpbmc7IHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuIH0pOiBDaGlsZFByb2Nlc3Mge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICAvLyAtLW5vLW9wZW5cdUZGMUFkc2ggQ0xJIFx1OUVEOFx1OEJBNFx1NEYxQVx1NjI1M1x1NUYwMFx1N0NGQlx1N0VERlx1OUVEOFx1OEJBNFx1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOFx1OTc2Mlx1Njc3Rlx1NTczQVx1NjY2Rlx1NEUwQlx1NjYyRlwiXHU1MkFCXHU2MzAxXCJcdUZGMDlcdTMwMDJcbiAgLy8gXHU2M0QyXHU0RUY2XHU0RkE3XHU3Njg0XHU5NzYyXHU2NzdGXHU1QzMxXHU2NjJGIFVJXHVGRjFCXHU5NzAwXHU4OTgxXHU2RDRGXHU4OUM4XHU1NjY4XHU2NUY2XHU4RDcwXHU2NjNFXHU1RjBGXHU3Njg0XCJcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDBcIlxuICAvLyBcdTUyQThcdTRGNUNcdUZGMDhzaGVsbC5vcGVuRXh0ZXJuYWxcdUZGMDlcdTMwMDJcbiAgY29uc3QgYXJncyA9IFtvcHRzLmRzaEJpbiwgJ3dlYicsICctLWhvc3QnLCBob3N0LCAnLS1wb3J0JywgU3RyaW5nKHBvcnQpLCAnLS1uby1vcGVuJ11cbiAgY29uc3QgZW52OiBOb2RlSlMuUHJvY2Vzc0VudiA9IHtcbiAgICAuLi4ob3B0cy5lbnYgPz8gcHJvY2Vzcy5lbnYgPz8ge30pLFxuICAgIERTSF9IT01FOiBvcHRzLmRzaEhvbWUsXG4gIH1cbiAgaWYgKG9wdHMudXNlRWxlY3Ryb25Bc05vZGUpIGVudi5FTEVDVFJPTl9SVU5fQVNfTk9ERSA9ICcxJ1xuICByZXR1cm4gc3Bhd24ob3B0cy5ub2RlQmluLCBhcmdzLCB7XG4gICAgZW52LFxuICAgIGN3ZDogb3B0cy5jd2QsXG4gICAgc3RkaW86IFsnaWdub3JlJywgJ3BpcGUnLCAncGlwZSddLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxufVxuXG4vKipcbiAqIFx1N0FFRlx1NTNFM1x1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1NjVGNlx1NTFCM1x1NUI5QVwiXHU2MzAyXHU2M0E1IG9yIFx1NjJBNVx1OTUxOVwiXHVGRjFBXG4gKiAtIFx1NjcyQVx1NkNFOFx1NTE2NSB2ZXJpZnlCcmFuZFx1RkYxQVx1NzZGNFx1NjNBNVx1NjMwMlx1NjNBNVx1RkYwOFx1NjVFN1x1ODg0Q1x1NEUzQVx1RkYwOVx1RkYxQlxuICogLSBcdTZDRThcdTUxNjVcdTRFMTRcdTY4MjFcdTlBOENcdTkwMUFcdThGQzdcdUZGMUFcdTYzMDJcdTYzQTVcdUZGMUJcbiAqIC0gXHU2Q0U4XHU1MTY1XHU0RjQ2XHU2ODIxXHU5QThDXHU1OTMxXHU4RDI1L1x1NUYwMlx1NUUzOFx1RkYxQVx1NjMwOVx1MzAwQ1x1N0FFRlx1NTNFM1x1ODhBQlx1OTc1RSBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHUzMDBEXHU4RkQ0XHU1NkRFIGVycm9yXHUzMDAyXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGF0dGFjaFN0YXR1cyhcbiAgb3B0czogTGF1bmNoT3B0aW9ucyxcbiAgaG9zdDogc3RyaW5nLFxuICBwb3J0OiBudW1iZXIsXG4gIHVybDogc3RyaW5nLFxuKTogUHJvbWlzZTxTZXJ2ZXJTdGF0dXM+IHtcbiAgaWYgKCFvcHRzLnZlcmlmeUJyYW5kKSB7XG4gICAgcmV0dXJuIHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiB0cnVlIH1cbiAgfVxuICBsZXQgaXNCcmFuZCA9IGZhbHNlXG4gIHRyeSB7XG4gICAgaXNCcmFuZCA9IGF3YWl0IG9wdHMudmVyaWZ5QnJhbmQodXJsKVxuICB9IGNhdGNoIHtcbiAgICBpc0JyYW5kID0gZmFsc2VcbiAgfVxuICBpZiAoaXNCcmFuZCkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBraW5kOiAnZXJyb3InLFxuICAgIG1lc3NhZ2U6IGBcdTdBRUZcdTUzRTMgJHtwb3J0fSBcdTVERjJcdTg4QUJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVx1NTM2MFx1NzUyOFx1RkYwOFx1NTRDMVx1NzI0Q1x1NzI3OVx1NUY4MVx1NjgyMVx1OUE4Q1x1NjcyQVx1OTAxQVx1OEZDN1x1RkYwOVx1MzAwMlx1OEJGN1x1NjM2Mlx1NEUwMFx1NEUyQVx1N0FFRlx1NTNFM1x1RkYwQ1x1NjIxNlx1NTE0OFx1NTA1Q1x1NjM4OVx1NTM2MFx1NzUyOFx1OEJFNVx1N0FFRlx1NTNFM1x1NzY4NFx1NjcwRFx1NTJBMWAsXG4gIH1cbn1cblxuLyoqXG4gKiBcdTRFMDBcdTk1MkVcIlx1Nzg2RVx1NEZERFx1OEZEMFx1ODg0Q1wiXHVGRjFBXG4gKiAxLiBcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NTRDMVx1NzI0Q1x1NjgyMVx1OUE4Q1x1RkYwOFx1NTNFRlx1OTAwOVx1RkYwOVx1MjE5MiBcdTkwMUFcdThGQzdcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDhhdHRhY2hlZFx1RkYwQ1x1NEUwRFx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQlx1RkYwOVx1RkYwQ1xuICogICAgXHU1NDI2XHU1MjE5XHU2MzA5XHUzMDBDXHU3QUVGXHU1M0UzXHU4OEFCXHU5NzVFIERTSCBcdTY3MERcdTUyQTFcdTUzNjBcdTc1MjhcdTMwMERcdTYyQTVcdTk1MTlcdUZGMENcdTdFRERcdTRFMERcdThCRUZcdTYzMDJcdUZGMUJcbiAqIDIuIFx1NTQyNlx1NTIxOVx1NUI5QVx1NEY0RCBkc2ggXHUyMTkyIFx1OTAwOVx1NjJFOSBOb2RlIFx1MjE5MiBzcGF3biBcdTIxOTIgXHU3QjQ5XHU1Rjg1XHU1QzMxXHU3RUVBXHVGRjFCXG4gKiAzLiBcdTVCNTBcdThGREJcdTdBMEJcdTc5RDJcdTkwMDBcdUZGMDhcdTU5ODJcdTdBRUZcdTUzRTNcdTg4QUJcdTUzNjAgRUFERFJJTlVTRVx1RkYwOVx1MjE5MiBcdTdBQ0JcdTUzNzNcdThGRDRcdTU2REVcdTc3MUZcdTVCOUVcdTk1MTlcdThCRUZcdUZGMENcdTRFMERcdTUxOERcdTc2RjJcdTdCNDlcdTMwMDJcbiAqIFx1OEZENFx1NTZERSBTZXJ2ZXJTdGF0dXNcdTMwMDJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZURzaFJ1bm5pbmcob3B0czogTGF1bmNoT3B0aW9ucyk6IFByb21pc2U8eyBzdGF0dXM6IFNlcnZlclN0YXR1czsgcHJvYz86IENoaWxkUHJvY2VzcyB9PiB7XG4gIGNvbnN0IHBvcnQgPSBvcHRzLnBvcnQgPz8gMzA4MFxuICBjb25zdCBob3N0ID0gb3B0cy5ob3N0ID8/ICcxMjcuMC4wLjEnXG4gIGNvbnN0IHVybCA9IGBodHRwOi8vJHtob3N0fToke3BvcnR9L2BcblxuICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IGF3YWl0IGF0dGFjaFN0YXR1cyhvcHRzLCBob3N0LCBwb3J0LCB1cmwpIH1cbiAgfVxuXG4gIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbihvcHRzLmRzaEJpbilcbiAgaWYgKCFmb3VuZC5iaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogZm91bmQubm90ZXNbZm91bmQubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBkc2ggQ0xJJyB9IH1cbiAgfVxuICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4ob3B0cy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIG9wdHMudXNlRW1iZWRkZWROb2RlKVxuICBpZiAoIW5vZGUubm9kZUJpbikge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBub2RlLm5vdGVzW25vZGUubm90ZXMubGVuZ3RoIC0gMV0gPz8gJ1x1NjVFMFx1NkNENVx1NUI5QVx1NEY0RCBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNicgfSB9XG4gIH1cbiAgLy8gcGVyLXZhdWx0IFx1NTE3MVx1NEVBQlx1RkYxQXByb2ZpbGVzXHVGRjA4XHU4RkQwXHU4ODRDXHU2NUY2XHU2M0QyXHU0RUY2XHVGRjA5XHU4RjZGXHU5NEZFXHU1MjMwXHU1MTcxXHU0RUFCXHU2ODM5XHVGRjBDc2V0dGluZ3MvY3JlZGVudGlhbHNcbiAgLy8gXHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCXHU2ODM5IFx1MjAxNFx1MjAxNCBcdTkxNERcdTdGNkVcdTRFMEVcdTYzRDJcdTRFRjZcdTUxNjhcdTVDNDBcdTRFMDBcdTRFRkRcdUZGMENcdTRFQzVcdTRGMUFcdThCRERcdTk2OTRcdTc5QkJcdTMwMDJcbiAgaWYgKG9wdHMuc2hhcmVkQ29uZmlnUm9vdCkge1xuICAgIGVuc3VyZVNoYXJlZFByb2ZpbGVzKG9wdHMuZHNoSG9tZSwgb3B0cy5zaGFyZWRDb25maWdSb290KVxuICAgIGVuc3VyZVNoYXJlZENvbmZpZ1BhdGNoKG9wdHMuZHNoSG9tZSwgb3B0cy5zaGFyZWRDb25maWdSb290KVxuICB9XG4gIGNvbnN0IHByb2MgPSBsYXVuY2hEc2goeyAuLi5vcHRzLCBkc2hCaW46IGZvdW5kLmJpbiwgbm9kZUJpbjogbm9kZS5ub2RlQmluLCB1c2VFbGVjdHJvbkFzTm9kZTogbm9kZS51c2VFbGVjdHJvbkFzTm9kZSB9KVxuXG4gIC8vIFx1NjUzNlx1OTZDNiBzdGRlcnIgXHU1QzNFXHU5MEU4XHVGRjFBXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHU2NUY2XHU3RUQ5XHU1MUZBXHU3NzFGXHU1QjlFXHU1MzlGXHU1NkUwXHVGRjA4XHU1OTgyIEVBRERSSU5VU0VcdUZGMDlcbiAgbGV0IHN0ZGVyclRhaWwgPSAnJ1xuICBwcm9jLnN0ZGVycj8ub24oJ2RhdGEnLCAoZDogQnVmZmVyKSA9PiB7XG4gICAgc3RkZXJyVGFpbCA9IChzdGRlcnJUYWlsICsgZC50b1N0cmluZygpKS5zbGljZSgtNDAwMClcbiAgfSlcblxuICBjb25zdCBjaGlsZERpZWQgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gIH0pXG5cbiAgY29uc3QgcmVhZHkgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgIHdhaXRGb3JSZWFkeShob3N0LCBwb3J0LCBvcHRzLnRpbWVvdXRNcyA/PyAxMjBfMDAwKS50aGVuKCgpID0+IHRydWUpLFxuICAgIGNoaWxkRGllZC50aGVuKCgpID0+IGZhbHNlKSxcbiAgXSlcblxuICBpZiAocmVhZHkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiBmYWxzZSB9LCBwcm9jIH1cbiAgfVxuXG4gIC8vIFx1NUI1MFx1OEZEQlx1N0EwQlx1NURGMlx1OTAwMFx1NTFGQVx1RkYxQVx1NTE4RFx1NjNBMlx1NEUwMFx1NkIyMVx1N0FFRlx1NTNFM1x1RkYwOFx1NTNFRlx1ODBGRFx1ODhBQlx1NTIyQlx1NzY4NFx1NUI5RVx1NEY4Qlx1NjJBMlx1OEREMVx1N0VEMVx1NUI5QVx1RkYwOVx1RkYwQ1x1NTQyNlx1NTIxOVx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlxuICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IGF3YWl0IGF0dGFjaFN0YXR1cyhvcHRzLCBob3N0LCBwb3J0LCB1cmwpLCBwcm9jIH1cbiAgfVxuICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsKSB9LCBwcm9jIH1cbn1cblxuLyoqIFx1NEVDRSBzdGRlcnIgXHU1QzNFXHU5MEU4XHU2M0QwXHU3MEJDXHU1M0VGXHU4QkZCXHU5NTE5XHU4QkVGICovXG5mdW5jdGlvbiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gc3RkZXJyVGFpbC5zcGxpdCgvXFxyP1xcbi8pLmZpbHRlcihCb29sZWFuKVxuICBjb25zdCBhZGRyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0VBRERSSU5VU0UnKSlcbiAgY29uc3QgZXJyTGluZSA9IGxpbmVzLmZpbmQoKGwpID0+IGwuaW5jbHVkZXMoJ0Vycm9yOicpKVxuICBpZiAoYWRkckxpbmUpIHtcbiAgICByZXR1cm4gJ1x1N0FFRlx1NTNFM1x1NURGMlx1ODhBQlx1NTM2MFx1NzUyOFx1RkYwOEVBRERSSU5VU0VcdUZGMDlcdTMwMDJcdThCRjdcdTYzNjJcdTRFMDBcdTRFMkFcdTdBRUZcdTUzRTNcdUZGMENcdTYyMTZcdTUxNDhcdTUwNUNcdTYzODlcdTUzNjBcdTc1MjhcdThCRTVcdTdBRUZcdTUzRTNcdTc2ODRcdTY3MERcdTUyQTFcdTU0MEVcdTkxQ0RcdThCRDUnXG4gIH1cbiAgaWYgKGVyckxpbmUpIHtcbiAgICBjb25zdCBjbGVhbmVkID0gZXJyTGluZS50cmltKCkuc2xpY2UoMCwgMzAwKVxuICAgIHJldHVybiBgZHNoIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogJHtjbGVhbmVkfWBcbiAgfVxuICByZXR1cm4gJ0RTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkFcdUZGMDhcdTY1RTBcdThCRTZcdTdFQzZcdTk1MTlcdThCRUZcdUZGMDlcdTMwMDJcdThCRjdcdTY3RTVcdTc3MEIgT2JzaWRpYW4gXHU2M0E3XHU1MjM2XHU1M0YwIFtkc2hdIFx1NjVFNVx1NUZENydcbn1cblxuLyoqIFx1NTA1Q1x1NkI2Mlx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOFNJR1RFUk1cdUZGMENcdTdCNDlcdTVGODVcdTkwMDBcdTUxRkFcdUZGMUJcdThEODVcdTY1RjZcdTU0MEUgU0lHS0lMTFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BQcm9jZXNzKHByb2M6IENoaWxkUHJvY2VzcyB8IG51bGwgfCB1bmRlZmluZWQsIHRpbWVvdXRNcyA9IDUwMDApOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFwcm9jIHx8IHByb2MuZXhpdENvZGUgIT09IG51bGwgfHwgcHJvYy5zaWduYWxDb2RlICE9PSBudWxsKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBwcm9jLmtpbGwoJ1NJR0tJTEwnKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH0sIHRpbWVvdXRNcylcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiB7XG4gICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfSlcbiAgICB0cnkge1xuICAgICAgcHJvYy5raWxsKCdTSUdURVJNJylcbiAgICB9IGNhdGNoIHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9XG4gIH0pXG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU1QjY0XHU1MTNGXHU4RkRCXHU3QTBCXHU2RTA1XHU2MjZCXHVGRjA4UElEIFx1NjU4N1x1NEVGNiArIFx1NTQ3RFx1NEVFNFx1ODg0Q1x1OEVBQlx1NEVGRFx1NjgyMVx1OUE4QyArIFBQSUQgXHU1MjI0XHU1QjlBXHVGRjA5XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBcdTgwQ0NcdTY2NkZcdUZGMUFPYnNpZGlhbiBcdTVEMjlcdTZFODMvXHU1RjNBXHU5MDAwXHU2NUY2IG9udW5sb2FkIFx1NEUwRFx1NEYxQVx1NjI2N1x1ODg0Q1x1RkYwQ1x1NjNEMlx1NEVGNiBzcGF3biBcdTc2ODQgYGRzaCB3ZWJgXG4vLyBcdTVCNTBcdThGREJcdTdBMEJcdTRGMUFcdTUzRDhcdTYyMTBcdTVCNjRcdTUxM0ZcdUZGMDhtYWNPUy9MaW51eCBcdTRFMEJcdTg4QUIgcmVwYXJlbnQgXHU1MjMwIGxhdW5jaGRcdUZGMENwcGlkPTFcdUZGMDlcdUZGMENcdTRFMTRcdTY1RTdcdTcyNDhcbi8vIFx1NjNEMlx1NEVGNlwiXHU3QUVGXHU1M0UzXHU2NzA5XHU2NzBEXHU1MkExXHU1QzMxXHU2MzAyXHU2M0E1XCJcdTRGMUFcdTYyOEFcdTVCNjRcdTUxM0ZcdTZDMzhcdTRFNDVcdTRGRERcdTc1NTlcdTMwMDJcdTY3MkNcdTZBMjFcdTU3NTdcdTU3MjhcdTZCQ0ZcdTZCMjFcdTU0MkZcdTUyQThcdTUyNERcdTZFMDVcdTYyNkJcdTY3MkNcdTVFOTNcdTdBRUZcdTUzRTNcbi8vIFx1NEUwQVx1NzY4NFx1NUI2NFx1NTEzRlx1RkYxQVx1NTE0OCBTSUdURVJNXHUzMDAxXHU4RDg1XHU2NUY2IFNJR0tJTExcdUZGMENcdTUxOERcdTc1MzFcdThDMDNcdTc1MjhcdTY1QjlcdTkxQ0RcdTY1QjAgc3Bhd25cdTMwMDJcbi8vXG4vLyBcdTVCODlcdTUxNjhcdThCQkVcdThCQTFcdUZGMDhcdTU5MUFcdTVFOTMvXHU1OTFBXHU3QTk3XHU1M0UzXHU1RTc2XHU1M0QxXHU1Qjg5XHU1MTY4XHVGRjA5XHVGRjFBXG4vLyAtIFx1NTNFQVx1NTJBOFwiXHU2NzJDXHU1RTkzXHU2RDNFXHU3NTFGXHU3QUVGXHU1M0UzXCJcdTRFMEFcdTc2ODRcdTY3MERcdTUyQTFcdUZGMENcdTdFRERcdTRFMERcdTc4QjBcdTUxNzZcdTRFRDZcdTVFOTNcdTc2ODRcdTdBRUZcdTUzRTNcdUZGMUJcbi8vIC0gXHU1M0VBXHU2NzQwXCJcdTc4NkVcdTVCOUVcdTY2MkYgZHNoIHdlYiBcdTRFMTRcdTc2RDFcdTU0MkNcdTY3MkNcdTdBRUZcdTUzRTNcIlx1NzY4NFx1OEZEQlx1N0EwQlx1RkYwOFx1NTQ3RFx1NEVFNFx1ODg0Q1x1OEVBQlx1NEVGRFx1NjgyMVx1OUE4Q1x1RkYwQ1x1OTYzMiBwaWQgXHU1OTBEXHU3NTI4XHU4QkVGXHU2NzQwXHVGRjA5XHVGRjFCXG4vLyAtIFx1NTNFQVx1Njc0MFx1NUI2NFx1NTEzRlx1RkYwOFBPU0lYOiBwcGlkPT0xXHVGRjFCV2luZG93czogXHU1NDJGXHU1MkE4XHU2NUY2XHU5NUY0XHU2NUU5XHU0RThFXHU2NzJDXHU2QjIxXHU0RjFBXHU4QkREXHVGRjA5XHVGRjBDXG4vLyAgIFx1NUY1M1x1NTI0RFx1NEYxQVx1OEJERFx1OTFDQ1x1NTE3Nlx1NEVENlx1N0E5N1x1NTNFM1x1NjJDOVx1OEQ3N1x1NzY4NFx1NkQzQlx1NjcwRFx1NTJBMVx1N0VERFx1NEUwRFx1NEYxQVx1ODhBQlx1OEJFRlx1Njc0MFx1MzAwMlxuXG5leHBvcnQgaW50ZXJmYWNlIERzaFBpZFJlY29yZCB7XG4gIHBpZDogbnVtYmVyXG4gIHBvcnQ6IG51bWJlclxuICB0czogbnVtYmVyXG59XG5cbi8qKiBQSUQgXHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0XHVGRjFBXHU2NTNFXHU1NzI4IHBlci12YXVsdCBcdTc2ODQgRFNIX0hPTUUgXHU5MUNDXHVGRjBDXHU5NjhGXHU1RTkzXHU5Njk0XHU3OUJCXHUzMDAxXHU5NjhGXHU0RjFBXHU4QkREXHU1RjUyXHU1QzVFICovXG5leHBvcnQgZnVuY3Rpb24gZHNoUGlkRmlsZVBhdGgoZHNoSG9tZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihkc2hIb21lLCAnLmRzaC1kb2NrLnBpZCcpXG59XG5cbi8qKiBcdThCQjBcdTVGNTVcdTY3MkNcdTZCMjEgc3Bhd24gXHU3Njg0XHU1QjUwXHU4RkRCXHU3QTBCXHVGRjA4XHU2NzBEXHU1MkExXHU1QzMxXHU3RUVBXHU1NDBFXHU4QzAzXHU3NTI4XHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVEc2hQaWRGaWxlKGRzaEhvbWU6IHN0cmluZywgcG9ydDogbnVtYmVyLCBwaWQ6IG51bWJlcik6IHZvaWQge1xuICB0cnkge1xuICAgIGZzLm1rZGlyU3luYyhkc2hIb21lLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgIGZzLndyaXRlRmlsZVN5bmMoZHNoUGlkRmlsZVBhdGgoZHNoSG9tZSksIEpTT04uc3RyaW5naWZ5KHsgcGlkLCBwb3J0LCB0czogRGF0ZS5ub3coKSB9KSlcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWRvY2tdIFx1NTE5OVx1NTE2NSBQSUQgXHU2NTg3XHU0RUY2XHU1OTMxXHU4RDI1JywgZXJyKVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkRHNoUGlkRmlsZShkc2hIb21lOiBzdHJpbmcpOiBEc2hQaWRSZWNvcmQgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBmcy5yZWFkRmlsZVN5bmMoZHNoUGlkRmlsZVBhdGgoZHNoSG9tZSksICd1dGY4JylcbiAgICBjb25zdCByZWMgPSBKU09OLnBhcnNlKHJhdykgYXMgUGFydGlhbDxEc2hQaWRSZWNvcmQ+XG4gICAgaWYgKHR5cGVvZiByZWMucGlkID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgcmVjLnBvcnQgPT09ICdudW1iZXInKSByZXR1cm4gcmVjIGFzIERzaFBpZFJlY29yZFxuICB9IGNhdGNoIHtcbiAgICAvKiBcdTY1RTBcdTY1ODdcdTRFRjZcdTYyMTZcdTYzNUZcdTU3NEYgXHUyMTkyIG51bGwgKi9cbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlRHNoUGlkRmlsZShkc2hIb21lOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBmcy51bmxpbmtTeW5jKGRzaFBpZEZpbGVQYXRoKGRzaEhvbWUpKVxuICB9IGNhdGNoIHtcbiAgICAvKiBpZ25vcmUgKi9cbiAgfVxufVxuXG4vKiogXHU4RkRCXHU3QTBCXHU2NjJGXHU1NDI2XHU1QjU4XHU2RDNCXHVGRjA4c2lnbmFsIDAgXHU2M0EyXHU2RDRCXHVGRjBDXHU4REU4XHU1RTczXHU1M0YwXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcm9jZXNzQWxpdmUocGlkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBwcm9jZXNzLmtpbGwocGlkLCAwKVxuICAgIHJldHVybiB0cnVlXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbi8qKiBcdThCRTUgcGlkIFx1NzY4NFx1OEZEQlx1N0EwQlx1NTQ3RFx1NEVFNFx1ODg0Q1x1NjYyRlx1NTQyNlx1NUMzMVx1NjYyRlx1NzZEMVx1NTQyQyA8cG9ydD4gXHU3Njg0IGRzaCB3ZWJcdUZGMDhcdTk2MzIgcGlkIFx1NTkwRFx1NzUyOFx1OEJFRlx1Njc0MFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRHNoV2ViT25Qb3J0KHBpZDogbnVtYmVyLCBwb3J0OiBudW1iZXIpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKCd3bWljJywgWydwcm9jZXNzJywgJ3doZXJlJywgYHByb2Nlc3NpZD0ke3BpZH1gLCAnZ2V0JywgJ2NvbW1hbmRsaW5lJ10sIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgICAgd2luZG93c0hpZGU6IHRydWUsXG4gICAgICB9KVxuICAgICAgY29uc3QgY21kID0gb3V0LnN0ZG91dCB8fCAnJ1xuICAgICAgcmV0dXJuIGNtZC5pbmNsdWRlcygnZHNoJykgJiYgY21kLmluY2x1ZGVzKGAtLXBvcnQgJHtwb3J0fWApXG4gICAgfVxuICAgIGNvbnN0IG91dCA9IHNwYXduU3luYygncHMnLCBbJy13dycsICctbycsICdjb21tYW5kPScsICctcCcsIFN0cmluZyhwaWQpXSwge1xuICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgfSlcbiAgICBjb25zdCBjbWQgPSAob3V0LnN0ZG91dCB8fCAnJykudHJpbSgpXG4gICAgcmV0dXJuIGNtZC5pbmNsdWRlcygnZHNoJykgJiYgY21kLmluY2x1ZGVzKGAtLXBvcnQgJHtwb3J0fWApXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbi8qKiBQT1NJWDogXHU4QkZCXHU1M0Q2XHU4RkRCXHU3QTBCXHU3MjM2IHBpZFx1RkYxQlx1NTkzMVx1OEQyNVx1OEZENFx1NTZERSAtMSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NQcGlkKHBpZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXQgPSBzcGF3blN5bmMoJ3BzJywgWyctbycsICdwcGlkPScsICctcCcsIFN0cmluZyhwaWQpXSwgeyBlbmNvZGluZzogJ3V0ZjgnLCB0aW1lb3V0OiA1MDAwIH0pXG4gICAgY29uc3QgcHBpZCA9IHBhcnNlSW50KChvdXQuc3Rkb3V0IHx8ICcnKS50cmltKCksIDEwKVxuICAgIHJldHVybiBOdW1iZXIuaXNGaW5pdGUocHBpZCkgPyBwcGlkIDogLTFcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbn1cblxuLyoqXG4gKiBcdTVCNjRcdTUxM0ZcdTUyMjRcdTVCOUFcdUZGMUFcbiAqIC0gUE9TSVhcdUZGMUFcdTVCNjRcdTUxM0ZcdTg4QUIgcmVwYXJlbnQgXHU1MjMwIGxhdW5jaGRcdUZGMENwcGlkID09PSAxXHVGRjA4XHU4REU4XHU0RjFBXHU4QkREXHU1MjI0XHU1QjlBXHU2NzAwXHU1M0VGXHU5NzYwXHVGRjA5XHVGRjFCXG4gKiAtIFdpbmRvd3NcdUZGMUFcdTY1RTAgcmVwYXJlbnQgXHU4QkVEXHU0RTQ5XHVGRjBDXHU5MDAwXHU1NkRFXCJcdThGREJcdTdBMEJcdTU0MkZcdTUyQThcdTY1RTlcdTRFOEVcdTY3MkNcdTZCMjEgT2JzaWRpYW4gXHU0RjFBXHU4QkREXCJcdUZGMDhQSUQgXHU2NTg3XHU0RUY2IHRzXHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09ycGhhblBpZChwaWQ6IG51bWJlciwgcGlkRmlsZVRzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICByZXR1cm4gcGlkRmlsZVRzIDwgRGF0ZS5ub3coKSAtIHByb2Nlc3MudXB0aW1lKCkgKiAxMDAwXG4gIH1cbiAgcmV0dXJuIHByb2Nlc3NQcGlkKHBpZCkgPT09IDFcbn1cblxuLyoqIFx1NjMwOSBwaWQgXHU1MDVDXHU2QjYyXHVGRjFBU0lHVEVSTSBcdTIxOTIgXHU4RDg1XHU2NUY2IFNJR0tJTExcdUZGMDhQT1NJWFx1RkYwOVx1RkYxQldpbmRvd3MgXHU3NTI4IHRhc2traWxsIC9GICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RvcFByb2Nlc3NCeVBpZChwaWQ6IG51bWJlciwgdGltZW91dE1zID0gMzAwMCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIWlzUHJvY2Vzc0FsaXZlKHBpZCkpIHJldHVyblxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHRyeSB7XG4gICAgICBzcGF3blN5bmMoJ3Rhc2traWxsJywgWycvUElEJywgU3RyaW5nKHBpZCksICcvVCcsICcvRiddLCB7IHdpbmRvd3NIaWRlOiB0cnVlIH0pXG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcHJvY2Vzcy5raWxsKHBpZCwgJ1NJR0tJTEwnKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH0sIHRpbWVvdXRNcylcbiAgICBjb25zdCBwb2xsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKCFpc1Byb2Nlc3NBbGl2ZShwaWQpKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwocG9sbClcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICByZXNvbHZlKClcbiAgICAgIH1cbiAgICB9LCAxMDApXG4gICAgdHJ5IHtcbiAgICAgIHByb2Nlc3Mua2lsbChwaWQsICdTSUdURVJNJylcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwocG9sbClcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH1cbiAgfSlcbn1cblxuLyoqXG4gKiBcdTU0MkZcdTUyQThcdTUyNERcdTVCNjRcdTUxM0ZcdTZFMDVcdTYyNkJcdTMwMDJcdThGRDRcdTU2REVcdTY2MkZcdTU0MjZcdTZFMDVcdTc0MDZcdTRFODZcdTZCOEJcdTc1NTlcdTY3MERcdTUyQTFcdTMwMDJcbiAqXG4gKiAxLiBQSUQgXHU2NTg3XHU0RUY2XHU1NDdEXHU0RTJEIFx1MjE5MiBcdTY4MjFcdTlBOENcdTU0N0RcdTRFRTRcdTg4NENcdThFQUJcdTRFRkRcdUZGMDhkc2ggd2ViIC0tcG9ydCA8cG9ydD5cdUZGMDlcdTIxOTIgXHU1QjY0XHU1MTNGXHU1MjE5XHU2NzQwXHU2Mzg5XHVGRjFCXG4gKiAyLiBcdTY1RTAgUElEIFx1NjU4N1x1NEVGNlx1RkYwOFx1NjVFN1x1NzI0OFx1NTM0N1x1N0VBNy9cdTY1ODdcdTRFRjZcdTRFMjJcdTU5MzFcdUZGMDlcdTIxOTIgcGdyZXAgXHU2MzA5XHU3QUVGXHU1M0UzXHU1M0NEXHU2N0U1IFx1MjE5MiBcdTU0MENcdTY4MzdcdTY4MjFcdTlBOENcdTU0MEVcdTZFMDVcdTc0MDZcdTMwMDJcbiAqXG4gKiBcdTUzRUFcdTZFMDVcdTc0MDZcIlx1NzZEMVx1NTQyQ1x1NjcyQ1x1N0FFRlx1NTNFM1x1NEUxNFx1NzIzNlx1OEZEQlx1N0EwQlx1NURGMlx1NEUwRFx1NTcyOFwiXHU3Njg0IGRzaCB3ZWJcdUZGMUJcdTVGNTNcdTUyNERcdTRGMUFcdThCRERcdTUxNzZcdTRFRDZcdTdBOTdcdTUzRTNcdTYyQzlcdThENzdcdTc2ODRcbiAqIFx1NkQzQlx1NjcwRFx1NTJBMSBwcGlkICE9IDFcdUZGMENcdTdFRERcdTRFMERcdTRGMUFcdTg4QUJcdThCRUZcdTY3NDBcdTMwMDJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN3ZWVwT3JwaGFuRHNoKGRzaEhvbWU6IHN0cmluZywgcG9ydDogbnVtYmVyKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBuZXcgU2V0PG51bWJlcj4oKVxuICBjb25zdCByZWMgPSByZWFkRHNoUGlkRmlsZShkc2hIb21lKVxuICBpZiAocmVjICYmIHJlYy5wb3J0ID09PSBwb3J0ICYmIGlzUHJvY2Vzc0FsaXZlKHJlYy5waWQpICYmIGlzRHNoV2ViT25Qb3J0KHJlYy5waWQsIHBvcnQpKSB7XG4gICAgY2FuZGlkYXRlcy5hZGQocmVjLnBpZClcbiAgfVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gJ3dpbjMyJykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBvdXQgPSBzcGF3blN5bmMoJ3BncmVwJywgWyctZicsIGBkc2guKi0tcG9ydCAke3BvcnR9YF0sIHsgZW5jb2Rpbmc6ICd1dGY4JywgdGltZW91dDogNTAwMCB9KVxuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIChvdXQuc3Rkb3V0IHx8ICcnKS5zcGxpdCgvXFxzKy8pKSB7XG4gICAgICAgIGNvbnN0IHBpZCA9IHBhcnNlSW50KGxpbmUsIDEwKVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHBpZCkgJiYgcGlkID4gMCAmJiBpc0RzaFdlYk9uUG9ydChwaWQsIHBvcnQpKSBjYW5kaWRhdGVzLmFkZChwaWQpXG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gIH1cbiAgbGV0IHN3ZXB0ID0gZmFsc2VcbiAgZm9yIChjb25zdCBwaWQgb2YgY2FuZGlkYXRlcykge1xuICAgIGlmICghaXNPcnBoYW5QaWQocGlkLCByZWM/LnRzID8/IDApKSBjb250aW51ZVxuICAgIGNvbnNvbGUud2FybihgW2RzaC1kb2NrXSBcdTZFMDVcdTc0MDZcdTVCNjRcdTUxM0YgZHNoIHdlYiAocGlkPSR7cGlkfSwgcG9ydD0ke3BvcnR9KWApXG4gICAgYXdhaXQgc3RvcFByb2Nlc3NCeVBpZChwaWQpXG4gICAgc3dlcHQgPSB0cnVlXG4gIH1cbiAgaWYgKHN3ZXB0KSByZW1vdmVEc2hQaWRGaWxlKGRzaEhvbWUpXG4gIHJldHVybiBzd2VwdFxufVxuIiwgIi8qKlxuICogXHU4QkJFXHU3RjZFXHVGRjFBXHU1QjU3XHU2QkI1ICsgXHU4QkJFXHU3RjZFXHU5ODc1IFVJXHUzMDAyXG4gKiBWMC4yXHVGRjFBRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHVGRjA4XHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQiAvIFx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiAvIFx1ODFFQVx1NUI5QVx1NEU0OVx1RkYwOVx1RkYwQ1x1OUVEOFx1OEJBNCBwZXItdmF1bHRcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgdHlwZSBEc2hIb21lTW9kZSA9ICdzaGFyZWQnIHwgJ3Blci12YXVsdCcgfCAnY3VzdG9tJ1xuXG5leHBvcnQgaW50ZXJmYWNlIERzaERvY2tTZXR0aW5ncyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW46IHN0cmluZ1xuICAvKiogTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTlcdUZGMDhcdTdDRkJcdTdFREYgbm9kZSBcdTRGMThcdTUxNDhcdUZGMDkgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkMgaG9zdFx1RkYwOFx1OUVEOFx1OEJBNFx1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1NUI5OFx1NjVCOVx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ6IG51bWJlclxuICAvKiogRFNIX0hPTUUgXHU2QTIxXHU1RjBGXHVGRjFBcGVyLXZhdWx0PVx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMDhcdTlFRDhcdThCQTRcdUZGMDlcdUZGMUJzaGFyZWQ9XHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYxQmN1c3RvbT1cdTgxRUFcdTVCOUFcdTRFNDkgKi9cbiAgZHNoSG9tZU1vZGU6IERzaEhvbWVNb2RlXG4gIC8qKiBcdTgxRUFcdTVCOUFcdTRFNDkgRFNIX0hPTUUgXHU4REVGXHU1Rjg0XHVGRjA4XHU0RUM1IGN1c3RvbSBcdTZBMjFcdTVGMEZcdTc1MUZcdTY1NDhcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKiBcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZTogYm9vbGVhblxuICAvKiogT2JzaWRpYW4gXHU1NDJGXHU1MkE4XHU2NUY2XHU4MUVBXHU1MkE4XHU2MkM5XHU4RDc3IERTSCAqL1xuICBhdXRvc3RhcnQ6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IERzaERvY2tTZXR0aW5ncyA9IHtcbiAgZHNoQmluOiAnJyxcbiAgbm9kZUJpbjogJycsXG4gIGhvc3Q6ICcxMjcuMC4wLjEnLFxuICBwb3J0OiAzMDgwLFxuICBkc2hIb21lTW9kZTogJ3Blci12YXVsdCcsXG4gIGRzaEhvbWU6ICcnLFxuICB1c2VFbWJlZGRlZE5vZGU6IGZhbHNlLFxuICBhdXRvc3RhcnQ6IHRydWUsXG59XG5cbmV4cG9ydCBjbGFzcyBEc2hEb2NrU2V0dGluZ3NUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcHJpdmF0ZSBjdXN0b21Ib21lRWw/OiBTZXR0aW5nXG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSBwbHVnaW46IERzaERvY2tQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKVxuICB9XG5cbiAgb3ZlcnJpZGUgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzXG4gICAgY29udGFpbmVyRWwuZW1wdHkoKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY5ODJcdTg5QzggLS0tLS0tLS0tLVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge1xuICAgICAgY2xzOiAnZHNoLWRvY2stc2V0dGluZ3MtZGVzYycsXG4gICAgICB0ZXh0OiAnXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgV2ViIFx1NTA1Q1x1OTc2MFx1OEZEQiBPYnNpZGlhblx1RkYxQVx1NUI5QVx1NEY0RCBkc2ggXHUyMTkyIFx1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0QyBcdTIxOTIgXHU5NzYyXHU2NzdGXHU1RDRDXHU1MTY1XHUzMDAyXHU1Qjk4XHU2NUI5XHU1MzlGXHU3NTFGXHVGRjBDXHU1Qjk4XHU2NUI5IFVJIFx1NTM5Rlx1NjgzN1x1NUQ0Q1x1NTE2NVx1MzAwMicsXG4gICAgfSlcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXNldHRpbmdzLWRlc2MnLFxuICAgICAgdGV4dDogJ1x1RDgzRVx1REQxRCBcdTRFMEUgZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHQgXHU3M0UwXHU4MDU0XHU3NEE3XHU1NDA4XHVGRjFBXHU5MTREXHU1NDA4IERTSCBcdTRGQTdcdTc2ODQgMTYgXHU0RTJBIHZhdWx0XyogXHU1REU1XHU1MTc3XHVGRjBDXHU1RjAwXHU3QkIxXHU1MzczXHU3NTI4XHUzMDBDT2JzaWRpYW4gXHU1MTg1IEFnZW50IFx1N0IxNFx1OEJCMFx1NURFNVx1NEY1Q1x1NkQ0MVx1MzAwRFx1MjAxNFx1MjAxNFx1OTc2Mlx1Njc3Rlx1OTFDQ1x1NzZGNFx1NjNBNVx1OEJGNFwiXHU4QkZCXHU0RTAwXHU0RTBCXHU0RUNBXHU1OTI5XHU3Njg0XHU3QjE0XHU4QkIwXCJcdUZGMENBZ2VudCBcdTgxRUFcdTUyQThcdTVCOUFcdTRGNERcdTVGNTNcdTUyNERcdTVFOTNcdThCRkJcdTUxOTlcdTMwMDInLFxuICAgIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjcwRFx1NTJBMVx1NjNBN1x1NTIzNiAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1NjcwRFx1NTJBMScpLnNldEhlYWRpbmcoKVxuICAgIGNvbnN0IHN0YXR1c0xpbmUgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTY3MERcdTUyQTFcdTcyQjZcdTYwMDEnKVxuICAgICAgLnNldERlc2ModGhpcy5kZXNjcmliZVN0YXR1cygpKVxuICAgIGNvbnN0IGJ0bnMgPSBzdGF0dXNMaW5lLmNvbnRyb2xFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1idG5zJyB9KVxuICAgIGNvbnN0IHN0YXJ0QnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdtb2QtY3RhJywgdGV4dDogJ1x1MjVCNiBcdTU0MkZcdTUyQTgnIH0pXG4gICAgc3RhcnRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMuZGlzcGxheSgpKVxuICAgIH1cbiAgICBjb25zdCBzdG9wQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHUyNUEwIFx1NTA1Q1x1NkI2MicgfSlcbiAgICBzdG9wQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0b3AoKS50aGVuKCgpID0+IHRoaXMuZGlzcGxheSgpKVxuICAgIH1cbiAgICBjb25zdCBvcGVuQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJyB9KVxuICAgIG9wZW5CdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlblBhbmVsKClcbiAgICB9XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTk2OEYgT2JzaWRpYW4gXHU4MUVBXHU1MkE4XHU1NDJGXHU1MkE4JylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b3N0YXJ0KS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU4RkQwXHU4ODRDXHU2NUY2IC0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnXHU4RkQwXHU4ODRDXHU2NUY2Jykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnZHNoIENMSSBcdThERUZcdTVGODQnKVxuICAgICAgLnNldERlc2MoJ1x1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0Qlx1RkYwOERTSF9CSU4gXHUyMTkyIG5wbSByb290IC1nIFx1MjE5MiBcdTVFMzhcdTg5QzFcdTUxNjhcdTVDNDBcdTc2RUVcdTVGNTVcdUZGMDlcdTMwMDJcdTUzRUZcdTU4NkIgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1NjIxNiBiaW4uanMgXHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9saWIvbm9kZV9tb2R1bGVzL0BkZWVwc2Vlay1haS9kc2gnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hCaW4gPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuZGV0ZWN0TGluZSA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ05vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTkwMDlcdTYyRTlcdUZGMDhcdTdDRkJcdTdFREYgbm9kZSBcdTY3MDBcdTdBMzNcdTVCOUFcdUZGMDlcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ1x1NEY4Qlx1NTk4MiAvb3B0L2hvbWVicmV3L2Jpbi9ub2RlJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mubm9kZUJpbilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4gPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlJylcbiAgICAgIC5zZXREZXNjKCdFTEVDVFJPTl9SVU5fQVNfTk9ERVx1MzAwMlx1OUVEOFx1OEJBNFx1NTE3M1x1OTVFRFx1MjAxNFx1MjAxNFx1NUI5RVx1NkQ0QiBPYnNpZGlhbiBcdTRFOENcdThGREJcdTUyMzZcdTRFRTUgTm9kZSBcdTZBMjFcdTVGMEZcdThGRDBcdTg4NENcdTRGMUFcdTYzMDJcdThENzdcdUZGMENcdTRFQzVcdTU3MjhcdTlBOENcdThCQzFcdTUzRUZcdTc1MjhcdTY1RjZcdTVGMDBcdTU0MkZcdTMwMDInKVxuICAgICAgLmFkZFRvZ2dsZSgodCkgPT5cbiAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlID0gdlxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgdGhpcy5kZXRlY3RMaW5lLnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURldGVjdCgpXG4gICAgICAgIH0pLFxuICAgICAgKVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTdGNTFcdTdFREMgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdcdTdGNTFcdTdFREMnKS5zZXRIZWFkaW5nKClcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTU3RkFcdTUxQzZcdUZGMDknKVxuICAgICAgLnNldERlc2MoJ1x1NUI5OFx1NjVCOVx1OUVEOFx1OEJBNCAzMDgwXHUzMDAyc2hhcmVkL2N1c3RvbSBcdTZBMjFcdTVGMEZcdTc2RjRcdTYzQTVcdTRGN0ZcdTc1MjhcdUZGMUJwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU1NzI4XHU2QjY0XHU1N0ZBXHU3ODQwXHU0RTBBXHU2MzA5IHZhdWx0IFx1NkQzRVx1NzUxRlx1NzJFQ1x1N0FDQlx1N0FFRlx1NTNFM1x1RkYwOFx1NkJDRiB2YXVsdCBcdTcyRUNcdTUzNjBcdUZGMENcdTRGMUFcdThCRERcdTRFOTJcdTRFMERcdTUzRUZcdTg5QzFcdUZGMDlcdTMwMDInKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJzMwODAnKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuID0gTnVtYmVyKHYudHJpbSgpKVxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucG9ydCA9IE51bWJlci5pc0ludGVnZXIobikgJiYgbiA+PSAwICYmIG4gPD0gNjU1MzUgPyBuIDogMzA4MFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMubmV0UHJldmlldyA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1IC0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1XHVGRjA4RFNIX0hPTUVcdUZGMDlcdTRFMEVcdTRGMUFcdThCRERcdTk2OTRcdTc5QkInKS5zZXRIZWFkaW5nKClcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTZBMjFcdTVGMEYnKVxuICAgICAgLnNldERlc2MoJ3Blci12YXVsdCBcdTZBMjFcdTVGMEYgPSBcdTRGMUFcdThCRERcdTYzMDlcdTVFOTNcdTk2OTRcdTc5QkJcdUZGMDhcdTU0MDRcdTVFOTNcdTk3NjJcdTY3N0ZcdTUzRUFcdTY2M0VcdTc5M0FcdTY3MkNcdTVFOTNcdTUyMUJcdTVFRkFcdTc2ODRcdTRGMUFcdThCRERcdUZGMDlcdUZGMENcdTRGNDZcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1N0Y2RVx1NEUwRVx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1NTE2OFx1NUM0MFx1NTE3MVx1NEVBQlx1NEUwMFx1NEVGRFx1RkYwQ1x1OTE0RFx1NEUwMFx1NkIyMVx1NTE2OFx1NUU5M1x1NzUxRlx1NjU0OFx1MzAwMicpXG4gICAgICAuYWRkRHJvcGRvd24oKGRkKSA9PiB7XG4gICAgICAgIGRkLmFkZE9wdGlvbigncGVyLXZhdWx0JywgJ1x1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkJcdTRGMUFcdThCREQgfi8uZHNoL3ZhdWx0cy88XHU1NDBEPi08aGFzaD5cdUZGMDhcdTlFRDhcdThCQTRcdUZGMUJcdTkxNERcdTdGNkVcdTRFMEVcdTYzRDJcdTRFRjZcdTRFQ0RcdTUxNzFcdTRFQUJcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ3NoYXJlZCcsICdcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjA4XHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NEUwMFx1NTk1N1x1OTE0RFx1N0Y2RVx1MzAwMVx1NjNEMlx1NEVGNlx1NEUwRVx1NEYxQVx1OEJERFx1RkYwOScpXG4gICAgICAgIGRkLmFkZE9wdGlvbignY3VzdG9tJywgJ1x1ODFFQVx1NUI5QVx1NEU0OVx1OERFRlx1NUY4NCcpXG4gICAgICAgIGRkLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlKVxuICAgICAgICBkZC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlID0gdiBhcyBEc2hIb21lTW9kZVxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgdGhpcy5jdXN0b21Ib21lRWw/LnNldERpc2FibGVkKHYgIT09ICdjdXN0b20nKVxuICAgICAgICAgIHRoaXMuaG9tZVByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRHNoSG9tZSgpXG4gICAgICAgICAgdGhpcy5uZXRQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZU5ldCgpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgdGhpcy5jdXN0b21Ib21lRWwgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTgxRUFcdTVCOUFcdTRFNDkgRFNIX0hPTUUgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL1VzZXJzL3lvdS8uZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUgPSB2LnRyaW0oKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgICAgIHRoaXMuaG9tZVByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRHNoSG9tZSgpXG4gICAgICAgICAgfSksXG4gICAgICApXG4gICAgdGhpcy5jdXN0b21Ib21lRWwuc2V0RGlzYWJsZWQodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGUgIT09ICdjdXN0b20nKVxuXG4gICAgdGhpcy5ob21lUHJldmlldyA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWRldGVjdCcgfSlcblxuICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgIHRoaXMuaG9tZVByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRHNoSG9tZSgpXG4gICAgdGhpcy5uZXRQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZU5ldCgpXG4gIH1cblxuICBwcml2YXRlIGRldGVjdExpbmUhOiBIVE1MRWxlbWVudFxuICBwcml2YXRlIGhvbWVQcmV2aWV3ITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBuZXRQcmV2aWV3ITogSFRNTEVsZW1lbnRcblxuICBwcml2YXRlIGRlc2NyaWJlU3RhdHVzKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICByZXR1cm4gYCR7cy51cmx9XHVGRjA4JHtzLmF0dGFjaGVkID8gJ1x1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnXHU1QjUwXHU4RkRCXHU3QTBCXHU4RkQwXHU4ODRDXHU0RTJEJ31cdUZGMDlgXG4gICAgfVxuICAgIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHJldHVybiAnXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2XHVGRjA4XHU5OTk2XHU2QjIxXHU3RUE2IDEwIFx1NzlEMlx1RkYwQ1x1OTcwMFx1NTIxRFx1NTlDQlx1NTMxNiBwcm9maWxlXHVGRjA5J1xuICAgIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHJldHVybiBgXHU1OTMxXHU4RDI1OiAke3MubWVzc2FnZX1gXG4gICAgcmV0dXJuICdcdTY3MkFcdThGRDBcdTg4NEMnXG4gIH1cblxuICBwcml2YXRlIGRlc2NyaWJlRGV0ZWN0KCk6IHN0cmluZyB7XG4gICAgY29uc3QgaW5mbyA9IHRoaXMucGx1Z2luLmRldGVjdEluZm8oKVxuICAgIHJldHVybiBbXG4gICAgICBgZHNoOiAke2luZm8uZHNoQmluID8/ICdcdTY3MkFcdTYyN0VcdTUyMzAnfSR7aW5mby5kc2hOb3Rlcy5sZW5ndGggPyBgXHVGRjA4JHtpbmZvLmRzaE5vdGVzLmpvaW4oJ1x1RkYxQicpfVx1RkYwOWAgOiAnJ31gLFxuICAgICAgYG5vZGU6ICR7aW5mby5ub2RlTm90ZXMuam9pbignXHVGRjFCJyl9YCxcbiAgICBdLmpvaW4oJ1xcbicpXG4gIH1cblxuICBwcml2YXRlIGRlc2NyaWJlRHNoSG9tZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGhvbWUgPSB0aGlzLnBsdWdpbi5lZmZlY3RpdmVEc2hIb21lKClcbiAgICBjb25zdCBzaGFyZWQgPSB0aGlzLnBsdWdpbi5lZmZlY3RpdmVTaGFyZWRDb25maWdSb290KClcbiAgICBpZiAoc2hhcmVkKSB7XG4gICAgICByZXR1cm4gYFx1NEYxQVx1OEJERFx1NzZFRVx1NUY1NTogJHtob21lfVxcblx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQjogJHtzaGFyZWR9XHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjhcdTVFOTNcdTc1MUZcdTY1NDhcdUZGMDlgXG4gICAgfVxuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU4REVGXHU1Rjg0OiAke2hvbWV9YFxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZU5ldCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBvcnQgPSB0aGlzLnBsdWdpbi5lZmZlY3RpdmVQb3J0KClcbiAgICBjb25zdCBtb2RlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoSG9tZU1vZGVcbiAgICBjb25zdCBzdWZmaXggPSBtb2RlID09PSAncGVyLXZhdWx0JyA/ICdcdUZGMDhcdTY3MkMgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RTBFXHU1MTc2XHU0RUQ2IHZhdWx0IFx1OTY5NFx1NzlCQlx1RkYwOScgOiAnXHVGRjA4c2hhcmVkL2N1c3RvbVx1RkYxQVx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdUZGMDknXG4gICAgcmV0dXJuIGBcdTc1MUZcdTY1NDhcdTdBRUZcdTUzRTM6ICR7cG9ydH0ke3N1ZmZpeH1gXG4gIH1cbn1cbiIsICIvKipcbiAqIERzaFdlYlZpZXcgXHUyMDE0XHUyMDE0IFx1NjI4QVx1NUI5OFx1NjVCOSBEU0ggV2ViICgxMjcuMC4wLjE6PHBvcnQ+KSBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW4gXHU5NzYyXHU2NzdGXHUzMDAyXG4gKiBcdTVFMjZcdTVCOENcdTY1NzRcdThGQzdcdTdBMEJcdTcyQjZcdTYwMDFcdUZGMUFcdTUyQTBcdThGN0RcdTUyQThcdTc1M0IgLyBcdTk1MTlcdThCRUZcdTUzNjFcdTcyNDdcdUZGMDhcdTU0MkJcdTkxQ0RcdThCRDVcdUZGMDkvIFx1NjcyQVx1NTQyRlx1NTJBOFx1N0E3QVx1NzJCNlx1NjAwMVx1MzAwMlxuICogaWZyYW1lIFx1NjMwN1x1NTQxMVx1NUI5OFx1NjVCOVx1NjcwRFx1NTJBMVx1RkYwQ1VJIFx1NTNFQVx1NjYyRlwiXHU4MjM5XHU1NzVFXCJcdTU5MTZcdTU4RjNcdUZGMUJcdTVERTVcdTUxNzdcdTY4MEZcdTUyQThcdTRGNUNcdThENzAgT2JzaWRpYW4gXHU1MzlGXHU3NTFGXG4gKiBcdTY4MDdcdTk4OThcdTY4MEZcdUZGMDhJdGVtVmlldy5hZGRBY3Rpb25cdUZGMDlcdTRFMEVcdTUzRjNcdTk1MkVcdTgzRENcdTUzNTVcdUZGMDhvblBhbmVNZW51XHVGRjA5XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24sIHR5cGUgTWVudSB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCBjb25zdCBEU0hfV0VCX1ZJRVdfVFlQRSA9ICdkc2gtZG9jay13ZWInXG5cbnR5cGUgVWlTdGF0ZSA9ICdydW5uaW5nJyB8ICdzdGFydGluZycgfCAnZXJyb3InIHwgJ3N0b3BwZWQnXG5cbmV4cG9ydCBjbGFzcyBEc2hXZWJWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwcml2YXRlIGlmcmFtZUVsOiBIVE1MSUZyYW1lRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgcGlsbEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgb3ZlcmxheUVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIC8qKiBcdTY4MDdcdTk4OThcdTY4MEZcIlx1NTQyRlx1NTJBOC9cdTUwNUNcdTZCNjJcIlx1NTJBOFx1NEY1Q1x1NjMwOVx1OTRBRVx1RkYwOGFkZEFjdGlvbiBcdThGRDRcdTU2REVcdTc2ODRcdTUxNDNcdTdEMjBcdUZGMENcdTU2RkVcdTY4MDdcdTk2OEZcdTcyQjZcdTYwMDFcdTUyMDdcdTYzNjJcdUZGMDkgKi9cbiAgcHJpdmF0ZSB0b2dnbGVBY3Rpb25FbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIGN1cnJlbnQ6IFVpU3RhdGUgPSAnc3RvcHBlZCdcblxuICBjb25zdHJ1Y3RvcihcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihsZWFmKVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gRFNIX1dFQl9WSUVXX1RZUEVcbiAgfVxuXG4gIG92ZXJyaWRlIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdEU0ggRG9jaydcbiAgfVxuXG4gIG92ZXJyaWRlIGdldEljb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ2FuY2hvcidcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2snIH0pXG5cbiAgICAvLyAtLS0tIFx1NTkzNFx1OTBFOFx1RkYxQVx1NEVDNVx1NEZERFx1NzU1OSBsb2dvICsgXHU2ODA3XHU5ODk4ICsgXHU3MkI2XHU2MDAxIHBpbGxcdUZGMDhcdTUyQThcdTRGNUNcdTUxNjhcdTkwRThcdThENzBcdTY4MDdcdTk4OThcdTY4MEYvXHU1M0YzXHU5NTJFXHU4M0RDXHU1MzU1XHVGRjA5IC0tLS1cbiAgICBjb25zdCBoZWFkZXIgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWhlYWRlcicgfSlcbiAgICBjb25zdCBsb2dvID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWxvZ28nIH0pXG4gICAgc2V0SWNvbihsb2dvLCAnYW5jaG9yJylcbiAgICBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXRpdGxlJywgdGV4dDogJ0RTSCBEb2NrJyB9KVxuICAgIHRoaXMucGlsbEVsID0gaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay1waWxsJyB9KVxuICAgIGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGFjZXInIH0pXG5cbiAgICAvLyBENVx1RkYxQVx1NURFNVx1NTE3N1x1NjgwRlx1NTJBOFx1NEY1Q1x1OEZEQiBPYnNpZGlhbiBcdTUzOUZcdTc1MUZcdTY4MDdcdTk4OThcdTY4MEZcdUZGMDhJdGVtVmlldy5hZGRBY3Rpb24sIG9ic2lkaWFuLmQudHM6MzYwNFx1RkYwOVx1RkYwQ1xuICAgIC8vIFx1NTkxQVx1OTc2Mlx1Njc3Rlx1ODFFQVx1NTJBOFx1ODNCN1x1NUY5N1x1RkYxQmFkZEFjdGlvbiBcdThGRDRcdTU2REVcdTYzMDlcdTk0QUVcdTUxNDNcdTdEMjBcdUZGMENcdTU0MkZcdTUyQTgvXHU1MDVDXHU2QjYyXHU1NkZFXHU2ODA3XHU5NjhGXHU3MkI2XHU2MDAxXHU1MjA3XHU2MzYyXHUzMDAyXG4gICAgdGhpcy50b2dnbGVBY3Rpb25FbCA9IHRoaXMuYWRkQWN0aW9uKCdwbGF5JywgJ1x1NTQyRlx1NTJBOCcsICgpID0+IHZvaWQgdGhpcy5vblRvZ2dsZSgpKVxuICAgIHRoaXMuYWRkQWN0aW9uKCdyZWZyZXNoLWN3JywgJ1x1NTIzN1x1NjVCMCcsICgpID0+IHRoaXMucmVsb2FkKCkpXG4gICAgdGhpcy5hZGRBY3Rpb24oJ21heGltaXplLTInLCAnXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4XHU3MkVDXHU3QUNCXHU4RkRCXHU3QTBCXHVGRjBDXHU2MDI3XHU4MEZEXHU3QjQ5XHU1NDBDXHU2RDRGXHU4OUM4XHU1NjY4XHVGRjA5JywgKCkgPT4gdm9pZCB0aGlzLnBsdWdpbi5vcGVuUG9wb3V0KCkpXG4gICAgdGhpcy5hZGRBY3Rpb24oJ2V4dGVybmFsLWxpbmsnLCAnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJywgKCkgPT4gdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKCkpXG5cbiAgICAvLyAtLS0tIFx1NEUzQlx1NEY1M1x1RkYxQWlmcmFtZSArIFx1NzJCNlx1NjAwMVx1ODk4Nlx1NzZENlx1NUM0MiAtLS0tXG4gICAgY29uc3QgYm9keSA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYm9keScgfSlcbiAgICAvLyBENFx1RkYxQVx1NjYzRVx1NUYwRiBzYW5kYm94IFx1NzY3RFx1NTQwRFx1NTM1NVx1RkYwOGFsbG93LXNjcmlwdHMgKyBhbGxvdy1zYW1lLW9yaWdpbiBcdTRGOUIgU1BBIFx1NzUyOFxuICAgIC8vIGxvY2FsU3RvcmFnZVx1RkYwQ2FsbG93LWZvcm1zL21vZGFscy9wb3B1cHMgXHU4OTg2XHU3NkQ2XHU3NjdCXHU1RjU1L1x1NUYzOVx1N0E5N1x1NTczQVx1NjY2Rlx1RkYxQlx1NEVDNVx1NTZERVx1NzNBRlx1NTNFRlx1NEZFMVxuICAgIC8vIFx1NjcwRFx1NTJBMVx1RkYwQ1x1NEY0Nlx1NjYzRVx1NUYwRlx1NThGMFx1NjYwRVx1NjYyRlx1ODlDNFx1ODMwM1x1ODk4MVx1NkM0Mlx1RkYwQ0N1c3RvbSBGcmFtZXMgXHU1NDBDXHU2QjNFXHVGRjA5XHUzMDAyXG4gICAgdGhpcy5pZnJhbWVFbCA9IGJvZHkuY3JlYXRlRWwoJ2lmcmFtZScsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLWZyYW1lJyxcbiAgICAgIGF0dHI6IHsgc2FuZGJveDogJ2FsbG93LXNjcmlwdHMgYWxsb3ctc2FtZS1vcmlnaW4gYWxsb3ctZm9ybXMgYWxsb3ctbW9kYWxzIGFsbG93LXBvcHVwcycgfSxcbiAgICB9KVxuICAgIHRoaXMub3ZlcmxheUVsID0gYm9keS5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1vdmVybGF5JyB9KVxuXG4gICAgLy8gXHU3MkI2XHU2MDAxXHU4MDU0XHU1MkE4XG4gICAgdGhpcy5wbHVnaW4ub25TdGF0dXNDaGFuZ2UoKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgdGhpcy5yZWZyZXNoKClcblxuICAgIC8vIFx1NTE1Q1x1NUU5NVx1RkYxQVx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1ODJFNVx1NjcwRFx1NTJBMVx1NjcyQVx1NTQyRlx1NTJBOFx1NEUxNFx1N0FFRlx1NTNFM1x1NTNFRlx1NzUyOFx1RkYwQ1x1NUMxRFx1OEJENVx1NjJDOVx1OEQ3N1xuICAgIHZvaWQgdGhpcy5lbnN1cmVTdGFydGVkKClcblxuICAgIC8vIFx1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3Rlx1NjVGNlx1NTIzN1x1NjVCMFx1NEUwMFx1NkIyMVx1NUY1M1x1NTI0RCB2YXVsdCBcdTY4MDdcdThCQjBcdUZGMUFcdTc1MjhcdTYyMzdcdTZCNjRcdTUyM0JcdTZCNjNcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1NzY4NFx1N0E5N1x1NTNFM1xuICAgIC8vIFx1NUMzMVx1NjYyRlwiXHU1RjUzXHU1MjREIHZhdWx0XCJcdUZGMENcdTY1RTBcdTk3MDBcdTdCNDkgZm9jdXMvYWN0aXZlLWxlYWYtY2hhbmdlIFx1NEU4Qlx1NEVGNlx1MzAwMlxuICAgIHRoaXMucGx1Z2luLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICB9XG5cbiAgb3ZlcnJpZGUgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgfVxuXG4gIC8qKiBENVx1RkYxQVx1NTNGM1x1OTUyRVx1ODNEQ1x1NTM1NVx1RkYwOFZpZXcub25QYW5lTWVudSwgb2JzaWRpYW4uZC50czo3NzA5XHVGRjA5XHUyMDE0XHUyMDE0XHU1OTFBXHU5NzYyXHU2NzdGL1x1NjgwN1x1N0I3RVx1NTkzNFx1NTNGM1x1OTUyRVx1ODFFQVx1NTJBOFx1ODNCN1x1NUY5NyAqL1xuICBvdmVycmlkZSBvblBhbmVNZW51KG1lbnU6IE1lbnUsIF9zb3VyY2U6ICdtb3JlLW9wdGlvbnMnIHwgJ3RhYi1oZWFkZXInIHwgc3RyaW5nKTogdm9pZCB7XG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PlxuICAgICAgaXRlbVxuICAgICAgICAuc2V0VGl0bGUodGhpcy5jdXJyZW50ID09PSAncnVubmluZycgfHwgdGhpcy5jdXJyZW50ID09PSAnc3RhcnRpbmcnID8gJ1x1NTA1Q1x1NkI2MiBEU0ggXHU2NzBEXHU1MkExJyA6ICdcdTU0MkZcdTUyQTggRFNIIFx1NjcwRFx1NTJBMScpXG4gICAgICAgIC5zZXRJY29uKHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnIHx8IHRoaXMuY3VycmVudCA9PT0gJ3N0YXJ0aW5nJyA/ICdzcXVhcmUnIDogJ3BsYXknKVxuICAgICAgICAub25DbGljaygoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKSksXG4gICAgKVxuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4gaXRlbS5zZXRUaXRsZSgnXHU1MjM3XHU2NUIwJykuc2V0SWNvbigncmVmcmVzaC1jdycpLm9uQ2xpY2soKCkgPT4gdGhpcy5yZWxvYWQoKSkpXG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PlxuICAgICAgaXRlbS5zZXRUaXRsZSgnXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzJykuc2V0SWNvbignbWF4aW1pemUtMicpLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnBsdWdpbi5vcGVuUG9wb3V0KCkpLFxuICAgIClcbiAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+XG4gICAgICBpdGVtLnNldFRpdGxlKCdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAnKS5zZXRJY29uKCdleHRlcm5hbC1saW5rJykub25DbGljaygoKSA9PiB2b2lkIHRoaXMucGx1Z2luLm9wZW5JbkJyb3dzZXIoKSksXG4gICAgKVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBvblRvZ2dsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uZ2V0U3RhdHVzKClcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycgfHwgcy5raW5kID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zdG9wKClcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgIH1cbiAgICB0aGlzLnJlZnJlc2goKVxuICB9XG5cbiAgLyoqIFx1OTc2Mlx1Njc3Rlx1NjI1M1x1NUYwMFx1NjVGNlx1Nzg2RVx1NEZERFx1NjcwRFx1NTJBMVx1NTcyOFx1OEREMVx1RkYwOFx1NURGMlx1NTcyOFx1OEREMVx1NTIxOVx1NjMwMlx1NjNBNVx1RkYwOSAqL1xuICBwcml2YXRlIGFzeW5jIGVuc3VyZVN0YXJ0ZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3N0b3BwZWQnIHx8IHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RhcnQoKVxuICAgICAgdGhpcy5yZWZyZXNoKClcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlZnJlc2goKTogdm9pZCB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgbGV0IHVpOiBVaVN0YXRlXG4gICAgbGV0IHBpbGxUZXh0ID0gJydcbiAgICBsZXQgcGlsbENscyA9ICcnXG5cbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHVpID0gJ3J1bm5pbmcnXG4gICAgICBwaWxsVGV4dCA9IGBcdTI1Q0YgJHtzLnBvcnR9JHtzLmF0dGFjaGVkID8gJyBcdTAwQjcgXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExJyA6ICcnfWBcbiAgICAgIHBpbGxDbHMgPSAnaXMtcnVubmluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdWkgPSAnc3RhcnRpbmcnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0MgXHU1NDJGXHU1MkE4XHU0RTJEXHUyMDI2J1xuICAgICAgcGlsbENscyA9ICdpcy1zdGFydGluZydcbiAgICB9IGVsc2UgaWYgKHMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgdWkgPSAnZXJyb3InXG4gICAgICBwaWxsVGV4dCA9ICdcdTI3MTUgXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1J1xuICAgICAgcGlsbENscyA9ICdpcy1lcnJvcidcbiAgICB9IGVsc2Uge1xuICAgICAgdWkgPSAnc3RvcHBlZCdcbiAgICAgIHBpbGxUZXh0ID0gJ1x1MjVDQiBcdTY3MkFcdThGRDBcdTg4NEMnXG4gICAgICBwaWxsQ2xzID0gJ2lzLXN0b3BwZWQnXG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdWlcbiAgICBpZiAodGhpcy5waWxsRWwpIHtcbiAgICAgIHRoaXMucGlsbEVsLnNldFRleHQocGlsbFRleHQpXG4gICAgICB0aGlzLnBpbGxFbC5jbGFzc05hbWUgPSBgZHNoLWRvY2stcGlsbCAke3BpbGxDbHN9YFxuICAgIH1cbiAgICAvLyBcdTY4MDdcdTk4OThcdTY4MEZcdTUyQThcdTRGNUNcdTYzMDlcdTk0QUVcdTU2RkVcdTY4MDdcdTk2OEZcdTcyQjZcdTYwMDFcdTUyMDdcdTYzNjJcdUZGMDhhZGRBY3Rpb24gXHU4RkQ0XHU1NkRFXHU3Njg0XHU1MTQzXHU3RDIwXHU1M0VGXHU4OEFCIHNldEljb24gXHU5MUNEXHU3RUQ4XHVGRjA5XG4gICAgY29uc3QgcnVubmluZyA9IHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJ1xuICAgIGlmICh0aGlzLnRvZ2dsZUFjdGlvbkVsKSB7XG4gICAgICB0aGlzLnRvZ2dsZUFjdGlvbkVsLmVtcHR5KClcbiAgICAgIHNldEljb24odGhpcy50b2dnbGVBY3Rpb25FbCwgcnVubmluZyA/ICdzcXVhcmUnIDogJ3BsYXknKVxuICAgICAgdGhpcy50b2dnbGVBY3Rpb25FbC50aXRsZSA9IHJ1bm5pbmcgPyAnXHU1MDVDXHU2QjYyJyA6ICdcdTU0MkZcdTUyQTgnXG4gICAgICB0aGlzLnRvZ2dsZUFjdGlvbkVsLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIHJ1bm5pbmcgPyAnXHU1MDVDXHU2QjYyJyA6ICdcdTU0MkZcdTUyQTgnKVxuICAgIH1cblxuICAgIC8vIGlmcmFtZSBcdTRFMEVcdTg5ODZcdTc2RDZcdTVDNDJcbiAgICBpZiAodWkgPT09ICdydW5uaW5nJykge1xuICAgICAgaWYgKHRoaXMuaWZyYW1lRWwgJiYgdGhpcy5pZnJhbWVFbC5zcmMgIT09IHRoaXMucGx1Z2luLmJhc2VVcmwpIHtcbiAgICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgICB9XG4gICAgICB0aGlzLnNob3dPdmVybGF5KG51bGwpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0YXJ0aW5nKCkpXG4gICAgfSBlbHNlIGlmICh1aSA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlckVycm9yKHMua2luZCA9PT0gJ2Vycm9yJyA/IHMubWVzc2FnZSA6ICdcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUYnKSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlclN0b3BwZWQoKSlcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tIFx1ODk4Nlx1NzZENlx1NUM0Mlx1NkUzMlx1NjdEMyAtLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBzaG93T3ZlcmxheShjb250ZW50OiBIVE1MRWxlbWVudCB8IG51bGwpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMub3ZlcmxheUVsKSByZXR1cm5cbiAgICB0aGlzLm92ZXJsYXlFbC5lbXB0eSgpXG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgIHRoaXMub3ZlcmxheUVsLmFwcGVuZENoaWxkKGNvbnRlbnQpXG4gICAgICB0aGlzLm92ZXJsYXlFbC5yZW1vdmVBdHRyaWJ1dGUoJ2hpZGRlbicpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFx1OEZEMFx1ODg0Q1x1NEUyRFx1RkYxQVx1NjYzRVx1NUYwRlx1OTY5MFx1ODVDRlx1ODk4Nlx1NzZENlx1NUM0Mlx1RkYwOFx1NTQyNlx1NTIxOVx1N0E3QVx1NzY4NFx1N0VERFx1NUJGOVx1NUI5QVx1NEY0RFx1NUM0Mlx1NEYxQVx1NjMyMVx1NEY0RiBpZnJhbWVcdUZGMDlcbiAgICAgIHRoaXMub3ZlcmxheUVsLnNldEF0dHJpYnV0ZSgnaGlkZGVuJywgJycpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGFydGluZygpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXNwaW5uZXInIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ1x1NkI2M1x1NTcyOFx1NTQyRlx1NTJBOFx1NUI5OFx1NjVCOSBEU0ggV2ViXHUyMDI2JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoe1xuICAgICAgY2xzOiAnZHNoLWRvY2stc3RhdGUtc3ViJyxcbiAgICAgIHRleHQ6ICdcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOFx1N0VBNiAxMCBcdTc5RDJcdUZGMDlcdUZGMUJcdTdBRUZcdTUzRTNcdTg4QUJcdTUzNjBcdTc1MjhcdTY1RjZcdTVDMDZcdTgxRUFcdTUyQThcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnLFxuICAgIH0pXG4gICAgcmV0dXJuIGJveFxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FsZXJ0LXRyaWFuZ2xlJylcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnRFNIIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtbXNnJywgdGV4dDogbWVzc2FnZSB9KVxuICAgIGNvbnN0IHJldHJ5ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0bicsIHRleHQ6ICdcdTkxQ0RcdThCRDUnIH0pXG4gICAgcmV0cnkub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0b3BwZWQoKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGJveCA9IGNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlJyB9KVxuICAgIGNvbnN0IGljb24gPSBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtaWNvbicgfSlcbiAgICBzZXRJY29uKGljb24sICdhbmNob3InKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU2NzJBXHU4RkQwXHU4ODRDJyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLCB0ZXh0OiAnXHU3MEI5XHU1MUZCXHU1NDJGXHU1MkE4XHVGRjBDXHU2MjhBXHU1Qjk4XHU2NUI5IERlZXBTZWVrIEhhcm5lc3MgXHU1MDVDXHU5NzYwXHU4RkRCXHU2NzY1JyB9KVxuICAgIGNvbnN0IHN0YXJ0ID0gYm94LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWJ0biBtb2QtY3RhJywgdGV4dDogJ1x1NTQyRlx1NTJBOCBEU0gnIH0pXG4gICAgc3RhcnQub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc3RhcnQoKS50aGVuKCgpID0+IHRoaXMucmVmcmVzaCgpKVxuICAgIH1cbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbG9hZCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5pZnJhbWVFbC5zcmMgPSB0aGlzLnBsdWdpbi5iYXNlVXJsXG4gICAgfVxuICB9XG59XG4iLCAiLyoqXG4gKiBjdXJyZW50VmF1bHQudHMgXHUyMDE0XHUyMDE0IFx1NjI4QVwiXHU1RjUzXHU1MjREXHU3MTI2XHU3MEI5IHZhdWx0ICsgXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU3QjE0XHU4QkIwXCJcdThERThcdThGREJcdTdBMEJcdTU0NEFcdThCQzkgRFNIIFx1NEZBN1x1MzAwMlxuICpcbiAqIGRzaC1kb2NrIFx1OEREMVx1NTcyOCBPYnNpZGlhbiBcdThGREJcdTdBMEJcdTkxQ0NcdUZGMENcdTgwRkRcdTYyRkZcdTUyMzBcdTY3MDBcdTY3NDNcdTVBMDFcdTc2ODRcdTVGNTNcdTUyNEQgdmF1bHRcdUZGMDhcdTdBOTdcdTUzRTNcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTY1RjZcdUZGMENcbiAqIGBhcHAudmF1bHQuZ2V0TmFtZSgpYCArIGBGaWxlU3lzdGVtQWRhcHRlci5nZXRCYXNlUGF0aCgpYFx1RkYwOVx1NEUwRVx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFxuICogXHVGRjA4YGFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpYFx1RkYwOVx1MzAwMkRTSCBcdTc2ODRcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjYgZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHRcbiAqIFx1OEREMVx1NTcyOFx1NzJFQ1x1N0FDQiBub2RlIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1NEUyNFx1ODAwNVx1OTAxQVx1OEZDN1x1NEUwMFx1NEUyQVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1ODlFM1x1ODAyNlx1OTAxQVx1NEZFMVx1RkYxQVxuICpcbiAqICAgPGhvbWVkaXI+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICAgeyBuYW1lLCBwYXRoLCBhY3RpdmVGaWxlPywgdXBkYXRlZEF0IH1cbiAqXG4gKiAtIFx1NEY0RFx1N0Y2RVx1NTZGQVx1NUI5QVx1NTcyOCBgfi8uZHNoYFx1RkYwOFx1NEUwRSBkc2gtZG9jayBcdTc2ODQgRFNIX0hPTUUgXHU0RTA5XHU2ODYzXHU2QTIxXHU1RjBGXHU2NUUwXHU1MTczXHVGRjA5XHVGRjBDXHU0RUZCXHU0RjU1XHU2QTIxXHU1RjBGXG4gKiAgIFx1NEUwQiBEU0ggXHU0RkE3XHU5MEZEXHU4QkZCXHU1Rjk3XHU1MjMwXHVGRjFCXG4gKiAtIGBhY3RpdmVGaWxlYCBcdTY2MkYgdmF1bHQgXHU3NkY4XHU1QkY5XHU4REVGXHU1Rjg0XHVGRjA4XHU2NUUwIGAubWRgIFx1OEJFRFx1NEU0OVx1RkYwQ1x1NTM5Rlx1NjgzN1x1RkYwOVx1RkYwQ1x1NTNFQVx1NTcyOFx1Nzg2RVx1NUI5RVx1NjcwOVx1NjI1M1x1NUYwMFx1NzY4NFxuICogICBcdTdCMTRcdThCQjBcdTY1RjZcdTUxOTlcdTUxNjVcdUZGMUJEU0ggXHU0RkE3XHU3Njg0IGB2YXVsdF9jdXJyZW50YC9gdmF1bHRfYWN0aXZlYCBcdTYzNkVcdTZCNjRcdTRFQ0VcIlx1NzMxQ1x1NjcwMFx1OEZEMVx1NkQzQlx1OERDM1x1NUU5M1wiXG4gKiAgIFx1NTM0N1x1N0VBN1x1NEUzQVwiXHU3NzFGXHUwMEI3XHU1RjUzXHU1MjREXHU1RTkzICsgXHU1RjUzXHU1MjREXHU3QjE0XHU4QkIwXCJcdUZGMUJcbiAqIC0gXHU1OTFBXHU3QTk3XHU1M0UzXHU1NzNBXHU2NjZGXHVGRjFBXHU2QkNGXHU0RTJBIE9ic2lkaWFuIFx1N0E5N1x1NTNFM1x1RkYwOFx1NEUzQlx1N0E5N1x1NTNFMyAvIHBvcG91dFx1RkYwOVx1OTBGRFx1NjYyRlx1NzJFQ1x1N0FDQlx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwQ1x1NTQwNFxuICogICBcdTgxRUFcdTc2RDFcdTU0MkNcdTgxRUFcdTVERjFcdTc2ODQgd2luZG93IGZvY3VzIFx1MjAxNFx1MjAxNCBcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTZCNjNcdTY2MkZcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1xuICogICBcdTU3MjhcdTc3MEJcdTc2ODQgdmF1bHRcIlx1RkYxQlxuICogLSBcdTU5MzFcdThEMjVcdTk3NTlcdTlFRDhcdUZGMUFcdTUxOTlcdTRFMERcdThGREJcdUZGMDhcdTY3NDNcdTk2NTAvXHU3OEMxXHU3NkQ4XHVGRjA5XHU1M0VBIGNvbnNvbGUud2Fyblx1RkYwQ1x1N0VERFx1NEUwRFx1NjI1M1x1NjVBRFx1NjNEMlx1NEVGNlx1NEUzQlx1NkQ0MVx1N0EwQlx1RkYxQlxuICogICBcdTY1ODdcdTRFRjZcdTYzNUZcdTU3NEYvXHU3RjNBXHU1OTMxXHU2NUY2IERTSCBcdTRGQTdcdTU2REVcdTkwMDBcdTUzOUZcdTY3MDlcdTRGRTFcdTUzRjdcdUZGMENcdTU0MTFcdTU0MEVcdTUxN0NcdTVCQjlcdTRFMERcdTg4QzUgZHNoLWRvY2sgXHU3Njg0XHU1NzNBXHU2NjZGXHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgRmlsZVN5c3RlbUFkYXB0ZXIsIHR5cGUgQXBwIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG4vKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1NkZBXHU1QjlBXHU0RjREXHU3RjZFXHVGRjFBfi8uZHNoL2N1cnJlbnQtdmF1bHQuanNvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZHNoJywgJ2N1cnJlbnQtdmF1bHQuanNvbicpXG59XG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUxODVcdTVCQjlcdUZGMDhEU0ggXHU0RkE3XHU1M0VBXHU4QkZCIG5hbWUvcGF0aC9hY3RpdmVGaWxlXHVGRjBDdXBkYXRlZEF0IFx1NEY5Qlx1OEJDQVx1NjVBRFx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBDdXJyZW50VmF1bHRNYXJrZXIge1xuICBuYW1lOiBzdHJpbmdcbiAgcGF0aDogc3RyaW5nXG4gIC8qKiBcdTVGNTNcdTUyNERcdTYyNTNcdTVGMDBcdTc2ODRcdTdCMTRcdThCQjBcdUZGMDh2YXVsdCBcdTc2RjhcdTVCRjlcdThERUZcdTVGODRcdUZGMDlcdUZGMUJcdTY1RTBcdTYyNTNcdTVGMDBcdTdCMTRcdThCQjBcdTY1RjZcdTRFMERcdTUxOTlcdTZCNjRcdTVCNTdcdTZCQjUgKi9cbiAgYWN0aXZlRmlsZT86IHN0cmluZ1xuICB1cGRhdGVkQXQ6IG51bWJlclxufVxuXG4vKipcbiAqIFx1NTM5Rlx1NUI1MFx1NTE5OVx1NTE2NVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYxQVx1NTE0OFx1NTE5OVx1NTQwQ1x1NzZFRVx1NUY1NSAudG1wIFx1NTE4RCByZW5hbWVcdUZGMENcdTkwN0ZcdTUxNEQgRFNIIFx1NEZBN1x1OEJGQlx1NTIzMFx1NTM0QVx1NjIyQVx1NTE4NVx1NUJCOVx1MzAwMlxuICogXHU1OTMxXHU4RDI1XHU1M0VBXHU1NDRBXHU4QjY2XHVGRjBDXHU0RTBEXHU2MjlCXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlcihuYW1lOiBzdHJpbmcsIHZhdWx0UGF0aDogc3RyaW5nLCBhY3RpdmVGaWxlPzogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgZmlsZSA9IGN1cnJlbnRWYXVsdE1hcmtlclBhdGgoKVxuICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgY29uc3QgcGF5bG9hZDogQ3VycmVudFZhdWx0TWFya2VyID0geyBuYW1lLCBwYXRoOiB2YXVsdFBhdGgsIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSB9XG4gICAgaWYgKGFjdGl2ZUZpbGUpIHBheWxvYWQuYWN0aXZlRmlsZSA9IGFjdGl2ZUZpbGVcbiAgICBjb25zdCB0bXAgPSBgJHtmaWxlfS50bXBgXG4gICAgZnMud3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpKVxuICAgIGZzLnJlbmFtZVN5bmModG1wLCBmaWxlKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gXHU1MTk5XHU1MTY1IGN1cnJlbnQtdmF1bHQgXHU2ODA3XHU4QkIwXHU1OTMxXHU4RDI1JywgZXJyKVxuICB9XG59XG5cbi8qKlxuICogXHU0RUNFIE9ic2lkaWFuIGFwcCBcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1NDBEXHUzMDAxXHU2ODM5XHU4REVGXHU1Rjg0XHU0RTBFXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU3QjE0XHU4QkIwXHVGRjFCXHU1M0Q2XHU0RTBEXHU1MjMwXHU4RkQ0XHU1NkRFIG51bGxcdTMwMDJcbiAqXG4gKiBcdTc1MjggYGluc3RhbmNlb2YgRmlsZVN5c3RlbUFkYXB0ZXJgXHVGRjA4b2JzaWRpYW4uZC50czoyOTk2XHVGRjBDXHU2ODRDXHU5NzYyXHU3QUVGXHU1QjlFXHU3M0IwXHVGRjA5XHU2NkZGXHU0RUUzXG4gKiBcdTY1RTdcdTc2ODQgYGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfWAgXHU1RjNBXHU4RjZDXHVGRjFBXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4XHVGRjBDXHU0RTE0XHU3OUZCXHU1MkE4XHU3QUVGXG4gKiBcdUZGMDhDYXBhY2l0b3JBZGFwdGVyXHVGRjA5XHU4MUVBXHU3MTM2XHU4RkQ0XHU1NkRFIG51bGxcdTMwMDJGaWxlU3lzdGVtQWRhcHRlciBcdTRFQ0VcdTVCOThcdTY1QjkgYG9ic2lkaWFuYFxuICogXHU2QTIxXHU1NzU3XHU1QkZDXHU1MTY1XHVGRjA4XHU2M0QyXHU0RUY2XHU3Njg0XHU4RkQwXHU4ODRDXHU2NUY2XHU1QkJGXHU0RTNCXHU2Q0U4XHU1MTY1XHVGRjA5XHVGRjBDXHU0RTBFIGRzaC1kb2NrIFx1NUI5RVx1OTY0NVx1N0YxNlx1OEJEMVx1NzY4NCBvYnNpZGlhbkAxLjEzLjFcbiAqIFx1N0M3Qlx1NTc4Qlx1NEUwMFx1ODFGNFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0SW5mbyhhcHA6IEFwcCk6IHsgbmFtZTogc3RyaW5nOyBwYXRoOiBzdHJpbmc7IGFjdGl2ZUZpbGU/OiBzdHJpbmcgfSB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IGFkYXB0ZXIgPSBhcHAudmF1bHQuYWRhcHRlclxuICAgIGlmICghKGFkYXB0ZXIgaW5zdGFuY2VvZiBGaWxlU3lzdGVtQWRhcHRlcikpIHJldHVybiBudWxsXG4gICAgY29uc3QgYWN0aXZlRmlsZSA9IGFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpPy5wYXRoXG4gICAgY29uc3QgaW5mbzogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZzsgYWN0aXZlRmlsZT86IHN0cmluZyB9ID0ge1xuICAgICAgbmFtZTogYXBwLnZhdWx0LmdldE5hbWUoKSxcbiAgICAgIHBhdGg6IGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKSxcbiAgICB9XG4gICAgaWYgKGFjdGl2ZUZpbGUpIGluZm8uYWN0aXZlRmlsZSA9IGFjdGl2ZUZpbGVcbiAgICByZXR1cm4gaW5mb1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QUFTLGNBQWM7QUFDNUIsV0FBSyxTQUFTLFVBQVUsT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQTtBQUFBLEVBSUEsTUFBTSxZQUEyQjtBQUMvQixVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsVUFBTSxTQUFTLFVBQVUsZ0JBQWdCLGlCQUFpQjtBQUMxRCxRQUFJLE9BQTZCLE9BQU8sQ0FBQyxLQUFLO0FBQzlDLFFBQUksQ0FBQyxNQUFNO0FBS1QsYUFBTyxVQUFVLGFBQWEsS0FBSztBQUNuQyxVQUFJLENBQUMsS0FBTTtBQUNYLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRTtBQUNBLGNBQVUsY0FBYyxJQUFJO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sZ0JBQStCO0FBQ25DLFVBQU0sc0JBQU0sYUFBYSxLQUFLLE9BQU87QUFBQSxFQUN2QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNQSxNQUFNLGFBQTRCO0FBQ2hDLFFBQUk7QUFDRixZQUFNLE9BQU8sS0FBSyxJQUFJLFVBQVUsZUFBZTtBQUMvQyxZQUFNLEtBQUssYUFBYSxFQUFFLE1BQU0sbUJBQW1CLFFBQVEsS0FBSyxDQUFDO0FBQUEsSUFDbkUsU0FBUyxLQUFLO0FBQ1osWUFBTSxNQUFNLGVBQWUsUUFBUSxJQUFJLFVBQVUsT0FBTyxHQUFHO0FBQzNELFVBQUksd0JBQU8scURBQWEsR0FBRyxFQUFFO0FBQUEsSUFDL0I7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJvcyIsICJwYXRoIiwgImVtYmVkZGVkTm9kZVZlcnNpb24iLCAicmVzb2x2ZSIsICJvdXQiLCAiY21kIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiZnMiLCAib3MiLCAicGF0aCJdCn0K
