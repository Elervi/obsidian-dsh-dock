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
    fs2.mkdirSync(path2.dirname(file), { recursive: true });
    const payload = { name, path: vaultPath, updatedAt: Date.now() };
    if (activeFile) payload.activeFile = activeFile;
    if (bridge) {
      payload.bridgeUrl = bridge.url;
      payload.bridgeToken = bridge.token;
    }
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

// src/bridgeServer.ts
var import_node_http = require("node:http");
var import_node_crypto = require("node:crypto");

// src/bridgeTypes.ts
var BridgeErrorCode = {
  BAD_REQUEST: "BRIDGE_BAD_REQUEST",
  UNAUTHORIZED: "BRIDGE_UNAUTHORIZED",
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
  const msg = err instanceof Error ? err.message : String(err);
  sendJson(res, 500, { error: { code: BridgeErrorCode.INTERNAL, message: `\u6865\u5185\u90E8\u9519\u8BEF: ${msg}` } });
}
function readBody(req, maxBytes) {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new BridgeError(BridgeErrorCode.TOO_LARGE, `\u8BF7\u6C42\u4F53\u8D85\u8FC7 ${maxBytes} \u5B57\u8282\u4E0A\u9650`, 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve2(Buffer.concat(chunks).toString("utf8")));
    req.on("error", (err) => reject(err));
  });
}
function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new BridgeError(BridgeErrorCode.BAD_REQUEST, "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON", 400);
  }
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
  const server = (0, import_node_http.createServer)(async (req, res) => {
    try {
      const header = req.headers.authorization ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!tokenEquals(token, opts.token)) {
        sendJson(res, 401, { error: { code: BridgeErrorCode.UNAUTHORIZED, message: "\u65E0\u6548\u6216\u7F3A\u5931\u7684\u6865 token\uFF08DSH_OBSIDIAN_BRIDGE_TOKEN\uFF09" } });
        return;
      }
      const url = new URL(req.url ?? "/", `http://${opts.host}:${opts.port}`);
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
          sendJson(res, 200, service.listNotes({
            folder: q.get("folder") ?? void 0,
            all: queryBool(q.get("all")) ?? false,
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path4 === "/v1/folders") {
          sendJson(res, 200, service.listFolders({
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
          sendJson(res, 200, await service.writeNote(parseJson(raw)));
          return;
        }
        if (path4 === "/v1/edit") {
          sendJson(res, 200, await service.editNote(parseJson(raw)));
          return;
        }
        if (path4 === "/v1/frontmatter") {
          sendJson(res, 200, await service.updateFrontmatter(parseJson(raw)));
          return;
        }
        if (path4 === "/v1/rename") {
          sendJson(res, 200, await service.rename(parseJson(raw)));
          return;
        }
        if (path4 === "/v1/trash") {
          sendJson(res, 200, await service.trash(parseJson(raw)));
          return;
        }
        if (path4 === "/v1/open") {
          sendJson(res, 200, await service.openNote(parseJson(raw)));
          return;
        }
        if (path4 === "/v1/link") {
          sendJson(res, 200, await service.noteLink(parseJson(raw)));
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
          resolve2();
        });
      });
      return {
        port,
        close: () => new Promise((resolve2) => server.close(() => resolve2()))
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
  listNotes(opts) {
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
    const regex = req.regex ?? false;
    const caseSensitive = req.case_sensitive ?? false;
    const matchAll = req.match_all ?? false;
    let re;
    if (regex) {
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
        await this.app.vault.create(candidate, req.content);
        return { path: candidate, operation: "create", bytes: byteLen(req.content) };
      }
      if (!req.overwrite) {
        throw new BridgeError(BridgeErrorCode.EXISTS, `\u7B14\u8BB0\u5DF2\u5B58\u5728\uFF1A${rel}\uFF08\u5982\u9700\u8986\u76D6\u8BF7\u4F20 overwrite: true\uFF0C\u6216\u4F20 unique: true \u751F\u6210\u552F\u4E00\u540D\uFF09`, 409);
      }
      await this.app.vault.modify(existing, req.content);
      return { path: rel, operation: "update", bytes: byteLen(req.content) };
    }
    await this.app.vault.create(rel, req.content);
    return { path: rel, operation: "create", bytes: byteLen(req.content) };
  }
  async editNote(req) {
    const file = this.fileOf(req.path);
    if (req.old_string === "") throw new BridgeError(BridgeErrorCode.INVALID_ARGS, "old_string \u4E0D\u80FD\u4E3A\u7A7A", 400);
    const current = await this.app.vault.cachedRead(file);
    const oldS = req.old_string.replaceAll("\r\n", "\n");
    const norm = current.replaceAll("\r\n", "\n");
    const count = norm.split(oldS).length - 1;
    if (count === 0) {
      throw new BridgeError(BridgeErrorCode.EDIT_NOT_FOUND, `\u5728 ${file.path} \u4E2D\u672A\u627E\u5230\u4E0E old_string \u7CBE\u786E\u5339\u914D\u7684\u6587\u672C\uFF1B\u7F16\u8F91\u6309\u5B57\u9762\u5339\u914D\uFF0C\u8BF7\u5148 vault_read_note \u6838\u5BF9\u539F\u6587\uFF08\u6CE8\u610F\u6362\u884C\u4E0E\u9996\u5C3E\u7A7A\u767D\uFF09`, 404);
    }
    if (count > 1 && !req.replace_all) {
      throw new BridgeError(BridgeErrorCode.AMBIGUOUS_EDIT, `old_string \u5728 ${file.path} \u4E2D\u51FA\u73B0\u591A\u6B21\uFF08\u9ED8\u8BA4\u53EA\u5141\u8BB8\u4E00\u6B21\u7CBE\u786E\u66FF\u6362\uFF09\uFF1B\u8BF7\u63D0\u4F9B\u66F4\u957F\u4E0A\u4E0B\u6587\uFF0C\u6216\u8BBE replace_all: true`, 400);
    }
    const after = req.replace_all ? norm.split(oldS).join(req.new_string) : norm.replace(oldS, req.new_string);
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
  /**
   * Obsidian API 桥（B1）：本窗口的 Obsidian 渲染进程内 HTTP 服务，把
   * app.vault / metadataCache / fileManager 的官方解析结果暴露给 DSH 侧
   * 工具插件。token 每次插件加载重新生成，经 env + 标记文件两个通道注入。
   */
  bridge = null;
  bridgeToken = (0, import_crypto.randomBytes)(24).toString("base64url");
  /** 桥的访问地址（运行中才有值） */
  get bridgeUrl() {
    return this.bridge ? `http://${this.settings.host}:${this.bridge.port}` : null;
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
    const vaultRoot = this.vaultRoot();
    const port = computePort(this.settings, vaultRoot);
    return `http://${this.settings.host}:${port}/`;
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
        host: this.settings.host,
        port,
        token: this.bridgeToken,
        service
      });
      console.info(`[dsh-dock] Obsidian API \u6865\u5DF2\u542F\u52A8: http://${this.settings.host}:${this.bridge.port}\uFF08vault: ${service.info.name}\uFF09`);
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
      this.proc = result.proc ?? null;
      if (result.status.kind === "running" && result.proc && !result.status.attached) {
        if (result.proc.pid != null) {
          writeDshPidFile(dshHome, port, result.proc.pid);
        }
        this.hookChildLogs(result.proc);
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
      const resp = await (0, import_obsidian5.requestUrl)({ url, method: "GET", throw: false });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIiwgInNyYy9icmlkZ2VTZXJ2ZXIudHMiLCAic3JjL2JyaWRnZVR5cGVzLnRzIiwgInNyYy9vYnNpZGlhblNlcnZpY2UudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRHNoRG9ja1BsdWdpbiBcdTIwMTRcdTIwMTQgT2JzaWRpYW4gXHU0RkE3XHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXHU3QkExXHU3NDA2XHUzMDAyXG4gKlxuICogb25sb2FkOiBcdTUyQTBcdThGN0RcdThCQkVcdTdGNkUgXHUyMTkyIFx1NkNFOFx1NTE4Q1x1ODlDNlx1NTZGRS9cdTU0N0RcdTRFRTQvXHU3MkI2XHU2MDAxXHU2ODBGL1x1OEJCRVx1N0Y2RVx1OTg3NSBcdTIxOTIgXHVGRjA4YXV0b3N0YXJ0IFx1NjVGNlx1RkYwOVx1NTQyRlx1NTJBOCBEU0hcdTMwMDJcbiAqIFx1NTQyRlx1NTJBODogbGF1bmNoZXIuZW5zdXJlRHNoUnVubmluZygpXHVGRjA4XHU3QUVGXHU1M0UzXHU1MzYwXHU3NTI4XHU1MjE5XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjA5XHUzMDAyXG4gKiBcdTUzNzhcdThGN0Q6IFNJR1RFUk0gXHU1QjUwXHU4RkRCXHU3QTBCXHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgUGx1Z2luLCBOb3RpY2UsIFdvcmtzcGFjZUxlYWYsIHJlcXVlc3RVcmwsIEZpbGVTeXN0ZW1BZGFwdGVyIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgeyBzaGVsbCB9IGZyb20gJ2VsZWN0cm9uJ1xuaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdjcnlwdG8nXG5pbXBvcnQgdHlwZSB7IENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7XG4gIGVtYmVkZGVkTm9kZVZlcnNpb24sXG4gIGVuc3VyZURzaFJ1bm5pbmcsXG4gIHJlbW92ZURzaFBpZEZpbGUsXG4gIHJlc29sdmVEc2hCaW4sXG4gIHJlc29sdmVOb2RlQmluLFxuICBzYWZlVmF1bHROYW1lLFxuICBzdGFibGVIYXNoLFxuICBzdG9wUHJvY2VzcyxcbiAgc3dlZXBPcnBoYW5Ec2gsXG4gIHdyaXRlRHNoUGlkRmlsZSxcbiAgdHlwZSBTZXJ2ZXJTdGF0dXMsXG59IGZyb20gJy4vbGF1bmNoZXInXG5pbXBvcnQgeyBEc2hEb2NrU2V0dGluZ3NUYWIsIERFRkFVTFRfU0VUVElOR1MsIHR5cGUgRHNoRG9ja1NldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncydcbmltcG9ydCB7IERzaFdlYlZpZXcsIERTSF9XRUJfVklFV19UWVBFIH0gZnJvbSAnLi92aWV3J1xuaW1wb3J0IHsgY3VycmVudFZhdWx0SW5mbywgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIgfSBmcm9tICcuL2N1cnJlbnRWYXVsdCdcbmltcG9ydCB7IGNyZWF0ZUJyaWRnZVNlcnZlciwgQnJpZGdlRXJyb3IsIHR5cGUgQnJpZGdlU2VydmVySGFuZGxlIH0gZnJvbSAnLi9icmlkZ2VTZXJ2ZXInXG5pbXBvcnQgeyBPYnNpZGlhbkJyaWRnZVNlcnZpY2UgfSBmcm9tICcuL29ic2lkaWFuU2VydmljZSdcblxuLyoqXG4gKiBPYnNpZGlhbiBBUEkgXHU2ODY1XHU3QUVGXHU1M0UzXHU1N0ZBXHU1MUM2XHVGRjA4cGVyLXZhdWx0IFx1NkQzRVx1NzUxRlx1RkYwQ1x1NEUwRSBkc2ggd2ViIFx1N0FFRlx1NTNFM1x1NTdERlx1NEUwRFx1NzZGOFx1NEVBNFx1RkYwOVx1RkYxQVxuICogZHNoIHdlYiBcdTU3Mjggc2V0dGluZ3MucG9ydChcdTlFRDhcdThCQTQgMzA4MCkgKyBoYXNoJTQwOTYgXHUyMTkyIDMwODBcdTIwMTM3MTc1XHVGRjFCXG4gKiBcdTY4NjVcdTU3MjggMTgwODAgKyBoYXNoJTQwOTYgXHUyMTkyIDE4MDgwXHUyMDEzMjIxNzVcdUZGMENcdTdFRERcdTY1RTBcdTkxQ0RcdTUzRTBcdTMwMDJcbiAqL1xuZXhwb3J0IGNvbnN0IEJSSURHRV9QT1JUX0JBU0UgPSAxODA4MFxuXG4vKiogXHU4QkExXHU3Qjk3XHU2NzJDIHZhdWx0IFx1NzY4NFx1Njg2NVx1N0FFRlx1NTNFM1x1RkYwOHBlci12YXVsdCBcdTU0QzhcdTVFMENcdTZEM0VcdTc1MUZcdUZGMENcdTRFMEUgZHNoIHdlYiBcdTdBRUZcdTUzRTNcdTU0MDRcdTgxRUFcdTcyRUNcdTdBQ0JcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlQnJpZGdlUG9ydCh2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmICh2YXVsdFJvb3QpIHtcbiAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludChzdGFibGVIYXNoKGAke3ZhdWx0Um9vdH06YnJpZGdlYCksIDM2KSAlIDQwOTZcbiAgICByZXR1cm4gQlJJREdFX1BPUlRfQkFTRSArIG9mZnNldFxuICB9XG4gIHJldHVybiBCUklER0VfUE9SVF9CQVNFXG59XG5cbi8qKlxuICogXHU4QkExXHU3Qjk3IERTSF9IT01FXHVGRjFBXG4gKiAtIHBlci12YXVsdFx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQX4vLmRzaC92YXVsdHMvPFx1NTNFRlx1OEJGQlx1NTQwRD4tPGhhc2g2PiBcdTIwMTRcdTIwMTQgXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOGhhc2ggXHU2RDg4XHU2QjY3XHVGRjBDXHU0RTJEXHU2NTg3XHU1NDBEXHU0RTBEXHU3OEIwXHU2NDlFXHVGRjA5XHVGRjFCXG4gKiAtIHNoYXJlZFx1RkYxQX4vLmRzaCBcdTIwMTRcdTIwMTQgXHU0RTBFXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHU1QjhDXHU1MTY4XHU0RTAwXHU4MUY0XHVGRjBDXHU1OTBEXHU3NTI4XHU1REYyXHU2NzA5XHU5MTREXHU3RjZFL1x1NEYxQVx1OEJERFx1RkYxQlxuICogLSBjdXN0b21cdUZGMUFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEc2hIb21lKHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnIHwgJ2RzaEhvbWUnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpXG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAnY3VzdG9tJykge1xuICAgIHJldHVybiBzLmRzaEhvbWUudHJpbSgpIHx8IHBhdGguam9pbihob21lLCAnLmRzaCcpXG4gIH1cbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnKSB7XG4gICAgY29uc3QgbmFtZSA9IHZhdWx0Um9vdCA/IGAke3NhZmVWYXVsdE5hbWUodmF1bHRSb290KX0tJHtzdGFibGVIYXNoKHZhdWx0Um9vdCl9YCA6ICd2YXVsdCdcbiAgICByZXR1cm4gcGF0aC5qb2luKGhvbWUsICcuZHNoJywgJ3ZhdWx0cycsIG5hbWUpXG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbihob21lLCAnLmRzaCcpXG59XG5cbi8qKlxuICogXHU4QkExXHU3Qjk3XHU2NzJDIHZhdWx0IFx1NzY4NFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1MzAwMlxuICogLSBzaGFyZWQgLyBjdXN0b21cdUZGMUFzZXR0aW5ncy5wb3J0XHVGRjA4XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDlcdTIwMTRcdTIwMTQgXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NTQwQ1x1NEUwMFx1NjcwRFx1NTJBMVx1NEUwRVx1NEYxQVx1OEJERFx1RkYxQlxuICogLSBwZXItdmF1bHRcdUZGMUFzZXR0aW5ncy5wb3J0ICsgKHN0YWJsZUhhc2ggJSA0MDk2KSBcdTIwMTRcdTIwMTQgXHU2QkNGXHU0RTJBIHZhdWx0IFx1NzJFQ1x1NTM2MFx1N0FFRlx1NTNFM1x1RkYwQ1x1NTQwNFx1ODFFQVxuICogICBzcGF3biBcdTcyRUNcdTdBQ0JcdTc2ODQgZHNoIFx1OEZEQlx1N0EwQlx1RkYxQlx1OTE0RFx1NTQwOFx1NzJFQ1x1N0FDQlx1NzY4NCBEU0hfSE9NRVx1RkYwOFx1NEYxQVx1OEJERFx1NUI1OFx1NTBBOFx1NjgzOVx1RkYwOVx1RkYwQ1x1NEUwRFx1NTQwQyB2YXVsdCBcdTc2ODRcbiAqICAgXHU0RjFBXHU4QkREXHU1QjhDXHU1MTY4XHU5Njk0XHU3OUJCXHVGRjBDXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHUzMDAyXHU3QUVGXHU1M0UzXHU1MUIyXHU3QTgxXHU2OTgyXHU3Mzg3IH4xLzQwOTZcdUZGMENcdTUzRUZcdTYzQTVcdTUzRDdcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVQb3J0KHM6IFBpY2s8RHNoRG9ja1NldHRpbmdzLCAnZHNoSG9tZU1vZGUnIHwgJ3BvcnQnPiwgdmF1bHRSb290OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBudW1iZXIge1xuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ3Blci12YXVsdCcgJiYgdmF1bHRSb290KSB7XG4gICAgY29uc3Qgb2Zmc2V0ID0gcGFyc2VJbnQoc3RhYmxlSGFzaCh2YXVsdFJvb3QpLCAzNikgJSA0MDk2XG4gICAgcmV0dXJuIHMucG9ydCArIG9mZnNldFxuICB9XG4gIHJldHVybiBzLnBvcnRcbn1cblxuLyoqXG4gKiBwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTUxNzFcdTc1MjhcdTRFMDBcdTRFRkRcdUZGMENcdTUzRUFcdTk2OTRcdTc5QkJcdTRGMUFcdThCRERcdUZGMDlcdTMwMDJcbiAqIC0gc2hhcmVkXHVGRjFBZHNoSG9tZSBcdTgxRUFcdThFQUJcdTUzNzNcdTkxNERcdTdGNkVcdTY4MzlcdUZGMENcdTY1RTBcdTk3MDBcdTUxNzFcdTRFQUJcdTVDNDJcdUZGMUJcbiAqIC0gY3VzdG9tXHVGRjFBXHU3NTI4XHU2MjM3XHU2MzA3XHU1QjlBXHU4REVGXHU1Rjg0XHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjBDXHU2NUUwXHU5NzAwXHU1MTcxXHU0RUFCXHU1QzQyXHVGRjFCXG4gKiAtIHBlci12YXVsdFx1RkYxQVx1OEZENFx1NTZERVx1NTE3MVx1NEVBQiBgfi8uZHNoYFx1RkYwQ1x1OEJBOVx1NkJDRlx1NEUyQSB2YXVsdCBcdTc2ODQgc2V0dGluZ3MvY3JlZGVudGlhbHNcbiAqICAgXHU2MzA3XHU1NkRFXHU1QjgzIFx1MjAxNFx1MjAxNCBcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjggdmF1bHQgXHU3NTFGXHU2NTQ4XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdChzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnICYmIHZhdWx0Um9vdCkge1xuICAgIHJldHVybiBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmRzaCcpXG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZFxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEc2hEb2NrUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IERzaERvY2tTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1NcbiAgcHJpdmF0ZSBwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1czogU2VydmVyU3RhdHVzID0geyBraW5kOiAnc3RvcHBlZCcgfVxuICBwcml2YXRlIHN0YXJ0aW5nID0gZmFsc2VcbiAgcHJpdmF0ZSBzdGF0dXNCYXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHN0YXR1c0xpc3RlbmVycyA9IG5ldyBTZXQ8KCkgPT4gdm9pZD4oKVxuICAvKiogXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1MTk5XHU1MTY1XHU5NjMyXHU2Mjk2IHRpbWVyXHVGRjA4XHU3QTk3XHU1M0UzIGZvY3VzIFx1NTNFRlx1ODBGRFx1OUFEOFx1OTg5MVx1ODlFNlx1NTNEMVx1RkYwOSAqL1xuICBwcml2YXRlIG1hcmtlclRpbWVyOiBudW1iZXIgfCBudWxsID0gbnVsbFxuICAvKipcbiAgICogT2JzaWRpYW4gQVBJIFx1Njg2NVx1RkYwOEIxXHVGRjA5XHVGRjFBXHU2NzJDXHU3QTk3XHU1M0UzXHU3Njg0IE9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1NTE4NSBIVFRQIFx1NjcwRFx1NTJBMVx1RkYwQ1x1NjI4QVxuICAgKiBhcHAudmF1bHQgLyBtZXRhZGF0YUNhY2hlIC8gZmlsZU1hbmFnZXIgXHU3Njg0XHU1Qjk4XHU2NUI5XHU4OUUzXHU2NzkwXHU3RUQzXHU2NzlDXHU2NkI0XHU5NzMyXHU3RUQ5IERTSCBcdTRGQTdcbiAgICogXHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XHUzMDAydG9rZW4gXHU2QkNGXHU2QjIxXHU2M0QyXHU0RUY2XHU1MkEwXHU4RjdEXHU5MUNEXHU2NUIwXHU3NTFGXHU2MjEwXHVGRjBDXHU3RUNGIGVudiArIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NEUyNFx1NEUyQVx1OTAxQVx1OTA1M1x1NkNFOFx1NTE2NVx1MzAwMlxuICAgKi9cbiAgcHJpdmF0ZSBicmlkZ2U6IEJyaWRnZVNlcnZlckhhbmRsZSB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgcmVhZG9ubHkgYnJpZGdlVG9rZW4gPSByYW5kb21CeXRlcygyNCkudG9TdHJpbmcoJ2Jhc2U2NHVybCcpXG5cbiAgLyoqIFx1Njg2NVx1NzY4NFx1OEJCRlx1OTVFRVx1NTczMFx1NTc0MFx1RkYwOFx1OEZEMFx1ODg0Q1x1NEUyRFx1NjI0RFx1NjcwOVx1NTAzQ1x1RkYwOSAqL1xuICBnZXQgYnJpZGdlVXJsKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmJyaWRnZSA/IGBodHRwOi8vJHt0aGlzLnNldHRpbmdzLmhvc3R9OiR7dGhpcy5icmlkZ2UucG9ydH1gIDogbnVsbFxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlxuXG4gIG92ZXJyaWRlIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpXG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhEU0hfV0VCX1ZJRVdfVFlQRSwgKGxlYWYpID0+IG5ldyBEc2hXZWJWaWV3KGxlYWYsIHRoaXMpKVxuXG4gICAgLy8gXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHQgKyBcdTVGNTNcdTUyNERcdTdCMTRcdThCQjBcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHVGRjFBXHU2NzJDXHU3QTk3XHU1M0UzXHU2MjUzXHU1RjAwXHVGRjA4b25sb2FkXHVGRjA5XHU0RTBFXG4gICAgLy8gXHU2QkNGXHU2QjIxXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU2NUY2XHU1MjM3XHU2NUIwXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHUzMDAyXHU1OTFBXHU3QTk3XHU1M0UzXHU1NzNBXHU2NjZGXHU0RTBCXHU2QkNGXHU0RTJBXHU3QTk3XHU1M0UzXHU5MEZEXHU3MkVDXHU3QUNCXHU1MkEwXHU4RjdEXHU2NzJDXHU2M0QyXHU0RUY2XHVGRjBDXG4gICAgLy8gXHU2NzAwXHU1NDBFXHU4M0I3XHU1Rjk3XHU3MTI2XHU3MEI5XHU3Njg0XHU3QTk3XHU1M0UzXHU1MTk5XHU1MTY1XHVGRjBDXHU1MzczXCJcdTc1MjhcdTYyMzdcdTVGNTNcdTUyNERcdTZCNjNcdTU3MjhcdTc3MEJcdTc2ODQgdmF1bHRcIlx1MzAwMlxuICAgIHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gICAgLy8gRDJcdUZGMUFyZWdpc3RlckRvbUV2ZW50IFx1NTNENlx1NEVFM1x1NjI0Qlx1NURFNSBhZGRFdmVudExpc3RlbmVyICsgcmVnaXN0ZXIoKVx1RkYwQ1xuICAgIC8vIFx1N0M3Qlx1NTc4Qlx1NUI4OVx1NTE2OFx1MzAwMVx1NTM3OFx1OEY3RFx1ODFFQVx1NTJBOFx1NkUwNVx1NzQwNlx1RkYwOENvbXBvbmVudC5yZWdpc3RlckRvbUV2ZW50LCBvYnNpZGlhbi5kLnRzOjE4OTJcdUZGMDlcdTMwMDJcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQod2luZG93LCAnZm9jdXMnLCAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKSlcbiAgICAvLyBcdTg4NjVcdTUxNDVcdTRGRTFcdTUzRjdcdUZGMUFcdTUxNDlcdTY4MDdcdTUyMDdcdTYzNjJcdTY1ODdcdTRFRjZcdUZGMDhmaWxlLW9wZW5cdUZGMDlcdTMwMDFcdTY1QjBcdTdBOTdcdTUzRTMvXHU1RjM5XHU3QTk3XHU2MjUzXHU1RjAwXHVGRjA4d2luZG93LW9wZW5cdUZGMDlcdTMwMDFcbiAgICAvLyBcdTVFMDNcdTVDNDAvXHU2RDNCXHU1MkE4XHU1M0Y2XHU1QjUwXHU1M0Q4XHU1MzE2XHVGRjA4YWN0aXZlLWxlYWYtY2hhbmdlXHVGRjA5XHU5MEZEXHU1MjM3XHU0RTAwXHU2QjIxIFx1MjAxNFx1MjAxNCBcdTg5ODZcdTc2RDYgd2luZG93IGZvY3VzXG4gICAgLy8gXHU0RTBEXHU2RDNFXHU1M0QxXHU3Njg0XHU1NzNBXHU2NjZGXHVGRjFCXHU5NjMyXHU2Mjk2XHU1MTcxXHU3NTI4XHU0RTAwXHU0RTJBIHRpbWVyXHVGRjBDXHU0RTkyXHU0RTBEXHU1RTcyXHU2MjcwXHUzMDAyXHU0RThCXHU0RUY2XHU3MjQ4XHU2NzJDXHU5NUU4XHU2OURCXHVGRjFBXG4gICAgLy8gYWN0aXZlLWxlYWYtY2hhbmdlL2ZpbGUtb3BlbiAwLjEwLjkrXHVGRjBDd2luZG93LW9wZW4gMC4xNS4zK1x1RkYwQ1x1NTc0NyBcdTIyNjQgbWluQXBwVmVyc2lvblx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2FjdGl2ZS1sZWFmLWNoYW5nZScsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKSkpXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignd2luZG93LW9wZW4nLCAoKSA9PiB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKSkpXG5cbiAgICAvLyBCMVx1RkYxQU9ic2lkaWFuIEFQSSBcdTY4NjUgXHUyMDE0XHUyMDE0IFx1NEUwRSBkc2ggd2ViIFx1NjcwRFx1NTJBMVx1NzJFQ1x1N0FDQlx1RkYwQ1x1NjNEMlx1NEVGNlx1NTJBMFx1OEY3RFx1NTM3M1x1OEQ3N1x1RkYwOFx1NEUwRFx1NEY5RFx1OEQ1NiBEU0ggXHU1NDJGXHU1MkE4XHVGRjA5XHUzMDAyXG4gICAgLy8gXHU2ODY1XHU2NTQ1XHU5NjlDXHU0RTBEXHU5NjNCXHU1ODVFXHU2M0QyXHU0RUY2XHU0RTNCXHU2RDQxXHU3QTBCXHVGRjA4XHU1REU1XHU1MTc3XHU0RkE3XHU4MUVBXHU1MkE4XHU1NkRFXHU5MDAwXHU2NTg3XHU0RUY2XHU2QTIxXHU1RjBGXHVGRjA5XHVGRjBDXHU1M0VBXHU4QkIwXHU2NUU1XHU1RkQ3L1x1NjNEMFx1NzkzQVx1MzAwMlxuICAgIGlmICh0aGlzLnNldHRpbmdzLmJyaWRnZUVuYWJsZWQpIHtcbiAgICAgIHZvaWQgdGhpcy5zdGFydEJyaWRnZSgpXG4gICAgfVxuXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCdib3QnLCAnRFNIIERvY2tcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0YnLCAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCkpXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1kc2gtcGFuZWwnLFxuICAgICAgbmFtZTogJ1x1NjI1M1x1NUYwMCBEU0ggXHU5NzYyXHU2NzdGJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlblBhbmVsKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdGFydC1kc2gnLFxuICAgICAgbmFtZTogJ1x1NTQyRlx1NTJBOCBEU0ggXHU2NzBEXHU1MkExJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc3RhcnQoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3N0b3AtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTUwNUNcdTZCNjIgRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0b3AoKSxcbiAgICB9KVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLWJyb3dzZXInLFxuICAgICAgbmFtZTogJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCBEU0gnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuSW5Ccm93c2VyKCksXG4gICAgfSlcblxuICAgIC8vIEQ2XHVGRjFBXHU2Q0U4XHU1MThDIG9ic2lkaWFuOi8vZHNoLWRvY2sgXHU1MzRGXHU4QkFFXHU1MTY1XHU1M0UzXHVGRjA4UGx1Z2luLnJlZ2lzdGVyT2JzaWRpYW5Qcm90b2NvbEhhbmRsZXIsXG4gICAgLy8gb2JzaWRpYW4uZC50czo1MDI4XHVGRjA5XHUzMDAyRFNIIFdlYiBcdTRGQTcvXHU1OTE2XHU5MEU4XHU4MUVBXHU1MkE4XHU1MzE2XHU1M0VGXHU3NTI4XG4gICAgLy8gYG9ic2lkaWFuOi8vZHNoLWRvY2s/YWN0aW9uPW9wZW5gIFx1NEUwMFx1OTUyRVx1NTUyNFx1OEQ3N1x1OTc2Mlx1Njc3RiBcdTIwMTRcdTIwMTQgXHU5MTREXHU1NDA4XHU1NEMxXHU3MjRDXHU2ODIxXHU5QThDXHVGRjBDXG4gICAgLy8gXHUzMDBDXHU0RUNFXHU2RDRGXHU4OUM4XHU1NjY4XHU1NkRFXHU1MjMwIE9ic2lkaWFuXHUzMDBEXHU5NUVEXHU3M0FGXHUzMDAyXG4gICAgdGhpcy5yZWdpc3Rlck9ic2lkaWFuUHJvdG9jb2xIYW5kbGVyKCdkc2gtZG9jaycsIChkYXRhKSA9PiB7XG4gICAgICBpZiAoZGF0YS5hY3Rpb24gPT09ICdvcGVuJykgdm9pZCB0aGlzLm9wZW5QYW5lbCgpXG4gICAgfSlcblxuICAgIC8vIEQ3XHVGRjFBXHU5MDAwXHU1MUZBXHU1MjREIGZsdXNoXHUzMDAyYHdvcmtzcGFjZS5vbigncXVpdCcpYFx1RkYwODAuMTAuMitcdUZGMENPYnNpZGlhbiBcdTVDM0RcdTUyOUJcdThDMDNcdTc1MjhcdUZGMENcbiAgICAvLyBcdTRFMERcdTRGRERcdThCQzFcdTYyNjdcdTg4NENcdUZGMDlcdTkxQ0MgYXdhaXQgXHU1MDVDXHU2NzBEXHU1MkExICsgXHU4NDNEXHU3NkQ4XHU2ODA3XHU4QkIwXHVGRjBDXHU4ODY1XHU0RTBBIG9udW5sb2FkIFx1OTFDQ1xuICAgIC8vIGB2b2lkIHRoaXMuc3RvcCgpYCBcdTRFMERcdTdCNDlcdTdFRDNcdTY3OUNcdTc2ODRcdTdGM0FcdTUzRTNcdUZGMDhcdTVGM0FcdTkwMDBcdTY1RjYgUElEIFx1NjU4N1x1NEVGNi9cdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTUzRUZcdTgwRkRcdTZDQTFcdTg0M0RcdTc2RDhcdUZGMDlcdTMwMDJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ3F1aXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3RvcCgpXG4gICAgICAgIHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpXG4gICAgICB9KSxcbiAgICApXG5cbiAgICB0aGlzLnN0YXR1c0JhckVsID0gdGhpcy5hZGRTdGF0dXNCYXJJdGVtKClcbiAgICB0aGlzLnJlbmRlclN0YXR1c0JhcigpXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEc2hEb2NrU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKVxuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b3N0YXJ0KSB7XG4gICAgICB2b2lkIHRoaXMuc3RhcnQoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIG9udW5sb2FkKCk6IHZvaWQge1xuICAgIHZvaWQgdGhpcy5zdG9wKClcbiAgICB2b2lkIHRoaXMuc3RvcEJyaWRnZSgpXG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2xlYXIoKVxuICB9XG5cbiAgLyoqXG4gICAqIEQ3XHVGRjFBXHU5OTk2XHU2QjIxXCJcdTc1MjhcdTYyMzdcdTYyNEJcdTUyQThcdTU0MkZcdTc1MjhcIlx1NjVGNlx1NTNFQVx1OEREMVx1NEUwMFx1NkIyMVx1NzY4NFx1OTRBOVx1NUI1MFx1RkYwOFBsdWdpbi5vblVzZXJFbmFibGUsXG4gICAqIG9ic2lkaWFuLmQudHM6NTA3M1x1RkYwQ09ic2lkaWFuIDEuNy4yKyBcdThDMDNcdTc1MjhcdUZGMUJcdTY1RTdcdTcyNDhcdTY3MkNcdTVGRkRcdTc1NjVcdThCRTVcdTk0QTlcdTVCNTBcdUZGMENcdTYzRDJcdTRFRjZcdTcxNjdcdTVFMzhcdTVERTVcdTRGNUNcdUZGMENcbiAgICogXHU1NkUwXHU2QjY0XHU2NUUwXHU5NzAwXHU2MkFDIG1pbkFwcFZlcnNpb25cdUZGMDlcdTMwMDJcdTUzRUFcdTUwNUFcdTVGMTVcdTVCRkNcdTYzRDBcdTc5M0FcdUZGMENcdTRFMERcdTUwNUFcdTRFRkJcdTRGNTVcdTUyMURcdTU5Q0JcdTUzMTZcdTMwMDJcbiAgICovXG4gIG92ZXJyaWRlIG9uVXNlckVuYWJsZSgpOiB2b2lkIHtcbiAgICBuZXcgTm90aWNlKCdEU0ggRG9jayBcdTVERjJcdTU0MkZcdTc1MjhcdUZGMUFcdTcwQjlcdTUxRkJcdTVERTZcdTRGQTdcdTY4MEZcdTY3M0FcdTU2NjhcdTRFQkFcdTU2RkVcdTY4MDdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1RkYwQ1x1NjIxNlx1NjI2N1x1ODg0QyBvYnNpZGlhbjovL2RzaC1kb2NrP2FjdGlvbj1vcGVuJylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDlcdTMwMDJEMVx1RkYxQWluc3RhbmNlb2YgXHU1M0Q2XHU0RUUzXHU1RjNBXHU4RjZDXHVGRjBDXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4ICovXG4gIHByaXZhdGUgdmF1bHRSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXJcbiAgICByZXR1cm4gYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyID8gYWRhcHRlci5nZXRCYXNlUGF0aCgpIDogdW5kZWZpbmVkXG4gIH1cblxuICBvblN0YXR1c0NoYW5nZShmbjogKCkgPT4gdm9pZCk6ICgpID0+IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmFkZChmbilcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zdGF0dXNMaXN0ZW5lcnMuZGVsZXRlKGZuKVxuICB9XG5cbiAgcHJpdmF0ZSBzZXRTdGF0dXMoc3RhdHVzOiBTZXJ2ZXJTdGF0dXMpOiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1cyA9IHN0YXR1c1xuICAgIHRoaXMucmVuZGVyU3RhdHVzQmFyKClcbiAgICBmb3IgKGNvbnN0IGZuIG9mIHRoaXMuc3RhdHVzTGlzdGVuZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmbigpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGF0dXNCYXIoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnN0YXR1c0JhckVsKSByZXR1cm5cbiAgICBjb25zdCBzID0gdGhpcy5zdGF0dXNcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dChgRFNIOiAke3MucG9ydH0ke3MuYXR0YWNoZWQgPyAnXHVGRjA4XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjA5JyA6ICcnfWApXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjYnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NjcyQVx1OEZEMFx1ODg0QycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXG5cbiAgLyoqIFx1OEJGQlx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1NTQyQlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYwOVx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLm1hcmtlclRpbWVyKVxuICAgIHRoaXMubWFya2VyVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykge1xuICAgICAgICBjb25zdCBicmlkZ2UgPSB0aGlzLmJyaWRnZVVybCA/IHsgdXJsOiB0aGlzLmJyaWRnZVVybCwgdG9rZW46IHRoaXMuYnJpZGdlVG9rZW4gfSA6IHVuZGVmaW5lZFxuICAgICAgICB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlcihpbmZvLm5hbWUsIGluZm8ucGF0aCwgaW5mby5hY3RpdmVGaWxlLCBicmlkZ2UpXG4gICAgICB9XG4gICAgfSwgMzAwKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIE9ic2lkaWFuIEFQSSBcdTY4NjVcblxuICAvKiogXHU1NDJGXHU1MkE4XHU2NzJDXHU3QTk3XHU1M0UzXHU3Njg0IE9ic2lkaWFuIEFQSSBcdTY4NjVcdUZGMDgxMjcuMC4wLjFcdUZGMEN0b2tlbiBcdTkyNzRcdTY3NDNcdUZGMDlcdUZGMUJcdTU5MzFcdThEMjVcdTk3NTlcdTlFRDhcdTk2NERcdTdFQTdcdUZGMDhcdTVERTVcdTUxNzdcdTU2REVcdTkwMDBcdTY1ODdcdTRFRjZcdTZBMjFcdTVGMEZcdUZGMDkgKi9cbiAgYXN5bmMgc3RhcnRCcmlkZ2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuYnJpZGdlKSByZXR1cm5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdmF1bHRSb290ID0gdGhpcy52YXVsdFJvb3QoKVxuICAgICAgY29uc3QgcG9ydCA9IGNvbXB1dGVCcmlkZ2VQb3J0KHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHNlcnZpY2UgPSBuZXcgT2JzaWRpYW5CcmlkZ2VTZXJ2aWNlKHRoaXMuYXBwLCB0aGlzLm1hbmlmZXN0LnZlcnNpb24pXG4gICAgICB0aGlzLmJyaWRnZSA9IGF3YWl0IGNyZWF0ZUJyaWRnZVNlcnZlcih7XG4gICAgICAgIGhvc3Q6IHRoaXMuc2V0dGluZ3MuaG9zdCxcbiAgICAgICAgcG9ydCxcbiAgICAgICAgdG9rZW46IHRoaXMuYnJpZGdlVG9rZW4sXG4gICAgICAgIHNlcnZpY2UsXG4gICAgICB9KVxuICAgICAgY29uc29sZS5pbmZvKGBbZHNoLWRvY2tdIE9ic2lkaWFuIEFQSSBcdTY4NjVcdTVERjJcdTU0MkZcdTUyQTg6IGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHt0aGlzLmJyaWRnZS5wb3J0fVx1RkYwOHZhdWx0OiAke3NlcnZpY2UuaW5mby5uYW1lfVx1RkYwOWApXG4gICAgICB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgQnJpZGdlRXJyb3IgfHwgZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gT2JzaWRpYW4gQVBJIFx1Njg2NVx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNVx1RkYwOFx1NURFNVx1NTE3N1x1NUMwNlx1NTZERVx1OTAwMFx1NjU4N1x1NEVGNlx1NkEyMVx1NUYwRlx1RkYwOScsIGVycilcbiAgICAgIG5ldyBOb3RpY2UoYERTSCBEb2NrOiBPYnNpZGlhbiBBUEkgXHU2ODY1XHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1XHVGRjA4JHttc2d9XHVGRjA5XHUzMDAydmF1bHRfKiBcdTVERTVcdTUxNzdcdTVDMDZcdTU2REVcdTkwMDBcdTUyMzBcdTY1ODdcdTRFRjZcdTc2RjRcdThCRkJcdTZBMjFcdTVGMEZgKVxuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTUwNUNcdTZCNjJcdTY3MkNcdTdBOTdcdTUzRTNcdTc2ODQgT2JzaWRpYW4gQVBJIFx1Njg2NSAqL1xuICBhc3luYyBzdG9wQnJpZGdlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGJyaWRnZSA9IHRoaXMuYnJpZGdlXG4gICAgdGhpcy5icmlkZ2UgPSBudWxsXG4gICAgaWYgKGJyaWRnZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgYnJpZGdlLmNsb3NlKClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gXHU1MTczXHU5NUVEIE9ic2lkaWFuIEFQSSBcdTY4NjVcdTU5MzFcdThEMjUnLCBlcnIpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuXG4gIC8qKiBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEgXHUyMTkyIFx1NjMwMlx1NjNBNVx1RkYxQlx1NTQyNlx1NTIxOSBzcGF3biBcdTVCOThcdTY1QjkgZHNoIHdlYiAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xuICAgIGlmICh0aGlzLnN0YXJ0aW5nKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnKSByZXR1cm4gdGhpcy5zdGF0dXNcbiAgICB0aGlzLnN0YXJ0aW5nID0gdHJ1ZVxuICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ3N0YXJ0aW5nJyB9KVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgICBjb25zdCBkc2hIb21lID0gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHNoYXJlZENvbmZpZ1Jvb3QgPSBjb21wdXRlU2hhcmVkQ29uZmlnUm9vdCh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCB2YXVsdEluZm8gPSBjdXJyZW50VmF1bHRJbmZvKHRoaXMuYXBwKVxuICAgICAgLy8gXHU1QjY0XHU1MTNGXHU2RTA1XHU2MjZCXHVGRjFBXHU0RTBBXHU2QjIxIE9ic2lkaWFuIFx1NUQyOVx1NkU4My9cdTVGM0FcdTkwMDBcdTZCOEJcdTc1NTlcdTc2ODRcdTY3MkNcdTdBRUZcdTUzRTMgZHNoIHdlYiBcdTUxNDhcdTZFMDVcdTYzODlcdTUxOERcdTYyQzlcdThENzdcdUZGMENcbiAgICAgIC8vIFx1OTA3Rlx1NTE0RFwiXHU2MzAyXHU2M0E1XHU1QjY0XHU1MTNGXCJcdThCQTlcdTZCOEJcdTc1NTlcdTZDMzhcdTRFNDVcdTdEMkZcdTc5RUZcdUZGMDhcdTU5MUFcdTVFOTMvXHU1OTFBXHU3QTk3XHU1M0UzXHU1RTc2XHU1M0QxXHU1Qjg5XHU1MTY4XHVGRjBDXHU4OUMxIGxhdW5jaGVyLnRzXHVGRjA5XHUzMDAyXG4gICAgICBjb25zdCBzd2VwdCA9IGF3YWl0IHN3ZWVwT3JwaGFuRHNoKGRzaEhvbWUsIHBvcnQpXG4gICAgICBpZiAoc3dlcHQpIHtcbiAgICAgICAgbmV3IE5vdGljZShgRFNIOiBcdTVERjJcdTZFMDVcdTc0MDZcdTRFMEFcdTZCMjFcdTZCOEJcdTc1NTlcdTc2ODRcdTY3MERcdTUyQTEgKFx1N0FFRlx1NTNFMyAke3BvcnR9KWApXG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBlbnN1cmVEc2hSdW5uaW5nKHtcbiAgICAgICAgZHNoQmluOiB0aGlzLnNldHRpbmdzLmRzaEJpbixcbiAgICAgICAgbm9kZUJpbjogdGhpcy5zZXR0aW5ncy5ub2RlQmluLFxuICAgICAgICBwb3J0LFxuICAgICAgICBob3N0OiB0aGlzLnNldHRpbmdzLmhvc3QsXG4gICAgICAgIGRzaEhvbWUsXG4gICAgICAgIC8vIHBlci12YXVsdCBcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcdUZGMUFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMENcdTUzRUFcdTk2OTRcdTc5QkJcdTRGMUFcdThCRERcdTMwMDJcbiAgICAgICAgLi4uKHNoYXJlZENvbmZpZ1Jvb3QgPyB7IHNoYXJlZENvbmZpZ1Jvb3QgfSA6IHt9KSxcbiAgICAgICAgdXNlRW1iZWRkZWROb2RlOiB0aGlzLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSxcbiAgICAgICAgLy8gRDNcdUZGMUFcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdTY1RjZcdTUwNUFcdTU0QzFcdTcyNENcdTcyNzlcdTVGODFcdTY4MjFcdTlBOEMgXHUyMDE0XHUyMDE0IFx1NjYyRiBkc2ggd2ViIFx1NjI0RFx1NjMwMlx1NjNBNVx1RkYwQ1x1NTQyNlx1NTIxOVx1NjMwOVxuICAgICAgICAvLyBcdTMwMENcdTdBRUZcdTUzRTNcdTg4QUJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVx1NTM2MFx1NzUyOFx1MzAwRFx1NjJBNVx1OTUxOVx1RkYwQ1x1NjI4QVwiXHU4QkVGXHU2MzAyXHU5NzVFIERTSCBcdTY3MERcdTUyQTFcIlx1NEVDRVx1NTA3Nlx1NTNEMVx1NTNEOFx1NjIxMFx1NEUwRFx1NTNFRlx1ODBGRFx1MzAwMlxuICAgICAgICAvLyByZXF1ZXN0VXJsIFx1NjYyRiBPYnNpZGlhbiBcdTVCOThcdTY1QjkgQ1NQIFx1OEM0MVx1NTE0RFx1NzY4NCBIVFRQIFx1NTJBOVx1NjI0Qlx1RkYwOG9ic2lkaWFuLmQudHM6NTQ0Mlx1RkYwOVx1RkYwQ1xuICAgICAgICAvLyBSZXF1ZXN0VXJsUGFyYW0gXHU2Q0ExXHU2NzA5IHRpbWVvdXQgXHU1QjU3XHU2QkI1XHVGRjBDXHU2MjQwXHU0RUU1IDEuNXMgXHU1RkVCXHU5MDFGXHU1QjU4XHU2RDNCXHU2M0EyXHU2RDRCXHU0RUNEXHU4RDcwXG4gICAgICAgIC8vIG5vZGU6aHR0cFx1RkYwOGxhdW5jaGVyLnRzIGlzUG9ydFVwXHVGRjA5XHVGRjBDXHU4RkQ5XHU5MUNDXHU1M0VBXHU1MDVBXHU2MTYyXHU5MDFGXHU1NENEXHU1RTk0XHU0RjUzXHU3Mjc5XHU1RjgxXHU2ODIxXHU5QThDXHUzMDAyXG4gICAgICAgIHZlcmlmeUJyYW5kOiAodXJsKSA9PiB0aGlzLnZlcmlmeURzaEJyYW5kKHVybCksXG4gICAgICAgIC8vIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFcdTZDRThcdTUxNjVcdTY3MkNcdTY3MERcdTUyQTFcdTYyNDBcdTVDNUVcdTVFOTMgZW52XHVGRjA4XHU3QjJDXHU0RThDXHU5MDFBXHU5MDUzXHVGRjA5XHUzMDAyXHU1REU1XHU1MTc3XHU2M0QyXHU0RUY2XHU4OUUzXHU2NzkwXHU2NUY2XG4gICAgICAgIC8vIFx1NEYxOFx1NTE0OFx1NzUyOFx1NjcyQyBlbnYgXHU4QkM2XHU1MjJCXCJcdTY3MkNcdTY3MERcdTUyQTFcdTY3MERcdTUyQTFcdTc2ODRcdTVFOTNcIlx1RkYwQ2N3ZCBcdTRGRERcdTYzMDEgZHNoIFx1OEZEQlx1N0EwQlx1OUVEOFx1OEJBNFx1NURFNVx1NEY1Q1x1NzZFRVx1NUY1NVxuICAgICAgICAvLyBcdTRFMERcdTUzRDggXHUyMDE0XHUyMDE0IGN3ZCBcdTRFMEUgT2JzaWRpYW4gXHU1RTkzXHU2NjJGXHU0RTI0XHU0RTJBXHU3MkVDXHU3QUNCXHU2OTgyXHU1RkY1XHVGRjBDXHU0RTBEXHU1NDA4XHU1RTc2XHUzMDAyXG4gICAgICAgIC8vIEIxXHVGRjFBXHU2ODY1XHU1NzMwXHU1NzQwL3Rva2VuIFx1NEUwRSB2YXVsdCBcdTZDRThcdTUxNjVcdTU0MENcdTkwMUFcdTkwNTNcdUZGMDhzaGFyZWQvY3VzdG9tIFx1NkEyMVx1NUYwRlx1NEU1Rlx1NkNFOFx1NTE2NVx1RkYwQ1xuICAgICAgICAvLyBcdTRGOUJcdTVERTVcdTUxNzdcdTRGQTdcdTY4NjVcdTRGMThcdTUxNDhcdTg5RTNcdTY3OTBcdUZGMUJcdTY1RTBcdTY4NjVcdTY1RjZcdTRFMERcdTZDRThcdTUxNjVcdUZGMENcdTVERTVcdTUxNzdcdTU2REVcdTkwMDBcdTY1ODdcdTRFRjZcdTZBMjFcdTVGMEZcdUZGMDlcdTMwMDJcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgLi4uKHNoYXJlZENvbmZpZ1Jvb3QgJiYgdmF1bHRJbmZvXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfTkFNRTogdmF1bHRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgICAgRFNIX09CU0lESUFOX1ZBVUxUX1BBVEg6IHZhdWx0SW5mby5wYXRoLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgICAuLi4odGhpcy5icmlkZ2VVcmxcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIERTSF9PQlNJRElBTl9CUklER0VfVVJMOiB0aGlzLmJyaWRnZVVybCxcbiAgICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fQlJJREdFX1RPS0VOOiB0aGlzLmJyaWRnZVRva2VuLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgICB0aGlzLnByb2MgPSByZXN1bHQucHJvYyA/PyBudWxsXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAncnVubmluZycgJiYgcmVzdWx0LnByb2MgJiYgIXJlc3VsdC5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgLy8gXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCXHVGRjFBXHU1MTk5XHU1MTY1IFBJRCBcdTY1ODdcdTRFRjZcdUZGMENcdTRGOUJcdTRFMEJcdTZCMjFcdTU0MkZcdTUyQThcdTZFMDVcdTYyNkJcdTVCNjRcdTUxM0ZcdTY1RjZcdThCQzZcdTUyMkJcdTVGNTJcdTVDNUVcdTMwMDJcbiAgICAgICAgaWYgKHJlc3VsdC5wcm9jLnBpZCAhPSBudWxsKSB7XG4gICAgICAgICAgd3JpdGVEc2hQaWRGaWxlKGRzaEhvbWUsIHBvcnQsIHJlc3VsdC5wcm9jLnBpZClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhvb2tDaGlsZExvZ3MocmVzdWx0LnByb2MpXG4gICAgICB9XG4gICAgICB0aGlzLnNldFN0YXR1cyhyZXN1bHQuc3RhdHVzKVxuICAgICAgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ2Vycm9yJykge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke3Jlc3VsdC5zdGF0dXMubWVzc2FnZX1gKVxuICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhcmVzdWx0LnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0ggV2ViIFx1NURGMlx1NUMzMVx1N0VFQTogJHtyZXN1bHQuc3RhdHVzLnVybH1gKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IG1zZyB9KVxuICAgICAgbmV3IE5vdGljZShgRFNIIFx1NTQyRlx1NTJBOFx1NUYwMlx1NUUzODogJHttc2d9YClcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5zdGFydGluZyA9IGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXR1c1xuICB9XG5cbiAgYXN5bmMgc3RvcCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICBpZiAodGhpcy5wcm9jKSB7XG4gICAgICBhd2FpdCBzdG9wUHJvY2Vzcyh0aGlzLnByb2MpXG4gICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgfVxuICAgIHJlbW92ZURzaFBpZEZpbGUoY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSkpXG4gICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBEM1x1RkYxQVx1NTRDMVx1NzI0Q1x1NzI3OVx1NUY4MVx1NjgyMVx1OUE4QyBcdTIwMTRcdTIwMTQgR0VUIFx1NjcwRFx1NTJBMVx1NjgzOVx1OERFRlx1NUY4NFx1RkYwQ1x1NTRDRFx1NUU5NFx1NEY1M1x1NTQyQiBcIkRlZXBTZWVrIEhhcm5lc3NcIlxuICAgKiBcdUZGMDhcdTVCOThcdTY1QjkgZHNoIHdlYiBcdTUyNERcdTdBRUYgaW5kZXguaHRtbCBcdTc2ODQgPHRpdGxlPlx1RkYwOVx1NjI0RFx1OEJBNFx1NUI5QVx1NjYyRiBkc2ggd2ViXHUzMDAyXG4gICAqIHJlcXVlc3RVcmwgXHU2NjJGXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHU5MUNDIENTUCBcdThDNDFcdTUxNERcdTc2ODRcdTVCOThcdTY1QjkgSFRUUCBcdTUyQTlcdTYyNEJcdUZGMDhvYnNpZGlhbi5kLnRzOjU0NDJcdUZGMDlcdUZGMUJcbiAgICogdGhyb3c6IGZhbHNlIFx1OEJBOSA0eHgvNXh4IFx1NEU1Rlx1OEQ3MFx1NkI2M1x1NUUzOFx1OEZENFx1NTZERVx1OERFRlx1NUY4NFx1RkYwQ1x1N0VERlx1NEUwMFx1NjMwOVx1NzI3OVx1NUY4MVx1NTIyNFx1NjVBRFx1MzAwMlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyB2ZXJpZnlEc2hCcmFuZCh1cmw6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwID0gYXdhaXQgcmVxdWVzdFVybCh7IHVybCwgbWV0aG9kOiAnR0VUJywgdGhyb3c6IGZhbHNlIH0pXG4gICAgICByZXR1cm4gcmVzcC5zdGF0dXMgPT09IDIwMCAmJiByZXNwLnRleHQuaW5jbHVkZXMoJ0RlZXBTZWVrIEhhcm5lc3MnKVxuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBob29rQ2hpbGRMb2dzKHByb2M6IENoaWxkUHJvY2Vzcyk6IHZvaWQge1xuICAgIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IGNvbnNvbGUud2FybignW2RzaF0nLCBkLnRvU3RyaW5nKCkudHJpbUVuZCgpKSlcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgcmVtb3ZlRHNoUGlkRmlsZShjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKSlcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiAhdGhpcy5zdGF0dXMuYXR0YWNoZWQpIHtcbiAgICAgICAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGBEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBOiBjb2RlPSR7Y29kZX0gc2lnbmFsPSR7c2lnbmFsID8/ICcnfWAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tkc2gtZG9ja10gXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGJywgZXJyKVxuICAgICAgaWYgKHRoaXMucHJvYyA9PT0gcHJvYykge1xuICAgICAgICB0aGlzLnByb2MgPSBudWxsXG4gICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYFx1NUI1MFx1OEZEQlx1N0EwQlx1OTUxOVx1OEJFRjogJHtlcnIubWVzc2FnZX1gIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKiBcdTYzQTJcdTZENEJcdTRGRTFcdTYwNkZcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZGV0ZWN0SW5mbygpOiB7IGRzaEJpbjogc3RyaW5nIHwgbnVsbDsgZHNoTm90ZXM6IHN0cmluZ1tdOyBub2RlTm90ZXM6IHN0cmluZ1tdIH0ge1xuICAgIGNvbnN0IGZvdW5kID0gcmVzb2x2ZURzaEJpbih0aGlzLnNldHRpbmdzLmRzaEJpbilcbiAgICBjb25zdCBub2RlID0gcmVzb2x2ZU5vZGVCaW4odGhpcy5zZXR0aW5ncy5ub2RlQmluLCBlbWJlZGRlZE5vZGVWZXJzaW9uKCksIHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKVxuICAgIHJldHVybiB7XG4gICAgICBkc2hCaW46IGZvdW5kLmJpbixcbiAgICAgIGRzaE5vdGVzOiBmb3VuZC5ub3RlcyxcbiAgICAgIG5vZGVOb3Rlczogbm9kZS5ub3RlcyxcbiAgICB9XG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0IERTSF9IT01FXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHU1QzU1XHU3OTNBXHVGRjA5ICovXG4gIGVmZmVjdGl2ZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY29tcHV0ZURzaEhvbWUodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTdBRUZcdTUzRTNcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU2QkNGIHZhdWx0IFx1NzJFQ1x1N0FDQlx1RkYwOSAqL1xuICBlZmZlY3RpdmVQb3J0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREXHU4QkJFXHU3RjZFXHU0RTBCXHU3NTFGXHU2NTQ4XHU3Njg0XHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRiA9IH4vLmRzaFx1RkYwQ1x1NTE3Nlx1NEY1OVx1NjVFMFx1RkYwOSAqL1xuICBlZmZlY3RpdmVTaGFyZWRDb25maWdSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpXG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgYXMgUGFydGlhbDxEc2hEb2NrU2V0dGluZ3M+IHwgbnVsbFxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBkYXRhID8/IHt9KVxuICAgIC8vIFx1NjVFN1x1NzI0OFx1RkYwOGRzaC1ob3N0IFYwLjFcdUZGMDlcdThCQkVcdTdGNkVcdThGQzFcdTc5RkJcdUZGMUFkc2hIb21lIFx1NUI1N1x1N0IyNlx1NEUzMiBcdTIxOTIgY3VzdG9tIFx1NkEyMVx1NUYwRlxuICAgIGNvbnN0IGxlZ2FjeTogeyBkc2hIb21lPzogc3RyaW5nIH0gfCBudWxsID0gZGF0YVxuICAgIGlmIChsZWdhY3k/LmRzaEhvbWUgJiYgdHlwZW9mIGxlZ2FjeS5kc2hIb21lID09PSAnc3RyaW5nJyAmJiBsZWdhY3kuZHNoSG9tZS50cmltKCkpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZHNoSG9tZU1vZGUgPSAnY3VzdG9tJ1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lID0gbGVnYWN5LmRzaEhvbWUudHJpbSgpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBVSVxuXG4gIGFzeW5jIG9wZW5QYW5lbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHBcbiAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERTSF9XRUJfVklFV19UWVBFKVxuICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IGxlYXZlc1swXSA/PyBudWxsXG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICAvLyBEOFx1RkYxQWdldFJpZ2h0TGVhZihmYWxzZSkgXHU1NzI4IDEuMTMueCBcdTc2ODQgZC50cyBcdTRFMEVcdTVCOThcdTY1QjkgZG9jcyBcdTRFMkRcdTU3NDdcdTY1RTBcbiAgICAgIC8vIEBkZXByZWNhdGVkIFx1NjgwN1x1OEJCMFx1RkYwOFx1NjhDMFx1NkQ0Qlx1NjJBNVx1NTQ0QSBcdTAwQTc1LjFcdUZGMDlcdUZGMENcdThCRURcdTRFNDlcdTUzNzNcIlx1NTNGM1x1NEZBN1x1NjgwRlx1NTNGNlx1NUI1MFwiXHVGRjBDXHU1M0VGXHU3RUU3XHU3RUVEXHU3NTI4XHVGRjFCXG4gICAgICAvLyBlbnN1cmVTaWRlTGVhZiBcdTk3MDAgT2JzaWRpYW4gMS43LjIrXHVGRjBDXHU4MDBDIG1pbkFwcFZlcnNpb24gXHU0RkREXHU2MzAxIDEuNS4wXHVGRjBDXG4gICAgICAvLyBcdTRFMERcdTVGMTVcdTUxNjVcdTk4OURcdTU5MTZcdTcyNDhcdTY3MkNcdTk1RThcdTY5REJcdTMwMDJcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKVxuICAgICAgaWYgKCFsZWFmKSByZXR1cm5cbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogRFNIX1dFQl9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KVxuICAgIH1cbiAgICB3b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmKVxuICB9XG5cbiAgYXN5bmMgb3BlbkluQnJvd3NlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCBzaGVsbC5vcGVuRXh0ZXJuYWwodGhpcy5iYXNlVXJsKVxuICB9XG5cbiAgLyoqXG4gICAqIFx1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOE9ic2lkaWFuIHBvcG91dFx1RkYwOVx1RkYxQURTSCBcdTk3NjJcdTY3N0ZcdThGREJcdTUxNjVcdTcyRUNcdTdBQ0IgQnJvd3NlcldpbmRvdyA9XG4gICAqIFx1NzJFQ1x1N0FDQlx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1RkYwQ1x1NEUwRSBPYnNpZGlhbiBcdTRFM0JcdTdBOTdcdTUzRTNcdTk2OTRcdTc5QkJcdUZGMENcdTYwMjdcdTgwRkRcdTdCNDlcdTU0MENcdTZENEZcdTg5QzhcdTU2NjhcdTY4MDdcdTdCN0VcdTk4NzVcdTMwMDJcbiAgICovXG4gIGFzeW5jIG9wZW5Qb3BvdXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2Uub3BlblBvcG91dExlYWYoKVxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIG5ldyBOb3RpY2UoYFx1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1NTkzMVx1OEQyNTogJHttc2d9YClcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGxhdW5jaGVyLnRzIFx1MjAxNFx1MjAxNCBcdTdFQUZcdTU0MkZcdTUyQThcdTkwM0JcdThGOTFcdUZGMDhcdTk2RjYgT2JzaWRpYW4gXHU0RjlEXHU4RDU2XHVGRjBDXHU1M0VGXHU3MkVDXHU3QUNCXHU1MTkyXHU3MERGXHU2RDRCXHU4QkQ1XHVGRjA5XHUzMDAyXG4gKlxuICogXHU4MDRDXHU4RDIzXHVGRjFBXHU1QjlBXHU0RjREXHU1Qjk4XHU2NUI5IGRzaCBDTEkgXHUyMTkyIFx1OTAwOVx1NjJFOSBOb2RlIFx1OEZEMFx1ODg0Q1x1NjVGNiBcdTIxOTIgc3Bhd24gYGRzaCB3ZWJgXG4gKiBcdUZGMDgxMjcuMC4wLjE6PHBvcnQ+XHVGRjA5XHUyMTkyIFx1N0I0OVx1NUY4NSBIVFRQIFx1NUMzMVx1N0VFQSBcdTIxOTIgXHU1MDVDXHU2QjYyXHUzMDAyXG4gKlxuICogXHU1MTczXHU5NTJFXHU0RThCXHU1QjlFXHVGRjA4XHU1REYyXHU1NzI4XHU1Qjk4XHU2NUI5IEBkZWVwc2Vlay1haS9kc2hAMC4xLjAtcmMuNiBcdTRFMEFcdTlBOENcdThCQzFcdUZGMDlcdUZGMUFcbiAqIC0gYG5vZGUgPGRzaD4vbGliL2Jpbi5qcyB3ZWIgLS1ob3N0IDEyNy4wLjAuMSAtLXBvcnQgPHBvcnQ+YCBcdTUzNzNcdTVCOThcdTY1QjkgV2ViIFVJXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNCBob3N0PTEyNy4wLjAuMVx1MzAwMXBvcnQ9MzA4MFx1RkYwOFx1NTNFRlx1ODk4Nlx1NzZENlx1RkYwOVx1RkYxQlxuICogLSBcdTk5OTZcdTZCMjFcdTU0MkZcdTUyQThcdTgxRUFcdTUyQThcdTUyMURcdTU5Q0JcdTUzMTYgJERTSF9IT01FL3Byb2ZpbGVzL3dlYlx1RkYwOGJ1bmRsZXMgPSBkc2gtYmFzZSArIGRzaC13ZWItYXBwXHVGRjA5XHVGRjBDXG4gKiAgIFx1NkEyMVx1NTc1N1x1ODlFM1x1Njc5MFx1OEQ3MCAkRFNIX0hPTUUvcHJvZmlsZXMvbm9kZV9tb2R1bGVzIFx1NUU3M1x1OTc2Mlx1N0IyNlx1NTNGN1x1OTRGRVx1NjNBNVx1RkYwQ1x1NjVFMFx1OTcwMCBwbnBtL1x1ODA1NFx1N0Y1MVx1RkYxQlxuICogLSBcdTlFRDhcdThCQTRcdTkxNERcdTdGNkVcdTRFMEIgU1FMaXRlXHVGRjA4bm9kZTpzcWxpdGVcdUZGMENcdTk3MDAgTm9kZSBcdTIyNjUyMi41XHVGRjA5XHU0RTBEXHU0RjFBXHU2MjUzXHU1RjAwXHVGRjA4b3BlbkF0OiBuZXZlclx1RkYwOVx1RkYwQ1xuICogICBcdTU2RTBcdTZCNjQgTm9kZSAyMCsgXHU0RTVGXHU4MEZEXHU4REQxXHU5RUQ4XHU4QkE0IHdlYiBwcm9maWxlXHVGRjFCXHU1NDJGXHU3NTI4XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU2NUY2XHU2MjREXHU5NzAwXHU4OTgxIE5vZGUgXHUyMjY1MjIuNVx1MzAwMlxuICovXG5cbmltcG9ydCB7IHNwYXduLCBzcGF3blN5bmMsIHR5cGUgQ2hpbGRQcm9jZXNzIH0gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBjb25zdCBEU0hfUkVMQVRJVkVfQklOID0gcGF0aC5qb2luKCdAZGVlcHNlZWstYWknLCAnZHNoJywgJ2xpYicsICdiaW4uanMnKVxuXG4vKiogTm9kZSBcdTRFM0JcdTcyNDhcdTY3MkNcdTUzRjdcdTZCRDRcdThGODNcdUZGMUFub2RlOnNxbGl0ZSBcdTk3MDBcdTg5ODEgXHUyMjY1MjIuNVx1RkYwOFx1NEVDNVx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NTI5Rlx1ODBGRFx1NzUyOFx1NTIzMFx1RkYwOSAqL1xuZXhwb3J0IGNvbnN0IE5PREVfU1FMSVRFX01JTl9NQUpPUiA9IDIyXG5cbi8qKiBcdTdBMzNcdTVCOUFcdTc3RURcdTU0QzhcdTVFMENcdUZGMDhkamIyXHVGRjA5XHVGRjBDXHU3NTI4XHU0RThFIHZhdWx0IFx1NzZFRVx1NUY1NVx1NTQwRFx1NkQ4OFx1NkI2N1x1RkYwQ1x1OTA3Rlx1NTE0RFx1NEUyRFx1NjU4N1x1NTQwRFx1NkUwNVx1NkQxN1x1NzhCMFx1NjQ5RSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YWJsZUhhc2goaW5wdXQ6IHN0cmluZywgbGVuID0gNik6IHN0cmluZyB7XG4gIGxldCBoID0gNTM4MVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSBoID0gKChoIDw8IDUpICsgaCArIGlucHV0LmNoYXJDb2RlQXQoaSkpID4+PiAwXG4gIHJldHVybiBoLnRvU3RyaW5nKDM2KS5wYWRTdGFydChsZW4sICcwJykuc2xpY2UoMCwgbGVuKVxufVxuXG4vKiogXHU1M0VGXHU4QkZCXHU3Njg0IHZhdWx0IFx1NzZFRVx1NUY1NVx1NTQwRFx1RkYwOFx1NEZERFx1NzU1OSBVbmljb2RlIFx1NUI1N1x1NkJDRFx1NjU3MFx1NUI1N1x1RkYwQ1x1NTE3Nlx1NEY1OVx1OEY2QyAtXHVGRjA5XHVGRjFCXHU3QTdBXHU1MjE5ICd2YXVsdCcgKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlVmF1bHROYW1lKHZhdWx0Um9vdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY2xlYW5lZCA9IHBhdGhcbiAgICAuYmFzZW5hbWUodmF1bHRSb290KVxuICAgIC5yZXBsYWNlKC9bXlxccHtMfVxccHtOfV8tXSsvZ3UsICctJylcbiAgICAucmVwbGFjZSgvXi0rfC0rJC9nLCAnJylcbiAgcmV0dXJuIChjbGVhbmVkIHx8ICd2YXVsdCcpLnNsaWNlKDAsIDQwKVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExhdW5jaE9wdGlvbnMge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU3Njg0XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTlcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluPzogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOSAqL1xuICBub2RlQmluPzogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0PzogbnVtYmVyXG4gIC8qKiBcdTc2RDFcdTU0MkMgaG9zdFx1RkYwOFx1OUVEOFx1OEJBNCAxMjcuMC4wLjFcdUZGMENcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdD86IHN0cmluZ1xuICAvKiogJERTSF9IT01FXHVGRjA4XHU0RjFBXHU4QkREL1x1NUJDNlx1OTRBNS9cdTZBMjFcdTU3OEJcdTkxNERcdTdGNkVcdTY4MzlcdTc2RUVcdTVGNTVcdUZGMUJcdTlFRDhcdThCQTQgPHZhdWx0Pi8uZHNoXHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKipcbiAgICogXHU1MTcxXHU0RUFCXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA4cGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NCBgfi8uZHNoYFx1RkYwOVx1RkYxQVx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU3QjQ5XHU5MTREXHU3RjZFXHU3QzdCXHU2NTg3XHU0RUY2XG4gICAqIFx1NjMwN1x1NTQxMVx1NkI2NFx1NzZFRVx1NUY1NVx1RkYwQ1x1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTRFMDBcdTRFRkRcdUZGMUJzZXNzaW9ucyBcdTdCNDlcdTY1NzBcdTYzNkVcdTRFQ0RcdTU3MjggYGRzaEhvbWVgIFx1OTY5NFx1NzlCQlx1MzAwMlxuICAgKiBcdTc1NTlcdTdBN0EgPSBcdTRFMERcdTU0MkZcdTc1MjhcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcdUZGMDhkc2hIb21lIFx1ODFFQVx1OEVBQlx1NTM3M1x1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOVx1MzAwMlxuICAgKi9cbiAgc2hhcmVkQ29uZmlnUm9vdD86IHN0cmluZ1xuICAvKiogXHU2NjJGXHU1NDI2XHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1OTVFRFx1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU/OiBib29sZWFuXG4gIC8qKiBcdTVDMzFcdTdFRUFcdTdCNDlcdTVGODVcdTRFMEFcdTk2NTBcdUZGMDhcdTlFRDhcdThCQTQgMTIwc1x1RkYwOSAqL1xuICB0aW1lb3V0TXM/OiBudW1iZXJcbiAgLyoqIFx1OTY0NFx1NTJBMFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiAqL1xuICBlbnY/OiBOb2RlSlMuUHJvY2Vzc0VudlxuICAvKipcbiAgICogXHU1QjUwXHU4RkRCXHU3QTBCXHU1REU1XHU0RjVDXHU3NkVFXHU1RjU1XHUzMDAycGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEYyMCB2YXVsdCBcdTY4MzlcdUZGMUFcdTY1QjBcdTVFRkFcdTRGMUFcdThCRERcdTc2ODQgY3dkIFx1NTM3M1x1NjcyQ1x1NUU5M1x1NjgzOVx1RkYwQ1xuICAgKiB2YXVsdCBcdTVERTVcdTUxNzdcdTg5RTNcdTY3OTBcdTk4N0FcdTVFOEZcdTdCMkMgMyBcdTRGNERcdUZGMDhcdTRGMUFcdThCREQgY3dkIFx1ODJFNVx1NjYyRlx1NUU5M1x1RkYwOVx1NzZGNFx1NjNBNVx1NTQ3RFx1NEUyRCBcdTIwMTRcdTIwMTQgXHU1NzI4XHU3NTFGXHU3MjY5XHU1OTA3XHU4QkZFXHU3Njg0XG4gICAqIFx1NjcwRFx1NTJBMVx1OTFDQ1x1NjNEMFx1OTVFRVx1N0VERFx1NEUwRFx1NEYxQVx1ODlFM1x1Njc5MFx1NjIxMFx1NzUxRlx1NzI2OVx1OTg5OFx1NUU5M1x1MzAwMnNoYXJlZCBcdTZBMjFcdTVGMEZcdTRFMERcdTRGMjBcdUZGMDhcdTYyNDBcdTY3MDlcdTVFOTNcdTUxNzFcdTc1MjhcdTRFMDBcdTRFMkFcdTY3MERcdTUyQTFcdUZGMENcbiAgICogXHU5NzYwXHU3MTI2XHU3MEI5XHU2ODA3XHU4QkIwXHU4RERGXHU5NjhGXHVGRjA5XHUzMDAyXG4gICAqL1xuICBjd2Q/OiBzdHJpbmdcbiAgLyoqXG4gICAqIFx1N0FFRlx1NTNFM1x1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1NjVGNlx1NzY4NFwiXHU1NEMxXHU3MjRDXHU3Mjc5XHU1RjgxXHU2ODIxXHU5QThDXCJcdUZGMDhcdTc1MzFcdTYzRDJcdTRFRjZcdTRGQTdcdTZDRThcdTUxNjVcdUZGMENsYXVuY2hlciBcdTRGRERcdTYzMDFcdTk2RjZcbiAgICogT2JzaWRpYW4gXHU0RjlEXHU4RDU2XHVGRjA5XHVGRjFBXHU4RkQ0XHU1NkRFIHRydWUgXHU2MjREXHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjFCXHU4RkQ0XHU1NkRFIGZhbHNlIFx1NjMwOVx1MzAwQ1x1N0FFRlx1NTNFM1x1ODhBQlx1OTc1RVxuICAgKiBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHUzMDBEXHU2MkE1XHU5NTE5XHVGRjBDXHU5MDdGXHU1MTREXHU2MjhBXHU1MjJCXHU3Njg0XHU2NzBEXHU1MkExXHU4QkVGXHU1RjUzXHU2MjEwIGRzaCB3ZWJcdTMwMDJcdTRFMERcdTRGMjAgPSBcdThERjNcdThGQzdcdTY4MjFcdTlBOENcbiAgICogXHVGRjA4XHU2NUU3XHU4ODRDXHU0RTNBXHVGRjBDXHU3QUVGXHU1M0UzXHU2NzA5XHU2NzBEXHU1MkExXHU1MzczXHU2MzAyXHU2M0E1XHVGRjA5XHUzMDAyXG4gICAqL1xuICB2ZXJpZnlCcmFuZD86ICh1cmw6IHN0cmluZykgPT4gUHJvbWlzZTxib29sZWFuPlxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkTm9kZSB7XG4gIC8qKiBcdTc1MjhcdTRFOEUgc3Bhd24gXHU3Njg0IG5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU2NjJGXHU1NDI2XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NjI4QSBPYnNpZGlhbiBcdTc2ODQgRWxlY3Ryb24gXHU0RThDXHU4RkRCXHU1MjM2XHU1RjUzIE5vZGUgXHU3NTI4ICovXG4gIHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuXG4gIC8qKiBcdThCRTUgTm9kZSBcdTc2ODQgbWFqb3IgXHU3MjQ4XHU2NzJDXHVGRjA4XHU2M0EyXHU2RDRCXHU1OTMxXHU4RDI1XHU0RTNBIDBcdUZGMDkgKi9cbiAgbm9kZU1ham9yOiBudW1iZXJcbiAgLyoqIFx1NjNBMlx1NkQ0Qi9cdTUxQjNcdTdCNTZcdThCRjRcdTY2MEVcdUZGMDhcdTRGOUJcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgbm90ZXM6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCB0eXBlIFNlcnZlclN0YXR1cyA9XG4gIHwgeyBraW5kOiAnc3RvcHBlZCcgfVxuICB8IHsga2luZDogJ3N0YXJ0aW5nJyB9XG4gIHwgeyBraW5kOiAncnVubmluZyc7IHBvcnQ6IG51bWJlcjsgaG9zdDogc3RyaW5nOyB1cmw6IHN0cmluZzsgYXR0YWNoZWQ6IGJvb2xlYW4gfVxuICB8IHsga2luZDogJ2Vycm9yJzsgbWVzc2FnZTogc3RyaW5nIH1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdThERUZcdTVGODRcdTVCOUFcdTRGNERcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogXHU2MjhBXHU3NTI4XHU2MjM3XHU1ODZCXHU1MTk5XHU3Njg0XHU1MTY1XHU1M0UzXHU4OUM0XHU4MzAzXHU1MzE2XHVGRjFBXHU2MzA3XHU1NDExIGJpbi5qcyBcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1OTBGRFx1NjNBNVx1NTNENyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZURzaEJpbihpbnB1dDogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWlucHV0KSByZXR1cm4gbnVsbFxuICBjb25zdCBwID0gaW5wdXQudHJpbSgpXG4gIGlmICghcCkgcmV0dXJuIG51bGxcbiAgY29uc3QgZXhwYW5kZWQgPSBwLnJlcGxhY2UoL15+KD89JHxcXC98XFxcXCkvLCBvcy5ob21lZGlyKCkpXG4gIGNvbnN0IGFicyA9IHBhdGguaXNBYnNvbHV0ZShleHBhbmRlZCkgPyBwYXRoLm5vcm1hbGl6ZShleHBhbmRlZCkgOiBwYXRoLnJlc29sdmUoZXhwYW5kZWQpXG4gIHRyeSB7XG4gICAgY29uc3Qgc3QgPSBmcy5zdGF0U3luYyhhYnMpXG4gICAgaWYgKHN0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihhYnMsICdsaWInLCAnYmluLmpzJylcbiAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkgPyBjYW5kaWRhdGUgOiBudWxsXG4gICAgfVxuICAgIGlmIChzdC5pc0ZpbGUoKSkgcmV0dXJuIGFic1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHJldHVybiBudWxsXG59XG5cbi8qKiBcdTVFMzhcdTg5QzEgbnBtIFx1NTE2OFx1NUM0MCBub2RlX21vZHVsZXMgXHU2ODM5XHVGRjA4XHU2MzA5XHU1RTczXHU1M0YwXHVGRjA5ICovXG5sZXQgY2FjaGVkR2xvYmFsUm9vdHM6IHN0cmluZ1tdIHwgbnVsbCA9IG51bGxcbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxNb2R1bGVSb290cygpOiBzdHJpbmdbXSB7XG4gIC8vIFx1N0VEM1x1Njc5Q1x1N0YxM1x1NUI1OFx1RkYxQXNwYXduU3luYygnbnBtJykgXHU2NzAwXHU1NzRGXHU5NjNCXHU1ODVFIDEwc1x1RkYwOG5wbSBcdTYxNjJcdTY1RjZcdUZGMDlcdUZGMENPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcbiAgLy8gXHU5MUNDXHU2QkNGXHU2QjIxXHU1NDJGXHU1MkE4XHU5MEZEXHU1NDBDXHU2QjY1XHU4REQxXHU0RTAwXHU2QjIxXHU0RTBEXHU1M0VGXHU2M0E1XHU1M0Q3XHUzMDAyXHU4RkRCXHU3QTBCXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXHU1MTg1IG5wbSByb290IFx1NEUwRFx1NTNEOFx1RkYwQ1xuICAvLyBcdTk5OTZcdTZCMjFcdTYzQTJcdTZENEJcdTU0MEVcdTU5MERcdTc1MjhcdTMwMDJcdTZDRThcdTYxMEZcdUZGMUFcdThGRDBcdTg4NENcdTRFMkRcdTU0MEVcdTg4QzVcdTc2ODQgZHNoIFx1NEUwRFx1NEYxQVx1ODhBQlx1NTNEMVx1NzNCMFx1RkYwQ1x1NEY0Nlx1NTZGQVx1NUI5QVx1OERFRlx1NUY4NFxuICAvLyBcdUZGMDgvb3B0L2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMgXHU3QjQ5XHVGRjA5XHU0RUNEXHU4OTg2XHU3NkQ2XHU1RTM4XHU4OUMxXHU1Qjg5XHU4OEM1XHU0RjREXHU3RjZFXHUzMDAyXG4gIGlmIChjYWNoZWRHbG9iYWxSb290cykgcmV0dXJuIGNhY2hlZEdsb2JhbFJvb3RzXG4gIGNvbnN0IHJvb3RzOiBzdHJpbmdbXSA9IFtdXG4gIGlmIChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpIHJvb3RzLnB1c2gocHJvY2Vzcy5lbnYuRFNIX0dMT0JBTF9NT0RVTEVTKVxuICBjb25zdCBucG1Sb290ID0gc3Bhd25TeW5jKCducG0nLCBbJ3Jvb3QnLCAnLWcnXSwge1xuICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgdGltZW91dDogMTBfMDAwLFxuICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICB9KVxuICBpZiAobnBtUm9vdC5zdGF0dXMgPT09IDAgJiYgbnBtUm9vdC5zdGRvdXQpIHtcbiAgICBjb25zdCBsaW5lID0gbnBtUm9vdC5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLylbMF1cbiAgICBpZiAobGluZSkgcm9vdHMucHVzaChsaW5lKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuICAgIHJvb3RzLnB1c2goJy9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICByb290cy5wdXNoKCcvdXNyL2xpYi9ub2RlX21vZHVsZXMnLCAnL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdsaWInLCAnbm9kZV9tb2R1bGVzJykpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIGNvbnN0IGFwcERhdGEgPSBwcm9jZXNzLmVudi5BUFBEQVRBXG4gICAgaWYgKGFwcERhdGEpIHJvb3RzLnB1c2gocGF0aC5qb2luKGFwcERhdGEsICducG0nLCAnbm9kZV9tb2R1bGVzJykpXG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXG4gIGNhY2hlZEdsb2JhbFJvb3RzID0gWy4uLm5ldyBTZXQocm9vdHMpXVxuICByZXR1cm4gY2FjaGVkR2xvYmFsUm9vdHNcbn1cblxuLyoqXG4gKiBcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTUxNjVcdTUzRTNcdTMwMDJcdTRGMThcdTUxNDhcdTdFQTdcdUZGMUFcbiAqIDEuIFx1NjYzRVx1NUYwRlx1NEYyMFx1NTE2NVx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1RkYwOVx1MjE5MiAyLiBcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgRFNIX0JJTiBcdTIxOTIgMy4gbnBtIHJvb3QgLWcgXHUyMTkyIDQuIFx1NUUzOFx1ODlDMVx1NTE2OFx1NUM0MFx1NjgzOVx1MzAwMlxuICogXHU2NzJBXHU2MjdFXHU1MjMwXHU2NUY2IGJpbiBcdTRFM0EgbnVsbFx1RkYwQ25vdGVzIFx1OEJGNFx1NjYwRVx1NTM5Rlx1NTZFMFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURzaEJpbihleHBsaWNpdD86IHN0cmluZyk6IHsgYmluOiBzdHJpbmcgfCBudWxsOyBub3Rlczogc3RyaW5nW10gfSB7XG4gIGNvbnN0IG5vdGVzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGV4cGxpY2l0QmluID0gbm9ybWFsaXplRHNoQmluKGV4cGxpY2l0ID8/IHByb2Nlc3MuZW52LkRTSF9CSU4pXG4gIGlmIChleHBsaWNpdEJpbiAmJiBmcy5leGlzdHNTeW5jKGV4cGxpY2l0QmluKSkge1xuICAgIHJldHVybiB7IGJpbjogZXhwbGljaXRCaW4sIG5vdGVzOiBbYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NDogJHtleHBsaWNpdEJpbn1gXSB9XG4gIH1cbiAgaWYgKGV4cGxpY2l0KSBub3Rlcy5wdXNoKGBcdTY2M0VcdTVGMEZcdThERUZcdTVGODRcdTRFMERcdTVCNThcdTU3Mjg6ICR7ZXhwbGljaXR9YClcblxuICBmb3IgKGNvbnN0IHJvb3Qgb2YgZ2xvYmFsTW9kdWxlUm9vdHMoKSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihyb290LCBEU0hfUkVMQVRJVkVfQklOKVxuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHJldHVybiB7IGJpbjogY2FuZGlkYXRlLCBub3RlczogWy4uLm5vdGVzLCBgXHU0RUNFXHU1MTY4XHU1QzQwXHU2QTIxXHU1NzU3XHU2ODM5XHU1M0QxXHU3M0IwOiAke2NhbmRpZGF0ZX1gXSB9XG4gICAgfVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NjcyQVx1NjI3RVx1NTIzMCBkc2ggXHU1Qjg5XHU4OEM1XHUzMDAyXHU4QkY3XHU1MTQ4XHU2MjY3XHU4ODRDOiBucG0gaW5zdGFsbCAtZyBAZGVlcHNlZWstYWkvZHNoXHVGRjBDXHU2MjE2XHU1NzI4XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IGRzaCBcdThERUZcdTVGODQnKVxuICByZXR1cm4geyBiaW46IG51bGwsIG5vdGVzIH1cbn1cblxuLyoqXG4gKiBcdTVFMzhcdTg5QzEgTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMENcdTYzQTJcdTZENEJcdTc1MjhcdUZGMDlcdTMwMDJcbiAqIE9ic2lkaWFuIFx1NEY1Q1x1NEUzQSBHVUkgXHU1RTk0XHU3NTI4XHU0RUNFIEZpbmRlciBcdTU0MkZcdTUyQThcdTY1RjZcdUZGMENQQVRIIFx1OTAxQVx1NUUzOFx1NTNFQVx1NjcwOVx1N0NGQlx1N0VERlx1NzZFRVx1NUY1NVxuICogXHVGRjA4L3Vzci9iaW46L2JpbjovdXNyL3NiaW46L3NiaW5cdUZGMDlcdUZGMENcdTRFMERcdTU0MkIgSG9tZWJyZXcgXHU3QjQ5XHU3NTI4XHU2MjM3XHU1Qjg5XHU4OEM1XHU3NkVFXHU1RjU1XHVGRjBDXG4gKiBcdTU2RTBcdTZCNjQgc3Bhd24oJ25vZGUnKSBcdTRGMUFcdTc2RjRcdTYzQTUgRU5PRU5UXHUzMDAyXHU4RkQ5XHU5MUNDXHU2MjhBXHU1RTM4XHU4OUMxXHU1Qjg5XHU4OEM1XHU0RjREXHU3RjZFXHU4ODY1XHU5RjUwXHVGRjFBXG4gKiAtIFBBVEggXHU0RTJEXHU3Njg0IG5vZGVcdUZGMDhzaGVsbCBcdTkxQ0NcdThGRDBcdTg4NENcdTY1RjZcdTVCNThcdTU3MjhcdUZGMDlcdUZGMUJcbiAqIC0gbWFjT1M6IC9vcHQvaG9tZWJyZXcvYmluL25vZGVcdUZGMDhBcHBsZSBTaWxpY29uXHVGRjA5XHUzMDAxL3Vzci9sb2NhbC9iaW4vbm9kZVx1RkYwOEludGVsXHVGRjA5XHVGRjFCXG4gKiAtIExpbnV4OiAvdXNyL2Jpbi9ub2RlXHUzMDAxL3Vzci9sb2NhbC9iaW4vbm9kZVx1MzAwMX4vLmxvY2FsL2Jpbi9ub2RlXHVGRjFCXG4gKiAtIFdpbmRvd3M6IFx1OTAxQVx1OEZDNyBgd2hlcmUgbm9kZWAgXHU4OUUzXHU2NzkwXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21tb25Ob2RlQmlucygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGJpbnM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgcGF0aEVudiA9IHByb2Nlc3MuZW52LlBBVEggPz8gJydcbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aEVudi5zcGxpdChwYXRoLmRlbGltaXRlcikpIHtcbiAgICBpZiAoZGlyLnRyaW0oKSkgYmlucy5wdXNoKHBhdGguam9pbihkaXIsICdub2RlJykpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgYmlucy5wdXNoKCcvb3B0L2hvbWVicmV3L2Jpbi9ub2RlJywgJy91c3IvbG9jYWwvYmluL25vZGUnKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgICBiaW5zLnB1c2goJy91c3IvYmluL25vZGUnLCAnL3Vzci9sb2NhbC9iaW4vbm9kZScsIHBhdGguam9pbihvcy5ob21lZGlyKCksICcubG9jYWwnLCAnYmluJywgJ25vZGUnKSlcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHdoZXJlID0gc3Bhd25TeW5jKCd3aGVyZScsIFsnbm9kZSddLCB7IGVuY29kaW5nOiAndXRmOCcsIHRpbWVvdXQ6IDEwXzAwMCwgd2luZG93c0hpZGU6IHRydWUgfSlcbiAgICAgIGlmICh3aGVyZS5zdGF0dXMgPT09IDAgJiYgd2hlcmUuc3Rkb3V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiB3aGVyZS5zdGRvdXQudHJpbSgpLnNwbGl0KC9cXHI/XFxuLykpIHtcbiAgICAgICAgICBpZiAobGluZS50cmltKCkpIGJpbnMucHVzaChsaW5lLnRyaW0oKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICB9XG4gIC8vIFx1NTNCQlx1OTFDRFx1NEZERFx1NUU4Rlx1RkYwQ1x1NEZERFx1NzU1OVx1N0IyQ1x1NEUwMFx1NEUyQVx1NUI1OFx1NTcyOFx1NzY4NFxuICByZXR1cm4gWy4uLm5ldyBTZXQoYmlucyldXG59XG5cbi8qKiBcdTYzQTJcdTZENEIgbm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdTc2ODQgbWFqb3IgXHU3MjQ4XHU2NzJDXHVGRjFCXHU1OTMxXHU4RDI1XHU4RkQ0XHU1NkRFIDBcdUZGMDhub2RlTWFqb3IgMCA9IFx1NjcyQVx1NzdFNVx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb2JlTm9kZU1ham9yKG5vZGVCaW46IHN0cmluZyk6IG51bWJlciB7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKG5vZGVCaW4sIFsnLS12ZXJzaW9uJ10sIHsgZW5jb2Rpbmc6ICd1dGY4JywgdGltZW91dDogNTAwMCwgd2luZG93c0hpZGU6IHRydWUgfSlcbiAgICBjb25zdCBtID0gL152PyhcXGQrKVxcLi8uZXhlYygob3V0LnN0ZG91dCB8fCAnJykudHJpbSgpKVxuICAgIHJldHVybiBtID8gTnVtYmVyKG1bMV0pIDogMFxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gMFxuICB9XG59XG5cbi8qKlxuICogXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2XHUzMDAyXG4gKiBcdTlFRDhcdThCQTRcdTk4N0FcdTVFOEZcdUZGMUFcdTY2M0VcdTVGMEZcdThERUZcdTVGODQgXHUyMTkyIFx1N0NGQlx1N0VERiBgbm9kZWBcdUZGMDhQQVRIICsgXHU1RTM4XHU4OUMxXHU1Qjg5XHU4OEM1XHU4REVGXHU1Rjg0XHVGRjBDXHU4RkQ0XHU1NkRFXHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXG4gKiBcdTkwN0ZcdTUxNEQgT2JzaWRpYW4gR1VJIFx1NzNBRlx1NTg4MyBQQVRIIFx1N0YzQVx1NTkzMVx1NUJGQ1x1ODFGNCBzcGF3biBFTk9FTlRcdUZGMDlcdTIxOTIgXHU2MjdFXHU0RTBEXHU1MjMwXHU2NUY2XHU3RUQ5XHU1MUZBXHU2NjBFXHU3ODZFXHU5NTE5XHU4QkVGXHUzMDAyXG4gKiBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgXHU1QjlFXHU2RDRCXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjA4T2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XG4gKiBcdTRFMERcdTYzMDlcdTY2NkVcdTkwMUEgRWxlY3Ryb24gXHU4QkVEXHU0RTQ5XHU1NENEXHU1RTk0XHVGRjA5XHVGRjBDXHU1NkUwXHU2QjY0XHU0RUM1XHU1RjUzIHVzZUVtYmVkZGVkTm9kZSBcdTY2M0VcdTVGMEZcdTVGMDBcdTU0MkZcdTY1RjZcdTYyNERcdTVDMURcdThCRDVcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVOb2RlQmluKGV4cGxpY2l0Pzogc3RyaW5nLCBlbWJlZGRlZE5vZGVWZXJzaW9uPzogc3RyaW5nLCB1c2VFbWJlZGRlZCA9IGZhbHNlKTogUmVzb2x2ZWROb2RlIHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBleHBsaWNpdD8udHJpbSgpIHx8IHByb2Nlc3MuZW52LkRTSF9OT0RFXG4gIGlmIChleHBsaWNpdEJpbikge1xuICAgIGNvbnN0IG1ham9yID0gcHJvYmVOb2RlTWFqb3IoZXhwbGljaXRCaW4pXG4gICAgY29uc3Qgbm90ZSA9IG1ham9yID4gMCA/IGBcdTRGN0ZcdTc1MjhcdTY2M0VcdTVGMEYgTm9kZTogJHtleHBsaWNpdEJpbn1cdUZGMDh2JHttYWpvcn1cdUZGMDlgIDogYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRiBOb2RlOiAke2V4cGxpY2l0QmlufWBcbiAgICBub3Rlcy5wdXNoKG5vdGUpXG4gICAgcmV0dXJuIHsgbm9kZUJpbjogZXhwbGljaXRCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBmYWxzZSwgbm9kZU1ham9yOiBtYWpvciwgbm90ZXMgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZCAmJiBwcm9jZXNzLmV4ZWNQYXRoICYmIGVtYmVkZGVkTm9kZVZlcnNpb24pIHtcbiAgICBjb25zdCBtYWpvciA9IE51bWJlcihlbWJlZGRlZE5vZGVWZXJzaW9uLnNwbGl0KCcuJylbMF0pIHx8IDBcbiAgICBpZiAobWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SKSB7XG4gICAgICBub3Rlcy5wdXNoKGBcdTRGN0ZcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufVx1RkYwOEVMRUNUUk9OX1JVTl9BU19OT0RFXHVGRjA5YClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IHByb2Nlc3MuZXhlY1BhdGgsIHVzZUVsZWN0cm9uQXNOb2RlOiB0cnVlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICAgIG5vdGVzLnB1c2goYE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlICR7ZW1iZWRkZWROb2RlVmVyc2lvbn0gPCAke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMENcdTY1RTBcdTZDRDVcdTU0MkZcdTc1MjhgKVxuICB9XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNvbW1vbk5vZGVCaW5zKCkpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XG4gICAgICBjb25zdCBtYWpvciA9IHByb2JlTm9kZU1ham9yKGNhbmRpZGF0ZSlcbiAgICAgIG5vdGVzLnB1c2goXG4gICAgICAgIG1ham9yID49IE5PREVfU1FMSVRFX01JTl9NQUpPUlxuICAgICAgICAgID8gYFx1NEY3Rlx1NzUyOFx1N0NGQlx1N0VERiBOb2RlOiAke2NhbmRpZGF0ZX1cdUZGMDh2JHttYWpvcn1cdUZGMENcdTY1MkZcdTYzMDFcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTYyNDBcdTk3MDAgU1FMaXRlXHVGRjA5YFxuICAgICAgICAgIDogYFx1NEY3Rlx1NzUyOFx1N0NGQlx1N0VERiBOb2RlOiAke2NhbmRpZGF0ZX1cdUZGMDh2JHttYWpvciB8fCAnPyd9XHVGRjFCXHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU5NzAwIE5vZGUgXHUyMjY1JHtOT0RFX1NRTElURV9NSU5fTUFKT1J9XHVGRjA5YCxcbiAgICAgIClcbiAgICAgIHJldHVybiB7IG5vZGVCaW46IGNhbmRpZGF0ZSwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gICAgfVxuICB9XG4gIG5vdGVzLnB1c2goJ1x1NjcyQVx1NjI3RVx1NTIzMCBOb2RlXHUzMDAyXHU4QkY3XHU1Qjg5XHU4OEM1IE5vZGVcdUZGMDhodHRwczovL25vZGVqcy5vcmdcdUZGMDlcdUZGMENcdTYyMTZcdTU3MjhcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdThERUZcdTVGODQnKVxuICByZXR1cm4geyBub2RlQmluOiAnJywgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IDAsIG5vdGVzIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTdBRUZcdTUzRTNcdTYzQTJcdTZENEJcdTRFMEVcdTdCNDlcdTVGODVcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogXHU1RjUzXHU1MjREXHU4RkQwXHU4ODRDXHU3M0FGXHU1ODgzXHVGRjA4T2JzaWRpYW4gXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjA5XHU4MUVBXHU1RTI2XHU3Njg0IE5vZGUgXHU3MjQ4XHU2NzJDXHVGRjFCXHU2NUUwXHU1MjE5IHVuZGVmaW5lZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVtYmVkZGVkTm9kZVZlcnNpb24oKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB2ID0gKHByb2Nlc3MudmVyc2lvbnMgYXMgeyBub2RlPzogc3RyaW5nIH0gfCB1bmRlZmluZWQpPy5ub2RlXG4gICAgcmV0dXJuIHYgfHwgdW5kZWZpbmVkXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFx1N0FFRlx1NTNFM1x1NjYyRlx1NTQyNlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1MzAwMlxuICogXHU3NTI4IG5vZGU6aHR0cCBcdTgwMENcdTk3NUVcdTZENEZcdTg5QzhcdTU2NjggZmV0Y2hcdUZGMUFPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTc2ODQgQ1NQIFx1NEYxQVx1NjJFNlx1NjIyQVxuICogXHU1QkY5IGh0dHA6Ly8xMjcuMC4wLjEgXHU3Njg0IGZldGNoXHVGRjBDXHU1QkZDXHU4MUY0XCJcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcIlx1OEJFRlx1NTIyNFx1NEUzQVwiXHU2Q0ExXHU2NzA5XCJcdTMwMDJcbiAqIE5vZGUgXHU3Njg0IGh0dHAgXHU2QTIxXHU1NzU3XHU0RTBEXHU1M0Q3XHU5ODc1XHU5NzYyIENTUCBcdTdFQTZcdTY3NUZcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUG9ydFVwKGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCB0aW1lb3V0TXMgPSAxNTAwKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHJlcSA9IGh0dHAuZ2V0KHsgaG9zdCwgcG9ydCwgcGF0aDogJy8nLCB0aW1lb3V0OiB0aW1lb3V0TXMgfSwgKHJlcykgPT4ge1xuICAgICAgcmVzLnJlc3VtZSgpXG4gICAgICByZXNvbHZlKHRydWUpXG4gICAgfSlcbiAgICByZXEub24oJ3RpbWVvdXQnLCAoKSA9PiB7XG4gICAgICByZXEuZGVzdHJveSgpXG4gICAgICByZXNvbHZlKGZhbHNlKVxuICAgIH0pXG4gICAgcmVxLm9uKCdlcnJvcicsICgpID0+IHJlc29sdmUoZmFsc2UpKVxuICB9KVxufVxuXG4vKiogXHU4RjZFXHU4QkUyXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBXHVGRjFCXHU4RDg1XHU2NUY2XHU4RkQ0XHU1NkRFIGZhbHNlICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2FpdEZvclJlYWR5KGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCB0aW1lb3V0TXMgPSAxMjBfMDAwKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGRlYWRsaW5lID0gRGF0ZS5ub3coKSArIHRpbWVvdXRNc1xuICBmb3IgKDs7KSB7XG4gICAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQsIDE1MDApKSByZXR1cm4gdHJ1ZVxuICAgIGlmIChEYXRlLm5vdygpID4gZGVhZGxpbmUpIHJldHVybiBmYWxzZVxuICAgIC8vIGdsb2JhbFRoaXMuc2V0VGltZW91dFx1RkYxQU5vZGVcdUZGMDhzbW9rZVx1RkYwOVx1NEUwRSBPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTkwRkRcdTUzRUZcdTc1MjhcdUZGMENcbiAgICAvLyBcdTRFMERcdTVGMTVcdTUxNjUgd2luZG93IFx1NEY5RFx1OEQ1Nlx1RkYwOGxhdW5jaGVyIFx1NEZERFx1NjMwMVx1N0VBRiBOb2RlIFx1NTNFRlx1NkQ0Qlx1RkYwOVx1MzAwMlxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBnbG9iYWxUaGlzLnNldFRpbWVvdXQociwgNTAwKSlcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1NTQyRlx1NTJBOCAvIFx1NTA1Q1x1NkI2MlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF1bmNoZWRTZXJ2ZXIge1xuICBwcm9jOiBDaGlsZFByb2Nlc3NcbiAgdXJsOiBzdHJpbmdcbiAgLyoqIHRydWUgPSBcdTdBRUZcdTUzRTNcdTRFMEFcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMENcdTY3MkFcdTY1QjBcdThENzdcdThGREJcdTdBMEIgKi9cbiAgYXR0YWNoZWQ6IGJvb2xlYW5cbn1cblxuLyoqXG4gKiBwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHVGRjFBXHU2MjhBIHBlci12YXVsdCBEU0hfSE9NRSBcdTc2ODQgYHByb2ZpbGVzL2AgXHU2NkZGXHU2MzYyXHU0RTNBXHU2MzA3XHU1NDExXHU1MTcxXHU0RUFCXG4gKiBgfi8uZHNoL3Byb2ZpbGVzYCBcdTc2ODRcdThGNkZcdTk0RkVcdTMwMDJcdThGRDBcdTg4NENcdTY1RjZcdTYzRDJcdTRFRjZcdUZGMDhcdTdFQTYgMTk1IFx1NEUyQSBAZGVlcHNlZWstYWkgXHU1MzA1XHVGRjA5XHU1MTY4XHU1QzQwXG4gKiBcdTRFMDBcdTRFRkRcdUZGMENcdTkwN0ZcdTUxNERcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU1NDA0XHU4MUVBXHU5NEZBXHU1MUUwXHU3NjdFIE1CIFx1NzY4NCBub2RlX21vZHVsZXMgXHU1RTczXHU5NzYyXHU5NEZFXHU2M0E1XHVGRjFCc2tpbGwgXHU1QjlBXHU0RTQ5XG4gKiBcdTRFNUZcdTk2OEZcdTUxNzFcdTRFQUIgcHJvZmlsZXMvYWdlbnQtcHJlc2V0cyBcdTRFMDBcdTVFNzZcdTU5MERcdTc1MjhcdTMwMDJcbiAqXG4gKiBcdTU0MENcdTY1RjZcdTYyOEEgYC5hZ2VudC1wcmVzZXRzL2AgXHU4RjZGXHU5NEZFXHU1MjMwXHU1MTcxXHU0RUFCIGB+Ly5kc2gvLmFnZW50LXByZXNldHNgXHVGRjFBYWdlbnQgcHJlc2V0XG4gKiBcdTc2ODRcdTUzRDFcdTczQjBcdTY4MzlcdTY2MkYgYGRzaEhvbWVQYXRoKCcuYWdlbnQtcHJlc2V0cycpYFx1RkYwOFx1OERERlx1OTY4RiBEU0hfSE9NRVx1RkYwOVx1RkYwQ3Blci12YXVsdFxuICogXHU2QTIxXHU1RjBGXHU4MkU1XHU0RTBEXHU1NDBDXHU2QjY1XHU4RjZGXHU5NEZFXHVGRjBDZHNoIFx1NEYxQVx1NEVDRSBwZXItdmF1bHQgXHU3NkVFXHU1RjU1XHU2MjdFIHByZXNldCBcdTIwMTRcdTIwMTQgXHU3NTI4XHU2MjM3XHU4MUVBXHU1QjlBXHU0RTQ5XHU3Njg0XG4gKiBgb2JzaWRpYW5gIHByZXNldFx1RkYwOFx1NjMwMlx1OEY3RCB2YXVsdCBcdTVERTVcdTUxNzcgKyBvYnNpZGlhbi1jb252ZW50aW9ucyBza2lsbFx1RkYwOVx1NUMzMVx1NjI3RVx1NEUwRFx1NTIzMFx1RkYwQ1xuICogXHU4ODY4XHU3M0IwXHU0RTNBXHU5NzYyXHU2NzdGXHU5MUNDXHU2Q0ExXHU2NzA5IHZhdWx0IFx1NURFNVx1NTE3N1x1MzAwMlxuICpcbiAqIFx1NURGMlx1NUI1OFx1NTcyOFx1NzY4NFx1NzcxRlx1NUI5RVx1NzZFRVx1NUY1NVx1NEYxQVx1ODhBQlx1NjZGRlx1NjM2Mlx1NEUzQVx1OEY2Rlx1OTRGRVx1RkYwOFx1NjVFN1x1NzZFRVx1NUY1NVx1NTE0OFx1NjUzOVx1NTQwRFx1NTkwN1x1NEVGRFx1NEUzQSBgPG5hbWU+LmJhay08dHM+YFx1RkYwQ1xuICogXHU3ODZFXHU4QkE0XHU1MTcxXHU0RUFCXHU1M0VGXHU3NTI4XHU1NDBFXHU1M0VGXHU2MjRCXHU1MkE4XHU1MjIwXHU5NjY0XHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTaGFyZWRQcm9maWxlcyhkc2hIb21lOiBzdHJpbmcsIHNoYXJlZFJvb3Q6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXNoYXJlZFJvb3QgfHwgZHNoSG9tZSA9PT0gc2hhcmVkUm9vdCkgcmV0dXJuXG4gIGNvbnN0IGxpbmtEaXIgPSAobmFtZTogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHBhdGguam9pbihkc2hIb21lLCBuYW1lKVxuICAgICAgY29uc3Qgc2hhcmVkVGFyZ2V0ID0gcGF0aC5qb2luKHNoYXJlZFJvb3QsIG5hbWUpXG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2hhcmVkVGFyZ2V0KSkgcmV0dXJuXG4gICAgICBsZXQgc3Q6IGZzLlN0YXRzIHwgbnVsbCA9IG51bGxcbiAgICAgIHRyeSB7XG4gICAgICAgIHN0ID0gZnMubHN0YXRTeW5jKHRhcmdldClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBzdCA9IG51bGxcbiAgICAgIH1cbiAgICAgIGlmIChzdD8uaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBpZiAoZnMucmVhbHBhdGhTeW5jKHRhcmdldCkgPT09IGZzLnJlYWxwYXRoU3luYyhzaGFyZWRUYXJnZXQpKSByZXR1cm5cbiAgICAgICAgZnMudW5saW5rU3luYyh0YXJnZXQpXG4gICAgICAgIHN0ID0gbnVsbFxuICAgICAgfVxuICAgICAgaWYgKHN0Py5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IGJhayA9IGAke3RhcmdldH0uYmFrLSR7RGF0ZS5ub3coKX1gXG4gICAgICAgIGZzLnJlbmFtZVN5bmModGFyZ2V0LCBiYWspXG4gICAgICB9XG4gICAgICBmcy5ta2RpclN5bmMoZHNoSG9tZSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICAgIGZzLnN5bWxpbmtTeW5jKHNoYXJlZFRhcmdldCwgdGFyZ2V0LCAnZGlyJylcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW2RzaC1ob3N0XSBcdTVFRkFcdTdBQ0JcdTUxNzFcdTRFQUIgJHtuYW1lfSBcdThGNkZcdTk0RkVcdTU5MzFcdThEMjVcdUZGMDhwZXItdmF1bHQgXHU1QzA2XHU3NTI4XHU3MkVDXHU3QUNCXHU3NkVFXHU1RjU1XHVGRjA5YCwgZXJyKVxuICAgIH1cbiAgfVxuICBsaW5rRGlyKCdwcm9maWxlcycpXG4gIGxpbmtEaXIoJy5hZ2VudC1wcmVzZXRzJylcbn1cblxuLyoqXG4gKiBZQU1MIFx1NTM1NVx1NUYxNVx1NTNGN1x1NjgwN1x1OTFDRlx1RkYxQVx1OERFRlx1NUY4NFx1NTQyQlx1N0E3QVx1NjgzQy9cdTUxOTJcdTUzRjcvIy9cdTUzQ0RcdTY1OUNcdTY3NjBcdTY1RjZcdTRGOURcdTcxMzZcdTVCODlcdTUxNjhcdTMwMDJcbiAqIFx1NTM1NVx1NUYxNVx1NTNGN1x1NTE4NVx1NTNFQVx1OEY2Q1x1NEU0OSBgJ2BcdUZGMDhcdTUxOTlcdTRFM0EgYCcnYFx1RkYwOVx1RkYwQ1dpbmRvd3MgXHU1M0NEXHU2NTlDXHU2NzYwXHU4REVGXHU1Rjg0XHU0RTBEXHU1M0Q3XHU1M0NDXHU1RjE1XHU1M0Y3XHU4RjZDXHU0RTQ5XHU1RjcxXHU1NENEXHUzMDAyXG4gKi9cbmZ1bmN0aW9uIHlhbWxTY2FsYXIocDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAnJHtwLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nYFxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTRFMEJcdTc2ODRcIlx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlwiXHVGRjFBXHU2MjhBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUIgYH4vLmRzaGBcdUZGMENcbiAqIFx1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1NjU3MFx1NjM2RVx1MzAwMlxuICpcbiAqIFx1NTM5Rlx1NzQwNlx1RkYxQWRzaCBcdTc2ODQgYHNldHRpbmdzYFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtc2V0dGluZ3MtZmlsZVx1RkYwOVx1NEUwRSBgY3JlZGVudGlhbHNgXG4gKiBcdUZGMDhAZGVlcHNlZWstYWkvZHNoLWNyZWRlbnRpYWxzLWxvY2FsXHVGRjA5XHU2M0QyXHU0RUY2XHU5MEZEXHU2NTJGXHU2MzAxIGBwYXRoYCBcdTg5ODZcdTc2RDZcdUZGMENcdTlFRDhcdThCQTRcdThERUZcdTVGODRcdTY2MkZcbiAqIGA8ZHNoSG9tZT4vc2V0dGluZ3MueWFtbGAgLyBgPGRzaEhvbWU+Ly5jcmVkZW50aWFscy55YW1sYFx1MzAwMlx1NTcyOFx1NTE3MVx1NEVBQiBwcm9maWxlXG4gKiBcdTc2ODQgYGNvcmRpcy5wYXRjaC55bWxgIFx1OTFDQ1x1NjI4QVx1OEZEOVx1NEUyNFx1NEUyQVx1NjNEMlx1NEVGNlx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQlx1NjgzOVx1NzY4NFx1NjU4N1x1NEVGNlx1RkYwQ1x1NkEyMVx1NTc4Qlx1OTAwOVx1NjJFOVx1MzAwMUFQSSBcdTVCQzZcdTk0QTVcdTMwMDFcbiAqIFx1NEUzQlx1OTg5OFx1N0I0OVx1OTE0RFx1NEUwMFx1NkIyMVx1RkYwOFx1NTcyOFx1NEVGQlx1NjEwRiB2YXVsdCBcdTc2ODQgRFNIIFx1OTc2Mlx1Njc3Rlx1NjIxNlx1NzZGNFx1NjNBNVx1NjUzOSB+Ly5kc2hcdUZGMDlcdTUzNzNcdTUzRUZcdTUxNjggdmF1bHQgXHU3NTFGXHU2NTQ4XHUzMDAyXG4gKiBcdTZDRThcdTYxMEZcdUZGMUFwcm9maWxlcyBcdTVERjJcdThGNkZcdTk0RkVcdTUxNzFcdTRFQUJcdUZGMENcdTYyNDBcdTRFRTVcdThGRDlcdTkxQ0NcdTUxOTlcdTUxNjVcdTc2ODRcdTZCNjNcdTY2MkZcdTUxNzFcdTRFQUIgcGF0Y2ggXHUyMDE0XHUyMDE0IFx1NzUyOFx1NjIzN1x1ODFFQVx1ODhDNVx1NzY4NFxuICogXHU2M0QyXHU0RUY2XHU2NzYxXHU3NkVFXHVGRjA4aW5zZXJ0XHVGRjA5XHU1RkM1XHU5ODdCXHU0RkREXHU3NTU5XHVGRjBDXHU1M0VBXHU1NDA4XHU1RTc2L1x1NjZGNFx1NjVCMCBzZXR0aW5ncy9jcmVkZW50aWFscyBcdTRFMjRcdTRFMkFcdTY3NjFcdTc2RUVcdTMwMDJcbiAqXG4gKiBwYXRjaCBcdTY4M0NcdTVGMEZcdUZGMDhjb3JkaXMgbG9hZGVyIFx1NzY4NCBhcHBseUVudHJ5UGF0Y2hlc1x1RkYwOVx1RkYxQVx1NTIxN1x1ODg2OFx1OTFDQ1x1NkJDRlx1NEUyQVx1NTE0M1x1N0QyMFx1NzZGNFx1NjNBNVx1NjYyRlxuICogYHsgaWQsIGluc2VydD8sIG5hbWU/LCAuLi5vdmVycmlkZXMgfWBcdUZGMENvdmVycmlkZXMgXHU5NTJFXHU4OTg2XHU3NkQ2XHU1NDBDXHU1NDBEIHRhcmdldCBcdTY3NjFcdTc2RUVcdUZGMENcbiAqIFx1NkNBMVx1NjcwOSBgdXBkYXRlOmAgXHU1MzA1XHU4OEM1XHU1QzQyXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChkc2hIb21lOiBzdHJpbmcsIHNoYXJlZFJvb3Q6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXNoYXJlZFJvb3QgfHwgZHNoSG9tZSA9PT0gc2hhcmVkUm9vdCkgcmV0dXJuXG4gIHRyeSB7XG4gICAgY29uc3Qgc2hhcmVkUHJvZmlsZXMgPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJ3Byb2ZpbGVzJylcbiAgICBjb25zdCBwYXRjaEZpbGUgPSBwYXRoLmpvaW4oc2hhcmVkUHJvZmlsZXMsICd3ZWInLCAnY29yZGlzLnBhdGNoLnltbCcpXG4gICAgY29uc3Qgc2V0dGluZ3NQYXRoID0gcGF0aC5qb2luKHNoYXJlZFJvb3QsICdzZXR0aW5ncy55YW1sJylcbiAgICBjb25zdCBjcmVkZW50aWFsc1BhdGggPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJy5jcmVkZW50aWFscy55YW1sJylcblxuICAgIGNvbnN0IGJsb2NrU2V0dGluZ3MgPSBgLSBpZDogc2V0dGluZ3NcbiAgY29uZmlnOlxuICAgIHBhdGg6ICR7eWFtbFNjYWxhcihzZXR0aW5nc1BhdGgpfVxuYFxuICAgIGNvbnN0IGJsb2NrQ3JlZGVudGlhbHMgPSBgLSBpZDogY3JlZGVudGlhbHNcbiAgY29uZmlnOlxuICAgIHBhdGg6ICR7eWFtbFNjYWxhcihjcmVkZW50aWFsc1BhdGgpfVxuYFxuXG4gICAgbGV0IGNvbnRlbnQgPSAnJ1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGNoRmlsZSkpIHtcbiAgICAgIGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGF0Y2hGaWxlLCAndXRmOCcpXG4gICAgfVxuICAgIGNvbnN0IHN0cmlwID0gKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXHMrL2csICcnKVxuICAgIGNvbnN0IGhhc1NldHRpbmdzID0gc3RyaXAoY29udGVudCkuaW5jbHVkZXMoc3RyaXAoYmxvY2tTZXR0aW5ncykpXG4gICAgY29uc3QgaGFzQ3JlZGVudGlhbHMgPSBzdHJpcChjb250ZW50KS5pbmNsdWRlcyhzdHJpcChibG9ja0NyZWRlbnRpYWxzKSlcbiAgICBpZiAoaGFzU2V0dGluZ3MgJiYgaGFzQ3JlZGVudGlhbHMpIHJldHVyblxuXG4gICAgLy8gXHU1M0VBXHU1NzI4XHU1MTcxXHU0RUFCIHBhdGNoIFx1NEUzQVx1N0E3QVx1NjU3MFx1N0VDNCBgW11gXHVGRjA4XHU1MTQxXHU4QkI4XHU2Q0U4XHU5MUNBXHVGRjBDXHU2MjE2XHU2NTg3XHU0RUY2XHU0RTBEXHU1QjU4XHU1NzI4XHVGRjA5XHU2NUY2XHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXG4gICAgLy8gXHU2NzYxXHU3NkVFXHVGRjFCXHU4MkU1XHU3NTI4XHU2MjM3XHU1REYyXHU4MUVBXHU1QjlBXHU0RTQ5IHBhdGNoXHVGRjA4XHU1OTgyXHU4MUVBXHU4OEM1XHU2M0QyXHU0RUY2XHVGRjA5XHVGRjBDXHU0RTBEXHU1RjNBXHU4ODRDXHU2NTM5XHU1MTk5IFx1MjAxNFx1MjAxNCBcdTYzRDBcdTc5M0FcdTYyNEJcdTUyQThcdTUyQTBcdTMwMDJcbiAgICBjb25zdCB3aXRob3V0Q29tbWVudHMgPSBjb250ZW50XG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAuZmlsdGVyKChsKSA9PiAhbC50cmltKCkuc3RhcnRzV2l0aCgnIycpKVxuICAgICAgLmpvaW4oJ1xcbicpXG4gICAgICAudHJpbSgpXG4gICAgaWYgKHdpdGhvdXRDb21tZW50cyA9PT0gJycgfHwgd2l0aG91dENvbW1lbnRzID09PSAnW10nKSB7XG4gICAgICAgIGNvbnN0IGluc2VydGlvbiA9IGJsb2NrU2V0dGluZ3MgKyBibG9ja0NyZWRlbnRpYWxzXG4gICAgICAgIGNvbnRlbnQgPSBgIyBkc2gtZG9jayBcdTgxRUFcdTUyQThcdTdFRjRcdTYyQTRcdUZGMUFwZXItdmF1bHQgXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjA4XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjBDXHU0RjFBXHU4QkREXHU0RUNEXHU5Njk0XHU3OUJCXHVGRjA5XG4ke2luc2VydGlvbi50cmltRW5kKCl9XG5gXG4gICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUocGF0Y2hGaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRjaEZpbGUsIGNvbnRlbnQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJ1tkc2gtaG9zdF0gXHU1MTcxXHU0RUFCIGNvcmRpcy5wYXRjaC55bWwgXHU1REYyXHU2NzA5XHU4MUVBXHU1QjlBXHU0RTQ5XHU1MTg1XHU1QkI5XHVGRjBDXHU4REYzXHU4RkM3XHU4MUVBXHU1MkE4XHU1MTk5XHU1MTY1XHVGRjFCJyArXG4gICAgICAgICAgJ1x1NTk4Mlx1OTcwMFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwQ1x1OEJGN1x1NTcyOCB+Ly5kc2gvcHJvZmlsZXMvd2ViL2NvcmRpcy5wYXRjaC55bWwgXHU2MjRCXHU1MkE4XHU1MkEwXHU1MTY1IHNldHRpbmdzL2NyZWRlbnRpYWxzIFx1NzY4NCBwYXRoIFx1ODk4Nlx1NzZENicsXG4gICAgICAgIClcbiAgICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdbZHNoLWhvc3RdIFx1NTE5OVx1NTE2NVx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQiBwYXRjaCBcdTU5MzFcdThEMjVcdUZGMDhcdTVDMDZcdTYzMDkgcGVyLXZhdWx0IFx1NzJFQ1x1N0FDQlx1OTE0RFx1N0Y2RVx1NTQyRlx1NTJBOFx1RkYwOScsIGVycilcbiAgfVxufVxuXG4vKiogXHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IGRzaCB3ZWJcdTMwMDJcdThDMDNcdTc1MjhcdTY1QjlcdThEMUZcdThEMjNcdTc2RDFcdTU0MkMgcHJvYyBcdTc2ODQgZXhpdC9lcnJvclx1MzAwMiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxhdW5jaERzaChvcHRzOiBMYXVuY2hPcHRpb25zICYgeyBkc2hCaW46IHN0cmluZzsgbm9kZUJpbjogc3RyaW5nOyB1c2VFbGVjdHJvbkFzTm9kZTogYm9vbGVhbiB9KTogQ2hpbGRQcm9jZXNzIHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgLy8gLS1uby1vcGVuXHVGRjFBZHNoIENMSSBcdTlFRDhcdThCQTRcdTRGMUFcdTYyNTNcdTVGMDBcdTdDRkJcdTdFREZcdTlFRDhcdThCQTRcdTZENEZcdTg5QzhcdTU2NjhcdUZGMDhcdTk3NjJcdTY3N0ZcdTU3M0FcdTY2NkZcdTRFMEJcdTY2MkZcIlx1NTJBQlx1NjMwMVwiXHVGRjA5XHUzMDAyXG4gIC8vIFx1NjNEMlx1NEVGNlx1NEZBN1x1NzY4NFx1OTc2Mlx1Njc3Rlx1NUMzMVx1NjYyRiBVSVx1RkYxQlx1OTcwMFx1ODk4MVx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjVGNlx1OEQ3MFx1NjYzRVx1NUYwRlx1NzY4NFwiXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwXCJcbiAgLy8gXHU1MkE4XHU0RjVDXHVGRjA4c2hlbGwub3BlbkV4dGVybmFsXHVGRjA5XHUzMDAyXG4gIGNvbnN0IGFyZ3MgPSBbb3B0cy5kc2hCaW4sICd3ZWInLCAnLS1ob3N0JywgaG9zdCwgJy0tcG9ydCcsIFN0cmluZyhwb3J0KSwgJy0tbm8tb3BlbiddXG4gIC8vIG9wdHMuZW52IFx1NjYyRlx1MzAwQ1x1OTY0NFx1NTJBMFx1MzAwRFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRlx1RkYwQ1x1NTNFRlx1ODBGRFx1NEUzQVx1N0E3QVx1NUJGOVx1OEM2MSB7fVx1RkYwOG1haW4udHMgXHU1NzI4IHNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXG4gIC8vIFx1NEYyMFx1NTE2NSB7fVx1RkYwOVx1MjAxNFx1MjAxNFx1N0VERFx1NEUwRFx1ODBGRFx1NjU3NFx1NEY1M1x1NjZGRlx1NjM2MiBwcm9jZXNzLmVudlx1RkYwQ1x1NTQyNlx1NTIxOVx1NUI1MFx1OEZEQlx1N0EwQlx1NEUyMlx1NTkzMSBQQVRIL0hPTUUgXHU3QjQ5XHU1MTY4XHU5MEU4XG4gIC8vIFx1NzNBRlx1NTg4M1x1RkYxQWRzaCB3ZWIgXHU1MTg1XHU5MEU4IHNwYXduIFx1NzY4NFx1NkQ0Rlx1ODlDOFx1NTY2OCBvcGVuZXIgLyBnaXQgLyBwbnBtIFx1N0I0OVx1NEYxQSBFTk9FTlRcdUZGMENcbiAgLy8gSE9NRSBcdTc2RjhcdTUxNzNcdTc2ODRcdTUxRURcdTYzNkVcdTRFMEUga2V5cmluZyBcdTg5RTNcdTY3OTBcdTRFNUZcdTRGMUFcdThENzBcdTY4MzdcdTMwMDJcdTVGQzVcdTk4N0JcdTUzRTBcdTUyQTBcdTU3MjggcHJvY2Vzcy5lbnYgXHU0RTRCXHU0RTBBXHUzMDAyXG4gIGNvbnN0IGVudjogTm9kZUpTLlByb2Nlc3NFbnYgPSB7XG4gICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgLi4ub3B0cy5lbnYsXG4gICAgRFNIX0hPTUU6IG9wdHMuZHNoSG9tZSxcbiAgfVxuICBpZiAob3B0cy51c2VFbGVjdHJvbkFzTm9kZSkgZW52LkVMRUNUUk9OX1JVTl9BU19OT0RFID0gJzEnXG4gIGNvbnN0IHByb2MgPSBzcGF3bihvcHRzLm5vZGVCaW4sIGFyZ3MsIHtcbiAgICBlbnYsXG4gICAgY3dkOiBvcHRzLmN3ZCxcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdwaXBlJ10sXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG4gIC8vIHN0ZG91dCBcdTdCQTFcdTkwNTNcdTZDQTFcdTY3MDlcdTZEODhcdThEMzlcdTgwMDVcdTRGMUFcdTYyOEFcdTY1RTVcdTVGRDdcdTc5RUZcdTU3MjhcdTUxODVcdTVCNThcdTdGMTNcdTUxQjJcdTkxQ0NcdUZGMUJcdTY1RTVcdTVGRDdcdThENzAgc3RkZXJyXHVGRjA4bWFpbi50c1xuICAvLyBob29rQ2hpbGRMb2dzIFx1NURGMlx1NjNBNVx1RkYwOVx1RkYwQ3N0ZG91dCBcdTc2RjRcdTYzQTVcdTY1M0VcdTdBN0FcdTMwMDJcbiAgcHJvYy5zdGRvdXQ/LnJlc3VtZSgpXG4gIHJldHVybiBwcm9jXG59XG5cbi8qKlxuICogXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHU2NUY2XHU1MUIzXHU1QjlBXCJcdTYzMDJcdTYzQTUgb3IgXHU2MkE1XHU5NTE5XCJcdUZGMUFcbiAqIC0gXHU2NzJBXHU2Q0U4XHU1MTY1IHZlcmlmeUJyYW5kXHVGRjFBXHU3NkY0XHU2M0E1XHU2MzAyXHU2M0E1XHVGRjA4XHU2NUU3XHU4ODRDXHU0RTNBXHVGRjA5XHVGRjFCXG4gKiAtIFx1NkNFOFx1NTE2NVx1NEUxNFx1NjgyMVx1OUE4Q1x1OTAxQVx1OEZDN1x1RkYxQVx1NjMwMlx1NjNBNVx1RkYxQlxuICogLSBcdTZDRThcdTUxNjVcdTRGNDZcdTY4MjFcdTlBOENcdTU5MzFcdThEMjUvXHU1RjAyXHU1RTM4XHVGRjFBXHU2MzA5XHUzMDBDXHU3QUVGXHU1M0UzXHU4OEFCXHU5NzVFIERTSCBcdTY3MERcdTUyQTFcdTUzNjBcdTc1MjhcdTMwMERcdThGRDRcdTU2REUgZXJyb3JcdTMwMDJcbiAqL1xuYXN5bmMgZnVuY3Rpb24gYXR0YWNoU3RhdHVzKFxuICBvcHRzOiBMYXVuY2hPcHRpb25zLFxuICBob3N0OiBzdHJpbmcsXG4gIHBvcnQ6IG51bWJlcixcbiAgdXJsOiBzdHJpbmcsXG4pOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xuICBpZiAoIW9wdHMudmVyaWZ5QnJhbmQpIHtcbiAgICByZXR1cm4geyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfVxuICB9XG4gIGxldCBpc0JyYW5kID0gZmFsc2VcbiAgdHJ5IHtcbiAgICBpc0JyYW5kID0gYXdhaXQgb3B0cy52ZXJpZnlCcmFuZCh1cmwpXG4gIH0gY2F0Y2gge1xuICAgIGlzQnJhbmQgPSBmYWxzZVxuICB9XG4gIGlmIChpc0JyYW5kKSB7XG4gICAgcmV0dXJuIHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiB0cnVlIH1cbiAgfVxuICByZXR1cm4ge1xuICAgIGtpbmQ6ICdlcnJvcicsXG4gICAgbWVzc2FnZTogYFx1N0FFRlx1NTNFMyAke3BvcnR9IFx1NURGMlx1ODhBQlx1OTc1RSBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHVGRjA4XHU1NEMxXHU3MjRDXHU3Mjc5XHU1RjgxXHU2ODIxXHU5QThDXHU2NzJBXHU5MDFBXHU4RkM3XHVGRjA5XHUzMDAyXHU4QkY3XHU2MzYyXHU0RTAwXHU0RTJBXHU3QUVGXHU1M0UzXHVGRjBDXHU2MjE2XHU1MTQ4XHU1MDVDXHU2Mzg5XHU1MzYwXHU3NTI4XHU4QkU1XHU3QUVGXHU1M0UzXHU3Njg0XHU2NzBEXHU1MkExYCxcbiAgfVxufVxuXG4vKipcbiAqIFx1NEUwMFx1OTUyRVwiXHU3ODZFXHU0RkREXHU4RkQwXHU4ODRDXCJcdUZGMUFcbiAqIDEuIFx1N0FFRlx1NTNFM1x1NURGMlx1NjcwOVx1NjcwRFx1NTJBMSBcdTIxOTIgXHU1NEMxXHU3MjRDXHU2ODIxXHU5QThDXHVGRjA4XHU1M0VGXHU5MDA5XHVGRjA5XHUyMTkyIFx1OTAxQVx1OEZDN1x1NTIxOVx1NjMwMlx1NjNBNVx1RkYwOGF0dGFjaGVkXHVGRjBDXHU0RTBEXHU2NUIwXHU4RDc3XHU4RkRCXHU3QTBCXHVGRjA5XHVGRjBDXG4gKiAgICBcdTU0MjZcdTUyMTlcdTYzMDlcdTMwMENcdTdBRUZcdTUzRTNcdTg4QUJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVx1NTM2MFx1NzUyOFx1MzAwRFx1NjJBNVx1OTUxOVx1RkYwQ1x1N0VERFx1NEUwRFx1OEJFRlx1NjMwMlx1RkYxQlxuICogMi4gXHU1NDI2XHU1MjE5XHU1QjlBXHU0RjREIGRzaCBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHUyMTkyIHNwYXduIFx1MjE5MiBcdTdCNDlcdTVGODVcdTVDMzFcdTdFRUFcdUZGMUJcbiAqIDMuIFx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1RkYwOFx1NTk4Mlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MCBFQUREUklOVVNFXHVGRjA5XHUyMTkyIFx1N0FDQlx1NTM3M1x1OEZENFx1NTZERVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlx1RkYwQ1x1NEUwRFx1NTE4RFx1NzZGMlx1N0I0OVx1MzAwMlxuICogXHU4RkQ0XHU1NkRFIFNlcnZlclN0YXR1c1x1MzAwMlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRHNoUnVubmluZyhvcHRzOiBMYXVuY2hPcHRpb25zKTogUHJvbWlzZTx7IHN0YXR1czogU2VydmVyU3RhdHVzOyBwcm9jPzogQ2hpbGRQcm9jZXNzIH0+IHtcbiAgY29uc3QgcG9ydCA9IG9wdHMucG9ydCA/PyAzMDgwXG4gIGNvbnN0IGhvc3QgPSBvcHRzLmhvc3QgPz8gJzEyNy4wLjAuMSdcbiAgY29uc3QgdXJsID0gYGh0dHA6Ly8ke2hvc3R9OiR7cG9ydH0vYFxuXG4gIGlmIChhd2FpdCBpc1BvcnRVcChob3N0LCBwb3J0KSkge1xuICAgIHJldHVybiB7IHN0YXR1czogYXdhaXQgYXR0YWNoU3RhdHVzKG9wdHMsIGhvc3QsIHBvcnQsIHVybCkgfVxuICB9XG5cbiAgY29uc3QgZm91bmQgPSByZXNvbHZlRHNoQmluKG9wdHMuZHNoQmluKVxuICBpZiAoIWZvdW5kLmJpbikge1xuICAgIHJldHVybiB7IHN0YXR1czogeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBmb3VuZC5ub3Rlc1tmb3VuZC5ub3Rlcy5sZW5ndGggLSAxXSA/PyAnXHU2NUUwXHU2Q0Q1XHU1QjlBXHU0RjREIGRzaCBDTEknIH0gfVxuICB9XG4gIGNvbnN0IG5vZGUgPSByZXNvbHZlTm9kZUJpbihvcHRzLm5vZGVCaW4sIGVtYmVkZGVkTm9kZVZlcnNpb24oKSwgb3B0cy51c2VFbWJlZGRlZE5vZGUpXG4gIGlmICghbm9kZS5ub2RlQmluKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IG5vZGUubm90ZXNbbm9kZS5ub3Rlcy5sZW5ndGggLSAxXSA/PyAnXHU2NUUwXHU2Q0Q1XHU1QjlBXHU0RjREIE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2JyB9IH1cbiAgfVxuICAvLyBwZXItdmF1bHQgXHU1MTcxXHU0RUFCXHVGRjFBcHJvZmlsZXNcdUZGMDhcdThGRDBcdTg4NENcdTY1RjZcdTYzRDJcdTRFRjZcdUZGMDlcdThGNkZcdTk0RkVcdTUyMzBcdTUxNzFcdTRFQUJcdTY4MzlcdUZGMENzZXR0aW5ncy9jcmVkZW50aWFsc1xuICAvLyBcdTYzMDdcdTU2REVcdTUxNzFcdTRFQUJcdTY4MzkgXHUyMDE0XHUyMDE0IFx1OTE0RFx1N0Y2RVx1NEUwRVx1NjNEMlx1NEVGNlx1NTE2OFx1NUM0MFx1NEUwMFx1NEVGRFx1RkYwQ1x1NEVDNVx1NEYxQVx1OEJERFx1OTY5NFx1NzlCQlx1MzAwMlxuICBpZiAob3B0cy5zaGFyZWRDb25maWdSb290KSB7XG4gICAgZW5zdXJlU2hhcmVkUHJvZmlsZXMob3B0cy5kc2hIb21lLCBvcHRzLnNoYXJlZENvbmZpZ1Jvb3QpXG4gICAgZW5zdXJlU2hhcmVkQ29uZmlnUGF0Y2gob3B0cy5kc2hIb21lLCBvcHRzLnNoYXJlZENvbmZpZ1Jvb3QpXG4gIH1cbiAgY29uc3QgcHJvYyA9IGxhdW5jaERzaCh7IC4uLm9wdHMsIGRzaEJpbjogZm91bmQuYmluLCBub2RlQmluOiBub2RlLm5vZGVCaW4sIHVzZUVsZWN0cm9uQXNOb2RlOiBub2RlLnVzZUVsZWN0cm9uQXNOb2RlIH0pXG5cbiAgLy8gXHU2NTM2XHU5NkM2IHN0ZGVyciBcdTVDM0VcdTkwRThcdUZGMUFcdTVCNTBcdThGREJcdTdBMEJcdTc5RDJcdTkwMDBcdTY1RjZcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTUzOUZcdTU2RTBcdUZGMDhcdTU5ODIgRUFERFJJTlVTRVx1RkYwOVxuICBsZXQgc3RkZXJyVGFpbCA9ICcnXG4gIHByb2Muc3RkZXJyPy5vbignZGF0YScsIChkOiBCdWZmZXIpID0+IHtcbiAgICBzdGRlcnJUYWlsID0gKHN0ZGVyclRhaWwgKyBkLnRvU3RyaW5nKCkpLnNsaWNlKC00MDAwKVxuICB9KVxuXG4gIC8vIHNwYXduIFx1NUM0Mlx1OTc2Mlx1NzY4NFx1OTUxOVx1OEJFRlx1RkYwOEVOT0VOVCAvIEVBQ0NFUyAvIFx1Njc0M1x1OTY1MFx1N0I0OVx1RkYwOVx1NEUwRFx1NEVBN1x1NzUxRiBzdGRlcnIgXHU4RjkzXHU1MUZBXHVGRjBDXHU1M0VBXHU1NzI4XG4gIC8vICdlcnJvcicgXHU0RThCXHU0RUY2XHU5MUNDXHU1RTI2XHU1MUZBXHU2NzY1XHUyMDE0XHUyMDE0XHU2NTM2XHU5NkM2XHU4RDc3XHU2NzY1XHVGRjBDXHU5MDdGXHU1MTREXHU3NTI4XHU2MjM3XHU1M0VBXHU3NzBCXHU1MjMwXHU2Q0RCXHU1MzE2XHU3Njg0XHUzMDBDXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBXHUzMDBEXHUzMDAyXG4gIGxldCBzcGF3bkVycm9yOiBFcnJvciB8IHVuZGVmaW5lZFxuICBjb25zdCBjaGlsZERpZWQgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHJlc29sdmUodHJ1ZSkpXG4gICAgcHJvYy5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIHNwYXduRXJyb3IgPSBlcnJcbiAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICB9KVxuICB9KVxuXG4gIGNvbnN0IHJlYWR5ID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICB3YWl0Rm9yUmVhZHkoaG9zdCwgcG9ydCwgb3B0cy50aW1lb3V0TXMgPz8gMTIwXzAwMCkudGhlbigoKSA9PiB0cnVlKSxcbiAgICBjaGlsZERpZWQudGhlbigoKSA9PiBmYWxzZSksXG4gIF0pXG5cbiAgaWYgKHJlYWR5KSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogZmFsc2UgfSwgcHJvYyB9XG4gIH1cblxuICAvLyBcdTVCNTBcdThGREJcdTdBMEJcdTVERjJcdTkwMDBcdTUxRkFcdUZGMUFcdTUxOERcdTYzQTJcdTRFMDBcdTZCMjFcdTdBRUZcdTUzRTNcdUZGMDhcdTUzRUZcdTgwRkRcdTg4QUJcdTUyMkJcdTc2ODRcdTVCOUVcdTRGOEJcdTYyQTJcdThERDFcdTdFRDFcdTVCOUFcdUZGMDlcdUZGMENcdTU0MjZcdTUyMTlcdTdFRDlcdTUxRkFcdTc3MUZcdTVCOUVcdTk1MTlcdThCRUZcbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBhd2FpdCBhdHRhY2hTdGF0dXMob3B0cywgaG9zdCwgcG9ydCwgdXJsKSwgcHJvYyB9XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IHN1bW1hcml6ZUNoaWxkRXJyb3Ioc3RkZXJyVGFpbCwgc3Bhd25FcnJvcikgfSwgcHJvYyB9XG59XG5cbi8qKiBcdTRFQ0Ugc3RkZXJyIFx1NUMzRVx1OTBFOCAvIHNwYXduIGVycm9yIFx1NjNEMFx1NzBCQ1x1NTNFRlx1OEJGQlx1OTUxOVx1OEJFRiAqL1xuZnVuY3Rpb24gc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsOiBzdHJpbmcsIHNwYXduRXJyb3I/OiBFcnJvcik6IHN0cmluZyB7XG4gIGlmIChzcGF3bkVycm9yKSB7XG4gICAgY29uc3QgY29kZSA9IChzcGF3bkVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZVxuICAgIGlmIChjb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuICdcdTY1RTBcdTZDRDVcdTU0MkZcdTUyQTggZHNoIFx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOEVOT0VOVFx1RkYwOVx1RkYxQU5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU0RTBEXHU1QjU4XHU1NzI4XHU2MjE2XHU0RTBEXHU1M0VGXHU2MjY3XHU4ODRDXHUzMDAyXHU4QkY3XHU1NzI4XHU4QkJFXHU3RjZFXHU5MUNDXHU2OEMwXHU2N0U1IE5vZGUgXHU4REVGXHU1Rjg0XHVGRjBDXHU2MjE2XHU5MUNEXHU2NUIwXHU1Qjg5XHU4OEM1IE5vZGUnXG4gICAgfVxuICAgIGlmIChjb2RlID09PSAnRUFDQ0VTJykge1xuICAgICAgcmV0dXJuICdcdTY1RTBcdTZDRDVcdTU0MkZcdTUyQTggZHNoIFx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOEVBQ0NFU1x1RkYwOVx1RkYxQU5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHU2Q0ExXHU2NzA5XHU2MjY3XHU4ODRDXHU2NzQzXHU5NjUwXHVGRjBDXHU4QkY3XHU2OEMwXHU2N0U1XHU2NTg3XHU0RUY2XHU2NzQzXHU5NjUwJ1xuICAgIH1cbiAgICByZXR1cm4gYFx1NjVFMFx1NkNENVx1NTQyRlx1NTJBOCBkc2ggXHU1QjUwXHU4RkRCXHU3QTBCOiAke3NwYXduRXJyb3IubWVzc2FnZX1gXG4gIH1cbiAgY29uc3QgbGluZXMgPSBzdGRlcnJUYWlsLnNwbGl0KC9cXHI/XFxuLykuZmlsdGVyKEJvb2xlYW4pXG4gIGNvbnN0IGFkZHJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRUFERFJJTlVTRScpKVxuICBjb25zdCBlcnJMaW5lID0gbGluZXMuZmluZCgobCkgPT4gbC5pbmNsdWRlcygnRXJyb3I6JykpXG4gIGlmIChhZGRyTGluZSkge1xuICAgIHJldHVybiAnXHU3QUVGXHU1M0UzXHU1REYyXHU4OEFCXHU1MzYwXHU3NTI4XHVGRjA4RUFERFJJTlVTRVx1RkYwOVx1MzAwMlx1OEJGN1x1NjM2Mlx1NEUwMFx1NEUyQVx1N0FFRlx1NTNFM1x1RkYwQ1x1NjIxNlx1NTE0OFx1NTA1Q1x1NjM4OVx1NTM2MFx1NzUyOFx1OEJFNVx1N0FFRlx1NTNFM1x1NzY4NFx1NjcwRFx1NTJBMVx1NTQwRVx1OTFDRFx1OEJENSdcbiAgfVxuICBpZiAoZXJyTGluZSkge1xuICAgIGNvbnN0IGNsZWFuZWQgPSBlcnJMaW5lLnRyaW0oKS5zbGljZSgwLCAzMDApXG4gICAgcmV0dXJuIGBkc2ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1OiAke2NsZWFuZWR9YFxuICB9XG4gIHJldHVybiAnRFNIIFx1OEZEQlx1N0EwQlx1OTAwMFx1NTFGQVx1RkYwOFx1NjVFMFx1OEJFNlx1N0VDNlx1OTUxOVx1OEJFRlx1RkYwOVx1MzAwMlx1OEJGN1x1NjdFNVx1NzcwQiBPYnNpZGlhbiBcdTYzQTdcdTUyMzZcdTUzRjAgW2RzaF0gXHU2NUU1XHU1RkQ3J1xufVxuXG4vKiogXHU1MDVDXHU2QjYyXHU1QjUwXHU4RkRCXHU3QTBCXHVGRjA4U0lHVEVSTVx1RkYwQ1x1N0I0OVx1NUY4NVx1OTAwMFx1NTFGQVx1RkYxQlx1OEQ4NVx1NjVGNlx1NTQwRSBTSUdLSUxMXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcFByb2Nlc3MocHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCB8IHVuZGVmaW5lZCwgdGltZW91dE1zID0gNTAwMCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXByb2MgfHwgcHJvYy5leGl0Q29kZSAhPT0gbnVsbCB8fCBwcm9jLnNpZ25hbENvZGUgIT09IG51bGwpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCB0aW1lciA9IGdsb2JhbFRoaXMuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBwcm9jLmtpbGwoJ1NJR0tJTEwnKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGlnbm9yZSAqL1xuICAgICAgfVxuICAgIH0sIHRpbWVvdXRNcylcbiAgICBwcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiB7XG4gICAgICBnbG9iYWxUaGlzLmNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH0pXG4gICAgdHJ5IHtcbiAgICAgIHByb2Mua2lsbCgnU0lHVEVSTScpXG4gICAgfSBjYXRjaCB7XG4gICAgICBnbG9iYWxUaGlzLmNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgIHJlc29sdmUoKVxuICAgIH1cbiAgfSlcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTVCNjRcdTUxM0ZcdThGREJcdTdBMEJcdTZFMDVcdTYyNkJcdUZGMDhQSUQgXHU2NTg3XHU0RUY2ICsgXHU1NDdEXHU0RUU0XHU4ODRDXHU4RUFCXHU0RUZEXHU2ODIxXHU5QThDICsgUFBJRCBcdTUyMjRcdTVCOUFcdUZGMDlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy9cbi8vIFx1ODBDQ1x1NjY2Rlx1RkYxQU9ic2lkaWFuIFx1NUQyOVx1NkU4My9cdTVGM0FcdTkwMDBcdTY1RjYgb251bmxvYWQgXHU0RTBEXHU0RjFBXHU2MjY3XHU4ODRDXHVGRjBDXHU2M0QyXHU0RUY2IHNwYXduIFx1NzY4NCBgZHNoIHdlYmBcbi8vIFx1NUI1MFx1OEZEQlx1N0EwQlx1NEYxQVx1NTNEOFx1NjIxMFx1NUI2NFx1NTEzRlx1RkYwOG1hY09TL0xpbnV4IFx1NEUwQlx1ODhBQiByZXBhcmVudCBcdTUyMzAgbGF1bmNoZFx1RkYwQ3BwaWQ9MVx1RkYwOVx1RkYwQ1x1NEUxNFx1NjVFN1x1NzI0OFxuLy8gXHU2M0QyXHU0RUY2XCJcdTdBRUZcdTUzRTNcdTY3MDlcdTY3MERcdTUyQTFcdTVDMzFcdTYzMDJcdTYzQTVcIlx1NEYxQVx1NjI4QVx1NUI2NFx1NTEzRlx1NkMzOFx1NEU0NVx1NEZERFx1NzU1OVx1MzAwMlx1NjcyQ1x1NkEyMVx1NTc1N1x1NTcyOFx1NkJDRlx1NkIyMVx1NTQyRlx1NTJBOFx1NTI0RFx1NkUwNVx1NjI2Qlx1NjcyQ1x1NUU5M1x1N0FFRlx1NTNFM1xuLy8gXHU0RTBBXHU3Njg0XHU1QjY0XHU1MTNGXHVGRjFBXHU1MTQ4IFNJR1RFUk1cdTMwMDFcdThEODVcdTY1RjYgU0lHS0lMTFx1RkYwQ1x1NTE4RFx1NzUzMVx1OEMwM1x1NzUyOFx1NjVCOVx1OTFDRFx1NjVCMCBzcGF3blx1MzAwMlxuLy9cbi8vIFx1NUI4OVx1NTE2OFx1OEJCRVx1OEJBMVx1RkYwOFx1NTkxQVx1NUU5My9cdTU5MUFcdTdBOTdcdTUzRTNcdTVFNzZcdTUzRDFcdTVCODlcdTUxNjhcdUZGMDlcdUZGMUFcbi8vIC0gXHU1M0VBXHU1MkE4XCJcdTY3MkNcdTVFOTNcdTZEM0VcdTc1MUZcdTdBRUZcdTUzRTNcIlx1NEUwQVx1NzY4NFx1NjcwRFx1NTJBMVx1RkYwQ1x1N0VERFx1NEUwRFx1NzhCMFx1NTE3Nlx1NEVENlx1NUU5M1x1NzY4NFx1N0FFRlx1NTNFM1x1RkYxQlxuLy8gLSBcdTUzRUFcdTY3NDBcIlx1Nzg2RVx1NUI5RVx1NjYyRiBkc2ggd2ViIFx1NEUxNFx1NzZEMVx1NTQyQ1x1NjcyQ1x1N0FFRlx1NTNFM1wiXHU3Njg0XHU4RkRCXHU3QTBCXHVGRjA4XHU1NDdEXHU0RUU0XHU4ODRDXHU4RUFCXHU0RUZEXHU2ODIxXHU5QThDXHVGRjBDXHU5NjMyIHBpZCBcdTU5MERcdTc1MjhcdThCRUZcdTY3NDBcdUZGMDlcdUZGMUJcbi8vIC0gXHU1M0VBXHU2NzQwXHU1QjY0XHU1MTNGXHVGRjA4UE9TSVg6IHBwaWQ9PTFcdUZGMUJXaW5kb3dzOiBcdTU0MkZcdTUyQThcdTY1RjZcdTk1RjRcdTY1RTlcdTRFOEVcdTY3MkNcdTZCMjFcdTRGMUFcdThCRERcdUZGMDlcdUZGMENcbi8vICAgXHU1RjUzXHU1MjREXHU0RjFBXHU4QkREXHU5MUNDXHU1MTc2XHU0RUQ2XHU3QTk3XHU1M0UzXHU2MkM5XHU4RDc3XHU3Njg0XHU2RDNCXHU2NzBEXHU1MkExXHU3RUREXHU0RTBEXHU0RjFBXHU4OEFCXHU4QkVGXHU2NzQwXHUzMDAyXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHNoUGlkUmVjb3JkIHtcbiAgcGlkOiBudW1iZXJcbiAgcG9ydDogbnVtYmVyXG4gIHRzOiBudW1iZXJcbn1cblxuLyoqIFBJRCBcdTY1ODdcdTRFRjZcdThERUZcdTVGODRcdUZGMUFcdTY1M0VcdTU3MjggcGVyLXZhdWx0IFx1NzY4NCBEU0hfSE9NRSBcdTkxQ0NcdUZGMENcdTk2OEZcdTVFOTNcdTk2OTRcdTc5QkJcdTMwMDFcdTk2OEZcdTRGMUFcdThCRERcdTVGNTJcdTVDNUUgKi9cbmV4cG9ydCBmdW5jdGlvbiBkc2hQaWRGaWxlUGF0aChkc2hIb21lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKGRzaEhvbWUsICcuZHNoLWRvY2sucGlkJylcbn1cblxuLyoqIFx1OEJCMFx1NUY1NVx1NjcyQ1x1NkIyMSBzcGF3biBcdTc2ODRcdTVCNTBcdThGREJcdTdBMEJcdUZGMDhcdTY3MERcdTUyQTFcdTVDMzFcdTdFRUFcdTU0MEVcdThDMDNcdTc1MjhcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZURzaFBpZEZpbGUoZHNoSG9tZTogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHBpZDogbnVtYmVyKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgZnMubWtkaXJTeW5jKGRzaEhvbWUsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgZnMud3JpdGVGaWxlU3luYyhkc2hQaWRGaWxlUGF0aChkc2hIb21lKSwgSlNPTi5zdHJpbmdpZnkoeyBwaWQsIHBvcnQsIHRzOiBEYXRlLm5vdygpIH0pKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gXHU1MTk5XHU1MTY1IFBJRCBcdTY1ODdcdTRFRjZcdTU5MzFcdThEMjUnLCBlcnIpXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWREc2hQaWRGaWxlKGRzaEhvbWU6IHN0cmluZyk6IERzaFBpZFJlY29yZCB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IGZzLnJlYWRGaWxlU3luYyhkc2hQaWRGaWxlUGF0aChkc2hIb21lKSwgJ3V0ZjgnKVxuICAgIGNvbnN0IHJlYyA9IEpTT04ucGFyc2UocmF3KSBhcyBQYXJ0aWFsPERzaFBpZFJlY29yZD5cbiAgICBpZiAodHlwZW9mIHJlYy5waWQgPT09ICdudW1iZXInICYmIHR5cGVvZiByZWMucG9ydCA9PT0gJ251bWJlcicpIHJldHVybiByZWMgYXMgRHNoUGlkUmVjb3JkXG4gIH0gY2F0Y2gge1xuICAgIC8qIFx1NjVFMFx1NjU4N1x1NEVGNlx1NjIxNlx1NjM1Rlx1NTc0RiBcdTIxOTIgbnVsbCAqL1xuICB9XG4gIHJldHVybiBudWxsXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVEc2hQaWRGaWxlKGRzaEhvbWU6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGZzLnVubGlua1N5bmMoZHNoUGlkRmlsZVBhdGgoZHNoSG9tZSkpXG4gIH0gY2F0Y2gge1xuICAgIC8qIGlnbm9yZSAqL1xuICB9XG59XG5cbi8qKiBcdThGREJcdTdBMEJcdTY2MkZcdTU0MjZcdTVCNThcdTZEM0JcdUZGMDhzaWduYWwgMCBcdTYzQTJcdTZENEJcdUZGMENcdThERThcdTVFNzNcdTUzRjBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Byb2Nlc3NBbGl2ZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIHByb2Nlc3Mua2lsbChwaWQsIDApXG4gICAgcmV0dXJuIHRydWVcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuLyoqIFx1OEJFNSBwaWQgXHU3Njg0XHU4RkRCXHU3QTBCXHU1NDdEXHU0RUU0XHU4ODRDXHU2NjJGXHU1NDI2XHU1QzMxXHU2NjJGXHU3NkQxXHU1NDJDIDxwb3J0PiBcdTc2ODQgZHNoIHdlYlx1RkYwOFx1OTYzMiBwaWQgXHU1OTBEXHU3NTI4XHU4QkVGXHU2NzQwXHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gaXNEc2hXZWJPblBvcnQocGlkOiBudW1iZXIsIHBvcnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgICAvLyB3bWljIFx1NTcyOCBXaW4xMCAyMUgxKyBcdTVGMDNcdTc1MjhcdTMwMDFXaW4xMSAyNEgyIFx1NzlGQlx1OTY2NFx1RkYxQlx1NjM2MiBQb3dlclNoZWxsIENJTSBcdTY3RTVcdThCRTJcdTMwMDJcbiAgICAgIGNvbnN0IG91dCA9IHNwYXduU3luYyhcbiAgICAgICAgJ3Bvd2Vyc2hlbGwnLFxuICAgICAgICBbJy1Ob1Byb2ZpbGUnLCAnLU5vbkludGVyYWN0aXZlJywgJy1Db21tYW5kJywgYChHZXQtQ2ltSW5zdGFuY2UgV2luMzJfUHJvY2VzcyAtRmlsdGVyIFwiUHJvY2Vzc0lkPSR7cGlkfVwiKS5Db21tYW5kTGluZWBdLFxuICAgICAgICB7IGVuY29kaW5nOiAndXRmOCcsIHRpbWVvdXQ6IDUwMDAsIHdpbmRvd3NIaWRlOiB0cnVlIH0sXG4gICAgICApXG4gICAgICBjb25zdCBjbWQgPSBvdXQuc3Rkb3V0IHx8ICcnXG4gICAgICByZXR1cm4gY21kLmluY2x1ZGVzKCdkc2gnKSAmJiBjbWQuaW5jbHVkZXMoYC0tcG9ydCAke3BvcnR9YClcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKCdwcycsIFsnLXd3JywgJy1vJywgJ2NvbW1hbmQ9JywgJy1wJywgU3RyaW5nKHBpZCldLCB7XG4gICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICB9KVxuICAgIGNvbnN0IGNtZCA9IChvdXQuc3Rkb3V0IHx8ICcnKS50cmltKClcbiAgICByZXR1cm4gY21kLmluY2x1ZGVzKCdkc2gnKSAmJiBjbWQuaW5jbHVkZXMoYC0tcG9ydCAke3BvcnR9YClcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuLyoqIFBPU0lYOiBcdThCRkJcdTUzRDZcdThGREJcdTdBMEJcdTcyMzYgcGlkXHVGRjFCXHU1OTMxXHU4RDI1XHU4RkQ0XHU1NkRFIC0xICovXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc1BwaWQocGlkOiBudW1iZXIpOiBudW1iZXIge1xuICB0cnkge1xuICAgIGNvbnN0IG91dCA9IHNwYXduU3luYygncHMnLCBbJy1vJywgJ3BwaWQ9JywgJy1wJywgU3RyaW5nKHBpZCldLCB7IGVuY29kaW5nOiAndXRmOCcsIHRpbWVvdXQ6IDUwMDAgfSlcbiAgICBjb25zdCBwcGlkID0gcGFyc2VJbnQoKG91dC5zdGRvdXQgfHwgJycpLnRyaW0oKSwgMTApXG4gICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwcGlkKSA/IHBwaWQgOiAtMVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gLTFcbiAgfVxufVxuXG4vKipcbiAqIFx1NUI2NFx1NTEzRlx1NTIyNFx1NUI5QVx1RkYxQVxuICogLSBQT1NJWFx1RkYxQVx1NUI2NFx1NTEzRlx1ODhBQiByZXBhcmVudCBcdTUyMzAgbGF1bmNoZFx1RkYwQ3BwaWQgPT09IDFcdUZGMDhcdThERThcdTRGMUFcdThCRERcdTUyMjRcdTVCOUFcdTY3MDBcdTUzRUZcdTk3NjBcdUZGMDlcdUZGMUJcbiAqIC0gV2luZG93c1x1RkYxQVx1NjVFMCByZXBhcmVudCBcdThCRURcdTRFNDlcdUZGMENcdTkwMDBcdTU2REVcIlx1OEZEQlx1N0EwQlx1NTQyRlx1NTJBOFx1NjVFOVx1NEU4RVx1NjcyQ1x1NkIyMSBPYnNpZGlhbiBcdTRGMUFcdThCRERcIlx1RkYwOFBJRCBcdTY1ODdcdTRFRjYgdHNcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT3JwaGFuUGlkKHBpZDogbnVtYmVyLCBwaWRGaWxlVHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHJldHVybiBwaWRGaWxlVHMgPCBEYXRlLm5vdygpIC0gcHJvY2Vzcy51cHRpbWUoKSAqIDEwMDBcbiAgfVxuICByZXR1cm4gcHJvY2Vzc1BwaWQocGlkKSA9PT0gMVxufVxuXG4vKiogXHU2MzA5IHBpZCBcdTUwNUNcdTZCNjJcdUZGMUFTSUdURVJNIFx1MjE5MiBcdThEODVcdTY1RjYgU0lHS0lMTFx1RkYwOFBPU0lYXHVGRjA5XHVGRjFCV2luZG93cyBcdTc1MjggdGFza2tpbGwgL0YgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdG9wUHJvY2Vzc0J5UGlkKHBpZDogbnVtYmVyLCB0aW1lb3V0TXMgPSAzMDAwKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghaXNQcm9jZXNzQWxpdmUocGlkKSkgcmV0dXJuXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgdHJ5IHtcbiAgICAgIHNwYXduU3luYygndGFza2tpbGwnLCBbJy9QSUQnLCBTdHJpbmcocGlkKSwgJy9UJywgJy9GJ10sIHsgd2luZG93c0hpZGU6IHRydWUgfSlcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgICByZXR1cm5cbiAgfVxuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBwcm9jZXNzLmtpbGwocGlkLCAnU0lHS0lMTCcpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfSwgdGltZW91dE1zKVxuICAgIGNvbnN0IHBvbGwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAoIWlzUHJvY2Vzc0FsaXZlKHBpZCkpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChwb2xsKVxuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgIHJlc29sdmUoKVxuICAgICAgfVxuICAgIH0sIDEwMClcbiAgICB0cnkge1xuICAgICAgcHJvY2Vzcy5raWxsKHBpZCwgJ1NJR1RFUk0nKVxuICAgIH0gY2F0Y2gge1xuICAgICAgY2xlYXJJbnRlcnZhbChwb2xsKVxuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuICB9KVxufVxuXG4vKipcbiAqIFx1NTQyRlx1NTJBOFx1NTI0RFx1NUI2NFx1NTEzRlx1NkUwNVx1NjI2Qlx1MzAwMlx1OEZENFx1NTZERVx1NjYyRlx1NTQyNlx1NkUwNVx1NzQwNlx1NEU4Nlx1NkI4Qlx1NzU1OVx1NjcwRFx1NTJBMVx1MzAwMlxuICpcbiAqIDEuIFBJRCBcdTY1ODdcdTRFRjZcdTU0N0RcdTRFMkQgXHUyMTkyIFx1NjgyMVx1OUE4Q1x1NTQ3RFx1NEVFNFx1ODg0Q1x1OEVBQlx1NEVGRFx1RkYwOGRzaCB3ZWIgLS1wb3J0IDxwb3J0Plx1RkYwOVx1MjE5MiBcdTVCNjRcdTUxM0ZcdTUyMTlcdTY3NDBcdTYzODlcdUZGMUJcbiAqIDIuIFx1NjVFMCBQSUQgXHU2NTg3XHU0RUY2XHVGRjA4XHU2NUU3XHU3MjQ4XHU1MzQ3XHU3RUE3L1x1NjU4N1x1NEVGNlx1NEUyMlx1NTkzMVx1RkYwOVx1MjE5MiBwZ3JlcCBcdTYzMDlcdTdBRUZcdTUzRTNcdTUzQ0RcdTY3RTUgXHUyMTkyIFx1NTQwQ1x1NjgzN1x1NjgyMVx1OUE4Q1x1NTQwRVx1NkUwNVx1NzQwNlx1MzAwMlxuICpcbiAqIFx1NTNFQVx1NkUwNVx1NzQwNlwiXHU3NkQxXHU1NDJDXHU2NzJDXHU3QUVGXHU1M0UzXHU0RTE0XHU3MjM2XHU4RkRCXHU3QTBCXHU1REYyXHU0RTBEXHU1NzI4XCJcdTc2ODQgZHNoIHdlYlx1RkYxQlx1NUY1M1x1NTI0RFx1NEYxQVx1OEJERFx1NTE3Nlx1NEVENlx1N0E5N1x1NTNFM1x1NjJDOVx1OEQ3N1x1NzY4NFxuICogXHU2RDNCXHU2NzBEXHU1MkExIHBwaWQgIT0gMVx1RkYwQ1x1N0VERFx1NEUwRFx1NEYxQVx1ODhBQlx1OEJFRlx1Njc0MFx1MzAwMlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3dlZXBPcnBoYW5Ec2goZHNoSG9tZTogc3RyaW5nLCBwb3J0OiBudW1iZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgY2FuZGlkYXRlcyA9IG5ldyBTZXQ8bnVtYmVyPigpXG4gIGNvbnN0IHJlYyA9IHJlYWREc2hQaWRGaWxlKGRzaEhvbWUpXG4gIGlmIChyZWMgJiYgcmVjLnBvcnQgPT09IHBvcnQgJiYgaXNQcm9jZXNzQWxpdmUocmVjLnBpZCkgJiYgaXNEc2hXZWJPblBvcnQocmVjLnBpZCwgcG9ydCkpIHtcbiAgICBjYW5kaWRhdGVzLmFkZChyZWMucGlkKVxuICB9XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSAnd2luMzInKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG91dCA9IHNwYXduU3luYygncGdyZXAnLCBbJy1mJywgYGRzaC4qLS1wb3J0ICR7cG9ydH1gXSwgeyBlbmNvZGluZzogJ3V0ZjgnLCB0aW1lb3V0OiA1MDAwIH0pXG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgKG91dC5zdGRvdXQgfHwgJycpLnNwbGl0KC9cXHMrLykpIHtcbiAgICAgICAgY29uc3QgcGlkID0gcGFyc2VJbnQobGluZSwgMTApXG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUocGlkKSAmJiBwaWQgPiAwICYmIGlzRHNoV2ViT25Qb3J0KHBpZCwgcG9ydCkpIGNhbmRpZGF0ZXMuYWRkKHBpZClcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgfVxuICBsZXQgc3dlcHQgPSBmYWxzZVxuICBmb3IgKGNvbnN0IHBpZCBvZiBjYW5kaWRhdGVzKSB7XG4gICAgaWYgKCFpc09ycGhhblBpZChwaWQsIHJlYz8udHMgPz8gMCkpIGNvbnRpbnVlXG4gICAgY29uc29sZS53YXJuKGBbZHNoLWRvY2tdIFx1NkUwNVx1NzQwNlx1NUI2NFx1NTEzRiBkc2ggd2ViIChwaWQ9JHtwaWR9LCBwb3J0PSR7cG9ydH0pYClcbiAgICBhd2FpdCBzdG9wUHJvY2Vzc0J5UGlkKHBpZClcbiAgICBzd2VwdCA9IHRydWVcbiAgfVxuICBpZiAoc3dlcHQpIHJlbW92ZURzaFBpZEZpbGUoZHNoSG9tZSlcbiAgcmV0dXJuIHN3ZXB0XG59XG4iLCAiLyoqXG4gKiBcdThCQkVcdTdGNkVcdUZGMUFcdTVCNTdcdTZCQjUgKyBcdThCQkVcdTdGNkVcdTk4NzUgVUlcdTMwMDJcbiAqIFYwLjJcdUZGMUFEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdUZGMDhcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCIC8gXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIC8gXHU4MUVBXHU1QjlBXHU0RTQ5XHVGRjA5XHVGRjBDXHU5RUQ4XHU4QkE0IHBlci12YXVsdFx1MzAwMlxuICovXG5cbmltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHR5cGUgRHNoRG9ja1BsdWdpbiBmcm9tICcuL21haW4nXG5cbmV4cG9ydCB0eXBlIERzaEhvbWVNb2RlID0gJ3NoYXJlZCcgfCAncGVyLXZhdWx0JyB8ICdjdXN0b20nXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHNoRG9ja1NldHRpbmdzIHtcbiAgLyoqIGRzaCBDTEkgXHU1MTY1XHU1M0UzXHVGRjA4YmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU2M0EyXHU2RDRCICovXG4gIGRzaEJpbjogc3RyaW5nXG4gIC8qKiBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1RkYxQlx1NzU1OVx1N0E3QVx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOVx1RkYwOFx1N0NGQlx1N0VERiBub2RlIFx1NEYxOFx1NTE0OFx1RkYwOSAqL1xuICBub2RlQmluOiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0XHU0RUM1XHU2NzJDXHU2NzNBXHVGRjA5ICovXG4gIGhvc3Q6IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1Qjk4XHU2NUI5XHU5RUQ4XHU4QkE0IDMwODBcdUZGMDkgKi9cbiAgcG9ydDogbnVtYmVyXG4gIC8qKiBEU0hfSE9NRSBcdTZBMjFcdTVGMEZcdUZGMUFwZXItdmF1bHQ9XHU2QkNGIHZhdWx0IFx1OTY5NFx1NzlCQlx1RkYwOFx1OUVEOFx1OEJBNFx1RkYwOVx1RkYxQnNoYXJlZD1cdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgfi8uZHNoXHVGRjFCY3VzdG9tPVx1ODFFQVx1NUI5QVx1NEU0OSAqL1xuICBkc2hIb21lTW9kZTogRHNoSG9tZU1vZGVcbiAgLyoqIFx1ODFFQVx1NUI5QVx1NEU0OSBEU0hfSE9NRSBcdThERUZcdTVGODRcdUZGMDhcdTRFQzUgY3VzdG9tIFx1NkEyMVx1NUYwRlx1NzUxRlx1NjU0OFx1RkYwOSAqL1xuICBkc2hIb21lOiBzdHJpbmdcbiAgLyoqIFx1NTE0MVx1OEJCOFx1NzUyOCBFTEVDVFJPTl9SVU5fQVNfTk9ERSBcdTU5MERcdTc1MjggT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGVcdUZGMDhcdTlFRDhcdThCQTRcdTUxNzNcdUZGMUFcdTVCOUVcdTZENEJcdTRFMERcdTUzRUZcdTk3NjBcdUZGMDkgKi9cbiAgdXNlRW1iZWRkZWROb2RlOiBib29sZWFuXG4gIC8qKiBPYnNpZGlhbiBcdTU0MkZcdTUyQThcdTY1RjZcdTgxRUFcdTUyQThcdTYyQzlcdThENzcgRFNIICovXG4gIGF1dG9zdGFydDogYm9vbGVhblxuICAvKipcbiAgICogT2JzaWRpYW4gQVBJIFx1Njg2NVx1RkYwOEIxXHVGRjA5XHVGRjFBXHU2M0QyXHU0RUY2XHU1MkEwXHU4RjdEXHU1MzczXHU1NzI4IDEyNy4wLjAuMSBcdThENzdcdTRFMDBcdTRFMkFcdTY3MkNcdTU3MzAgSFRUUCBcdTY4NjVcdUZGMENcbiAgICogXHU2MjhBIHZhdWx0L21ldGFkYXRhQ2FjaGUvZmlsZU1hbmFnZXIgXHU3Njg0XHU1Qjk4XHU2NUI5XHU4OUUzXHU2NzkwXHU3RUQzXHU2NzlDXHU1NTgyXHU3RUQ5IERTSCBcdTRGQTdcbiAgICogZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHQgXHU1REU1XHU1MTc3XHVGRjA4XHU2ODY1XHU0RjE4XHU1MTQ4XHUzMDAxXHU2NTg3XHU0RUY2XHU1NkRFXHU5MDAwXHVGRjA5XHUzMDAyXHU5RUQ4XHU4QkE0XHU1RjAwXHUzMDAyXG4gICAqL1xuICBicmlkZ2VFbmFibGVkOiBib29sZWFuXG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEc2hEb2NrU2V0dGluZ3MgPSB7XG4gIGRzaEJpbjogJycsXG4gIG5vZGVCaW46ICcnLFxuICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgcG9ydDogMzA4MCxcbiAgZHNoSG9tZU1vZGU6ICdwZXItdmF1bHQnLFxuICBkc2hIb21lOiAnJyxcbiAgdXNlRW1iZWRkZWROb2RlOiBmYWxzZSxcbiAgYXV0b3N0YXJ0OiB0cnVlLFxuICBicmlkZ2VFbmFibGVkOiB0cnVlLFxufVxuXG5leHBvcnQgY2xhc3MgRHNoRG9ja1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgY3VzdG9tSG9tZUVsPzogU2V0dGluZ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbilcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpc1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2OTgyXHU4OUM4IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXNldHRpbmdzLWRlc2MnLFxuICAgICAgdGV4dDogJ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFdlYiBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW5cdUZGMUFcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NEMgXHUyMTkyIFx1OTc2Mlx1Njc3Rlx1NUQ0Q1x1NTE2NVx1MzAwMlx1NUI5OFx1NjVCOVx1NTM5Rlx1NzUxRlx1RkYwQ1x1NUI5OFx1NjVCOSBVSSBcdTUzOUZcdTY4MzdcdTVENENcdTUxNjVcdTMwMDInLFxuICAgIH0pXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zZXR0aW5ncy1kZXNjJyxcbiAgICAgIHRleHQ6ICdcdUQ4M0VcdUREMUQgXHU0RTBFIGRzaC10b29sLW9ic2lkaWFuLXZhdWx0IFx1NzNFMFx1ODA1NFx1NzRBN1x1NTQwOFx1RkYxQVx1OTE0RFx1NTQwOCBEU0ggXHU0RkE3XHU3Njg0IDE2IFx1NEUyQSB2YXVsdF8qIFx1NURFNVx1NTE3N1x1RkYwQ1x1NUYwMFx1N0JCMVx1NTM3M1x1NzUyOFx1MzAwQ09ic2lkaWFuIFx1NTE4NSBBZ2VudCBcdTdCMTRcdThCQjBcdTVERTVcdTRGNUNcdTZENDFcdTMwMERcdTIwMTRcdTIwMTRcdTk3NjJcdTY3N0ZcdTkxQ0NcdTc2RjRcdTYzQTVcdThCRjRcIlx1OEJGQlx1NEUwMFx1NEUwQlx1NEVDQVx1NTkyOVx1NzY4NFx1N0IxNFx1OEJCMFwiXHVGRjBDQWdlbnQgXHU4MUVBXHU1MkE4XHU1QjlBXHU0RjREXHU1RjUzXHU1MjREXHU1RTkzXHU4QkZCXHU1MTk5XHUzMDAyJyxcbiAgICB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY3MERcdTUyQTFcdTYzQTdcdTUyMzYgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdcdTY3MERcdTUyQTEnKS5zZXRIZWFkaW5nKClcbiAgICBjb25zdCBzdGF0dXNMaW5lID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NzBEXHU1MkExXHU3MkI2XHU2MDAxJylcbiAgICAgIC5zZXREZXNjKHRoaXMuZGVzY3JpYmVTdGF0dXMoKSlcbiAgICBjb25zdCBidG5zID0gc3RhdHVzTGluZS5jb250cm9sRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYnRucycgfSlcbiAgICBjb25zdCBzdGFydEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnbW9kLWN0YScsIHRleHQ6ICdcdTI1QjYgXHU1NDJGXHU1MkE4JyB9KVxuICAgIHN0YXJ0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgc3RvcEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVBMCBcdTUwNUNcdTZCNjInIH0pXG4gICAgc3RvcEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdG9wKCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgb3BlbkJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicgfSlcbiAgICBvcGVuQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5QYW5lbCgpXG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5NjhGIE9ic2lkaWFuIFx1ODFFQVx1NTJBOFx1NTQyRlx1NTJBOCcpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIE9ic2lkaWFuIEFQSSBcdTY4NjUgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdPYnNpZGlhbiBBUEkgXHU2ODY1XHVGRjA4QjFcdUZGMDknKS5zZXRIZWFkaW5nKClcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTU0MkZcdTc1MjggQVBJIFx1Njg2NScpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgJ1x1NjNEMlx1NEVGNlx1NTJBMFx1OEY3RFx1NTM3M1x1NTcyOFx1NjcyQ1x1NjczQSAxMjcuMC4wLjEgXHU4RDc3XHU0RTAwXHU0RTJBIHRva2VuIFx1OTI3NFx1Njc0M1x1NzY4NCBIVFRQIFx1Njg2NVx1RkYwQ1x1NjI4QSB2YXVsdC9tZXRhZGF0YUNhY2hlL2ZpbGVNYW5hZ2VyIFx1NzY4NFx1NUI5OFx1NjVCOVx1ODlFM1x1Njc5MFx1N0VEM1x1Njc5Q1x1NTU4Mlx1N0VEOSBEU0ggXHU0RkE3IHZhdWx0XyogXHU1REU1XHU1MTc3XHVGRjA4XHU2ODY1XHU0RjE4XHU1MTQ4XHUzMDAxXHU2NTg3XHU0RUY2XHU1NkRFXHU5MDAwXHVGRjA5XHUzMDAyXHU1MTczXHU5NUVEXHU1NDBFXHU1REU1XHU1MTc3XHU1NkRFXHU5MDAwXHU2NTg3XHU0RUY2XHU3NkY0XHU4QkZCXHU2QTIxXHU1RjBGXHUzMDAyJyxcbiAgICAgIClcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYnJpZGdlRW5hYmxlZCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5icmlkZ2VFbmFibGVkID0gdlxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0QnJpZGdlKClcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcEJyaWRnZSgpXG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuYnJpZGdlTGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVCcmlkZ2UoKVxuICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmJyaWRnZUxpbmUgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1OEZEMFx1ODg0Q1x1NjVGNiAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1OEZEMFx1ODg0Q1x1NjVGNicpLnNldEhlYWRpbmcoKVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ2RzaCBDTEkgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEJcdUZGMDhEU0hfQklOIFx1MjE5MiBucG0gcm9vdCAtZyBcdTIxOTIgXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXHU1M0VGXHU1ODZCIGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTYyMTYgYmluLmpzIFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcy9AZGVlcHNlZWstYWkvZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmRldGVjdExpbmUgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNicpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9iaW4vbm9kZScpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZScpXG4gICAgICAuc2V0RGVzYygnRUxFQ1RST05fUlVOX0FTX05PREVcdTMwMDJcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdTIwMTRcdTIwMTRcdTVCOUVcdTZENEIgT2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XHU0RUU1IE5vZGUgXHU2QTIxXHU1RjBGXHU4RkQwXHU4ODRDXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjBDXHU0RUM1XHU1NzI4XHU5QThDXHU4QkMxXHU1M0VGXHU3NTI4XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyJylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU3RjUxXHU3RURDIC0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnXHU3RjUxXHU3RURDJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU1NzMwXHU1NzQwJylcbiAgICAgIC5zZXREZXNjKCdcdTRFQzVcdTY3MkNcdTY3M0FcdTU2REVcdTczQUZcdTU3MzBcdTU3NDBcdTUzRUZcdTkwMDlcdUZGMUFcdTVCOThcdTY1QjkgZHNoIFx1NjJEMlx1N0VERCAtLWhvc3QgMC4wLjAuMFx1RkYwOFx1NEUwRFx1NjUyRlx1NjMwMVx1NUM0MFx1NTdERlx1N0Y1MVx1OEJCRlx1OTVFRVx1RkYwOVx1RkYwQ1x1OTc1RVx1NTZERVx1NzNBRlx1NTAzQ1x1NkNBMVx1NjcwOVx1NjEwRlx1NEU0OVx1MzAwMlx1NjVFN1x1NzI0OFx1OTA1N1x1NzU1OVx1NzY4NFx1ODFFQVx1NUI5QVx1NEU0OVx1NTAzQ1x1NEYxQVx1ODhBQlx1OTFDRFx1N0Y2RVx1NEUzQSAxMjcuMC4wLjFcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICAvLyBcdTUzODZcdTUzRjIgZGF0YS5qc29uIFx1NTNFRlx1ODBGRFx1NkI4Qlx1NzU1OVx1ODFFQVx1NUI5QVx1NEU0OSBob3N0XHVGRjA4XHU5NjkwXHU4NUNGXHU1QjU3XHU2QkI1XHU2NUY2XHU0RUUzXHU2MjRCXHU2NTM5XHU3Njg0XHVGRjA5XHVGRjBDXHU2NTM2XHU2NTVCXHU1MjMwXHU1NkRFXHU3M0FGXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob3N0ICE9PSAnMTI3LjAuMC4xJyAmJiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob3N0ICE9PSAnbG9jYWxob3N0Jykge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvc3QgPSAnMTI3LjAuMC4xJ1xuICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfVxuICAgICAgICBkZC5hZGRPcHRpb24oJzEyNy4wLjAuMScsICcxMjcuMC4wLjFcdUZGMDhcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMENcdTlFRDhcdThCQTRcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2xvY2FsaG9zdCcsICdsb2NhbGhvc3RcdUZGMDhcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDknKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob3N0KVxuICAgICAgICBkZC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvc3QgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1N0ZBXHU1MUM2XHVGRjA5JylcbiAgICAgIC5zZXREZXNjKCdcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1MzAwMnNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXHU3NkY0XHU2M0E1XHU0RjdGXHU3NTI4XHVGRjFCcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NTcyOFx1NkI2NFx1NTdGQVx1Nzg0MFx1NEUwQVx1NjMwOSB2YXVsdCBcdTZEM0VcdTc1MUZcdTcyRUNcdTdBQ0JcdTdBRUZcdTUzRTNcdUZGMDhcdTZCQ0YgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RjFBXHU4QkREXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCczMDgwJylcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQpKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbiA9IE51bWJlcih2LnRyaW0oKSlcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQgPSBOdW1iZXIuaXNJbnRlZ2VyKG4pICYmIG4gPj0gMCAmJiBuIDw9IDY1NTM1ID8gbiA6IDMwODBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLm5ldFByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NSAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVx1RkYwOERTSF9IT01FXHVGRjA5XHU0RTBFXHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2QTIxXHU1RjBGJylcbiAgICAgIC5zZXREZXNjKCdwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gXHU0RjFBXHU4QkREXHU2MzA5XHU1RTkzXHU5Njk0XHU3OUJCXHVGRjA4XHU1NDA0XHU1RTkzXHU5NzYyXHU2NzdGXHU1M0VBXHU2NjNFXHU3OTNBXHU2NzJDXHU1RTkzXHU1MjFCXHU1RUZBXHU3Njg0XHU0RjFBXHU4QkREXHVGRjA5XHVGRjBDXHU0RjQ2XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTRFMEVcdThGRDBcdTg4NENcdTY1RjZcdTYzRDJcdTRFRjZcdTUxNjhcdTVDNDBcdTUxNzFcdTRFQUJcdTRFMDBcdTRFRkRcdUZGMENcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjhcdTVFOTNcdTc1MUZcdTY1NDhcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICBkZC5hZGRPcHRpb24oJ3Blci12YXVsdCcsICdcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREIH4vLmRzaC92YXVsdHMvPFx1NTQwRD4tPGhhc2g+XHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjFCXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU0RUNEXHU1MTcxXHU0RUFCXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdzaGFyZWQnLCAnXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTRFMDBcdTU5NTdcdTkxNERcdTdGNkVcdTMwMDFcdTYzRDJcdTRFRjZcdTRFMEVcdTRGMUFcdThCRERcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2N1c3RvbScsICdcdTgxRUFcdTVCOUFcdTRFNDlcdThERUZcdTVGODQnKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSlcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSA9IHYgYXMgRHNoSG9tZU1vZGVcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuY3VzdG9tSG9tZUVsPy5zZXREaXNhYmxlZCh2ICE9PSAnY3VzdG9tJylcbiAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIHRoaXMuY3VzdG9tSG9tZUVsID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NCcpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9Vc2Vycy95b3UvLmRzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuY3VzdG9tSG9tZUVsLnNldERpc2FibGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlICE9PSAnY3VzdG9tJylcblxuICAgIHRoaXMuaG9tZVByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgIHRoaXMuYnJpZGdlTGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVCcmlkZ2UoKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RMaW5lITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBob21lUHJldmlldyE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgbmV0UHJldmlldyE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgYnJpZGdlTGluZSE6IEhUTUxFbGVtZW50XG5cbiAgcHJpdmF0ZSBkZXNjcmliZVN0YXR1cygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgcmV0dXJuIGAke3MudXJsfVx1RkYwOCR7cy5hdHRhY2hlZCA/ICdcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJ1x1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0Q1x1NEUyRCd9XHVGRjA5YFxuICAgIH1cbiAgICBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSByZXR1cm4gJ1x1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNlx1RkYwOFx1OTk5Nlx1NkIyMVx1N0VBNiAxMCBcdTc5RDJcdUZGMENcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOSdcbiAgICBpZiAocy5raW5kID09PSAnZXJyb3InKSByZXR1cm4gYFx1NTkzMVx1OEQyNTogJHtzLm1lc3NhZ2V9YFxuICAgIHJldHVybiAnXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZUJyaWRnZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHVybCA9IHRoaXMucGx1Z2luLmJyaWRnZVVybFxuICAgIGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuYnJpZGdlRW5hYmxlZCkgcmV0dXJuICdcdTVERjJcdTUxNzNcdTk1RURcdUZGMDhcdTVERTVcdTUxNzdcdTU2REVcdTkwMDBcdTY1ODdcdTRFRjZcdTc2RjRcdThCRkJcdTZBMjFcdTVGMEZcdUZGMDknXG4gICAgcmV0dXJuIHVybCA/IGBcdThGRDBcdTg4NENcdTRFMkQ6ICR7dXJsfVx1RkYwOHRva2VuIFx1OTI3NFx1Njc0M1x1RkYwQ1x1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOWAgOiAnXHU2NzJBXHU4RkQwXHU4ODRDXHVGRjA4XHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1XHU1QzA2XHU1NkRFXHU5MDAwXHU2NTg3XHU0RUY2XHU2QTIxXHU1RjBGXHVGRjA5J1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURldGVjdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnBsdWdpbi5kZXRlY3RJbmZvKClcbiAgICByZXR1cm4gW1xuICAgICAgYGRzaDogJHtpbmZvLmRzaEJpbiA/PyAnXHU2NzJBXHU2MjdFXHU1MjMwJ30ke2luZm8uZHNoTm90ZXMubGVuZ3RoID8gYFx1RkYwOCR7aW5mby5kc2hOb3Rlcy5qb2luKCdcdUZGMUInKX1cdUZGMDlgIDogJyd9YCxcbiAgICAgIGBub2RlOiAke2luZm8ubm9kZU5vdGVzLmpvaW4oJ1x1RkYxQicpfWAsXG4gICAgXS5qb2luKCdcXG4nKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICBjb25zdCBob21lID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlRHNoSG9tZSgpXG4gICAgY29uc3Qgc2hhcmVkID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlU2hhcmVkQ29uZmlnUm9vdCgpXG4gICAgaWYgKHNoYXJlZCkge1xuICAgICAgcmV0dXJuIGBcdTRGMUFcdThCRERcdTc2RUVcdTVGNTU6ICR7aG9tZX1cXG5cdTkxNERcdTdGNkVcdTUxNzFcdTRFQUI6ICR7c2hhcmVkfVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4XHU1RTkzXHU3NTFGXHU2NTQ4XHVGRjA5YFxuICAgIH1cbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1OERFRlx1NUY4NDogJHtob21lfWBcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVOZXQoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlUG9ydCgpXG4gICAgY29uc3QgbW9kZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlXG4gICAgY29uc3Qgc3VmZml4ID0gbW9kZSA9PT0gJ3Blci12YXVsdCcgPyAnXHVGRjA4XHU2NzJDIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEUwRVx1NTE3Nlx1NEVENiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMDknIDogJ1x1RkYwOHNoYXJlZC9jdXN0b21cdUZGMUFcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHVGRjA5J1xuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU3QUVGXHU1M0UzOiAke3BvcnR9JHtzdWZmaXh9YFxuICB9XG59XG4iLCAiLyoqXG4gKiBEc2hXZWJWaWV3IFx1MjAxNFx1MjAxNCBcdTYyOEFcdTVCOThcdTY1QjkgRFNIIFdlYiAoMTI3LjAuMC4xOjxwb3J0PikgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuIFx1OTc2Mlx1Njc3Rlx1MzAwMlxuICogXHU1RTI2XHU1QjhDXHU2NTc0XHU4RkM3XHU3QTBCXHU3MkI2XHU2MDAxXHVGRjFBXHU1MkEwXHU4RjdEXHU1MkE4XHU3NTNCIC8gXHU5NTE5XHU4QkVGXHU1MzYxXHU3MjQ3XHVGRjA4XHU1NDJCXHU5MUNEXHU4QkQ1XHVGRjA5LyBcdTY3MkFcdTU0MkZcdTUyQThcdTdBN0FcdTcyQjZcdTYwMDFcdTMwMDJcbiAqIGlmcmFtZSBcdTYzMDdcdTU0MTFcdTVCOThcdTY1QjlcdTY3MERcdTUyQTFcdUZGMENVSSBcdTUzRUFcdTY2MkZcIlx1ODIzOVx1NTc1RVwiXHU1OTE2XHU1OEYzXHVGRjFCXHU1REU1XHU1MTc3XHU2ODBGXHU1MkE4XHU0RjVDXHU4RDcwIE9ic2lkaWFuIFx1NTM5Rlx1NzUxRlxuICogXHU2ODA3XHU5ODk4XHU2ODBGXHVGRjA4SXRlbVZpZXcuYWRkQWN0aW9uXHVGRjA5XHU0RTBFXHU1M0YzXHU5NTJFXHU4M0RDXHU1MzU1XHVGRjA4b25QYW5lTWVudVx1RkYwOVx1MzAwMlxuICovXG5cbmltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBzZXRJY29uLCB0eXBlIE1lbnUgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgY29uc3QgRFNIX1dFQl9WSUVXX1RZUEUgPSAnZHNoLWRvY2std2ViJ1xuXG50eXBlIFVpU3RhdGUgPSAncnVubmluZycgfCAnc3RhcnRpbmcnIHwgJ2Vycm9yJyB8ICdzdG9wcGVkJ1xuXG5leHBvcnQgY2xhc3MgRHNoV2ViVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBpZnJhbWVFbDogSFRNTElGcmFtZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHBpbGxFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIG92ZXJsYXlFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICAvKiogXHU5NzYyXHU2NzdGXHU1MTg1XCJcdTU0MkZcdTUyQTgvXHU1MDVDXHU2QjYyXCJcdTYzMDlcdTk0QUVcdUZGMDgwLjIuNSBcdTU0MENcdTZCM0VcdUZGMENcdTUxODVcdTVCQjlcdTUzM0FcdTUzRUZcdTg5QzFcdUZGMDkgKi9cbiAgcHJpdmF0ZSB0b2dnbGVCdG46IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgLyoqIFx1NjgwN1x1OTg5OFx1NjgwRlwiXHU1NDJGXHU1MkE4L1x1NTA1Q1x1NkI2MlwiXHU1MkE4XHU0RjVDXHU2MzA5XHU5NEFFXHVGRjA4YWRkQWN0aW9uIFx1OEZENFx1NTZERVx1NzY4NFx1NTE0M1x1N0QyMFx1RkYwQ1x1NTZGRVx1NjgwN1x1OTY4Rlx1NzJCNlx1NjAwMVx1NTIwN1x1NjM2Mlx1RkYwOSAqL1xuICBwcml2YXRlIHRvZ2dsZUFjdGlvbkVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgY3VycmVudDogVWlTdGF0ZSA9ICdzdG9wcGVkJ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSBwbHVnaW46IERzaERvY2tQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGxlYWYpXG4gIH1cblxuICBvdmVycmlkZSBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBEU0hfV0VCX1ZJRVdfVFlQRVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0RTSCBEb2NrJ1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiAnYW5jaG9yJ1xuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jaycgfSlcblxuICAgIC8vIC0tLS0gXHU1OTM0XHU5MEU4XHVGRjFBbG9nbyArIFx1NjgwN1x1OTg5OCArIFx1NzJCNlx1NjAwMSBwaWxsICsgXHU5NzYyXHU2NzdGXHU1MTg1XHU2M0E3XHU1MjM2XHU2MzA5XHU5NEFFIC0tLS1cbiAgICAvLyBcdTYzMDlcdTk0QUVcdTg4NENcdTRGRERcdTc1NTlcdTU3MjhcdTk3NjJcdTY3N0ZcdTUxODVcdTVCQjlcdTkxQ0NcdUZGMDgwLjIuNSBcdTU0MENcdTZCM0VcdUZGMENcdTRFRkJcdTRGNTUgT2JzaWRpYW4gXHU3MjQ4XHU2NzJDL1x1NEUzQlx1OTg5OFx1NEUwQlx1OTBGRFx1NTNFRlx1ODlDMVx1RkYwOVx1RkYxQlxuICAgIC8vIFx1NTQwQ1x1NjVGNlx1NEZERFx1NzU1OVx1NTM5Rlx1NzUxRlx1NjgwN1x1OTg5OFx1NjgwRlx1NTJBOFx1NEY1Q1x1RkYwOGFkZEFjdGlvblx1RkYwQ3BvcG91dCBcdTdBOTdcdTUzRTNcdTkxQ0NcdTU1MkZcdTRFMDBcdTc2ODRcdTRGNERcdTdGNkVcdUZGMDlcdTRFMEVcdTUzRjNcdTk1MkVcdTgzRENcdTUzNTVcdTMwMDJcbiAgICBjb25zdCBoZWFkZXIgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWhlYWRlcicgfSlcbiAgICBjb25zdCBsb2dvID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWxvZ28nIH0pXG4gICAgc2V0SWNvbihsb2dvLCAnYW5jaG9yJylcbiAgICBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXRpdGxlJywgdGV4dDogJ0RTSCBEb2NrJyB9KVxuICAgIHRoaXMucGlsbEVsID0gaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay1waWxsJyB9KVxuICAgIGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGFjZXInIH0pXG5cbiAgICB0aGlzLnRvZ2dsZUJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgdGhpcy50b2dnbGVCdG4ub25jbGljayA9ICgpID0+IHZvaWQgdGhpcy5vblRvZ2dsZSgpXG5cbiAgICBjb25zdCByZWZyZXNoQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHJlZnJlc2hCdG4sICdyZWZyZXNoLWN3JylcbiAgICByZWZyZXNoQnRuLnRpdGxlID0gJ1x1NTIzN1x1NjVCMCdcbiAgICByZWZyZXNoQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnJlbG9hZCgpXG5cbiAgICBjb25zdCBwb3BvdXRCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24ocG9wb3V0QnRuLCAnbWF4aW1pemUtMicpXG4gICAgcG9wb3V0QnRuLnRpdGxlID0gJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOFx1NzJFQ1x1N0FDQlx1OEZEQlx1N0EwQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOSdcbiAgICBwb3BvdXRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpXG4gICAgfVxuXG4gICAgY29uc3QgYnJvd3NlckJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihicm93c2VyQnRuLCAnZXh0ZXJuYWwtbGluaycpXG4gICAgYnJvd3NlckJ0bi50aXRsZSA9ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAnXG4gICAgYnJvd3NlckJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKClcbiAgICB9XG5cbiAgICAvLyBENVx1RkYxQVx1NURFNVx1NTE3N1x1NjgwRlx1NTJBOFx1NEY1Q1x1NTQwQ1x1NkI2NVx1OEZEQiBPYnNpZGlhbiBcdTUzOUZcdTc1MUZcdTY4MDdcdTk4OThcdTY4MEZcdUZGMDhJdGVtVmlldy5hZGRBY3Rpb24sIG9ic2lkaWFuLmQudHM6MzYwNFx1RkYwOVxuICAgIC8vIFx1NEUwRVx1NTNGM1x1OTUyRVx1ODNEQ1x1NTM1NSBcdTIwMTRcdTIwMTQgcG9wb3V0IFx1N0E5N1x1NTNFM1x1MzAwMVx1NTkxQVx1OTc2Mlx1Njc3Rlx1NTczQVx1NjY2Rlx1NEUwQlx1OTBGRFx1NjcwOVx1NTE2NVx1NTNFM1x1MzAwMlxuICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwgPSB0aGlzLmFkZEFjdGlvbigncGxheScsICdcdTU0MkZcdTUyQTgnLCAoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKSlcbiAgICB0aGlzLmFkZEFjdGlvbigncmVmcmVzaC1jdycsICdcdTUyMzdcdTY1QjAnLCAoKSA9PiB0aGlzLnJlbG9hZCgpKVxuICAgIHRoaXMuYWRkQWN0aW9uKCdtYXhpbWl6ZS0yJywgJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOFx1NzJFQ1x1N0FDQlx1OEZEQlx1N0EwQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOScsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpKVxuICAgIHRoaXMuYWRkQWN0aW9uKCdleHRlcm5hbC1saW5rJywgJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCcsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlbkluQnJvd3NlcigpKVxuXG4gICAgLy8gLS0tLSBcdTRFM0JcdTRGNTNcdUZGMUFpZnJhbWUgKyBcdTcyQjZcdTYwMDFcdTg5ODZcdTc2RDZcdTVDNDIgLS0tLVxuICAgIGNvbnN0IGJvZHkgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJvZHknIH0pXG4gICAgLy8gRDRcdUZGMUFcdTY2M0VcdTVGMEYgc2FuZGJveCBcdTc2N0RcdTU0MERcdTUzNTVcdUZGMDhhbGxvdy1zY3JpcHRzICsgYWxsb3ctc2FtZS1vcmlnaW4gXHU0RjlCIFNQQSBcdTc1MjhcbiAgICAvLyBsb2NhbFN0b3JhZ2VcdUZGMENhbGxvdy1mb3Jtcy9tb2RhbHMvcG9wdXBzIFx1ODk4Nlx1NzZENlx1NzY3Qlx1NUY1NS9cdTVGMzlcdTdBOTdcdTU3M0FcdTY2NkZcdUZGMUJcdTRFQzVcdTU2REVcdTczQUZcdTUzRUZcdTRGRTFcbiAgICAvLyBcdTY3MERcdTUyQTFcdUZGMENcdTRGNDZcdTY2M0VcdTVGMEZcdTU4RjBcdTY2MEVcdTY2MkZcdTg5QzRcdTgzMDNcdTg5ODFcdTZDNDJcdUZGMENDdXN0b20gRnJhbWVzIFx1NTQwQ1x1NkIzRVx1RkYwOVx1MzAwMlxuICAgIHRoaXMuaWZyYW1lRWwgPSBib2R5LmNyZWF0ZUVsKCdpZnJhbWUnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1mcmFtZScsXG4gICAgICBhdHRyOiB7IHNhbmRib3g6ICdhbGxvdy1zY3JpcHRzIGFsbG93LXNhbWUtb3JpZ2luIGFsbG93LWZvcm1zIGFsbG93LW1vZGFscyBhbGxvdy1wb3B1cHMnIH0sXG4gICAgfSlcbiAgICB0aGlzLm92ZXJsYXlFbCA9IGJvZHkuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stb3ZlcmxheScgfSlcblxuICAgIC8vIFx1NzJCNlx1NjAwMVx1ODA1NFx1NTJBOFx1MzAwMlx1NzUyOCBDb21wb25lbnQucmVnaXN0ZXJcdUZGMDhcdTVCOThcdTY1QjkgQVBJXHVGRjBDb2JzaWRpYW4uZC50c1x1RkYwOVx1NkNFOFx1NTE4Q1x1OTAwMFx1OEJBMlx1NTFGRFx1NjU3MFx1RkYxQVxuICAgIC8vIFx1ODlDNlx1NTZGRVx1NTM3OFx1OEY3RFx1RkYwOG9uQ2xvc2VcdUZGMDlcdTY1RjZcdTgxRUFcdTUyQThcdTYyNjdcdTg4NENcdUZGMENcdTRFMERcdTRGMUFcdTZCQ0ZcdTZCMjFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTkwRkRcdTVGODBcbiAgICAvLyBwbHVnaW4uc3RhdHVzTGlzdGVuZXJzIFx1N0QyRlx1NzlFRlx1OTVFRFx1NTMwNVx1RkYwOFx1NjVFN1x1NUI5RVx1NzNCMFx1NkNDNFx1NkYwRlx1RkYwOVx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXIodGhpcy5wbHVnaW4ub25TdGF0dXNDaGFuZ2UoKCkgPT4gdGhpcy5yZWZyZXNoKCkpKVxuICAgIHRoaXMucmVmcmVzaCgpXG5cbiAgICAvLyBcdTUxNUNcdTVFOTVcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTgyRTVcdTY3MERcdTUyQTFcdTY3MkFcdTU0MkZcdTUyQThcdTRFMTRcdTdBRUZcdTUzRTNcdTUzRUZcdTc1MjhcdUZGMENcdTVDMURcdThCRDVcdTYyQzlcdThENzdcbiAgICB2b2lkIHRoaXMuZW5zdXJlU3RhcnRlZCgpXG5cbiAgICAvLyBcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTUyMzdcdTY1QjBcdTRFMDBcdTZCMjFcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXHVGRjFBXHU3NTI4XHU2MjM3XHU2QjY0XHU1MjNCXHU2QjYzXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0ZcdTc2ODRcdTdBOTdcdTUzRTNcbiAgICAvLyBcdTVDMzFcdTY2MkZcIlx1NUY1M1x1NTI0RCB2YXVsdFwiXHVGRjBDXHU2NUUwXHU5NzAwXHU3QjQ5IGZvY3VzL2FjdGl2ZS1sZWFmLWNoYW5nZSBcdTRFOEJcdTRFRjZcdTMwMDJcbiAgICB0aGlzLnBsdWdpbi5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgfVxuXG4gIG92ZXJyaWRlIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIH1cblxuICAvKiogRDVcdUZGMUFcdTUzRjNcdTk1MkVcdTgzRENcdTUzNTVcdUZGMDhWaWV3Lm9uUGFuZU1lbnUsIG9ic2lkaWFuLmQudHM6NzcwOVx1RkYwOVx1MjAxNFx1MjAxNFx1NTkxQVx1OTc2Mlx1Njc3Ri9cdTY4MDdcdTdCN0VcdTU5MzRcdTUzRjNcdTk1MkVcdTgxRUFcdTUyQThcdTgzQjdcdTVGOTcgKi9cbiAgb3ZlcnJpZGUgb25QYW5lTWVudShtZW51OiBNZW51LCBfc291cmNlOiAnbW9yZS1vcHRpb25zJyB8ICd0YWItaGVhZGVyJyB8IHN0cmluZyk6IHZvaWQge1xuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT5cbiAgICAgIGl0ZW1cbiAgICAgICAgLnNldFRpdGxlKHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnIHx8IHRoaXMuY3VycmVudCA9PT0gJ3N0YXJ0aW5nJyA/ICdcdTUwNUNcdTZCNjIgRFNIIFx1NjcwRFx1NTJBMScgOiAnXHU1NDJGXHU1MkE4IERTSCBcdTY3MERcdTUyQTEnKVxuICAgICAgICAuc2V0SWNvbih0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJyB8fCB0aGlzLmN1cnJlbnQgPT09ICdzdGFydGluZycgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgICAgLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLm9uVG9nZ2xlKCkpLFxuICAgIClcbiAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IGl0ZW0uc2V0VGl0bGUoJ1x1NTIzN1x1NjVCMCcpLnNldEljb24oJ3JlZnJlc2gtY3cnKS5vbkNsaWNrKCgpID0+IHRoaXMucmVsb2FkKCkpKVxuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT5cbiAgICAgIGl0ZW0uc2V0VGl0bGUoJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFMycpLnNldEljb24oJ21heGltaXplLTInKS5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpKSxcbiAgICApXG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PlxuICAgICAgaXRlbS5zZXRUaXRsZSgnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJykuc2V0SWNvbignZXh0ZXJuYWwtbGluaycpLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKCkpLFxuICAgIClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25Ub2dnbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoKClcbiAgfVxuXG4gIC8qKiBcdTk3NjJcdTY3N0ZcdTYyNTNcdTVGMDBcdTY1RjZcdTc4NkVcdTRGRERcdTY3MERcdTUyQTFcdTU3MjhcdThERDFcdUZGMDhcdTVERjJcdTU3MjhcdThERDFcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDkgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVTdGFydGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdzdG9wcGVkJyB8fCBzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICAgIHRoaXMucmVmcmVzaCgpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGxldCB1aTogVWlTdGF0ZVxuICAgIGxldCBwaWxsVGV4dCA9ICcnXG4gICAgbGV0IHBpbGxDbHMgPSAnJ1xuXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB1aSA9ICdydW5uaW5nJ1xuICAgICAgcGlsbFRleHQgPSBgXHUyNUNGICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICcgXHUwMEI3IFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnJ31gXG4gICAgICBwaWxsQ2xzID0gJ2lzLXJ1bm5pbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHVpID0gJ3N0YXJ0aW5nJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNDIFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNidcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RhcnRpbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHVpID0gJ2Vycm9yJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNzE1IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNSdcbiAgICAgIHBpbGxDbHMgPSAnaXMtZXJyb3InXG4gICAgfSBlbHNlIHtcbiAgICAgIHVpID0gJ3N0b3BwZWQnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0IgXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICAgICAgcGlsbENscyA9ICdpcy1zdG9wcGVkJ1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHVpXG4gICAgY29uc3QgcnVubmluZyA9IHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJ1xuICAgIGlmICh0aGlzLnBpbGxFbCkge1xuICAgICAgdGhpcy5waWxsRWwuc2V0VGV4dChwaWxsVGV4dClcbiAgICAgIHRoaXMucGlsbEVsLmNsYXNzTmFtZSA9IGBkc2gtZG9jay1waWxsICR7cGlsbENsc31gXG4gICAgfVxuICAgIC8vIFx1OTc2Mlx1Njc3Rlx1NTE4NVx1NjMwOVx1OTRBRVx1NTZGRVx1NjgwN1x1OTY4Rlx1NzJCNlx1NjAwMVx1NTIwN1x1NjM2Mlx1RkYwODAuMi41IFx1NTQwQ1x1NkIzRVx1RkYwOVxuICAgIGlmICh0aGlzLnRvZ2dsZUJ0bikge1xuICAgICAgdGhpcy50b2dnbGVCdG4uZW1wdHkoKVxuICAgICAgc2V0SWNvbih0aGlzLnRvZ2dsZUJ0biwgcnVubmluZyA/ICdzcXVhcmUnIDogJ3BsYXknKVxuICAgICAgdGhpcy50b2dnbGVCdG4udGl0bGUgPSBydW5uaW5nID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4J1xuICAgIH1cbiAgICAvLyBcdTY4MDdcdTk4OThcdTY4MEZcdTUyQThcdTRGNUNcdTYzMDlcdTk0QUVcdTU2RkVcdTY4MDdcdTk2OEZcdTcyQjZcdTYwMDFcdTUyMDdcdTYzNjJcdUZGMDhhZGRBY3Rpb24gXHU4RkQ0XHU1NkRFXHU3Njg0XHU1MTQzXHU3RDIwXHU1M0VGXHU4OEFCIHNldEljb24gXHU5MUNEXHU3RUQ4XHVGRjA5XG4gICAgaWYgKHRoaXMudG9nZ2xlQWN0aW9uRWwpIHtcbiAgICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwuZW1wdHkoKVxuICAgICAgc2V0SWNvbih0aGlzLnRvZ2dsZUFjdGlvbkVsLCBydW5uaW5nID8gJ3NxdWFyZScgOiAncGxheScpXG4gICAgICB0aGlzLnRvZ2dsZUFjdGlvbkVsLnRpdGxlID0gcnVubmluZyA/ICdcdTUwNUNcdTZCNjInIDogJ1x1NTQyRlx1NTJBOCdcbiAgICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgcnVubmluZyA/ICdcdTUwNUNcdTZCNjInIDogJ1x1NTQyRlx1NTJBOCcpXG4gICAgfVxuXG4gICAgLy8gaWZyYW1lIFx1NEUwRVx1ODk4Nlx1NzZENlx1NUM0MlxuICAgIGlmICh1aSA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmlmcmFtZUVsLnNyYyAhPT0gdGhpcy5wbHVnaW4uYmFzZVVybCkge1xuICAgICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICAgIH1cbiAgICAgIHRoaXMuc2hvd092ZXJsYXkobnVsbClcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RhcnRpbmcoKSlcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyRXJyb3Iocy5raW5kID09PSAnZXJyb3InID8gcy5tZXNzYWdlIDogJ1x1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRicpKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RvcHBlZCgpKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0gXHU4OTg2XHU3NkQ2XHU1QzQyXHU2RTMyXHU2N0QzIC0tLS0tLS0tLS1cblxuICBwcml2YXRlIHNob3dPdmVybGF5KGNvbnRlbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5vdmVybGF5RWwpIHJldHVyblxuICAgIHRoaXMub3ZlcmxheUVsLmVtcHR5KClcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgdGhpcy5vdmVybGF5RWwuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgICAgIHRoaXMub3ZlcmxheUVsLnJlbW92ZUF0dHJpYnV0ZSgnaGlkZGVuJylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gXHU4RkQwXHU4ODRDXHU0RTJEXHVGRjFBXHU2NjNFXHU1RjBGXHU5NjkwXHU4NUNGXHU4OTg2XHU3NkQ2XHU1QzQyXHVGRjA4XHU1NDI2XHU1MjE5XHU3QTdBXHU3Njg0XHU3RUREXHU1QkY5XHU1QjlBXHU0RjREXHU1QzQyXHU0RjFBXHU2MzIxXHU0RjRGIGlmcmFtZVx1RkYwOVxuICAgICAgdGhpcy5vdmVybGF5RWwuc2V0QXR0cmlidXRlKCdoaWRkZW4nLCAnJylcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXJ0aW5nKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3Bpbm5lcicgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnXHU2QjYzXHU1NzI4XHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IERTSCBXZWJcdTIwMjYnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLFxuICAgICAgdGV4dDogJ1x1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1OTcwMFx1NTIxRFx1NTlDQlx1NTMxNiBwcm9maWxlXHVGRjA4XHU3RUE2IDEwIFx1NzlEMlx1RkYwOVx1RkYxQlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MFx1NzUyOFx1NjVGNlx1NUMwNlx1ODFFQVx1NTJBOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScsXG4gICAgfSlcbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYWxlcnQtdHJpYW5nbGUnKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1tc2cnLCB0ZXh0OiBtZXNzYWdlIH0pXG4gICAgY29uc3QgcmV0cnkgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuJywgdGV4dDogJ1x1OTFDRFx1OEJENScgfSlcbiAgICByZXRyeS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RvcHBlZCgpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FuY2hvcicpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTY3MkFcdThGRDBcdTg4NEMnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsIHRleHQ6ICdcdTcwQjlcdTUxRkJcdTU0MkZcdTUyQThcdUZGMENcdTYyOEFcdTVCOThcdTY1QjkgRGVlcFNlZWsgSGFybmVzcyBcdTUwNUNcdTk3NjBcdThGREJcdTY3NjUnIH0pXG4gICAgY29uc3Qgc3RhcnQgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuIG1vZC1jdGEnLCB0ZXh0OiAnXHU1NDJGXHU1MkE4IERTSCcgfSlcbiAgICBzdGFydC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVsb2FkKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGN1cnJlbnRWYXVsdC50cyBcdTIwMTRcdTIwMTQgXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHQgKyBcdTVGNTNcdTUyNERcdTYyNTNcdTVGMDBcdTc2ODRcdTdCMTRcdThCQjBcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHUzMDAyXG4gKlxuICogZHNoLWRvY2sgXHU4REQxXHU1NzI4IE9ic2lkaWFuIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1ODBGRFx1NjJGRlx1NTIzMFx1NjcwMFx1Njc0M1x1NUEwMVx1NzY4NFx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1N0E5N1x1NTNFM1x1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NjVGNlx1RkYwQ1xuICogYGFwcC52YXVsdC5nZXROYW1lKClgICsgYEZpbGVTeXN0ZW1BZGFwdGVyLmdldEJhc2VQYXRoKClgXHVGRjA5XHU0RTBFXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU3QjE0XHU4QkIwXG4gKiBcdUZGMDhgYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKClgXHVGRjA5XHUzMDAyRFNIIFx1NzY4NFx1NURFNVx1NTE3N1x1NjNEMlx1NEVGNiBkc2gtdG9vbC1vYnNpZGlhbi12YXVsdFxuICogXHU4REQxXHU1NzI4XHU3MkVDXHU3QUNCIG5vZGUgXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU0RTI0XHU4MDA1XHU5MDFBXHU4RkM3XHU0RTAwXHU0RTJBXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU4OUUzXHU4MDI2XHU5MDFBXHU0RkUxXHVGRjFBXG4gKlxuICogICA8aG9tZWRpcj4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gICB7IG5hbWUsIHBhdGgsIGFjdGl2ZUZpbGU/LCB1cGRhdGVkQXQgfVxuICpcbiAqIC0gXHU0RjREXHU3RjZFXHU1NkZBXHU1QjlBXHU1NzI4IGB+Ly5kc2hgXHVGRjA4XHU0RTBFIGRzaC1kb2NrIFx1NzY4NCBEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdTY1RTBcdTUxNzNcdUZGMDlcdUZGMENcdTRFRkJcdTRGNTVcdTZBMjFcdTVGMEZcbiAqICAgXHU0RTBCIERTSCBcdTRGQTdcdTkwRkRcdThCRkJcdTVGOTdcdTUyMzBcdUZGMUJcbiAqIC0gYGFjdGl2ZUZpbGVgIFx1NjYyRiB2YXVsdCBcdTc2RjhcdTVCRjlcdThERUZcdTVGODRcdUZGMDhcdTY1RTAgYC5tZGAgXHU4QkVEXHU0RTQ5XHVGRjBDXHU1MzlGXHU2ODM3XHVGRjA5XHVGRjBDXHU1M0VBXHU1NzI4XHU3ODZFXHU1QjlFXHU2NzA5XHU2MjUzXHU1RjAwXHU3Njg0XG4gKiAgIFx1N0IxNFx1OEJCMFx1NjVGNlx1NTE5OVx1NTE2NVx1RkYxQkRTSCBcdTRGQTdcdTc2ODQgYHZhdWx0X2N1cnJlbnRgL2B2YXVsdF9hY3RpdmVgIFx1NjM2RVx1NkI2NFx1NEVDRVwiXHU3MzFDXHU2NzAwXHU4RkQxXHU2RDNCXHU4REMzXHU1RTkzXCJcbiAqICAgXHU1MzQ3XHU3RUE3XHU0RTNBXCJcdTc3MUZcdTAwQjdcdTVGNTNcdTUyNERcdTVFOTMgKyBcdTVGNTNcdTUyNERcdTdCMTRcdThCQjBcIlx1RkYxQlxuICogLSBcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdUZGMUFcdTZCQ0ZcdTRFMkEgT2JzaWRpYW4gXHU3QTk3XHU1M0UzXHVGRjA4XHU0RTNCXHU3QTk3XHU1M0UzIC8gcG9wb3V0XHVGRjA5XHU5MEZEXHU2NjJGXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU1NDA0XG4gKiAgIFx1ODFFQVx1NzZEMVx1NTQyQ1x1ODFFQVx1NURGMVx1NzY4NCB3aW5kb3cgZm9jdXMgXHUyMDE0XHUyMDE0IFx1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NkI2M1x1NjYyRlwiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXG4gKiAgIFx1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHVGRjFCXG4gKiAtIFx1NTkzMVx1OEQyNVx1OTc1OVx1OUVEOFx1RkYxQVx1NTE5OVx1NEUwRFx1OEZEQlx1RkYwOFx1Njc0M1x1OTY1MC9cdTc4QzFcdTc2RDhcdUZGMDlcdTUzRUEgY29uc29sZS53YXJuXHVGRjBDXHU3RUREXHU0RTBEXHU2MjUzXHU2NUFEXHU2M0QyXHU0RUY2XHU0RTNCXHU2RDQxXHU3QTBCXHVGRjFCXG4gKiAgIFx1NjU4N1x1NEVGNlx1NjM1Rlx1NTc0Ri9cdTdGM0FcdTU5MzFcdTY1RjYgRFNIIFx1NEZBN1x1NTZERVx1OTAwMFx1NTM5Rlx1NjcwOVx1NEZFMVx1NTNGN1x1RkYwQ1x1NTQxMVx1NTQwRVx1NTE3Q1x1NUJCOVx1NEUwRFx1ODhDNSBkc2gtZG9jayBcdTc2ODRcdTU3M0FcdTY2NkZcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBGaWxlU3lzdGVtQWRhcHRlciwgdHlwZSBBcHAgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTU2RkFcdTVCOUFcdTRGNERcdTdGNkVcdUZGMUF+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnLCAnY3VycmVudC12YXVsdC5qc29uJylcbn1cblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE4NVx1NUJCOVx1RkYwOERTSCBcdTRGQTdcdTUzRUFcdThCRkIgbmFtZS9wYXRoL2FjdGl2ZUZpbGVcdUZGMEN1cGRhdGVkQXQgXHU0RjlCXHU4QkNBXHU2NUFEXHVGRjA5ICovXG5leHBvcnQgaW50ZXJmYWNlIEN1cnJlbnRWYXVsdE1hcmtlciB7XG4gIG5hbWU6IHN0cmluZ1xuICBwYXRoOiBzdHJpbmdcbiAgLyoqIFx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYwOHZhdWx0IFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOVx1RkYxQlx1NjVFMFx1NjI1M1x1NUYwMFx1N0IxNFx1OEJCMFx1NjVGNlx1NEUwRFx1NTE5OVx1NkI2NFx1NUI1N1x1NkJCNSAqL1xuICBhY3RpdmVGaWxlPzogc3RyaW5nXG4gIC8qKlxuICAgKiBcdTY3MkNcdTdBOTdcdTUzRTMgT2JzaWRpYW4gQVBJIFx1Njg2NVx1NzY4NFx1NTczMFx1NTc0MFx1NEUwRSB0b2tlblx1RkYwOFx1Njg2NVx1OEZEMFx1ODg0Q1x1NjVGNlx1NTE5OVx1NTE2NVx1RkYwOVx1MzAwMnNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXHU0RTBCXG4gICAqIGRzaCB3ZWIgXHU2NjJGXHU1MTcxXHU0RUFCXHU2NzBEXHU1MkExXHUzMDAxZW52IFx1NkNFOFx1NTE2NVx1NTNFQVx1Njc2NVx1ODFFQVx1NjJDOVx1OEQ3N1x1N0E5N1x1NTNFM1x1RkYwQ0RTSCBcdTRGQTdcdTUxRURcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTYzMDkgdmF1bHQgXHU4REVGXHU1Rjg0XG4gICAqIFx1NTMzOVx1OTE0RFx1NTIzMFx1NkI2M1x1Nzg2RVx1N0E5N1x1NTNFM1x1NzY4NFx1Njg2NVx1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEYgZW52IFx1NURGMlx1OERCM1x1NTkxRlx1RkYwQ1x1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NjYyRlx1N0IyQ1x1NEU4Q1x1OTAxQVx1OTA1M1x1RkYwOVx1MzAwMlxuICAgKi9cbiAgYnJpZGdlVXJsPzogc3RyaW5nXG4gIGJyaWRnZVRva2VuPzogc3RyaW5nXG4gIHVwZGF0ZWRBdDogbnVtYmVyXG59XG5cbi8qKlxuICogXHU1MzlGXHU1QjUwXHU1MTk5XHU1MTY1XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjFBXHU1MTQ4XHU1MTk5XHU1NDBDXHU3NkVFXHU1RjU1IC50bXAgXHU1MThEIHJlbmFtZVx1RkYwQ1x1OTA3Rlx1NTE0RCBEU0ggXHU0RkE3XHU4QkZCXHU1MjMwXHU1MzRBXHU2MjJBXHU1MTg1XHU1QkI5XHUzMDAyXG4gKiBcdTU5MzFcdThEMjVcdTUzRUFcdTU0NEFcdThCNjZcdUZGMENcdTRFMERcdTYyOUJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKFxuICBuYW1lOiBzdHJpbmcsXG4gIHZhdWx0UGF0aDogc3RyaW5nLFxuICBhY3RpdmVGaWxlPzogc3RyaW5nLFxuICBicmlkZ2U/OiB7IHVybDogc3RyaW5nOyB0b2tlbjogc3RyaW5nIH0sXG4pOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlID0gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpXG4gICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShmaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBjb25zdCBwYXlsb2FkOiBDdXJyZW50VmF1bHRNYXJrZXIgPSB7IG5hbWUsIHBhdGg6IHZhdWx0UGF0aCwgdXBkYXRlZEF0OiBEYXRlLm5vdygpIH1cbiAgICBpZiAoYWN0aXZlRmlsZSkgcGF5bG9hZC5hY3RpdmVGaWxlID0gYWN0aXZlRmlsZVxuICAgIGlmIChicmlkZ2UpIHtcbiAgICAgIHBheWxvYWQuYnJpZGdlVXJsID0gYnJpZGdlLnVybFxuICAgICAgcGF5bG9hZC5icmlkZ2VUb2tlbiA9IGJyaWRnZS50b2tlblxuICAgIH1cbiAgICBjb25zdCB0bXAgPSBgJHtmaWxlfS50bXBgXG4gICAgZnMud3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpKVxuICAgIGZzLnJlbmFtZVN5bmModG1wLCBmaWxlKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtZG9ja10gXHU1MTk5XHU1MTY1IGN1cnJlbnQtdmF1bHQgXHU2ODA3XHU4QkIwXHU1OTMxXHU4RDI1JywgZXJyKVxuICB9XG59XG5cbi8qKlxuICogXHU0RUNFIE9ic2lkaWFuIGFwcCBcdTUzRDZcdTVGNTNcdTUyNEQgdmF1bHQgXHU1NDBEXHUzMDAxXHU2ODM5XHU4REVGXHU1Rjg0XHU0RTBFXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU3QjE0XHU4QkIwXHVGRjFCXHU1M0Q2XHU0RTBEXHU1MjMwXHU4RkQ0XHU1NkRFIG51bGxcdTMwMDJcbiAqXG4gKiBcdTc1MjggYGluc3RhbmNlb2YgRmlsZVN5c3RlbUFkYXB0ZXJgXHVGRjA4b2JzaWRpYW4uZC50czoyOTk2XHVGRjBDXHU2ODRDXHU5NzYyXHU3QUVGXHU1QjlFXHU3M0IwXHVGRjA5XHU2NkZGXHU0RUUzXG4gKiBcdTY1RTdcdTc2ODQgYGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfWAgXHU1RjNBXHU4RjZDXHVGRjFBXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4XHVGRjBDXHU0RTE0XHU3OUZCXHU1MkE4XHU3QUVGXG4gKiBcdUZGMDhDYXBhY2l0b3JBZGFwdGVyXHVGRjA5XHU4MUVBXHU3MTM2XHU4RkQ0XHU1NkRFIG51bGxcdTMwMDJGaWxlU3lzdGVtQWRhcHRlciBcdTRFQ0VcdTVCOThcdTY1QjkgYG9ic2lkaWFuYFxuICogXHU2QTIxXHU1NzU3XHU1QkZDXHU1MTY1XHVGRjA4XHU2M0QyXHU0RUY2XHU3Njg0XHU4RkQwXHU4ODRDXHU2NUY2XHU1QkJGXHU0RTNCXHU2Q0U4XHU1MTY1XHVGRjA5XHVGRjBDXHU0RTBFIGRzaC1kb2NrIFx1NUI5RVx1OTY0NVx1N0YxNlx1OEJEMVx1NzY4NCBvYnNpZGlhbkAxLjEzLjFcbiAqIFx1N0M3Qlx1NTc4Qlx1NEUwMFx1ODFGNFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0SW5mbyhhcHA6IEFwcCk6IHsgbmFtZTogc3RyaW5nOyBwYXRoOiBzdHJpbmc7IGFjdGl2ZUZpbGU/OiBzdHJpbmcgfSB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IGFkYXB0ZXIgPSBhcHAudmF1bHQuYWRhcHRlclxuICAgIGlmICghKGFkYXB0ZXIgaW5zdGFuY2VvZiBGaWxlU3lzdGVtQWRhcHRlcikpIHJldHVybiBudWxsXG4gICAgY29uc3QgYWN0aXZlRmlsZSA9IGFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpPy5wYXRoXG4gICAgY29uc3QgaW5mbzogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZzsgYWN0aXZlRmlsZT86IHN0cmluZyB9ID0ge1xuICAgICAgbmFtZTogYXBwLnZhdWx0LmdldE5hbWUoKSxcbiAgICAgIHBhdGg6IGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKSxcbiAgICB9XG4gICAgaWYgKGFjdGl2ZUZpbGUpIGluZm8uYWN0aXZlRmlsZSA9IGFjdGl2ZUZpbGVcbiAgICByZXR1cm4gaW5mb1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG4iLCAiLyoqXG4gKiBicmlkZ2VTZXJ2ZXIudHMgXHUyMDE0XHUyMDE0IE9ic2lkaWFuIEFQSSBcdTY4NjVcdTc2ODQgSFRUUCBcdTY3MERcdTUyQTFcdTU2NjhcdUZGMDhcdTdFQUYgTm9kZVx1RkYwQ1x1OTZGNiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMENcbiAqIFx1NTNFRlx1ODhBQiBzY3JpcHRzL3Ntb2tlLm1qcyBcdTc2RjRcdTYzQTVcdTUyQTBcdThGN0RcdTUxOTJcdTcwREZcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdThERUZcdTc1MzFcdUZGMUEvaGVhbHRoICsgL3YxLypcdUZGMDhcdTg5QzEgYnJpZGdlVHlwZXMudHNcdUZGMDlcdTMwMDJcdTkyNzRcdTY3NDNcdUZGMUFcdTk2NjQgL2hlYWx0aCBcdTU5MTZcdTUxNjhcdTkwRThcdTg5ODFcdTZDNDJcbiAqIGBBdXRob3JpemF0aW9uOiBCZWFyZXIgPHRva2VuPmBcdUZGMDgvaGVhbHRoIFx1NEU1Rlx1ODk4MVx1RkYwQ1x1NUJBMlx1NjIzN1x1N0FFRlx1NTlDQlx1N0VDOFx1NUUyNiB0b2tlblx1RkYwOVx1MzAwMlxuICogXHU5NTE5XHU4QkVGXHU3RURGXHU0RTAwIGB7IGVycm9yOiB7IGNvZGUsIG1lc3NhZ2UgfSB9YFx1RkYxQmJvZHkgXHU5RUQ4XHU4QkE0XHU0RTBBXHU5NjUwIDJNQlx1MzAwMlxuICpcbiAqIFx1N0FFRlx1NTNFM1x1NTFCMlx1N0E4MVx1RkYxQWNyZWF0ZUJyaWRnZVNlcnZlciBcdTRFQ0VcdTY3MUZcdTY3MUJcdTdBRUZcdTUzRTNcdThENzdcdTk4N0FcdTVFRjZcdTY3MDBcdTU5MUEgMTAgXHU0RTJBXHU3QUVGXHU1M0UzXHVGRjBDXHU1MTY4XHU5MEU4XHU1OTMxXHU4RDI1XHU2MjREXHU2MjlCXHU5NTE5XG4gKiBcdUZGMDhPYnNpZGlhbiBcdTU5MUFcdTdBOTdcdTUzRTMvXHU1OTFBXHU1RTkzXHU1RTc2XHU1M0QxXHU2NUY2XHU2ODY1XHU3QUVGXHU1M0UzXHU1MDc2XHU1M0QxXHU3OEIwXHU2NDlFXHU0RTVGXHU4MEZEXHU4MUVBXHU1MkE4XHU5MDdGXHU1RjAwXHVGRjA5XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgY3JlYXRlU2VydmVyLCB0eXBlIEluY29taW5nTWVzc2FnZSwgdHlwZSBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ25vZGU6aHR0cCdcbmltcG9ydCB7IHRpbWluZ1NhZmVFcXVhbCB9IGZyb20gJ25vZGU6Y3J5cHRvJ1xuaW1wb3J0IHsgQnJpZGdlRXJyb3JDb2RlLCB0eXBlIEJyaWRnZVNlcnZpY2UgfSBmcm9tICcuL2JyaWRnZVR5cGVzLmpzJ1xuXG5leHBvcnQgY2xhc3MgQnJpZGdlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIHJlYWRvbmx5IGNvZGU6IHN0cmluZ1xuICByZWFkb25seSBzdGF0dXM6IG51bWJlclxuICBjb25zdHJ1Y3Rvcihjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgc3RhdHVzID0gNDAwKSB7XG4gICAgc3VwZXIobWVzc2FnZSlcbiAgICB0aGlzLm5hbWUgPSAnQnJpZGdlRXJyb3InXG4gICAgdGhpcy5jb2RlID0gY29kZVxuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzXG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VTZXJ2ZXJPcHRpb25zIHtcbiAgaG9zdDogc3RyaW5nXG4gIHBvcnQ6IG51bWJlclxuICB0b2tlbjogc3RyaW5nXG4gIHNlcnZpY2U6IEJyaWRnZVNlcnZpY2VcbiAgLyoqIFx1OEJGN1x1NkM0Mlx1NEY1M1x1NEUwQVx1OTY1MFx1RkYwOFx1NUI1N1x1ODI4Mlx1RkYwOVx1RkYwQ1x1OUVEOFx1OEJBNCAyTUIgKi9cbiAgbWF4Qm9keUJ5dGVzPzogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlU2VydmVySGFuZGxlIHtcbiAgcG9ydDogbnVtYmVyXG4gIGNsb3NlKCk6IFByb21pc2U8dm9pZD5cbn1cblxuY29uc3QgTUFYX1BPUlRfVFJJRVMgPSAxMFxuY29uc3QgREVGQVVMVF9NQVhfQk9EWSA9IDIgKiAxMDI0ICogMTAyNFxuXG5mdW5jdGlvbiB0b2tlbkVxdWFscyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGNvbnN0IGFiID0gQnVmZmVyLmZyb20oYSlcbiAgICBjb25zdCBiYiA9IEJ1ZmZlci5mcm9tKGIpXG4gICAgcmV0dXJuIGFiLmxlbmd0aCA9PT0gYmIubGVuZ3RoICYmIHRpbWluZ1NhZmVFcXVhbChhYiwgYmIpXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIHNlbmRKc29uKHJlczogU2VydmVyUmVzcG9uc2UsIHN0YXR1czogbnVtYmVyLCBkYXRhOiB1bmtub3duKTogdm9pZCB7XG4gIGNvbnN0IGJvZHkgPSBKU09OLnN0cmluZ2lmeShkYXRhKVxuICByZXMud3JpdGVIZWFkKHN0YXR1cywgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnLCAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZScgfSlcbiAgcmVzLmVuZChib2R5KVxufVxuXG5mdW5jdGlvbiBzZW5kRXJyb3IocmVzOiBTZXJ2ZXJSZXNwb25zZSwgZXJyOiB1bmtub3duKTogdm9pZCB7XG4gIGlmIChlcnIgaW5zdGFuY2VvZiBCcmlkZ2VFcnJvcikge1xuICAgIHNlbmRKc29uKHJlcywgZXJyLnN0YXR1cywgeyBlcnJvcjogeyBjb2RlOiBlcnIuY29kZSwgbWVzc2FnZTogZXJyLm1lc3NhZ2UgfSB9KVxuICAgIHJldHVyblxuICB9XG4gIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICBzZW5kSnNvbihyZXMsIDUwMCwgeyBlcnJvcjogeyBjb2RlOiBCcmlkZ2VFcnJvckNvZGUuSU5URVJOQUwsIG1lc3NhZ2U6IGBcdTY4NjVcdTUxODVcdTkwRThcdTk1MTlcdThCRUY6ICR7bXNnfWAgfSB9KVxufVxuXG5mdW5jdGlvbiByZWFkQm9keShyZXE6IEluY29taW5nTWVzc2FnZSwgbWF4Qnl0ZXM6IG51bWJlcik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdXG4gICAgbGV0IHNpemUgPSAwXG4gICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgIHNpemUgKz0gY2h1bmsubGVuZ3RoXG4gICAgICBpZiAoc2l6ZSA+IG1heEJ5dGVzKSB7XG4gICAgICAgIHJlamVjdChuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLlRPT19MQVJHRSwgYFx1OEJGN1x1NkM0Mlx1NEY1M1x1OEQ4NVx1OEZDNyAke21heEJ5dGVzfSBcdTVCNTdcdTgyODJcdTRFMEFcdTk2NTBgLCA0MTMpKVxuICAgICAgICByZXEuZGVzdHJveSgpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY2h1bmtzLnB1c2goY2h1bmspXG4gICAgfSlcbiAgICByZXEub24oJ2VuZCcsICgpID0+IHJlc29sdmUoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpKVxuICAgIHJlcS5vbignZXJyb3InLCAoZXJyKSA9PiByZWplY3QoZXJyKSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gcGFyc2VKc29uPFQ+KHJhdzogc3RyaW5nKTogVCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmF3KSBhcyBUXG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuQkFEX1JFUVVFU1QsICdcdThCRjdcdTZDNDJcdTRGNTNcdTRFMERcdTY2MkZcdTU0MDhcdTZDRDUgSlNPTicsIDQwMClcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWVyeUJvb2wodjogc3RyaW5nIHwgbnVsbCk6IGJvb2xlYW4gfCB1bmRlZmluZWQge1xuICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIHVuZGVmaW5lZFxuICByZXR1cm4gdiA9PT0gJzEnIHx8IHYgPT09ICd0cnVlJyB8fCB2ID09PSAneWVzJ1xufVxuXG5mdW5jdGlvbiBxdWVyeU51bSh2OiBzdHJpbmcgfCBudWxsKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHYgPT09IG51bGwgfHwgdi50cmltKCkgPT09ICcnKSByZXR1cm4gdW5kZWZpbmVkXG4gIGNvbnN0IG4gPSBOdW1iZXIodilcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShuKSA/IG4gOiB1bmRlZmluZWRcbn1cblxuLyoqIFx1OTAxN1x1NTNGN1x1NTIwNlx1OTY5NFx1NzY4NCBpZ25vcmVEaXJzXHVGRjA4XHU1QkEyXHU2MjM3XHU3QUVGXHU2MjhBIGNvbmZpZy5pZ25vcmVEaXJzIFx1NjJGQ1x1OEZEQlx1Njc2NVx1RkYwOSAqL1xuZnVuY3Rpb24gcXVlcnlMaXN0KHY6IHN0cmluZyB8IG51bGwpOiBzdHJpbmdbXSB7XG4gIGlmICghdikgcmV0dXJuIFtdXG4gIHJldHVybiB2LnNwbGl0KCcsJykubWFwKChzKSA9PiBzLnRyaW0oKSkuZmlsdGVyKChzKSA9PiBzLmxlbmd0aCA+IDApXG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVRdWVyeShwYXJhbXM6IFVSTFNlYXJjaFBhcmFtcywga2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB2ID0gcGFyYW1zLmdldChrZXkpXG4gIGlmICghdiB8fCB2LnRyaW0oKSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLkJBRF9SRVFVRVNULCBgXHU3RjNBXHU1QzExXHU1RkM1XHU1ODZCXHU1M0MyXHU2NTcwICR7a2V5fWAsIDQwMClcbiAgfVxuICByZXR1cm4gdi50cmltKClcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUJyaWRnZVNlcnZlcihvcHRzOiBCcmlkZ2VTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxCcmlkZ2VTZXJ2ZXJIYW5kbGU+IHtcbiAgY29uc3QgeyBzZXJ2aWNlIH0gPSBvcHRzXG4gIGNvbnN0IG1heEJvZHkgPSBvcHRzLm1heEJvZHlCeXRlcyA/PyBERUZBVUxUX01BWF9CT0RZXG5cbiAgY29uc3Qgc2VydmVyID0gY3JlYXRlU2VydmVyKGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICAvLyAtLS0tIFx1OTI3NFx1Njc0M1x1RkYwOFx1NjI0MFx1NjcwOVx1N0FFRlx1NzBCOVx1RkYwOSAtLS0tXG4gICAgICBjb25zdCBoZWFkZXIgPSByZXEuaGVhZGVycy5hdXRob3JpemF0aW9uID8/ICcnXG4gICAgICBjb25zdCB0b2tlbiA9IGhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykgPyBoZWFkZXIuc2xpY2UoNykgOiAnJ1xuICAgICAgaWYgKCF0b2tlbkVxdWFscyh0b2tlbiwgb3B0cy50b2tlbikpIHtcbiAgICAgICAgc2VuZEpzb24ocmVzLCA0MDEsIHsgZXJyb3I6IHsgY29kZTogQnJpZGdlRXJyb3JDb2RlLlVOQVVUSE9SSVpFRCwgbWVzc2FnZTogJ1x1NjVFMFx1NjU0OFx1NjIxNlx1N0YzQVx1NTkzMVx1NzY4NFx1Njg2NSB0b2tlblx1RkYwOERTSF9PQlNJRElBTl9CUklER0VfVE9LRU5cdUZGMDknIH0gfSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCA/PyAnLycsIGBodHRwOi8vJHtvcHRzLmhvc3R9OiR7b3B0cy5wb3J0fWApXG4gICAgICBjb25zdCBwYXRoID0gdXJsLnBhdGhuYW1lXG4gICAgICBjb25zdCBxID0gdXJsLnNlYXJjaFBhcmFtc1xuXG4gICAgICAvLyAtLS0tIFx1NTA2NVx1NUVCN1x1NjhDMFx1NjdFNSAtLS0tXG4gICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9oZWFsdGgnKSB7XG4gICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCB7IG9rOiB0cnVlLCB2ZXJzaW9uOiBzZXJ2aWNlLmluZm8udmVyc2lvbiwgdmF1bHQ6IHsgbmFtZTogc2VydmljZS5pbmZvLm5hbWUsIHBhdGg6IHNlcnZpY2UuaW5mby5wYXRoIH0gfSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIC0tLS0gR0VUIFx1N0FFRlx1NzBCOSAtLS0tXG4gICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvY3VycmVudCcpIHtcbiAgICAgICAgICBzZW5kSnNvbihyZXMsIDIwMCwgc2VydmljZS5jdXJyZW50KCkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvbm90ZXMnKSB7XG4gICAgICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIHNlcnZpY2UubGlzdE5vdGVzKHtcbiAgICAgICAgICAgIGZvbGRlcjogcS5nZXQoJ2ZvbGRlcicpID8/IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGFsbDogcXVlcnlCb29sKHEuZ2V0KCdhbGwnKSkgPz8gZmFsc2UsXG4gICAgICAgICAgICBpZ25vcmVEaXJzOiBxdWVyeUxpc3QocS5nZXQoJ2lnbm9yZScpKSxcbiAgICAgICAgICB9KSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBpZiAocGF0aCA9PT0gJy92MS9mb2xkZXJzJykge1xuICAgICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCBzZXJ2aWNlLmxpc3RGb2xkZXJzKHtcbiAgICAgICAgICAgIGZvbGRlcjogcS5nZXQoJ2ZvbGRlcicpID8/IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGlnbm9yZURpcnM6IHF1ZXJ5TGlzdChxLmdldCgnaWdub3JlJykpLFxuICAgICAgICAgIH0pKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoID09PSAnL3YxL25vdGUnKSB7XG4gICAgICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIGF3YWl0IHNlcnZpY2UucmVhZE5vdGUocmVxdWlyZVF1ZXJ5KHEsICdwYXRoJykpKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoID09PSAnL3YxL21ldGFkYXRhJykge1xuICAgICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCBhd2FpdCBzZXJ2aWNlLm1ldGFkYXRhKHJlcXVpcmVRdWVyeShxLCAncGF0aCcpKSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBpZiAocGF0aCA9PT0gJy92MS9mcm9udG1hdHRlcicpIHtcbiAgICAgICAgICBzZW5kSnNvbihyZXMsIDIwMCwgYXdhaXQgc2VydmljZS5mcm9udG1hdHRlcihyZXF1aXJlUXVlcnkocSwgJ3BhdGgnKSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvYmFja2xpbmtzJykge1xuICAgICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCBhd2FpdCBzZXJ2aWNlLmJhY2tsaW5rcyh7XG4gICAgICAgICAgICBwYXRoOiBxLmdldCgncGF0aCcpID8/IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHRpdGxlOiBxLmdldCgndGl0bGUnKSA/PyB1bmRlZmluZWQsXG4gICAgICAgICAgICBmb3JtYXQ6IHEuZ2V0KCdmb3JtYXQnKSA9PT0gJ21hcmtkb3duJyA/ICdtYXJrZG93bicgOiBxLmdldCgnZm9ybWF0JykgPT09ICdhbGwnID8gJ2FsbCcgOiAnd2lraWxpbmsnLFxuICAgICAgICAgIH0pKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9ICAgICAgICBpZiAocGF0aCA9PT0gJy92MS9zZWFyY2gnKSB7XG4gICAgICAgICAgY29uc3QgcXEgPSByZXF1aXJlUXVlcnkocSwgJ3EnKVxuICAgICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCBhd2FpdCBzZXJ2aWNlLnNlYXJjaCh7XG4gICAgICAgICAgICBxOiBxcSxcbiAgICAgICAgICAgIGZvbGRlcjogcS5nZXQoJ2ZvbGRlcicpID8/IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGxpbWl0OiBxdWVyeU51bShxLmdldCgnbGltaXQnKSksXG4gICAgICAgICAgICByZWdleDogcXVlcnlCb29sKHEuZ2V0KCdyZWdleCcpKSxcbiAgICAgICAgICAgIGNhc2Vfc2Vuc2l0aXZlOiBxdWVyeUJvb2wocS5nZXQoJ2Nhc2Vfc2Vuc2l0aXZlJykpLFxuICAgICAgICAgICAgbWF0Y2hfYWxsOiBxdWVyeUJvb2wocS5nZXQoJ21hdGNoX2FsbCcpKSxcbiAgICAgICAgICAgIGlnbm9yZURpcnM6IHF1ZXJ5TGlzdChxLmdldCgnaWdub3JlJykpLFxuICAgICAgICAgIH0pKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoID09PSAnL3YxL3RhZ3MnKSB7XG4gICAgICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIGF3YWl0IHNlcnZpY2Uuc2VhcmNoVGFncyh7XG4gICAgICAgICAgICB0YWc6IHJlcXVpcmVRdWVyeShxLCAndGFnJyksXG4gICAgICAgICAgICBmb2xkZXI6IHEuZ2V0KCdmb2xkZXInKSA/PyB1bmRlZmluZWQsXG4gICAgICAgICAgICBsaW1pdDogcXVlcnlOdW0ocS5nZXQoJ2xpbWl0JykpLFxuICAgICAgICAgICAgaWdub3JlRGlyczogcXVlcnlMaXN0KHEuZ2V0KCdpZ25vcmUnKSksXG4gICAgICAgICAgfSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvYWxsLXRhZ3MnKSB7XG4gICAgICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIGF3YWl0IHNlcnZpY2UuYWxsVGFncyh7XG4gICAgICAgICAgICBmb2xkZXI6IHEuZ2V0KCdmb2xkZXInKSA/PyB1bmRlZmluZWQsXG4gICAgICAgICAgICBpZ25vcmVEaXJzOiBxdWVyeUxpc3QocS5nZXQoJ2lnbm9yZScpKSxcbiAgICAgICAgICB9KSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLk5PVF9GT1VORCwgYFx1NjcyQVx1NzdFNVx1N0FFRlx1NzBCOSAke3JlcS5tZXRob2R9ICR7cGF0aH1gLCA0MDQpXG4gICAgICB9XG5cbiAgICAgIC8vIC0tLS0gUE9TVCBcdTdBRUZcdTcwQjkgLS0tLVxuICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICBjb25zdCByYXcgPSBhd2FpdCByZWFkQm9keShyZXEsIG1heEJvZHkpXG4gICAgICAgIGlmIChwYXRoID09PSAnL3YxL3dyaXRlJykge1xuICAgICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCBhd2FpdCBzZXJ2aWNlLndyaXRlTm90ZShwYXJzZUpzb248aW1wb3J0KCcuL2JyaWRnZVR5cGVzLmpzJykuQnJpZGdlV3JpdGVSZXF1ZXN0PihyYXcpKSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBpZiAocGF0aCA9PT0gJy92MS9lZGl0Jykge1xuICAgICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCBhd2FpdCBzZXJ2aWNlLmVkaXROb3RlKHBhcnNlSnNvbjxpbXBvcnQoJy4vYnJpZGdlVHlwZXMuanMnKS5CcmlkZ2VFZGl0UmVxdWVzdD4ocmF3KSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvZnJvbnRtYXR0ZXInKSB7XG4gICAgICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIGF3YWl0IHNlcnZpY2UudXBkYXRlRnJvbnRtYXR0ZXIocGFyc2VKc29uPGltcG9ydCgnLi9icmlkZ2VUeXBlcy5qcycpLkJyaWRnZUZyb250bWF0dGVyVXBkYXRlUmVxdWVzdD4ocmF3KSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvcmVuYW1lJykge1xuICAgICAgICAgIHNlbmRKc29uKHJlcywgMjAwLCBhd2FpdCBzZXJ2aWNlLnJlbmFtZShwYXJzZUpzb248aW1wb3J0KCcuL2JyaWRnZVR5cGVzLmpzJykuQnJpZGdlUmVuYW1lUmVxdWVzdD4ocmF3KSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvdHJhc2gnKSB7XG4gICAgICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIGF3YWl0IHNlcnZpY2UudHJhc2gocGFyc2VKc29uPGltcG9ydCgnLi9icmlkZ2VUeXBlcy5qcycpLkJyaWRnZVRyYXNoUmVxdWVzdD4ocmF3KSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggPT09ICcvdjEvb3BlbicpIHtcbiAgICAgICAgICBzZW5kSnNvbihyZXMsIDIwMCwgYXdhaXQgc2VydmljZS5vcGVuTm90ZShwYXJzZUpzb248aW1wb3J0KCcuL2JyaWRnZVR5cGVzLmpzJykuQnJpZGdlT3BlblJlcXVlc3Q+KHJhdykpKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoID09PSAnL3YxL2xpbmsnKSB7XG4gICAgICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIGF3YWl0IHNlcnZpY2Uubm90ZUxpbmsocGFyc2VKc29uPGltcG9ydCgnLi9icmlkZ2VUeXBlcy5qcycpLkJyaWRnZUxpbmtSZXF1ZXN0PihyYXcpKSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLk5PVF9GT1VORCwgYFx1NjcyQVx1NzdFNVx1N0FFRlx1NzBCOSAke3JlcS5tZXRob2R9ICR7cGF0aH1gLCA0MDQpXG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuTUVUSE9EX05PVF9BTExPV0VELCBgXHU0RTBEXHU2NTJGXHU2MzAxXHU3Njg0XHU4QkY3XHU2QzQyXHU2NUI5XHU2Q0Q1ICR7cmVxLm1ldGhvZH1gLCA0MDUpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzZW5kRXJyb3IocmVzLCBlcnIpXG4gICAgfVxuICB9KVxuXG4gIC8vIFx1N0FFRlx1NTNFM1x1OTg3QVx1NUVGNlx1N0VEMVx1NUI5QVx1RkYxQUVBRERSSU5VU0UgXHU4MUVBXHU1MkE4XHU1QzFEXHU4QkQ1XHU0RTBCXHU0RTAwXHU0RTJBXHVGRjBDXHU2NzAwXHU1OTFBIE1BWF9QT1JUX1RSSUVTIFx1NkIyMVx1MzAwMlxuICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9QT1JUX1RSSUVTOyBpKyspIHtcbiAgICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ICsgaVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHNlcnZlci5vbmNlKCdlcnJvcicsIHJlamVjdClcbiAgICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCBvcHRzLmhvc3QsICgpID0+IHtcbiAgICAgICAgICBzZXJ2ZXIucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgcmVqZWN0KVxuICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBvcnQsXG4gICAgICAgIGNsb3NlOiAoKSA9PiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4gc2VydmVyLmNsb3NlKCgpID0+IHJlc29sdmUoKSkpLFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnIgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlXG4gICAgICBpZiAoY29kZSAhPT0gJ0VBRERSSU5VU0UnICYmIGNvZGUgIT09ICdFQUNDRVMnKSB0aHJvdyBlcnJcbiAgICAgIGlmIChpID09PSBNQVhfUE9SVF9UUklFUyAtIDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyaWRnZUVycm9yKEJyaWRnZUVycm9yQ29kZS5JTlRFUk5BTCwgYFx1Njg2NVx1N0FFRlx1NTNFMyAke29wdHMucG9ydH1cdTIwMTMke29wdHMucG9ydCArIE1BWF9QT1JUX1RSSUVTIC0gMX0gXHU1NzQ3XHU4OEFCXHU1MzYwXHU3NTI4XHVGRjBDXHU2NUUwXHU2Q0Q1XHU1NDJGXHU1MkE4YCwgNTAwKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLklOVEVSTkFMLCAnXHU2ODY1XHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JywgNTAwKVxufVxuIiwgIi8qKlxuICogYnJpZGdlVHlwZXMudHMgXHUyMDE0XHUyMDE0IE9ic2lkaWFuIEFQSSBcdTY4NjVcdTc2ODRcdTUzNEZcdThCQUVcdTdDN0JcdTU3OEJcdTRFMEVcdTk1MTlcdThCRUZcdTc4MDFcdUZGMDhcdTdFQUZcdTdDN0JcdTU3OEJcdUZGMENcdTk2RjZcdTRGOURcdThENTZcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTY4NjVcdTYyOEEgZHNoLWRvY2tcdUZGMDhPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTUxODVcdUZGMENcdTYyRkZcdTVGOTdcdTUyMzAgYXBwLnZhdWx0IC8gbWV0YWRhdGFDYWNoZSAvXG4gKiBmaWxlTWFuYWdlciAvIHdvcmtzcGFjZSBcdTUxNjhcdTU5NTcgQVBJXHVGRjA5XHU3Njg0XHU4OUUzXHU2NzkwXHU3RUQzXHU2NzlDXHVGRjBDXHU3RUNGIDEyNy4wLjAuMSBcdTU2REVcdTczQUYgSFRUUCBcdTY2QjRcdTk3MzJcdTdFRDlcbiAqIERTSCBcdTRGQTdcdTc2ODRcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjYgZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHRcdUZGMENcdTY2RkZcdTYzNjJcdTYzODlcdTVERTVcdTUxNzdcdTRGQTdcdTc2ODRcdTZCNjNcdTUyMTlcdThGRDFcdTRGM0NcdTVCOUVcdTczQjBcdTMwMDJcbiAqXG4gKiBcdTdFQTZcdTVCOUFcdUZGMDhcdTRFMEVcdThCQkVcdThCQTFcdTY1ODdcdTY4NjMgXHUwMEE3MyBCMSBcdTRFMDBcdTgxRjRcdUZGMDlcdUZGMUFcbiAqIC0gXHU0RUM1XHU3NkQxXHU1NDJDIDEyNy4wLjAuMVx1RkYxQlx1NTQyRlx1NTJBOFx1NjVGNlx1NzUxRlx1NjIxMFx1NEUwMFx1NkIyMVx1NjAyNyB0b2tlblx1RkYwQ1x1N0VDRiBEU0hfT0JTSURJQU5fQlJJREdFX1RPS0VOXG4gKiAgIGVudiBcdTZDRThcdTUxNjUgRFNIIFx1OEZEQlx1N0EwQlx1RkYwQ1x1Njg2NVx1NjJEMlx1N0VERFx1NjVFMCB0b2tlbiBcdThCRjdcdTZDNDJcdUZGMUJcbiAqIC0gXHU5NTE5XHU4QkVGXHU1NENEXHU1RTk0XHU3RURGXHU0RTAwXHU0RTNBIGB7IGVycm9yOiB7IGNvZGUsIG1lc3NhZ2UgfSB9YFx1RkYwQ2NvZGUgXHU1OTBEXHU3NTI4XHU1REU1XHU1MTc3XHU0RkE3XHU3Njg0XHU3QTMzXHU1QjlBXHU4QkNEXHU4ODY4XG4gKiAgIFx1RkYwOFZBVUxUXyogLyBGU18qXHVGRjA5XHVGRjBDXHU1QkEyXHU2MjM3XHU3QUVGXHU1M0VGXHU3NkY0XHU2M0E1XHU2NjIwXHU1QzA0XHU2MjEwIFZhdWx0RXJyb3JcdUZGMUJcbiAqIC0gXHU2MjQwXHU2NzA5XHU4REVGXHU1Rjg0XHU1NzQ3XHU0RTNBIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1NzY4NFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOC8gXHU1MjA2XHU5Njk0XHVGRjBDXHU0RTBEXHU1NDJCXHU1MjREXHU1QkZDXHU2NTlDXHU2NzYwXHVGRjA5XHUzMDAyXG4gKi9cblxuLyoqIFx1Njg2NVx1NzY4NFx1NjcwRFx1NTJBMVx1N0FFRlx1NUI5RVx1NzNCMFx1OTc2Mlx1RkYwOGJyaWRnZVNlcnZlci50cyBcdTZEODhcdThEMzlcdUZGMENvYnNpZGlhblNlcnZpY2UudHMgXHU1QjlFXHU3M0IwXHVGRjA5ICovXG5leHBvcnQgaW50ZXJmYWNlIEJyaWRnZVNlcnZpY2Uge1xuICAvKiogXHU2NzBEXHU1MkExXHU4RUFCXHU0RUZEXHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1L1x1NTA2NVx1NUVCN1x1NjhDMFx1NjdFNVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICByZWFkb25seSBpbmZvOiB7IG5hbWU6IHN0cmluZzsgcGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkOyB2ZXJzaW9uOiBzdHJpbmcgfVxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NEUwRVx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYwOE9ic2lkaWFuIFx1ODlDNlx1ODlEMlx1RkYwQ1x1Njc0M1x1NUEwMVx1RkYwOSAqL1xuICBjdXJyZW50KCk6IHsgbmFtZTogc3RyaW5nOyBwYXRoOiBzdHJpbmc7IGFjdGl2ZUZpbGU/OiBzdHJpbmc7IHVwZGF0ZWRBdDogbnVtYmVyIH1cbiAgbGlzdE5vdGVzKG9wdHM6IHsgZm9sZGVyPzogc3RyaW5nOyBhbGw/OiBib29sZWFuOyBpZ25vcmVEaXJzOiBzdHJpbmdbXSB9KTogeyB0b3RhbDogbnVtYmVyOyBub3RlczogQnJpZGdlTm90ZUluZm9bXSB9XG4gIGxpc3RGb2xkZXJzKG9wdHM6IHsgZm9sZGVyPzogc3RyaW5nOyBpZ25vcmVEaXJzOiBzdHJpbmdbXSB9KTogUHJvbWlzZTx7IHRvdGFsOiBudW1iZXI7IGZvbGRlcnM6IEJyaWRnZUZvbGRlclN0YXRbXSB9PlxuICByZWFkTm90ZShyZWw6IHN0cmluZyk6IFByb21pc2U8eyBwYXRoOiBzdHJpbmc7IGNvbnRlbnQ6IHN0cmluZzsgc2l6ZT86IG51bWJlcjsgbXRpbWU/OiBudW1iZXIgfT5cbiAgd3JpdGVOb3RlKHJlcTogQnJpZGdlV3JpdGVSZXF1ZXN0KTogUHJvbWlzZTxCcmlkZ2VXcml0ZVJlc3VsdD5cbiAgZWRpdE5vdGUocmVxOiBCcmlkZ2VFZGl0UmVxdWVzdCk6IFByb21pc2U8QnJpZGdlRWRpdFJlc3VsdD5cbiAgLyoqIFx1N0VGQ1x1NTQwOFx1NTE0M1x1NEZFMVx1NjA2Rlx1RkYxQWZyb250bWF0dGVyL3RhZ3MvYWxpYXNlcy9cdTUxRkFcdTk0RkUvXHU2NzJBXHU4OUUzXHU2NzkwXHU5NEZFXHU2M0E1XHU2NTcwICovXG4gIG1ldGFkYXRhKHJlbDogc3RyaW5nKTogUHJvbWlzZTxCcmlkZ2VNZXRhZGF0YVJlc3VsdD5cbiAgYmFja2xpbmtzKHJlcTogQnJpZGdlQmFja2xpbmtzUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlQmFja2xpbmtzUmVzdWx0PlxuICBzZWFyY2gocmVxOiBCcmlkZ2VTZWFyY2hSZXF1ZXN0KTogUHJvbWlzZTx7IHRvdGFsOiBudW1iZXI7IGhpdHM6IEJyaWRnZUhpdFtdIH0+XG4gIHNlYXJjaFRhZ3MocmVxOiBCcmlkZ2VUYWdzUmVxdWVzdCk6IFByb21pc2U8eyB0b3RhbDogbnVtYmVyOyBoaXRzOiBCcmlkZ2VUYWdIaXRbXSB9PlxuICBmcm9udG1hdHRlcihyZWw6IHN0cmluZyk6IFByb21pc2U8QnJpZGdlRnJvbnRtYXR0ZXJSZXN1bHQ+XG4gIHVwZGF0ZUZyb250bWF0dGVyKHJlcTogQnJpZGdlRnJvbnRtYXR0ZXJVcGRhdGVSZXF1ZXN0KTogUHJvbWlzZTxCcmlkZ2VGcm9udG1hdHRlclVwZGF0ZVJlc3VsdD5cbiAgcmVuYW1lKHJlcTogQnJpZGdlUmVuYW1lUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlUmVuYW1lUmVzdWx0PlxuICAvKiogXHU1NkRFXHU2NTM2XHU3QUQ5XHU1MjIwXHU5NjY0XHVGRjA4ZmlsZU1hbmFnZXIudHJhc2hGaWxlXHVGRjBDXHU2NUU3XHU3MjQ4XHU5NjREXHU3RUE3IHZhdWx0LnRyYXNoXHVGRjA5ICovXG4gIHRyYXNoKHJlcTogQnJpZGdlVHJhc2hSZXF1ZXN0KTogUHJvbWlzZTxCcmlkZ2VUcmFzaFJlc3VsdD5cbiAgLyoqIFx1NTcyOCBPYnNpZGlhbiBcdTRFMkRcdTYyNTNcdTVGMDAvXHU4MDVBXHU3MTI2XHU3QjE0XHU4QkIwXHVGRjA4d29ya3NwYWNlLm9wZW5MaW5rVGV4dFx1RkYwOSAqL1xuICBvcGVuTm90ZShyZXE6IEJyaWRnZU9wZW5SZXF1ZXN0KTogUHJvbWlzZTxCcmlkZ2VPcGVuUmVzdWx0PlxuICAvKiogXHU1MTY4XHU1RTkzXHU2ODA3XHU3QjdFXHU4MDVBXHU1NDA4XHVGRjA4Z2V0QWxsVGFnc1x1RkYwQ09ic2lkaWFuIFx1NjgwN1x1N0I3RVx1OTc2Mlx1Njc3Rlx1NTQwQ1x1NkIzRVx1RkYwOSAqL1xuICBhbGxUYWdzKG9wdHM6IHsgZm9sZGVyPzogc3RyaW5nOyBpZ25vcmVEaXJzOiBzdHJpbmdbXSB9KTogUHJvbWlzZTxCcmlkZ2VBbGxUYWdzUmVzdWx0PlxuICAvKiogXHU3NTFGXHU2MjEwXHU2MzA3XHU1NDExXHU3QjE0XHU4QkIwXHU3Njg0XHU2ODA3XHU1MUM2XHU5NEZFXHU2M0E1XHU2NTg3XHU2NzJDXHVGRjA4Z2VuZXJhdGVNYXJrZG93bkxpbmtcdUZGMENcdTkwNzVcdTVGQUFcdTc1MjhcdTYyMzdcdTk0RkVcdTYzQTVcdThCQkVcdTdGNkVcdUZGMDkgKi9cbiAgbm90ZUxpbmsocmVxOiBCcmlkZ2VMaW5rUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlTGlua1Jlc3VsdD5cbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VWYXVsdEluZm8ge1xuICBuYW1lOiBzdHJpbmdcbiAgcGF0aDogc3RyaW5nXG4gIGFjdGl2ZUZpbGU/OiBzdHJpbmdcbiAgdXBkYXRlZEF0OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VOb3RlSW5mbyB7XG4gIHBhdGg6IHN0cmluZ1xuICBzaXplPzogbnVtYmVyXG4gIC8qKiBcdTk3NUUgLm1kIFx1NjU4N1x1NEVGNlx1NjI0RFx1NjcwOVx1RkYwOGFsbD10cnVlIFx1NjVGNlx1RkYwOSAqL1xuICBleHRlbnNpb24/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VGb2xkZXJTdGF0IHtcbiAgLyoqIHZhdWx0IFx1NzZGOFx1NUJGOVx1NjU4N1x1NEVGNlx1NTkzOVx1OERFRlx1NUY4NFx1RkYxQicnIFx1NEUzQVx1NjgzOSAqL1xuICBwYXRoOiBzdHJpbmdcbiAgLyoqIFx1OEJFNVx1NjU4N1x1NEVGNlx1NTkzOVx1NzZGNFx1NjNBNVx1NTMwNVx1NTQyQlx1NzY4NCAubWQgXHU3QjE0XHU4QkIwXHU2NTcwICovXG4gIG5vdGVzOiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VXcml0ZVJlcXVlc3Qge1xuICBwYXRoOiBzdHJpbmdcbiAgY29udGVudDogc3RyaW5nXG4gIG92ZXJ3cml0ZT86IGJvb2xlYW5cbiAgdW5pcXVlPzogYm9vbGVhblxuICAvKiogJ3dyaXRlJ1x1RkYwOFx1OUVEOFx1OEJBNFx1RkYwQ1x1NjVCMFx1NUVGQVx1NjIxNlx1ODk4Nlx1NzZENlx1RkYwOXwgJ2FwcGVuZCdcdUZGMDhcdThGRkRcdTUyQTBcdUZGMENcdTg5ODFcdTZDNDJcdTVERjJcdTVCNThcdTU3MjhcdUZGMDkgKi9cbiAgb3A/OiAnd3JpdGUnIHwgJ2FwcGVuZCdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VXcml0ZVJlc3VsdCB7XG4gIHBhdGg6IHN0cmluZ1xuICBvcGVyYXRpb246ICdjcmVhdGUnIHwgJ3VwZGF0ZScgfCAnYXBwZW5kJ1xuICBhZGRlZENoYXJzPzogbnVtYmVyXG4gIC8qKiBcdTUxOTlcdTU0MEVcdTY1ODdcdTRFRjZcdTVCNTdcdTgyODJcdTY1NzBcdUZGMDhVVEYtOFx1RkYwOSAqL1xuICBieXRlcz86IG51bWJlclxuICAvKiogYXBwZW5kIFx1NTQwRVx1NzY4NFx1NUI4Q1x1NjU3NFx1NkI2M1x1NjU4N1x1RkYwOFx1NEY5Qlx1NUJBMlx1NjIzN1x1N0FFRlx1N0I5NyBieXRlc1x1RkYwOSAqL1xuICBhZnRlcj86IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJyaWRnZUVkaXRSZXF1ZXN0IHtcbiAgcGF0aDogc3RyaW5nXG4gIG9sZF9zdHJpbmc6IHN0cmluZ1xuICBuZXdfc3RyaW5nOiBzdHJpbmdcbiAgcmVwbGFjZV9hbGw/OiBib29sZWFuXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlRWRpdFJlc3VsdCB7XG4gIHBhdGg6IHN0cmluZ1xuICBiZWZvcmU6IHN0cmluZ1xuICBhZnRlcjogc3RyaW5nXG4gIG1hdGNoZXM6IG51bWJlclxufVxuXG4vKiogXHU0RTAwXHU2NzYxIHdpa2lsaW5rL1x1NUQ0Q1x1NTE2NVx1NTFGQVx1OTRGRVx1RkYwOGJvZHkgXHU0RTNBIFtbLi4uXV0gXHU3Njg0XHU1MTg1XHU2NTg3XHVGRjBDXHU0RkREXHU3NTU5ICNcdTk1MUFcdTcwQjkgXHU0RTBFIHxcdTUyMkJcdTU0MERcdUZGMDkgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlTGlua0luZm8ge1xuICBib2R5OiBzdHJpbmdcbiAgZW1iZWRkZWQ6IGJvb2xlYW5cbn1cblxuLyoqIFx1NEUwMFx1Njc2MSBtYXJrZG93biBgW3RleHRdKHRhcmdldClgIFx1NTFGQVx1OTRGRSAqL1xuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VNYXJrZG93bkxpbmsge1xuICB0YXJnZXQ6IHN0cmluZ1xuICB0ZXh0OiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VNZXRhZGF0YVJlc3VsdCB7XG4gIHBhdGg6IHN0cmluZ1xuICBzaXplPzogbnVtYmVyXG4gIG10aW1lPzogbnVtYmVyXG4gIGZyb250bWF0dGVyOiB7IHByZXNlbnQ6IGJvb2xlYW47IGZpZWxkczogQXJyYXk8eyBrZXk6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB9PiB9XG4gIC8qKiBcdTUxODVcdTgwNTQgI3RhZyBcdTRFMEUgZnJvbnRtYXR0ZXIgdGFnc1x1RkYwQ1x1NjVFMFx1NTI0RFx1NUJGQyAjICovXG4gIHRhZ3M6IHN0cmluZ1tdXG4gIGFsaWFzZXM6IHN0cmluZ1tdXG4gIHdpa2lsaW5rczogQnJpZGdlTGlua0luZm9bXVxuICBtYXJrZG93bjogQnJpZGdlTWFya2Rvd25MaW5rW11cbiAgLyoqIHdpa2lsaW5rL1x1NUQ0Q1x1NTE2NS9tYXJrZG93biBcdTRFMkRcdTg5RTNcdTY3OTBcdTRFMERcdTUyMzBcdTc2RUVcdTY4MDdcdTdCMTRcdThCQjBcdTc2ODRcdTY1NzBcdTkxQ0YgKi9cbiAgdW5yZXNvbHZlZDogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlQmFja2xpbmtzUmVxdWVzdCB7XG4gIC8qKiBcdTdDQkVcdTc4NkVcdTc2RUVcdTY4MDdcdThERUZcdTVGODRcdUZGMDhcdTRFMERcdTU0MkIgLm1kXHVGRjA5XHVGRjFCXHU0RTBFIHRpdGxlIFx1NEU4Q1x1OTAwOVx1NEUwMFx1RkYwQ3BhdGggXHU0RjE4XHU1MTQ4ICovXG4gIHBhdGg/OiBzdHJpbmdcbiAgLyoqIFx1NjMwOVx1NjgwN1x1OTg5OFx1RkYwOGJhc2VuYW1lIHN0ZW1cdUZGMDlcdTUzMzlcdTkxNERcdUZGMUJcdTU0MENcdTU0MERcdTY1RjZcdTUzRDZcdTY3MDBcdTc3RURcdThERUZcdTVGODRcdTVFNzZcdTY4MDdcdThCQjAgYW1iaWd1b3VzICovXG4gIHRpdGxlPzogc3RyaW5nXG4gIGZvcm1hdD86ICd3aWtpbGluaycgfCAnbWFya2Rvd24nIHwgJ2FsbCdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VIaXQge1xuICBwYXRoOiBzdHJpbmdcbiAgc25pcHBldDogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlQmFja2xpbmtzUmVzdWx0IHtcbiAgdG90YWw6IG51bWJlclxuICBiYWNrbGlua3M6IEJyaWRnZUhpdFtdXG4gIHRhcmdldD86IHN0cmluZ1xuICBhbWJpZ3VvdXM/OiBib29sZWFuXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlU2VhcmNoUmVxdWVzdCB7XG4gIHE6IHN0cmluZ1xuICBmb2xkZXI/OiBzdHJpbmdcbiAgbGltaXQ/OiBudW1iZXJcbiAgcmVnZXg/OiBib29sZWFuXG4gIGNhc2Vfc2Vuc2l0aXZlPzogYm9vbGVhblxuICBtYXRjaF9hbGw/OiBib29sZWFuXG4gIGlnbm9yZURpcnM6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlVGFnSGl0IHtcbiAgcGF0aDogc3RyaW5nXG4gIHRhZ3M6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlVGFnc1JlcXVlc3Qge1xuICB0YWc6IHN0cmluZ1xuICBmb2xkZXI/OiBzdHJpbmdcbiAgbGltaXQ/OiBudW1iZXJcbiAgaWdub3JlRGlyczogc3RyaW5nW11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VGcm9udG1hdHRlclJlc3VsdCB7XG4gIHBhdGg6IHN0cmluZ1xuICBwcmVzZW50OiBib29sZWFuXG4gIHZhbGlkOiBib29sZWFuXG4gIGZpZWxkczogQXJyYXk8eyBrZXk6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB9PlxuICBpc3N1ZXM6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlRnJvbnRtYXR0ZXJDaGFuZ2Uge1xuICBvcDogJ3NldCcgfCAnZGVsZXRlJ1xuICBrZXk6IHN0cmluZ1xuICB2YWx1ZT86IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJyaWRnZUZyb250bWF0dGVyVXBkYXRlUmVxdWVzdCB7XG4gIHBhdGg6IHN0cmluZ1xuICBzZXQ/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4gIGRlbGV0ZT86IHN0cmluZ1tdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlRnJvbnRtYXR0ZXJVcGRhdGVSZXN1bHQge1xuICBwYXRoOiBzdHJpbmdcbiAgY3JlYXRlZDogYm9vbGVhblxuICBjaGFuZ2VzOiBCcmlkZ2VGcm9udG1hdHRlckNoYW5nZVtdXG4gIGJlZm9yZTogQXJyYXk8eyBrZXk6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB9PlxuICBhZnRlcjogQXJyYXk8eyBrZXk6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB9PlxuICBpc3N1ZXM6IHN0cmluZ1tdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlUmVuYW1lUmVxdWVzdCB7XG4gIG9sZF9wYXRoOiBzdHJpbmdcbiAgbmV3X3BhdGg6IHN0cmluZ1xuICBrZWVwX29sZD86ICdrZWVwJyB8ICdzdHViJ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJyaWRnZVJlbmFtZVJlc3VsdCB7XG4gIG9sZF9wYXRoOiBzdHJpbmdcbiAgbmV3X3BhdGg6IHN0cmluZ1xuICB0b3RhbExpbmtzOiBudW1iZXJcbiAgdXBkYXRlZDogQXJyYXk8eyBwYXRoOiBzdHJpbmc7IGNvdW50OiBudW1iZXIgfT5cbiAgb2xkX2hhbmRsaW5nOiAna2VwdCcgfCAnc3R1YmJlZCdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VUcmFzaFJlcXVlc3Qge1xuICBwYXRoOiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VUcmFzaFJlc3VsdCB7XG4gIHBhdGg6IHN0cmluZ1xuICB0cmFzaGVkOiB0cnVlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlT3BlblJlcXVlc3Qge1xuICBwYXRoOiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VPcGVuUmVzdWx0IHtcbiAgcGF0aDogc3RyaW5nXG4gIG9wZW5lZDogdHJ1ZVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJyaWRnZVRhZ1N0YXQge1xuICB0YWc6IHN0cmluZ1xuICBjb3VudDogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlQWxsVGFnc1Jlc3VsdCB7XG4gIHRvdGFsOiBudW1iZXJcbiAgdGFnczogQnJpZGdlVGFnU3RhdFtdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlTGlua1JlcXVlc3Qge1xuICBwYXRoOiBzdHJpbmdcbiAgLyoqIFx1Njc2NVx1NkU5MFx1N0IxNFx1OEJCMFx1RkYwOHZhdWx0IFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOVx1RkYxQVx1NzUxRlx1NjIxMFx1NzZGOFx1NUJGOVx1NUI4M1x1NzY4NCBtYXJrZG93biBcdTk0RkVcdTYzQTVcdUZGMUJcdTc3MDFcdTc1NjUgPSBcdTY4MzkgKi9cbiAgc291cmNlPzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlTGlua1Jlc3VsdCB7XG4gIHBhdGg6IHN0cmluZ1xuICBsaW5rOiBzdHJpbmdcbiAgZm9ybWF0OiAnd2lraWxpbmsnIHwgJ21hcmtkb3duJ1xufVxuXG4vKipcbiAqIFx1N0EzM1x1NUI5QVx1OTUxOVx1OEJFRlx1NzgwMVx1RkYxQVx1NURFNVx1NTE3N1x1NEZBN1x1NURGMlx1NjcwOSBWQVVMVF8qIC8gRlNfKiBcdThCQ0RcdTg4NjhcdUZGMDhkc2gtdG9vbC1vYnNpZGlhbi12YXVsdFxuICogc3JjL2Vycm9ycy50c1x1RkYwOVx1RkYwQ1x1Njg2NVx1NzZGNFx1NjNBNVx1NTkwRFx1NzUyOFx1NTQwQ1x1NEUwMFx1OEJDRFx1NkM0N1x1RkYwQ1x1NUJBMlx1NjIzN1x1N0FFRlx1NjVFMFx1OTcwMFx1N0ZGQlx1OEJEMVx1RkYxQlx1Njg2NVx1ODFFQVx1OEVBQlx1NzY4NFx1NTM0Rlx1OEJBRVx1OTUxOVx1OEJFRlxuICogXHU3NTI4IEJSSURHRV8qIFx1NTI0RFx1N0YwMFx1MzAwMlxuICovXG5leHBvcnQgY29uc3QgQnJpZGdlRXJyb3JDb2RlID0ge1xuICBCQURfUkVRVUVTVDogJ0JSSURHRV9CQURfUkVRVUVTVCcsXG4gIFVOQVVUSE9SSVpFRDogJ0JSSURHRV9VTkFVVEhPUklaRUQnLFxuICBJTlRFUk5BTDogJ0JSSURHRV9JTlRFUk5BTCcsXG4gIE5PVF9GT1VORDogJ0JSSURHRV9OT1RfRk9VTkQnLFxuICBNRVRIT0RfTk9UX0FMTE9XRUQ6ICdCUklER0VfTUVUSE9EX05PVF9BTExPV0VEJyxcbiAgVE9PX0xBUkdFOiAnQlJJREdFX0JPRFlfVE9PX0xBUkdFJyxcbiAgTk9URV9OT1RfRk9VTkQ6ICdWQVVMVF9OT1RFX05PVF9GT1VORCcsXG4gIE5PVF9GSUxFOiAnVkFVTFRfTk9UX0ZJTEUnLFxuICBFWElTVFM6ICdWQVVMVF9FWElTVFMnLFxuICBQQVRIX0lOVkFMSUQ6ICdWQVVMVF9QQVRIX0lOVkFMSUQnLFxuICBJTlZBTElEX0FSR1M6ICdWQVVMVF9JTlZBTElEX0FSR1MnLFxuICBFRElUX05PVF9GT1VORDogJ0ZTX0VESVRfTk9UX0ZPVU5EJyxcbiAgQU1CSUdVT1VTX0VESVQ6ICdGU19BTUJJR1VPVVNfRURJVCcsXG4gIEZST05UTUFUVEVSX05PX0ZJRUxEUzogJ1ZBVUxUX0ZST05UTUFUVEVSX05PX0ZJRUxEUycsXG4gIEZST05UTUFUVEVSX01VTFRJTElORTogJ1ZBVUxUX0ZST05UTUFUVEVSX01VTFRJTElORScsXG4gIFJFR0VYX0lOVkFMSUQ6ICdWQVVMVF9SRUdFWF9JTlZBTElEJyxcbiAgUkVOQU1FX1VQREFURV9GQUlMRUQ6ICdWQVVMVF9SRU5BTUVfVVBEQVRFX0ZBSUxFRCcsXG4gIFJFTkFNRV9TVFVCX0ZBSUxFRDogJ1ZBVUxUX1JFTkFNRV9TVFVCX0ZBSUxFRCcsXG59IGFzIGNvbnN0XG5cbmV4cG9ydCB0eXBlIEJyaWRnZUVycm9yQ29kZSA9ICh0eXBlb2YgQnJpZGdlRXJyb3JDb2RlKVtrZXlvZiB0eXBlb2YgQnJpZGdlRXJyb3JDb2RlXVxuIiwgIi8qKlxuICogb2JzaWRpYW5TZXJ2aWNlLnRzIFx1MjAxNFx1MjAxNCBcdTc1MjggT2JzaWRpYW4gXHU1Qjk4XHU2NUI5IEFQSSBcdTVCOUVcdTczQjAge0BsaW5rIEJyaWRnZVNlcnZpY2V9XHUzMDAyXG4gKlxuICogXHU4RkQ5XHU2NjJGXHU2ODY1XHU3Njg0XHUzMDBDXHU3NzFGXHU3NkY4XHU2RTkwXHUzMDBEXHVGRjFBYXBwLnZhdWx0XHVGRjA4XHU4QkZCXHU1MTk5L1x1Njc5QVx1NEUzRVx1RkYwOVx1MzAwMWFwcC5tZXRhZGF0YUNhY2hlXHVGRjA4XHU1MUZBXHU5NEZFL1x1NUQ0Q1x1NTE2NS9cbiAqIFx1NjgwN1x1N0I3RS9mcm9udG1hdHRlciBcdTg5RTNcdTY3OTBcdTMwMDFcdTk0RkVcdTYzQTVcdTg5RTNcdTY3OTBcdUZGMDlcdTMwMDFhcHAuZmlsZU1hbmFnZXJcdUZGMDhcdTkxQ0RcdTU0N0RcdTU0MERcdTgxRUFcdTUyQThcdTY2RjRcdTY1QjBcdTVGMTVcdTc1MjhcdTMwMDFcbiAqIFx1NTM5Rlx1NUI1MCBmcm9udG1hdHRlciBcdTRGRUVcdTY1MzlcdUZGMDlcdTMwMDFhcHAud29ya3NwYWNlXHVGRjA4XHU1RjUzXHU1MjREXHU3QjE0XHU4QkIwXHVGRjA5XHUzMDAyXHU1REU1XHU1MTc3XHU0RkE3XHU3Njg0XCJcdTZCNjNcdTUyMTlcdThGRDFcdTRGM0NcIlxuICogXHVGRjA4d2lraWxpbmsgXHU4OUUzXHU2NzkwXHUzMDAxZnJvbnRtYXR0ZXIgXHU4ODRDXHU3RUE3XHU4OUUzXHU2NzkwXHUzMDAxdGFnIFx1NjNEMFx1NTNENlx1MzAwMVx1NTNDRFx1NTQxMVx1OTRGRVx1NjNBNVx1NjI2Qlx1NjNDRlx1RkYwOVx1NTcyOFx1OEZEOVx1OTFDQ1x1NTE2OFx1OTBFOFxuICogXHU2MzYyXHU2MjEwXHU1Qjk4XHU2NUI5XHU4OUUzXHU2NzkwXHU3RUQzXHU2NzlDXHUzMDAyXG4gKlxuICogXHU2NzJDXHU2NTg3XHU0RUY2XHU2NjJGXHU1NTJGXHU0RTAwIGltcG9ydCAnb2JzaWRpYW4nIFx1NzY4NFx1Njg2NVx1NjU4N1x1NEVGNlx1RkYxQmJyaWRnZVNlcnZlci50cyBcdTRGRERcdTYzMDFcdTdFQUYgTm9kZSBcdTUzRUZcdTZENEJcdTMwMDJcbiAqIFx1NjI0MFx1NjcwOVx1NTE2NVx1NTNDMlx1OERFRlx1NUY4NFx1NTc0N1x1NjMwOSB2YXVsdCBcdTc2RjhcdTVCRjlcdThERUZcdTVGODRcdTY4MjFcdTlBOENcdUZGMDhcdTYyRDJcdTdFRERcdTdFRERcdTVCRjlcdThERUZcdTVGODQvLi4gXHU3QTdGXHU4RDhBL1x1NzZEOFx1N0IyNlx1RkYwOVx1RkYwQ1xuICogXHU0RTBFXHU1REU1XHU1MTc3XHU0RkE3IG5vdGVSZWxQYXRoIFx1OEJFRFx1NEU0OVx1NEUwMFx1ODFGNFx1RkYwOFx1NTNDQ1x1N0FFRlx1OTYzMlx1NUZBMVx1RkYwOVx1MzAwMlxuICovXG5cbmltcG9ydCB7IEFwcCwgRmlsZVN5c3RlbUFkYXB0ZXIsIFRGaWxlLCBnZXRBbGxUYWdzLCBub3JtYWxpemVQYXRoIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgeyBCcmlkZ2VFcnJvciB9IGZyb20gJy4vYnJpZGdlU2VydmVyLmpzJ1xuaW1wb3J0IHsgQnJpZGdlRXJyb3JDb2RlIH0gZnJvbSAnLi9icmlkZ2VUeXBlcy5qcydcbmltcG9ydCB0eXBlIHtcbiAgQnJpZGdlQWxsVGFnc1Jlc3VsdCxcbiAgQnJpZGdlQmFja2xpbmtzUmVxdWVzdCxcbiAgQnJpZGdlQmFja2xpbmtzUmVzdWx0LFxuICBCcmlkZ2VFZGl0UmVxdWVzdCxcbiAgQnJpZGdlRWRpdFJlc3VsdCxcbiAgQnJpZGdlRm9sZGVyU3RhdCxcbiAgQnJpZGdlRnJvbnRtYXR0ZXJSZXN1bHQsXG4gIEJyaWRnZUZyb250bWF0dGVyVXBkYXRlUmVxdWVzdCxcbiAgQnJpZGdlRnJvbnRtYXR0ZXJVcGRhdGVSZXN1bHQsXG4gIEJyaWRnZUhpdCxcbiAgQnJpZGdlTGlua0luZm8sXG4gIEJyaWRnZUxpbmtSZXF1ZXN0LFxuICBCcmlkZ2VMaW5rUmVzdWx0LFxuICBCcmlkZ2VNYXJrZG93bkxpbmssXG4gIEJyaWRnZU1ldGFkYXRhUmVzdWx0LFxuICBCcmlkZ2VOb3RlSW5mbyxcbiAgQnJpZGdlT3BlblJlcXVlc3QsXG4gIEJyaWRnZU9wZW5SZXN1bHQsXG4gIEJyaWRnZVJlbmFtZVJlcXVlc3QsXG4gIEJyaWRnZVJlbmFtZVJlc3VsdCxcbiAgQnJpZGdlU2VhcmNoUmVxdWVzdCxcbiAgQnJpZGdlU2VydmljZSxcbiAgQnJpZGdlVGFnSGl0LFxuICBCcmlkZ2VUYWdzUmVxdWVzdCxcbiAgQnJpZGdlVHJhc2hSZXF1ZXN0LFxuICBCcmlkZ2VUcmFzaFJlc3VsdCxcbiAgQnJpZGdlV3JpdGVSZXF1ZXN0LFxuICBCcmlkZ2VXcml0ZVJlc3VsdCxcbn0gZnJvbSAnLi9icmlkZ2VUeXBlcy5qcydcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBcdTdFQUZcdTUxRkRcdTY1NzBcdTVERTVcdTUxNzdcdUZGMDhcdTRFMEUgZHNoLXRvb2wtb2JzaWRpYW4tdmF1bHQvc3JjL3ZhdWx0LnRzIFx1OEJFRFx1NEU0OVx1NUJGOVx1OUY1MFx1RkYwOVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTY4MjFcdTlBOENcdTVFNzZcdTVGNTJcdTRFMDBcdTUzMTYgdmF1bHQgXHU3NkY4XHU1QkY5XHU3QjE0XHU4QkIwXHU4REVGXHU1Rjg0XHVGRjFBXHU2MkQyXHU3RUREXHU3QTdBL1x1N0VERFx1NUJGOS9cdTc2RDhcdTdCMjYvLi4gXHU3QTdGXHU4RDhBXHVGRjBDXHU4ODY1IC5tZCBcdTU0MEVcdTdGMDBcdTMwMDIgKi9cbmZ1bmN0aW9uIG5vdGVSZWwoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWQgPSBpbnB1dC50cmltKClcbiAgaWYgKHRyaW1tZWQgPT09ICcnKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLlBBVEhfSU5WQUxJRCwgJ1x1N0IxNFx1OEJCMFx1OERFRlx1NUY4NFx1NEUwRFx1ODBGRFx1NEUzQVx1N0E3QScsIDQwMClcbiAgaWYgKC9eW0EtWmEtel06W1xcXFwvXS8udGVzdCh0cmltbWVkKSB8fCB0cmltbWVkLnN0YXJ0c1dpdGgoJy8nKSB8fCB0cmltbWVkLnN0YXJ0c1dpdGgoJ1xcXFwnKSkge1xuICAgIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuUEFUSF9JTlZBTElELCBgXHU3QjE0XHU4QkIwXHU4REVGXHU1Rjg0XHU1RkM1XHU5ODdCXHU2NjJGIHZhdWx0IFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOC8gXHU1MjA2XHU5Njk0XHVGRjBDXHU0RTBEXHU1NDJCXHU3NkQ4XHU3QjI2XHVGRjA5XHVGRjFBJHt0cmltbWVkfWAsIDQwMClcbiAgfVxuICBjb25zdCBzZWdtZW50cyA9IHRyaW1tZWQuc3BsaXQoL1tcXFxcL10rLykuZmlsdGVyKChzKSA9PiBzICE9PSAnJyAmJiBzICE9PSAnLicpXG4gIGlmIChzZWdtZW50cy5pbmNsdWRlcygnLi4nKSkge1xuICAgIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuUEFUSF9JTlZBTElELCBgXHU3QjE0XHU4QkIwXHU4REVGXHU1Rjg0XHU0RTBEXHU4MEZEXHU1MzA1XHU1NDJCIC4uIFx1NkJCNVx1RkYxQSR7dHJpbW1lZH1gLCA0MDApXG4gIH1cbiAgY29uc3Qgam9pbmVkID0gbm9ybWFsaXplUGF0aChzZWdtZW50cy5qb2luKCcvJykpXG4gIGlmIChqb2luZWQgPT09ICcnKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLlBBVEhfSU5WQUxJRCwgJ1x1N0IxNFx1OEJCMFx1OERFRlx1NUY4NFx1NEUwRFx1ODBGRFx1NEUzQVx1N0E3QScsIDQwMClcbiAgY29uc3Qgbm9FeHQgPSBqb2luZWQucmVwbGFjZSgvXFwubWQkLywgJycpXG4gIGNvbnN0IGJhc2UgPSBub0V4dC5zcGxpdCgnLycpLnBvcCgpID8/ICcnXG4gIGlmIChub0V4dCA9PT0gJycgfHwgYmFzZSA9PT0gJycgfHwgYmFzZSA9PT0gJy4nKSB7XG4gICAgdGhyb3cgbmV3IEJyaWRnZUVycm9yKEJyaWRnZUVycm9yQ29kZS5QQVRIX0lOVkFMSUQsIGBcdTdCMTRcdThCQjBcdThERUZcdTVGODRcdTY1RTBcdTY1NDhcdUZGMDhcdTdGM0FcdTVDMTFcdTY1ODdcdTRFRjZcdTU0MERcdUZGMDlcdUZGMUEke3RyaW1tZWR9YCwgNDAwKVxuICB9XG4gIHJldHVybiBub0V4dCArICcubWQnXG59XG5cbi8qKiBiYXNlbmFtZSBzdGVtXHVGRjA4XHU2NUUwXHU3NkVFXHU1RjU1XHUzMDAxXHU2NUUwIC5tZFx1RkYwOSAqL1xuZnVuY3Rpb24gc3RlbU9mKHJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIChyZWwucmVwbGFjZSgvXFwubWQkLywgJycpLnNwbGl0KCcvJykucG9wKCkgPz8gJycpIHx8IHJlbFxufVxuXG4vKiogXHU4QkU1XHU4REVGXHU1Rjg0XHU2NjJGXHU1NDI2XHU0RjREXHU0RThFXHU4OEFCXHU1RkZEXHU3NTY1XHU3NkVFXHU1RjU1XHVGRjA4XHU3MEI5XHU3NkVFXHU1RjU1XHU2MjE2XHU3NTI4XHU2MjM3IGlnbm9yZURpcnNcdUZGMDlcdTUxODUgKi9cbmZ1bmN0aW9uIGluSWdub3JlZERpcihyZWw6IHN0cmluZywgaWdub3JlRGlyczogcmVhZG9ubHkgc3RyaW5nW10pOiBib29sZWFuIHtcbiAgY29uc3QgZGlycyA9IHJlbC5zcGxpdCgnLycpLnNsaWNlKDAsIC0xKVxuICByZXR1cm4gZGlycy5zb21lKChkKSA9PiBkLnN0YXJ0c1dpdGgoJy4nKSB8fCBpZ25vcmVEaXJzLmluY2x1ZGVzKGQpKVxufVxuXG4vKiogZm9sZGVyIFx1NTI0RFx1N0YwMFx1OEZDN1x1NkVFNFx1RkYwOCcnID0gXHU1MTY4XHU5MEU4XHVGRjA5ICovXG5mdW5jdGlvbiBpbkZvbGRlcihyZWw6IHN0cmluZywgZm9sZGVyOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgaWYgKCFmb2xkZXIpIHJldHVybiB0cnVlXG4gIGNvbnN0IHByZWZpeCA9IGZvbGRlci5yZXBsYWNlKC9eXFwvKy8sICcnKS5yZXBsYWNlKC9cXC8rJC8sICcnKVxuICBpZiAocHJlZml4ID09PSAnJykgcmV0dXJuIHRydWVcbiAgcmV0dXJuIHJlbCA9PT0gcHJlZml4IHx8IHJlbC5zdGFydHNXaXRoKHByZWZpeCArICcvJylcbn1cblxuLyoqIGZyb250bWF0dGVyIFx1NTAzQyBcdTIxOTIgXHU1REU1XHU1MTc3XHU0RkE3IHNjaGVtYSBcdTc2ODRcdTVCNTdcdTdCMjZcdTRFMzJcdTg4NjhcdTc5M0EgKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeUZtVmFsdWUodjogdW5rbm93bik6IHN0cmluZyB7XG4gIGlmICh2ID09PSBudWxsIHx8IHYgPT09IHVuZGVmaW5lZCkgcmV0dXJuICcnXG4gIGlmIChBcnJheS5pc0FycmF5KHYpKSByZXR1cm4gYFske3YubWFwKCh4KSA9PiBTdHJpbmcoeCkpLmpvaW4oJywgJyl9XWBcbiAgaWYgKHR5cGVvZiB2ID09PSAnb2JqZWN0Jykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodilcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBTdHJpbmcodilcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFN0cmluZyh2KVxufVxuXG4vKiogXHU1REU1XHU1MTc3XHU0RkE3XHU0RjIwXHU1MTY1XHU3Njg0XHU1MzU1XHU4ODRDIFlBTUwgXHU2ODA3XHU5MUNGIFx1MjE5MiBKUyBcdTUwM0NcdUZGMDhPYnNpZGlhbiBcdTVFOEZcdTUyMTdcdTUzMTZcdTc1MjhcdUZGMDkgKi9cbmZ1bmN0aW9uIHBhcnNlRm1TY2FsYXIoczogc3RyaW5nKTogdW5rbm93biB7XG4gIGNvbnN0IHYgPSBzLnRyaW0oKVxuICBpZiAodi5zdGFydHNXaXRoKCdbJykgJiYgdi5lbmRzV2l0aCgnXScpKSB7XG4gICAgcmV0dXJuIHZcbiAgICAgIC5zbGljZSgxLCAtMSlcbiAgICAgIC5zcGxpdCgnLCcpXG4gICAgICAubWFwKCh4KSA9PiB4LnRyaW0oKSlcbiAgICAgIC5maWx0ZXIoKHgpID0+IHgubGVuZ3RoID4gMClcbiAgfVxuICBpZiAoL15bKy1dP1xcZCsoXFwuXFxkKyk/JC8udGVzdCh2KSkgcmV0dXJuIE51bWJlcih2KVxuICBpZiAodiA9PT0gJ3RydWUnKSByZXR1cm4gdHJ1ZVxuICBpZiAodiA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlXG4gIGlmICh2ID09PSAnbnVsbCcgfHwgdiA9PT0gJ34nKSByZXR1cm4gbnVsbFxuICBpZiAodi5sZW5ndGggPj0gMiAmJiAoKHYuc3RhcnRzV2l0aCgnXCInKSAmJiB2LmVuZHNXaXRoKCdcIicpKSB8fCAodi5zdGFydHNXaXRoKFwiJ1wiKSAmJiB2LmVuZHNXaXRoKFwiJ1wiKSkpKSB7XG4gICAgcmV0dXJuIHYuc2xpY2UoMSwgLTEpXG4gIH1cbiAgcmV0dXJuIHZcbn1cblxuLyoqIGZyb250bWF0dGVyIFx1NzY4NCB0YWdzL3RhZyBcdTVDNUVcdTYwMjcgXHUyMTkyIHN0cmluZ1tdICovXG5mdW5jdGlvbiBmbVRhZ3NPZihmcm9udG1hdHRlcjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpOiBzdHJpbmdbXSB7XG4gIGlmICghZnJvbnRtYXR0ZXIpIHJldHVybiBbXVxuICBjb25zdCBvdXQ6IHN0cmluZ1tdID0gW11cbiAgZm9yIChjb25zdCBrZXkgb2YgWyd0YWdzJywgJ3RhZyddKSB7XG4gICAgY29uc3QgdiA9IGZyb250bWF0dGVyW2tleV1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkgb3V0LnB1c2goLi4udi5tYXAoKHgpID0+IFN0cmluZyh4KSkpXG4gICAgZWxzZSBpZiAodHlwZW9mIHYgPT09ICdzdHJpbmcnICYmIHYudHJpbSgpKSBvdXQucHVzaCh2LnRyaW0oKSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbi8qKiBmcm9udG1hdHRlciBcdTc2ODQgYWxpYXNlcyBcdTVDNUVcdTYwMjcgXHUyMTkyIHN0cmluZ1tdICovXG5mdW5jdGlvbiBmbUFsaWFzZXNPZihmcm9udG1hdHRlcjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpOiBzdHJpbmdbXSB7XG4gIGlmICghZnJvbnRtYXR0ZXIpIHJldHVybiBbXVxuICBjb25zdCB2ID0gZnJvbnRtYXR0ZXJbJ2FsaWFzZXMnXVxuICBpZiAoQXJyYXkuaXNBcnJheSh2KSkgcmV0dXJuIHYubWFwKCh4KSA9PiBTdHJpbmcoeCkpLmZpbHRlcigoeCkgPT4geC5sZW5ndGggPiAwKVxuICBpZiAodHlwZW9mIHYgPT09ICdzdHJpbmcnICYmIHYudHJpbSgpKSByZXR1cm4gW3YudHJpbSgpXVxuICByZXR1cm4gW11cbn1cblxuLyoqIFx1NjYyRlx1NTQyNiB3aWtpbGluay9cdTVENENcdTUxNjVcdTUxOTlcdTZDRDVcdUZGMDhgW1tcdTIwMjZdXWAgLyBgIVtbXHUyMDI2XV1gXHVGRjA5XHVGRjFCXHU1NDI2XHU1MjE5XHU4OUM2XHU0RTNBIG1hcmtkb3duIFx1OTRGRVx1NjNBNSAqL1xuZnVuY3Rpb24gaXNXaWtpbGluayhvcmlnaW5hbDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBvcmlnaW5hbC5zdGFydHNXaXRoKCdbWycpIHx8IG9yaWdpbmFsLnN0YXJ0c1dpdGgoJyFbJylcbn1cblxuLyoqIGAhW1thfGJdXWAgXHUyMTkyIGBhfGJgXHVGRjFCYFtbYV1dYCBcdTIxOTIgYGFgICovXG5mdW5jdGlvbiB3aWtpbGlua0JvZHkob3JpZ2luYWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGlubmVyID0gb3JpZ2luYWwuc3RhcnRzV2l0aCgnIVsnKSA/IG9yaWdpbmFsLnNsaWNlKDMpIDogb3JpZ2luYWwuc2xpY2UoMilcbiAgcmV0dXJuIGlubmVyLnJlcGxhY2UoL1xcXVxcXSQvLCAnJykudHJpbSgpXG59XG5cbi8qKiBcdTU5MTZcdTkwRTggVVJMXHVGRjA4aHR0cDovbWFpbHRvOiBcdTdCNDlcdUZGMDlcdUZGMENcdTVERTVcdTUxNzdcdTRGQTdcdTVCRjlcdThGRDlcdTdDN0IgbWFya2Rvd24gXHU5NEZFXHU2M0E1XHU0RTBEXHU4QkExXHU2NTcwICovXG5mdW5jdGlvbiBpc0V4dGVybmFsVXJsKHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvXlthLXpdW2EtejAtOSsuLV0qOi9pLnRlc3QodGFyZ2V0KSAmJiAhL15bYS16XTpbXFxcXC9dL2kudGVzdCh0YXJnZXQpXG59XG5cbmNvbnN0IE1BUktET1dOX0xJTktfUkUgPSAvXlxcWyhbXlxcXV0qKVxcXVxcKChbXildKilcXCkkL1xuXG4vKiogYFt0ZXh0XSh0YXJnZXQpYCBcdTIxOTIgeyB0ZXh0LCB0YXJnZXQgfVx1RkYwOFx1NUMxNlx1NjJFQ1x1NTNGN1x1NUY2Mlx1NUYwRlx1NTI2NVx1NzlCQiA8ID5cdUZGMDkgKi9cbmZ1bmN0aW9uIHBhcnNlTWFya2Rvd25MaW5rKG9yaWdpbmFsOiBzdHJpbmcpOiB7IHRhcmdldDogc3RyaW5nOyB0ZXh0OiBzdHJpbmcgfSB7XG4gIGNvbnN0IG0gPSBNQVJLRE9XTl9MSU5LX1JFLmV4ZWMob3JpZ2luYWwpXG4gIGlmICghbSkgcmV0dXJuIHsgdGFyZ2V0OiBvcmlnaW5hbCwgdGV4dDogJycgfVxuICBsZXQgdGFyZ2V0ID0gbVsyXSEudHJpbSgpXG4gIGlmICh0YXJnZXQuc3RhcnRzV2l0aCgnPCcpICYmIHRhcmdldC5lbmRzV2l0aCgnPicpKSB0YXJnZXQgPSB0YXJnZXQuc2xpY2UoMSwgLTEpXG4gIHJldHVybiB7IHRhcmdldCwgdGV4dDogbVsxXSA/PyAnJyB9XG59XG5cbi8qKiBcdTU0N0RcdTRFMkRcdTcyNDdcdTZCQjVcdUZGMDhcdTRFMEVcdTVERTVcdTUxNzdcdTRGQTcgZXhjZXJwdEFyb3VuZCBcdTc2RjhcdTU0MENcdTUzNEFcdTVGODQgODBcdUZGMDkgKi9cbmZ1bmN0aW9uIGV4Y2VycHRBcm91bmQodGV4dDogc3RyaW5nLCBpbmRleDogbnVtYmVyLCBxdWVyeUxlbjogbnVtYmVyLCByYWRpdXMgPSA4MCk6IHN0cmluZyB7XG4gIGNvbnN0IHN0YXJ0ID0gTWF0aC5tYXgoMCwgaW5kZXggLSByYWRpdXMpXG4gIGNvbnN0IGVuZCA9IE1hdGgubWluKHRleHQubGVuZ3RoLCBpbmRleCArIHF1ZXJ5TGVuICsgcmFkaXVzKVxuICBjb25zdCBiZWZvcmUgPSBzdGFydCA+IDAgPyAnXHUyMDI2JyA6ICcnXG4gIGNvbnN0IGFmdGVyID0gZW5kIDwgdGV4dC5sZW5ndGggPyAnXHUyMDI2JyA6ICcnXG4gIHJldHVybiBgJHtiZWZvcmV9JHt0ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpLnJlcGxhY2UoL1xccysvZywgJyAnKS50cmltKCl9JHthZnRlcn1gXG59XG5cbi8qKiBmcm9udG1hdHRlciBcdTIxOTIgXHU1QjU3XHU2QkI1XHU1MjE3XHU4ODY4XHVGRjA4XHU5NTJFXHU1RThGXHU0RkREXHU2MzAxXHVGRjBDXHU1MDNDXHU1QjU3XHU3QjI2XHU0RTMyXHU1MzE2XHVGRjA5ICovXG5mdW5jdGlvbiBmaWVsZHNPZihmcm9udG1hdHRlcjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpOiBBcnJheTx7IGtleTogc3RyaW5nOyB2YWx1ZTogc3RyaW5nIH0+IHtcbiAgaWYgKCFmcm9udG1hdHRlcikgcmV0dXJuIFtdXG4gIHJldHVybiBPYmplY3QuZW50cmllcyhmcm9udG1hdHRlcikubWFwKChba2V5LCB2YWx1ZV0pID0+ICh7IGtleSwgdmFsdWU6IHN0cmluZ2lmeUZtVmFsdWUodmFsdWUpIH0pKVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9ic2lkaWFuIFx1NUI5RVx1NzNCMFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjbGFzcyBPYnNpZGlhbkJyaWRnZVNlcnZpY2UgaW1wbGVtZW50cyBCcmlkZ2VTZXJ2aWNlIHtcbiAgcmVhZG9ubHkgaW5mbzogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDsgdmVyc2lvbjogc3RyaW5nIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwLFxuICAgIHZlcnNpb246IHN0cmluZyxcbiAgKSB7XG4gICAgdGhpcy5pbmZvID0geyBuYW1lOiBhcHAudmF1bHQuZ2V0TmFtZSgpLCBwYXRoOiB0aGlzLnZhdWx0UGF0aCgpLCB2ZXJzaW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgdmF1bHRQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXJcbiAgICByZXR1cm4gYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyID8gYWRhcHRlci5nZXRCYXNlUGF0aCgpIDogdW5kZWZpbmVkXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTNFQVx1OEJGQlxuXG4gIGN1cnJlbnQoKTogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZzsgYWN0aXZlRmlsZT86IHN0cmluZzsgdXBkYXRlZEF0OiBudW1iZXIgfSB7XG4gICAgY29uc3QgYWN0aXZlRmlsZSA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk/LnBhdGhcbiAgICBjb25zdCByZXN1bHQ6IHsgbmFtZTogc3RyaW5nOyBwYXRoOiBzdHJpbmc7IGFjdGl2ZUZpbGU/OiBzdHJpbmc7IHVwZGF0ZWRBdDogbnVtYmVyIH0gPSB7XG4gICAgICBuYW1lOiB0aGlzLmFwcC52YXVsdC5nZXROYW1lKCksXG4gICAgICBwYXRoOiB0aGlzLmluZm8ucGF0aCA/PyAnJyxcbiAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICB9XG4gICAgaWYgKGFjdGl2ZUZpbGUpIHJlc3VsdC5hY3RpdmVGaWxlID0gYWN0aXZlRmlsZVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIC8qKiBPYnNpZGlhbiBcdTg5QzZcdTg5RDJcdTc2ODRcdTY1ODdcdTRFRjZcdTk2QzZcdUZGMDhnZXRNYXJrZG93bkZpbGVzIC8gZ2V0RmlsZXNcdUZGMDlcdUZGMENcdTYzMDkgaWdub3JlRGlycyArIGZvbGRlciBcdThGQzdcdTZFRTQgKi9cbiAgcHJpdmF0ZSB2YXVsdEZpbGVzKG9wdHM6IHsgZm9sZGVyPzogc3RyaW5nOyBhbGw/OiBib29sZWFuOyBpZ25vcmVEaXJzOiBzdHJpbmdbXSB9KTogVEZpbGVbXSB7XG4gICAgY29uc3QgZmlsZXMgPSBvcHRzLmFsbCA/IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKCkgOiB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKClcbiAgICByZXR1cm4gZmlsZXMuZmlsdGVyKFxuICAgICAgKGYpID0+ICFpbklnbm9yZWREaXIoZi5wYXRoLCBvcHRzLmlnbm9yZURpcnMpICYmIGluRm9sZGVyKGYucGF0aCwgb3B0cy5mb2xkZXIpLFxuICAgIClcbiAgfVxuXG4gIHByaXZhdGUgZmlsZU9mKHJlbDogc3RyaW5nKTogVEZpbGUge1xuICAgIGNvbnN0IHJlbE4gPSBub3RlUmVsKHJlbClcbiAgICBjb25zdCBmID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJlbE4pXG4gICAgaWYgKCFmKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLk5PVEVfTk9UX0ZPVU5ELCBgXHU3QjE0XHU4QkIwXHU0RTBEXHU1QjU4XHU1NzI4XHVGRjFBJHtyZWxOfWAsIDQwNClcbiAgICBpZiAoIShmIGluc3RhbmNlb2YgVEZpbGUpKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLk5PVF9GSUxFLCBgXHU4REVGXHU1Rjg0XHU0RTBEXHU2NjJGXHU2NTg3XHU0RUY2XHVGRjFBJHtyZWxOfWAsIDQwMClcbiAgICByZXR1cm4gZlxuICB9XG5cbiAgbGlzdE5vdGVzKG9wdHM6IHsgZm9sZGVyPzogc3RyaW5nOyBhbGw/OiBib29sZWFuOyBpZ25vcmVEaXJzOiBzdHJpbmdbXSB9KTogeyB0b3RhbDogbnVtYmVyOyBub3RlczogQnJpZGdlTm90ZUluZm9bXSB9IHtcbiAgICBjb25zdCBub3RlcyA9IHRoaXMudmF1bHRGaWxlcyhvcHRzKS5tYXAoKGYpID0+IHtcbiAgICAgIGNvbnN0IGl0ZW06IEJyaWRnZU5vdGVJbmZvID0geyBwYXRoOiBmLnBhdGgsIHNpemU6IGYuc3RhdC5zaXplIH1cbiAgICAgIGlmIChvcHRzLmFsbCkge1xuICAgICAgICBjb25zdCBkb3QgPSBmLnBhdGgubGFzdEluZGV4T2YoJy4nKVxuICAgICAgICBpdGVtLmV4dGVuc2lvbiA9IGYucGF0aC5lbmRzV2l0aCgnLm1kJykgPyAnbWQnIDogZG90ID4gMCA/IGYucGF0aC5zbGljZShkb3QgKyAxKS50b0xvd2VyQ2FzZSgpIDogJydcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVtXG4gICAgfSlcbiAgICByZXR1cm4geyB0b3RhbDogbm90ZXMubGVuZ3RoLCBub3RlcyB9XG4gIH1cblxuICBhc3luYyBsaXN0Rm9sZGVycyhvcHRzOiB7IGZvbGRlcj86IHN0cmluZzsgaWdub3JlRGlyczogc3RyaW5nW10gfSk6IFByb21pc2U8eyB0b3RhbDogbnVtYmVyOyBmb2xkZXJzOiBCcmlkZ2VGb2xkZXJTdGF0W10gfT4ge1xuICAgIGNvbnN0IGNvdW50cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KClcbiAgICBjb3VudHMuc2V0KCcnLCAwKVxuICAgIGNvbnN0IGFkYXB0ZXIgPSB0aGlzLmFwcC52YXVsdC5hZGFwdGVyXG4gICAgY29uc3Qgd2FsayA9IGFzeW5jIChkaXI6IHN0cmluZywgcmVsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGxldCBsaXN0OiB7IGZpbGVzOiBzdHJpbmdbXTsgZm9sZGVyczogc3RyaW5nW10gfVxuICAgICAgdHJ5IHtcbiAgICAgICAgbGlzdCA9IGF3YWl0IGFkYXB0ZXIubGlzdChkaXIpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGZvbGRlciBvZiBsaXN0LmZvbGRlcnMpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IChmb2xkZXIuc3BsaXQoJy8nKS5wb3AoKSA/PyAnJykucmVwbGFjZSgvXlxcLysvLCAnJylcbiAgICAgICAgaWYgKG5hbWUuc3RhcnRzV2l0aCgnLicpIHx8IG9wdHMuaWdub3JlRGlycy5pbmNsdWRlcyhuYW1lKSkgY29udGludWVcbiAgICAgICAgY29uc3QgcmVsRGlyID0gcmVsID09PSAnJyA/IG5hbWUgOiBgJHtyZWx9LyR7bmFtZX1gXG4gICAgICAgIGNvdW50cy5zZXQocmVsRGlyLCAwKVxuICAgICAgICBhd2FpdCB3YWxrKGZvbGRlciwgcmVsRGlyKVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGxpc3QuZmlsZXMpIHtcbiAgICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5tZCcpKSBjb3VudHMuc2V0KHJlbCwgKGNvdW50cy5nZXQocmVsKSA/PyAwKSArIDEpXG4gICAgICB9XG4gICAgfVxuICAgIGF3YWl0IHdhbGsoJycsICcnKVxuICAgIGxldCBmb2xkZXJzOiBCcmlkZ2VGb2xkZXJTdGF0W10gPSBbLi4uY291bnRzLmVudHJpZXMoKV0ubWFwKChbcGF0aCwgbm90ZXNdKSA9PiAoeyBwYXRoLCBub3RlcyB9KSlcbiAgICBpZiAob3B0cy5mb2xkZXIpIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IG9wdHMuZm9sZGVyLnJlcGxhY2UoL15cXC8rLywgJycpLnJlcGxhY2UoL1xcLyskLywgJycpXG4gICAgICBmb2xkZXJzID0gZm9sZGVycy5maWx0ZXIoKGYpID0+IGYucGF0aCA9PT0gcHJlZml4IHx8IGYucGF0aC5zdGFydHNXaXRoKHByZWZpeCArICcvJykpXG4gICAgfVxuICAgIGZvbGRlcnMuc29ydCgoYSwgYikgPT4gYS5wYXRoLmxvY2FsZUNvbXBhcmUoYi5wYXRoKSlcbiAgICByZXR1cm4geyB0b3RhbDogZm9sZGVycy5sZW5ndGgsIGZvbGRlcnMgfVxuICB9XG5cbiAgYXN5bmMgcmVhZE5vdGUocmVsOiBzdHJpbmcpOiBQcm9taXNlPHsgcGF0aDogc3RyaW5nOyBjb250ZW50OiBzdHJpbmc7IHNpemU/OiBudW1iZXI7IG10aW1lPzogbnVtYmVyIH0+IHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5maWxlT2YocmVsKVxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpXG4gICAgcmV0dXJuIHsgcGF0aDogZmlsZS5wYXRoLCBjb250ZW50LCBzaXplOiBmaWxlLnN0YXQuc2l6ZSwgbXRpbWU6IGZpbGUuc3RhdC5tdGltZSB9XG4gIH1cblxuICBhc3luYyBtZXRhZGF0YShyZWw6IHN0cmluZyk6IFByb21pc2U8QnJpZGdlTWV0YWRhdGFSZXN1bHQ+IHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5maWxlT2YocmVsKVxuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSlcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlclxuICAgIGNvbnN0IGlubGluZVRhZ3MgPSAoY2FjaGU/LnRhZ3MgPz8gW10pLm1hcCgodCkgPT4gdC50YWcucmVwbGFjZSgvXiMvLCAnJykpLmZpbHRlcigodCkgPT4gdC5sZW5ndGggPiAwKVxuICAgIGNvbnN0IHRhZ3MgPSBbLi4ubmV3IFNldChbLi4uaW5saW5lVGFncywgLi4uZm1UYWdzT2YoZnJvbnRtYXR0ZXIpXSldXG4gICAgY29uc3QgYWxpYXNlcyA9IGZtQWxpYXNlc09mKGZyb250bWF0dGVyKVxuXG4gICAgY29uc3Qgd2lraWxpbmtzOiBCcmlkZ2VMaW5rSW5mb1tdID0gW11cbiAgICBjb25zdCBtYXJrZG93bjogQnJpZGdlTWFya2Rvd25MaW5rW10gPSBbXVxuICAgIGxldCB1bnJlc29sdmVkID0gMFxuICAgIGNvbnN0IGNvdW50VW5yZXNvbHZlZCA9IChkZXN0OiBURmlsZSB8IG51bGwpOiB2b2lkID0+IHtcbiAgICAgIGlmICghZGVzdCkgdW5yZXNvbHZlZCsrXG4gICAgfVxuICAgIGZvciAoY29uc3QgbGluayBvZiBjYWNoZT8ubGlua3MgPz8gW10pIHtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGxpbmsubGluaywgZmlsZS5wYXRoKVxuICAgICAgY291bnRVbnJlc29sdmVkKGRlc3QpXG4gICAgICBpZiAoaXNXaWtpbGluayhsaW5rLm9yaWdpbmFsKSkge1xuICAgICAgICB3aWtpbGlua3MucHVzaCh7IGJvZHk6IHdpa2lsaW5rQm9keShsaW5rLm9yaWdpbmFsKSwgZW1iZWRkZWQ6IGZhbHNlIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBtZCA9IHBhcnNlTWFya2Rvd25MaW5rKGxpbmsub3JpZ2luYWwpXG4gICAgICAgIGlmICghaXNFeHRlcm5hbFVybChtZC50YXJnZXQpKSBtYXJrZG93bi5wdXNoKG1kKVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGVtYiBvZiBjYWNoZT8uZW1iZWRzID8/IFtdKSB7XG4gICAgICBjb3VudFVucmVzb2x2ZWQodGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaXJzdExpbmtwYXRoRGVzdChlbWIubGluaywgZmlsZS5wYXRoKSlcbiAgICAgIHdpa2lsaW5rcy5wdXNoKHsgYm9keTogd2lraWxpbmtCb2R5KGVtYi5vcmlnaW5hbCksIGVtYmVkZGVkOiB0cnVlIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhdGg6IGZpbGUucGF0aCxcbiAgICAgIHNpemU6IGZpbGUuc3RhdC5zaXplLFxuICAgICAgbXRpbWU6IGZpbGUuc3RhdC5tdGltZSxcbiAgICAgIGZyb250bWF0dGVyOiB7IHByZXNlbnQ6IGZyb250bWF0dGVyICE9PSB1bmRlZmluZWQsIGZpZWxkczogZmllbGRzT2YoZnJvbnRtYXR0ZXIpIH0sXG4gICAgICB0YWdzLFxuICAgICAgYWxpYXNlcyxcbiAgICAgIHdpa2lsaW5rcyxcbiAgICAgIG1hcmtkb3duLFxuICAgICAgdW5yZXNvbHZlZCxcbiAgICB9XG4gIH1cblxuICBhc3luYyBmcm9udG1hdHRlcihyZWw6IHN0cmluZyk6IFByb21pc2U8QnJpZGdlRnJvbnRtYXR0ZXJSZXN1bHQ+IHtcbiAgICBjb25zdCBtZXRhID0gYXdhaXQgdGhpcy5tZXRhZGF0YShyZWwpXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhdGg6IG1ldGEucGF0aCxcbiAgICAgIHByZXNlbnQ6IG1ldGEuZnJvbnRtYXR0ZXIucHJlc2VudCxcbiAgICAgIHZhbGlkOiB0cnVlLFxuICAgICAgZmllbGRzOiBtZXRhLmZyb250bWF0dGVyLmZpZWxkcyxcbiAgICAgIGlzc3VlczogW10sXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgYmFja2xpbmtzKHJlcTogQnJpZGdlQmFja2xpbmtzUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlQmFja2xpbmtzUmVzdWx0PiB7XG4gICAgY29uc3QgZm9ybWF0ID0gcmVxLmZvcm1hdCA/PyAnd2lraWxpbmsnXG4gICAgbGV0IHRhcmdldFJlbDogc3RyaW5nIHwgdW5kZWZpbmVkXG4gICAgbGV0IGFtYmlndW91cyA9IGZhbHNlXG4gICAgaWYgKHJlcS5wYXRoICYmIHJlcS5wYXRoLnRyaW0oKSkge1xuICAgICAgdGFyZ2V0UmVsID0gdGhpcy5maWxlT2YocmVxLnBhdGgpLnBhdGhcbiAgICB9IGVsc2UgaWYgKHJlcS50aXRsZSAmJiByZXEudGl0bGUudHJpbSgpKSB7XG4gICAgICBjb25zdCB0aXRsZSA9IHJlcS50aXRsZS50cmltKClcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLmFwcC52YXVsdFxuICAgICAgICAuZ2V0TWFya2Rvd25GaWxlcygpXG4gICAgICAgIC5maWx0ZXIoKGYpID0+IHN0ZW1PZihmLnBhdGgpLnRvTG93ZXJDYXNlKCkgPT09IHRpdGxlLnRvTG93ZXJDYXNlKCkpXG4gICAgICBhbWJpZ3VvdXMgPSBjYW5kaWRhdGVzLmxlbmd0aCA+IDFcbiAgICAgIGNhbmRpZGF0ZXMuc29ydCgoYSwgYikgPT4gYS5wYXRoLmxlbmd0aCAtIGIucGF0aC5sZW5ndGggfHwgYS5wYXRoLmxvY2FsZUNvbXBhcmUoYi5wYXRoKSlcbiAgICAgIHRhcmdldFJlbCA9IGNhbmRpZGF0ZXNbMF0/LnBhdGhcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEJyaWRnZUVycm9yKEJyaWRnZUVycm9yQ29kZS5JTlZBTElEX0FSR1MsICdwYXRoIFx1NEUwRSB0aXRsZSBcdTgxRjNcdTVDMTFcdTYzRDBcdTRGOUJcdTUxNzZcdTRFMDAnLCA0MDApXG4gICAgfVxuXG4gICAgaWYgKCF0YXJnZXRSZWwpIHtcbiAgICAgIHJldHVybiB7IHRvdGFsOiAwLCBiYWNrbGlua3M6IFtdLCB0YXJnZXQ6IHJlcS50aXRsZSwgYW1iaWd1b3VzIH1cbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0S2V5ID0gdGFyZ2V0UmVsLnRvTG93ZXJDYXNlKClcbiAgICBjb25zdCB0YXJnZXRTdGVtID0gc3RlbU9mKHRhcmdldFJlbCkudG9Mb3dlckNhc2UoKVxuICAgIGNvbnN0IGNoZWNrV2lraWxpbmsgPSBmb3JtYXQgPT09ICd3aWtpbGluaycgfHwgZm9ybWF0ID09PSAnYWxsJ1xuICAgIGNvbnN0IGNoZWNrTWFya2Rvd24gPSBmb3JtYXQgPT09ICdtYXJrZG93bicgfHwgZm9ybWF0ID09PSAnYWxsJ1xuXG4gICAgY29uc3QgaGl0czogQnJpZGdlSGl0W10gPSBbXVxuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKSkge1xuICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShzb3VyY2UpXG4gICAgICBpZiAoIWNhY2hlKSBjb250aW51ZVxuICAgICAgbGV0IGhpdDogQnJpZGdlSGl0IHwgdW5kZWZpbmVkXG4gICAgICBjb25zdCBjb25zaWRlciA9IChsaW5rOiB7IGxpbms6IHN0cmluZzsgb3JpZ2luYWw6IHN0cmluZyB9LCBpc0VtYmVkOiBib29sZWFuKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGNvbnN0IG1kID0gIWlzV2lraWxpbmsobGluay5vcmlnaW5hbCkgJiYgIWlzRW1iZWRcbiAgICAgICAgaWYgKG1kICYmICFjaGVja01hcmtkb3duKSByZXR1cm4gZmFsc2VcbiAgICAgICAgaWYgKCFtZCAmJiAhY2hlY2tXaWtpbGluaykgcmV0dXJuIGZhbHNlXG4gICAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGxpbmsubGluaywgc291cmNlLnBhdGgpXG4gICAgICAgIGlmIChkZXN0KSByZXR1cm4gZGVzdC5wYXRoLnRvTG93ZXJDYXNlKCkgPT09IHRhcmdldEtleVxuICAgICAgICAvLyBcdTY3MkFcdTg5RTNcdTY3OTBcdTk0RkVcdTYzQTVcdUZGMUFcdTYzMDlcdTg4RjhcdTc2RUVcdTY4MDdcdThERUZcdTVGODQgLyBzdGVtIFx1NTMzOVx1OTE0RFxuICAgICAgICBpZiAocmVxLnBhdGgpIHtcbiAgICAgICAgICByZXR1cm4gbGluay5saW5rLnJlcGxhY2UoL1xcLm1kJC9pLCAnJykudG9Mb3dlckNhc2UoKSA9PT0gdGFyZ2V0S2V5LnJlcGxhY2UoL1xcLm1kJC9pLCAnJylcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgIHN0ZW1PZihsaW5rLmxpbmspLnRvTG93ZXJDYXNlKCkgPT09IHRhcmdldFN0ZW1cbiAgICAgICAgICB8fCBsaW5rLmxpbmsucmVwbGFjZSgvXFwubWQkL2ksICcnKS50b0xvd2VyQ2FzZSgpID09PSB0YXJnZXRLZXkucmVwbGFjZSgvXFwubWQkL2ksICcnKVxuICAgICAgICApXG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGxpbmsgb2YgY2FjaGUubGlua3MgPz8gW10pIHtcbiAgICAgICAgaWYgKGNvbnNpZGVyKGxpbmssIGZhbHNlKSkge1xuICAgICAgICAgIGhpdCA9IGF3YWl0IHRoaXMuc25pcHBldEhpdChzb3VyY2UsIGxpbmspXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFoaXQgJiYgY2hlY2tXaWtpbGluaykge1xuICAgICAgICBmb3IgKGNvbnN0IGVtYiBvZiBjYWNoZS5lbWJlZHMgPz8gW10pIHtcbiAgICAgICAgICBpZiAoY29uc2lkZXIoZW1iLCB0cnVlKSkge1xuICAgICAgICAgICAgaGl0ID0gYXdhaXQgdGhpcy5zbmlwcGV0SGl0KHNvdXJjZSwgZW1iKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChoaXQpIGhpdHMucHVzaChoaXQpXG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdDogQnJpZGdlQmFja2xpbmtzUmVzdWx0ID0ge1xuICAgICAgdG90YWw6IGhpdHMubGVuZ3RoLFxuICAgICAgYmFja2xpbmtzOiBoaXRzLFxuICAgICAgdGFyZ2V0OiByZXEucGF0aCA/IHRhcmdldFJlbC5yZXBsYWNlKC9cXC5tZCQvLCAnJykgOiByZXEudGl0bGUsXG4gICAgfVxuICAgIGlmIChhbWJpZ3VvdXMpIHJlc3VsdC5hbWJpZ3VvdXMgPSB0cnVlXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzbmlwcGV0SGl0KFxuICAgIHNvdXJjZTogVEZpbGUsXG4gICAgbGluazogeyBsaW5rOiBzdHJpbmc7IG9yaWdpbmFsOiBzdHJpbmc7IHBvc2l0aW9uPzogeyBzdGFydD86IHsgb2Zmc2V0PzogbnVtYmVyIH0gfSB9LFxuICApOiBQcm9taXNlPEJyaWRnZUhpdD4ge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jYWNoZWRSZWFkKHNvdXJjZSlcbiAgICBjb25zdCBvZmZzZXQgPSBsaW5rLnBvc2l0aW9uPy5zdGFydD8ub2Zmc2V0ID8/IGNvbnRlbnQuaW5kZXhPZihsaW5rLm9yaWdpbmFsKVxuICAgIHJldHVybiB7XG4gICAgICBwYXRoOiBzb3VyY2UucGF0aCxcbiAgICAgIHNuaXBwZXQ6IG9mZnNldCA+PSAwID8gZXhjZXJwdEFyb3VuZChjb250ZW50LCBvZmZzZXQsIE1hdGgubWF4KGxpbmsub3JpZ2luYWwubGVuZ3RoLCAxKSkgOiAnXHU5NEZFXHU2M0E1XHU1NDdEXHU0RTJEJyxcbiAgICB9XG4gIH1cblxuICBhc3luYyBzZWFyY2gocmVxOiBCcmlkZ2VTZWFyY2hSZXF1ZXN0KTogUHJvbWlzZTx7IHRvdGFsOiBudW1iZXI7IGhpdHM6IEJyaWRnZUhpdFtdIH0+IHtcbiAgICBjb25zdCBxID0gcmVxLnEudHJpbSgpXG4gICAgaWYgKHEgPT09ICcnKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLklOVkFMSURfQVJHUywgJ3F1ZXJ5IFx1NEUwRFx1ODBGRFx1NEUzQVx1N0E3QScsIDQwMClcbiAgICBjb25zdCByZWdleCA9IHJlcS5yZWdleCA/PyBmYWxzZVxuICAgIGNvbnN0IGNhc2VTZW5zaXRpdmUgPSByZXEuY2FzZV9zZW5zaXRpdmUgPz8gZmFsc2VcbiAgICBjb25zdCBtYXRjaEFsbCA9IHJlcS5tYXRjaF9hbGwgPz8gZmFsc2VcbiAgICBsZXQgcmU6IFJlZ0V4cCB8IHVuZGVmaW5lZFxuICAgIGlmIChyZWdleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmUgPSBuZXcgUmVnRXhwKHEsIGNhc2VTZW5zaXRpdmUgPyAnJyA6ICdpJylcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoXG4gICAgICAgICAgQnJpZGdlRXJyb3JDb2RlLlJFR0VYX0lOVkFMSUQsXG4gICAgICAgICAgYFx1NkI2M1x1NTIxOVx1NjVFMFx1NjU0OFx1RkYxQSR7cX1cdUZGMDgke2VyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKX1cdUZGMDlgLFxuICAgICAgICAgIDQwMCxcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0b2tlbnMgPSAhcmVnZXggJiYgbWF0Y2hBbGwgPyBxLnNwbGl0KC9cXHMrLykuZmlsdGVyKCh0KSA9PiB0Lmxlbmd0aCA+IDApIDogdW5kZWZpbmVkXG4gICAgY29uc3QgbGltaXQgPSBNYXRoLm1heCgxLCBNYXRoLm1pbihyZXEubGltaXQgPz8gMjAsIDIwMCkpXG4gICAgY29uc3QgZmlsZXMgPSB0aGlzLnZhdWx0RmlsZXMoeyBmb2xkZXI6IHJlcS5mb2xkZXIsIGFsbDogZmFsc2UsIGlnbm9yZURpcnM6IHJlcS5pZ25vcmVEaXJzIH0pXG4gICAgY29uc3QgaGl0czogQnJpZGdlSGl0W10gPSBbXVxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgaWYgKGhpdHMubGVuZ3RoID49IGxpbWl0KSBicmVha1xuICAgICAgbGV0IGNvbnRlbnQ6IHN0cmluZ1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSlcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgY29uc3QgcGF0aCA9IGZpbGUucGF0aFxuICAgICAgY29uc3QgdGV4dCA9IGNvbnRlbnRcbiAgICAgIGNvbnN0IGhheXN0YWNrID0gY2FzZVNlbnNpdGl2ZSA/IGAke3BhdGh9XFxuJHt0ZXh0fWAgOiBgJHtwYXRofVxcbiR7dGV4dH1gLnRvTG93ZXJDYXNlKClcbiAgICAgIGxldCBuYW1lTWF0Y2ggPSBmYWxzZVxuICAgICAgbGV0IGJvZHlJbmRleCA9IC0xXG4gICAgICBsZXQgbWF0Y2hMZW4gPSAwXG4gICAgICBpZiAocmVnZXggJiYgcmUpIHtcbiAgICAgICAgY29uc3QgbSA9IHJlLmV4ZWModGV4dClcbiAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICBib2R5SW5kZXggPSBtLmluZGV4XG4gICAgICAgICAgbWF0Y2hMZW4gPSBtWzBdLmxlbmd0aFxuICAgICAgICB9XG4gICAgICAgIG5hbWVNYXRjaCA9IHJlLnRlc3QocGF0aClcbiAgICAgIH0gZWxzZSBpZiAodG9rZW5zKSB7XG4gICAgICAgIG5hbWVNYXRjaCA9IHRva2Vucy5ldmVyeSgodCkgPT4gaGF5c3RhY2suaW5jbHVkZXMoY2FzZVNlbnNpdGl2ZSA/IHQgOiB0LnRvTG93ZXJDYXNlKCkpKVxuICAgICAgICBpZiAobmFtZU1hdGNoKSB7XG4gICAgICAgICAgZm9yIChjb25zdCB0IG9mIHRva2Vucykge1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gKGNhc2VTZW5zaXRpdmUgPyB0ZXh0IDogdGV4dC50b0xvd2VyQ2FzZSgpKS5pbmRleE9mKGNhc2VTZW5zaXRpdmUgPyB0IDogdC50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgICAgIGJvZHlJbmRleCA9IGlkeFxuICAgICAgICAgICAgICBtYXRjaExlbiA9IHQubGVuZ3RoXG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBuZWVkbGUgPSBjYXNlU2Vuc2l0aXZlID8gcSA6IHEudG9Mb3dlckNhc2UoKVxuICAgICAgICBuYW1lTWF0Y2ggPSBwYXRoLmluY2x1ZGVzKG5lZWRsZSkgfHwgaGF5c3RhY2suaW5jbHVkZXMobmVlZGxlKVxuICAgICAgICBib2R5SW5kZXggPSAoY2FzZVNlbnNpdGl2ZSA/IHRleHQgOiB0ZXh0LnRvTG93ZXJDYXNlKCkpLmluZGV4T2YobmVlZGxlKVxuICAgICAgICBtYXRjaExlbiA9IHEubGVuZ3RoXG4gICAgICB9XG4gICAgICBpZiAoKG5hbWVNYXRjaCB8fCBib2R5SW5kZXggPj0gMCkgJiYgaGl0cy5sZW5ndGggPCBsaW1pdCkge1xuICAgICAgICBoaXRzLnB1c2goe1xuICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgc25pcHBldDogYm9keUluZGV4ID49IDAgPyBleGNlcnB0QXJvdW5kKHRleHQsIGJvZHlJbmRleCwgTWF0aC5tYXgobWF0Y2hMZW4sIDEpKSA6ICdcdTY1ODdcdTRFRjZcdTU0MERcdTU0N0RcdTRFMkRcdUZGMDhcdTZCNjNcdTY1ODdcdTY1RTBcdTUzMzlcdTkxNERcdUZGMDknLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geyB0b3RhbDogaGl0cy5sZW5ndGgsIGhpdHMgfVxuICB9XG5cbiAgYXN5bmMgc2VhcmNoVGFncyhyZXE6IEJyaWRnZVRhZ3NSZXF1ZXN0KTogUHJvbWlzZTx7IHRvdGFsOiBudW1iZXI7IGhpdHM6IEJyaWRnZVRhZ0hpdFtdIH0+IHtcbiAgICBjb25zdCBxID0gcmVxLnRhZy50cmltKCkudG9Mb3dlckNhc2UoKVxuICAgIGlmIChxID09PSAnJykgdGhyb3cgbmV3IEJyaWRnZUVycm9yKEJyaWRnZUVycm9yQ29kZS5JTlZBTElEX0FSR1MsICd0YWcgXHU0RTBEXHU4MEZEXHU0RTNBXHU3QTdBJywgNDAwKVxuICAgIGNvbnN0IGxpbWl0ID0gTWF0aC5tYXgoMSwgTWF0aC5taW4ocmVxLmxpbWl0ID8/IDIwLCAyMDApKVxuICAgIGNvbnN0IGhpdHM6IEJyaWRnZVRhZ0hpdFtdID0gW11cbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgdGhpcy52YXVsdEZpbGVzKHsgZm9sZGVyOiByZXEuZm9sZGVyLCBhbGw6IGZhbHNlLCBpZ25vcmVEaXJzOiByZXEuaWdub3JlRGlycyB9KSkge1xuICAgICAgaWYgKGhpdHMubGVuZ3RoID49IGxpbWl0KSBicmVha1xuICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKVxuICAgICAgY29uc3QgaW5saW5lID0gKGNhY2hlPy50YWdzID8/IFtdKS5tYXAoKHQpID0+IHQudGFnLnJlcGxhY2UoL14jLywgJycpKS5maWx0ZXIoKHQpID0+IHQubGVuZ3RoID4gMClcbiAgICAgIGNvbnN0IGFsbCA9IFsuLi5uZXcgU2V0KFsuLi5pbmxpbmUsIC4uLmZtVGFnc09mKGNhY2hlPy5mcm9udG1hdHRlcildKV1cbiAgICAgIGNvbnN0IG1hdGNoZWQgPSBhbGxcbiAgICAgICAgLmZpbHRlcigodCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGwgPSB0LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICByZXR1cm4gbCA9PT0gcSB8fCBsLnN0YXJ0c1dpdGgocSArICcvJylcbiAgICAgICAgfSlcbiAgICAgICAgLnNvcnQoKVxuICAgICAgaWYgKG1hdGNoZWQubGVuZ3RoID4gMCkgaGl0cy5wdXNoKHsgcGF0aDogZmlsZS5wYXRoLCB0YWdzOiBtYXRjaGVkIH0pXG4gICAgfVxuICAgIHJldHVybiB7IHRvdGFsOiBoaXRzLmxlbmd0aCwgaGl0cyB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFx1NTE5OVx1NTE2NVxuXG4gIGFzeW5jIHdyaXRlTm90ZShyZXE6IEJyaWRnZVdyaXRlUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlV3JpdGVSZXN1bHQ+IHtcbiAgICBjb25zdCByZWwgPSBub3RlUmVsKHJlcS5wYXRoKVxuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJlbClcbiAgICBjb25zdCBieXRlTGVuID0gKHM6IHN0cmluZyk6IG51bWJlciA9PiBCdWZmZXIuYnl0ZUxlbmd0aChzLCAndXRmOCcpXG5cbiAgICAvLyBhcHBlbmRcdUZGMUFcdTg5ODFcdTZDNDJcdTVERjJcdTVCNThcdTU3MjhcdUZGMDhcdTRFMEVcdTVERTVcdTUxNzdcdTRGQTdcdThCRURcdTRFNDlcdTRFMDBcdTgxRjRcdUZGMDlcbiAgICBpZiAocmVxLm9wID09PSAnYXBwZW5kJykge1xuICAgICAgaWYgKCFleGlzdGluZykgdGhyb3cgbmV3IEJyaWRnZUVycm9yKEJyaWRnZUVycm9yQ29kZS5OT1RFX05PVF9GT1VORCwgYFx1N0IxNFx1OEJCMFx1NEUwRFx1NUI1OFx1NTcyOFx1RkYxQSR7cmVsfVx1RkYwOFx1NTk4Mlx1OTcwMFx1NjVCMFx1NUVGQVx1OEJGN1x1NzUyOCB2YXVsdF9jcmVhdGVfbm90ZVx1RkYwOWAsIDQwNClcbiAgICAgIGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgVEZpbGUpKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLk5PVF9GSUxFLCBgXHU4REVGXHU1Rjg0XHU0RTBEXHU2NjJGXHU2NTg3XHU0RUY2XHVGRjFBJHtyZWx9YCwgNDAwKVxuICAgICAgY29uc3QgY3VycmVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoZXhpc3RpbmcpXG4gICAgICBjb25zdCBnbHVlZCA9IGN1cnJlbnQgPT09ICcnIHx8IGN1cnJlbnQuZW5kc1dpdGgoJ1xcbicpIHx8IHJlcS5jb250ZW50LnN0YXJ0c1dpdGgoJ1xcbicpXG4gICAgICAgID8gY3VycmVudCArIHJlcS5jb250ZW50XG4gICAgICAgIDogY3VycmVudCArICdcXG4nICsgcmVxLmNvbnRlbnRcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShleGlzdGluZywgZ2x1ZWQpXG4gICAgICByZXR1cm4geyBwYXRoOiByZWwsIG9wZXJhdGlvbjogJ2FwcGVuZCcsIGFkZGVkQ2hhcnM6IHJlcS5jb250ZW50Lmxlbmd0aCwgYnl0ZXM6IGJ5dGVMZW4oZ2x1ZWQpLCBhZnRlcjogZ2x1ZWQgfVxuICAgIH1cblxuICAgIGlmIChleGlzdGluZykge1xuICAgICAgaWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkpIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuTk9UX0ZJTEUsIGBcdThERUZcdTVGODRcdTVERjJcdTVCNThcdTU3MjhcdTRGNDZcdTRFMERcdTY2MkZcdTY1ODdcdTRFRjZcdUZGMUEke3JlbH1gLCA0MDApXG4gICAgICBpZiAocmVxLnVuaXF1ZSkge1xuICAgICAgICAvLyBPYnNpZGlhbiBcdTk4Q0VcdTY4M0NcdTU1MkZcdTRFMDBcdTU0N0RcdTU0MERcdUZGMUFgbmFtZSAxLm1kYFx1MzAwMWBuYW1lIDIubWRgXHUyMDI2XG4gICAgICAgIGNvbnN0IG5vRXh0ID0gcmVsLnJlcGxhY2UoL1xcLm1kJC8sICcnKVxuICAgICAgICBjb25zdCBkaXIgPSBub0V4dC5pbmNsdWRlcygnLycpID8gbm9FeHQuc2xpY2UoMCwgbm9FeHQubGFzdEluZGV4T2YoJy8nKSkgOiAnJ1xuICAgICAgICBjb25zdCBiYXNlID0gbm9FeHQuc3BsaXQoJy8nKS5wb3AoKSA/PyAnbmFtZSdcbiAgICAgICAgbGV0IGkgPSAxXG4gICAgICAgIGxldCBjYW5kaWRhdGUgPSBkaXIgIT09ICcnID8gYCR7ZGlyfS8ke2Jhc2V9ICR7aX0ubWRgIDogYCR7YmFzZX0gJHtpfS5tZGBcbiAgICAgICAgd2hpbGUgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgaSsrXG4gICAgICAgICAgY2FuZGlkYXRlID0gZGlyICE9PSAnJyA/IGAke2Rpcn0vJHtiYXNlfSAke2l9Lm1kYCA6IGAke2Jhc2V9ICR7aX0ubWRgXG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGNhbmRpZGF0ZSwgcmVxLmNvbnRlbnQpXG4gICAgICAgIHJldHVybiB7IHBhdGg6IGNhbmRpZGF0ZSwgb3BlcmF0aW9uOiAnY3JlYXRlJywgYnl0ZXM6IGJ5dGVMZW4ocmVxLmNvbnRlbnQpIH1cbiAgICAgIH1cbiAgICAgIGlmICghcmVxLm92ZXJ3cml0ZSkge1xuICAgICAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLkVYSVNUUywgYFx1N0IxNFx1OEJCMFx1NURGMlx1NUI1OFx1NTcyOFx1RkYxQSR7cmVsfVx1RkYwOFx1NTk4Mlx1OTcwMFx1ODk4Nlx1NzZENlx1OEJGN1x1NEYyMCBvdmVyd3JpdGU6IHRydWVcdUZGMENcdTYyMTZcdTRGMjAgdW5pcXVlOiB0cnVlIFx1NzUxRlx1NjIxMFx1NTUyRlx1NEUwMFx1NTQwRFx1RkYwOWAsIDQwOSlcbiAgICAgIH1cbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShleGlzdGluZywgcmVxLmNvbnRlbnQpXG4gICAgICByZXR1cm4geyBwYXRoOiByZWwsIG9wZXJhdGlvbjogJ3VwZGF0ZScsIGJ5dGVzOiBieXRlTGVuKHJlcS5jb250ZW50KSB9XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHJlbCwgcmVxLmNvbnRlbnQpXG4gICAgcmV0dXJuIHsgcGF0aDogcmVsLCBvcGVyYXRpb246ICdjcmVhdGUnLCBieXRlczogYnl0ZUxlbihyZXEuY29udGVudCkgfVxuICB9XG5cbiAgYXN5bmMgZWRpdE5vdGUocmVxOiBCcmlkZ2VFZGl0UmVxdWVzdCk6IFByb21pc2U8QnJpZGdlRWRpdFJlc3VsdD4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVPZihyZXEucGF0aClcbiAgICBpZiAocmVxLm9sZF9zdHJpbmcgPT09ICcnKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLklOVkFMSURfQVJHUywgJ29sZF9zdHJpbmcgXHU0RTBEXHU4MEZEXHU0RTNBXHU3QTdBJywgNDAwKVxuICAgIGNvbnN0IGN1cnJlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpXG4gICAgY29uc3Qgb2xkUyA9IHJlcS5vbGRfc3RyaW5nLnJlcGxhY2VBbGwoJ1xcclxcbicsICdcXG4nKVxuICAgIGNvbnN0IG5vcm0gPSBjdXJyZW50LnJlcGxhY2VBbGwoJ1xcclxcbicsICdcXG4nKVxuICAgIGNvbnN0IGNvdW50ID0gbm9ybS5zcGxpdChvbGRTKS5sZW5ndGggLSAxXG4gICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLkVESVRfTk9UX0ZPVU5ELCBgXHU1NzI4ICR7ZmlsZS5wYXRofSBcdTRFMkRcdTY3MkFcdTYyN0VcdTUyMzBcdTRFMEUgb2xkX3N0cmluZyBcdTdDQkVcdTc4NkVcdTUzMzlcdTkxNERcdTc2ODRcdTY1ODdcdTY3MkNcdUZGMUJcdTdGMTZcdThGOTFcdTYzMDlcdTVCNTdcdTk3NjJcdTUzMzlcdTkxNERcdUZGMENcdThCRjdcdTUxNDggdmF1bHRfcmVhZF9ub3RlIFx1NjgzOFx1NUJGOVx1NTM5Rlx1NjU4N1x1RkYwOFx1NkNFOFx1NjEwRlx1NjM2Mlx1ODg0Q1x1NEUwRVx1OTk5Nlx1NUMzRVx1N0E3QVx1NzY3RFx1RkYwOWAsIDQwNClcbiAgICB9XG4gICAgaWYgKGNvdW50ID4gMSAmJiAhcmVxLnJlcGxhY2VfYWxsKSB7XG4gICAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLkFNQklHVU9VU19FRElULCBgb2xkX3N0cmluZyBcdTU3MjggJHtmaWxlLnBhdGh9IFx1NEUyRFx1NTFGQVx1NzNCMFx1NTkxQVx1NkIyMVx1RkYwOFx1OUVEOFx1OEJBNFx1NTNFQVx1NTE0MVx1OEJCOFx1NEUwMFx1NkIyMVx1N0NCRVx1Nzg2RVx1NjZGRlx1NjM2Mlx1RkYwOVx1RkYxQlx1OEJGN1x1NjNEMFx1NEY5Qlx1NjZGNFx1OTU3Rlx1NEUwQVx1NEUwQlx1NjU4N1x1RkYwQ1x1NjIxNlx1OEJCRSByZXBsYWNlX2FsbDogdHJ1ZWAsIDQwMClcbiAgICB9XG4gICAgY29uc3QgYWZ0ZXIgPSByZXEucmVwbGFjZV9hbGwgPyBub3JtLnNwbGl0KG9sZFMpLmpvaW4ocmVxLm5ld19zdHJpbmcpIDogbm9ybS5yZXBsYWNlKG9sZFMsIHJlcS5uZXdfc3RyaW5nKVxuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBhZnRlcilcbiAgICByZXR1cm4geyBwYXRoOiBmaWxlLnBhdGgsIGJlZm9yZTogY3VycmVudCwgYWZ0ZXIsIG1hdGNoZXM6IGNvdW50IH1cbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUZyb250bWF0dGVyKHJlcTogQnJpZGdlRnJvbnRtYXR0ZXJVcGRhdGVSZXF1ZXN0KTogUHJvbWlzZTxCcmlkZ2VGcm9udG1hdHRlclVwZGF0ZVJlc3VsdD4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVPZihyZXEucGF0aClcbiAgICBjb25zdCBzZXRFbnRyaWVzID0gT2JqZWN0LmVudHJpZXMocmVxLnNldCA/PyB7fSlcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzZXRFbnRyaWVzKSB7XG4gICAgICBpZiAoL1tcXHJcXG5dLy50ZXN0KHYpKSB7XG4gICAgICAgIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuRlJPTlRNQVRURVJfTVVMVElMSU5FLCBgZnJvbnRtYXR0ZXIgXHU1MDNDXHU1RkM1XHU5ODdCXHU1MzU1XHU4ODRDXHVGRjA4XHU1QjU3XHU2QkI1ICR7a30gXHU3Njg0XHU1M0Q2XHU1MDNDXHU1NDJCXHU2MzYyXHU4ODRDXHVGRjA5XHVGRjFCXHU1MjE3XHU4ODY4XHU4QkY3XHU3NTI4XHU1MTg1XHU4MDU0XHU2NTcwXHU3RUM0IFthLCBiXWAsIDQwMClcbiAgICAgIH1cbiAgICAgIGlmIChrLnRyaW0oKSA9PT0gJycgfHwgIS9eW146I11bXjpdKiQvLnRlc3QoaykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyaWRnZUVycm9yKEJyaWRnZUVycm9yQ29kZS5JTlZBTElEX0FSR1MsIGBcdTY1RTBcdTY1NDhcdTc2ODQgZnJvbnRtYXR0ZXIgXHU1QjU3XHU2QkI1XHU1NDBEXHVGRjFBJHtrfWAsIDQwMClcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZGVsID0gKHJlcS5kZWxldGUgPz8gW10pLm1hcCgoaykgPT4gay50cmltKCkpLmZpbHRlcigoaykgPT4gay5sZW5ndGggPiAwKVxuICAgIGlmIChzZXRFbnRyaWVzLmxlbmd0aCA9PT0gMCAmJiBkZWwubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLklOVkFMSURfQVJHUywgJ3NldCBcdTRFMEUgZGVsZXRlIFx1ODFGM1x1NUMxMVx1NjNEMFx1NEY5Qlx1NTE3Nlx1NEUwMCcsIDQwMClcbiAgICB9XG5cbiAgICBjb25zdCBiZWZvcmVDYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpXG4gICAgY29uc3QgY3JlYXRlZCA9IGJlZm9yZUNhY2hlPy5mcm9udG1hdHRlciA9PT0gdW5kZWZpbmVkXG4gICAgY29uc3QgYmVmb3JlID0gZmllbGRzT2YoYmVmb3JlQ2FjaGU/LmZyb250bWF0dGVyKVxuICAgIGNvbnN0IGNoYW5nZXM6IEJyaWRnZUZyb250bWF0dGVyVXBkYXRlUmVzdWx0WydjaGFuZ2VzJ10gPSBbXG4gICAgICAuLi5zZXRFbnRyaWVzLm1hcCgoW2tleSwgdmFsdWVdKSA9PiAoeyBvcDogJ3NldCcgYXMgY29uc3QsIGtleSwgdmFsdWUgfSkpLFxuICAgICAgLi4uZGVsLm1hcCgoa2V5KSA9PiAoeyBvcDogJ2RlbGV0ZScgYXMgY29uc3QsIGtleSB9KSksXG4gICAgXVxuXG4gICAgbGV0IHNhdmVkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZFxuICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHNldEVudHJpZXMpIGZtW2tdID0gcGFyc2VGbVNjYWxhcih2KVxuICAgICAgZm9yIChjb25zdCBrIG9mIGRlbCkgZGVsZXRlIGZtW2tdXG4gICAgICBzYXZlZCA9IHsgLi4uZm0gfVxuICAgIH0pXG4gICAgY29uc3QgYWZ0ZXIgPSBmaWVsZHNPZihzYXZlZClcbiAgICByZXR1cm4geyBwYXRoOiBmaWxlLnBhdGgsIGNyZWF0ZWQsIGNoYW5nZXMsIGJlZm9yZSwgYWZ0ZXIsIGlzc3VlczogW10gfVxuICB9XG5cbiAgYXN5bmMgcmVuYW1lKHJlcTogQnJpZGdlUmVuYW1lUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlUmVuYW1lUmVzdWx0PiB7XG4gICAgY29uc3Qgb2xkUmVsID0gbm90ZVJlbChyZXEub2xkX3BhdGgpXG4gICAgY29uc3QgbmV3UmVsID0gbm90ZVJlbChyZXEubmV3X3BhdGgpXG4gICAgaWYgKG9sZFJlbCA9PT0gbmV3UmVsKSB0aHJvdyBuZXcgQnJpZGdlRXJyb3IoQnJpZGdlRXJyb3JDb2RlLklOVkFMSURfQVJHUywgJ1x1NjVCMFx1NjVFN1x1OERFRlx1NUY4NFx1NzZGOFx1NTQwQ1x1RkYwQ1x1NjVFMFx1OTcwMFx1OTFDRFx1NTQ3RFx1NTQwRCcsIDQwMClcbiAgICBjb25zdCBvbGRGaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKG9sZFJlbClcbiAgICBpZiAoIW9sZEZpbGUpIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuTk9URV9OT1RfRk9VTkQsIGBcdTdCMTRcdThCQjBcdTRFMERcdTVCNThcdTU3MjhcdUZGMUEke29sZFJlbH1gLCA0MDQpXG4gICAgaWYgKCEob2xkRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkgdGhyb3cgbmV3IEJyaWRnZUVycm9yKEJyaWRnZUVycm9yQ29kZS5OT1RfRklMRSwgYFx1OERFRlx1NUY4NFx1NEUwRFx1NjYyRlx1NjU4N1x1NEVGNlx1RkYxQSR7b2xkUmVsfWAsIDQwMClcbiAgICBpZiAodGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKG5ld1JlbCkpIHtcbiAgICAgIHRocm93IG5ldyBCcmlkZ2VFcnJvcihCcmlkZ2VFcnJvckNvZGUuRVhJU1RTLCBgXHU3NkVFXHU2ODA3XHU1REYyXHU1QjU4XHU1NzI4XHVGRjFBJHtuZXdSZWx9YCwgNDA5KVxuICAgIH1cblxuICAgIC8vIFx1NjUzOVx1NTI0RFx1N0VERlx1OEJBMVx1RkYxQVx1NTRFQVx1NEU5Qlx1NjU4N1x1NEVGNlx1OTRGRVx1NjNBNVx1NTIzMFx1NjVFN1x1OERFRlx1NUY4NFx1RkYwOE9ic2lkaWFuIFx1ODlFM1x1Njc5MFx1ODlDNlx1ODlEMlx1RkYwOVx1RkYwQ1x1NzUyOFx1NEU4RVx1NTZERVx1NjJBNSB1cGRhdGVkIFx1NTIxN1x1ODg2OFxuICAgIGNvbnN0IGNvdW50UmVmcyA9IGFzeW5jIChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc3JjID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpXG4gICAgICBpZiAoIShzcmMgaW5zdGFuY2VvZiBURmlsZSkpIHJldHVybiAwXG4gICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKHNyYylcbiAgICAgIGlmICghY2FjaGUpIHJldHVybiAwXG4gICAgICBsZXQgbiA9IDBcbiAgICAgIGZvciAoY29uc3QgbGluayBvZiBbLi4uKGNhY2hlLmxpbmtzID8/IFtdKSwgLi4uKGNhY2hlLmVtYmVkcyA/PyBbXSldKSB7XG4gICAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGxpbmsubGluaywgc3JjLnBhdGgpXG4gICAgICAgIGlmIChkZXN0ICYmIGRlc3QucGF0aCA9PT0gb2xkUmVsKSBuKytcbiAgICAgIH1cbiAgICAgIHJldHVybiBuXG4gICAgfVxuICAgIGNvbnN0IHNlbGZDb3VudCA9IGF3YWl0IGNvdW50UmVmcyhvbGRSZWwpXG4gICAgY29uc3QgdXBkYXRlZDogQXJyYXk8eyBwYXRoOiBzdHJpbmc7IGNvdW50OiBudW1iZXIgfT4gPSBbXVxuICAgIGZvciAoY29uc3QgZiBvZiB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcbiAgICAgIGlmIChmLnBhdGggPT09IG9sZFJlbCkgY29udGludWVcbiAgICAgIGNvbnN0IG4gPSBhd2FpdCBjb3VudFJlZnMoZi5wYXRoKVxuICAgICAgaWYgKG4gPiAwKSB1cGRhdGVkLnB1c2goeyBwYXRoOiBmLnBhdGgsIGNvdW50OiBuIH0pXG4gICAgfVxuXG4gICAgLy8gZmlsZU1hbmFnZXIucmVuYW1lRmlsZVx1RkYxQU9ic2lkaWFuIFx1NjMwOVx1NzUyOFx1NjIzN1x1MzAwQ1x1ODFFQVx1NTJBOFx1NjZGNFx1NjVCMFx1NTE4NVx1OTBFOFx1OTRGRVx1NjNBNVx1MzAwRFx1OEJCRVx1N0Y2RVx1NTM5Rlx1NUI1MFx1NjZGNFx1NjVCMFx1NUYxNVx1NzUyOFxuICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnJlbmFtZUZpbGUob2xkRmlsZSwgbmV3UmVsKVxuXG4gICAgbGV0IG9sZEhhbmRsaW5nOiAna2VwdCcgfCAnc3R1YmJlZCcgPSAna2VwdCdcbiAgICBpZiAocmVxLmtlZXBfb2xkID09PSAnc3R1YicpIHtcbiAgICAgIGNvbnN0IHN0dWIgPSBgLS0tXFxubW92ZWQ6IHRydWVcXG4tLS1cXG5cXG4+IFx1NkI2NFx1N0IxNFx1OEJCMFx1NURGMlx1NzlGQlx1ODFGMyBbWyR7bmV3UmVsLnJlcGxhY2UoL1xcLm1kJC8sICcnKX1dXVx1MzAwMlxcblxcblx1RkYwOFx1NTM5Rlx1OERFRlx1NUY4NFx1NEZERFx1NzU1OVx1NEUzQVx1OERGM1x1OEY2Q1x1NTM2MFx1NEY0RFx1RkYxQlx1NTk4Mlx1OTcwMFx1NUY3Qlx1NUU5NVx1NTIyMFx1OTY2NFx1OEJGN1x1NzUyOCBiYXNoIFx1NkUwNVx1NzQwNlx1MzAwMlx1RkYwOVxcbmBcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShvbGRSZWwsIHN0dWIpXG4gICAgICAgIG9sZEhhbmRsaW5nID0gJ3N0dWJiZWQnXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpXG4gICAgICAgIHRocm93IG5ldyBCcmlkZ2VFcnJvcihcbiAgICAgICAgICBCcmlkZ2VFcnJvckNvZGUuUkVOQU1FX1NUVUJfRkFJTEVELFxuICAgICAgICAgIGBcdTUxOTlcdThERjNcdThGNkNcdTUzNjBcdTRGNERcdTU5MzFcdThEMjUgJHtvbGRSZWx9XHVGRjFBJHttc2d9XHUzMDAyXHU5MUNEXHU1NDdEXHU1NDBEXHU2NzJDXHU4RUFCXHU1REYyXHU1QjhDXHU2MjEwXHVGRjA4XHU2NUIwXHU2NTg3XHU0RUY2ICR7bmV3UmVsfSBcdTVERjJcdTUyMUJcdTVFRkFcdTMwMDFcdTVGMTVcdTc1MjhcdTVERjJcdTY2RjRcdTY1QjBcdUZGMDlcdUZGMENcdTRFQzVcdTY1RTdcdTY1ODdcdTRFRjZcdTUxODVcdTVCQjlcdTY3MkFcdTUzRDhcdTMwMDJgLFxuICAgICAgICAgIDUwMCxcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2VsZkNvdW50ID4gMCkgdXBkYXRlZC51bnNoaWZ0KHsgcGF0aDogbmV3UmVsLCBjb3VudDogc2VsZkNvdW50IH0pXG4gICAgY29uc3QgdG90YWxMaW5rcyA9IHVwZGF0ZWQucmVkdWNlKChzLCB1KSA9PiBzICsgdS5jb3VudCwgMClcbiAgICByZXR1cm4geyBvbGRfcGF0aDogb2xkUmVsLCBuZXdfcGF0aDogbmV3UmVsLCB0b3RhbExpbmtzLCB1cGRhdGVkLCBvbGRfaGFuZGxpbmc6IG9sZEhhbmRsaW5nIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU2MjY5XHU1QzU1XHU4MEZEXHU1MjlCXG5cbiAgLyoqXG4gICAqIFx1NTZERVx1NjUzNlx1N0FEOVx1NTIyMFx1OTY2NFx1RkYxQWZpbGVNYW5hZ2VyLnRyYXNoRmlsZSBcdTYzMDlcdTc1MjhcdTYyMzcgT2JzaWRpYW4gXHU4QkJFXHU3RjZFXHVGRjA4XHU3OUZCXHU1MTY1IC50cmFzaC8gXHU2MjE2XG4gICAqIFx1N0NGQlx1N0VERlx1NTZERVx1NjUzNlx1N0FEOVx1RkYwQ1x1NTNFRlx1NjA2Mlx1NTkwRFx1RkYwOVx1RkYxQlx1NjVFN1x1NzI0OCBPYnNpZGlhblx1RkYwODwxLjcuMFx1RkYwOVx1OTY0RFx1N0VBNyB2YXVsdC50cmFzaChmaWxlLCB0cnVlKVxuICAgKiBcdTc2RjRcdTYzQTVcdThGREJcdTdDRkJcdTdFREZcdTU2REVcdTY1MzZcdTdBRDlcdTMwMDJcbiAgICovXG4gIGFzeW5jIHRyYXNoKHJlcTogQnJpZGdlVHJhc2hSZXF1ZXN0KTogUHJvbWlzZTxCcmlkZ2VUcmFzaFJlc3VsdD4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVPZihyZXEucGF0aClcbiAgICBjb25zdCBmbSA9IHRoaXMuYXBwLmZpbGVNYW5hZ2VyIGFzIHsgdHJhc2hGaWxlPzogKGZpbGU6IFRGaWxlKSA9PiBQcm9taXNlPHZvaWQ+IH1cbiAgICBpZiAodHlwZW9mIGZtLnRyYXNoRmlsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYXdhaXQgZm0udHJhc2hGaWxlKGZpbGUpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnRyYXNoKGZpbGUsIHRydWUpXG4gICAgfVxuICAgIHJldHVybiB7IHBhdGg6IGZpbGUucGF0aCwgdHJhc2hlZDogdHJ1ZSB9XG4gIH1cblxuICAvKiogXHU1NzI4IE9ic2lkaWFuIFx1NEUyRFx1NjI1M1x1NUYwMC9cdTgwNUFcdTcxMjZcdTdCMTRcdThCQjBcdUZGMDhcdTVGNTNcdTUyNERcdTUzRjZcdTVCNTBcdUZGMENcdTRFMERcdTVGM0FcdTUyMzZcdTY1QjBcdTdBOTdcdTUzRTNcdUZGMDkgKi9cbiAgYXN5bmMgb3Blbk5vdGUocmVxOiBCcmlkZ2VPcGVuUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlT3BlblJlc3VsdD4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVPZihyZXEucGF0aClcbiAgICBhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2Uub3BlbkxpbmtUZXh0KGZpbGUucGF0aCwgJycsIGZhbHNlKVxuICAgIHJldHVybiB7IHBhdGg6IGZpbGUucGF0aCwgb3BlbmVkOiB0cnVlIH1cbiAgfVxuXG4gIC8qKiBcdTUxNjhcdTVFOTNcdTY4MDdcdTdCN0VcdTgwNUFcdTU0MDhcdUZGMUFtZXRhZGF0YUNhY2hlLmdldEFsbFRhZ3MgXHU1Qjk4XHU2NUI5XHU4OUUzXHU2NzkwXHVGRjA4XHU1NDJCIGZyb250bWF0dGVyIHRhZ3NcdUZGMDkgKi9cbiAgYXN5bmMgYWxsVGFncyhvcHRzOiB7IGZvbGRlcj86IHN0cmluZzsgaWdub3JlRGlyczogc3RyaW5nW10gfSk6IFByb21pc2U8QnJpZGdlQWxsVGFnc1Jlc3VsdD4ge1xuICAgIGNvbnN0IGNvdW50cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KClcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgdGhpcy52YXVsdEZpbGVzKHsgZm9sZGVyOiBvcHRzLmZvbGRlciwgYWxsOiBmYWxzZSwgaWdub3JlRGlyczogb3B0cy5pZ25vcmVEaXJzIH0pKSB7XG4gICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpXG4gICAgICBjb25zdCB0YWdzID0gY2FjaGUgPyBnZXRBbGxUYWdzKGNhY2hlKSA6IG51bGxcbiAgICAgIGlmICh0YWdzKSB7XG4gICAgICAgIGZvciAoY29uc3QgcmF3IG9mIHRhZ3MpIHtcbiAgICAgICAgICBjb25zdCB0YWcgPSByYXcucmVwbGFjZSgvXiMvLCAnJylcbiAgICAgICAgICBpZiAodGFnLmxlbmd0aCA+IDApIGNvdW50cy5zZXQodGFnLCAoY291bnRzLmdldCh0YWcpID8/IDApICsgMSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0YWdzID0gWy4uLmNvdW50cy5lbnRyaWVzKCldXG4gICAgICAubWFwKChbdGFnLCBjb3VudF0pID0+ICh7IHRhZywgY291bnQgfSkpXG4gICAgICAuc29ydCgoYSwgYikgPT4gYS50YWcubG9jYWxlQ29tcGFyZShiLnRhZykpXG4gICAgcmV0dXJuIHsgdG90YWw6IHRhZ3MubGVuZ3RoLCB0YWdzIH1cbiAgfVxuXG4gIC8qKiBcdTc1MUZcdTYyMTBcdTY4MDdcdTUxQzZcdTk0RkVcdTYzQTVcdTY1ODdcdTY3MkNcdUZGMUFmaWxlTWFuYWdlci5nZW5lcmF0ZU1hcmtkb3duTGluayBcdTkwNzVcdTVGQUFcdTc1MjhcdTYyMzcgdXNlTWFya2Rvd25MaW5rcyBcdThCQkVcdTdGNkUgKi9cbiAgYXN5bmMgbm90ZUxpbmsocmVxOiBCcmlkZ2VMaW5rUmVxdWVzdCk6IFByb21pc2U8QnJpZGdlTGlua1Jlc3VsdD4ge1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVPZihyZXEucGF0aClcbiAgICBjb25zdCBzb3VyY2UgPSAocmVxLnNvdXJjZSA/PyAnJykudHJpbSgpXG4gICAgY29uc3QgbGluayA9IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLmdlbmVyYXRlTWFya2Rvd25MaW5rKGZpbGUsIHNvdXJjZSwgJycpXG4gICAgcmV0dXJuIHsgcGF0aDogZmlsZS5wYXRoLCBsaW5rLCBmb3JtYXQ6IGxpbmsuc3RhcnRzV2l0aCgnW1snKSA/ICd3aWtpbGluaycgOiAnbWFya2Rvd24nIH1cbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRQSxJQUFBQSxtQkFBNkU7QUFDN0Usc0JBQXNCO0FBQ3RCLG9CQUE0QjtBQUU1QixJQUFBQyxNQUFvQjtBQUNwQixJQUFBQyxRQUFzQjs7O0FDRXRCLDJCQUFvRDtBQUNwRCxTQUFvQjtBQUNwQixXQUFzQjtBQUN0QixTQUFvQjtBQUNwQixXQUFzQjtBQUVmLElBQU0sbUJBQXdCLFVBQUss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QVcsT0FBTyxPQUFPLFlBQVksWUFBWSxPQUFPLFFBQVEsS0FBSyxHQUFHO0FBQ2xGLFdBQUssU0FBUyxjQUFjO0FBQzVCLFdBQUssU0FBUyxVQUFVLE9BQU8sUUFBUSxLQUFLO0FBQUEsSUFDOUM7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLGVBQThCO0FBQ2xDLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUFBLEVBQ25DO0FBQUE7QUFBQSxFQUlBLE1BQU0sWUFBMkI7QUFDL0IsVUFBTSxFQUFFLFVBQVUsSUFBSSxLQUFLO0FBQzNCLFVBQU0sU0FBUyxVQUFVLGdCQUFnQixpQkFBaUI7QUFDMUQsUUFBSSxPQUE2QixPQUFPLENBQUMsS0FBSztBQUM5QyxRQUFJLENBQUMsTUFBTTtBQUtULGFBQU8sVUFBVSxhQUFhLEtBQUs7QUFDbkMsVUFBSSxDQUFDLEtBQU07QUFDWCxZQUFNLEtBQUssYUFBYSxFQUFFLE1BQU0sbUJBQW1CLFFBQVEsS0FBSyxDQUFDO0FBQUEsSUFDbkU7QUFDQSxjQUFVLGNBQWMsSUFBSTtBQUFBLEVBQzlCO0FBQUEsRUFFQSxNQUFNLGdCQUErQjtBQUNuQyxVQUFNLHNCQUFNLGFBQWEsS0FBSyxPQUFPO0FBQUEsRUFDdkM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTUEsTUFBTSxhQUE0QjtBQUNoQyxRQUFJO0FBQ0YsWUFBTSxPQUFPLEtBQUssSUFBSSxVQUFVLGVBQWU7QUFDL0MsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ25FLFNBQVMsS0FBSztBQUNaLFlBQU0sTUFBTSxlQUFlLFFBQVEsSUFBSSxVQUFVLE9BQU8sR0FBRztBQUMzRCxVQUFJLHdCQUFPLHFEQUFhLEdBQUcsRUFBRTtBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAib3MiLCAicGF0aCIsICJlbWJlZGRlZE5vZGVWZXJzaW9uIiwgInJlc29sdmUiLCAib3V0IiwgImNtZCIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImZzIiwgIm9zIiwgInBhdGgiLCAicmVzb2x2ZSIsICJwYXRoIiwgImltcG9ydF9vYnNpZGlhbiIsICJwYXRoIiwgInRhZ3MiXQp9Cg==
