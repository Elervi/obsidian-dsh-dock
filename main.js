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
  BRIDGE_PORT_BASE: () => BRIDGE_PORT_BASE,
  computeBridgePort: () => computeBridgePort,
  computeDshHome: () => computeDshHome,
  computePort: () => computePort,
  computeSharedConfigRoot: () => computeSharedConfigRoot,
  default: () => DshDockPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");
var import_electron = require("electron");
var import_crypto = require("crypto");
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
var cachedGlobalRoots = null;
function globalModuleRoots() {
  if (cachedGlobalRoots) return cachedGlobalRoots;
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
  cachedGlobalRoots = [...new Set(roots)];
  return cachedGlobalRoots;
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
function probeNodeMajor(nodeBin) {
  try {
    const out = (0, import_child_process.spawnSync)(nodeBin, ["--version"], { encoding: "utf8", timeout: 5e3, windowsHide: true });
    const m = /^v?(\d+)\./.exec((out.stdout || "").trim());
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}
function resolveNodeBin(explicit, embeddedNodeVersion2, useEmbedded = false) {
  const notes = [];
  const explicitBin = explicit?.trim() || process.env.DSH_NODE;
  if (explicitBin) {
    const major = probeNodeMajor(explicitBin);
    const note = major > 0 ? `\u4F7F\u7528\u663E\u5F0F Node: ${explicitBin}\uFF08v${major}\uFF09` : `\u4F7F\u7528\u663E\u5F0F Node: ${explicitBin}`;
    notes.push(note);
    return { nodeBin: explicitBin, useElectronAsNode: false, nodeMajor: major, notes };
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
      const major = probeNodeMajor(candidate);
      notes.push(
        major >= NODE_SQLITE_MIN_MAJOR ? `\u4F7F\u7528\u7CFB\u7EDF Node: ${candidate}\uFF08v${major}\uFF0C\u652F\u6301\u5168\u6587\u641C\u7D22\u6240\u9700 SQLite\uFF09` : `\u4F7F\u7528\u7CFB\u7EDF Node: ${candidate}\uFF08v${major || "?"}\uFF1B\u5168\u6587\u641C\u7D22\u9700 Node \u2265${NODE_SQLITE_MIN_MAJOR}\uFF09`
      );
      return { nodeBin: candidate, useElectronAsNode: false, nodeMajor: major, notes };
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
function isWebMounted(host, port, timeoutMs = 1500) {
  return new Promise((resolve2) => {
    const req = http.get({ host, port, path: "/", timeout: timeoutMs }, (res) => {
      res.resume();
      const status = res.statusCode ?? 0;
      resolve2(status === 200 || status === 401 || status >= 300 && status < 400);
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
    if (await isWebMounted(host, port, 1500)) return true;
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
function yamlScalar(p) {
  return `'${p.replace(/'/g, "''")}'`;
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
    path: ${yamlScalar(settingsPath)}
`;
    const blockCredentials = `- id: credentials
  config:
    path: ${yamlScalar(credentialsPath)}
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
    ...process.env,
    ...opts.env,
    DSH_HOME: opts.dshHome
  };
  if (opts.useElectronAsNode) env.ELECTRON_RUN_AS_NODE = "1";
  const proc = (0, import_child_process.spawn)(opts.nodeBin, args, {
    env,
    cwd: opts.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  proc.stdout?.resume();
  return proc;
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
  let spawnError;
  const childDied = new Promise((resolve2) => {
    proc.once("exit", () => resolve2(true));
    proc.once("error", (err) => {
      spawnError = err;
      resolve2(true);
    });
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
  return { status: { kind: "error", message: summarizeChildError(stderrTail, spawnError) }, proc };
}
function summarizeChildError(stderrTail, spawnError) {
  if (spawnError) {
    const code = spawnError.code;
    if (code === "ENOENT") {
      return "\u65E0\u6CD5\u542F\u52A8 dsh \u5B50\u8FDB\u7A0B\uFF08ENOENT\uFF09\uFF1ANode \u53EF\u6267\u884C\u6587\u4EF6\u4E0D\u5B58\u5728\u6216\u4E0D\u53EF\u6267\u884C\u3002\u8BF7\u5728\u8BBE\u7F6E\u91CC\u68C0\u67E5 Node \u8DEF\u5F84\uFF0C\u6216\u91CD\u65B0\u5B89\u88C5 Node";
    }
    if (code === "EACCES") {
      return "\u65E0\u6CD5\u542F\u52A8 dsh \u5B50\u8FDB\u7A0B\uFF08EACCES\uFF09\uFF1ANode \u53EF\u6267\u884C\u6587\u4EF6\u6CA1\u6709\u6267\u884C\u6743\u9650\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u6743\u9650";
    }
    return `\u65E0\u6CD5\u542F\u52A8 dsh \u5B50\u8FDB\u7A0B: ${spawnError.message}`;
  }
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
      const out2 = (0, import_child_process.spawnSync)(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`],
        { encoding: "utf8", timeout: 5e3, windowsHide: true }
      );
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
  autostart: true,
  bridgeEnabled: true
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
    new import_obsidian.Setting(containerEl).setName("Obsidian API \u6865\uFF08B1\uFF09").setHeading();
    new import_obsidian.Setting(containerEl).setName("\u542F\u7528 API \u6865").setDesc(
      "\u63D2\u4EF6\u52A0\u8F7D\u5373\u5728\u672C\u673A 127.0.0.1 \u8D77\u4E00\u4E2A token \u9274\u6743\u7684 HTTP \u6865\uFF0C\u628A vault/metadataCache/fileManager \u7684\u5B98\u65B9\u89E3\u6790\u7ED3\u679C\u5582\u7ED9 DSH \u4FA7 vault_* \u5DE5\u5177\uFF08\u6865\u4F18\u5148\u3001\u6587\u4EF6\u56DE\u9000\uFF09\u3002\u5173\u95ED\u540E\u5DE5\u5177\u56DE\u9000\u6587\u4EF6\u76F4\u8BFB\u6A21\u5F0F\u3002"
    ).addToggle(
      (t) => t.setValue(this.plugin.settings.bridgeEnabled).onChange(async (v) => {
        this.plugin.settings.bridgeEnabled = v;
        await this.plugin.saveSettings();
        if (v) {
          await this.plugin.startBridge();
        } else {
          await this.plugin.stopBridge();
        }
        this.bridgeLine.textContent = this.describeBridge();
      })
    );
    this.bridgeLine = containerEl.createDiv({ cls: "dsh-dock-detect" });
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
    new import_obsidian.Setting(containerEl).setName("\u76D1\u542C\u5730\u5740").setDesc("\u4EC5\u672C\u673A\u56DE\u73AF\u5730\u5740\u53EF\u9009\uFF1A\u5B98\u65B9 dsh \u62D2\u7EDD --host 0.0.0.0\uFF08\u4E0D\u652F\u6301\u5C40\u57DF\u7F51\u8BBF\u95EE\uFF09\uFF0C\u975E\u56DE\u73AF\u503C\u6CA1\u6709\u610F\u4E49\u3002\u65E7\u7248\u9057\u7559\u7684\u81EA\u5B9A\u4E49\u503C\u4F1A\u88AB\u91CD\u7F6E\u4E3A 127.0.0.1\u3002").addDropdown((dd) => {
      if (this.plugin.settings.host !== "127.0.0.1" && this.plugin.settings.host !== "localhost") {
        this.plugin.settings.host = "127.0.0.1";
        void this.plugin.saveSettings();
      }
      dd.addOption("127.0.0.1", "127.0.0.1\uFF08\u4EC5\u672C\u673A\uFF0C\u9ED8\u8BA4\uFF09");
      dd.addOption("localhost", "localhost\uFF08\u4EC5\u672C\u673A\uFF09");
      dd.setValue(this.plugin.settings.host);
      dd.onChange(async (v) => {
        this.plugin.settings.host = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u76D1\u542C\u7AEF\u53E3\uFF08\u57FA\u51C6\uFF09").setDesc("\u5B98\u65B9\u9ED8\u8BA4 3080\uFF081\u201365535\uFF1B\u4E0D\u7528 0=\u201COS \u5206\u914D\u201D\uFF0Clauncher \u65E0\u9700\u63A2\u6D4B\u5B50\u8FDB\u7A0B\u5B9E\u9645\u7AEF\u53E3\uFF09\u3002shared/custom \u6A21\u5F0F\u76F4\u63A5\u4F7F\u7528\uFF1Bper-vault \u6A21\u5F0F\u5728\u6B64\u57FA\u7840\u4E0A\u6309 vault \u6D3E\u751F\u72EC\u7ACB\u7AEF\u53E3\uFF08\u6BCF vault \u72EC\u5360\uFF0C\u4F1A\u8BDD\u4E92\u4E0D\u53EF\u89C1\uFF09\u3002").addText(
      (t) => t.setPlaceholder("3080").setValue(String(this.plugin.settings.port)).onChange(async (v) => {
        const n = Number(v.trim());
        this.plugin.settings.port = Number.isInteger(n) && n >= 1 && n <= 65535 ? n : 3080;
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
    this.bridgeLine.textContent = this.describeBridge();
  }
  detectLine;
  homePreview;
  netPreview;
  bridgeLine;
  describeStatus() {
    const s = this.plugin.getStatus();
    if (s.kind === "running") {
      return `${s.url}\uFF08${s.attached ? "\u6302\u63A5\u5DF2\u6709\u670D\u52A1" : "\u5B50\u8FDB\u7A0B\u8FD0\u884C\u4E2D"}\uFF09`;
    }
    if (s.kind === "starting") return "\u542F\u52A8\u4E2D\u2026\uFF08\u9996\u6B21\u7EA6 10 \u79D2\uFF0C\u9700\u521D\u59CB\u5316 profile\uFF09";
    if (s.kind === "error") return `\u5931\u8D25: ${s.message}`;
    return "\u672A\u8FD0\u884C";
  }
  describeBridge() {
    const url = this.plugin.bridgeUrl;
    if (!this.plugin.settings.bridgeEnabled) return "\u5DF2\u5173\u95ED\uFF08\u5DE5\u5177\u56DE\u9000\u6587\u4EF6\u76F4\u8BFB\u6A21\u5F0F\uFF09";
    return url ? `\u8FD0\u884C\u4E2D: ${url}\uFF08token \u9274\u6743\uFF0C\u4EC5\u672C\u673A\uFF09` : "\u672A\u8FD0\u884C\uFF08\u542F\u52A8\u5931\u8D25\u5C06\u56DE\u9000\u6587\u4EF6\u6A21\u5F0F\uFF09";
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
  /** 面板内"启动/停止"按钮（0.2.5 同款，内容区可见） */
  toggleBtn = null;
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
    this.register(this.plugin.onStatusChange(() => this.refresh()));
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
    const running = s.kind === "running" || s.kind === "starting";
    if (this.pillEl) {
      this.pillEl.setText(pillText);
      this.pillEl.className = `dsh-dock-pill ${pillCls}`;
    }
    if (this.toggleBtn) {
      this.toggleBtn.empty();
      (0, import_obsidian2.setIcon)(this.toggleBtn, running ? "square" : "play");
      this.toggleBtn.title = running ? "\u505C\u6B62" : "\u542F\u52A8";
    }
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
function writeCurrentVaultMarker(name, vaultPath, activeFile, bridge) {
  try {
    const file = currentVaultMarkerPath();
    fs2.mkdirSync(path2.dirname(file), { recursive: true, mode: 448 });
    const payload = { name, path: vaultPath, updatedAt: Date.now() };
    if (activeFile) payload.activeFile = activeFile;
    if (bridge) {
      payload.bridgeUrl = bridge.url;
      payload.bridgeToken = bridge.token;
    }
    const tmp = `${file}.tmp`;
    fs2.writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 384 });
    fs2.renameSync(tmp, file);
    try {
      fs2.chmodSync(file, 384);
    } catch {
    }
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

// src/bridgeServer.ts
var import_node_http = require("node:http");
var import_node_crypto = require("node:crypto");

// src/bridgeTypes.ts
var BridgeErrorCode = {
  BAD_REQUEST: "BRIDGE_BAD_REQUEST",
  UNAUTHORIZED: "BRIDGE_UNAUTHORIZED",
  FORBIDDEN: "BRIDGE_FORBIDDEN",
  INTERNAL: "BRIDGE_INTERNAL",
  NOT_FOUND: "BRIDGE_NOT_FOUND",
  METHOD_NOT_ALLOWED: "BRIDGE_METHOD_NOT_ALLOWED",
  TOO_LARGE: "BRIDGE_BODY_TOO_LARGE",
  NOTE_NOT_FOUND: "VAULT_NOTE_NOT_FOUND",
  NOT_FILE: "VAULT_NOT_FILE",
  EXISTS: "VAULT_EXISTS",
  PATH_INVALID: "VAULT_PATH_INVALID",
  INVALID_ARGS: "VAULT_INVALID_ARGS",
  EDIT_NOT_FOUND: "FS_EDIT_NOT_FOUND",
  AMBIGUOUS_EDIT: "FS_AMBIGUOUS_EDIT",
  FRONTMATTER_NO_FIELDS: "VAULT_FRONTMATTER_NO_FIELDS",
  FRONTMATTER_MULTILINE: "VAULT_FRONTMATTER_MULTILINE",
  REGEX_INVALID: "VAULT_REGEX_INVALID",
  RENAME_UPDATE_FAILED: "VAULT_RENAME_UPDATE_FAILED",
  RENAME_STUB_FAILED: "VAULT_RENAME_STUB_FAILED"
};

// src/bridgeServer.ts
var BridgeError = class extends Error {
  code;
  status;
  constructor(code, message, status = 400) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.status = status;
  }
};
var MAX_PORT_TRIES = 10;
var DEFAULT_MAX_BODY = 2 * 1024 * 1024;
function tokenEquals(a, b) {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && (0, import_node_crypto.timingSafeEqual)(ab, bb);
  } catch {
    return false;
  }
}
function isLoopbackHost(host) {
  if (host === "localhost" || host === "::1") return true;
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  return m.slice(1).every((n) => Number(n) <= 255);
}
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function sendError(res, err) {
  if (err instanceof BridgeError) {
    sendJson(res, err.status, { error: { code: err.code, message: err.message } });
    return;
  }
  const detail = err instanceof Error ? err.message : String(err);
  console.warn("[dsh-dock] \u6865\u5185\u90E8\u9519\u8BEF", detail);
  sendJson(res, 500, { error: { code: BridgeErrorCode.INTERNAL, message: "\u6865\u5185\u90E8\u9519\u8BEF" } });
}
function readBody(req, maxBytes) {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    req.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) {
        req.resume();
        fail(new BridgeError(BridgeErrorCode.TOO_LARGE, `\u8BF7\u6C42\u4F53\u8D85\u8FC7 ${maxBytes} \u5B57\u8282\u4E0A\u9650`, 413));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolve2(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => fail(err));
  });
}
function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new BridgeError(BridgeErrorCode.BAD_REQUEST, "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON", 400);
  }
}
function assertStr(v, field) {
  if (typeof v !== "string") {
    throw new BridgeError(BridgeErrorCode.INVALID_ARGS, `\u5B57\u6BB5 ${field} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32`, 400);
  }
  return v;
}
function queryBool(v) {
  if (v === null) return void 0;
  return v === "1" || v === "true" || v === "yes";
}
function queryNum(v) {
  if (v === null || v.trim() === "") return void 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : void 0;
}
function queryList(v) {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
function requireQuery(params, key) {
  const v = params.get(key);
  if (!v || v.trim() === "") {
    throw new BridgeError(BridgeErrorCode.BAD_REQUEST, `\u7F3A\u5C11\u5FC5\u586B\u53C2\u6570 ${key}`, 400);
  }
  return v.trim();
}
async function createBridgeServer(opts) {
  const { service } = opts;
  const maxBody = opts.maxBodyBytes ?? DEFAULT_MAX_BODY;
  if (!isLoopbackHost(opts.host)) {
    throw new Error(`\u6865\u5FC5\u987B\u53EA\u7ED1\u5B9A\u56DE\u73AF\u5730\u5740\uFF08127.0.0.1 / localhost / ::1\uFF09\uFF0C\u62D2\u7EDD\u7ED1\u5230 ${opts.host}`);
  }
  let boundPort = opts.port;
  const server = (0, import_node_http.createServer)(async (req, res) => {
    try {
      const header = req.headers.authorization ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!tokenEquals(token, opts.token)) {
        sendJson(res, 401, { error: { code: BridgeErrorCode.UNAUTHORIZED, message: "\u65E0\u6548\u6216\u7F3A\u5931\u7684\u6865 token\uFF08DSH_OBSIDIAN_BRIDGE_TOKEN\uFF09" } });
        return;
      }
      const hostHeader = (req.headers.host ?? "").toLowerCase();
      const hostOk2 = hostHeader === `127.0.0.1:${boundPort}` || hostHeader === `localhost:${boundPort}` || hostHeader === `[::1]:${boundPort}`;
      if (!hostOk2) {
        sendJson(res, 403, { error: { code: BridgeErrorCode.FORBIDDEN, message: "\u62D2\u7EDD\u975E\u672C\u673A Host \u8BF7\u6C42" } });
        return;
      }
      const url = new URL(req.url ?? "/", `http://${opts.host}:${boundPort}`);
      const path4 = url.pathname;
      const q = url.searchParams;
      if (req.method === "GET" && path4 === "/health") {
        sendJson(res, 200, { ok: true, version: service.info.version, vault: { name: service.info.name, path: service.info.path } });
        return;
      }
      if (req.method === "GET") {
        if (path4 === "/v1/current") {
          sendJson(res, 200, service.current());
          return;
        }
        if (path4 === "/v1/notes") {
          sendJson(res, 200, await service.listNotes({
            folder: q.get("folder") ?? void 0,
            all: queryBool(q.get("all")) ?? false,
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path4 === "/v1/folders") {
          sendJson(res, 200, await service.listFolders({
            folder: q.get("folder") ?? void 0,
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path4 === "/v1/note") {
          sendJson(res, 200, await service.readNote(requireQuery(q, "path")));
          return;
        }
        if (path4 === "/v1/metadata") {
          sendJson(res, 200, await service.metadata(requireQuery(q, "path")));
          return;
        }
        if (path4 === "/v1/frontmatter") {
          sendJson(res, 200, await service.frontmatter(requireQuery(q, "path")));
          return;
        }
        if (path4 === "/v1/backlinks") {
          sendJson(res, 200, await service.backlinks({
            path: q.get("path") ?? void 0,
            title: q.get("title") ?? void 0,
            format: q.get("format") === "markdown" ? "markdown" : q.get("format") === "all" ? "all" : "wikilink"
          }));
          return;
        }
        if (path4 === "/v1/search") {
          const qq = requireQuery(q, "q");
          sendJson(res, 200, await service.search({
            q: qq,
            folder: q.get("folder") ?? void 0,
            limit: queryNum(q.get("limit")),
            regex: queryBool(q.get("regex")),
            case_sensitive: queryBool(q.get("case_sensitive")),
            match_all: queryBool(q.get("match_all")),
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path4 === "/v1/tags") {
          sendJson(res, 200, await service.searchTags({
            tag: requireQuery(q, "tag"),
            folder: q.get("folder") ?? void 0,
            limit: queryNum(q.get("limit")),
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path4 === "/v1/all-tags") {
          sendJson(res, 200, await service.allTags({
            folder: q.get("folder") ?? void 0,
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        throw new BridgeError(BridgeErrorCode.NOT_FOUND, `\u672A\u77E5\u7AEF\u70B9 ${req.method} ${path4}`, 404);
      }
      if (req.method === "POST") {
        const raw = await readBody(req, maxBody);
        if (path4 === "/v1/write") {
          const body = parseJson(raw);
          sendJson(res, 200, await service.writeNote({
            path: assertStr(body.path, "path"),
            content: assertStr(body.content, "content"),
            op: body.op === "append" ? "append" : "write",
            unique: body.unique === true,
            overwrite: body.overwrite === true
          }));
          return;
        }
        if (path4 === "/v1/edit") {
          const body = parseJson(raw);
          sendJson(res, 200, await service.editNote({
            path: assertStr(body.path, "path"),
            old_string: assertStr(body.old_string, "old_string"),
            new_string: assertStr(body.new_string, "new_string"),
            replace_all: body.replace_all === true
          }));
          return;
        }
        if (path4 === "/v1/frontmatter") {
          const body = parseJson(raw);
          sendJson(res, 200, await service.updateFrontmatter({
            path: assertStr(body.path, "path"),
            set: typeof body.set === "object" && body.set !== null ? body.set : void 0,
            delete: Array.isArray(body.delete) ? body.delete : void 0
          }));
          return;
        }
        if (path4 === "/v1/rename") {
          const body = parseJson(raw);
          sendJson(res, 200, await service.rename({
            old_path: assertStr(body.old_path, "old_path"),
            new_path: assertStr(body.new_path, "new_path"),
            keep_old: body.keep_old === "stub" ? "stub" : "keep"
          }));
          return;
        }
        if (path4 === "/v1/trash") {
          const body = parseJson(raw);
          sendJson(res, 200, await service.trash({ path: assertStr(body.path, "path") }));
          return;
        }
        if (path4 === "/v1/open") {
          const body = parseJson(raw);
          sendJson(res, 200, await service.openNote({ path: assertStr(body.path, "path") }));
          return;
        }
        if (path4 === "/v1/link") {
          const body = parseJson(raw);
          sendJson(res, 200, await service.noteLink({
            path: assertStr(body.path, "path"),
            source: typeof body.source === "string" ? body.source : void 0
          }));
          return;
        }
        throw new BridgeError(BridgeErrorCode.NOT_FOUND, `\u672A\u77E5\u7AEF\u70B9 ${req.method} ${path4}`, 404);
      }
      throw new BridgeError(BridgeErrorCode.METHOD_NOT_ALLOWED, `\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u6CD5 ${req.method}`, 405);
    } catch (err) {
      sendError(res, err);
    }
  });
  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const port = opts.port + i;
    try {
      await new Promise((resolve2, reject) => {
        server.once("error", reject);
        server.listen(port, opts.host, () => {
          server.removeListener("error", reject);
          const addr = server.address();
          boundPort = typeof addr === "object" && addr !== null ? addr.port : port;
          resolve2();
        });
      });
      server.on("error", (err) => {
        console.warn("[dsh-dock] \u6865\u670D\u52A1\u5668\u8FD0\u884C\u671F\u9519\u8BEF", err);
      });
      server.requestTimeout = 6e4;
      server.headersTimeout = 15e3;
      server.keepAliveTimeout = 5e3;
      let closed = false;
      return {
        port: boundPort,
        close: () => new Promise((resolve2) => {
          if (closed) {
            resolve2();
            return;
          }
          closed = true;
          server.closeAllConnections?.();
          server.close(() => resolve2());
          const t = setTimeout(() => resolve2(), 1e3);
          if (typeof t === "object" && t !== null && "unref" in t) t.unref();
        })
      };
    } catch (err) {
      const code = err.code;
      if (code !== "EADDRINUSE" && code !== "EACCES") throw err;
      if (i === MAX_PORT_TRIES - 1) {
        throw new BridgeError(BridgeErrorCode.INTERNAL, `\u6865\u7AEF\u53E3 ${opts.port}\u2013${opts.port + MAX_PORT_TRIES - 1} \u5747\u88AB\u5360\u7528\uFF0C\u65E0\u6CD5\u542F\u52A8`, 500);
      }
    }
  }
  throw new BridgeError(BridgeErrorCode.INTERNAL, "\u6865\u542F\u52A8\u5931\u8D25", 500);
}

// src/webProxy.ts
var import_node_crypto2 = require("node:crypto");
var fs3 = __toESM(require("node:fs"), 1);
var http2 = __toESM(require("node:http"), 1);
var net = __toESM(require("node:net"), 1);
var COOKIE_PREFIX = "dsh-auth-";
var COOKIE_PAYLOAD_VERSION = 1;
var SECRET_BYTES = 32;
var AUTH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
var PANEL_COOKIE_PREFIX = "dsh-dock-panel";
var PANEL_PARAM = "panel";
function panelCookieName(port) {
  return `${PANEL_COOKIE_PREFIX}_${port}`;
}
var PROBE_TTL_MS = 5e3;
var HOP_BY_HOP = /* @__PURE__ */ new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "te",
  "trailer"
]);
function encodeBase64Url(input) {
  return Buffer.from(input).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function decodeBase64Url(value) {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) return void 0;
  const pad = "=".repeat((4 - value.length % 4) % 4);
  const decoded = Buffer.from(value.replaceAll("-", "+").replaceAll("_", "/") + pad, "base64");
  return encodeBase64Url(decoded) === value ? decoded : void 0;
}
function tokenEquals2(a, b) {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && (0, import_node_crypto2.timingSafeEqual)(ab, bb);
  } catch {
    return false;
  }
}
function authorityOf(host, port) {
  return new URL(`http://${host}:${String(port)}`).host;
}
function cookieName(authority) {
  return COOKIE_PREFIX + encodeBase64Url((0, import_node_crypto2.createHash)("sha256").update(authority).digest());
}
function mintCookieValue(secret, authority, now) {
  const payload = {
    version: COOKIE_PAYLOAD_VERSION,
    authority,
    issuedAt: now,
    expiresAt: now + AUTH_MAX_AGE_MS
  };
  const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = (0, import_node_crypto2.createHmac)("sha256", secret).update(body).digest();
  return `v1.${body}.${encodeBase64Url(sig)}`;
}
function cookieHeader(secret, authority) {
  return `${cookieName(authority)}=${mintCookieValue(secret, authority, Date.now())}`;
}
function readSecretFrom(credentialPath) {
  try {
    const text = fs3.readFileSync(credentialPath, "utf8");
    const m = /client-connection\/browser-session:[\s\S]*?secret:\s*([A-Za-z0-9_-]+)/.exec(text);
    if (!m) return void 0;
    const secret = decodeBase64Url(m[1]);
    return secret !== void 0 && secret.byteLength === SECRET_BYTES ? secret : void 0;
  } catch {
    return void 0;
  }
}
function probeSecretAccepted(host, port, authority, secret, timeoutMs = 3e3) {
  return new Promise((resolve2) => {
    const req = http2.get(
      { host, port, path: "/", headers: { cookie: cookieHeader(secret, authority) }, timeout: timeoutMs },
      (res) => {
        res.resume();
        res.on("end", () => {
          if (res.statusCode === 200) resolve2(true);
          else if (res.statusCode === 401) resolve2(false);
          else resolve2(void 0);
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve2(void 0);
    });
    req.on("error", () => resolve2(void 0));
  });
}
async function selectBrowserSecret(candidates, host, port) {
  const authority = authorityOf(host, port);
  let fallback;
  for (const candidate of candidates) {
    const secret = readSecretFrom(candidate);
    if (secret === void 0) continue;
    if (fallback === void 0) fallback = secret;
    const accepted = await probeSecretAccepted(host, port, authority, secret);
    if (accepted === true) return { secret, verified: true };
    if (accepted === void 0) break;
  }
  return fallback === void 0 ? void 0 : { secret: fallback, verified: false };
}
function probeRequiresAuth(host, port, timeoutMs = 3e3) {
  return new Promise((resolve2) => {
    const req = http2.get({ host, port, path: "/", timeout: timeoutMs }, (res) => {
      res.resume();
      res.on("end", () => resolve2(res.statusCode === 401));
    });
    req.on("timeout", () => {
      req.destroy();
      resolve2(false);
    });
    req.on("error", () => resolve2(false));
  });
}
async function ensureInjectReady(runtime) {
  const now = Date.now();
  if (now - runtime.authProbedAt < PROBE_TTL_MS) return;
  runtime.authProbedAt = now;
  const requiresAuth = await probeRequiresAuth(runtime.targetHost, runtime.targetPort);
  if (!requiresAuth) {
    runtime.secret = null;
    return;
  }
  if (runtime.secret !== null) {
    const accepted = await probeSecretAccepted(
      runtime.targetHost,
      runtime.targetPort,
      runtime.authority,
      runtime.secret
    );
    if (accepted !== false) return;
  }
  const choice = await selectBrowserSecret(runtime.credentialPaths, runtime.targetHost, runtime.targetPort);
  runtime.secret = choice?.secret ?? null;
}
function hostOk(runtime, req) {
  const hostHeader = (req.headers.host ?? "").toLowerCase();
  return hostHeader === `127.0.0.1:${runtime.port}` || hostHeader === `localhost:${runtime.port}` || hostHeader === `[::1]:${runtime.port}`;
}
function hasPanelCookie(runtime, req) {
  const cookie = req.headers.cookie;
  if (cookie === void 0) return false;
  for (const part of cookie.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === runtime.cookieName) {
      return tokenEquals2(part.slice(eq + 1).trim(), runtime.panelToken);
    }
  }
  return false;
}
function bootstrapLocation(runtime, req) {
  if (req.url === void 0) return null;
  const url = new URL(req.url, `http://${runtime.host}:${runtime.port}`);
  const token = url.searchParams.get(PANEL_PARAM);
  if (token === null) return null;
  return tokenEquals2(token, runtime.panelToken) ? stripPanelParam(req.url) : null;
}
function stripPanelParam(reqUrl) {
  const qIdx = reqUrl.indexOf("?");
  if (qIdx === -1) return reqUrl;
  const query = reqUrl.slice(qIdx);
  const hasPanel = query.split("&").some((segment) => {
    const key = segment.replace(/^\?/u, "").split("=")[0].trim();
    return key === PANEL_PARAM;
  });
  if (!hasPanel) return reqUrl;
  const pathPart = reqUrl.slice(0, qIdx);
  const kept = query.split("&").map((s) => s.replace(/^\?/u, "")).filter((s) => s.split("=")[0].trim() !== PANEL_PARAM);
  return kept.length > 0 ? `${pathPart}?${kept.join("&")}` : pathPart;
}
function cookieString(v) {
  if (Array.isArray(v)) return v.join("; ");
  return v;
}
function stripPanelCookie(cookieHeader2, panelCookieName2) {
  if (cookieHeader2 === void 0) return void 0;
  const kept = cookieHeader2.split(";").filter((part) => {
    const eq = part.indexOf("=");
    const key = eq === -1 ? part : part.slice(0, eq);
    return key.trim() !== panelCookieName2;
  });
  return kept.length > 0 ? kept.map((p) => p.trim()).join("; ") : void 0;
}
function panelSetCookie(runtime) {
  return `${runtime.cookieName}=${runtime.panelToken}; HttpOnly; SameSite=None; Secure; Path=/`;
}
function writeDenied(res, message) {
  res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`webProxy: ${message}`);
}
async function createWebProxy(opts) {
  const authority = authorityOf(opts.targetHost, opts.targetPort);
  const requiresAuth = await probeRequiresAuth(opts.targetHost, opts.targetPort);
  const choice = requiresAuth ? await selectBrowserSecret(opts.credentialPaths, opts.targetHost, opts.targetPort) : void 0;
  if (requiresAuth && choice === void 0) {
    throw new Error(
      `webProxy: \u76EE\u6807 dsh web \u9700\u8981\u6D4F\u89C8\u5668\u9274\u6743\uFF0C\u4F46\u672A\u627E\u5230\u4F1A\u8BDD\u7B7E\u540D\u5BC6\u94A5\uFF08\u8BD5\u8FC7: ${JSON.stringify(opts.credentialPaths)}\uFF09\u3002\u8BF7\u786E\u8BA4\u51ED\u8BC1\u5E93\u8DEF\u5F84\uFF0C\u6216\u6539\u7528\u300C\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u300D`
    );
  }
  const injectSecret = requiresAuth ? choice.secret : null;
  const panelToken = (0, import_node_crypto2.randomBytes)(24).toString("base64url");
  const runtime = {
    authority,
    targetHost: opts.targetHost,
    targetPort: opts.targetPort,
    secret: injectSecret,
    credentialPaths: opts.credentialPaths,
    // 初始探测仅作 fail-fast；authProbedAt=0 让首个请求重新探测，自愈「创建时误判无需鉴权」
    authProbedAt: 0,
    panelToken,
    host: opts.host,
    port: 0,
    cookieName: "",
    // 绑定后由 panelCookieName(port) 赋值；请求只会在绑定后到达
    sockets: /* @__PURE__ */ new Set(),
    agent: new http2.Agent({ keepAlive: true, maxSockets: 256 })
  };
  const server = http2.createServer(async (req, res) => {
    try {
      await ensureInjectReady(runtime);
    } catch {
      writeDenied(res, "\u9274\u6743\u63A2\u6D4B\u5931\u8D25");
      return;
    }
    if (!hostOk(runtime, req)) {
      writeDenied(res, "\u62D2\u7EDD\u975E\u672C\u673A Host \u8BF7\u6C42");
      return;
    }
    const path4 = stripPanelParam(req.url ?? "/");
    if (hasPanelCookie(runtime, req)) {
      proxyToUpstream(runtime, req, res, path4);
      return;
    }
    const location = bootstrapLocation(runtime, req);
    if (location !== null) {
      res.writeHead(302, { Location: location, "Set-Cookie": panelSetCookie(runtime), "Cache-Control": "no-store" });
      res.end();
      return;
    }
    writeDenied(res, "\u7F3A\u5C11\u9762\u677F\u9274\u6743 cookie");
  });
  server.on("upgrade", (req, socket, head) => {
    void ensureInjectReady(runtime).then(() => handleUpgrade(runtime, req, socket, head)).catch(() => socket.end("HTTP/1.1 500 Internal Server Error\r\n\r\n"));
  });
  await new Promise((resolve2, reject) => {
    server.once("error", reject);
    server.listen(opts.port, opts.host, () => {
      server.removeListener("error", reject);
      resolve2();
    });
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : opts.port;
  runtime.port = port;
  runtime.cookieName = panelCookieName(port);
  return {
    host: opts.host,
    port,
    url: `http://${opts.host}:${String(port)}/`,
    panelToken,
    cookieName: runtime.cookieName,
    close: () => closeProxy(server, runtime)
  };
}
function proxyToUpstream(runtime, req, res, path4) {
  const headers = buildUpstreamHeaders(runtime, req.headers);
  const upstream = http2.request(
    {
      host: runtime.targetHost,
      port: runtime.targetPort,
      method: req.method,
      path: path4,
      headers,
      agent: runtime.agent
    },
    (upstreamRes) => {
      const responseHeaders = { ...upstreamRes.headers };
      for (const hop of HOP_BY_HOP) delete responseHeaders[hop];
      res.writeHead(upstreamRes.statusCode ?? 502, responseHeaders);
      if (req.method === "HEAD") {
        upstreamRes.resume();
        upstreamRes.on("end", () => res.end());
        return;
      }
      upstreamRes.pipe(res);
      upstreamRes.on("end", () => res.end());
      upstreamRes.on("error", () => res.destroy());
    }
  );
  upstream.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(`webProxy: \u4E0A\u6E38\u8F6C\u53D1\u5931\u8D25: ${String(err)}`);
    } else {
      res.destroy();
    }
  });
  req.on("error", () => upstream.destroy());
  req.pipe(upstream);
}
function buildUpstreamHeaders(runtime, incoming) {
  const headers = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (value === void 0) continue;
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) continue;
    headers[lower] = value;
  }
  headers.host = runtime.authority;
  if (runtime.secret !== null) {
    headers.cookie = cookieHeader(runtime.secret, runtime.authority);
  } else {
    const stripped = stripPanelCookie(cookieString(headers.cookie), runtime.cookieName);
    if (stripped === void 0) delete headers.cookie;
    else headers.cookie = stripped;
  }
  if (headers.origin !== void 0) headers.origin = `http://${runtime.authority}`;
  headers["sec-fetch-site"] = "same-origin";
  return headers;
}
function buildUpgradeHeaders(runtime, incoming) {
  const headers = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (value === void 0) continue;
    const lower = key.toLowerCase();
    if (lower === "proxy-connection") continue;
    headers[lower] = value;
  }
  headers.host = runtime.authority;
  if (runtime.secret !== null) {
    headers.cookie = cookieHeader(runtime.secret, runtime.authority);
  } else {
    const stripped = stripPanelCookie(cookieString(headers.cookie), runtime.cookieName);
    if (stripped === void 0) delete headers.cookie;
    else headers.cookie = stripped;
  }
  if (headers.origin !== void 0) headers.origin = `http://${runtime.authority}`;
  headers["sec-fetch-site"] = "same-origin";
  return headers;
}
function handleUpgrade(runtime, req, socket, head) {
  if (!hostOk(runtime, req) || !hasPanelCookie(runtime, req)) {
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }
  const cleanUrl = stripPanelParam(req.url ?? "/");
  runtime.sockets.add(socket);
  socket.on("close", () => runtime.sockets.delete(socket));
  const headers = buildUpgradeHeaders(runtime, req.headers);
  const lines = [`${req.method} ${cleanUrl} HTTP/1.1`];
  for (const [key, value] of Object.entries(headers)) {
    if (value === void 0) continue;
    lines.push(`${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
  }
  const rawRequest = lines.join("\r\n") + "\r\n\r\n";
  const upstream = net.connect({ host: runtime.targetHost, port: runtime.targetPort }, () => {
    upstream.write(rawRequest);
    if (head !== void 0 && head.length > 0) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  runtime.sockets.add(upstream);
  upstream.on("close", () => {
    runtime.sockets.delete(upstream);
    socket.destroy();
  });
  upstream.on("error", () => socket.destroy());
  socket.on("close", () => upstream.destroy());
  socket.on("error", () => upstream.destroy());
}
function closeProxy(server, runtime) {
  return new Promise((resolve2) => {
    for (const sock of runtime.sockets) {
      try {
        sock.destroy();
      } catch {
      }
    }
    runtime.sockets.clear();
    runtime.agent.destroy();
    server.closeAllConnections?.();
    server.close(() => resolve2());
  });
}

// src/obsidianService.ts
var import_obsidian4 = require("obsidian");
function noteRel(input) {
  const trimmed = input.trim();
  if (trimmed === "") throw new BridgeError(BridgeErrorCode.PATH_INVALID, "\u7B14\u8BB0\u8DEF\u5F84\u4E0D\u80FD\u4E3A\u7A7A", 400);
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("\\")) {
    throw new BridgeError(BridgeErrorCode.PATH_INVALID, `\u7B14\u8BB0\u8DEF\u5F84\u5FC5\u987B\u662F vault \u76F8\u5BF9\u8DEF\u5F84\uFF08/ \u5206\u9694\uFF0C\u4E0D\u542B\u76D8\u7B26\uFF09\uFF1A${trimmed}`, 400);
  }
  const segments = trimmed.split(/[\\/]+/).filter((s) => s !== "" && s !== ".");
  if (segments.includes("..")) {
    throw new BridgeError(BridgeErrorCode.PATH_INVALID, `\u7B14\u8BB0\u8DEF\u5F84\u4E0D\u80FD\u5305\u542B .. \u6BB5\uFF1A${trimmed}`, 400);
  }
  const joined = (0, import_obsidian4.normalizePath)(segments.join("/"));
  if (joined === "") throw new BridgeError(BridgeErrorCode.PATH_INVALID, "\u7B14\u8BB0\u8DEF\u5F84\u4E0D\u80FD\u4E3A\u7A7A", 400);
  const noExt = joined.replace(/\.md$/, "");
  const base = noExt.split("/").pop() ?? "";
  if (noExt === "" || base === "" || base === ".") {
    throw new BridgeError(BridgeErrorCode.PATH_INVALID, `\u7B14\u8BB0\u8DEF\u5F84\u65E0\u6548\uFF08\u7F3A\u5C11\u6587\u4EF6\u540D\uFF09\uFF1A${trimmed}`, 400);
  }
  return noExt + ".md";
}
function stemOf(rel) {
  return (rel.replace(/\.md$/, "").split("/").pop() ?? "") || rel;
}
function isRiskyRegex(q) {
  if (/\([^()]*[+*{][^()]*\)\s*[+*?{]/.test(q)) return true;
  if (/\([^()]*\|[^()]*\)\s*[+*]/.test(q)) return true;
  return false;
}
function inIgnoredDir(rel, ignoreDirs) {
  const dirs = rel.split("/").slice(0, -1);
  return dirs.some((d) => d.startsWith(".") || ignoreDirs.includes(d));
}
function inFolder(rel, folder) {
  if (!folder) return true;
  const prefix = folder.replace(/^\/+/, "").replace(/\/+$/, "");
  if (prefix === "") return true;
  return rel === prefix || rel.startsWith(prefix + "/");
}
function stringifyFmValue(v) {
  if (v === null || v === void 0) return "";
  if (Array.isArray(v)) return `[${v.map((x) => String(x)).join(", ")}]`;
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
function parseFmScalar(s) {
  const v = s.trim();
  if (v.startsWith("[") && v.endsWith("]")) {
    return v.slice(1, -1).split(",").map((x) => x.trim()).filter((x) => x.length > 0);
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (v.length >= 2 && (v.startsWith('"') && v.endsWith('"') || v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}
function fmTagsOf(frontmatter) {
  if (!frontmatter) return [];
  const out = [];
  for (const key of ["tags", "tag"]) {
    const v = frontmatter[key];
    if (Array.isArray(v)) out.push(...v.map((x) => String(x)));
    else if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  return out;
}
function fmAliasesOf(frontmatter) {
  if (!frontmatter) return [];
  const v = frontmatter["aliases"];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter((x) => x.length > 0);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}
function isWikilink(original) {
  return original.startsWith("[[") || original.startsWith("![");
}
function wikilinkBody(original) {
  const inner = original.startsWith("![") ? original.slice(3) : original.slice(2);
  return inner.replace(/\]\]$/, "").trim();
}
function isExternalUrl(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) && !/^[a-z]:[\\/]/i.test(target);
}
var MARKDOWN_LINK_RE = /^\[([^\]]*)\]\(([^)]*)\)$/;
function parseMarkdownLink(original) {
  const m = MARKDOWN_LINK_RE.exec(original);
  if (!m) return { target: original, text: "" };
  let target = m[2].trim();
  if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
  return { target, text: m[1] ?? "" };
}
function excerptAround(text, index, queryLen, radius = 80) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + queryLen + radius);
  const before = start > 0 ? "\u2026" : "";
  const after = end < text.length ? "\u2026" : "";
  return `${before}${text.slice(start, end).replace(/\s+/g, " ").trim()}${after}`;
}
function fieldsOf(frontmatter) {
  if (!frontmatter) return [];
  return Object.entries(frontmatter).map(([key, value]) => ({ key, value: stringifyFmValue(value) }));
}
var ObsidianBridgeService = class {
  constructor(app, version) {
    this.app = app;
    this.info = { name: app.vault.getName(), path: this.vaultPath(), version };
  }
  app;
  info;
  vaultPath() {
    const adapter = this.app.vault.adapter;
    return adapter instanceof import_obsidian4.FileSystemAdapter ? adapter.getBasePath() : void 0;
  }
  // ------------------------------------------------------------- 只读
  current() {
    const activeFile = this.app.workspace.getActiveFile()?.path;
    const result = {
      name: this.app.vault.getName(),
      path: this.info.path ?? "",
      updatedAt: Date.now()
    };
    if (activeFile) result.activeFile = activeFile;
    return result;
  }
  /** Obsidian 视角的文件集（getMarkdownFiles / getFiles），按 ignoreDirs + folder 过滤 */
  vaultFiles(opts) {
    const files = opts.all ? this.app.vault.getFiles() : this.app.vault.getMarkdownFiles();
    return files.filter(
      (f) => !inIgnoredDir(f.path, opts.ignoreDirs) && inFolder(f.path, opts.folder)
    );
  }
  fileOf(rel) {
    const relN = noteRel(rel);
    const f = this.app.vault.getAbstractFileByPath(relN);
    if (!f) throw new BridgeError(BridgeErrorCode.NOTE_NOT_FOUND, `\u7B14\u8BB0\u4E0D\u5B58\u5728\uFF1A${relN}`, 404);
    if (!(f instanceof import_obsidian4.TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `\u8DEF\u5F84\u4E0D\u662F\u6587\u4EF6\uFF1A${relN}`, 400);
    return f;
  }
  async listNotes(opts) {
    const notes = this.vaultFiles(opts).map((f) => {
      const item = { path: f.path, size: f.stat.size };
      if (opts.all) {
        const dot = f.path.lastIndexOf(".");
        item.extension = f.path.endsWith(".md") ? "md" : dot > 0 ? f.path.slice(dot + 1).toLowerCase() : "";
      }
      return item;
    });
    return { total: notes.length, notes };
  }
  async listFolders(opts) {
    const counts = /* @__PURE__ */ new Map();
    counts.set("", 0);
    const adapter = this.app.vault.adapter;
    const walk = async (dir, rel) => {
      let list;
      try {
        list = await adapter.list(dir);
      } catch {
        return;
      }
      for (const folder of list.folders) {
        const name = (folder.split("/").pop() ?? "").replace(/^\/+/, "");
        if (name.startsWith(".") || opts.ignoreDirs.includes(name)) continue;
        const relDir = rel === "" ? name : `${rel}/${name}`;
        counts.set(relDir, 0);
        await walk(folder, relDir);
      }
      for (const file of list.files) {
        if (file.endsWith(".md")) counts.set(rel, (counts.get(rel) ?? 0) + 1);
      }
    };
    await walk("", "");
    let folders = [...counts.entries()].map(([path4, notes]) => ({ path: path4, notes }));
    if (opts.folder) {
      const prefix = opts.folder.replace(/^\/+/, "").replace(/\/+$/, "");
      folders = folders.filter((f) => f.path === prefix || f.path.startsWith(prefix + "/"));
    }
    folders.sort((a, b) => a.path.localeCompare(b.path));
    return { total: folders.length, folders };
  }
  async readNote(rel) {
    const file = this.fileOf(rel);
    const content = await this.app.vault.cachedRead(file);
    return { path: file.path, content, size: file.stat.size, mtime: file.stat.mtime };
  }
  async metadata(rel) {
    const file = this.fileOf(rel);
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    const inlineTags = (cache?.tags ?? []).map((t) => t.tag.replace(/^#/, "")).filter((t) => t.length > 0);
    const tags = [.../* @__PURE__ */ new Set([...inlineTags, ...fmTagsOf(frontmatter)])];
    const aliases = fmAliasesOf(frontmatter);
    const wikilinks = [];
    const markdown = [];
    let unresolved = 0;
    const countUnresolved = (dest) => {
      if (!dest) unresolved++;
    };
    for (const link of cache?.links ?? []) {
      const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
      countUnresolved(dest);
      if (isWikilink(link.original)) {
        wikilinks.push({ body: wikilinkBody(link.original), embedded: false });
      } else {
        const md = parseMarkdownLink(link.original);
        if (!isExternalUrl(md.target)) markdown.push(md);
      }
    }
    for (const emb of cache?.embeds ?? []) {
      countUnresolved(this.app.metadataCache.getFirstLinkpathDest(emb.link, file.path));
      wikilinks.push({ body: wikilinkBody(emb.original), embedded: true });
    }
    return {
      path: file.path,
      size: file.stat.size,
      mtime: file.stat.mtime,
      frontmatter: { present: frontmatter !== void 0, fields: fieldsOf(frontmatter) },
      tags,
      aliases,
      wikilinks,
      markdown,
      unresolved
    };
  }
  async frontmatter(rel) {
    const meta = await this.metadata(rel);
    return {
      path: meta.path,
      present: meta.frontmatter.present,
      valid: true,
      fields: meta.frontmatter.fields,
      issues: []
    };
  }
  async backlinks(req) {
    const format = req.format ?? "wikilink";
    let targetRel;
    let ambiguous = false;
    if (req.path && req.path.trim()) {
      targetRel = this.fileOf(req.path).path;
    } else if (req.title && req.title.trim()) {
      const title = req.title.trim();
      const candidates = this.app.vault.getMarkdownFiles().filter((f) => stemOf(f.path).toLowerCase() === title.toLowerCase());
      ambiguous = candidates.length > 1;
      candidates.sort((a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path));
      targetRel = candidates[0]?.path;
    } else {
      throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "path \u4E0E title \u81F3\u5C11\u63D0\u4F9B\u5176\u4E00", 400);
    }
    if (!targetRel) {
      return { total: 0, backlinks: [], target: req.title, ambiguous };
    }
    const targetKey = targetRel.toLowerCase();
    const targetStem = stemOf(targetRel).toLowerCase();
    const checkWikilink = format === "wikilink" || format === "all";
    const checkMarkdown = format === "markdown" || format === "all";
    const hits = [];
    for (const source of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(source);
      if (!cache) continue;
      let hit;
      const consider = (link, isEmbed) => {
        const md = !isWikilink(link.original) && !isEmbed;
        if (md && !checkMarkdown) return false;
        if (!md && !checkWikilink) return false;
        const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, source.path);
        if (dest) return dest.path.toLowerCase() === targetKey;
        if (req.path) {
          return link.link.replace(/\.md$/i, "").toLowerCase() === targetKey.replace(/\.md$/i, "");
        }
        return stemOf(link.link).toLowerCase() === targetStem || link.link.replace(/\.md$/i, "").toLowerCase() === targetKey.replace(/\.md$/i, "");
      };
      for (const link of cache.links ?? []) {
        if (consider(link, false)) {
          hit = await this.snippetHit(source, link);
          break;
        }
      }
      if (!hit && checkWikilink) {
        for (const emb of cache.embeds ?? []) {
          if (consider(emb, true)) {
            hit = await this.snippetHit(source, emb);
            break;
          }
        }
      }
      if (hit) hits.push(hit);
    }
    const result = {
      total: hits.length,
      backlinks: hits,
      target: req.path ? targetRel.replace(/\.md$/, "") : req.title
    };
    if (ambiguous) result.ambiguous = true;
    return result;
  }
  async snippetHit(source, link) {
    const content = await this.app.vault.cachedRead(source);
    const offset = link.position?.start?.offset ?? content.indexOf(link.original);
    return {
      path: source.path,
      snippet: offset >= 0 ? excerptAround(content, offset, Math.max(link.original.length, 1)) : "\u94FE\u63A5\u547D\u4E2D"
    };
  }
  async search(req) {
    const q = req.q.trim();
    if (q === "") throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "query \u4E0D\u80FD\u4E3A\u7A7A", 400);
    if (q.length > 256) {
      throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "query \u8FC7\u957F\uFF08\u6700\u591A 256 \u5B57\u7B26\uFF09\uFF0C\u8BF7\u7B80\u5316\u641C\u7D22\u8BCD", 400);
    }
    const regex = req.regex ?? false;
    const caseSensitive = req.case_sensitive ?? false;
    const matchAll = req.match_all ?? false;
    let re;
    if (regex) {
      if (isRiskyRegex(q)) {
        throw new BridgeError(
          BridgeErrorCode.REGEX_INVALID,
          `\u6B63\u5219\u7591\u4F3C\u707E\u96BE\u6027\u56DE\u6EAF\uFF0C\u5DF2\u62D2\u7EDD\uFF1A${q}\uFF08\u8BF7\u7B80\u5316\uFF0C\u6216\u6539\u7528\u666E\u901A\u5173\u952E\u8BCD\u641C\u7D22\uFF09`,
          400
        );
      }
      try {
        re = new RegExp(q, caseSensitive ? "" : "i");
      } catch (err) {
        throw new BridgeError(
          BridgeErrorCode.REGEX_INVALID,
          `\u6B63\u5219\u65E0\u6548\uFF1A${q}\uFF08${err instanceof Error ? err.message : String(err)}\uFF09`,
          400
        );
      }
    }
    const tokens = !regex && matchAll ? q.split(/\s+/).filter((t) => t.length > 0) : void 0;
    const limit = Math.max(1, Math.min(req.limit ?? 20, 200));
    const files = this.vaultFiles({ folder: req.folder, all: false, ignoreDirs: req.ignoreDirs });
    const hits = [];
    for (const file of files) {
      if (hits.length >= limit) break;
      let content;
      try {
        content = await this.app.vault.cachedRead(file);
      } catch {
        continue;
      }
      const path4 = file.path;
      const text = content;
      const haystack = caseSensitive ? `${path4}
${text}` : `${path4}
${text}`.toLowerCase();
      let nameMatch = false;
      let bodyIndex = -1;
      let matchLen = 0;
      if (regex && re) {
        const m = re.exec(text);
        if (m) {
          bodyIndex = m.index;
          matchLen = m[0].length;
        }
        nameMatch = re.test(path4);
      } else if (tokens) {
        nameMatch = tokens.every((t) => haystack.includes(caseSensitive ? t : t.toLowerCase()));
        if (nameMatch) {
          for (const t of tokens) {
            const idx = (caseSensitive ? text : text.toLowerCase()).indexOf(caseSensitive ? t : t.toLowerCase());
            if (idx >= 0) {
              bodyIndex = idx;
              matchLen = t.length;
              break;
            }
          }
        }
      } else {
        const needle = caseSensitive ? q : q.toLowerCase();
        nameMatch = path4.includes(needle) || haystack.includes(needle);
        bodyIndex = (caseSensitive ? text : text.toLowerCase()).indexOf(needle);
        matchLen = q.length;
      }
      if ((nameMatch || bodyIndex >= 0) && hits.length < limit) {
        hits.push({
          path: path4,
          snippet: bodyIndex >= 0 ? excerptAround(text, bodyIndex, Math.max(matchLen, 1)) : "\u6587\u4EF6\u540D\u547D\u4E2D\uFF08\u6B63\u6587\u65E0\u5339\u914D\uFF09"
        });
      }
    }
    return { total: hits.length, hits };
  }
  async searchTags(req) {
    const q = req.tag.trim().toLowerCase();
    if (q === "") throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "tag \u4E0D\u80FD\u4E3A\u7A7A", 400);
    const limit = Math.max(1, Math.min(req.limit ?? 20, 200));
    const hits = [];
    for (const file of this.vaultFiles({ folder: req.folder, all: false, ignoreDirs: req.ignoreDirs })) {
      if (hits.length >= limit) break;
      const cache = this.app.metadataCache.getFileCache(file);
      const inline = (cache?.tags ?? []).map((t) => t.tag.replace(/^#/, "")).filter((t) => t.length > 0);
      const all = [.../* @__PURE__ */ new Set([...inline, ...fmTagsOf(cache?.frontmatter)])];
      const matched = all.filter((t) => {
        const l = t.toLowerCase();
        return l === q || l.startsWith(q + "/");
      }).sort();
      if (matched.length > 0) hits.push({ path: file.path, tags: matched });
    }
    return { total: hits.length, hits };
  }
  // ------------------------------------------------------------- 写入
  /**
   * 确保 rel 的父目录存在：Obsidian 的 vault.create 不会自动建目录，
   * 父目录缺失时底层 fs 会抛 ENOENT（典型场景：往全新目录写第一篇笔记）。
   * 逐级 createFolder，已存在的目录跳过（createFolder 对已存在目录会抛错）。
   */
  async ensureParentFolder(rel) {
    const idx = rel.lastIndexOf("/");
    if (idx <= 0) return;
    const parts = rel.slice(0, idx).split("/");
    let cur = "";
    for (const part of parts) {
      cur = cur === "" ? part : `${cur}/${part}`;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        await this.app.vault.createFolder(cur);
      }
    }
  }
  async writeNote(req) {
    const rel = noteRel(req.path);
    const existing = this.app.vault.getAbstractFileByPath(rel);
    const byteLen = (s) => Buffer.byteLength(s, "utf8");
    if (req.op === "append") {
      if (!existing) throw new BridgeError(BridgeErrorCode.NOTE_NOT_FOUND, `\u7B14\u8BB0\u4E0D\u5B58\u5728\uFF1A${rel}\uFF08\u5982\u9700\u65B0\u5EFA\u8BF7\u7528 vault_create_note\uFF09`, 404);
      if (!(existing instanceof import_obsidian4.TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `\u8DEF\u5F84\u4E0D\u662F\u6587\u4EF6\uFF1A${rel}`, 400);
      const current = await this.app.vault.cachedRead(existing);
      const glued = current === "" || current.endsWith("\n") || req.content.startsWith("\n") ? current + req.content : current + "\n" + req.content;
      await this.app.vault.modify(existing, glued);
      return { path: rel, operation: "append", addedChars: req.content.length, bytes: byteLen(glued), after: glued };
    }
    if (existing) {
      if (!(existing instanceof import_obsidian4.TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `\u8DEF\u5F84\u5DF2\u5B58\u5728\u4F46\u4E0D\u662F\u6587\u4EF6\uFF1A${rel}`, 400);
      if (req.unique) {
        const noExt = rel.replace(/\.md$/, "");
        const dir = noExt.includes("/") ? noExt.slice(0, noExt.lastIndexOf("/")) : "";
        const base = noExt.split("/").pop() ?? "name";
        let i = 1;
        let candidate = dir !== "" ? `${dir}/${base} ${i}.md` : `${base} ${i}.md`;
        while (this.app.vault.getAbstractFileByPath(candidate)) {
          i++;
          candidate = dir !== "" ? `${dir}/${base} ${i}.md` : `${base} ${i}.md`;
        }
        await this.ensureParentFolder(candidate);
        await this.app.vault.create(candidate, req.content);
        return { path: candidate, operation: "create", bytes: byteLen(req.content) };
      }
      if (!req.overwrite) {
        throw new BridgeError(BridgeErrorCode.EXISTS, `\u7B14\u8BB0\u5DF2\u5B58\u5728\uFF1A${rel}\uFF08\u5982\u9700\u8986\u76D6\u8BF7\u4F20 overwrite: true\uFF0C\u6216\u4F20 unique: true \u751F\u6210\u552F\u4E00\u540D\uFF09`, 409);
      }
      await this.app.vault.modify(existing, req.content);
      return { path: rel, operation: "update", bytes: byteLen(req.content) };
    }
    await this.ensureParentFolder(rel);
    await this.app.vault.create(rel, req.content);
    return { path: rel, operation: "create", bytes: byteLen(req.content) };
  }
  async editNote(req) {
    const file = this.fileOf(req.path);
    if (req.old_string === "") throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "old_string \u4E0D\u80FD\u4E3A\u7A7A", 400);
    const current = await this.app.vault.cachedRead(file);
    const eol = current.includes("\r\n") ? "\r\n" : "\n";
    const oldInFile = req.old_string.replaceAll(/\r?\n/g, eol);
    const newInFile = req.new_string.replaceAll(/\r?\n/g, eol);
    const count = current.split(oldInFile).length - 1;
    if (count === 0) {
      throw new BridgeError(BridgeErrorCode.EDIT_NOT_FOUND, `\u5728 ${file.path} \u4E2D\u672A\u627E\u5230\u4E0E old_string \u7CBE\u786E\u5339\u914D\u7684\u6587\u672C\uFF1B\u7F16\u8F91\u6309\u5B57\u9762\u5339\u914D\uFF0C\u8BF7\u5148 vault_read_note \u6838\u5BF9\u539F\u6587\uFF08\u6CE8\u610F\u6362\u884C\u4E0E\u9996\u5C3E\u7A7A\u767D\uFF09`, 404);
    }
    if (count > 1 && !req.replace_all) {
      throw new BridgeError(BridgeErrorCode.AMBIGUOUS_EDIT, `old_string \u5728 ${file.path} \u4E2D\u51FA\u73B0\u591A\u6B21\uFF08\u9ED8\u8BA4\u53EA\u5141\u8BB8\u4E00\u6B21\u7CBE\u786E\u66FF\u6362\uFF09\uFF1B\u8BF7\u63D0\u4F9B\u66F4\u957F\u4E0A\u4E0B\u6587\uFF0C\u6216\u8BBE replace_all: true`, 400);
    }
    const after = req.replace_all ? current.split(oldInFile).join(newInFile) : current.replace(oldInFile, newInFile);
    await this.app.vault.modify(file, after);
    return { path: file.path, before: current, after, matches: count };
  }
  async updateFrontmatter(req) {
    const file = this.fileOf(req.path);
    const setEntries = Object.entries(req.set ?? {});
    for (const [k, v] of setEntries) {
      if (/[\r\n]/.test(v)) {
        throw new BridgeError(BridgeErrorCode.FRONTMATTER_MULTILINE, `frontmatter \u503C\u5FC5\u987B\u5355\u884C\uFF08\u5B57\u6BB5 ${k} \u7684\u53D6\u503C\u542B\u6362\u884C\uFF09\uFF1B\u5217\u8868\u8BF7\u7528\u5185\u8054\u6570\u7EC4 [a, b]`, 400);
      }
      if (k.trim() === "" || !/^[^:#][^:]*$/.test(k)) {
        throw new BridgeError(BridgeErrorCode.INVALID_ARGS, `\u65E0\u6548\u7684 frontmatter \u5B57\u6BB5\u540D\uFF1A${k}`, 400);
      }
    }
    const del = (req.delete ?? []).map((k) => k.trim()).filter((k) => k.length > 0);
    if (setEntries.length === 0 && del.length === 0) {
      throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "set \u4E0E delete \u81F3\u5C11\u63D0\u4F9B\u5176\u4E00", 400);
    }
    const beforeCache = this.app.metadataCache.getFileCache(file);
    const created = beforeCache?.frontmatter === void 0;
    const before = fieldsOf(beforeCache?.frontmatter);
    const changes = [
      ...setEntries.map(([key, value]) => ({ op: "set", key, value })),
      ...del.map((key) => ({ op: "delete", key }))
    ];
    let saved;
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      for (const [k, v] of setEntries) fm[k] = parseFmScalar(v);
      for (const k of del) delete fm[k];
      saved = { ...fm };
    });
    const after = fieldsOf(saved);
    return { path: file.path, created, changes, before, after, issues: [] };
  }
  async rename(req) {
    const oldRel = noteRel(req.old_path);
    const newRel = noteRel(req.new_path);
    if (oldRel === newRel) throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "\u65B0\u65E7\u8DEF\u5F84\u76F8\u540C\uFF0C\u65E0\u9700\u91CD\u547D\u540D", 400);
    const oldFile = this.app.vault.getAbstractFileByPath(oldRel);
    if (!oldFile) throw new BridgeError(BridgeErrorCode.NOTE_NOT_FOUND, `\u7B14\u8BB0\u4E0D\u5B58\u5728\uFF1A${oldRel}`, 404);
    if (!(oldFile instanceof import_obsidian4.TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `\u8DEF\u5F84\u4E0D\u662F\u6587\u4EF6\uFF1A${oldRel}`, 400);
    if (this.app.vault.getAbstractFileByPath(newRel)) {
      throw new BridgeError(BridgeErrorCode.EXISTS, `\u76EE\u6807\u5DF2\u5B58\u5728\uFF1A${newRel}`, 409);
    }
    const countRefs = async (path4) => {
      const src = this.app.vault.getAbstractFileByPath(path4);
      if (!(src instanceof import_obsidian4.TFile)) return 0;
      const cache = this.app.metadataCache.getFileCache(src);
      if (!cache) return 0;
      let n = 0;
      for (const link of [...cache.links ?? [], ...cache.embeds ?? []]) {
        const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, src.path);
        if (dest && dest.path === oldRel) n++;
      }
      return n;
    };
    const selfCount = await countRefs(oldRel);
    const updated = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path === oldRel) continue;
      const n = await countRefs(f.path);
      if (n > 0) updated.push({ path: f.path, count: n });
    }
    await this.ensureParentFolder(newRel);
    await this.app.fileManager.renameFile(oldFile, newRel);
    let oldHandling = "kept";
    if (req.keep_old === "stub") {
      const stub = `---
moved: true
---

> \u6B64\u7B14\u8BB0\u5DF2\u79FB\u81F3 [[${newRel.replace(/\.md$/, "")}]]\u3002

\uFF08\u539F\u8DEF\u5F84\u4FDD\u7559\u4E3A\u8DF3\u8F6C\u5360\u4F4D\uFF1B\u5982\u9700\u5F7B\u5E95\u5220\u9664\u8BF7\u7528 bash \u6E05\u7406\u3002\uFF09
`;
      try {
        await this.app.vault.create(oldRel, stub);
        oldHandling = "stubbed";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BridgeError(
          BridgeErrorCode.RENAME_STUB_FAILED,
          `\u5199\u8DF3\u8F6C\u5360\u4F4D\u5931\u8D25 ${oldRel}\uFF1A${msg}\u3002\u91CD\u547D\u540D\u672C\u8EAB\u5DF2\u5B8C\u6210\uFF08\u65B0\u6587\u4EF6 ${newRel} \u5DF2\u521B\u5EFA\u3001\u5F15\u7528\u5DF2\u66F4\u65B0\uFF09\uFF0C\u4EC5\u65E7\u6587\u4EF6\u5185\u5BB9\u672A\u53D8\u3002`,
          500
        );
      }
    }
    if (selfCount > 0) updated.unshift({ path: newRel, count: selfCount });
    const totalLinks = updated.reduce((s, u) => s + u.count, 0);
    return { old_path: oldRel, new_path: newRel, totalLinks, updated, old_handling: oldHandling };
  }
  // ------------------------------------------------------------- 扩展能力
  /**
   * 回收站删除：fileManager.trashFile 按用户 Obsidian 设置（移入 .trash/ 或
   * 系统回收站，可恢复）；旧版 Obsidian（<1.7.0）降级 vault.trash(file, true)
   * 直接进系统回收站。
   */
  async trash(req) {
    const file = this.fileOf(req.path);
    const fm = this.app.fileManager;
    if (typeof fm.trashFile === "function") {
      await fm.trashFile(file);
    } else {
      await this.app.vault.trash(file, true);
    }
    return { path: file.path, trashed: true };
  }
  /** 在 Obsidian 中打开/聚焦笔记（当前叶子，不强制新窗口） */
  async openNote(req) {
    const file = this.fileOf(req.path);
    await this.app.workspace.openLinkText(file.path, "", false);
    return { path: file.path, opened: true };
  }
  /** 全库标签聚合：metadataCache.getAllTags 官方解析（含 frontmatter tags） */
  async allTags(opts) {
    const counts = /* @__PURE__ */ new Map();
    for (const file of this.vaultFiles({ folder: opts.folder, all: false, ignoreDirs: opts.ignoreDirs })) {
      const cache = this.app.metadataCache.getFileCache(file);
      const tags2 = cache ? (0, import_obsidian4.getAllTags)(cache) : null;
      if (tags2) {
        for (const raw of tags2) {
          const tag = raw.replace(/^#/, "");
          if (tag.length > 0) counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
    }
    const tags = [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
    return { total: tags.length, tags };
  }
  /** 生成标准链接文本：fileManager.generateMarkdownLink 遵循用户 useMarkdownLinks 设置 */
  async noteLink(req) {
    const file = this.fileOf(req.path);
    const source = (req.source ?? "").trim();
    const link = this.app.fileManager.generateMarkdownLink(file, source, "");
    return { path: file.path, link, format: link.startsWith("[[") ? "wikilink" : "markdown" };
  }
};

// src/main.ts
var BRIDGE_PORT_BASE = 18080;
function computeBridgePort(vaultRoot) {
  if (vaultRoot) {
    const offset = parseInt(stableHash(`${vaultRoot}:bridge`), 36) % 4096;
    return BRIDGE_PORT_BASE + offset;
  }
  return BRIDGE_PORT_BASE;
}
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
var DshDockPlugin = class extends import_obsidian5.Plugin {
  settings = DEFAULT_SETTINGS;
  proc = null;
  status = { kind: "stopped" };
  starting = false;
  statusBarEl = null;
  statusListeners = /* @__PURE__ */ new Set();
  /** 标记文件写入防抖 timer（窗口 focus 可能高频触发） */
  markerTimer = null;
  /** 用户已请求停止：start() 中途检测到则杀掉刚拉起的进程、不再接管（M3 竞态） */
  cancelStart = false;
  /**
   * Obsidian API 桥（B1）：本窗口的 Obsidian 渲染进程内 HTTP 服务，把
   * app.vault / metadataCache / fileManager 的官方解析结果暴露给 DSH 侧
   * 工具插件。token 每次插件加载重新生成，经 env + 标记文件两个通道注入。
   */
  bridge = null;
  bridgeToken = (0, import_crypto.randomBytes)(24).toString("base64url");
  /**
   * 面板鉴权反向代理：把官方 dsh web 作为跨站 iframe 在 Obsidian 里显示所必需。
   * dsh web 的浏览器鉴权 cookie 是 SameSite=Strict，跨站 iframe 无法存储/发送；
   * 本代理读取 dsh web 凭证库里的浏览器会话签名密钥、注入有效 cookie，故面板
   * 无需 launch token、无论服务是新起还是已存在都能显示。生命周期跟随 dsh web 进程。
   */
  webProxy = null;
  /** 桥的访问地址（运行中才有值） */
  get bridgeUrl() {
    return this.bridge ? `http://${this.loopbackHost()}:${this.bridge.port}` : null;
  }
  // ------------------------------------------------------------------ 生命周期
  async onload() {
    await this.loadSettings();
    this.registerView(DSH_WEB_VIEW_TYPE, (leaf) => new DshWebView(leaf, this));
    this.refreshCurrentVaultMarker();
    this.registerDomEvent(window, "focus", () => this.refreshCurrentVaultMarker());
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshCurrentVaultMarker()));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshCurrentVaultMarker()));
    this.registerEvent(this.app.workspace.on("window-open", () => this.refreshCurrentVaultMarker()));
    if (this.settings.bridgeEnabled) {
      void this.startBridge();
    }
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
    if (this.markerTimer) window.clearTimeout(this.markerTimer);
    this.markerTimer = null;
    this.cancelStart = true;
    void this.stop();
    void this.stopBridge();
    this.statusListeners.clear();
  }
  /**
   * D7：首次"用户手动启用"时只跑一次的钩子（Plugin.onUserEnable,
   * obsidian.d.ts:5073，Obsidian 1.7.2+ 调用；旧版本忽略该钩子，插件照常工作，
   * 因此无需抬 minAppVersion）。只做引导提示，不做任何初始化。
   */
  onUserEnable() {
    new import_obsidian5.Notice("DSH Dock \u5DF2\u542F\u7528\uFF1A\u70B9\u51FB\u5DE6\u4FA7\u680F\u673A\u5668\u4EBA\u56FE\u6807\u6253\u5F00 DSH \u9762\u677F\uFF0C\u6216\u6267\u884C obsidian://dsh-dock?action=open");
  }
  // ------------------------------------------------------------------ 状态
  getStatus() {
    return this.status;
  }
  get childProc() {
    return this.proc;
  }
  get baseUrl() {
    if (this.webProxy) return this.webProxy.url + "?panel=" + this.webProxy.panelToken;
    const vaultRoot = this.vaultRoot();
    const port = computePort(this.settings, vaultRoot);
    return `http://${this.loopbackHost()}:${port}/`;
  }
  /** 官方 dsh web 的真实地址（顶层上下文用；不经过面板代理） */
  get webUrl() {
    const vaultRoot = this.vaultRoot();
    const port = computePort(this.settings, vaultRoot);
    return `http://${this.loopbackHost()}:${port}/`;
  }
  /**
   * H2：监听 host 一律收敛到回环地址。官方 dsh 拒绝 `--host 0.0.0.0`，
   * 桥也绝不绑定非回环地址 —— 历史 data.json 可能残留自定义 host
   * （loadSettings 已归一化，这里再兜底一次，防止 UI 之外的路径改动
   * settings.host 把 vault API 暴露到局域网）。
   */
  loopbackHost() {
    return this.settings.host === "localhost" ? "localhost" : "127.0.0.1";
  }
  /** 当前 vault 根目录（无则 undefined）。D1：instanceof 取代强转，类型安全 */
  vaultRoot() {
    const adapter = this.app.vault.adapter;
    return adapter instanceof import_obsidian5.FileSystemAdapter ? adapter.getBasePath() : void 0;
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
      if (info) {
        const bridge = this.bridgeUrl ? { url: this.bridgeUrl, token: this.bridgeToken } : void 0;
        writeCurrentVaultMarker(info.name, info.path, info.activeFile, bridge);
      }
    }, 300);
  }
  // ------------------------------------------------------------------ Obsidian API 桥
  /** 启动本窗口的 Obsidian API 桥（127.0.0.1，token 鉴权）；失败静默降级（工具回退文件模式） */
  async startBridge() {
    if (this.bridge) return;
    try {
      const vaultRoot = this.vaultRoot();
      const port = computeBridgePort(vaultRoot);
      const service = new ObsidianBridgeService(this.app, this.manifest.version);
      this.bridge = await createBridgeServer({
        host: this.loopbackHost(),
        port,
        token: this.bridgeToken,
        service
      });
      console.info(`[dsh-dock] Obsidian API \u6865\u5DF2\u542F\u52A8: http://${this.loopbackHost()}:${this.bridge.port}\uFF08vault: ${service.info.name}\uFF09`);
      this.refreshCurrentVaultMarker();
    } catch (err) {
      const msg = err instanceof BridgeError || err instanceof Error ? err.message : String(err);
      console.warn("[dsh-dock] Obsidian API \u6865\u542F\u52A8\u5931\u8D25\uFF08\u5DE5\u5177\u5C06\u56DE\u9000\u6587\u4EF6\u6A21\u5F0F\uFF09", err);
      new import_obsidian5.Notice(`DSH Dock: Obsidian API \u6865\u542F\u52A8\u5931\u8D25\uFF08${msg}\uFF09\u3002vault_* \u5DE5\u5177\u5C06\u56DE\u9000\u5230\u6587\u4EF6\u76F4\u8BFB\u6A21\u5F0F`);
    }
  }
  /** 停止本窗口的 Obsidian API 桥 */
  async stopBridge() {
    const bridge = this.bridge;
    this.bridge = null;
    if (bridge) {
      try {
        await bridge.close();
      } catch (err) {
        console.warn("[dsh-dock] \u5173\u95ED Obsidian API \u6865\u5931\u8D25", err);
      }
    }
  }
  // ------------------------------------------------------------------ 启动 / 停止
  /** 端口上已有服务 → 挂接；否则 spawn 官方 dsh web */
  async start() {
    if (this.starting) return this.status;
    if (this.status.kind === "running") return this.status;
    this.cancelStart = false;
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
        new import_obsidian5.Notice(`DSH: \u5DF2\u6E05\u7406\u4E0A\u6B21\u6B8B\u7559\u7684\u670D\u52A1 (\u7AEF\u53E3 ${port})`);
      }
      const result = await ensureDshRunning({
        dshBin: this.settings.dshBin,
        nodeBin: this.settings.nodeBin,
        port,
        host: this.loopbackHost(),
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
        // B1：桥地址/token 与 vault 注入同通道（shared/custom 模式也注入，
        // 供工具侧桥优先解析；无桥时不注入，工具回退文件模式）。
        env: {
          ...sharedConfigRoot && vaultInfo ? {
            DSH_OBSIDIAN_VAULT_NAME: vaultInfo.name,
            DSH_OBSIDIAN_VAULT_PATH: vaultInfo.path
          } : {},
          ...this.bridgeUrl ? {
            DSH_OBSIDIAN_BRIDGE_URL: this.bridgeUrl,
            DSH_OBSIDIAN_BRIDGE_TOKEN: this.bridgeToken
          } : {}
        }
      });
      if (this.cancelStart) {
        if (result.proc) {
          try {
            await stopProcess(result.proc);
          } catch {
          }
        }
        this.setStatus({ kind: "stopped" });
        return this.status;
      }
      this.proc = result.proc ?? null;
      if (result.status.kind === "running" && result.proc && !result.status.attached) {
        if (result.proc.pid != null) {
          writeDshPidFile(dshHome, port, result.proc.pid);
        }
        this.hookChildLogs(result.proc);
      }
      if (result.status.kind === "running") {
        try {
          this.webProxy = await this.createWebProxyFor(port, dshHome, sharedConfigRoot);
        } catch (proxyErr) {
          const msg = proxyErr instanceof Error ? proxyErr.message : String(proxyErr);
          if (result.proc) {
            try {
              await stopProcess(result.proc);
            } catch {
            }
          }
          this.webProxy = null;
          this.setStatus({ kind: "error", message: `\u9762\u677F\u9274\u6743\u4EE3\u7406\u542F\u52A8\u5931\u8D25: ${msg}` });
          return this.status;
        }
        if (this.cancelStart) {
          await this.stopWebProxy();
          if (result.proc) {
            try {
              await stopProcess(result.proc);
            } catch {
            }
          }
          this.setStatus({ kind: "stopped" });
          return this.status;
        }
      }
      this.setStatus(result.status);
      if (result.status.kind === "error") {
        new import_obsidian5.Notice(`DSH \u542F\u52A8\u5931\u8D25: ${result.status.message}`);
      } else if (result.status.kind === "running" && !result.status.attached) {
        new import_obsidian5.Notice(`DSH Web \u5DF2\u5C31\u7EEA: ${result.status.url}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus({ kind: "error", message: msg });
      new import_obsidian5.Notice(`DSH \u542F\u52A8\u5F02\u5E38: ${msg}`);
    } finally {
      this.starting = false;
    }
    return this.status;
  }
  async stop() {
    this.cancelStart = true;
    this.starting = false;
    await this.stopWebProxy();
    if (this.proc) {
      await stopProcess(this.proc);
      this.proc = null;
    }
    removeDshPidFile(computeDshHome(this.settings, this.vaultRoot()));
    this.setStatus({ kind: "stopped" });
  }
  /** 关闭面板鉴权代理（幂等） */
  async stopWebProxy() {
    const proxy = this.webProxy;
    this.webProxy = null;
    if (proxy) {
      try {
        await proxy.close();
      } catch {
      }
    }
  }
  /**
   * 围绕真实 dsh web 端口起面板鉴权代理，并读取其浏览器会话签名密钥。
   * 候选凭证库路径：先本 dshHome（per-vault 模式下即该实例真正使用的密钥），
   * 再共享根 / 常规 ~/.dsh，覆盖自建与挂接已有实例两种情形。
   * 注意：顺序只是「优先探测」的顺序，不是最终判据 —— 多套 DSH_HOME 并存时两边
   * 都存有各自的 `client-connection/browser-session` 密钥，取错的那把会被上游 401
   * 拒绝（症状：面板只剩 "dsh web authentication required"）。因此 webProxy
   * 会用每把候选密钥各签一张 cookie 回打上游，取真正被接受的那把（见
   * selectBrowserSecret）。
   */
  async createWebProxyFor(targetPort, dshHome, sharedConfigRoot) {
    const base = sharedConfigRoot ?? dshHome;
    const candidates = [
      path3.join(dshHome, ".credentials.yaml"),
      path3.join(base, ".credentials.yaml"),
      path3.join(os3.homedir(), ".dsh", ".credentials.yaml")
    ];
    return createWebProxy({
      host: this.loopbackHost(),
      port: 0,
      targetHost: this.loopbackHost(),
      targetPort,
      credentialPaths: [...new Set(candidates)]
    });
  }
  /**
   * D3：品牌特征校验 —— GET 服务根路径，响应体含 "DeepSeek Harness"
   * （官方 dsh web 前端 index.html 的 <title>）才认定是 dsh web。
   * requestUrl 是渲染进程里 CSP 豁免的官方 HTTP 助手（obsidian.d.ts:5442）；
   * throw: false 让 4xx/5xx 也走正常返回路径，统一按特征判断。
   * 鉴权后的官方 dsh web 对裸 `/` 返回 401（无 cookie 时），其 401 响应体
   * 即 "dsh web authentication required; reopen the URL printed by dsh web."，
   * 同样是无歧义的品牌特征 —— 一并认为是 dsh web，才能挂接已存在的鉴权实例。
   */
  async verifyDshBrand(url) {
    try {
      const resp = await (0, import_obsidian5.requestUrl)({ url, method: "GET", throw: false });
      if (resp.status === 200) return resp.text.includes("DeepSeek Harness");
      if (resp.status === 401) return resp.text.includes("dsh web authentication required");
      return false;
    } catch {
      return false;
    }
  }
  hookChildLogs(proc) {
    proc.stderr?.on("data", (d) => console.warn("[dsh]", d.toString().trimEnd()));
    proc.once("exit", (code, signal) => {
      if (this.proc === proc) {
        this.proc = null;
        void this.stopWebProxy();
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
    if (this.settings.host !== "127.0.0.1" && this.settings.host !== "localhost") {
      this.settings.host = "127.0.0.1";
    }
    if (!Number.isInteger(this.settings.port) || this.settings.port < 1 || this.settings.port > 65535) {
      this.settings.port = DEFAULT_SETTINGS.port;
    }
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
    await import_electron.shell.openExternal(this.webUrl);
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
      new import_obsidian5.Notice(`\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3\u5931\u8D25: ${msg}`);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BRIDGE_PORT_BASE,
  computeBridgePort,
  computeDshHome,
  computePort,
  computeSharedConfigRoot
});
