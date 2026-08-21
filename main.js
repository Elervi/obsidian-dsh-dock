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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2xhdW5jaGVyLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvdmlldy50cyIsICJzcmMvY3VycmVudFZhdWx0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERzaERvY2tQbHVnaW4gXHUyMDE0XHUyMDE0IE9ic2lkaWFuIFx1NEZBN1x1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1N0JBMVx1NzQwNlx1MzAwMlxuICpcbiAqIG9ubG9hZDogXHU1MkEwXHU4RjdEXHU4QkJFXHU3RjZFIFx1MjE5MiBcdTZDRThcdTUxOENcdTg5QzZcdTU2RkUvXHU1NDdEXHU0RUU0L1x1NzJCNlx1NjAwMVx1NjgwRi9cdThCQkVcdTdGNkVcdTk4NzUgXHUyMTkyIFx1RkYwOGF1dG9zdGFydCBcdTY1RjZcdUZGMDlcdTU0MkZcdTUyQTggRFNIXHUzMDAyXG4gKiBcdTU0MkZcdTUyQTg6IGxhdW5jaGVyLmVuc3VyZURzaFJ1bm5pbmcoKVx1RkYwOFx1N0FFRlx1NTNFM1x1NTM2MFx1NzUyOFx1NTIxOVx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwOVx1MzAwMlxuICogXHU1Mzc4XHU4RjdEOiBTSUdURVJNIFx1NUI1MFx1OEZEQlx1N0EwQlx1MzAwMlxuICovXG5cbmltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBXb3Jrc3BhY2VMZWFmLCByZXF1ZXN0VXJsLCBGaWxlU3lzdGVtQWRhcHRlciB9IGZyb20gJ29ic2lkaWFuJ1xuaW1wb3J0IHsgc2hlbGwgfSBmcm9tICdlbGVjdHJvbidcbmltcG9ydCB0eXBlIHsgQ2hpbGRQcm9jZXNzIH0gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHtcbiAgZW1iZWRkZWROb2RlVmVyc2lvbixcbiAgZW5zdXJlRHNoUnVubmluZyxcbiAgcmVtb3ZlRHNoUGlkRmlsZSxcbiAgcmVzb2x2ZURzaEJpbixcbiAgcmVzb2x2ZU5vZGVCaW4sXG4gIHNhZmVWYXVsdE5hbWUsXG4gIHN0YWJsZUhhc2gsXG4gIHN0b3BQcm9jZXNzLFxuICBzd2VlcE9ycGhhbkRzaCxcbiAgd3JpdGVEc2hQaWRGaWxlLFxuICB0eXBlIFNlcnZlclN0YXR1cyxcbn0gZnJvbSAnLi9sYXVuY2hlcidcbmltcG9ydCB7IERzaERvY2tTZXR0aW5nc1RhYiwgREVGQVVMVF9TRVRUSU5HUywgdHlwZSBEc2hEb2NrU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJ1xuaW1wb3J0IHsgRHNoV2ViVmlldywgRFNIX1dFQl9WSUVXX1RZUEUgfSBmcm9tICcuL3ZpZXcnXG5pbXBvcnQgeyBjdXJyZW50VmF1bHRJbmZvLCB3cml0ZUN1cnJlbnRWYXVsdE1hcmtlciB9IGZyb20gJy4vY3VycmVudFZhdWx0J1xuXG4vKipcbiAqIFx1OEJBMVx1N0I5NyBEU0hfSE9NRVx1RkYxQVxuICogLSBwZXItdmF1bHRcdUZGMDhcdTlFRDhcdThCQTRcdUZGMDlcdUZGMUF+Ly5kc2gvdmF1bHRzLzxcdTUzRUZcdThCRkJcdTU0MEQ+LTxoYXNoNj4gXHUyMDE0XHUyMDE0IFx1NkJDRiB2YXVsdCBcdTcyRUNcdTdBQ0JcdUZGMDhoYXNoIFx1NkQ4OFx1NkI2N1x1RkYwQ1x1NEUyRFx1NjU4N1x1NTQwRFx1NEUwRFx1NzhCMFx1NjQ5RVx1RkYwOVx1RkYxQlxuICogLSBzaGFyZWRcdUZGMUF+Ly5kc2ggXHUyMDE0XHUyMDE0IFx1NEUwRVx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1NUI4Q1x1NTE2OFx1NEUwMFx1ODFGNFx1RkYwQ1x1NTkwRFx1NzUyOFx1NURGMlx1NjcwOVx1OTE0RFx1N0Y2RS9cdTRGMUFcdThCRERcdUZGMUJcbiAqIC0gY3VzdG9tXHVGRjFBXHU3NTI4XHU2MjM3XHU1ODZCXHU1MTk5XHU3Njg0XHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlRHNoSG9tZShzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJyB8ICdkc2hIb21lJz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKVxuICBpZiAocy5kc2hIb21lTW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICByZXR1cm4gcy5kc2hIb21lLnRyaW0oKSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnKVxuICB9XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0Jykge1xuICAgIGNvbnN0IG5hbWUgPSB2YXVsdFJvb3QgPyBgJHtzYWZlVmF1bHROYW1lKHZhdWx0Um9vdCl9LSR7c3RhYmxlSGFzaCh2YXVsdFJvb3QpfWAgOiAndmF1bHQnXG4gICAgcmV0dXJuIHBhdGguam9pbihob21lLCAnLmRzaCcsICd2YXVsdHMnLCBuYW1lKVxuICB9XG4gIHJldHVybiBwYXRoLmpvaW4oaG9tZSwgJy5kc2gnKVxufVxuXG4vKipcbiAqIFx1OEJBMVx1N0I5N1x1NjcyQyB2YXVsdCBcdTc2ODRcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdTMwMDJcbiAqIC0gc2hhcmVkIC8gY3VzdG9tXHVGRjFBc2V0dGluZ3MucG9ydFx1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5XHUyMDE0XHUyMDE0IFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTU0MENcdTRFMDBcdTY3MERcdTUyQTFcdTRFMEVcdTRGMUFcdThCRERcdUZGMUJcbiAqIC0gcGVyLXZhdWx0XHVGRjFBc2V0dGluZ3MucG9ydCArIChzdGFibGVIYXNoICUgNDA5NikgXHUyMDE0XHUyMDE0IFx1NkJDRlx1NEUyQSB2YXVsdCBcdTcyRUNcdTUzNjBcdTdBRUZcdTUzRTNcdUZGMENcdTU0MDRcdTgxRUFcbiAqICAgc3Bhd24gXHU3MkVDXHU3QUNCXHU3Njg0IGRzaCBcdThGREJcdTdBMEJcdUZGMUJcdTkxNERcdTU0MDhcdTcyRUNcdTdBQ0JcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCRERcdTVCNThcdTUwQThcdTY4MzlcdUZGMDlcdUZGMENcdTRFMERcdTU0MEMgdmF1bHQgXHU3Njg0XG4gKiAgIFx1NEYxQVx1OEJERFx1NUI4Q1x1NTE2OFx1OTY5NFx1NzlCQlx1RkYwQ1x1NEU5Mlx1NEUwRFx1NTNFRlx1ODlDMVx1MzAwMlx1N0FFRlx1NTNFM1x1NTFCMlx1N0E4MVx1Njk4Mlx1NzM4NyB+MS80MDk2XHVGRjBDXHU1M0VGXHU2M0E1XHU1M0Q3XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlUG9ydChzOiBQaWNrPERzaERvY2tTZXR0aW5ncywgJ2RzaEhvbWVNb2RlJyB8ICdwb3J0Jz4sIHZhdWx0Um9vdDogc3RyaW5nIHwgdW5kZWZpbmVkKTogbnVtYmVyIHtcbiAgaWYgKHMuZHNoSG9tZU1vZGUgPT09ICdwZXItdmF1bHQnICYmIHZhdWx0Um9vdCkge1xuICAgIGNvbnN0IG9mZnNldCA9IHBhcnNlSW50KHN0YWJsZUhhc2godmF1bHRSb290KSwgMzYpICUgNDA5NlxuICAgIHJldHVybiBzLnBvcnQgKyBvZmZzZXRcbiAgfVxuICByZXR1cm4gcy5wb3J0XG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NFx1NTE3MVx1NEVBQlx1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU1MTcxXHU3NTI4XHU0RTAwXHU0RUZEXHVGRjBDXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHVGRjA5XHUzMDAyXG4gKiAtIHNoYXJlZFx1RkYxQWRzaEhvbWUgXHU4MUVBXHU4RUFCXHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjBDXHU2NUUwXHU5NzAwXHU1MTcxXHU0RUFCXHU1QzQyXHVGRjFCXG4gKiAtIGN1c3RvbVx1RkYxQVx1NzUyOFx1NjIzN1x1NjMwN1x1NUI5QVx1OERFRlx1NUY4NFx1NTM3M1x1OTE0RFx1N0Y2RVx1NjgzOVx1RkYwQ1x1NjVFMFx1OTcwMFx1NTE3MVx1NEVBQlx1NUM0Mlx1RkYxQlxuICogLSBwZXItdmF1bHRcdUZGMUFcdThGRDRcdTU2REVcdTUxNzFcdTRFQUIgYH4vLmRzaGBcdUZGMENcdThCQTlcdTZCQ0ZcdTRFMkEgdmF1bHQgXHU3Njg0IHNldHRpbmdzL2NyZWRlbnRpYWxzXG4gKiAgIFx1NjMwN1x1NTZERVx1NUI4MyBcdTIwMTRcdTIwMTQgXHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4IHZhdWx0IFx1NzUxRlx1NjU0OFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVNoYXJlZENvbmZpZ1Jvb3QoczogUGljazxEc2hEb2NrU2V0dGluZ3MsICdkc2hIb21lTW9kZSc+LCB2YXVsdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmIChzLmRzaEhvbWVNb2RlID09PSAncGVyLXZhdWx0JyAmJiB2YXVsdFJvb3QpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnKVxuICB9XG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHNoRG9ja1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBEc2hEb2NrU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTXG4gIHByaXZhdGUgcHJvYzogQ2hpbGRQcm9jZXNzIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXM6IFNlcnZlclN0YXR1cyA9IHsga2luZDogJ3N0b3BwZWQnIH1cbiAgcHJpdmF0ZSBzdGFydGluZyA9IGZhbHNlXG4gIHByaXZhdGUgc3RhdHVzQmFyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBzdGF0dXNMaXN0ZW5lcnMgPSBuZXcgU2V0PCgpID0+IHZvaWQ+KClcbiAgLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE5OVx1NTE2NVx1OTYzMlx1NjI5NiB0aW1lclx1RkYwOFx1N0E5N1x1NTNFMyBmb2N1cyBcdTUzRUZcdTgwRkRcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdUZGMDkgKi9cbiAgcHJpdmF0ZSBtYXJrZXJUaW1lcjogbnVtYmVyIHwgbnVsbCA9IG51bGxcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKClcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KERTSF9XRUJfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IERzaFdlYlZpZXcobGVhZiwgdGhpcykpXG5cbiAgICAvLyBcdTYyOEFcIlx1NUY1M1x1NTI0RFx1NzEyNlx1NzBCOSB2YXVsdCArIFx1NUY1M1x1NTI0RFx1N0IxNFx1OEJCMFwiXHU4REU4XHU4RkRCXHU3QTBCXHU1NDRBXHU4QkM5IERTSCBcdTRGQTdcdUZGMUFcdTY3MkNcdTdBOTdcdTUzRTNcdTYyNTNcdTVGMDBcdUZGMDhvbmxvYWRcdUZGMDlcdTRFMEVcbiAgICAvLyBcdTZCQ0ZcdTZCMjFcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTY1RjZcdTUyMzdcdTY1QjBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTMwMDJcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdTRFMEJcdTZCQ0ZcdTRFMkFcdTdBOTdcdTUzRTNcdTkwRkRcdTcyRUNcdTdBQ0JcdTUyQTBcdThGN0RcdTY3MkNcdTYzRDJcdTRFRjZcdUZGMENcbiAgICAvLyBcdTY3MDBcdTU0MEVcdTgzQjdcdTVGOTdcdTcxMjZcdTcwQjlcdTc2ODRcdTdBOTdcdTUzRTNcdTUxOTlcdTUxNjVcdUZGMENcdTUzNzNcIlx1NzUyOFx1NjIzN1x1NUY1M1x1NTI0RFx1NkI2M1x1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHUzMDAyXG4gICAgdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgICAvLyBEMlx1RkYxQXJlZ2lzdGVyRG9tRXZlbnQgXHU1M0Q2XHU0RUUzXHU2MjRCXHU1REU1IGFkZEV2ZW50TGlzdGVuZXIgKyByZWdpc3RlcigpXHVGRjBDXG4gICAgLy8gXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4XHUzMDAxXHU1Mzc4XHU4RjdEXHU4MUVBXHU1MkE4XHU2RTA1XHU3NDA2XHVGRjA4Q29tcG9uZW50LnJlZ2lzdGVyRG9tRXZlbnQsIG9ic2lkaWFuLmQudHM6MTg5Mlx1RkYwOVx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudCh3aW5kb3csICdmb2N1cycsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKVxuICAgIC8vIFx1ODg2NVx1NTE0NVx1NEZFMVx1NTNGN1x1RkYxQVx1NTE0OVx1NjgwN1x1NTIwN1x1NjM2Mlx1NjU4N1x1NEVGNlx1RkYwOGZpbGUtb3Blblx1RkYwOVx1MzAwMVx1NjVCMFx1N0E5N1x1NTNFMy9cdTVGMzlcdTdBOTdcdTYyNTNcdTVGMDBcdUZGMDh3aW5kb3ctb3Blblx1RkYwOVx1MzAwMVxuICAgIC8vIFx1NUUwM1x1NUM0MC9cdTZEM0JcdTUyQThcdTUzRjZcdTVCNTBcdTUzRDhcdTUzMTZcdUZGMDhhY3RpdmUtbGVhZi1jaGFuZ2VcdUZGMDlcdTkwRkRcdTUyMzdcdTRFMDBcdTZCMjEgXHUyMDE0XHUyMDE0IFx1ODk4Nlx1NzZENiB3aW5kb3cgZm9jdXNcbiAgICAvLyBcdTRFMERcdTZEM0VcdTUzRDFcdTc2ODRcdTU3M0FcdTY2NkZcdUZGMUJcdTk2MzJcdTYyOTZcdTUxNzFcdTc1MjhcdTRFMDBcdTRFMkEgdGltZXJcdUZGMENcdTRFOTJcdTRFMERcdTVFNzJcdTYyNzBcdTMwMDJcdTRFOEJcdTRFRjZcdTcyNDhcdTY3MkNcdTk1RThcdTY5REJcdUZGMUFcbiAgICAvLyBhY3RpdmUtbGVhZi1jaGFuZ2UvZmlsZS1vcGVuIDAuMTAuOStcdUZGMEN3aW5kb3ctb3BlbiAwLjE1LjMrXHVGRjBDXHU1NzQ3IFx1MjI2NCBtaW5BcHBWZXJzaW9uXHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignYWN0aXZlLWxlYWYtY2hhbmdlJywgKCkgPT4gdGhpcy5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKCkpKVxuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2ZpbGUtb3BlbicsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKCd3aW5kb3ctb3BlbicsICgpID0+IHRoaXMucmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpKSlcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignYm90JywgJ0RTSCBEb2NrXHVGRjFBXHU2MjUzXHU1RjAwXHU5NzYyXHU2NzdGJywgKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpKVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ29wZW4tZHNoLXBhbmVsJyxcbiAgICAgIG5hbWU6ICdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3RicsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5QYW5lbCgpLFxuICAgIH0pXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3RhcnQtZHNoJyxcbiAgICAgIG5hbWU6ICdcdTU0MkZcdTUyQTggRFNIIFx1NjcwRFx1NTJBMScsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnN0YXJ0KCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzdG9wLWRzaCcsXG4gICAgICBuYW1lOiAnXHU1MDVDXHU2QjYyIERTSCBcdTY3MERcdTUyQTEnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5zdG9wKCksXG4gICAgfSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLWRzaC1icm93c2VyJyxcbiAgICAgIG5hbWU6ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAgRFNIJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlbkluQnJvd3NlcigpLFxuICAgIH0pXG5cbiAgICAvLyBENlx1RkYxQVx1NkNFOFx1NTE4QyBvYnNpZGlhbjovL2RzaC1kb2NrIFx1NTM0Rlx1OEJBRVx1NTE2NVx1NTNFM1x1RkYwOFBsdWdpbi5yZWdpc3Rlck9ic2lkaWFuUHJvdG9jb2xIYW5kbGVyLFxuICAgIC8vIG9ic2lkaWFuLmQudHM6NTAyOFx1RkYwOVx1MzAwMkRTSCBXZWIgXHU0RkE3L1x1NTkxNlx1OTBFOFx1ODFFQVx1NTJBOFx1NTMxNlx1NTNFRlx1NzUyOFxuICAgIC8vIGBvYnNpZGlhbjovL2RzaC1kb2NrP2FjdGlvbj1vcGVuYCBcdTRFMDBcdTk1MkVcdTU1MjRcdThENzdcdTk3NjJcdTY3N0YgXHUyMDE0XHUyMDE0IFx1OTE0RFx1NTQwOFx1NTRDMVx1NzI0Q1x1NjgyMVx1OUE4Q1x1RkYwQ1xuICAgIC8vIFx1MzAwQ1x1NEVDRVx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTZERVx1NTIzMCBPYnNpZGlhblx1MzAwRFx1OTVFRFx1NzNBRlx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXJPYnNpZGlhblByb3RvY29sSGFuZGxlcignZHNoLWRvY2snLCAoZGF0YSkgPT4ge1xuICAgICAgaWYgKGRhdGEuYWN0aW9uID09PSAnb3BlbicpIHZvaWQgdGhpcy5vcGVuUGFuZWwoKVxuICAgIH0pXG5cbiAgICAvLyBEN1x1RkYxQVx1OTAwMFx1NTFGQVx1NTI0RCBmbHVzaFx1MzAwMmB3b3Jrc3BhY2Uub24oJ3F1aXQnKWBcdUZGMDgwLjEwLjIrXHVGRjBDT2JzaWRpYW4gXHU1QzNEXHU1MjlCXHU4QzAzXHU3NTI4XHVGRjBDXG4gICAgLy8gXHU0RTBEXHU0RkREXHU4QkMxXHU2MjY3XHU4ODRDXHVGRjA5XHU5MUNDIGF3YWl0IFx1NTA1Q1x1NjcwRFx1NTJBMSArIFx1ODQzRFx1NzZEOFx1NjgwN1x1OEJCMFx1RkYwQ1x1ODg2NVx1NEUwQSBvbnVubG9hZCBcdTkxQ0NcbiAgICAvLyBgdm9pZCB0aGlzLnN0b3AoKWAgXHU0RTBEXHU3QjQ5XHU3RUQzXHU2NzlDXHU3Njg0XHU3RjNBXHU1M0UzXHVGRjA4XHU1RjNBXHU5MDAwXHU2NUY2IFBJRCBcdTY1ODdcdTRFRjYvXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU1M0VGXHU4MEZEXHU2Q0ExXHU4NDNEXHU3NkQ4XHVGRjA5XHUzMDAyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKCdxdWl0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3AoKVxuICAgICAgICB0aGlzLnJlZnJlc2hDdXJyZW50VmF1bHRNYXJrZXIoKVxuICAgICAgfSksXG4gICAgKVxuXG4gICAgdGhpcy5zdGF0dXNCYXJFbCA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpXG4gICAgdGhpcy5yZW5kZXJTdGF0dXNCYXIoKVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRHNoRG9ja1NldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSlcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9zdGFydCkge1xuICAgICAgdm9pZCB0aGlzLnN0YXJ0KClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RvcHBlZCcgfSlcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB2b2lkIHRoaXMuc3RvcCgpXG4gICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2xlYXIoKVxuICB9XG5cbiAgLyoqXG4gICAqIEQ3XHVGRjFBXHU5OTk2XHU2QjIxXCJcdTc1MjhcdTYyMzdcdTYyNEJcdTUyQThcdTU0MkZcdTc1MjhcIlx1NjVGNlx1NTNFQVx1OEREMVx1NEUwMFx1NkIyMVx1NzY4NFx1OTRBOVx1NUI1MFx1RkYwOFBsdWdpbi5vblVzZXJFbmFibGUsXG4gICAqIG9ic2lkaWFuLmQudHM6NTA3M1x1RkYwQ09ic2lkaWFuIDEuNy4yKyBcdThDMDNcdTc1MjhcdUZGMUJcdTY1RTdcdTcyNDhcdTY3MkNcdTVGRkRcdTc1NjVcdThCRTVcdTk0QTlcdTVCNTBcdUZGMENcdTYzRDJcdTRFRjZcdTcxNjdcdTVFMzhcdTVERTVcdTRGNUNcdUZGMENcbiAgICogXHU1NkUwXHU2QjY0XHU2NUUwXHU5NzAwXHU2MkFDIG1pbkFwcFZlcnNpb25cdUZGMDlcdTMwMDJcdTUzRUFcdTUwNUFcdTVGMTVcdTVCRkNcdTYzRDBcdTc5M0FcdUZGMENcdTRFMERcdTUwNUFcdTRFRkJcdTRGNTVcdTUyMURcdTU5Q0JcdTUzMTZcdTMwMDJcbiAgICovXG4gIG92ZXJyaWRlIG9uVXNlckVuYWJsZSgpOiB2b2lkIHtcbiAgICBuZXcgTm90aWNlKCdEU0ggRG9jayBcdTVERjJcdTU0MkZcdTc1MjhcdUZGMUFcdTcwQjlcdTUxRkJcdTVERTZcdTRGQTdcdTY4MEZcdTY3M0FcdTU2NjhcdTRFQkFcdTU2RkVcdTY4MDdcdTYyNTNcdTVGMDAgRFNIIFx1OTc2Mlx1Njc3Rlx1RkYwQ1x1NjIxNlx1NjI2N1x1ODg0QyBvYnNpZGlhbjovL2RzaC1kb2NrP2FjdGlvbj1vcGVuJylcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTcyQjZcdTYwMDFcblxuICBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXNcbiAgfVxuXG4gIGdldCBjaGlsZFByb2MoKTogQ2hpbGRQcm9jZXNzIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucHJvY1xuICB9XG5cbiAgZ2V0IGJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YXVsdFJvb3QgPSB0aGlzLnZhdWx0Um9vdCgpXG4gICAgY29uc3QgcG9ydCA9IGNvbXB1dGVQb3J0KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICByZXR1cm4gYGh0dHA6Ly8ke3RoaXMuc2V0dGluZ3MuaG9zdH06JHtwb3J0fS9gXG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHZhdWx0IFx1NjgzOVx1NzZFRVx1NUY1NVx1RkYwOFx1NjVFMFx1NTIxOSB1bmRlZmluZWRcdUZGMDlcdTMwMDJEMVx1RkYxQWluc3RhbmNlb2YgXHU1M0Q2XHU0RUUzXHU1RjNBXHU4RjZDXHVGRjBDXHU3QzdCXHU1NzhCXHU1Qjg5XHU1MTY4ICovXG4gIHByaXZhdGUgdmF1bHRSb290KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXJcbiAgICByZXR1cm4gYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyID8gYWRhcHRlci5nZXRCYXNlUGF0aCgpIDogdW5kZWZpbmVkXG4gIH1cblxuICBvblN0YXR1c0NoYW5nZShmbjogKCkgPT4gdm9pZCk6ICgpID0+IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzLmFkZChmbilcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zdGF0dXNMaXN0ZW5lcnMuZGVsZXRlKGZuKVxuICB9XG5cbiAgcHJpdmF0ZSBzZXRTdGF0dXMoc3RhdHVzOiBTZXJ2ZXJTdGF0dXMpOiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1cyA9IHN0YXR1c1xuICAgIHRoaXMucmVuZGVyU3RhdHVzQmFyKClcbiAgICBmb3IgKGNvbnN0IGZuIG9mIHRoaXMuc3RhdHVzTGlzdGVuZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmbigpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGF0dXNCYXIoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnN0YXR1c0JhckVsKSByZXR1cm5cbiAgICBjb25zdCBzID0gdGhpcy5zdGF0dXNcbiAgICBpZiAocy5raW5kID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dChgRFNIOiAke3MucG9ydH0ke3MuYXR0YWNoZWQgPyAnXHVGRjA4XHU2MzAyXHU2M0E1XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHVGRjA5JyA6ICcnfWApXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH0gZWxzZSBpZiAocy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnNldFRleHQoJ0RTSDogXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwucmVtb3ZlQ2xhc3MoJ2lzLXJ1bm5pbmcnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5hZGRDbGFzcygnaXMtc3RvcHBlZCcpXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuc2V0VGV4dCgnRFNIOiBcdTU0MkZcdTUyQThcdTRFMkRcdTIwMjYnKVxuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5yZW1vdmVDbGFzcygnaXMtcnVubmluZycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLmFkZENsYXNzKCdpcy1zdG9wcGVkJylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdGF0dXNCYXJFbC5zZXRUZXh0KCdEU0g6IFx1NjcyQVx1OEZEMFx1ODg0QycpXG4gICAgICB0aGlzLnN0YXR1c0JhckVsLnJlbW92ZUNsYXNzKCdpcy1ydW5uaW5nJylcbiAgICAgIHRoaXMuc3RhdHVzQmFyRWwuYWRkQ2xhc3MoJ2lzLXN0b3BwZWQnKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXG5cbiAgLyoqIFx1OEJGQlx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1NTQyQlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYwOVx1NUU3Nlx1NTE5OVx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1RkYwOFx1OTYzMlx1NjI5NiAzMDBtc1x1RkYwQ1x1OTA3Rlx1NTE0RCBmb2N1cyBcdTlBRDhcdTk4OTFcdTg5RTZcdTUzRDFcdTUzQ0RcdTU5MERcdTUxOTlcdTc2RDhcdUZGMDkgKi9cbiAgcmVmcmVzaEN1cnJlbnRWYXVsdE1hcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tYXJrZXJUaW1lcikgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLm1hcmtlclRpbWVyKVxuICAgIHRoaXMubWFya2VyVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1hcmtlclRpbWVyID0gbnVsbFxuICAgICAgY29uc3QgaW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICBpZiAoaW5mbykgd3JpdGVDdXJyZW50VmF1bHRNYXJrZXIoaW5mby5uYW1lLCBpbmZvLnBhdGgsIGluZm8uYWN0aXZlRmlsZSlcbiAgICB9LCAzMDApXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG5cbiAgLyoqIFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMSBcdTIxOTIgXHU2MzAyXHU2M0E1XHVGRjFCXHU1NDI2XHU1MjE5IHNwYXduIFx1NUI5OFx1NjVCOSBkc2ggd2ViICovXG4gIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XG4gICAgaWYgKHRoaXMuc3RhcnRpbmcpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIGlmICh0aGlzLnN0YXR1cy5raW5kID09PSAncnVubmluZycpIHJldHVybiB0aGlzLnN0YXR1c1xuICAgIHRoaXMuc3RhcnRpbmcgPSB0cnVlXG4gICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnc3RhcnRpbmcnIH0pXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhdWx0Um9vdCA9IHRoaXMudmF1bHRSb290KClcbiAgICAgIGNvbnN0IGRzaEhvbWUgPSBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB2YXVsdFJvb3QpXG4gICAgICBjb25zdCBwb3J0ID0gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdmF1bHRSb290KVxuICAgICAgY29uc3Qgc2hhcmVkQ29uZmlnUm9vdCA9IGNvbXB1dGVTaGFyZWRDb25maWdSb290KHRoaXMuc2V0dGluZ3MsIHZhdWx0Um9vdClcbiAgICAgIGNvbnN0IHZhdWx0SW5mbyA9IGN1cnJlbnRWYXVsdEluZm8odGhpcy5hcHApXG4gICAgICAvLyBcdTVCNjRcdTUxM0ZcdTZFMDVcdTYyNkJcdUZGMUFcdTRFMEFcdTZCMjEgT2JzaWRpYW4gXHU1RDI5XHU2RTgzL1x1NUYzQVx1OTAwMFx1NkI4Qlx1NzU1OVx1NzY4NFx1NjcyQ1x1N0FFRlx1NTNFMyBkc2ggd2ViIFx1NTE0OFx1NkUwNVx1NjM4OVx1NTE4RFx1NjJDOVx1OEQ3N1x1RkYwQ1xuICAgICAgLy8gXHU5MDdGXHU1MTREXCJcdTYzMDJcdTYzQTVcdTVCNjRcdTUxM0ZcIlx1OEJBOVx1NkI4Qlx1NzU1OVx1NkMzOFx1NEU0NVx1N0QyRlx1NzlFRlx1RkYwOFx1NTkxQVx1NUU5My9cdTU5MUFcdTdBOTdcdTUzRTNcdTVFNzZcdTUzRDFcdTVCODlcdTUxNjhcdUZGMENcdTg5QzEgbGF1bmNoZXIudHNcdUZGMDlcdTMwMDJcbiAgICAgIGNvbnN0IHN3ZXB0ID0gYXdhaXQgc3dlZXBPcnBoYW5Ec2goZHNoSG9tZSwgcG9ydClcbiAgICAgIGlmIChzd2VwdCkge1xuICAgICAgICBuZXcgTm90aWNlKGBEU0g6IFx1NURGMlx1NkUwNVx1NzQwNlx1NEUwQVx1NkIyMVx1NkI4Qlx1NzU1OVx1NzY4NFx1NjcwRFx1NTJBMSAoXHU3QUVGXHU1M0UzICR7cG9ydH0pYClcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGVuc3VyZURzaFJ1bm5pbmcoe1xuICAgICAgICBkc2hCaW46IHRoaXMuc2V0dGluZ3MuZHNoQmluLFxuICAgICAgICBub2RlQmluOiB0aGlzLnNldHRpbmdzLm5vZGVCaW4sXG4gICAgICAgIHBvcnQsXG4gICAgICAgIGhvc3Q6IHRoaXMuc2V0dGluZ3MuaG9zdCxcbiAgICAgICAgZHNoSG9tZSxcbiAgICAgICAgLy8gcGVyLXZhdWx0IFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYxQVx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU2MzA3XHU1NkRFXHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwQ1x1NTNFQVx1OTY5NFx1NzlCQlx1NEYxQVx1OEJERFx1MzAwMlxuICAgICAgICAuLi4oc2hhcmVkQ29uZmlnUm9vdCA/IHsgc2hhcmVkQ29uZmlnUm9vdCB9IDoge30pLFxuICAgICAgICB1c2VFbWJlZGRlZE5vZGU6IHRoaXMuc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlLFxuICAgICAgICAvLyBEM1x1RkYxQVx1N0FFRlx1NTNFM1x1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1NjVGNlx1NTA1QVx1NTRDMVx1NzI0Q1x1NzI3OVx1NUY4MVx1NjgyMVx1OUE4QyBcdTIwMTRcdTIwMTQgXHU2NjJGIGRzaCB3ZWIgXHU2MjREXHU2MzAyXHU2M0E1XHVGRjBDXHU1NDI2XHU1MjE5XHU2MzA5XG4gICAgICAgIC8vIFx1MzAwQ1x1N0FFRlx1NTNFM1x1ODhBQlx1OTc1RSBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHUzMDBEXHU2MkE1XHU5NTE5XHVGRjBDXHU2MjhBXCJcdThCRUZcdTYzMDJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVwiXHU0RUNFXHU1MDc2XHU1M0QxXHU1M0Q4XHU2MjEwXHU0RTBEXHU1M0VGXHU4MEZEXHUzMDAyXG4gICAgICAgIC8vIHJlcXVlc3RVcmwgXHU2NjJGIE9ic2lkaWFuIFx1NUI5OFx1NjVCOSBDU1AgXHU4QzQxXHU1MTREXHU3Njg0IEhUVFAgXHU1MkE5XHU2MjRCXHVGRjA4b2JzaWRpYW4uZC50czo1NDQyXHVGRjA5XHVGRjBDXG4gICAgICAgIC8vIFJlcXVlc3RVcmxQYXJhbSBcdTZDQTFcdTY3MDkgdGltZW91dCBcdTVCNTdcdTZCQjVcdUZGMENcdTYyNDBcdTRFRTUgMS41cyBcdTVGRUJcdTkwMUZcdTVCNThcdTZEM0JcdTYzQTJcdTZENEJcdTRFQ0RcdThENzBcbiAgICAgICAgLy8gbm9kZTpodHRwXHVGRjA4bGF1bmNoZXIudHMgaXNQb3J0VXBcdUZGMDlcdUZGMENcdThGRDlcdTkxQ0NcdTUzRUFcdTUwNUFcdTYxNjJcdTkwMUZcdTU0Q0RcdTVFOTRcdTRGNTNcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcdTMwMDJcbiAgICAgICAgdmVyaWZ5QnJhbmQ6ICh1cmwpID0+IHRoaXMudmVyaWZ5RHNoQnJhbmQodXJsKSxcbiAgICAgICAgLy8gcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1RkYxQVx1NkNFOFx1NTE2NVx1NjcyQ1x1NjcwRFx1NTJBMVx1NjI0MFx1NUM1RVx1NUU5MyBlbnZcdUZGMDhcdTdCMkNcdTRFOENcdTkwMUFcdTkwNTNcdUZGMDlcdTMwMDJcdTVERTVcdTUxNzdcdTYzRDJcdTRFRjZcdTg5RTNcdTY3OTBcdTY1RjZcbiAgICAgICAgLy8gXHU0RjE4XHU1MTQ4XHU3NTI4XHU2NzJDIGVudiBcdThCQzZcdTUyMkJcIlx1NjcyQ1x1NjcwRFx1NTJBMVx1NjcwRFx1NTJBMVx1NzY4NFx1NUU5M1wiXHVGRjBDY3dkIFx1NEZERFx1NjMwMSBkc2ggXHU4RkRCXHU3QTBCXHU5RUQ4XHU4QkE0XHU1REU1XHU0RjVDXHU3NkVFXHU1RjU1XG4gICAgICAgIC8vIFx1NEUwRFx1NTNEOCBcdTIwMTRcdTIwMTQgY3dkIFx1NEUwRSBPYnNpZGlhbiBcdTVFOTNcdTY2MkZcdTRFMjRcdTRFMkFcdTcyRUNcdTdBQ0JcdTY5ODJcdTVGRjVcdUZGMENcdTRFMERcdTU0MDhcdTVFNzZcdTMwMDJcbiAgICAgICAgZW52OiBzaGFyZWRDb25maWdSb290ICYmIHZhdWx0SW5mb1xuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBEU0hfT0JTSURJQU5fVkFVTFRfTkFNRTogdmF1bHRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgIERTSF9PQlNJRElBTl9WQVVMVF9QQVRIOiB2YXVsdEluZm8ucGF0aCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9LFxuICAgICAgfSlcbiAgICAgIHRoaXMucHJvYyA9IHJlc3VsdC5wcm9jID8/IG51bGxcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzLmtpbmQgPT09ICdydW5uaW5nJyAmJiByZXN1bHQucHJvYyAmJiAhcmVzdWx0LnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAvLyBcdTY1QjBcdThENzdcdThGREJcdTdBMEJcdUZGMUFcdTUxOTlcdTUxNjUgUElEIFx1NjU4N1x1NEVGNlx1RkYwQ1x1NEY5Qlx1NEUwQlx1NkIyMVx1NTQyRlx1NTJBOFx1NkUwNVx1NjI2Qlx1NUI2NFx1NTEzRlx1NjVGNlx1OEJDNlx1NTIyQlx1NUY1Mlx1NUM1RVx1MzAwMlxuICAgICAgICBpZiAocmVzdWx0LnByb2MucGlkICE9IG51bGwpIHtcbiAgICAgICAgICB3cml0ZURzaFBpZEZpbGUoZHNoSG9tZSwgcG9ydCwgcmVzdWx0LnByb2MucGlkKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaG9va0NoaWxkTG9ncyhyZXN1bHQucHJvYylcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U3RhdHVzKHJlc3VsdC5zdGF0dXMpXG4gICAgICBpZiAocmVzdWx0LnN0YXR1cy5raW5kID09PSAnZXJyb3InKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7cmVzdWx0LnN0YXR1cy5tZXNzYWdlfWApXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICFyZXN1bHQuc3RhdHVzLmF0dGFjaGVkKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYERTSCBXZWIgXHU1REYyXHU1QzMxXHU3RUVBOiAke3Jlc3VsdC5zdGF0dXMudXJsfWApXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycilcbiAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbXNnIH0pXG4gICAgICBuZXcgTm90aWNlKGBEU0ggXHU1NDJGXHU1MkE4XHU1RjAyXHU1RTM4OiAke21zZ31gKVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnN0YXJ0aW5nID0gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzXG4gIH1cblxuICBhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RhcnRpbmcgPSBmYWxzZVxuICAgIGlmICh0aGlzLnByb2MpIHtcbiAgICAgIGF3YWl0IHN0b3BQcm9jZXNzKHRoaXMucHJvYylcbiAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICB9XG4gICAgcmVtb3ZlRHNoUGlkRmlsZShjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKSlcbiAgICB0aGlzLnNldFN0YXR1cyh7IGtpbmQ6ICdzdG9wcGVkJyB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEQzXHVGRjFBXHU1NEMxXHU3MjRDXHU3Mjc5XHU1RjgxXHU2ODIxXHU5QThDIFx1MjAxNFx1MjAxNCBHRVQgXHU2NzBEXHU1MkExXHU2ODM5XHU4REVGXHU1Rjg0XHVGRjBDXHU1NENEXHU1RTk0XHU0RjUzXHU1NDJCIFwiRGVlcFNlZWsgSGFybmVzc1wiXG4gICAqIFx1RkYwOFx1NUI5OFx1NjVCOSBkc2ggd2ViIFx1NTI0RFx1N0FFRiBpbmRleC5odG1sIFx1NzY4NCA8dGl0bGU+XHVGRjA5XHU2MjREXHU4QkE0XHU1QjlBXHU2NjJGIGRzaCB3ZWJcdTMwMDJcbiAgICogcmVxdWVzdFVybCBcdTY2MkZcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdTkxQ0MgQ1NQIFx1OEM0MVx1NTE0RFx1NzY4NFx1NUI5OFx1NjVCOSBIVFRQIFx1NTJBOVx1NjI0Qlx1RkYwOG9ic2lkaWFuLmQudHM6NTQ0Mlx1RkYwOVx1RkYxQlxuICAgKiB0aHJvdzogZmFsc2UgXHU4QkE5IDR4eC81eHggXHU0RTVGXHU4RDcwXHU2QjYzXHU1RTM4XHU4RkQ0XHU1NkRFXHU4REVGXHU1Rjg0XHVGRjBDXHU3RURGXHU0RTAwXHU2MzA5XHU3Mjc5XHU1RjgxXHU1MjI0XHU2NUFEXHUzMDAyXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHZlcmlmeURzaEJyYW5kKHVybDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCByZXF1ZXN0VXJsKHsgdXJsLCBtZXRob2Q6ICdHRVQnLCB0aHJvdzogZmFsc2UgfSlcbiAgICAgIHJldHVybiByZXNwLnN0YXR1cyA9PT0gMjAwICYmIHJlc3AudGV4dC5pbmNsdWRlcygnRGVlcFNlZWsgSGFybmVzcycpXG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGhvb2tDaGlsZExvZ3MocHJvYzogQ2hpbGRQcm9jZXNzKTogdm9pZCB7XG4gICAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4gY29uc29sZS53YXJuKCdbZHNoXScsIGQudG9TdHJpbmcoKS50cmltRW5kKCkpKVxuICAgIHByb2Mub25jZSgnZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIGlmICh0aGlzLnByb2MgPT09IHByb2MpIHtcbiAgICAgICAgdGhpcy5wcm9jID0gbnVsbFxuICAgICAgICByZW1vdmVEc2hQaWRGaWxlKGNvbXB1dGVEc2hIb21lKHRoaXMuc2V0dGluZ3MsIHRoaXMudmF1bHRSb290KCkpKVxuICAgICAgICBpZiAodGhpcy5zdGF0dXMua2luZCA9PT0gJ3J1bm5pbmcnICYmICF0aGlzLnN0YXR1cy5hdHRhY2hlZCkge1xuICAgICAgICAgIHRoaXMuc2V0U3RhdHVzKHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogYERTSCBcdThGREJcdTdBMEJcdTkwMDBcdTUxRkE6IGNvZGU9JHtjb2RlfSBzaWduYWw9JHtzaWduYWwgPz8gJyd9YCB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW2RzaC1kb2NrXSBcdTVCNTBcdThGREJcdTdBMEJcdTk1MTlcdThCRUYnLCBlcnIpXG4gICAgICBpZiAodGhpcy5wcm9jID09PSBwcm9jKSB7XG4gICAgICAgIHRoaXMucHJvYyA9IG51bGxcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMoeyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBgXHU1QjUwXHU4RkRCXHU3QTBCXHU5NTE5XHU4QkVGOiAke2Vyci5tZXNzYWdlfWAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqIFx1NjNBMlx1NkQ0Qlx1NEZFMVx1NjA2Rlx1RkYwOFx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBkZXRlY3RJbmZvKCk6IHsgZHNoQmluOiBzdHJpbmcgfCBudWxsOyBkc2hOb3Rlczogc3RyaW5nW107IG5vZGVOb3Rlczogc3RyaW5nW10gfSB7XG4gICAgY29uc3QgZm91bmQgPSByZXNvbHZlRHNoQmluKHRoaXMuc2V0dGluZ3MuZHNoQmluKVxuICAgIGNvbnN0IG5vZGUgPSByZXNvbHZlTm9kZUJpbih0aGlzLnNldHRpbmdzLm5vZGVCaW4sIGVtYmVkZGVkTm9kZVZlcnNpb24oKSwgdGhpcy5zZXR0aW5ncy51c2VFbWJlZGRlZE5vZGUpXG4gICAgcmV0dXJuIHtcbiAgICAgIGRzaEJpbjogZm91bmQuYmluLFxuICAgICAgZHNoTm90ZXM6IGZvdW5kLm5vdGVzLFxuICAgICAgbm9kZU5vdGVzOiBub2RlLm5vdGVzLFxuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODQgRFNIX0hPTUVcdUZGMDhcdThCQkVcdTdGNkVcdTk4NzVcdTVDNTVcdTc5M0FcdUZGMDkgKi9cbiAgZWZmZWN0aXZlRHNoSG9tZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBjb21wdXRlRHNoSG9tZSh0aGlzLnNldHRpbmdzLCB0aGlzLnZhdWx0Um9vdCgpKVxuICB9XG5cbiAgLyoqIFx1NUY1M1x1NTI0RFx1OEJCRVx1N0Y2RVx1NEUwQlx1NzUxRlx1NjU0OFx1NzY4NFx1N0FFRlx1NTNFM1x1RkYwOHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdTZCQ0YgdmF1bHQgXHU3MkVDXHU3QUNCXHVGRjA5ICovXG4gIGVmZmVjdGl2ZVBvcnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gY29tcHV0ZVBvcnQodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIC8qKiBcdTVGNTNcdTUyNERcdThCQkVcdTdGNkVcdTRFMEJcdTc1MUZcdTY1NDhcdTc2ODRcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gfi8uZHNoXHVGRjBDXHU1MTc2XHU0RjU5XHU2NUUwXHVGRjA5ICovXG4gIGVmZmVjdGl2ZVNoYXJlZENvbmZpZ1Jvb3QoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gY29tcHV0ZVNoYXJlZENvbmZpZ1Jvb3QodGhpcy5zZXR0aW5ncywgdGhpcy52YXVsdFJvb3QoKSlcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSAoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSBhcyBQYXJ0aWFsPERzaERvY2tTZXR0aW5ncz4gfCBudWxsXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGRhdGEgPz8ge30pXG4gICAgLy8gXHU2NUU3XHU3MjQ4XHVGRjA4ZHNoLWhvc3QgVjAuMVx1RkYwOVx1OEJCRVx1N0Y2RVx1OEZDMVx1NzlGQlx1RkYxQWRzaEhvbWUgXHU1QjU3XHU3QjI2XHU0RTMyIFx1MjE5MiBjdXN0b20gXHU2QTIxXHU1RjBGXG4gICAgY29uc3QgbGVnYWN5OiB7IGRzaEhvbWU/OiBzdHJpbmcgfSB8IG51bGwgPSBkYXRhXG4gICAgaWYgKGxlZ2FjeT8uZHNoSG9tZSAmJiB0eXBlb2YgbGVnYWN5LmRzaEhvbWUgPT09ICdzdHJpbmcnICYmIGxlZ2FjeS5kc2hIb21lLnRyaW0oKSkge1xuICAgICAgdGhpcy5zZXR0aW5ncy5kc2hIb21lTW9kZSA9ICdjdXN0b20nXG4gICAgICB0aGlzLnNldHRpbmdzLmRzaEhvbWUgPSBsZWdhY3kuZHNoSG9tZS50cmltKClcbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFVJXG5cbiAgYXN5bmMgb3BlblBhbmVsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcFxuICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRFNIX1dFQl9WSUVXX1RZUEUpXG4gICAgbGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCBudWxsID0gbGVhdmVzWzBdID8/IG51bGxcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIC8vIEQ4XHVGRjFBZ2V0UmlnaHRMZWFmKGZhbHNlKSBcdTU3MjggMS4xMy54IFx1NzY4NCBkLnRzIFx1NEUwRVx1NUI5OFx1NjVCOSBkb2NzIFx1NEUyRFx1NTc0N1x1NjVFMFxuICAgICAgLy8gQGRlcHJlY2F0ZWQgXHU2ODA3XHU4QkIwXHVGRjA4XHU2OEMwXHU2RDRCXHU2MkE1XHU1NDRBIFx1MDBBNzUuMVx1RkYwOVx1RkYwQ1x1OEJFRFx1NEU0OVx1NTM3M1wiXHU1M0YzXHU0RkE3XHU2ODBGXHU1M0Y2XHU1QjUwXCJcdUZGMENcdTUzRUZcdTdFRTdcdTdFRURcdTc1MjhcdUZGMUJcbiAgICAgIC8vIGVuc3VyZVNpZGVMZWFmIFx1OTcwMCBPYnNpZGlhbiAxLjcuMitcdUZGMENcdTgwMEMgbWluQXBwVmVyc2lvbiBcdTRGRERcdTYzMDEgMS41LjBcdUZGMENcbiAgICAgIC8vIFx1NEUwRFx1NUYxNVx1NTE2NVx1OTg5RFx1NTkxNlx1NzI0OFx1NjcyQ1x1OTVFOFx1NjlEQlx1MzAwMlxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpXG4gICAgICBpZiAoIWxlYWYpIHJldHVyblxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEU0hfV0VCX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pXG4gICAgfVxuICAgIHdvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGxlYWYpXG4gIH1cblxuICBhc3luYyBvcGVuSW5Ccm93c2VyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHNoZWxsLm9wZW5FeHRlcm5hbCh0aGlzLmJhc2VVcmwpXG4gIH1cblxuICAvKipcbiAgICogXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHVGRjA4T2JzaWRpYW4gcG9wb3V0XHVGRjA5XHVGRjFBRFNIIFx1OTc2Mlx1Njc3Rlx1OEZEQlx1NTE2NVx1NzJFQ1x1N0FDQiBCcm93c2VyV2luZG93ID1cbiAgICogXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU0RTBFIE9ic2lkaWFuIFx1NEUzQlx1N0E5N1x1NTNFM1x1OTY5NFx1NzlCQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1NjgwN1x1N0I3RVx1OTg3NVx1MzAwMlxuICAgKi9cbiAgYXN5bmMgb3BlblBvcG91dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5vcGVuUG9wb3V0TGVhZigpXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERTSF9XRUJfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKVxuICAgICAgbmV3IE5vdGljZShgXHU1RjM5XHU1MUZBXHU3MkVDXHU3QUNCXHU3QTk3XHU1M0UzXHU1OTMxXHU4RDI1OiAke21zZ31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogbGF1bmNoZXIudHMgXHUyMDE0XHUyMDE0IFx1N0VBRlx1NTQyRlx1NTJBOFx1OTAzQlx1OEY5MVx1RkYwOFx1OTZGNiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMENcdTUzRUZcdTcyRUNcdTdBQ0JcdTUxOTJcdTcwREZcdTZENEJcdThCRDVcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTgwNENcdThEMjNcdUZGMUFcdTVCOUFcdTRGNERcdTVCOThcdTY1QjkgZHNoIENMSSBcdTIxOTIgXHU5MDA5XHU2MkU5IE5vZGUgXHU4RkQwXHU4ODRDXHU2NUY2IFx1MjE5MiBzcGF3biBgZHNoIHdlYmBcbiAqIFx1RkYwODEyNy4wLjAuMTo8cG9ydD5cdUZGMDlcdTIxOTIgXHU3QjQ5XHU1Rjg1IEhUVFAgXHU1QzMxXHU3RUVBIFx1MjE5MiBcdTUwNUNcdTZCNjJcdTMwMDJcbiAqXG4gKiBcdTUxNzNcdTk1MkVcdTRFOEJcdTVCOUVcdUZGMDhcdTVERjJcdTU3MjhcdTVCOThcdTY1QjkgQGRlZXBzZWVrLWFpL2RzaEAwLjEuMC1yYy42IFx1NEUwQVx1OUE4Q1x1OEJDMVx1RkYwOVx1RkYxQVxuICogLSBgbm9kZSA8ZHNoPi9saWIvYmluLmpzIHdlYiAtLWhvc3QgMTI3LjAuMC4xIC0tcG9ydCA8cG9ydD5gIFx1NTM3M1x1NUI5OFx1NjVCOSBXZWIgVUlcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0IGhvc3Q9MTI3LjAuMC4xXHUzMDAxcG9ydD0zMDgwXHVGRjA4XHU1M0VGXHU4OTg2XHU3NkQ2XHVGRjA5XHVGRjFCXG4gKiAtIFx1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1ODFFQVx1NTJBOFx1NTIxRFx1NTlDQlx1NTMxNiAkRFNIX0hPTUUvcHJvZmlsZXMvd2ViXHVGRjA4YnVuZGxlcyA9IGRzaC1iYXNlICsgZHNoLXdlYi1hcHBcdUZGMDlcdUZGMENcbiAqICAgXHU2QTIxXHU1NzU3XHU4OUUzXHU2NzkwXHU4RDcwICREU0hfSE9NRS9wcm9maWxlcy9ub2RlX21vZHVsZXMgXHU1RTczXHU5NzYyXHU3QjI2XHU1M0Y3XHU5NEZFXHU2M0E1XHVGRjBDXHU2NUUwXHU5NzAwIHBucG0vXHU4MDU0XHU3RjUxXHVGRjFCXG4gKiAtIFx1OUVEOFx1OEJBNFx1OTE0RFx1N0Y2RVx1NEUwQiBTUUxpdGVcdUZGMDhub2RlOnNxbGl0ZVx1RkYwQ1x1OTcwMCBOb2RlIFx1MjI2NTIyLjVcdUZGMDlcdTRFMERcdTRGMUFcdTYyNTNcdTVGMDBcdUZGMDhvcGVuQXQ6IG5ldmVyXHVGRjA5XHVGRjBDXG4gKiAgIFx1NTZFMFx1NkI2NCBOb2RlIDIwKyBcdTRFNUZcdTgwRkRcdThERDFcdTlFRDhcdThCQTQgd2ViIHByb2ZpbGVcdUZGMUJcdTU0MkZcdTc1MjhcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTY1RjZcdTYyNERcdTk3MDBcdTg5ODEgTm9kZSBcdTIyNjUyMi41XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgc3Bhd24sIHNwYXduU3luYywgdHlwZSBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IERTSF9SRUxBVElWRV9CSU4gPSBwYXRoLmpvaW4oJ0BkZWVwc2Vlay1haScsICdkc2gnLCAnbGliJywgJ2Jpbi5qcycpXG5cbi8qKiBOb2RlIFx1NEUzQlx1NzI0OFx1NjcyQ1x1NTNGN1x1NkJENFx1OEY4M1x1RkYxQW5vZGU6c3FsaXRlIFx1OTcwMFx1ODk4MSBcdTIyNjUyMi41XHVGRjA4XHU0RUM1XHU1MTY4XHU2NTg3XHU2NDFDXHU3RDIyXHU1MjlGXHU4MEZEXHU3NTI4XHU1MjMwXHVGRjA5ICovXG5leHBvcnQgY29uc3QgTk9ERV9TUUxJVEVfTUlOX01BSk9SID0gMjJcblxuLyoqIFx1N0EzM1x1NUI5QVx1NzdFRFx1NTRDOFx1NUUwQ1x1RkYwOGRqYjJcdUZGMDlcdUZGMENcdTc1MjhcdTRFOEUgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHU2RDg4XHU2QjY3XHVGRjBDXHU5MDdGXHU1MTREXHU0RTJEXHU2NTg3XHU1NDBEXHU2RTA1XHU2RDE3XHU3OEIwXHU2NDlFICovXG5leHBvcnQgZnVuY3Rpb24gc3RhYmxlSGFzaChpbnB1dDogc3RyaW5nLCBsZW4gPSA2KTogc3RyaW5nIHtcbiAgbGV0IGggPSA1MzgxXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIGggPSAoKGggPDwgNSkgKyBoICsgaW5wdXQuY2hhckNvZGVBdChpKSkgPj4+IDBcbiAgcmV0dXJuIGgudG9TdHJpbmcoMzYpLnBhZFN0YXJ0KGxlbiwgJzAnKS5zbGljZSgwLCBsZW4pXG59XG5cbi8qKiBcdTUzRUZcdThCRkJcdTc2ODQgdmF1bHQgXHU3NkVFXHU1RjU1XHU1NDBEXHVGRjA4XHU0RkREXHU3NTU5IFVuaWNvZGUgXHU1QjU3XHU2QkNEXHU2NTcwXHU1QjU3XHVGRjBDXHU1MTc2XHU0RjU5XHU4RjZDIC1cdUZGMDlcdUZGMUJcdTdBN0FcdTUyMTkgJ3ZhdWx0JyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVWYXVsdE5hbWUodmF1bHRSb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjbGVhbmVkID0gcGF0aFxuICAgIC5iYXNlbmFtZSh2YXVsdFJvb3QpXG4gICAgLnJlcGxhY2UoL1teXFxwe0x9XFxwe059Xy1dKy9ndSwgJy0nKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csICcnKVxuICByZXR1cm4gKGNsZWFuZWQgfHwgJ3ZhdWx0Jykuc2xpY2UoMCwgNDApXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF1bmNoT3B0aW9ucyB7XG4gIC8qKiBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1RkYwOGJpbi5qcyBcdTc2ODRcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMENcdTYyMTYgZHNoIFx1NTMwNVx1NzZFRVx1NUY1NVx1RkYwOVx1RkYxQlx1N0E3QVx1NTIxOVx1ODFFQVx1NTJBOFx1NjNBMlx1NkQ0QiAqL1xuICBkc2hCaW4/OiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3QTdBXHU1MjE5XHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5ICovXG4gIG5vZGVCaW4/OiBzdHJpbmdcbiAgLyoqIFx1NzZEMVx1NTQyQ1x1N0FFRlx1NTNFM1x1RkYwOFx1OUVEOFx1OEJBNCAzMDgwXHVGRjA5ICovXG4gIHBvcnQ/OiBudW1iZXJcbiAgLyoqIFx1NzZEMVx1NTQyQyBob3N0XHVGRjA4XHU5RUQ4XHU4QkE0IDEyNy4wLjAuMVx1RkYwQ1x1NEVDNVx1NjcyQ1x1NjczQVx1RkYwOSAqL1xuICBob3N0Pzogc3RyaW5nXG4gIC8qKiAkRFNIX0hPTUVcdUZGMDhcdTRGMUFcdThCREQvXHU1QkM2XHU5NEE1L1x1NkEyMVx1NTc4Qlx1OTE0RFx1N0Y2RVx1NjgzOVx1NzZFRVx1NUY1NVx1RkYxQlx1OUVEOFx1OEJBNCA8dmF1bHQ+Ly5kc2hcdUZGMDkgKi9cbiAgZHNoSG9tZTogc3RyaW5nXG4gIC8qKlxuICAgKiBcdTUxNzFcdTRFQUJcdTkxNERcdTdGNkVcdTY4MzlcdUZGMDhwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RTBCXHU3Njg0IGB+Ly5kc2hgXHVGRjA5XHVGRjFBXHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTdCNDlcdTkxNERcdTdGNkVcdTdDN0JcdTY1ODdcdTRFRjZcbiAgICogXHU2MzA3XHU1NDExXHU2QjY0XHU3NkVFXHU1RjU1XHVGRjBDXHU2MjQwXHU2NzA5IHZhdWx0IFx1NTE3MVx1NzUyOFx1NEUwMFx1NEVGRFx1RkYxQnNlc3Npb25zIFx1N0I0OVx1NjU3MFx1NjM2RVx1NEVDRFx1NTcyOCBgZHNoSG9tZWAgXHU5Njk0XHU3OUJCXHUzMDAyXG4gICAqIFx1NzU1OVx1N0E3QSA9IFx1NEUwRFx1NTQyRlx1NzUyOFx1OTE0RFx1N0Y2RVx1NTE3MVx1NEVBQlx1RkYwOGRzaEhvbWUgXHU4MUVBXHU4RUFCXHU1MzczXHU5MTREXHU3RjZFXHU2ODM5XHVGRjA5XHUzMDAyXG4gICAqL1xuICBzaGFyZWRDb25maWdSb290Pzogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTUxNDFcdThCQjhcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU1OTBEXHU3NTI4IE9ic2lkaWFuIFx1NTE4NVx1N0Y2RSBOb2RlXHVGRjA4XHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjFBXHU1QjlFXHU2RDRCXHU0RTBEXHU1M0VGXHU5NzYwXHVGRjA5ICovXG4gIHVzZUVtYmVkZGVkTm9kZT86IGJvb2xlYW5cbiAgLyoqIFx1NUMzMVx1N0VFQVx1N0I0OVx1NUY4NVx1NEUwQVx1OTY1MFx1RkYwOFx1OUVEOFx1OEJBNCAxMjBzXHVGRjA5ICovXG4gIHRpbWVvdXRNcz86IG51bWJlclxuICAvKiogXHU5NjQ0XHU1MkEwXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGICovXG4gIGVudj86IE5vZGVKUy5Qcm9jZXNzRW52XG4gIC8qKlxuICAgKiBcdTVCNTBcdThGREJcdTdBMEJcdTVERTVcdTRGNUNcdTc2RUVcdTVGNTVcdTMwMDJwZXItdmF1bHQgXHU2QTIxXHU1RjBGXHU0RjIwIHZhdWx0IFx1NjgzOVx1RkYxQVx1NjVCMFx1NUVGQVx1NEYxQVx1OEJERFx1NzY4NCBjd2QgXHU1MzczXHU2NzJDXHU1RTkzXHU2ODM5XHVGRjBDXG4gICAqIHZhdWx0IFx1NURFNVx1NTE3N1x1ODlFM1x1Njc5MFx1OTg3QVx1NUU4Rlx1N0IyQyAzIFx1NEY0RFx1RkYwOFx1NEYxQVx1OEJERCBjd2QgXHU4MkU1XHU2NjJGXHU1RTkzXHVGRjA5XHU3NkY0XHU2M0E1XHU1NDdEXHU0RTJEIFx1MjAxNFx1MjAxNCBcdTU3MjhcdTc1MUZcdTcyNjlcdTU5MDdcdThCRkVcdTc2ODRcbiAgICogXHU2NzBEXHU1MkExXHU5MUNDXHU2M0QwXHU5NUVFXHU3RUREXHU0RTBEXHU0RjFBXHU4OUUzXHU2NzkwXHU2MjEwXHU3NTFGXHU3MjY5XHU5ODk4XHU1RTkzXHUzMDAyc2hhcmVkIFx1NkEyMVx1NUYwRlx1NEUwRFx1NEYyMFx1RkYwOFx1NjI0MFx1NjcwOVx1NUU5M1x1NTE3MVx1NzUyOFx1NEUwMFx1NEUyQVx1NjcwRFx1NTJBMVx1RkYwQ1xuICAgKiBcdTk3NjBcdTcxMjZcdTcwQjlcdTY4MDdcdThCQjBcdThEREZcdTk2OEZcdUZGMDlcdTMwMDJcbiAgICovXG4gIGN3ZD86IHN0cmluZ1xuICAvKipcbiAgICogXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHU2NUY2XHU3Njg0XCJcdTU0QzFcdTcyNENcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcIlx1RkYwOFx1NzUzMVx1NjNEMlx1NEVGNlx1NEZBN1x1NkNFOFx1NTE2NVx1RkYwQ2xhdW5jaGVyIFx1NEZERFx1NjMwMVx1OTZGNlxuICAgKiBPYnNpZGlhbiBcdTRGOURcdThENTZcdUZGMDlcdUZGMUFcdThGRDRcdTU2REUgdHJ1ZSBcdTYyNERcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdUZGMUJcdThGRDRcdTU2REUgZmFsc2UgXHU2MzA5XHUzMDBDXHU3QUVGXHU1M0UzXHU4OEFCXHU5NzVFXG4gICAqIERTSCBcdTY3MERcdTUyQTFcdTUzNjBcdTc1MjhcdTMwMERcdTYyQTVcdTk1MTlcdUZGMENcdTkwN0ZcdTUxNERcdTYyOEFcdTUyMkJcdTc2ODRcdTY3MERcdTUyQTFcdThCRUZcdTVGNTNcdTYyMTAgZHNoIHdlYlx1MzAwMlx1NEUwRFx1NEYyMCA9IFx1OERGM1x1OEZDN1x1NjgyMVx1OUE4Q1xuICAgKiBcdUZGMDhcdTY1RTdcdTg4NENcdTRFM0FcdUZGMENcdTdBRUZcdTUzRTNcdTY3MDlcdTY3MERcdTUyQTFcdTUzNzNcdTYzMDJcdTYzQTVcdUZGMDlcdTMwMDJcbiAgICovXG4gIHZlcmlmeUJyYW5kPzogKHVybDogc3RyaW5nKSA9PiBQcm9taXNlPGJvb2xlYW4+XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWROb2RlIHtcbiAgLyoqIFx1NzUyOFx1NEU4RSBzcGF3biBcdTc2ODQgbm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjYgKi9cbiAgbm9kZUJpbjogc3RyaW5nXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTc1MjggRUxFQ1RST05fUlVOX0FTX05PREUgXHU2MjhBIE9ic2lkaWFuIFx1NzY4NCBFbGVjdHJvbiBcdTRFOENcdThGREJcdTUyMzZcdTVGNTMgTm9kZSBcdTc1MjggKi9cbiAgdXNlRWxlY3Ryb25Bc05vZGU6IGJvb2xlYW5cbiAgLyoqIFx1OEJFNSBOb2RlIFx1NzY4NCBtYWpvciBcdTcyNDhcdTY3MkNcdUZGMDhcdTYzQTJcdTZENEJcdTU5MzFcdThEMjVcdTRFM0EgMFx1RkYwOSAqL1xuICBub2RlTWFqb3I6IG51bWJlclxuICAvKiogXHU2M0EyXHU2RDRCL1x1NTFCM1x1N0I1Nlx1OEJGNFx1NjYwRVx1RkYwOFx1NEY5Qlx1OEJCRVx1N0Y2RVx1OTg3NVx1NUM1NVx1NzkzQVx1RkYwOSAqL1xuICBub3Rlczogc3RyaW5nW11cbn1cblxuZXhwb3J0IHR5cGUgU2VydmVyU3RhdHVzID1cbiAgfCB7IGtpbmQ6ICdzdG9wcGVkJyB9XG4gIHwgeyBraW5kOiAnc3RhcnRpbmcnIH1cbiAgfCB7IGtpbmQ6ICdydW5uaW5nJzsgcG9ydDogbnVtYmVyOyBob3N0OiBzdHJpbmc7IHVybDogc3RyaW5nOyBhdHRhY2hlZDogYm9vbGVhbiB9XG4gIHwgeyBraW5kOiAnZXJyb3InOyBtZXNzYWdlOiBzdHJpbmcgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1OERFRlx1NUY4NFx1NUI5QVx1NEY0RFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTYyOEFcdTc1MjhcdTYyMzdcdTU4NkJcdTUxOTlcdTc2ODRcdTUxNjVcdTUzRTNcdTg5QzRcdTgzMDNcdTUzMTZcdUZGMUFcdTYzMDdcdTU0MTEgYmluLmpzIFx1NjIxNiBkc2ggXHU1MzA1XHU3NkVFXHU1RjU1XHU5MEZEXHU2M0E1XHU1M0Q3ICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRHNoQmluKGlucHV0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghaW5wdXQpIHJldHVybiBudWxsXG4gIGNvbnN0IHAgPSBpbnB1dC50cmltKClcbiAgaWYgKCFwKSByZXR1cm4gbnVsbFxuICBjb25zdCBleHBhbmRlZCA9IHAucmVwbGFjZSgvXn4oPz0kfFxcL3xcXFxcKS8sIG9zLmhvbWVkaXIoKSlcbiAgY29uc3QgYWJzID0gcGF0aC5pc0Fic29sdXRlKGV4cGFuZGVkKSA/IHBhdGgubm9ybWFsaXplKGV4cGFuZGVkKSA6IHBhdGgucmVzb2x2ZShleHBhbmRlZClcbiAgdHJ5IHtcbiAgICBjb25zdCBzdCA9IGZzLnN0YXRTeW5jKGFicylcbiAgICBpZiAoc3QuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKGFicywgJ2xpYicsICdiaW4uanMnKVxuICAgICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IG51bGxcbiAgICB9XG4gICAgaWYgKHN0LmlzRmlsZSgpKSByZXR1cm4gYWJzXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuLyoqIFx1NUUzOFx1ODlDMSBucG0gXHU1MTY4XHU1QzQwIG5vZGVfbW9kdWxlcyBcdTY4MzlcdUZGMDhcdTYzMDlcdTVFNzNcdTUzRjBcdUZGMDkgKi9cbmxldCBjYWNoZWRHbG9iYWxSb290czogc3RyaW5nW10gfCBudWxsID0gbnVsbFxuZXhwb3J0IGZ1bmN0aW9uIGdsb2JhbE1vZHVsZVJvb3RzKCk6IHN0cmluZ1tdIHtcbiAgLy8gXHU3RUQzXHU2NzlDXHU3RjEzXHU1QjU4XHVGRjFBc3Bhd25TeW5jKCducG0nKSBcdTY3MDBcdTU3NEZcdTk2M0JcdTU4NUUgMTBzXHVGRjA4bnBtIFx1NjE2Mlx1NjVGNlx1RkYwOVx1RkYwQ09ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlxuICAvLyBcdTkxQ0NcdTZCQ0ZcdTZCMjFcdTU0MkZcdTUyQThcdTkwRkRcdTU0MENcdTZCNjVcdThERDFcdTRFMDBcdTZCMjFcdTRFMERcdTUzRUZcdTYzQTVcdTUzRDdcdTMwMDJcdThGREJcdTdBMEJcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcdTUxODUgbnBtIHJvb3QgXHU0RTBEXHU1M0Q4XHVGRjBDXG4gIC8vIFx1OTk5Nlx1NkIyMVx1NjNBMlx1NkQ0Qlx1NTQwRVx1NTkwRFx1NzUyOFx1MzAwMlx1NkNFOFx1NjEwRlx1RkYxQVx1OEZEMFx1ODg0Q1x1NEUyRFx1NTQwRVx1ODhDNVx1NzY4NCBkc2ggXHU0RTBEXHU0RjFBXHU4OEFCXHU1M0QxXHU3M0IwXHVGRjBDXHU0RjQ2XHU1NkZBXHU1QjlBXHU4REVGXHU1Rjg0XG4gIC8vIFx1RkYwOC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcyBcdTdCNDlcdUZGMDlcdTRFQ0RcdTg5ODZcdTc2RDZcdTVFMzhcdTg5QzFcdTVCODlcdTg4QzVcdTRGNERcdTdGNkVcdTMwMDJcbiAgaWYgKGNhY2hlZEdsb2JhbFJvb3RzKSByZXR1cm4gY2FjaGVkR2xvYmFsUm9vdHNcbiAgY29uc3Qgcm9vdHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKHByb2Nlc3MuZW52LkRTSF9HTE9CQUxfTU9EVUxFUykgcm9vdHMucHVzaChwcm9jZXNzLmVudi5EU0hfR0xPQkFMX01PRFVMRVMpXG4gIGNvbnN0IG5wbVJvb3QgPSBzcGF3blN5bmMoJ25wbScsIFsncm9vdCcsICctZyddLCB7XG4gICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICB0aW1lb3V0OiAxMF8wMDAsXG4gICAgd2luZG93c0hpZGU6IHRydWUsXG4gIH0pXG4gIGlmIChucG1Sb290LnN0YXR1cyA9PT0gMCAmJiBucG1Sb290LnN0ZG91dCkge1xuICAgIGNvbnN0IGxpbmUgPSBucG1Sb290LnN0ZG91dC50cmltKCkuc3BsaXQoL1xccj9cXG4vKVswXVxuICAgIGlmIChsaW5lKSByb290cy5wdXNoKGxpbmUpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgcm9vdHMucHVzaCgnL29wdC9ob21lYnJldy9saWIvbm9kZV9tb2R1bGVzJywgJy91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcycpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2xpbnV4Jykge1xuICAgIHJvb3RzLnB1c2goJy91c3IvbGliL25vZGVfbW9kdWxlcycsICcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnLCBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmxvY2FsJywgJ2xpYicsICdub2RlX21vZHVsZXMnKSlcbiAgfSBlbHNlIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgY29uc3QgYXBwRGF0YSA9IHByb2Nlc3MuZW52LkFQUERBVEFcbiAgICBpZiAoYXBwRGF0YSkgcm9vdHMucHVzaChwYXRoLmpvaW4oYXBwRGF0YSwgJ25wbScsICdub2RlX21vZHVsZXMnKSlcbiAgfVxuICAvLyBcdTUzQkJcdTkxQ0RcdTRGRERcdTVFOEZcbiAgY2FjaGVkR2xvYmFsUm9vdHMgPSBbLi4ubmV3IFNldChyb290cyldXG4gIHJldHVybiBjYWNoZWRHbG9iYWxSb290c1xufVxuXG4vKipcbiAqIFx1NUI5QVx1NEY0RFx1NUI5OFx1NjVCOSBkc2ggQ0xJIFx1NTE2NVx1NTNFM1x1MzAwMlx1NEYxOFx1NTE0OFx1N0VBN1x1RkYxQVxuICogMS4gXHU2NjNFXHU1RjBGXHU0RjIwXHU1MTY1XHVGRjA4XHU4QkJFXHU3RjZFXHU5ODc1XHVGRjA5XHUyMTkyIDIuIFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiBEU0hfQklOIFx1MjE5MiAzLiBucG0gcm9vdCAtZyBcdTIxOTIgNC4gXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU2ODM5XHUzMDAyXG4gKiBcdTY3MkFcdTYyN0VcdTUyMzBcdTY1RjYgYmluIFx1NEUzQSBudWxsXHVGRjBDbm90ZXMgXHU4QkY0XHU2NjBFXHU1MzlGXHU1NkUwXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRHNoQmluKGV4cGxpY2l0Pzogc3RyaW5nKTogeyBiaW46IHN0cmluZyB8IG51bGw7IG5vdGVzOiBzdHJpbmdbXSB9IHtcbiAgY29uc3Qgbm90ZXM6IHN0cmluZ1tdID0gW11cbiAgY29uc3QgZXhwbGljaXRCaW4gPSBub3JtYWxpemVEc2hCaW4oZXhwbGljaXQgPz8gcHJvY2Vzcy5lbnYuRFNIX0JJTilcbiAgaWYgKGV4cGxpY2l0QmluICYmIGZzLmV4aXN0c1N5bmMoZXhwbGljaXRCaW4pKSB7XG4gICAgcmV0dXJuIHsgYmluOiBleHBsaWNpdEJpbiwgbm90ZXM6IFtgXHU0RjdGXHU3NTI4XHU2NjNFXHU1RjBGXHU4REVGXHU1Rjg0OiAke2V4cGxpY2l0QmlufWBdIH1cbiAgfVxuICBpZiAoZXhwbGljaXQpIG5vdGVzLnB1c2goYFx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NFx1NEUwRFx1NUI1OFx1NTcyODogJHtleHBsaWNpdH1gKVxuXG4gIGZvciAoY29uc3Qgcm9vdCBvZiBnbG9iYWxNb2R1bGVSb290cygpKSB7XG4gICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5qb2luKHJvb3QsIERTSF9SRUxBVElWRV9CSU4pXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSkge1xuICAgICAgcmV0dXJuIHsgYmluOiBjYW5kaWRhdGUsIG5vdGVzOiBbLi4ubm90ZXMsIGBcdTRFQ0VcdTUxNjhcdTVDNDBcdTZBMjFcdTU3NTdcdTY4MzlcdTUzRDFcdTczQjA6ICR7Y2FuZGlkYXRlfWBdIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIGRzaCBcdTVCODlcdTg4QzVcdTMwMDJcdThCRjdcdTUxNDhcdTYyNjdcdTg4NEM6IG5wbSBpbnN0YWxsIC1nIEBkZWVwc2Vlay1haS9kc2hcdUZGMENcdTYyMTZcdTU3MjhcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgZHNoIFx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IGJpbjogbnVsbCwgbm90ZXMgfVxufVxuXG4vKipcbiAqIFx1NUUzOFx1ODlDMSBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOFx1NjMwOVx1NUU3M1x1NTNGMFx1RkYwQ1x1NjNBMlx1NkQ0Qlx1NzUyOFx1RkYwOVx1MzAwMlxuICogT2JzaWRpYW4gXHU0RjVDXHU0RTNBIEdVSSBcdTVFOTRcdTc1MjhcdTRFQ0UgRmluZGVyIFx1NTQyRlx1NTJBOFx1NjVGNlx1RkYwQ1BBVEggXHU5MDFBXHU1RTM4XHU1M0VBXHU2NzA5XHU3Q0ZCXHU3RURGXHU3NkVFXHU1RjU1XG4gKiBcdUZGMDgvdXNyL2JpbjovYmluOi91c3Ivc2Jpbjovc2Jpblx1RkYwOVx1RkYwQ1x1NEUwRFx1NTQyQiBIb21lYnJldyBcdTdCNDlcdTc1MjhcdTYyMzdcdTVCODlcdTg4QzVcdTc2RUVcdTVGNTVcdUZGMENcbiAqIFx1NTZFMFx1NkI2NCBzcGF3bignbm9kZScpIFx1NEYxQVx1NzZGNFx1NjNBNSBFTk9FTlRcdTMwMDJcdThGRDlcdTkxQ0NcdTYyOEFcdTVFMzhcdTg5QzFcdTVCODlcdTg4QzVcdTRGNERcdTdGNkVcdTg4NjVcdTlGNTBcdUZGMUFcbiAqIC0gUEFUSCBcdTRFMkRcdTc2ODQgbm9kZVx1RkYwOHNoZWxsIFx1OTFDQ1x1OEZEMFx1ODg0Q1x1NjVGNlx1NUI1OFx1NTcyOFx1RkYwOVx1RkYxQlxuICogLSBtYWNPUzogL29wdC9ob21lYnJldy9iaW4vbm9kZVx1RkYwOEFwcGxlIFNpbGljb25cdUZGMDlcdTMwMDEvdXNyL2xvY2FsL2Jpbi9ub2RlXHVGRjA4SW50ZWxcdUZGMDlcdUZGMUJcbiAqIC0gTGludXg6IC91c3IvYmluL25vZGVcdTMwMDEvdXNyL2xvY2FsL2Jpbi9ub2RlXHUzMDAxfi8ubG9jYWwvYmluL25vZGVcdUZGMUJcbiAqIC0gV2luZG93czogXHU5MDFBXHU4RkM3IGB3aGVyZSBub2RlYCBcdTg5RTNcdTY3OTBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbW1vbk5vZGVCaW5zKCk6IHN0cmluZ1tdIHtcbiAgY29uc3QgYmluczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBwYXRoRW52ID0gcHJvY2Vzcy5lbnYuUEFUSCA/PyAnJ1xuICBmb3IgKGNvbnN0IGRpciBvZiBwYXRoRW52LnNwbGl0KHBhdGguZGVsaW1pdGVyKSkge1xuICAgIGlmIChkaXIudHJpbSgpKSBiaW5zLnB1c2gocGF0aC5qb2luKGRpciwgJ25vZGUnKSlcbiAgfVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2RhcndpbicpIHtcbiAgICBiaW5zLnB1c2goJy9vcHQvaG9tZWJyZXcvYmluL25vZGUnLCAnL3Vzci9sb2NhbC9iaW4vbm9kZScpXG4gIH0gZWxzZSBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2xpbnV4Jykge1xuICAgIGJpbnMucHVzaCgnL3Vzci9iaW4vbm9kZScsICcvdXNyL2xvY2FsL2Jpbi9ub2RlJywgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5sb2NhbCcsICdiaW4nLCAnbm9kZScpKVxuICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgd2hlcmUgPSBzcGF3blN5bmMoJ3doZXJlJywgWydub2RlJ10sIHsgZW5jb2Rpbmc6ICd1dGY4JywgdGltZW91dDogMTBfMDAwLCB3aW5kb3dzSGlkZTogdHJ1ZSB9KVxuICAgICAgaWYgKHdoZXJlLnN0YXR1cyA9PT0gMCAmJiB3aGVyZS5zdGRvdXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIHdoZXJlLnN0ZG91dC50cmltKCkuc3BsaXQoL1xccj9cXG4vKSkge1xuICAgICAgICAgIGlmIChsaW5lLnRyaW0oKSkgYmlucy5wdXNoKGxpbmUudHJpbSgpKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gIH1cbiAgLy8gXHU1M0JCXHU5MUNEXHU0RkREXHU1RThGXHVGRjBDXHU0RkREXHU3NTU5XHU3QjJDXHU0RTAwXHU0RTJBXHU1QjU4XHU1NzI4XHU3Njg0XG4gIHJldHVybiBbLi4ubmV3IFNldChiaW5zKV1cbn1cblxuLyoqIFx1NjNBMlx1NkQ0QiBub2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1NzY4NCBtYWpvciBcdTcyNDhcdTY3MkNcdUZGMUJcdTU5MzFcdThEMjVcdThGRDRcdTU2REUgMFx1RkYwOG5vZGVNYWpvciAwID0gXHU2NzJBXHU3N0U1XHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gcHJvYmVOb2RlTWFqb3Iobm9kZUJpbjogc3RyaW5nKTogbnVtYmVyIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXQgPSBzcGF3blN5bmMobm9kZUJpbiwgWyctLXZlcnNpb24nXSwgeyBlbmNvZGluZzogJ3V0ZjgnLCB0aW1lb3V0OiA1MDAwLCB3aW5kb3dzSGlkZTogdHJ1ZSB9KVxuICAgIGNvbnN0IG0gPSAvXnY/KFxcZCspXFwuLy5leGVjKChvdXQuc3Rkb3V0IHx8ICcnKS50cmltKCkpXG4gICAgcmV0dXJuIG0gPyBOdW1iZXIobVsxXSkgOiAwXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiAwXG4gIH1cbn1cblxuLyoqXG4gKiBcdTkwMDlcdTYyRTkgTm9kZSBcdThGRDBcdTg4NENcdTY1RjZcdTMwMDJcbiAqIFx1OUVEOFx1OEJBNFx1OTg3QVx1NUU4Rlx1RkYxQVx1NjYzRVx1NUYwRlx1OERFRlx1NUY4NCBcdTIxOTIgXHU3Q0ZCXHU3RURGIGBub2RlYFx1RkYwOFBBVEggKyBcdTVFMzhcdTg5QzFcdTVCODlcdTg4QzVcdThERUZcdTVGODRcdUZGMENcdThGRDRcdTU2REVcdTdFRERcdTVCRjlcdThERUZcdTVGODRcdUZGMENcbiAqIFx1OTA3Rlx1NTE0RCBPYnNpZGlhbiBHVUkgXHU3M0FGXHU1ODgzIFBBVEggXHU3RjNBXHU1OTMxXHU1QkZDXHU4MUY0IHNwYXduIEVOT0VOVFx1RkYwOVx1MjE5MiBcdTYyN0VcdTRFMERcdTUyMzBcdTY1RjZcdTdFRDlcdTUxRkFcdTY2MEVcdTc4NkVcdTk1MTlcdThCRUZcdTMwMDJcbiAqIEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSBcdTVCOUVcdTZENEJcdTRGMUFcdTYzMDJcdThENzdcdUZGMDhPYnNpZGlhbiBcdTRFOENcdThGREJcdTUyMzZcbiAqIFx1NEUwRFx1NjMwOVx1NjY2RVx1OTAxQSBFbGVjdHJvbiBcdThCRURcdTRFNDlcdTU0Q0RcdTVFOTRcdUZGMDlcdUZGMENcdTU2RTBcdTZCNjRcdTRFQzVcdTVGNTMgdXNlRW1iZWRkZWROb2RlIFx1NjYzRVx1NUYwRlx1NUYwMFx1NTQyRlx1NjVGNlx1NjI0RFx1NUMxRFx1OEJENVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU5vZGVCaW4oZXhwbGljaXQ/OiBzdHJpbmcsIGVtYmVkZGVkTm9kZVZlcnNpb24/OiBzdHJpbmcsIHVzZUVtYmVkZGVkID0gZmFsc2UpOiBSZXNvbHZlZE5vZGUge1xuICBjb25zdCBub3Rlczogc3RyaW5nW10gPSBbXVxuICBjb25zdCBleHBsaWNpdEJpbiA9IGV4cGxpY2l0Py50cmltKCkgfHwgcHJvY2Vzcy5lbnYuRFNIX05PREVcbiAgaWYgKGV4cGxpY2l0QmluKSB7XG4gICAgY29uc3QgbWFqb3IgPSBwcm9iZU5vZGVNYWpvcihleHBsaWNpdEJpbilcbiAgICBjb25zdCBub3RlID0gbWFqb3IgPiAwID8gYFx1NEY3Rlx1NzUyOFx1NjYzRVx1NUYwRiBOb2RlOiAke2V4cGxpY2l0QmlufVx1RkYwOHYke21ham9yfVx1RkYwOWAgOiBgXHU0RjdGXHU3NTI4XHU2NjNFXHU1RjBGIE5vZGU6ICR7ZXhwbGljaXRCaW59YFxuICAgIG5vdGVzLnB1c2gobm90ZSlcbiAgICByZXR1cm4geyBub2RlQmluOiBleHBsaWNpdEJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IGZhbHNlLCBub2RlTWFqb3I6IG1ham9yLCBub3RlcyB9XG4gIH1cbiAgaWYgKHVzZUVtYmVkZGVkICYmIHByb2Nlc3MuZXhlY1BhdGggJiYgZW1iZWRkZWROb2RlVmVyc2lvbikge1xuICAgIGNvbnN0IG1ham9yID0gTnVtYmVyKGVtYmVkZGVkTm9kZVZlcnNpb24uc3BsaXQoJy4nKVswXSkgfHwgMFxuICAgIGlmIChtYWpvciA+PSBOT0RFX1NRTElURV9NSU5fTUFKT1IpIHtcbiAgICAgIG5vdGVzLnB1c2goYFx1NEY3Rlx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZSAke2VtYmVkZGVkTm9kZVZlcnNpb259XHVGRjA4RUxFQ1RST05fUlVOX0FTX05PREVcdUZGMDlgKVxuICAgICAgcmV0dXJuIHsgbm9kZUJpbjogcHJvY2Vzcy5leGVjUGF0aCwgdXNlRWxlY3Ryb25Bc05vZGU6IHRydWUsIG5vZGVNYWpvcjogbWFqb3IsIG5vdGVzIH1cbiAgICB9XG4gICAgbm90ZXMucHVzaChgT2JzaWRpYW4gXHU1MTg1XHU3RjZFIE5vZGUgJHtlbWJlZGRlZE5vZGVWZXJzaW9ufSA8ICR7Tk9ERV9TUUxJVEVfTUlOX01BSk9SfVx1RkYwQ1x1NjVFMFx1NkNENVx1NTQyRlx1NzUyOGApXG4gIH1cbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY29tbW9uTm9kZUJpbnMoKSkge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgIGNvbnN0IG1ham9yID0gcHJvYmVOb2RlTWFqb3IoY2FuZGlkYXRlKVxuICAgICAgbm90ZXMucHVzaChcbiAgICAgICAgbWFqb3IgPj0gTk9ERV9TUUxJVEVfTUlOX01BSk9SXG4gICAgICAgICAgPyBgXHU0RjdGXHU3NTI4XHU3Q0ZCXHU3RURGIE5vZGU6ICR7Y2FuZGlkYXRlfVx1RkYwOHYke21ham9yfVx1RkYwQ1x1NjUyRlx1NjMwMVx1NTE2OFx1NjU4N1x1NjQxQ1x1N0QyMlx1NjI0MFx1OTcwMCBTUUxpdGVcdUZGMDlgXG4gICAgICAgICAgOiBgXHU0RjdGXHU3NTI4XHU3Q0ZCXHU3RURGIE5vZGU6ICR7Y2FuZGlkYXRlfVx1RkYwOHYke21ham9yIHx8ICc/J31cdUZGMUJcdTUxNjhcdTY1ODdcdTY0MUNcdTdEMjJcdTk3MDAgTm9kZSBcdTIyNjUke05PREVfU1FMSVRFX01JTl9NQUpPUn1cdUZGMDlgLFxuICAgICAgKVxuICAgICAgcmV0dXJuIHsgbm9kZUJpbjogY2FuZGlkYXRlLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogbWFqb3IsIG5vdGVzIH1cbiAgICB9XG4gIH1cbiAgbm90ZXMucHVzaCgnXHU2NzJBXHU2MjdFXHU1MjMwIE5vZGVcdTMwMDJcdThCRjdcdTVCODlcdTg4QzUgTm9kZVx1RkYwOGh0dHBzOi8vbm9kZWpzLm9yZ1x1RkYwOVx1RkYwQ1x1NjIxNlx1NTcyOFx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNlx1OERFRlx1NUY4NCcpXG4gIHJldHVybiB7IG5vZGVCaW46ICcnLCB1c2VFbGVjdHJvbkFzTm9kZTogZmFsc2UsIG5vZGVNYWpvcjogMCwgbm90ZXMgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1N0FFRlx1NTNFM1x1NjNBMlx1NkQ0Qlx1NEUwRVx1N0I0OVx1NUY4NVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBcdTVGNTNcdTUyNERcdThGRDBcdTg4NENcdTczQUZcdTU4ODNcdUZGMDhPYnNpZGlhbiBcdTZFMzJcdTY3RDNcdThGREJcdTdBMEJcdUZGMDlcdTgxRUFcdTVFMjZcdTc2ODQgTm9kZSBcdTcyNDhcdTY3MkNcdUZGMUJcdTY1RTBcdTUyMTkgdW5kZWZpbmVkICovXG5leHBvcnQgZnVuY3Rpb24gZW1iZWRkZWROb2RlVmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIGNvbnN0IHYgPSAocHJvY2Vzcy52ZXJzaW9ucyBhcyB7IG5vZGU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/Lm5vZGVcbiAgICByZXR1cm4gdiB8fCB1bmRlZmluZWRcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogXHU3QUVGXHU1M0UzXHU2NjJGXHU1NDI2XHU1REYyXHU2NzA5XHU2NzBEXHU1MkExXHUzMDAyXG4gKiBcdTc1Mjggbm9kZTpodHRwIFx1ODAwQ1x1OTc1RVx1NkQ0Rlx1ODlDOFx1NTY2OCBmZXRjaFx1RkYxQU9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1NzY4NCBDU1AgXHU0RjFBXHU2MkU2XHU2MjJBXG4gKiBcdTVCRjkgaHR0cDovLzEyNy4wLjAuMSBcdTc2ODQgZmV0Y2hcdUZGMENcdTVCRkNcdTgxRjRcIlx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVwiXHU4QkVGXHU1MjI0XHU0RTNBXCJcdTZDQTFcdTY3MDlcIlx1MzAwMlxuICogTm9kZSBcdTc2ODQgaHR0cCBcdTZBMjFcdTU3NTdcdTRFMERcdTUzRDdcdTk4NzVcdTk3NjIgQ1NQIFx1N0VBNlx1Njc1Rlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQb3J0VXAoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDE1MDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgcmVxID0gaHR0cC5nZXQoeyBob3N0LCBwb3J0LCBwYXRoOiAnLycsIHRpbWVvdXQ6IHRpbWVvdXRNcyB9LCAocmVzKSA9PiB7XG4gICAgICByZXMucmVzdW1lKClcbiAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICB9KVxuICAgIHJlcS5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIHJlcS5kZXN0cm95KClcbiAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgfSlcbiAgICByZXEub24oJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZShmYWxzZSkpXG4gIH0pXG59XG5cbi8qKiBcdThGNkVcdThCRTJcdTdCNDlcdTVGODUgSFRUUCBcdTVDMzFcdTdFRUFcdUZGMUJcdThEODVcdTY1RjZcdThGRDRcdTU2REUgZmFsc2UgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yUmVhZHkoaG9zdDogc3RyaW5nLCBwb3J0OiBudW1iZXIsIHRpbWVvdXRNcyA9IDEyMF8wMDApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVhZGxpbmUgPSBEYXRlLm5vdygpICsgdGltZW91dE1zXG4gIGZvciAoOzspIHtcbiAgICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCwgMTUwMCkpIHJldHVybiB0cnVlXG4gICAgaWYgKERhdGUubm93KCkgPiBkZWFkbGluZSkgcmV0dXJuIGZhbHNlXG4gICAgLy8gZ2xvYmFsVGhpcy5zZXRUaW1lb3V0XHVGRjFBTm9kZVx1RkYwOHNtb2tlXHVGRjA5XHU0RTBFIE9ic2lkaWFuIFx1NkUzMlx1NjdEM1x1OEZEQlx1N0EwQlx1OTBGRFx1NTNFRlx1NzUyOFx1RkYwQ1xuICAgIC8vIFx1NEUwRFx1NUYxNVx1NTE2NSB3aW5kb3cgXHU0RjlEXHU4RDU2XHVGRjA4bGF1bmNoZXIgXHU0RkREXHU2MzAxXHU3RUFGIE5vZGUgXHU1M0VGXHU2RDRCXHVGRjA5XHUzMDAyXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IGdsb2JhbFRoaXMuc2V0VGltZW91dChyLCA1MDApKVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gXHU1NDJGXHU1MkE4IC8gXHU1MDVDXHU2QjYyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBMYXVuY2hlZFNlcnZlciB7XG4gIHByb2M6IENoaWxkUHJvY2Vzc1xuICB1cmw6IHN0cmluZ1xuICAvKiogdHJ1ZSA9IFx1N0FFRlx1NTNFM1x1NEUwQVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMVx1RkYwQ1x1NjcyQVx1NjVCMFx1OEQ3N1x1OEZEQlx1N0EwQiAqL1xuICBhdHRhY2hlZDogYm9vbGVhblxufVxuXG4vKipcbiAqIHBlci12YXVsdCBcdTZBMjFcdTVGMEZcdUZGMUFcdTYyOEEgcGVyLXZhdWx0IERTSF9IT01FIFx1NzY4NCBgcHJvZmlsZXMvYCBcdTY2RkZcdTYzNjJcdTRFM0FcdTYzMDdcdTU0MTFcdTUxNzFcdTRFQUJcbiAqIGB+Ly5kc2gvcHJvZmlsZXNgIFx1NzY4NFx1OEY2Rlx1OTRGRVx1MzAwMlx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1RkYwOFx1N0VBNiAxOTUgXHU0RTJBIEBkZWVwc2Vlay1haSBcdTUzMDVcdUZGMDlcdTUxNjhcdTVDNDBcbiAqIFx1NEUwMFx1NEVGRFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NkJDRlx1NEUyQSB2YXVsdCBcdTU0MDRcdTgxRUFcdTk0RkFcdTUxRTBcdTc2N0UgTUIgXHU3Njg0IG5vZGVfbW9kdWxlcyBcdTVFNzNcdTk3NjJcdTk0RkVcdTYzQTVcdUZGMUJza2lsbCBcdTVCOUFcdTRFNDlcbiAqIFx1NEU1Rlx1OTY4Rlx1NTE3MVx1NEVBQiBwcm9maWxlcy9hZ2VudC1wcmVzZXRzIFx1NEUwMFx1NUU3Nlx1NTkwRFx1NzUyOFx1MzAwMlxuICpcbiAqIFx1NTQwQ1x1NjVGNlx1NjI4QSBgLmFnZW50LXByZXNldHMvYCBcdThGNkZcdTk0RkVcdTUyMzBcdTUxNzFcdTRFQUIgYH4vLmRzaC8uYWdlbnQtcHJlc2V0c2BcdUZGMUFhZ2VudCBwcmVzZXRcbiAqIFx1NzY4NFx1NTNEMVx1NzNCMFx1NjgzOVx1NjYyRiBgZHNoSG9tZVBhdGgoJy5hZ2VudC1wcmVzZXRzJylgXHVGRjA4XHU4RERGXHU5NjhGIERTSF9IT01FXHVGRjA5XHVGRjBDcGVyLXZhdWx0XG4gKiBcdTZBMjFcdTVGMEZcdTgyRTVcdTRFMERcdTU0MENcdTZCNjVcdThGNkZcdTk0RkVcdUZGMENkc2ggXHU0RjFBXHU0RUNFIHBlci12YXVsdCBcdTc2RUVcdTVGNTVcdTYyN0UgcHJlc2V0IFx1MjAxNFx1MjAxNCBcdTc1MjhcdTYyMzdcdTgxRUFcdTVCOUFcdTRFNDlcdTc2ODRcbiAqIGBvYnNpZGlhbmAgcHJlc2V0XHVGRjA4XHU2MzAyXHU4RjdEIHZhdWx0IFx1NURFNVx1NTE3NyArIG9ic2lkaWFuLWNvbnZlbnRpb25zIHNraWxsXHVGRjA5XHU1QzMxXHU2MjdFXHU0RTBEXHU1MjMwXHVGRjBDXG4gKiBcdTg4NjhcdTczQjBcdTRFM0FcdTk3NjJcdTY3N0ZcdTkxQ0NcdTZDQTFcdTY3MDkgdmF1bHQgXHU1REU1XHU1MTc3XHUzMDAyXG4gKlxuICogXHU1REYyXHU1QjU4XHU1NzI4XHU3Njg0XHU3NzFGXHU1QjlFXHU3NkVFXHU1RjU1XHU0RjFBXHU4OEFCXHU2NkZGXHU2MzYyXHU0RTNBXHU4RjZGXHU5NEZFXHVGRjA4XHU2NUU3XHU3NkVFXHU1RjU1XHU1MTQ4XHU2NTM5XHU1NDBEXHU1OTA3XHU0RUZEXHU0RTNBIGA8bmFtZT4uYmFrLTx0cz5gXHVGRjBDXG4gKiBcdTc4NkVcdThCQTRcdTUxNzFcdTRFQUJcdTUzRUZcdTc1MjhcdTU0MEVcdTUzRUZcdTYyNEJcdTUyQThcdTUyMjBcdTk2NjRcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYXJlZFByb2ZpbGVzKGRzaEhvbWU6IHN0cmluZywgc2hhcmVkUm9vdDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghc2hhcmVkUm9vdCB8fCBkc2hIb21lID09PSBzaGFyZWRSb290KSByZXR1cm5cbiAgY29uc3QgbGlua0RpciA9IChuYW1lOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gcGF0aC5qb2luKGRzaEhvbWUsIG5hbWUpXG4gICAgICBjb25zdCBzaGFyZWRUYXJnZXQgPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgbmFtZSlcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzaGFyZWRUYXJnZXQpKSByZXR1cm5cbiAgICAgIGxldCBzdDogZnMuU3RhdHMgfCBudWxsID0gbnVsbFxuICAgICAgdHJ5IHtcbiAgICAgICAgc3QgPSBmcy5sc3RhdFN5bmModGFyZ2V0KVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHN0ID0gbnVsbFxuICAgICAgfVxuICAgICAgaWYgKHN0Py5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGlmIChmcy5yZWFscGF0aFN5bmModGFyZ2V0KSA9PT0gZnMucmVhbHBhdGhTeW5jKHNoYXJlZFRhcmdldCkpIHJldHVyblxuICAgICAgICBmcy51bmxpbmtTeW5jKHRhcmdldClcbiAgICAgICAgc3QgPSBudWxsXG4gICAgICB9XG4gICAgICBpZiAoc3Q/LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgY29uc3QgYmFrID0gYCR7dGFyZ2V0fS5iYWstJHtEYXRlLm5vdygpfWBcbiAgICAgICAgZnMucmVuYW1lU3luYyh0YXJnZXQsIGJhaylcbiAgICAgIH1cbiAgICAgIGZzLm1rZGlyU3luYyhkc2hIb21lLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgICAgZnMuc3ltbGlua1N5bmMoc2hhcmVkVGFyZ2V0LCB0YXJnZXQsICdkaXInKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS53YXJuKGBbZHNoLWhvc3RdIFx1NUVGQVx1N0FDQlx1NTE3MVx1NEVBQiAke25hbWV9IFx1OEY2Rlx1OTRGRVx1NTkzMVx1OEQyNVx1RkYwOHBlci12YXVsdCBcdTVDMDZcdTc1MjhcdTcyRUNcdTdBQ0JcdTc2RUVcdTVGNTVcdUZGMDlgLCBlcnIpXG4gICAgfVxuICB9XG4gIGxpbmtEaXIoJ3Byb2ZpbGVzJylcbiAgbGlua0RpcignLmFnZW50LXByZXNldHMnKVxufVxuXG4vKipcbiAqIFlBTUwgXHU1MzU1XHU1RjE1XHU1M0Y3XHU2ODA3XHU5MUNGXHVGRjFBXHU4REVGXHU1Rjg0XHU1NDJCXHU3QTdBXHU2ODNDL1x1NTE5Mlx1NTNGNy8jL1x1NTNDRFx1NjU5Q1x1Njc2MFx1NjVGNlx1NEY5RFx1NzEzNlx1NUI4OVx1NTE2OFx1MzAwMlxuICogXHU1MzU1XHU1RjE1XHU1M0Y3XHU1MTg1XHU1M0VBXHU4RjZDXHU0RTQ5IGAnYFx1RkYwOFx1NTE5OVx1NEUzQSBgJydgXHVGRjA5XHVGRjBDV2luZG93cyBcdTUzQ0RcdTY1OUNcdTY3NjBcdThERUZcdTVGODRcdTRFMERcdTUzRDdcdTUzQ0NcdTVGMTVcdTUzRjdcdThGNkNcdTRFNDlcdTVGNzFcdTU0Q0RcdTMwMDJcbiAqL1xuZnVuY3Rpb24geWFtbFNjYWxhcihwOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCcke3AucmVwbGFjZSgvJy9nLCBcIicnXCIpfSdgXG59XG5cbi8qKlxuICogcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NEUwQlx1NzY4NFwiXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXCJcdUZGMUFcdTYyOEFcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1OTE0RFx1N0Y2RVx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQiBgfi8uZHNoYFx1RkYwQ1xuICogXHU1M0VBXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREXHU2NTcwXHU2MzZFXHUzMDAyXG4gKlxuICogXHU1MzlGXHU3NDA2XHVGRjFBZHNoIFx1NzY4NCBgc2V0dGluZ3NgXHVGRjA4QGRlZXBzZWVrLWFpL2RzaC1zZXR0aW5ncy1maWxlXHVGRjA5XHU0RTBFIGBjcmVkZW50aWFsc2BcbiAqIFx1RkYwOEBkZWVwc2Vlay1haS9kc2gtY3JlZGVudGlhbHMtbG9jYWxcdUZGMDlcdTYzRDJcdTRFRjZcdTkwRkRcdTY1MkZcdTYzMDEgYHBhdGhgIFx1ODk4Nlx1NzZENlx1RkYwQ1x1OUVEOFx1OEJBNFx1OERFRlx1NUY4NFx1NjYyRlxuICogYDxkc2hIb21lPi9zZXR0aW5ncy55YW1sYCAvIGA8ZHNoSG9tZT4vLmNyZWRlbnRpYWxzLnlhbWxgXHUzMDAyXHU1NzI4XHU1MTcxXHU0RUFCIHByb2ZpbGVcbiAqIFx1NzY4NCBgY29yZGlzLnBhdGNoLnltbGAgXHU5MUNDXHU2MjhBXHU4RkQ5XHU0RTI0XHU0RTJBXHU2M0QyXHU0RUY2XHU2MzA3XHU1NDExXHU1MTcxXHU0RUFCXHU2ODM5XHU3Njg0XHU2NTg3XHU0RUY2XHVGRjBDXHU2QTIxXHU1NzhCXHU5MDA5XHU2MkU5XHUzMDAxQVBJIFx1NUJDNlx1OTRBNVx1MzAwMVxuICogXHU0RTNCXHU5ODk4XHU3QjQ5XHU5MTREXHU0RTAwXHU2QjIxXHVGRjA4XHU1NzI4XHU0RUZCXHU2MTBGIHZhdWx0IFx1NzY4NCBEU0ggXHU5NzYyXHU2NzdGXHU2MjE2XHU3NkY0XHU2M0E1XHU2NTM5IH4vLmRzaFx1RkYwOVx1NTM3M1x1NTNFRlx1NTE2OCB2YXVsdCBcdTc1MUZcdTY1NDhcdTMwMDJcbiAqIFx1NkNFOFx1NjEwRlx1RkYxQXByb2ZpbGVzIFx1NURGMlx1OEY2Rlx1OTRGRVx1NTE3MVx1NEVBQlx1RkYwQ1x1NjI0MFx1NEVFNVx1OEZEOVx1OTFDQ1x1NTE5OVx1NTE2NVx1NzY4NFx1NkI2M1x1NjYyRlx1NTE3MVx1NEVBQiBwYXRjaCBcdTIwMTRcdTIwMTQgXHU3NTI4XHU2MjM3XHU4MUVBXHU4OEM1XHU3Njg0XG4gKiBcdTYzRDJcdTRFRjZcdTY3NjFcdTc2RUVcdUZGMDhpbnNlcnRcdUZGMDlcdTVGQzVcdTk4N0JcdTRGRERcdTc1NTlcdUZGMENcdTUzRUFcdTU0MDhcdTVFNzYvXHU2NkY0XHU2NUIwIHNldHRpbmdzL2NyZWRlbnRpYWxzIFx1NEUyNFx1NEUyQVx1Njc2MVx1NzZFRVx1MzAwMlxuICpcbiAqIHBhdGNoIFx1NjgzQ1x1NUYwRlx1RkYwOGNvcmRpcyBsb2FkZXIgXHU3Njg0IGFwcGx5RW50cnlQYXRjaGVzXHVGRjA5XHVGRjFBXHU1MjE3XHU4ODY4XHU5MUNDXHU2QkNGXHU0RTJBXHU1MTQzXHU3RDIwXHU3NkY0XHU2M0E1XHU2NjJGXG4gKiBgeyBpZCwgaW5zZXJ0PywgbmFtZT8sIC4uLm92ZXJyaWRlcyB9YFx1RkYwQ292ZXJyaWRlcyBcdTk1MkVcdTg5ODZcdTc2RDZcdTU0MENcdTU0MEQgdGFyZ2V0IFx1Njc2MVx1NzZFRVx1RkYwQ1xuICogXHU2Q0ExXHU2NzA5IGB1cGRhdGU6YCBcdTUzMDVcdTg4QzVcdTVDNDJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYXJlZENvbmZpZ1BhdGNoKGRzaEhvbWU6IHN0cmluZywgc2hhcmVkUm9vdDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghc2hhcmVkUm9vdCB8fCBkc2hIb21lID09PSBzaGFyZWRSb290KSByZXR1cm5cbiAgdHJ5IHtcbiAgICBjb25zdCBzaGFyZWRQcm9maWxlcyA9IHBhdGguam9pbihzaGFyZWRSb290LCAncHJvZmlsZXMnKVxuICAgIGNvbnN0IHBhdGNoRmlsZSA9IHBhdGguam9pbihzaGFyZWRQcm9maWxlcywgJ3dlYicsICdjb3JkaXMucGF0Y2gueW1sJylcbiAgICBjb25zdCBzZXR0aW5nc1BhdGggPSBwYXRoLmpvaW4oc2hhcmVkUm9vdCwgJ3NldHRpbmdzLnlhbWwnKVxuICAgIGNvbnN0IGNyZWRlbnRpYWxzUGF0aCA9IHBhdGguam9pbihzaGFyZWRSb290LCAnLmNyZWRlbnRpYWxzLnlhbWwnKVxuXG4gICAgY29uc3QgYmxvY2tTZXR0aW5ncyA9IGAtIGlkOiBzZXR0aW5nc1xuICBjb25maWc6XG4gICAgcGF0aDogJHt5YW1sU2NhbGFyKHNldHRpbmdzUGF0aCl9XG5gXG4gICAgY29uc3QgYmxvY2tDcmVkZW50aWFscyA9IGAtIGlkOiBjcmVkZW50aWFsc1xuICBjb25maWc6XG4gICAgcGF0aDogJHt5YW1sU2NhbGFyKGNyZWRlbnRpYWxzUGF0aCl9XG5gXG5cbiAgICBsZXQgY29udGVudCA9ICcnXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0Y2hGaWxlKSkge1xuICAgICAgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhwYXRjaEZpbGUsICd1dGY4JylcbiAgICB9XG4gICAgY29uc3Qgc3RyaXAgPSAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xccysvZywgJycpXG4gICAgY29uc3QgaGFzU2V0dGluZ3MgPSBzdHJpcChjb250ZW50KS5pbmNsdWRlcyhzdHJpcChibG9ja1NldHRpbmdzKSlcbiAgICBjb25zdCBoYXNDcmVkZW50aWFscyA9IHN0cmlwKGNvbnRlbnQpLmluY2x1ZGVzKHN0cmlwKGJsb2NrQ3JlZGVudGlhbHMpKVxuICAgIGlmIChoYXNTZXR0aW5ncyAmJiBoYXNDcmVkZW50aWFscykgcmV0dXJuXG5cbiAgICAvLyBcdTUzRUFcdTU3MjhcdTUxNzFcdTRFQUIgcGF0Y2ggXHU0RTNBXHU3QTdBXHU2NTcwXHU3RUM0IGBbXWBcdUZGMDhcdTUxNDFcdThCQjhcdTZDRThcdTkxQ0FcdUZGMENcdTYyMTZcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdUZGMDlcdTY1RjZcdTUxOTlcdTUxNjVcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcbiAgICAvLyBcdTY3NjFcdTc2RUVcdUZGMUJcdTgyRTVcdTc1MjhcdTYyMzdcdTVERjJcdTgxRUFcdTVCOUFcdTRFNDkgcGF0Y2hcdUZGMDhcdTU5ODJcdTgxRUFcdTg4QzVcdTYzRDJcdTRFRjZcdUZGMDlcdUZGMENcdTRFMERcdTVGM0FcdTg4NENcdTY1MzlcdTUxOTkgXHUyMDE0XHUyMDE0IFx1NjNEMFx1NzkzQVx1NjI0Qlx1NTJBOFx1NTJBMFx1MzAwMlxuICAgIGNvbnN0IHdpdGhvdXRDb21tZW50cyA9IGNvbnRlbnRcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5maWx0ZXIoKGwpID0+ICFsLnRyaW0oKS5zdGFydHNXaXRoKCcjJykpXG4gICAgICAuam9pbignXFxuJylcbiAgICAgIC50cmltKClcbiAgICBpZiAod2l0aG91dENvbW1lbnRzID09PSAnJyB8fCB3aXRob3V0Q29tbWVudHMgPT09ICdbXScpIHtcbiAgICAgICAgY29uc3QgaW5zZXJ0aW9uID0gYmxvY2tTZXR0aW5ncyArIGJsb2NrQ3JlZGVudGlhbHNcbiAgICAgICAgY29udGVudCA9IGAjIGRzaC1kb2NrIFx1ODFFQVx1NTJBOFx1N0VGNFx1NjJBNFx1RkYxQXBlci12YXVsdCBcdTkxNERcdTdGNkVcdTUxNzFcdTRFQUJcdUZGMDhcdTZBMjFcdTU3OEIvXHU1QkM2XHU5NEE1L1x1NEUzQlx1OTg5OFx1NjMwN1x1NTQxMVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMENcdTRGMUFcdThCRERcdTRFQ0RcdTk2OTRcdTc5QkJcdUZGMDlcbiR7aW5zZXJ0aW9uLnRyaW1FbmQoKX1cbmBcbiAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShwYXRjaEZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGNoRmlsZSwgY29udGVudClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnW2RzaC1ob3N0XSBcdTUxNzFcdTRFQUIgY29yZGlzLnBhdGNoLnltbCBcdTVERjJcdTY3MDlcdTgxRUFcdTVCOUFcdTRFNDlcdTUxODVcdTVCQjlcdUZGMENcdThERjNcdThGQzdcdTgxRUFcdTUyQThcdTUxOTlcdTUxNjVcdUZGMUInICtcbiAgICAgICAgICAnXHU1OTgyXHU5NzAwXHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCXHVGRjBDXHU4QkY3XHU1NzI4IH4vLmRzaC9wcm9maWxlcy93ZWIvY29yZGlzLnBhdGNoLnltbCBcdTYyNEJcdTUyQThcdTUyQTBcdTUxNjUgc2V0dGluZ3MvY3JlZGVudGlhbHMgXHU3Njg0IHBhdGggXHU4OTg2XHU3NkQ2JyxcbiAgICAgICAgKVxuICAgICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tkc2gtaG9zdF0gXHU1MTk5XHU1MTY1XHU5MTREXHU3RjZFXHU1MTcxXHU0RUFCIHBhdGNoIFx1NTkzMVx1OEQyNVx1RkYwOFx1NUMwNlx1NjMwOSBwZXItdmF1bHQgXHU3MkVDXHU3QUNCXHU5MTREXHU3RjZFXHU1NDJGXHU1MkE4XHVGRjA5JywgZXJyKVxuICB9XG59XG5cbi8qKiBcdTU0MkZcdTUyQThcdTVCOThcdTY1QjkgZHNoIHdlYlx1MzAwMlx1OEMwM1x1NzUyOFx1NjVCOVx1OEQxRlx1OEQyM1x1NzZEMVx1NTQyQyBwcm9jIFx1NzY4NCBleGl0L2Vycm9yXHUzMDAyICovXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoRHNoKG9wdHM6IExhdW5jaE9wdGlvbnMgJiB7IGRzaEJpbjogc3RyaW5nOyBub2RlQmluOiBzdHJpbmc7IHVzZUVsZWN0cm9uQXNOb2RlOiBib29sZWFuIH0pOiBDaGlsZFByb2Nlc3Mge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICAvLyAtLW5vLW9wZW5cdUZGMUFkc2ggQ0xJIFx1OUVEOFx1OEJBNFx1NEYxQVx1NjI1M1x1NUYwMFx1N0NGQlx1N0VERlx1OUVEOFx1OEJBNFx1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOFx1OTc2Mlx1Njc3Rlx1NTczQVx1NjY2Rlx1NEUwQlx1NjYyRlwiXHU1MkFCXHU2MzAxXCJcdUZGMDlcdTMwMDJcbiAgLy8gXHU2M0QyXHU0RUY2XHU0RkE3XHU3Njg0XHU5NzYyXHU2NzdGXHU1QzMxXHU2NjJGIFVJXHVGRjFCXHU5NzAwXHU4OTgxXHU2RDRGXHU4OUM4XHU1NjY4XHU2NUY2XHU4RDcwXHU2NjNFXHU1RjBGXHU3Njg0XCJcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDBcIlxuICAvLyBcdTUyQThcdTRGNUNcdUZGMDhzaGVsbC5vcGVuRXh0ZXJuYWxcdUZGMDlcdTMwMDJcbiAgY29uc3QgYXJncyA9IFtvcHRzLmRzaEJpbiwgJ3dlYicsICctLWhvc3QnLCBob3N0LCAnLS1wb3J0JywgU3RyaW5nKHBvcnQpLCAnLS1uby1vcGVuJ11cbiAgLy8gb3B0cy5lbnYgXHU2NjJGXHUzMDBDXHU5NjQ0XHU1MkEwXHUzMDBEXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGXHVGRjBDXHU1M0VGXHU4MEZEXHU0RTNBXHU3QTdBXHU1QkY5XHU4QzYxIHt9XHVGRjA4bWFpbi50cyBcdTU3Mjggc2hhcmVkL2N1c3RvbSBcdTZBMjFcdTVGMEZcbiAgLy8gXHU0RjIwXHU1MTY1IHt9XHVGRjA5XHUyMDE0XHUyMDE0XHU3RUREXHU0RTBEXHU4MEZEXHU2NTc0XHU0RjUzXHU2NkZGXHU2MzYyIHByb2Nlc3MuZW52XHVGRjBDXHU1NDI2XHU1MjE5XHU1QjUwXHU4RkRCXHU3QTBCXHU0RTIyXHU1OTMxIFBBVEgvSE9NRSBcdTdCNDlcdTUxNjhcdTkwRThcbiAgLy8gXHU3M0FGXHU1ODgzXHVGRjFBZHNoIHdlYiBcdTUxODVcdTkwRTggc3Bhd24gXHU3Njg0XHU2RDRGXHU4OUM4XHU1NjY4IG9wZW5lciAvIGdpdCAvIHBucG0gXHU3QjQ5XHU0RjFBIEVOT0VOVFx1RkYwQ1xuICAvLyBIT01FIFx1NzZGOFx1NTE3M1x1NzY4NFx1NTFFRFx1NjM2RVx1NEUwRSBrZXlyaW5nIFx1ODlFM1x1Njc5MFx1NEU1Rlx1NEYxQVx1OEQ3MFx1NjgzN1x1MzAwMlx1NUZDNVx1OTg3Qlx1NTNFMFx1NTJBMFx1NTcyOCBwcm9jZXNzLmVudiBcdTRFNEJcdTRFMEFcdTMwMDJcbiAgY29uc3QgZW52OiBOb2RlSlMuUHJvY2Vzc0VudiA9IHtcbiAgICAuLi5wcm9jZXNzLmVudixcbiAgICAuLi5vcHRzLmVudixcbiAgICBEU0hfSE9NRTogb3B0cy5kc2hIb21lLFxuICB9XG4gIGlmIChvcHRzLnVzZUVsZWN0cm9uQXNOb2RlKSBlbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSdcbiAgY29uc3QgcHJvYyA9IHNwYXduKG9wdHMubm9kZUJpbiwgYXJncywge1xuICAgIGVudixcbiAgICBjd2Q6IG9wdHMuY3dkLFxuICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXSxcbiAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgfSlcbiAgLy8gc3Rkb3V0IFx1N0JBMVx1OTA1M1x1NkNBMVx1NjcwOVx1NkQ4OFx1OEQzOVx1ODAwNVx1NEYxQVx1NjI4QVx1NjVFNVx1NUZEN1x1NzlFRlx1NTcyOFx1NTE4NVx1NUI1OFx1N0YxM1x1NTFCMlx1OTFDQ1x1RkYxQlx1NjVFNVx1NUZEN1x1OEQ3MCBzdGRlcnJcdUZGMDhtYWluLnRzXG4gIC8vIGhvb2tDaGlsZExvZ3MgXHU1REYyXHU2M0E1XHVGRjA5XHVGRjBDc3Rkb3V0IFx1NzZGNFx1NjNBNVx1NjUzRVx1N0E3QVx1MzAwMlxuICBwcm9jLnN0ZG91dD8ucmVzdW1lKClcbiAgcmV0dXJuIHByb2Ncbn1cblxuLyoqXG4gKiBcdTdBRUZcdTUzRTNcdTVERjJcdTY3MDlcdTY3MERcdTUyQTFcdTY1RjZcdTUxQjNcdTVCOUFcIlx1NjMwMlx1NjNBNSBvciBcdTYyQTVcdTk1MTlcIlx1RkYxQVxuICogLSBcdTY3MkFcdTZDRThcdTUxNjUgdmVyaWZ5QnJhbmRcdUZGMUFcdTc2RjRcdTYzQTVcdTYzMDJcdTYzQTVcdUZGMDhcdTY1RTdcdTg4NENcdTRFM0FcdUZGMDlcdUZGMUJcbiAqIC0gXHU2Q0U4XHU1MTY1XHU0RTE0XHU2ODIxXHU5QThDXHU5MDFBXHU4RkM3XHVGRjFBXHU2MzAyXHU2M0E1XHVGRjFCXG4gKiAtIFx1NkNFOFx1NTE2NVx1NEY0Nlx1NjgyMVx1OUE4Q1x1NTkzMVx1OEQyNS9cdTVGMDJcdTVFMzhcdUZGMUFcdTYzMDlcdTMwMENcdTdBRUZcdTUzRTNcdTg4QUJcdTk3NUUgRFNIIFx1NjcwRFx1NTJBMVx1NTM2MFx1NzUyOFx1MzAwRFx1OEZENFx1NTZERSBlcnJvclx1MzAwMlxuICovXG5hc3luYyBmdW5jdGlvbiBhdHRhY2hTdGF0dXMoXG4gIG9wdHM6IExhdW5jaE9wdGlvbnMsXG4gIGhvc3Q6IHN0cmluZyxcbiAgcG9ydDogbnVtYmVyLFxuICB1cmw6IHN0cmluZyxcbik6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XG4gIGlmICghb3B0cy52ZXJpZnlCcmFuZCkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdydW5uaW5nJywgcG9ydCwgaG9zdCwgdXJsLCBhdHRhY2hlZDogdHJ1ZSB9XG4gIH1cbiAgbGV0IGlzQnJhbmQgPSBmYWxzZVxuICB0cnkge1xuICAgIGlzQnJhbmQgPSBhd2FpdCBvcHRzLnZlcmlmeUJyYW5kKHVybClcbiAgfSBjYXRjaCB7XG4gICAgaXNCcmFuZCA9IGZhbHNlXG4gIH1cbiAgaWYgKGlzQnJhbmQpIHtcbiAgICByZXR1cm4geyBraW5kOiAncnVubmluZycsIHBvcnQsIGhvc3QsIHVybCwgYXR0YWNoZWQ6IHRydWUgfVxuICB9XG4gIHJldHVybiB7XG4gICAga2luZDogJ2Vycm9yJyxcbiAgICBtZXNzYWdlOiBgXHU3QUVGXHU1M0UzICR7cG9ydH0gXHU1REYyXHU4OEFCXHU5NzVFIERTSCBcdTY3MERcdTUyQTFcdTUzNjBcdTc1MjhcdUZGMDhcdTU0QzFcdTcyNENcdTcyNzlcdTVGODFcdTY4MjFcdTlBOENcdTY3MkFcdTkwMUFcdThGQzdcdUZGMDlcdTMwMDJcdThCRjdcdTYzNjJcdTRFMDBcdTRFMkFcdTdBRUZcdTUzRTNcdUZGMENcdTYyMTZcdTUxNDhcdTUwNUNcdTYzODlcdTUzNjBcdTc1MjhcdThCRTVcdTdBRUZcdTUzRTNcdTc2ODRcdTY3MERcdTUyQTFgLFxuICB9XG59XG5cbi8qKlxuICogXHU0RTAwXHU5NTJFXCJcdTc4NkVcdTRGRERcdThGRDBcdTg4NENcIlx1RkYxQVxuICogMS4gXHU3QUVGXHU1M0UzXHU1REYyXHU2NzA5XHU2NzBEXHU1MkExIFx1MjE5MiBcdTU0QzFcdTcyNENcdTY4MjFcdTlBOENcdUZGMDhcdTUzRUZcdTkwMDlcdUZGMDlcdTIxOTIgXHU5MDFBXHU4RkM3XHU1MjE5XHU2MzAyXHU2M0E1XHVGRjA4YXR0YWNoZWRcdUZGMENcdTRFMERcdTY1QjBcdThENzdcdThGREJcdTdBMEJcdUZGMDlcdUZGMENcbiAqICAgIFx1NTQyNlx1NTIxOVx1NjMwOVx1MzAwQ1x1N0FFRlx1NTNFM1x1ODhBQlx1OTc1RSBEU0ggXHU2NzBEXHU1MkExXHU1MzYwXHU3NTI4XHUzMDBEXHU2MkE1XHU5NTE5XHVGRjBDXHU3RUREXHU0RTBEXHU4QkVGXHU2MzAyXHVGRjFCXG4gKiAyLiBcdTU0MjZcdTUyMTlcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTkwMDlcdTYyRTkgTm9kZSBcdTIxOTIgc3Bhd24gXHUyMTkyIFx1N0I0OVx1NUY4NVx1NUMzMVx1N0VFQVx1RkYxQlxuICogMy4gXHU1QjUwXHU4RkRCXHU3QTBCXHU3OUQyXHU5MDAwXHVGRjA4XHU1OTgyXHU3QUVGXHU1M0UzXHU4OEFCXHU1MzYwIEVBRERSSU5VU0VcdUZGMDlcdTIxOTIgXHU3QUNCXHU1MzczXHU4RkQ0XHU1NkRFXHU3NzFGXHU1QjlFXHU5NTE5XHU4QkVGXHVGRjBDXHU0RTBEXHU1MThEXHU3NkYyXHU3QjQ5XHUzMDAyXG4gKiBcdThGRDRcdTU2REUgU2VydmVyU3RhdHVzXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEc2hSdW5uaW5nKG9wdHM6IExhdW5jaE9wdGlvbnMpOiBQcm9taXNlPHsgc3RhdHVzOiBTZXJ2ZXJTdGF0dXM7IHByb2M/OiBDaGlsZFByb2Nlc3MgfT4ge1xuICBjb25zdCBwb3J0ID0gb3B0cy5wb3J0ID8/IDMwODBcbiAgY29uc3QgaG9zdCA9IG9wdHMuaG9zdCA/PyAnMTI3LjAuMC4xJ1xuICBjb25zdCB1cmwgPSBgaHR0cDovLyR7aG9zdH06JHtwb3J0fS9gXG5cbiAgaWYgKGF3YWl0IGlzUG9ydFVwKGhvc3QsIHBvcnQpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBhd2FpdCBhdHRhY2hTdGF0dXMob3B0cywgaG9zdCwgcG9ydCwgdXJsKSB9XG4gIH1cblxuICBjb25zdCBmb3VuZCA9IHJlc29sdmVEc2hCaW4ob3B0cy5kc2hCaW4pXG4gIGlmICghZm91bmQuYmluKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiB7IGtpbmQ6ICdlcnJvcicsIG1lc3NhZ2U6IGZvdW5kLm5vdGVzW2ZvdW5kLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgZHNoIENMSScgfSB9XG4gIH1cbiAgY29uc3Qgbm9kZSA9IHJlc29sdmVOb2RlQmluKG9wdHMubm9kZUJpbiwgZW1iZWRkZWROb2RlVmVyc2lvbigpLCBvcHRzLnVzZUVtYmVkZGVkTm9kZSlcbiAgaWYgKCFub2RlLm5vZGVCaW4pIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogbm9kZS5ub3Rlc1tub2RlLm5vdGVzLmxlbmd0aCAtIDFdID8/ICdcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNEQgTm9kZSBcdThGRDBcdTg4NENcdTY1RjYnIH0gfVxuICB9XG4gIC8vIHBlci12YXVsdCBcdTUxNzFcdTRFQUJcdUZGMUFwcm9maWxlc1x1RkYwOFx1OEZEMFx1ODg0Q1x1NjVGNlx1NjNEMlx1NEVGNlx1RkYwOVx1OEY2Rlx1OTRGRVx1NTIzMFx1NTE3MVx1NEVBQlx1NjgzOVx1RkYwQ3NldHRpbmdzL2NyZWRlbnRpYWxzXG4gIC8vIFx1NjMwN1x1NTZERVx1NTE3MVx1NEVBQlx1NjgzOSBcdTIwMTRcdTIwMTQgXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU1MTY4XHU1QzQwXHU0RTAwXHU0RUZEXHVGRjBDXHU0RUM1XHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCXHUzMDAyXG4gIGlmIChvcHRzLnNoYXJlZENvbmZpZ1Jvb3QpIHtcbiAgICBlbnN1cmVTaGFyZWRQcm9maWxlcyhvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgICBlbnN1cmVTaGFyZWRDb25maWdQYXRjaChvcHRzLmRzaEhvbWUsIG9wdHMuc2hhcmVkQ29uZmlnUm9vdClcbiAgfVxuICBjb25zdCBwcm9jID0gbGF1bmNoRHNoKHsgLi4ub3B0cywgZHNoQmluOiBmb3VuZC5iaW4sIG5vZGVCaW46IG5vZGUubm9kZUJpbiwgdXNlRWxlY3Ryb25Bc05vZGU6IG5vZGUudXNlRWxlY3Ryb25Bc05vZGUgfSlcblxuICAvLyBcdTY1MzZcdTk2QzYgc3RkZXJyIFx1NUMzRVx1OTBFOFx1RkYxQVx1NUI1MFx1OEZEQlx1N0EwQlx1NzlEMlx1OTAwMFx1NjVGNlx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1NTM5Rlx1NTZFMFx1RkYwOFx1NTk4MiBFQUREUklOVVNFXHVGRjA5XG4gIGxldCBzdGRlcnJUYWlsID0gJydcbiAgcHJvYy5zdGRlcnI/Lm9uKCdkYXRhJywgKGQ6IEJ1ZmZlcikgPT4ge1xuICAgIHN0ZGVyclRhaWwgPSAoc3RkZXJyVGFpbCArIGQudG9TdHJpbmcoKSkuc2xpY2UoLTQwMDApXG4gIH0pXG5cbiAgLy8gc3Bhd24gXHU1QzQyXHU5NzYyXHU3Njg0XHU5NTE5XHU4QkVGXHVGRjA4RU5PRU5UIC8gRUFDQ0VTIC8gXHU2NzQzXHU5NjUwXHU3QjQ5XHVGRjA5XHU0RTBEXHU0RUE3XHU3NTFGIHN0ZGVyciBcdThGOTNcdTUxRkFcdUZGMENcdTUzRUFcdTU3MjhcbiAgLy8gJ2Vycm9yJyBcdTRFOEJcdTRFRjZcdTkxQ0NcdTVFMjZcdTUxRkFcdTY3NjVcdTIwMTRcdTIwMTRcdTY1MzZcdTk2QzZcdThENzdcdTY3NjVcdUZGMENcdTkwN0ZcdTUxNERcdTc1MjhcdTYyMzdcdTUzRUFcdTc3MEJcdTUyMzBcdTZDREJcdTUzMTZcdTc2ODRcdTMwMENcdThGREJcdTdBMEJcdTkwMDBcdTUxRkFcdTMwMERcdTMwMDJcbiAgbGV0IHNwYXduRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkXG4gIGNvbnN0IGNoaWxkRGllZCA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXNvbHZlKSA9PiB7XG4gICAgcHJvYy5vbmNlKCdleGl0JywgKCkgPT4gcmVzb2x2ZSh0cnVlKSlcbiAgICBwcm9jLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgc3Bhd25FcnJvciA9IGVyclxuICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgIH0pXG4gIH0pXG5cbiAgY29uc3QgcmVhZHkgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgIHdhaXRGb3JSZWFkeShob3N0LCBwb3J0LCBvcHRzLnRpbWVvdXRNcyA/PyAxMjBfMDAwKS50aGVuKCgpID0+IHRydWUpLFxuICAgIGNoaWxkRGllZC50aGVuKCgpID0+IGZhbHNlKSxcbiAgXSlcblxuICBpZiAocmVhZHkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ3J1bm5pbmcnLCBwb3J0LCBob3N0LCB1cmwsIGF0dGFjaGVkOiBmYWxzZSB9LCBwcm9jIH1cbiAgfVxuXG4gIC8vIFx1NUI1MFx1OEZEQlx1N0EwQlx1NURGMlx1OTAwMFx1NTFGQVx1RkYxQVx1NTE4RFx1NjNBMlx1NEUwMFx1NkIyMVx1N0FFRlx1NTNFM1x1RkYwOFx1NTNFRlx1ODBGRFx1ODhBQlx1NTIyQlx1NzY4NFx1NUI5RVx1NEY4Qlx1NjJBMlx1OEREMVx1N0VEMVx1NUI5QVx1RkYwOVx1RkYwQ1x1NTQyNlx1NTIxOVx1N0VEOVx1NTFGQVx1NzcxRlx1NUI5RVx1OTUxOVx1OEJFRlxuICBpZiAoYXdhaXQgaXNQb3J0VXAoaG9zdCwgcG9ydCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IGF3YWl0IGF0dGFjaFN0YXR1cyhvcHRzLCBob3N0LCBwb3J0LCB1cmwpLCBwcm9jIH1cbiAgfVxuICByZXR1cm4geyBzdGF0dXM6IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogc3VtbWFyaXplQ2hpbGRFcnJvcihzdGRlcnJUYWlsLCBzcGF3bkVycm9yKSB9LCBwcm9jIH1cbn1cblxuLyoqIFx1NEVDRSBzdGRlcnIgXHU1QzNFXHU5MEU4IC8gc3Bhd24gZXJyb3IgXHU2M0QwXHU3MEJDXHU1M0VGXHU4QkZCXHU5NTE5XHU4QkVGICovXG5mdW5jdGlvbiBzdW1tYXJpemVDaGlsZEVycm9yKHN0ZGVyclRhaWw6IHN0cmluZywgc3Bhd25FcnJvcj86IEVycm9yKTogc3RyaW5nIHtcbiAgaWYgKHNwYXduRXJyb3IpIHtcbiAgICBjb25zdCBjb2RlID0gKHNwYXduRXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlXG4gICAgaWYgKGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gJ1x1NjVFMFx1NkNENVx1NTQyRlx1NTJBOCBkc2ggXHU1QjUwXHU4RkRCXHU3QTBCXHVGRjA4RU5PRU5UXHVGRjA5XHVGRjFBTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdTYyMTZcdTRFMERcdTUzRUZcdTYyNjdcdTg4NENcdTMwMDJcdThCRjdcdTU3MjhcdThCQkVcdTdGNkVcdTkxQ0NcdTY4QzBcdTY3RTUgTm9kZSBcdThERUZcdTVGODRcdUZGMENcdTYyMTZcdTkxQ0RcdTY1QjBcdTVCODlcdTg4QzUgTm9kZSdcbiAgICB9XG4gICAgaWYgKGNvZGUgPT09ICdFQUNDRVMnKSB7XG4gICAgICByZXR1cm4gJ1x1NjVFMFx1NkNENVx1NTQyRlx1NTJBOCBkc2ggXHU1QjUwXHU4RkRCXHU3QTBCXHVGRjA4RUFDQ0VTXHVGRjA5XHVGRjFBTm9kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdTZDQTFcdTY3MDlcdTYyNjdcdTg4NENcdTY3NDNcdTk2NTBcdUZGMENcdThCRjdcdTY4QzBcdTY3RTVcdTY1ODdcdTRFRjZcdTY3NDNcdTk2NTAnXG4gICAgfVxuICAgIHJldHVybiBgXHU2NUUwXHU2Q0Q1XHU1NDJGXHU1MkE4IGRzaCBcdTVCNTBcdThGREJcdTdBMEI6ICR7c3Bhd25FcnJvci5tZXNzYWdlfWBcbiAgfVxuICBjb25zdCBsaW5lcyA9IHN0ZGVyclRhaWwuc3BsaXQoL1xccj9cXG4vKS5maWx0ZXIoQm9vbGVhbilcbiAgY29uc3QgYWRkckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFQUREUklOVVNFJykpXG4gIGNvbnN0IGVyckxpbmUgPSBsaW5lcy5maW5kKChsKSA9PiBsLmluY2x1ZGVzKCdFcnJvcjonKSlcbiAgaWYgKGFkZHJMaW5lKSB7XG4gICAgcmV0dXJuICdcdTdBRUZcdTUzRTNcdTVERjJcdTg4QUJcdTUzNjBcdTc1MjhcdUZGMDhFQUREUklOVVNFXHVGRjA5XHUzMDAyXHU4QkY3XHU2MzYyXHU0RTAwXHU0RTJBXHU3QUVGXHU1M0UzXHVGRjBDXHU2MjE2XHU1MTQ4XHU1MDVDXHU2Mzg5XHU1MzYwXHU3NTI4XHU4QkU1XHU3QUVGXHU1M0UzXHU3Njg0XHU2NzBEXHU1MkExXHU1NDBFXHU5MUNEXHU4QkQ1J1xuICB9XG4gIGlmIChlcnJMaW5lKSB7XG4gICAgY29uc3QgY2xlYW5lZCA9IGVyckxpbmUudHJpbSgpLnNsaWNlKDAsIDMwMClcbiAgICByZXR1cm4gYGRzaCBcdTU0MkZcdTUyQThcdTU5MzFcdThEMjU6ICR7Y2xlYW5lZH1gXG4gIH1cbiAgcmV0dXJuICdEU0ggXHU4RkRCXHU3QTBCXHU5MDAwXHU1MUZBXHVGRjA4XHU2NUUwXHU4QkU2XHU3RUM2XHU5NTE5XHU4QkVGXHVGRjA5XHUzMDAyXHU4QkY3XHU2N0U1XHU3NzBCIE9ic2lkaWFuIFx1NjNBN1x1NTIzNlx1NTNGMCBbZHNoXSBcdTY1RTVcdTVGRDcnXG59XG5cbi8qKiBcdTUwNUNcdTZCNjJcdTVCNTBcdThGREJcdTdBMEJcdUZGMDhTSUdURVJNXHVGRjBDXHU3QjQ5XHU1Rjg1XHU5MDAwXHU1MUZBXHVGRjFCXHU4RDg1XHU2NUY2XHU1NDBFIFNJR0tJTExcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wUHJvY2Vzcyhwcm9jOiBDaGlsZFByb2Nlc3MgfCBudWxsIHwgdW5kZWZpbmVkLCB0aW1lb3V0TXMgPSA1MDAwKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghcHJvYyB8fCBwcm9jLmV4aXRDb2RlICE9PSBudWxsIHx8IHByb2Muc2lnbmFsQ29kZSAhPT0gbnVsbCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRpbWVyID0gZ2xvYmFsVGhpcy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Mua2lsbCgnU0lHS0lMTCcpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgfSwgdGltZW91dE1zKVxuICAgIHByb2Mub25jZSgnZXhpdCcsICgpID0+IHtcbiAgICAgIGdsb2JhbFRoaXMuY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfSlcbiAgICB0cnkge1xuICAgICAgcHJvYy5raWxsKCdTSUdURVJNJylcbiAgICB9IGNhdGNoIHtcbiAgICAgIGdsb2JhbFRoaXMuY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuICB9KVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFx1NUI2NFx1NTEzRlx1OEZEQlx1N0EwQlx1NkUwNVx1NjI2Qlx1RkYwOFBJRCBcdTY1ODdcdTRFRjYgKyBcdTU0N0RcdTRFRTRcdTg4NENcdThFQUJcdTRFRkRcdTY4MjFcdTlBOEMgKyBQUElEIFx1NTIyNFx1NUI5QVx1RkYwOVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vL1xuLy8gXHU4MENDXHU2NjZGXHVGRjFBT2JzaWRpYW4gXHU1RDI5XHU2RTgzL1x1NUYzQVx1OTAwMFx1NjVGNiBvbnVubG9hZCBcdTRFMERcdTRGMUFcdTYyNjdcdTg4NENcdUZGMENcdTYzRDJcdTRFRjYgc3Bhd24gXHU3Njg0IGBkc2ggd2ViYFxuLy8gXHU1QjUwXHU4RkRCXHU3QTBCXHU0RjFBXHU1M0Q4XHU2MjEwXHU1QjY0XHU1MTNGXHVGRjA4bWFjT1MvTGludXggXHU0RTBCXHU4OEFCIHJlcGFyZW50IFx1NTIzMCBsYXVuY2hkXHVGRjBDcHBpZD0xXHVGRjA5XHVGRjBDXHU0RTE0XHU2NUU3XHU3MjQ4XG4vLyBcdTYzRDJcdTRFRjZcIlx1N0FFRlx1NTNFM1x1NjcwOVx1NjcwRFx1NTJBMVx1NUMzMVx1NjMwMlx1NjNBNVwiXHU0RjFBXHU2MjhBXHU1QjY0XHU1MTNGXHU2QzM4XHU0RTQ1XHU0RkREXHU3NTU5XHUzMDAyXHU2NzJDXHU2QTIxXHU1NzU3XHU1NzI4XHU2QkNGXHU2QjIxXHU1NDJGXHU1MkE4XHU1MjREXHU2RTA1XHU2MjZCXHU2NzJDXHU1RTkzXHU3QUVGXHU1M0UzXG4vLyBcdTRFMEFcdTc2ODRcdTVCNjRcdTUxM0ZcdUZGMUFcdTUxNDggU0lHVEVSTVx1MzAwMVx1OEQ4NVx1NjVGNiBTSUdLSUxMXHVGRjBDXHU1MThEXHU3NTMxXHU4QzAzXHU3NTI4XHU2NUI5XHU5MUNEXHU2NUIwIHNwYXduXHUzMDAyXG4vL1xuLy8gXHU1Qjg5XHU1MTY4XHU4QkJFXHU4QkExXHVGRjA4XHU1OTFBXHU1RTkzL1x1NTkxQVx1N0E5N1x1NTNFM1x1NUU3Nlx1NTNEMVx1NUI4OVx1NTE2OFx1RkYwOVx1RkYxQVxuLy8gLSBcdTUzRUFcdTUyQThcIlx1NjcyQ1x1NUU5M1x1NkQzRVx1NzUxRlx1N0FFRlx1NTNFM1wiXHU0RTBBXHU3Njg0XHU2NzBEXHU1MkExXHVGRjBDXHU3RUREXHU0RTBEXHU3OEIwXHU1MTc2XHU0RUQ2XHU1RTkzXHU3Njg0XHU3QUVGXHU1M0UzXHVGRjFCXG4vLyAtIFx1NTNFQVx1Njc0MFwiXHU3ODZFXHU1QjlFXHU2NjJGIGRzaCB3ZWIgXHU0RTE0XHU3NkQxXHU1NDJDXHU2NzJDXHU3QUVGXHU1M0UzXCJcdTc2ODRcdThGREJcdTdBMEJcdUZGMDhcdTU0N0RcdTRFRTRcdTg4NENcdThFQUJcdTRFRkRcdTY4MjFcdTlBOENcdUZGMENcdTk2MzIgcGlkIFx1NTkwRFx1NzUyOFx1OEJFRlx1Njc0MFx1RkYwOVx1RkYxQlxuLy8gLSBcdTUzRUFcdTY3NDBcdTVCNjRcdTUxM0ZcdUZGMDhQT1NJWDogcHBpZD09MVx1RkYxQldpbmRvd3M6IFx1NTQyRlx1NTJBOFx1NjVGNlx1OTVGNFx1NjVFOVx1NEU4RVx1NjcyQ1x1NkIyMVx1NEYxQVx1OEJERFx1RkYwOVx1RkYwQ1xuLy8gICBcdTVGNTNcdTUyNERcdTRGMUFcdThCRERcdTkxQ0NcdTUxNzZcdTRFRDZcdTdBOTdcdTUzRTNcdTYyQzlcdThENzdcdTc2ODRcdTZEM0JcdTY3MERcdTUyQTFcdTdFRERcdTRFMERcdTRGMUFcdTg4QUJcdThCRUZcdTY3NDBcdTMwMDJcblxuZXhwb3J0IGludGVyZmFjZSBEc2hQaWRSZWNvcmQge1xuICBwaWQ6IG51bWJlclxuICBwb3J0OiBudW1iZXJcbiAgdHM6IG51bWJlclxufVxuXG4vKiogUElEIFx1NjU4N1x1NEVGNlx1OERFRlx1NUY4NFx1RkYxQVx1NjUzRVx1NTcyOCBwZXItdmF1bHQgXHU3Njg0IERTSF9IT01FIFx1OTFDQ1x1RkYwQ1x1OTY4Rlx1NUU5M1x1OTY5NFx1NzlCQlx1MzAwMVx1OTY4Rlx1NEYxQVx1OEJERFx1NUY1Mlx1NUM1RSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRzaFBpZEZpbGVQYXRoKGRzaEhvbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4oZHNoSG9tZSwgJy5kc2gtZG9jay5waWQnKVxufVxuXG4vKiogXHU4QkIwXHU1RjU1XHU2NzJDXHU2QjIxIHNwYXduIFx1NzY4NFx1NUI1MFx1OEZEQlx1N0EwQlx1RkYwOFx1NjcwRFx1NTJBMVx1NUMzMVx1N0VFQVx1NTQwRVx1OEMwM1x1NzUyOFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRHNoUGlkRmlsZShkc2hIb21lOiBzdHJpbmcsIHBvcnQ6IG51bWJlciwgcGlkOiBudW1iZXIpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBmcy5ta2RpclN5bmMoZHNoSG9tZSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBmcy53cml0ZUZpbGVTeW5jKGRzaFBpZEZpbGVQYXRoKGRzaEhvbWUpLCBKU09OLnN0cmluZ2lmeSh7IHBpZCwgcG9ydCwgdHM6IERhdGUubm93KCkgfSkpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignW2RzaC1kb2NrXSBcdTUxOTlcdTUxNjUgUElEIFx1NjU4N1x1NEVGNlx1NTkzMVx1OEQyNScsIGVycilcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZERzaFBpZEZpbGUoZHNoSG9tZTogc3RyaW5nKTogRHNoUGlkUmVjb3JkIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gZnMucmVhZEZpbGVTeW5jKGRzaFBpZEZpbGVQYXRoKGRzaEhvbWUpLCAndXRmOCcpXG4gICAgY29uc3QgcmVjID0gSlNPTi5wYXJzZShyYXcpIGFzIFBhcnRpYWw8RHNoUGlkUmVjb3JkPlxuICAgIGlmICh0eXBlb2YgcmVjLnBpZCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHJlYy5wb3J0ID09PSAnbnVtYmVyJykgcmV0dXJuIHJlYyBhcyBEc2hQaWRSZWNvcmRcbiAgfSBjYXRjaCB7XG4gICAgLyogXHU2NUUwXHU2NTg3XHU0RUY2XHU2MjE2XHU2MzVGXHU1NzRGIFx1MjE5MiBudWxsICovXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZURzaFBpZEZpbGUoZHNoSG9tZTogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgZnMudW5saW5rU3luYyhkc2hQaWRGaWxlUGF0aChkc2hIb21lKSlcbiAgfSBjYXRjaCB7XG4gICAgLyogaWdub3JlICovXG4gIH1cbn1cblxuLyoqIFx1OEZEQlx1N0EwQlx1NjYyRlx1NTQyNlx1NUI1OFx1NkQzQlx1RkYwOHNpZ25hbCAwIFx1NjNBMlx1NkQ0Qlx1RkYwQ1x1OERFOFx1NUU3M1x1NTNGMFx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJvY2Vzc0FsaXZlKHBpZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgcHJvY2Vzcy5raWxsKHBpZCwgMClcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKiogXHU4QkU1IHBpZCBcdTc2ODRcdThGREJcdTdBMEJcdTU0N0RcdTRFRTRcdTg4NENcdTY2MkZcdTU0MjZcdTVDMzFcdTY2MkZcdTc2RDFcdTU0MkMgPHBvcnQ+IFx1NzY4NCBkc2ggd2ViXHVGRjA4XHU5NjMyIHBpZCBcdTU5MERcdTc1MjhcdThCRUZcdTY3NDBcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RzaFdlYk9uUG9ydChwaWQ6IG51bWJlciwgcG9ydDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgIC8vIHdtaWMgXHU1NzI4IFdpbjEwIDIxSDErIFx1NUYwM1x1NzUyOFx1MzAwMVdpbjExIDI0SDIgXHU3OUZCXHU5NjY0XHVGRjFCXHU2MzYyIFBvd2VyU2hlbGwgQ0lNIFx1NjdFNVx1OEJFMlx1MzAwMlxuICAgICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKFxuICAgICAgICAncG93ZXJzaGVsbCcsXG4gICAgICAgIFsnLU5vUHJvZmlsZScsICctTm9uSW50ZXJhY3RpdmUnLCAnLUNvbW1hbmQnLCBgKEdldC1DaW1JbnN0YW5jZSBXaW4zMl9Qcm9jZXNzIC1GaWx0ZXIgXCJQcm9jZXNzSWQ9JHtwaWR9XCIpLkNvbW1hbmRMaW5lYF0sXG4gICAgICAgIHsgZW5jb2Rpbmc6ICd1dGY4JywgdGltZW91dDogNTAwMCwgd2luZG93c0hpZGU6IHRydWUgfSxcbiAgICAgIClcbiAgICAgIGNvbnN0IGNtZCA9IG91dC5zdGRvdXQgfHwgJydcbiAgICAgIHJldHVybiBjbWQuaW5jbHVkZXMoJ2RzaCcpICYmIGNtZC5pbmNsdWRlcyhgLS1wb3J0ICR7cG9ydH1gKVxuICAgIH1cbiAgICBjb25zdCBvdXQgPSBzcGF3blN5bmMoJ3BzJywgWyctd3cnLCAnLW8nLCAnY29tbWFuZD0nLCAnLXAnLCBTdHJpbmcocGlkKV0sIHtcbiAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgIH0pXG4gICAgY29uc3QgY21kID0gKG91dC5zdGRvdXQgfHwgJycpLnRyaW0oKVxuICAgIHJldHVybiBjbWQuaW5jbHVkZXMoJ2RzaCcpICYmIGNtZC5pbmNsdWRlcyhgLS1wb3J0ICR7cG9ydH1gKVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKiogUE9TSVg6IFx1OEJGQlx1NTNENlx1OEZEQlx1N0EwQlx1NzIzNiBwaWRcdUZGMUJcdTU5MzFcdThEMjVcdThGRDRcdTU2REUgLTEgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzUHBpZChwaWQ6IG51bWJlcik6IG51bWJlciB7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKCdwcycsIFsnLW8nLCAncHBpZD0nLCAnLXAnLCBTdHJpbmcocGlkKV0sIHsgZW5jb2Rpbmc6ICd1dGY4JywgdGltZW91dDogNTAwMCB9KVxuICAgIGNvbnN0IHBwaWQgPSBwYXJzZUludCgob3V0LnN0ZG91dCB8fCAnJykudHJpbSgpLCAxMClcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBwaWQpID8gcHBpZCA6IC0xXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiAtMVxuICB9XG59XG5cbi8qKlxuICogXHU1QjY0XHU1MTNGXHU1MjI0XHU1QjlBXHVGRjFBXG4gKiAtIFBPU0lYXHVGRjFBXHU1QjY0XHU1MTNGXHU4OEFCIHJlcGFyZW50IFx1NTIzMCBsYXVuY2hkXHVGRjBDcHBpZCA9PT0gMVx1RkYwOFx1OERFOFx1NEYxQVx1OEJERFx1NTIyNFx1NUI5QVx1NjcwMFx1NTNFRlx1OTc2MFx1RkYwOVx1RkYxQlxuICogLSBXaW5kb3dzXHVGRjFBXHU2NUUwIHJlcGFyZW50IFx1OEJFRFx1NEU0OVx1RkYwQ1x1OTAwMFx1NTZERVwiXHU4RkRCXHU3QTBCXHU1NDJGXHU1MkE4XHU2NUU5XHU0RThFXHU2NzJDXHU2QjIxIE9ic2lkaWFuIFx1NEYxQVx1OEJERFwiXHVGRjA4UElEIFx1NjU4N1x1NEVGNiB0c1x1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPcnBoYW5QaWQocGlkOiBudW1iZXIsIHBpZEZpbGVUczogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgcmV0dXJuIHBpZEZpbGVUcyA8IERhdGUubm93KCkgLSBwcm9jZXNzLnVwdGltZSgpICogMTAwMFxuICB9XG4gIHJldHVybiBwcm9jZXNzUHBpZChwaWQpID09PSAxXG59XG5cbi8qKiBcdTYzMDkgcGlkIFx1NTA1Q1x1NkI2Mlx1RkYxQVNJR1RFUk0gXHUyMTkyIFx1OEQ4NVx1NjVGNiBTSUdLSUxMXHVGRjA4UE9TSVhcdUZGMDlcdUZGMUJXaW5kb3dzIFx1NzUyOCB0YXNra2lsbCAvRiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0b3BQcm9jZXNzQnlQaWQocGlkOiBudW1iZXIsIHRpbWVvdXRNcyA9IDMwMDApOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFpc1Byb2Nlc3NBbGl2ZShwaWQpKSByZXR1cm5cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICB0cnkge1xuICAgICAgc3Bhd25TeW5jKCd0YXNra2lsbCcsIFsnL1BJRCcsIFN0cmluZyhwaWQpLCAnL1QnLCAnL0YnXSwgeyB3aW5kb3dzSGlkZTogdHJ1ZSB9KVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICAgIHJldHVyblxuICB9XG4gIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Nlc3Mua2lsbChwaWQsICdTSUdLSUxMJylcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9LCB0aW1lb3V0TXMpXG4gICAgY29uc3QgcG9sbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICghaXNQcm9jZXNzQWxpdmUocGlkKSkge1xuICAgICAgICBjbGVhckludGVydmFsKHBvbGwpXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgcmVzb2x2ZSgpXG4gICAgICB9XG4gICAgfSwgMTAwKVxuICAgIHRyeSB7XG4gICAgICBwcm9jZXNzLmtpbGwocGlkLCAnU0lHVEVSTScpXG4gICAgfSBjYXRjaCB7XG4gICAgICBjbGVhckludGVydmFsKHBvbGwpXG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZXNvbHZlKClcbiAgICB9XG4gIH0pXG59XG5cbi8qKlxuICogXHU1NDJGXHU1MkE4XHU1MjREXHU1QjY0XHU1MTNGXHU2RTA1XHU2MjZCXHUzMDAyXHU4RkQ0XHU1NkRFXHU2NjJGXHU1NDI2XHU2RTA1XHU3NDA2XHU0RTg2XHU2QjhCXHU3NTU5XHU2NzBEXHU1MkExXHUzMDAyXG4gKlxuICogMS4gUElEIFx1NjU4N1x1NEVGNlx1NTQ3RFx1NEUyRCBcdTIxOTIgXHU2ODIxXHU5QThDXHU1NDdEXHU0RUU0XHU4ODRDXHU4RUFCXHU0RUZEXHVGRjA4ZHNoIHdlYiAtLXBvcnQgPHBvcnQ+XHVGRjA5XHUyMTkyIFx1NUI2NFx1NTEzRlx1NTIxOVx1Njc0MFx1NjM4OVx1RkYxQlxuICogMi4gXHU2NUUwIFBJRCBcdTY1ODdcdTRFRjZcdUZGMDhcdTY1RTdcdTcyNDhcdTUzNDdcdTdFQTcvXHU2NTg3XHU0RUY2XHU0RTIyXHU1OTMxXHVGRjA5XHUyMTkyIHBncmVwIFx1NjMwOVx1N0FFRlx1NTNFM1x1NTNDRFx1NjdFNSBcdTIxOTIgXHU1NDBDXHU2ODM3XHU2ODIxXHU5QThDXHU1NDBFXHU2RTA1XHU3NDA2XHUzMDAyXG4gKlxuICogXHU1M0VBXHU2RTA1XHU3NDA2XCJcdTc2RDFcdTU0MkNcdTY3MkNcdTdBRUZcdTUzRTNcdTRFMTRcdTcyMzZcdThGREJcdTdBMEJcdTVERjJcdTRFMERcdTU3MjhcIlx1NzY4NCBkc2ggd2ViXHVGRjFCXHU1RjUzXHU1MjREXHU0RjFBXHU4QkREXHU1MTc2XHU0RUQ2XHU3QTk3XHU1M0UzXHU2MkM5XHU4RDc3XHU3Njg0XG4gKiBcdTZEM0JcdTY3MERcdTUyQTEgcHBpZCAhPSAxXHVGRjBDXHU3RUREXHU0RTBEXHU0RjFBXHU4OEFCXHU4QkVGXHU2NzQwXHUzMDAyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzd2VlcE9ycGhhbkRzaChkc2hIb21lOiBzdHJpbmcsIHBvcnQ6IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBjYW5kaWRhdGVzID0gbmV3IFNldDxudW1iZXI+KClcbiAgY29uc3QgcmVjID0gcmVhZERzaFBpZEZpbGUoZHNoSG9tZSlcbiAgaWYgKHJlYyAmJiByZWMucG9ydCA9PT0gcG9ydCAmJiBpc1Byb2Nlc3NBbGl2ZShyZWMucGlkKSAmJiBpc0RzaFdlYk9uUG9ydChyZWMucGlkLCBwb3J0KSkge1xuICAgIGNhbmRpZGF0ZXMuYWRkKHJlYy5waWQpXG4gIH1cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09ICd3aW4zMicpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgb3V0ID0gc3Bhd25TeW5jKCdwZ3JlcCcsIFsnLWYnLCBgZHNoLiotLXBvcnQgJHtwb3J0fWBdLCB7IGVuY29kaW5nOiAndXRmOCcsIHRpbWVvdXQ6IDUwMDAgfSlcbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiAob3V0LnN0ZG91dCB8fCAnJykuc3BsaXQoL1xccysvKSkge1xuICAgICAgICBjb25zdCBwaWQgPSBwYXJzZUludChsaW5lLCAxMClcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShwaWQpICYmIHBpZCA+IDAgJiYgaXNEc2hXZWJPblBvcnQocGlkLCBwb3J0KSkgY2FuZGlkYXRlcy5hZGQocGlkKVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICB9XG4gIGxldCBzd2VwdCA9IGZhbHNlXG4gIGZvciAoY29uc3QgcGlkIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICBpZiAoIWlzT3JwaGFuUGlkKHBpZCwgcmVjPy50cyA/PyAwKSkgY29udGludWVcbiAgICBjb25zb2xlLndhcm4oYFtkc2gtZG9ja10gXHU2RTA1XHU3NDA2XHU1QjY0XHU1MTNGIGRzaCB3ZWIgKHBpZD0ke3BpZH0sIHBvcnQ9JHtwb3J0fSlgKVxuICAgIGF3YWl0IHN0b3BQcm9jZXNzQnlQaWQocGlkKVxuICAgIHN3ZXB0ID0gdHJ1ZVxuICB9XG4gIGlmIChzd2VwdCkgcmVtb3ZlRHNoUGlkRmlsZShkc2hIb21lKVxuICByZXR1cm4gc3dlcHRcbn1cbiIsICIvKipcbiAqIFx1OEJCRVx1N0Y2RVx1RkYxQVx1NUI1N1x1NkJCNSArIFx1OEJCRVx1N0Y2RVx1OTg3NSBVSVx1MzAwMlxuICogVjAuMlx1RkYxQURTSF9IT01FIFx1NEUwOVx1Njg2M1x1NkEyMVx1NUYwRlx1RkYwOFx1NkJDRiB2YXVsdCBcdTk2OTRcdTc5QkIgLyBcdTVCOThcdTY1QjlcdTUxNzFcdTRFQUIgLyBcdTgxRUFcdTVCOUFcdTRFNDlcdUZGMDlcdUZGMENcdTlFRDhcdThCQTQgcGVyLXZhdWx0XHUzMDAyXG4gKi9cblxuaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSAnb2JzaWRpYW4nXG5pbXBvcnQgdHlwZSBEc2hEb2NrUGx1Z2luIGZyb20gJy4vbWFpbidcblxuZXhwb3J0IHR5cGUgRHNoSG9tZU1vZGUgPSAnc2hhcmVkJyB8ICdwZXItdmF1bHQnIHwgJ2N1c3RvbSdcblxuZXhwb3J0IGludGVyZmFjZSBEc2hEb2NrU2V0dGluZ3Mge1xuICAvKiogZHNoIENMSSBcdTUxNjVcdTUzRTNcdUZGMDhiaW4uanMgXHU2MjE2IGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdUZGMDlcdUZGMUJcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEIgKi9cbiAgZHNoQmluOiBzdHJpbmdcbiAgLyoqIE5vZGUgXHU1M0VGXHU2MjY3XHU4ODRDXHU2NTg3XHU0RUY2XHVGRjFCXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU0RjE4XHU1MTQ4XHVGRjA5ICovXG4gIG5vZGVCaW46IHN0cmluZ1xuICAvKiogXHU3NkQxXHU1NDJDIGhvc3RcdUZGMDhcdTlFRDhcdThCQTRcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDkgKi9cbiAgaG9zdDogc3RyaW5nXG4gIC8qKiBcdTc2RDFcdTU0MkNcdTdBRUZcdTUzRTNcdUZGMDhcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1RkYwOSAqL1xuICBwb3J0OiBudW1iZXJcbiAgLyoqIERTSF9IT01FIFx1NkEyMVx1NUYwRlx1RkYxQXBlci12YXVsdD1cdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjA5XHVGRjFCc2hhcmVkPVx1NUI5OFx1NjVCOVx1NTE3MVx1NEVBQiB+Ly5kc2hcdUZGMUJjdXN0b209XHU4MUVBXHU1QjlBXHU0RTQ5ICovXG4gIGRzaEhvbWVNb2RlOiBEc2hIb21lTW9kZVxuICAvKiogXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NFx1RkYwOFx1NEVDNSBjdXN0b20gXHU2QTIxXHU1RjBGXHU3NTFGXHU2NTQ4XHVGRjA5ICovXG4gIGRzaEhvbWU6IHN0cmluZ1xuICAvKiogXHU1MTQxXHU4QkI4XHU3NTI4IEVMRUNUUk9OX1JVTl9BU19OT0RFIFx1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZVx1RkYwOFx1OUVEOFx1OEJBNFx1NTE3M1x1RkYxQVx1NUI5RVx1NkQ0Qlx1NEUwRFx1NTNFRlx1OTc2MFx1RkYwOSAqL1xuICB1c2VFbWJlZGRlZE5vZGU6IGJvb2xlYW5cbiAgLyoqIE9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NjVGNlx1ODFFQVx1NTJBOFx1NjJDOVx1OEQ3NyBEU0ggKi9cbiAgYXV0b3N0YXJ0OiBib29sZWFuXG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEc2hEb2NrU2V0dGluZ3MgPSB7XG4gIGRzaEJpbjogJycsXG4gIG5vZGVCaW46ICcnLFxuICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgcG9ydDogMzA4MCxcbiAgZHNoSG9tZU1vZGU6ICdwZXItdmF1bHQnLFxuICBkc2hIb21lOiAnJyxcbiAgdXNlRW1iZWRkZWROb2RlOiBmYWxzZSxcbiAgYXV0b3N0YXJ0OiB0cnVlLFxufVxuXG5leHBvcnQgY2xhc3MgRHNoRG9ja1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgY3VzdG9tSG9tZUVsPzogU2V0dGluZ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcGx1Z2luOiBEc2hEb2NrUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbilcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpc1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU2OTgyXHU4OUM4IC0tLS0tLS0tLS1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHtcbiAgICAgIGNsczogJ2RzaC1kb2NrLXNldHRpbmdzLWRlc2MnLFxuICAgICAgdGV4dDogJ1x1NjI4QVx1NUI5OFx1NjVCOSBEZWVwU2VlayBIYXJuZXNzIFdlYiBcdTUwNUNcdTk3NjBcdThGREIgT2JzaWRpYW5cdUZGMUFcdTVCOUFcdTRGNEQgZHNoIFx1MjE5MiBcdTVCNTBcdThGREJcdTdBMEJcdThGRDBcdTg4NEMgXHUyMTkyIFx1OTc2Mlx1Njc3Rlx1NUQ0Q1x1NTE2NVx1MzAwMlx1NUI5OFx1NjVCOVx1NTM5Rlx1NzUxRlx1RkYwQ1x1NUI5OFx1NjVCOSBVSSBcdTUzOUZcdTY4MzdcdTVENENcdTUxNjVcdTMwMDInLFxuICAgIH0pXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zZXR0aW5ncy1kZXNjJyxcbiAgICAgIHRleHQ6ICdcdUQ4M0VcdUREMUQgXHU0RTBFIGRzaC10b29sLW9ic2lkaWFuLXZhdWx0IFx1NzNFMFx1ODA1NFx1NzRBN1x1NTQwOFx1RkYxQVx1OTE0RFx1NTQwOCBEU0ggXHU0RkE3XHU3Njg0IDE2IFx1NEUyQSB2YXVsdF8qIFx1NURFNVx1NTE3N1x1RkYwQ1x1NUYwMFx1N0JCMVx1NTM3M1x1NzUyOFx1MzAwQ09ic2lkaWFuIFx1NTE4NSBBZ2VudCBcdTdCMTRcdThCQjBcdTVERTVcdTRGNUNcdTZENDFcdTMwMERcdTIwMTRcdTIwMTRcdTk3NjJcdTY3N0ZcdTkxQ0NcdTc2RjRcdTYzQTVcdThCRjRcIlx1OEJGQlx1NEUwMFx1NEUwQlx1NEVDQVx1NTkyOVx1NzY4NFx1N0IxNFx1OEJCMFwiXHVGRjBDQWdlbnQgXHU4MUVBXHU1MkE4XHU1QjlBXHU0RjREXHU1RjUzXHU1MjREXHU1RTkzXHU4QkZCXHU1MTk5XHUzMDAyJyxcbiAgICB9KVxuXG4gICAgLy8gLS0tLS0tLS0tLSBcdTY3MERcdTUyQTFcdTYzQTdcdTUyMzYgLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdcdTY3MERcdTUyQTEnKS5zZXRIZWFkaW5nKClcbiAgICBjb25zdCBzdGF0dXNMaW5lID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NzBEXHU1MkExXHU3MkI2XHU2MDAxJylcbiAgICAgIC5zZXREZXNjKHRoaXMuZGVzY3JpYmVTdGF0dXMoKSlcbiAgICBjb25zdCBidG5zID0gc3RhdHVzTGluZS5jb250cm9sRWwuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stYnRucycgfSlcbiAgICBjb25zdCBzdGFydEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnbW9kLWN0YScsIHRleHQ6ICdcdTI1QjYgXHU1NDJGXHU1MkE4JyB9KVxuICAgIHN0YXJ0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLnN0YXJ0KCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgc3RvcEJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVBMCBcdTUwNUNcdTZCNjInIH0pXG4gICAgc3RvcEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdG9wKCkudGhlbigoKSA9PiB0aGlzLmRpc3BsYXkoKSlcbiAgICB9XG4gICAgY29uc3Qgb3BlbkJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1NjI1M1x1NUYwMFx1OTc2Mlx1Njc3RicgfSlcbiAgICBvcGVuQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMucGx1Z2luLm9wZW5QYW5lbCgpXG4gICAgfVxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5NjhGIE9ic2lkaWFuIFx1ODFFQVx1NTJBOFx1NTQyRlx1NTJBOCcpXG4gICAgICAuYWRkVG9nZ2xlKCh0KSA9PlxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9zdGFydCkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvc3RhcnQgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSksXG4gICAgICApXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1OEZEMFx1ODg0Q1x1NjVGNiAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1OEZEMFx1ODg0Q1x1NjVGNicpLnNldEhlYWRpbmcoKVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ2RzaCBDTEkgXHU4REVGXHU1Rjg0JylcbiAgICAgIC5zZXREZXNjKCdcdTc1NTlcdTdBN0FcdTgxRUFcdTUyQThcdTYzQTJcdTZENEJcdUZGMDhEU0hfQklOIFx1MjE5MiBucG0gcm9vdCAtZyBcdTIxOTIgXHU1RTM4XHU4OUMxXHU1MTY4XHU1QzQwXHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXHU1M0VGXHU1ODZCIGRzaCBcdTUzMDVcdTc2RUVcdTVGNTVcdTYyMTYgYmluLmpzIFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9vcHQvaG9tZWJyZXcvbGliL25vZGVfbW9kdWxlcy9AZGVlcHNlZWstYWkvZHNoJylcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZHNoQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLmRldGVjdExpbmUgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdOb2RlIFx1NTNFRlx1NjI2N1x1ODg0Q1x1NjU4N1x1NEVGNicpXG4gICAgICAuc2V0RGVzYygnXHU3NTU5XHU3QTdBXHU4MUVBXHU1MkE4XHU5MDA5XHU2MkU5XHVGRjA4XHU3Q0ZCXHU3RURGIG5vZGUgXHU2NzAwXHU3QTMzXHU1QjlBXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdcdTRGOEJcdTU5ODIgL29wdC9ob21lYnJldy9iaW4vbm9kZScpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vZGVCaW4pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub2RlQmluID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NTkwRFx1NzUyOCBPYnNpZGlhbiBcdTUxODVcdTdGNkUgTm9kZScpXG4gICAgICAuc2V0RGVzYygnRUxFQ1RST05fUlVOX0FTX05PREVcdTMwMDJcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdTIwMTRcdTIwMTRcdTVCOUVcdTZENEIgT2JzaWRpYW4gXHU0RThDXHU4RkRCXHU1MjM2XHU0RUU1IE5vZGUgXHU2QTIxXHU1RjBGXHU4RkQwXHU4ODRDXHU0RjFBXHU2MzAyXHU4RDc3XHVGRjBDXHU0RUM1XHU1NzI4XHU5QThDXHU4QkMxXHU1M0VGXHU3NTI4XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyJylcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XG4gICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlRW1iZWRkZWROb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZUVtYmVkZGVkTm9kZSA9IHZcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuZGV0ZWN0TGluZS50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVEZXRlY3QoKVxuICAgICAgICB9KSxcbiAgICAgIClcblxuICAgIC8vIC0tLS0tLS0tLS0gXHU3RjUxXHU3RURDIC0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnXHU3RjUxXHU3RURDJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU1NzMwXHU1NzQwJylcbiAgICAgIC5zZXREZXNjKCdcdTRFQzVcdTY3MkNcdTY3M0FcdTU2REVcdTczQUZcdTU3MzBcdTU3NDBcdTUzRUZcdTkwMDlcdUZGMUFcdTVCOThcdTY1QjkgZHNoIFx1NjJEMlx1N0VERCAtLWhvc3QgMC4wLjAuMFx1RkYwOFx1NEUwRFx1NjUyRlx1NjMwMVx1NUM0MFx1NTdERlx1N0Y1MVx1OEJCRlx1OTVFRVx1RkYwOVx1RkYwQ1x1OTc1RVx1NTZERVx1NzNBRlx1NTAzQ1x1NkNBMVx1NjcwOVx1NjEwRlx1NEU0OVx1MzAwMlx1NjVFN1x1NzI0OFx1OTA1N1x1NzU1OVx1NzY4NFx1ODFFQVx1NUI5QVx1NEU0OVx1NTAzQ1x1NEYxQVx1ODhBQlx1OTFDRFx1N0Y2RVx1NEUzQSAxMjcuMC4wLjFcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICAvLyBcdTUzODZcdTUzRjIgZGF0YS5qc29uIFx1NTNFRlx1ODBGRFx1NkI4Qlx1NzU1OVx1ODFFQVx1NUI5QVx1NEU0OSBob3N0XHVGRjA4XHU5NjkwXHU4NUNGXHU1QjU3XHU2QkI1XHU2NUY2XHU0RUUzXHU2MjRCXHU2NTM5XHU3Njg0XHVGRjA5XHVGRjBDXHU2NTM2XHU2NTVCXHU1MjMwXHU1NkRFXHU3M0FGXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob3N0ICE9PSAnMTI3LjAuMC4xJyAmJiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob3N0ICE9PSAnbG9jYWxob3N0Jykge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvc3QgPSAnMTI3LjAuMC4xJ1xuICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfVxuICAgICAgICBkZC5hZGRPcHRpb24oJzEyNy4wLjAuMScsICcxMjcuMC4wLjFcdUZGMDhcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMENcdTlFRDhcdThCQTRcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2xvY2FsaG9zdCcsICdsb2NhbGhvc3RcdUZGMDhcdTRFQzVcdTY3MkNcdTY3M0FcdUZGMDknKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob3N0KVxuICAgICAgICBkZC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvc3QgPSB2XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKClcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU3NkQxXHU1NDJDXHU3QUVGXHU1M0UzXHVGRjA4XHU1N0ZBXHU1MUM2XHVGRjA5JylcbiAgICAgIC5zZXREZXNjKCdcdTVCOThcdTY1QjlcdTlFRDhcdThCQTQgMzA4MFx1MzAwMnNoYXJlZC9jdXN0b20gXHU2QTIxXHU1RjBGXHU3NkY0XHU2M0E1XHU0RjdGXHU3NTI4XHVGRjFCcGVyLXZhdWx0IFx1NkEyMVx1NUYwRlx1NTcyOFx1NkI2NFx1NTdGQVx1Nzg0MFx1NEUwQVx1NjMwOSB2YXVsdCBcdTZEM0VcdTc1MUZcdTcyRUNcdTdBQ0JcdTdBRUZcdTUzRTNcdUZGMDhcdTZCQ0YgdmF1bHQgXHU3MkVDXHU1MzYwXHVGRjBDXHU0RjFBXHU4QkREXHU0RTkyXHU0RTBEXHU1M0VGXHU4OUMxXHVGRjA5XHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCczMDgwJylcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQpKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbiA9IE51bWJlcih2LnRyaW0oKSlcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBvcnQgPSBOdW1iZXIuaXNJbnRlZ2VyKG4pICYmIG4gPj0gMCAmJiBuIDw9IDY1NTM1ID8gbiA6IDMwODBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLm5ldFByZXZpZXcudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlTmV0KClcbiAgICAgICAgICB9KSxcbiAgICAgIClcbiAgICB0aGlzLm5ldFByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICAvLyAtLS0tLS0tLS0tIFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NSAtLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ1x1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVx1RkYwOERTSF9IT01FXHVGRjA5XHU0RTBFXHU0RjFBXHU4QkREXHU5Njk0XHU3OUJCJykuc2V0SGVhZGluZygpXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2QTIxXHU1RjBGJylcbiAgICAgIC5zZXREZXNjKCdwZXItdmF1bHQgXHU2QTIxXHU1RjBGID0gXHU0RjFBXHU4QkREXHU2MzA5XHU1RTkzXHU5Njk0XHU3OUJCXHVGRjA4XHU1NDA0XHU1RTkzXHU5NzYyXHU2NzdGXHU1M0VBXHU2NjNFXHU3OTNBXHU2NzJDXHU1RTkzXHU1MjFCXHU1RUZBXHU3Njg0XHU0RjFBXHU4QkREXHVGRjA5XHVGRjBDXHU0RjQ2XHU2QTIxXHU1NzhCL1x1NUJDNlx1OTRBNS9cdTRFM0JcdTk4OThcdTkxNERcdTdGNkVcdTRFMEVcdThGRDBcdTg4NENcdTY1RjZcdTYzRDJcdTRFRjZcdTUxNjhcdTVDNDBcdTUxNzFcdTRFQUJcdTRFMDBcdTRFRkRcdUZGMENcdTkxNERcdTRFMDBcdTZCMjFcdTUxNjhcdTVFOTNcdTc1MUZcdTY1NDhcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKChkZCkgPT4ge1xuICAgICAgICBkZC5hZGRPcHRpb24oJ3Blci12YXVsdCcsICdcdTZCQ0YgdmF1bHQgXHU5Njk0XHU3OUJCXHU0RjFBXHU4QkREIH4vLmRzaC92YXVsdHMvPFx1NTQwRD4tPGhhc2g+XHVGRjA4XHU5RUQ4XHU4QkE0XHVGRjFCXHU5MTREXHU3RjZFXHU0RTBFXHU2M0QyXHU0RUY2XHU0RUNEXHU1MTcxXHU0RUFCXHVGRjA5JylcbiAgICAgICAgZGQuYWRkT3B0aW9uKCdzaGFyZWQnLCAnXHU1Qjk4XHU2NUI5XHU1MTcxXHU0RUFCIH4vLmRzaFx1RkYwOFx1NjI0MFx1NjcwOSB2YXVsdCBcdTUxNzFcdTc1MjhcdTRFMDBcdTU5NTdcdTkxNERcdTdGNkVcdTMwMDFcdTYzRDJcdTRFRjZcdTRFMEVcdTRGMUFcdThCRERcdUZGMDknKVxuICAgICAgICBkZC5hZGRPcHRpb24oJ2N1c3RvbScsICdcdTgxRUFcdTVCOUFcdTRFNDlcdThERUZcdTVGODQnKVxuICAgICAgICBkZC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSlcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lTW9kZSA9IHYgYXMgRHNoSG9tZU1vZGVcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKVxuICAgICAgICAgIHRoaXMuY3VzdG9tSG9tZUVsPy5zZXREaXNhYmxlZCh2ICE9PSAnY3VzdG9tJylcbiAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIHRoaXMuY3VzdG9tSG9tZUVsID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4MUVBXHU1QjlBXHU0RTQ5IERTSF9IT01FIFx1OERFRlx1NUY4NCcpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignXHU0RjhCXHU1OTgyIC9Vc2Vycy95b3UvLmRzaCcpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kc2hIb21lID0gdi50cmltKClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpXG4gICAgICAgICAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgICAgICAgIH0pLFxuICAgICAgKVxuICAgIHRoaXMuY3VzdG9tSG9tZUVsLnNldERpc2FibGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlICE9PSAnY3VzdG9tJylcblxuICAgIHRoaXMuaG9tZVByZXZpZXcgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1kZXRlY3QnIH0pXG5cbiAgICB0aGlzLmRldGVjdExpbmUudGV4dENvbnRlbnQgPSB0aGlzLmRlc2NyaWJlRGV0ZWN0KClcbiAgICB0aGlzLmhvbWVQcmV2aWV3LnRleHRDb250ZW50ID0gdGhpcy5kZXNjcmliZURzaEhvbWUoKVxuICAgIHRoaXMubmV0UHJldmlldy50ZXh0Q29udGVudCA9IHRoaXMuZGVzY3JpYmVOZXQoKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RMaW5lITogSFRNTEVsZW1lbnRcbiAgcHJpdmF0ZSBob21lUHJldmlldyE6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgbmV0UHJldmlldyE6IEhUTUxFbGVtZW50XG5cbiAgcHJpdmF0ZSBkZXNjcmliZVN0YXR1cygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdydW5uaW5nJykge1xuICAgICAgcmV0dXJuIGAke3MudXJsfVx1RkYwOCR7cy5hdHRhY2hlZCA/ICdcdTYzMDJcdTYzQTVcdTVERjJcdTY3MDlcdTY3MERcdTUyQTEnIDogJ1x1NUI1MFx1OEZEQlx1N0EwQlx1OEZEMFx1ODg0Q1x1NEUyRCd9XHVGRjA5YFxuICAgIH1cbiAgICBpZiAocy5raW5kID09PSAnc3RhcnRpbmcnKSByZXR1cm4gJ1x1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNlx1RkYwOFx1OTk5Nlx1NkIyMVx1N0VBNiAxMCBcdTc5RDJcdUZGMENcdTk3MDBcdTUyMURcdTU5Q0JcdTUzMTYgcHJvZmlsZVx1RkYwOSdcbiAgICBpZiAocy5raW5kID09PSAnZXJyb3InKSByZXR1cm4gYFx1NTkzMVx1OEQyNTogJHtzLm1lc3NhZ2V9YFxuICAgIHJldHVybiAnXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURldGVjdCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnBsdWdpbi5kZXRlY3RJbmZvKClcbiAgICByZXR1cm4gW1xuICAgICAgYGRzaDogJHtpbmZvLmRzaEJpbiA/PyAnXHU2NzJBXHU2MjdFXHU1MjMwJ30ke2luZm8uZHNoTm90ZXMubGVuZ3RoID8gYFx1RkYwOCR7aW5mby5kc2hOb3Rlcy5qb2luKCdcdUZGMUInKX1cdUZGMDlgIDogJyd9YCxcbiAgICAgIGBub2RlOiAke2luZm8ubm9kZU5vdGVzLmpvaW4oJ1x1RkYxQicpfWAsXG4gICAgXS5qb2luKCdcXG4nKVxuICB9XG5cbiAgcHJpdmF0ZSBkZXNjcmliZURzaEhvbWUoKTogc3RyaW5nIHtcbiAgICBjb25zdCBob21lID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlRHNoSG9tZSgpXG4gICAgY29uc3Qgc2hhcmVkID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlU2hhcmVkQ29uZmlnUm9vdCgpXG4gICAgaWYgKHNoYXJlZCkge1xuICAgICAgcmV0dXJuIGBcdTRGMUFcdThCRERcdTc2RUVcdTVGNTU6ICR7aG9tZX1cXG5cdTkxNERcdTdGNkVcdTUxNzFcdTRFQUI6ICR7c2hhcmVkfVx1RkYwOFx1NkEyMVx1NTc4Qi9cdTVCQzZcdTk0QTUvXHU0RTNCXHU5ODk4XHU5MTREXHU0RTAwXHU2QjIxXHU1MTY4XHU1RTkzXHU3NTFGXHU2NTQ4XHVGRjA5YFxuICAgIH1cbiAgICByZXR1cm4gYFx1NzUxRlx1NjU0OFx1OERFRlx1NUY4NDogJHtob21lfWBcbiAgfVxuXG4gIHByaXZhdGUgZGVzY3JpYmVOZXQoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3J0ID0gdGhpcy5wbHVnaW4uZWZmZWN0aXZlUG9ydCgpXG4gICAgY29uc3QgbW9kZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRzaEhvbWVNb2RlXG4gICAgY29uc3Qgc3VmZml4ID0gbW9kZSA9PT0gJ3Blci12YXVsdCcgPyAnXHVGRjA4XHU2NzJDIHZhdWx0IFx1NzJFQ1x1NTM2MFx1RkYwQ1x1NEUwRVx1NTE3Nlx1NEVENiB2YXVsdCBcdTk2OTRcdTc5QkJcdUZGMDknIDogJ1x1RkYwOHNoYXJlZC9jdXN0b21cdUZGMUFcdTYyNDBcdTY3MDkgdmF1bHQgXHU1MTcxXHU3NTI4XHVGRjA5J1xuICAgIHJldHVybiBgXHU3NTFGXHU2NTQ4XHU3QUVGXHU1M0UzOiAke3BvcnR9JHtzdWZmaXh9YFxuICB9XG59XG4iLCAiLyoqXG4gKiBEc2hXZWJWaWV3IFx1MjAxNFx1MjAxNCBcdTYyOEFcdTVCOThcdTY1QjkgRFNIIFdlYiAoMTI3LjAuMC4xOjxwb3J0PikgXHU1MDVDXHU5NzYwXHU4RkRCIE9ic2lkaWFuIFx1OTc2Mlx1Njc3Rlx1MzAwMlxuICogXHU1RTI2XHU1QjhDXHU2NTc0XHU4RkM3XHU3QTBCXHU3MkI2XHU2MDAxXHVGRjFBXHU1MkEwXHU4RjdEXHU1MkE4XHU3NTNCIC8gXHU5NTE5XHU4QkVGXHU1MzYxXHU3MjQ3XHVGRjA4XHU1NDJCXHU5MUNEXHU4QkQ1XHVGRjA5LyBcdTY3MkFcdTU0MkZcdTUyQThcdTdBN0FcdTcyQjZcdTYwMDFcdTMwMDJcbiAqIGlmcmFtZSBcdTYzMDdcdTU0MTFcdTVCOThcdTY1QjlcdTY3MERcdTUyQTFcdUZGMENVSSBcdTUzRUFcdTY2MkZcIlx1ODIzOVx1NTc1RVwiXHU1OTE2XHU1OEYzXHVGRjFCXHU1REU1XHU1MTc3XHU2ODBGXHU1MkE4XHU0RjVDXHU4RDcwIE9ic2lkaWFuIFx1NTM5Rlx1NzUxRlxuICogXHU2ODA3XHU5ODk4XHU2ODBGXHVGRjA4SXRlbVZpZXcuYWRkQWN0aW9uXHVGRjA5XHU0RTBFXHU1M0YzXHU5NTJFXHU4M0RDXHU1MzU1XHVGRjA4b25QYW5lTWVudVx1RkYwOVx1MzAwMlxuICovXG5cbmltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBzZXRJY29uLCB0eXBlIE1lbnUgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCB0eXBlIERzaERvY2tQbHVnaW4gZnJvbSAnLi9tYWluJ1xuXG5leHBvcnQgY29uc3QgRFNIX1dFQl9WSUVXX1RZUEUgPSAnZHNoLWRvY2std2ViJ1xuXG50eXBlIFVpU3RhdGUgPSAncnVubmluZycgfCAnc3RhcnRpbmcnIHwgJ2Vycm9yJyB8ICdzdG9wcGVkJ1xuXG5leHBvcnQgY2xhc3MgRHNoV2ViVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBpZnJhbWVFbDogSFRNTElGcmFtZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHBpbGxFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIG92ZXJsYXlFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxuICAvKiogXHU5NzYyXHU2NzdGXHU1MTg1XCJcdTU0MkZcdTUyQTgvXHU1MDVDXHU2QjYyXCJcdTYzMDlcdTk0QUVcdUZGMDgwLjIuNSBcdTU0MENcdTZCM0VcdUZGMENcdTUxODVcdTVCQjlcdTUzM0FcdTUzRUZcdTg5QzFcdUZGMDkgKi9cbiAgcHJpdmF0ZSB0b2dnbGVCdG46IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgLyoqIFx1NjgwN1x1OTg5OFx1NjgwRlwiXHU1NDJGXHU1MkE4L1x1NTA1Q1x1NkI2MlwiXHU1MkE4XHU0RjVDXHU2MzA5XHU5NEFFXHVGRjA4YWRkQWN0aW9uIFx1OEZENFx1NTZERVx1NzY4NFx1NTE0M1x1N0QyMFx1RkYwQ1x1NTZGRVx1NjgwN1x1OTY4Rlx1NzJCNlx1NjAwMVx1NTIwN1x1NjM2Mlx1RkYwOSAqL1xuICBwcml2YXRlIHRvZ2dsZUFjdGlvbkVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgY3VycmVudDogVWlTdGF0ZSA9ICdzdG9wcGVkJ1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSBwbHVnaW46IERzaERvY2tQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGxlYWYpXG4gIH1cblxuICBvdmVycmlkZSBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBEU0hfV0VCX1ZJRVdfVFlQRVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0RTSCBEb2NrJ1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiAnYW5jaG9yJ1xuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jaycgfSlcblxuICAgIC8vIC0tLS0gXHU1OTM0XHU5MEU4XHVGRjFBbG9nbyArIFx1NjgwN1x1OTg5OCArIFx1NzJCNlx1NjAwMSBwaWxsICsgXHU5NzYyXHU2NzdGXHU1MTg1XHU2M0E3XHU1MjM2XHU2MzA5XHU5NEFFIC0tLS1cbiAgICAvLyBcdTYzMDlcdTk0QUVcdTg4NENcdTRGRERcdTc1NTlcdTU3MjhcdTk3NjJcdTY3N0ZcdTUxODVcdTVCQjlcdTkxQ0NcdUZGMDgwLjIuNSBcdTU0MENcdTZCM0VcdUZGMENcdTRFRkJcdTRGNTUgT2JzaWRpYW4gXHU3MjQ4XHU2NzJDL1x1NEUzQlx1OTg5OFx1NEUwQlx1OTBGRFx1NTNFRlx1ODlDMVx1RkYwOVx1RkYxQlxuICAgIC8vIFx1NTQwQ1x1NjVGNlx1NEZERFx1NzU1OVx1NTM5Rlx1NzUxRlx1NjgwN1x1OTg5OFx1NjgwRlx1NTJBOFx1NEY1Q1x1RkYwOGFkZEFjdGlvblx1RkYwQ3BvcG91dCBcdTdBOTdcdTUzRTNcdTkxQ0NcdTU1MkZcdTRFMDBcdTc2ODRcdTRGNERcdTdGNkVcdUZGMDlcdTRFMEVcdTUzRjNcdTk1MkVcdTgzRENcdTUzNTVcdTMwMDJcbiAgICBjb25zdCBoZWFkZXIgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWhlYWRlcicgfSlcbiAgICBjb25zdCBsb2dvID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWxvZ28nIH0pXG4gICAgc2V0SWNvbihsb2dvLCAnYW5jaG9yJylcbiAgICBoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogJ2RzaC1kb2NrLXRpdGxlJywgdGV4dDogJ0RTSCBEb2NrJyB9KVxuICAgIHRoaXMucGlsbEVsID0gaGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6ICdkc2gtZG9jay1waWxsJyB9KVxuICAgIGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zcGFjZXInIH0pXG5cbiAgICB0aGlzLnRvZ2dsZUJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgdGhpcy50b2dnbGVCdG4ub25jbGljayA9ICgpID0+IHZvaWQgdGhpcy5vblRvZ2dsZSgpXG5cbiAgICBjb25zdCByZWZyZXNoQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RzaC1kb2NrLWJ0bicgfSlcbiAgICBzZXRJY29uKHJlZnJlc2hCdG4sICdyZWZyZXNoLWN3JylcbiAgICByZWZyZXNoQnRuLnRpdGxlID0gJ1x1NTIzN1x1NjVCMCdcbiAgICByZWZyZXNoQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnJlbG9hZCgpXG5cbiAgICBjb25zdCBwb3BvdXRCdG4gPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stYnRuJyB9KVxuICAgIHNldEljb24ocG9wb3V0QnRuLCAnbWF4aW1pemUtMicpXG4gICAgcG9wb3V0QnRuLnRpdGxlID0gJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOFx1NzJFQ1x1N0FDQlx1OEZEQlx1N0EwQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOSdcbiAgICBwb3BvdXRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpXG4gICAgfVxuXG4gICAgY29uc3QgYnJvd3NlckJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkc2gtZG9jay1idG4nIH0pXG4gICAgc2V0SWNvbihicm93c2VyQnRuLCAnZXh0ZXJuYWwtbGluaycpXG4gICAgYnJvd3NlckJ0bi50aXRsZSA9ICdcdTU3MjhcdTdDRkJcdTdFREZcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTYyNTNcdTVGMDAnXG4gICAgYnJvd3NlckJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKClcbiAgICB9XG5cbiAgICAvLyBENVx1RkYxQVx1NURFNVx1NTE3N1x1NjgwRlx1NTJBOFx1NEY1Q1x1NTQwQ1x1NkI2NVx1OEZEQiBPYnNpZGlhbiBcdTUzOUZcdTc1MUZcdTY4MDdcdTk4OThcdTY4MEZcdUZGMDhJdGVtVmlldy5hZGRBY3Rpb24sIG9ic2lkaWFuLmQudHM6MzYwNFx1RkYwOVxuICAgIC8vIFx1NEUwRVx1NTNGM1x1OTUyRVx1ODNEQ1x1NTM1NSBcdTIwMTRcdTIwMTQgcG9wb3V0IFx1N0E5N1x1NTNFM1x1MzAwMVx1NTkxQVx1OTc2Mlx1Njc3Rlx1NTczQVx1NjY2Rlx1NEUwQlx1OTBGRFx1NjcwOVx1NTE2NVx1NTNFM1x1MzAwMlxuICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwgPSB0aGlzLmFkZEFjdGlvbigncGxheScsICdcdTU0MkZcdTUyQTgnLCAoKSA9PiB2b2lkIHRoaXMub25Ub2dnbGUoKSlcbiAgICB0aGlzLmFkZEFjdGlvbigncmVmcmVzaC1jdycsICdcdTUyMzdcdTY1QjAnLCAoKSA9PiB0aGlzLnJlbG9hZCgpKVxuICAgIHRoaXMuYWRkQWN0aW9uKCdtYXhpbWl6ZS0yJywgJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFM1x1RkYwOFx1NzJFQ1x1N0FDQlx1OEZEQlx1N0EwQlx1RkYwQ1x1NjAyN1x1ODBGRFx1N0I0OVx1NTQwQ1x1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOScsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpKVxuICAgIHRoaXMuYWRkQWN0aW9uKCdleHRlcm5hbC1saW5rJywgJ1x1NTcyOFx1N0NGQlx1N0VERlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1NjI1M1x1NUYwMCcsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlbkluQnJvd3NlcigpKVxuXG4gICAgLy8gLS0tLSBcdTRFM0JcdTRGNTNcdUZGMUFpZnJhbWUgKyBcdTcyQjZcdTYwMDFcdTg5ODZcdTc2RDZcdTVDNDIgLS0tLVxuICAgIGNvbnN0IGJvZHkgPSByb290LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLWJvZHknIH0pXG4gICAgLy8gRDRcdUZGMUFcdTY2M0VcdTVGMEYgc2FuZGJveCBcdTc2N0RcdTU0MERcdTUzNTVcdUZGMDhhbGxvdy1zY3JpcHRzICsgYWxsb3ctc2FtZS1vcmlnaW4gXHU0RjlCIFNQQSBcdTc1MjhcbiAgICAvLyBsb2NhbFN0b3JhZ2VcdUZGMENhbGxvdy1mb3Jtcy9tb2RhbHMvcG9wdXBzIFx1ODk4Nlx1NzZENlx1NzY3Qlx1NUY1NS9cdTVGMzlcdTdBOTdcdTU3M0FcdTY2NkZcdUZGMUJcdTRFQzVcdTU2REVcdTczQUZcdTUzRUZcdTRGRTFcbiAgICAvLyBcdTY3MERcdTUyQTFcdUZGMENcdTRGNDZcdTY2M0VcdTVGMEZcdTU4RjBcdTY2MEVcdTY2MkZcdTg5QzRcdTgzMDNcdTg5ODFcdTZDNDJcdUZGMENDdXN0b20gRnJhbWVzIFx1NTQwQ1x1NkIzRVx1RkYwOVx1MzAwMlxuICAgIHRoaXMuaWZyYW1lRWwgPSBib2R5LmNyZWF0ZUVsKCdpZnJhbWUnLCB7XG4gICAgICBjbHM6ICdkc2gtZG9jay1mcmFtZScsXG4gICAgICBhdHRyOiB7IHNhbmRib3g6ICdhbGxvdy1zY3JpcHRzIGFsbG93LXNhbWUtb3JpZ2luIGFsbG93LWZvcm1zIGFsbG93LW1vZGFscyBhbGxvdy1wb3B1cHMnIH0sXG4gICAgfSlcbiAgICB0aGlzLm92ZXJsYXlFbCA9IGJvZHkuY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stb3ZlcmxheScgfSlcblxuICAgIC8vIFx1NzJCNlx1NjAwMVx1ODA1NFx1NTJBOFx1MzAwMlx1NzUyOCBDb21wb25lbnQucmVnaXN0ZXJcdUZGMDhcdTVCOThcdTY1QjkgQVBJXHVGRjBDb2JzaWRpYW4uZC50c1x1RkYwOVx1NkNFOFx1NTE4Q1x1OTAwMFx1OEJBMlx1NTFGRFx1NjU3MFx1RkYxQVxuICAgIC8vIFx1ODlDNlx1NTZGRVx1NTM3OFx1OEY3RFx1RkYwOG9uQ2xvc2VcdUZGMDlcdTY1RjZcdTgxRUFcdTUyQThcdTYyNjdcdTg4NENcdUZGMENcdTRFMERcdTRGMUFcdTZCQ0ZcdTZCMjFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTkwRkRcdTVGODBcbiAgICAvLyBwbHVnaW4uc3RhdHVzTGlzdGVuZXJzIFx1N0QyRlx1NzlFRlx1OTVFRFx1NTMwNVx1RkYwOFx1NjVFN1x1NUI5RVx1NzNCMFx1NkNDNFx1NkYwRlx1RkYwOVx1MzAwMlxuICAgIHRoaXMucmVnaXN0ZXIodGhpcy5wbHVnaW4ub25TdGF0dXNDaGFuZ2UoKCkgPT4gdGhpcy5yZWZyZXNoKCkpKVxuICAgIHRoaXMucmVmcmVzaCgpXG5cbiAgICAvLyBcdTUxNUNcdTVFOTVcdUZGMUFcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTgyRTVcdTY3MERcdTUyQTFcdTY3MkFcdTU0MkZcdTUyQThcdTRFMTRcdTdBRUZcdTUzRTNcdTUzRUZcdTc1MjhcdUZGMENcdTVDMURcdThCRDVcdTYyQzlcdThENzdcbiAgICB2b2lkIHRoaXMuZW5zdXJlU3RhcnRlZCgpXG5cbiAgICAvLyBcdTYyNTNcdTVGMDBcdTk3NjJcdTY3N0ZcdTY1RjZcdTUyMzdcdTY1QjBcdTRFMDBcdTZCMjFcdTVGNTNcdTUyNEQgdmF1bHQgXHU2ODA3XHU4QkIwXHVGRjFBXHU3NTI4XHU2MjM3XHU2QjY0XHU1MjNCXHU2QjYzXHU2MjUzXHU1RjAwIERTSCBcdTk3NjJcdTY3N0ZcdTc2ODRcdTdBOTdcdTUzRTNcbiAgICAvLyBcdTVDMzFcdTY2MkZcIlx1NUY1M1x1NTI0RCB2YXVsdFwiXHVGRjBDXHU2NUUwXHU5NzAwXHU3QjQ5IGZvY3VzL2FjdGl2ZS1sZWFmLWNoYW5nZSBcdTRFOEJcdTRFRjZcdTMwMDJcbiAgICB0aGlzLnBsdWdpbi5yZWZyZXNoQ3VycmVudFZhdWx0TWFya2VyKClcbiAgfVxuXG4gIG92ZXJyaWRlIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIH1cblxuICAvKiogRDVcdUZGMUFcdTUzRjNcdTk1MkVcdTgzRENcdTUzNTVcdUZGMDhWaWV3Lm9uUGFuZU1lbnUsIG9ic2lkaWFuLmQudHM6NzcwOVx1RkYwOVx1MjAxNFx1MjAxNFx1NTkxQVx1OTc2Mlx1Njc3Ri9cdTY4MDdcdTdCN0VcdTU5MzRcdTUzRjNcdTk1MkVcdTgxRUFcdTUyQThcdTgzQjdcdTVGOTcgKi9cbiAgb3ZlcnJpZGUgb25QYW5lTWVudShtZW51OiBNZW51LCBfc291cmNlOiAnbW9yZS1vcHRpb25zJyB8ICd0YWItaGVhZGVyJyB8IHN0cmluZyk6IHZvaWQge1xuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT5cbiAgICAgIGl0ZW1cbiAgICAgICAgLnNldFRpdGxlKHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnIHx8IHRoaXMuY3VycmVudCA9PT0gJ3N0YXJ0aW5nJyA/ICdcdTUwNUNcdTZCNjIgRFNIIFx1NjcwRFx1NTJBMScgOiAnXHU1NDJGXHU1MkE4IERTSCBcdTY3MERcdTUyQTEnKVxuICAgICAgICAuc2V0SWNvbih0aGlzLmN1cnJlbnQgPT09ICdydW5uaW5nJyB8fCB0aGlzLmN1cnJlbnQgPT09ICdzdGFydGluZycgPyAnc3F1YXJlJyA6ICdwbGF5JylcbiAgICAgICAgLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLm9uVG9nZ2xlKCkpLFxuICAgIClcbiAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IGl0ZW0uc2V0VGl0bGUoJ1x1NTIzN1x1NjVCMCcpLnNldEljb24oJ3JlZnJlc2gtY3cnKS5vbkNsaWNrKCgpID0+IHRoaXMucmVsb2FkKCkpKVxuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT5cbiAgICAgIGl0ZW0uc2V0VGl0bGUoJ1x1NUYzOVx1NTFGQVx1NzJFQ1x1N0FDQlx1N0E5N1x1NTNFMycpLnNldEljb24oJ21heGltaXplLTInKS5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5wbHVnaW4ub3BlblBvcG91dCgpKSxcbiAgICApXG4gICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PlxuICAgICAgaXRlbS5zZXRUaXRsZSgnXHU1NzI4XHU3Q0ZCXHU3RURGXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU2MjUzXHU1RjAwJykuc2V0SWNvbignZXh0ZXJuYWwtbGluaycpLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnBsdWdpbi5vcGVuSW5Ccm93c2VyKCkpLFxuICAgIClcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25Ub2dnbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcyA9IHRoaXMucGx1Z2luLmdldFN0YXR1cygpXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJykge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3RvcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoKClcbiAgfVxuXG4gIC8qKiBcdTk3NjJcdTY3N0ZcdTYyNTNcdTVGMDBcdTY1RjZcdTc4NkVcdTRGRERcdTY3MERcdTUyQTFcdTU3MjhcdThERDFcdUZGMDhcdTVERjJcdTU3MjhcdThERDFcdTUyMTlcdTYzMDJcdTYzQTVcdUZGMDkgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVTdGFydGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGlmIChzLmtpbmQgPT09ICdzdG9wcGVkJyB8fCBzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnN0YXJ0KClcbiAgICAgIHRoaXMucmVmcmVzaCgpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5nZXRTdGF0dXMoKVxuICAgIGxldCB1aTogVWlTdGF0ZVxuICAgIGxldCBwaWxsVGV4dCA9ICcnXG4gICAgbGV0IHBpbGxDbHMgPSAnJ1xuXG4gICAgaWYgKHMua2luZCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB1aSA9ICdydW5uaW5nJ1xuICAgICAgcGlsbFRleHQgPSBgXHUyNUNGICR7cy5wb3J0fSR7cy5hdHRhY2hlZCA/ICcgXHUwMEI3IFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScgOiAnJ31gXG4gICAgICBwaWxsQ2xzID0gJ2lzLXJ1bm5pbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdzdGFydGluZycpIHtcbiAgICAgIHVpID0gJ3N0YXJ0aW5nJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNUNDIFx1NTQyRlx1NTJBOFx1NEUyRFx1MjAyNidcbiAgICAgIHBpbGxDbHMgPSAnaXMtc3RhcnRpbmcnXG4gICAgfSBlbHNlIGlmIChzLmtpbmQgPT09ICdlcnJvcicpIHtcbiAgICAgIHVpID0gJ2Vycm9yJ1xuICAgICAgcGlsbFRleHQgPSAnXHUyNzE1IFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNSdcbiAgICAgIHBpbGxDbHMgPSAnaXMtZXJyb3InXG4gICAgfSBlbHNlIHtcbiAgICAgIHVpID0gJ3N0b3BwZWQnXG4gICAgICBwaWxsVGV4dCA9ICdcdTI1Q0IgXHU2NzJBXHU4RkQwXHU4ODRDJ1xuICAgICAgcGlsbENscyA9ICdpcy1zdG9wcGVkJ1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHVpXG4gICAgY29uc3QgcnVubmluZyA9IHMua2luZCA9PT0gJ3J1bm5pbmcnIHx8IHMua2luZCA9PT0gJ3N0YXJ0aW5nJ1xuICAgIGlmICh0aGlzLnBpbGxFbCkge1xuICAgICAgdGhpcy5waWxsRWwuc2V0VGV4dChwaWxsVGV4dClcbiAgICAgIHRoaXMucGlsbEVsLmNsYXNzTmFtZSA9IGBkc2gtZG9jay1waWxsICR7cGlsbENsc31gXG4gICAgfVxuICAgIC8vIFx1OTc2Mlx1Njc3Rlx1NTE4NVx1NjMwOVx1OTRBRVx1NTZGRVx1NjgwN1x1OTY4Rlx1NzJCNlx1NjAwMVx1NTIwN1x1NjM2Mlx1RkYwODAuMi41IFx1NTQwQ1x1NkIzRVx1RkYwOVxuICAgIGlmICh0aGlzLnRvZ2dsZUJ0bikge1xuICAgICAgdGhpcy50b2dnbGVCdG4uZW1wdHkoKVxuICAgICAgc2V0SWNvbih0aGlzLnRvZ2dsZUJ0biwgcnVubmluZyA/ICdzcXVhcmUnIDogJ3BsYXknKVxuICAgICAgdGhpcy50b2dnbGVCdG4udGl0bGUgPSBydW5uaW5nID8gJ1x1NTA1Q1x1NkI2MicgOiAnXHU1NDJGXHU1MkE4J1xuICAgIH1cbiAgICAvLyBcdTY4MDdcdTk4OThcdTY4MEZcdTUyQThcdTRGNUNcdTYzMDlcdTk0QUVcdTU2RkVcdTY4MDdcdTk2OEZcdTcyQjZcdTYwMDFcdTUyMDdcdTYzNjJcdUZGMDhhZGRBY3Rpb24gXHU4RkQ0XHU1NkRFXHU3Njg0XHU1MTQzXHU3RDIwXHU1M0VGXHU4OEFCIHNldEljb24gXHU5MUNEXHU3RUQ4XHVGRjA5XG4gICAgaWYgKHRoaXMudG9nZ2xlQWN0aW9uRWwpIHtcbiAgICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwuZW1wdHkoKVxuICAgICAgc2V0SWNvbih0aGlzLnRvZ2dsZUFjdGlvbkVsLCBydW5uaW5nID8gJ3NxdWFyZScgOiAncGxheScpXG4gICAgICB0aGlzLnRvZ2dsZUFjdGlvbkVsLnRpdGxlID0gcnVubmluZyA/ICdcdTUwNUNcdTZCNjInIDogJ1x1NTQyRlx1NTJBOCdcbiAgICAgIHRoaXMudG9nZ2xlQWN0aW9uRWwuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgcnVubmluZyA/ICdcdTUwNUNcdTZCNjInIDogJ1x1NTQyRlx1NTJBOCcpXG4gICAgfVxuXG4gICAgLy8gaWZyYW1lIFx1NEUwRVx1ODk4Nlx1NzZENlx1NUM0MlxuICAgIGlmICh1aSA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICBpZiAodGhpcy5pZnJhbWVFbCAmJiB0aGlzLmlmcmFtZUVsLnNyYyAhPT0gdGhpcy5wbHVnaW4uYmFzZVVybCkge1xuICAgICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICAgIH1cbiAgICAgIHRoaXMuc2hvd092ZXJsYXkobnVsbClcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnc3RhcnRpbmcnKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RhcnRpbmcoKSlcbiAgICB9IGVsc2UgaWYgKHVpID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyRXJyb3Iocy5raW5kID09PSAnZXJyb3InID8gcy5tZXNzYWdlIDogJ1x1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRicpKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dPdmVybGF5KHRoaXMucmVuZGVyU3RvcHBlZCgpKVxuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0gXHU4OTg2XHU3NkQ2XHU1QzQyXHU2RTMyXHU2N0QzIC0tLS0tLS0tLS1cblxuICBwcml2YXRlIHNob3dPdmVybGF5KGNvbnRlbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5vdmVybGF5RWwpIHJldHVyblxuICAgIHRoaXMub3ZlcmxheUVsLmVtcHR5KClcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgdGhpcy5vdmVybGF5RWwuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgICAgIHRoaXMub3ZlcmxheUVsLnJlbW92ZUF0dHJpYnV0ZSgnaGlkZGVuJylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gXHU4RkQwXHU4ODRDXHU0RTJEXHVGRjFBXHU2NjNFXHU1RjBGXHU5NjkwXHU4NUNGXHU4OTg2XHU3NkQ2XHU1QzQyXHVGRjA4XHU1NDI2XHU1MjE5XHU3QTdBXHU3Njg0XHU3RUREXHU1QkY5XHU1QjlBXHU0RjREXHU1QzQyXHU0RjFBXHU2MzIxXHU0RjRGIGlmcmFtZVx1RkYwOVxuICAgICAgdGhpcy5vdmVybGF5RWwuc2V0QXR0cmlidXRlKCdoaWRkZW4nLCAnJylcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclN0YXJ0aW5nKCk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3Bpbm5lcicgfSlcbiAgICBib3guY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtdGl0bGUnLCB0ZXh0OiAnXHU2QjYzXHU1NzI4XHU1NDJGXHU1MkE4XHU1Qjk4XHU2NUI5IERTSCBXZWJcdTIwMjYnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7XG4gICAgICBjbHM6ICdkc2gtZG9jay1zdGF0ZS1zdWInLFxuICAgICAgdGV4dDogJ1x1OTk5Nlx1NkIyMVx1NTQyRlx1NTJBOFx1OTcwMFx1NTIxRFx1NTlDQlx1NTMxNiBwcm9maWxlXHVGRjA4XHU3RUE2IDEwIFx1NzlEMlx1RkYwOVx1RkYxQlx1N0FFRlx1NTNFM1x1ODhBQlx1NTM2MFx1NzUyOFx1NjVGNlx1NUMwNlx1ODFFQVx1NTJBOFx1NjMwMlx1NjNBNVx1NURGMlx1NjcwOVx1NjcwRFx1NTJBMScsXG4gICAgfSlcbiAgICByZXR1cm4gYm94XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBib3ggPSBjcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZScgfSlcbiAgICBjb25zdCBpY29uID0gYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLWljb24nIH0pXG4gICAgc2V0SWNvbihpY29uLCAnYWxlcnQtdHJpYW5nbGUnKVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS10aXRsZScsIHRleHQ6ICdEU0ggXHU1NDJGXHU1MkE4XHU1OTMxXHU4RDI1JyB9KVxuICAgIGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1tc2cnLCB0ZXh0OiBtZXNzYWdlIH0pXG4gICAgY29uc3QgcmV0cnkgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuJywgdGV4dDogJ1x1OTFDRFx1OEJENScgfSlcbiAgICByZXRyeS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RvcHBlZCgpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgYm94ID0gY3JlYXRlRGl2KHsgY2xzOiAnZHNoLWRvY2stc3RhdGUnIH0pXG4gICAgY29uc3QgaWNvbiA9IGJveC5jcmVhdGVEaXYoeyBjbHM6ICdkc2gtZG9jay1zdGF0ZS1pY29uJyB9KVxuICAgIHNldEljb24oaWNvbiwgJ2FuY2hvcicpXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXRpdGxlJywgdGV4dDogJ0RTSCBcdTY3MkFcdThGRDBcdTg4NEMnIH0pXG4gICAgYm94LmNyZWF0ZURpdih7IGNsczogJ2RzaC1kb2NrLXN0YXRlLXN1YicsIHRleHQ6ICdcdTcwQjlcdTUxRkJcdTU0MkZcdTUyQThcdUZGMENcdTYyOEFcdTVCOThcdTY1QjkgRGVlcFNlZWsgSGFybmVzcyBcdTUwNUNcdTk3NjBcdThGREJcdTY3NjUnIH0pXG4gICAgY29uc3Qgc3RhcnQgPSBib3guY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZHNoLWRvY2stc3RhdGUtYnRuIG1vZC1jdGEnLCB0ZXh0OiAnXHU1NDJGXHU1MkE4IERTSCcgfSlcbiAgICBzdGFydC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zdGFydCgpLnRoZW4oKCkgPT4gdGhpcy5yZWZyZXNoKCkpXG4gICAgfVxuICAgIHJldHVybiBib3hcbiAgfVxuXG4gIHByaXZhdGUgcmVsb2FkKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlmcmFtZUVsICYmIHRoaXMuY3VycmVudCA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLmlmcmFtZUVsLnNyYyA9IHRoaXMucGx1Z2luLmJhc2VVcmxcbiAgICB9XG4gIH1cbn1cbiIsICIvKipcbiAqIGN1cnJlbnRWYXVsdC50cyBcdTIwMTRcdTIwMTQgXHU2MjhBXCJcdTVGNTNcdTUyNERcdTcxMjZcdTcwQjkgdmF1bHQgKyBcdTVGNTNcdTUyNERcdTYyNTNcdTVGMDBcdTc2ODRcdTdCMTRcdThCQjBcIlx1OERFOFx1OEZEQlx1N0EwQlx1NTQ0QVx1OEJDOSBEU0ggXHU0RkE3XHUzMDAyXG4gKlxuICogZHNoLWRvY2sgXHU4REQxXHU1NzI4IE9ic2lkaWFuIFx1OEZEQlx1N0EwQlx1OTFDQ1x1RkYwQ1x1ODBGRFx1NjJGRlx1NTIzMFx1NjcwMFx1Njc0M1x1NUEwMVx1NzY4NFx1NUY1M1x1NTI0RCB2YXVsdFx1RkYwOFx1N0E5N1x1NTNFM1x1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NjVGNlx1RkYwQ1xuICogYGFwcC52YXVsdC5nZXROYW1lKClgICsgYEZpbGVTeXN0ZW1BZGFwdGVyLmdldEJhc2VQYXRoKClgXHVGRjA5XHU0RTBFXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU3QjE0XHU4QkIwXG4gKiBcdUZGMDhgYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKClgXHVGRjA5XHUzMDAyRFNIIFx1NzY4NFx1NURFNVx1NTE3N1x1NjNEMlx1NEVGNiBkc2gtdG9vbC1vYnNpZGlhbi12YXVsdFxuICogXHU4REQxXHU1NzI4XHU3MkVDXHU3QUNCIG5vZGUgXHU4RkRCXHU3QTBCXHU5MUNDXHVGRjBDXHU0RTI0XHU4MDA1XHU5MDFBXHU4RkM3XHU0RTAwXHU0RTJBXHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHU4OUUzXHU4MDI2XHU5MDFBXHU0RkUxXHVGRjFBXG4gKlxuICogICA8aG9tZWRpcj4vLmRzaC9jdXJyZW50LXZhdWx0Lmpzb24gICB7IG5hbWUsIHBhdGgsIGFjdGl2ZUZpbGU/LCB1cGRhdGVkQXQgfVxuICpcbiAqIC0gXHU0RjREXHU3RjZFXHU1NkZBXHU1QjlBXHU1NzI4IGB+Ly5kc2hgXHVGRjA4XHU0RTBFIGRzaC1kb2NrIFx1NzY4NCBEU0hfSE9NRSBcdTRFMDlcdTY4NjNcdTZBMjFcdTVGMEZcdTY1RTBcdTUxNzNcdUZGMDlcdUZGMENcdTRFRkJcdTRGNTVcdTZBMjFcdTVGMEZcbiAqICAgXHU0RTBCIERTSCBcdTRGQTdcdTkwRkRcdThCRkJcdTVGOTdcdTUyMzBcdUZGMUJcbiAqIC0gYGFjdGl2ZUZpbGVgIFx1NjYyRiB2YXVsdCBcdTc2RjhcdTVCRjlcdThERUZcdTVGODRcdUZGMDhcdTY1RTAgYC5tZGAgXHU4QkVEXHU0RTQ5XHVGRjBDXHU1MzlGXHU2ODM3XHVGRjA5XHVGRjBDXHU1M0VBXHU1NzI4XHU3ODZFXHU1QjlFXHU2NzA5XHU2MjUzXHU1RjAwXHU3Njg0XG4gKiAgIFx1N0IxNFx1OEJCMFx1NjVGNlx1NTE5OVx1NTE2NVx1RkYxQkRTSCBcdTRGQTdcdTc2ODQgYHZhdWx0X2N1cnJlbnRgL2B2YXVsdF9hY3RpdmVgIFx1NjM2RVx1NkI2NFx1NEVDRVwiXHU3MzFDXHU2NzAwXHU4RkQxXHU2RDNCXHU4REMzXHU1RTkzXCJcbiAqICAgXHU1MzQ3XHU3RUE3XHU0RTNBXCJcdTc3MUZcdTAwQjdcdTVGNTNcdTUyNERcdTVFOTMgKyBcdTVGNTNcdTUyNERcdTdCMTRcdThCQjBcIlx1RkYxQlxuICogLSBcdTU5MUFcdTdBOTdcdTUzRTNcdTU3M0FcdTY2NkZcdUZGMUFcdTZCQ0ZcdTRFMkEgT2JzaWRpYW4gXHU3QTk3XHU1M0UzXHVGRjA4XHU0RTNCXHU3QTk3XHU1M0UzIC8gcG9wb3V0XHVGRjA5XHU5MEZEXHU2NjJGXHU3MkVDXHU3QUNCXHU2RTMyXHU2N0QzXHU4RkRCXHU3QTBCXHVGRjBDXHU1NDA0XG4gKiAgIFx1ODFFQVx1NzZEMVx1NTQyQ1x1ODFFQVx1NURGMVx1NzY4NCB3aW5kb3cgZm9jdXMgXHUyMDE0XHUyMDE0IFx1NjcwMFx1NTQwRVx1ODNCN1x1NUY5N1x1NzEyNlx1NzBCOVx1NzY4NFx1N0E5N1x1NTNFM1x1NTE5OVx1NTE2NVx1RkYwQ1x1NkI2M1x1NjYyRlwiXHU3NTI4XHU2MjM3XHU1RjUzXHU1MjREXHU2QjYzXG4gKiAgIFx1NTcyOFx1NzcwQlx1NzY4NCB2YXVsdFwiXHVGRjFCXG4gKiAtIFx1NTkzMVx1OEQyNVx1OTc1OVx1OUVEOFx1RkYxQVx1NTE5OVx1NEUwRFx1OEZEQlx1RkYwOFx1Njc0M1x1OTY1MC9cdTc4QzFcdTc2RDhcdUZGMDlcdTUzRUEgY29uc29sZS53YXJuXHVGRjBDXHU3RUREXHU0RTBEXHU2MjUzXHU2NUFEXHU2M0QyXHU0RUY2XHU0RTNCXHU2RDQxXHU3QTBCXHVGRjFCXG4gKiAgIFx1NjU4N1x1NEVGNlx1NjM1Rlx1NTc0Ri9cdTdGM0FcdTU5MzFcdTY1RjYgRFNIIFx1NEZBN1x1NTZERVx1OTAwMFx1NTM5Rlx1NjcwOVx1NEZFMVx1NTNGN1x1RkYwQ1x1NTQxMVx1NTQwRVx1NTE3Q1x1NUJCOVx1NEUwRFx1ODhDNSBkc2gtZG9jayBcdTc2ODRcdTU3M0FcdTY2NkZcdTMwMDJcbiAqL1xuXG5pbXBvcnQgeyBGaWxlU3lzdGVtQWRhcHRlciwgdHlwZSBBcHAgfSBmcm9tICdvYnNpZGlhbidcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJ1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbi8qKiBcdTY4MDdcdThCQjBcdTY1ODdcdTRFRjZcdTU2RkFcdTVCOUFcdTRGNERcdTdGNkVcdUZGMUF+Ly5kc2gvY3VycmVudC12YXVsdC5qc29uICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5kc2gnLCAnY3VycmVudC12YXVsdC5qc29uJylcbn1cblxuLyoqIFx1NjgwN1x1OEJCMFx1NjU4N1x1NEVGNlx1NTE4NVx1NUJCOVx1RkYwOERTSCBcdTRGQTdcdTUzRUFcdThCRkIgbmFtZS9wYXRoL2FjdGl2ZUZpbGVcdUZGMEN1cGRhdGVkQXQgXHU0RjlCXHU4QkNBXHU2NUFEXHVGRjA5ICovXG5leHBvcnQgaW50ZXJmYWNlIEN1cnJlbnRWYXVsdE1hcmtlciB7XG4gIG5hbWU6IHN0cmluZ1xuICBwYXRoOiBzdHJpbmdcbiAgLyoqIFx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1N0IxNFx1OEJCMFx1RkYwOHZhdWx0IFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOVx1RkYxQlx1NjVFMFx1NjI1M1x1NUYwMFx1N0IxNFx1OEJCMFx1NjVGNlx1NEUwRFx1NTE5OVx1NkI2NFx1NUI1N1x1NkJCNSAqL1xuICBhY3RpdmVGaWxlPzogc3RyaW5nXG4gIHVwZGF0ZWRBdDogbnVtYmVyXG59XG5cbi8qKlxuICogXHU1MzlGXHU1QjUwXHU1MTk5XHU1MTY1XHU2ODA3XHU4QkIwXHU2NTg3XHU0RUY2XHVGRjFBXHU1MTQ4XHU1MTk5XHU1NDBDXHU3NkVFXHU1RjU1IC50bXAgXHU1MThEIHJlbmFtZVx1RkYwQ1x1OTA3Rlx1NTE0RCBEU0ggXHU0RkE3XHU4QkZCXHU1MjMwXHU1MzRBXHU2MjJBXHU1MTg1XHU1QkI5XHUzMDAyXG4gKiBcdTU5MzFcdThEMjVcdTUzRUFcdTU0NEFcdThCNjZcdUZGMENcdTRFMERcdTYyOUJcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3VycmVudFZhdWx0TWFya2VyKG5hbWU6IHN0cmluZywgdmF1bHRQYXRoOiBzdHJpbmcsIGFjdGl2ZUZpbGU/OiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlID0gY3VycmVudFZhdWx0TWFya2VyUGF0aCgpXG4gICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShmaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBjb25zdCBwYXlsb2FkOiBDdXJyZW50VmF1bHRNYXJrZXIgPSB7IG5hbWUsIHBhdGg6IHZhdWx0UGF0aCwgdXBkYXRlZEF0OiBEYXRlLm5vdygpIH1cbiAgICBpZiAoYWN0aXZlRmlsZSkgcGF5bG9hZC5hY3RpdmVGaWxlID0gYWN0aXZlRmlsZVxuICAgIGNvbnN0IHRtcCA9IGAke2ZpbGV9LnRtcGBcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRtcCwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMikpXG4gICAgZnMucmVuYW1lU3luYyh0bXAsIGZpbGUpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignW2RzaC1kb2NrXSBcdTUxOTlcdTUxNjUgY3VycmVudC12YXVsdCBcdTY4MDdcdThCQjBcdTU5MzFcdThEMjUnLCBlcnIpXG4gIH1cbn1cblxuLyoqXG4gKiBcdTRFQ0UgT2JzaWRpYW4gYXBwIFx1NTNENlx1NUY1M1x1NTI0RCB2YXVsdCBcdTU0MERcdTMwMDFcdTY4MzlcdThERUZcdTVGODRcdTRFMEVcdTVGNTNcdTUyNERcdTYyNTNcdTVGMDBcdTc2ODRcdTdCMTRcdThCQjBcdUZGMUJcdTUzRDZcdTRFMERcdTUyMzBcdThGRDRcdTU2REUgbnVsbFx1MzAwMlxuICpcbiAqIFx1NzUyOCBgaW5zdGFuY2VvZiBGaWxlU3lzdGVtQWRhcHRlcmBcdUZGMDhvYnNpZGlhbi5kLnRzOjI5OTZcdUZGMENcdTY4NENcdTk3NjJcdTdBRUZcdTVCOUVcdTczQjBcdUZGMDlcdTY2RkZcdTRFRTNcbiAqIFx1NjVFN1x1NzY4NCBgYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9YCBcdTVGM0FcdThGNkNcdUZGMUFcdTdDN0JcdTU3OEJcdTVCODlcdTUxNjhcdUZGMENcdTRFMTRcdTc5RkJcdTUyQThcdTdBRUZcbiAqIFx1RkYwOENhcGFjaXRvckFkYXB0ZXJcdUZGMDlcdTgxRUFcdTcxMzZcdThGRDRcdTU2REUgbnVsbFx1MzAwMkZpbGVTeXN0ZW1BZGFwdGVyIFx1NEVDRVx1NUI5OFx1NjVCOSBgb2JzaWRpYW5gXG4gKiBcdTZBMjFcdTU3NTdcdTVCRkNcdTUxNjVcdUZGMDhcdTYzRDJcdTRFRjZcdTc2ODRcdThGRDBcdTg4NENcdTY1RjZcdTVCQkZcdTRFM0JcdTZDRThcdTUxNjVcdUZGMDlcdUZGMENcdTRFMEUgZHNoLWRvY2sgXHU1QjlFXHU5NjQ1XHU3RjE2XHU4QkQxXHU3Njg0IG9ic2lkaWFuQDEuMTMuMVxuICogXHU3QzdCXHU1NzhCXHU0RTAwXHU4MUY0XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50VmF1bHRJbmZvKGFwcDogQXBwKTogeyBuYW1lOiBzdHJpbmc7IHBhdGg6IHN0cmluZzsgYWN0aXZlRmlsZT86IHN0cmluZyB9IHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgYWRhcHRlciA9IGFwcC52YXVsdC5hZGFwdGVyXG4gICAgaWYgKCEoYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyKSkgcmV0dXJuIG51bGxcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk/LnBhdGhcbiAgICBjb25zdCBpbmZvOiB7IG5hbWU6IHN0cmluZzsgcGF0aDogc3RyaW5nOyBhY3RpdmVGaWxlPzogc3RyaW5nIH0gPSB7XG4gICAgICBuYW1lOiBhcHAudmF1bHQuZ2V0TmFtZSgpLFxuICAgICAgcGF0aDogYWRhcHRlci5nZXRCYXNlUGF0aCgpLFxuICAgIH1cbiAgICBpZiAoYWN0aXZlRmlsZSkgaW5mby5hY3RpdmVGaWxlID0gYWN0aXZlRmlsZVxuICAgIHJldHVybiBpbmZvXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRQSxJQUFBQSxtQkFBNkU7QUFDN0Usc0JBQXNCO0FBRXRCLElBQUFD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QUFZLE9BQU8sUUFBUSxLQUFLLEdBQUc7QUFDbEYsV0FBSyxTQUFTLGNBQWM7QUFDNUIsV0FBSyxTQUFTLFVBQVUsT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQTtBQUFBLEVBSUEsTUFBTSxZQUEyQjtBQUMvQixVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsVUFBTSxTQUFTLFVBQVUsZ0JBQWdCLGlCQUFpQjtBQUMxRCxRQUFJLE9BQTZCLE9BQU8sQ0FBQyxLQUFLO0FBQzlDLFFBQUksQ0FBQyxNQUFNO0FBS1QsYUFBTyxVQUFVLGFBQWEsS0FBSztBQUNuQyxVQUFJLENBQUMsS0FBTTtBQUNYLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNuRTtBQUNBLGNBQVUsY0FBYyxJQUFJO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sZ0JBQStCO0FBQ25DLFVBQU0sc0JBQU0sYUFBYSxLQUFLLE9BQU87QUFBQSxFQUN2QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNQSxNQUFNLGFBQTRCO0FBQ2hDLFFBQUk7QUFDRixZQUFNLE9BQU8sS0FBSyxJQUFJLFVBQVUsZUFBZTtBQUMvQyxZQUFNLEtBQUssYUFBYSxFQUFFLE1BQU0sbUJBQW1CLFFBQVEsS0FBSyxDQUFDO0FBQUEsSUFDbkUsU0FBUyxLQUFLO0FBQ1osWUFBTSxNQUFNLGVBQWUsUUFBUSxJQUFJLFVBQVUsT0FBTyxHQUFHO0FBQzNELFVBQUksd0JBQU8scURBQWEsR0FBRyxFQUFFO0FBQUEsSUFDL0I7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJvcyIsICJwYXRoIiwgImVtYmVkZGVkTm9kZVZlcnNpb24iLCAicmVzb2x2ZSIsICJvdXQiLCAiY21kIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiZnMiLCAib3MiLCAicGF0aCJdCn0K
