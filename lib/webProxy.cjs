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

// src/webProxy.ts
var webProxy_exports = {};
__export(webProxy_exports, {
  createWebProxy: () => createWebProxy,
  resolveBrowserSecret: () => resolveBrowserSecret
});
module.exports = __toCommonJS(webProxy_exports);
var import_node_crypto = require("node:crypto");
var fs = __toESM(require("node:fs"), 1);
var http = __toESM(require("node:http"), 1);
var net = __toESM(require("node:net"), 1);
var COOKIE_PREFIX = "dsh-auth-";
var COOKIE_PAYLOAD_VERSION = 1;
var SECRET_BYTES = 32;
var AUTH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
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
function authorityOf(host, port) {
  return new URL(`http://${host}:${String(port)}`).host;
}
function cookieName(authority) {
  return COOKIE_PREFIX + encodeBase64Url((0, import_node_crypto.createHash)("sha256").update(authority).digest());
}
function mintCookieValue(secret, authority, now) {
  const payload = {
    version: COOKIE_PAYLOAD_VERSION,
    authority,
    issuedAt: now,
    expiresAt: now + AUTH_MAX_AGE_MS
  };
  const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = (0, import_node_crypto.createHmac)("sha256", secret).update(body).digest();
  return `v1.${body}.${encodeBase64Url(sig)}`;
}
function cookieHeader(secret, authority) {
  return `${cookieName(authority)}=${mintCookieValue(secret, authority, Date.now())}`;
}
function readSecretFrom(credentialPath) {
  try {
    const text = fs.readFileSync(credentialPath, "utf8");
    const m = /client-connection\/browser-session:[\s\S]*?secret:\s*([A-Za-z0-9_-]+)/.exec(text);
    if (!m) return void 0;
    const secret = decodeBase64Url(m[1]);
    return secret !== void 0 && secret.byteLength === SECRET_BYTES ? secret : void 0;
  } catch {
    return void 0;
  }
}
function resolveBrowserSecret(candidates) {
  for (const candidate of candidates) {
    const secret = readSecretFrom(candidate);
    if (secret !== void 0) return secret;
  }
  return void 0;
}
function probeRequiresAuth(host, port, timeoutMs = 3e3) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: "/", timeout: timeoutMs }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode === 401));
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}
async function createWebProxy(opts) {
  const authority = authorityOf(opts.targetHost, opts.targetPort);
  const requiresAuth = await probeRequiresAuth(opts.targetHost, opts.targetPort);
  const secret = resolveBrowserSecret(opts.credentialPaths);
  if (requiresAuth && secret === void 0) {
    throw new Error(
      `webProxy: \u76EE\u6807 dsh web \u9700\u8981\u6D4F\u89C8\u5668\u9274\u6743\uFF0C\u4F46\u672A\u627E\u5230\u4F1A\u8BDD\u7B7E\u540D\u5BC6\u94A5\uFF08\u8BD5\u8FC7: ${JSON.stringify(opts.credentialPaths)}\uFF09\u3002\u8BF7\u786E\u8BA4\u51ED\u8BC1\u5E93\u8DEF\u5F84\uFF0C\u6216\u6539\u7528\u300C\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u300D`
    );
  }
  const runtime = {
    authority,
    targetHost: opts.targetHost,
    targetPort: opts.targetPort,
    secret: secret ?? null,
    sockets: /* @__PURE__ */ new Set(),
    agent: new http.Agent({ keepAlive: true, maxSockets: 256 })
  };
  const server = http.createServer((req, res) => handleRequest(runtime, req, res));
  server.on("upgrade", (req, socket, head) => handleUpgrade(runtime, req, socket, head));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port, opts.host, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : opts.port;
  return {
    host: opts.host,
    port,
    url: `http://${opts.host}:${String(port)}/`,
    close: () => closeProxy(server, runtime)
  };
}
function handleRequest(runtime, req, res) {
  const headers = buildUpstreamHeaders(runtime, req.headers);
  const upstream = http.request(
    {
      host: runtime.targetHost,
      port: runtime.targetPort,
      method: req.method,
      path: req.url,
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
  if (runtime.secret !== null) headers.cookie = cookieHeader(runtime.secret, runtime.authority);
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
  if (runtime.secret !== null) headers.cookie = cookieHeader(runtime.secret, runtime.authority);
  if (headers.origin !== void 0) headers.origin = `http://${runtime.authority}`;
  headers["sec-fetch-site"] = "same-origin";
  return headers;
}
function handleUpgrade(runtime, req, socket, head) {
  runtime.sockets.add(socket);
  socket.on("close", () => runtime.sockets.delete(socket));
  const headers = buildUpgradeHeaders(runtime, req.headers);
  const lines = [`${req.method} ${req.url} HTTP/1.1`];
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
  return new Promise((resolve) => {
    for (const sock of runtime.sockets) {
      try {
        sock.destroy();
      } catch {
      }
    }
    runtime.sockets.clear();
    runtime.agent.destroy();
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createWebProxy,
  resolveBrowserSecret
});
