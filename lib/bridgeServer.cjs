"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/bridgeServer.ts
var bridgeServer_exports = {};
__export(bridgeServer_exports, {
  BridgeError: () => BridgeError,
  createBridgeServer: () => createBridgeServer
});
module.exports = __toCommonJS(bridgeServer_exports);
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
  return new Promise((resolve, reject) => {
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
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
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
      const path = url.pathname;
      const q = url.searchParams;
      if (req.method === "GET" && path === "/health") {
        sendJson(res, 200, { ok: true, version: service.info.version, vault: { name: service.info.name, path: service.info.path } });
        return;
      }
      if (req.method === "GET") {
        if (path === "/v1/current") {
          sendJson(res, 200, service.current());
          return;
        }
        if (path === "/v1/notes") {
          sendJson(res, 200, service.listNotes({
            folder: q.get("folder") ?? void 0,
            all: queryBool(q.get("all")) ?? false,
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path === "/v1/folders") {
          sendJson(res, 200, await service.listFolders({
            folder: q.get("folder") ?? void 0,
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path === "/v1/note") {
          sendJson(res, 200, await service.readNote(requireQuery(q, "path")));
          return;
        }
        if (path === "/v1/metadata") {
          sendJson(res, 200, await service.metadata(requireQuery(q, "path")));
          return;
        }
        if (path === "/v1/frontmatter") {
          sendJson(res, 200, await service.frontmatter(requireQuery(q, "path")));
          return;
        }
        if (path === "/v1/backlinks") {
          sendJson(res, 200, await service.backlinks({
            path: q.get("path") ?? void 0,
            title: q.get("title") ?? void 0,
            format: q.get("format") === "markdown" ? "markdown" : q.get("format") === "all" ? "all" : "wikilink"
          }));
          return;
        }
        if (path === "/v1/search") {
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
        if (path === "/v1/tags") {
          sendJson(res, 200, await service.searchTags({
            tag: requireQuery(q, "tag"),
            folder: q.get("folder") ?? void 0,
            limit: queryNum(q.get("limit")),
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        if (path === "/v1/all-tags") {
          sendJson(res, 200, await service.allTags({
            folder: q.get("folder") ?? void 0,
            ignoreDirs: queryList(q.get("ignore"))
          }));
          return;
        }
        throw new BridgeError(BridgeErrorCode.NOT_FOUND, `\u672A\u77E5\u7AEF\u70B9 ${req.method} ${path}`, 404);
      }
      if (req.method === "POST") {
        const raw = await readBody(req, maxBody);
        if (path === "/v1/write") {
          sendJson(res, 200, await service.writeNote(parseJson(raw)));
          return;
        }
        if (path === "/v1/edit") {
          sendJson(res, 200, await service.editNote(parseJson(raw)));
          return;
        }
        if (path === "/v1/frontmatter") {
          sendJson(res, 200, await service.updateFrontmatter(parseJson(raw)));
          return;
        }
        if (path === "/v1/rename") {
          sendJson(res, 200, await service.rename(parseJson(raw)));
          return;
        }
        if (path === "/v1/trash") {
          sendJson(res, 200, await service.trash(parseJson(raw)));
          return;
        }
        if (path === "/v1/open") {
          sendJson(res, 200, await service.openNote(parseJson(raw)));
          return;
        }
        if (path === "/v1/link") {
          sendJson(res, 200, await service.noteLink(parseJson(raw)));
          return;
        }
        throw new BridgeError(BridgeErrorCode.NOT_FOUND, `\u672A\u77E5\u7AEF\u70B9 ${req.method} ${path}`, 404);
      }
      throw new BridgeError(BridgeErrorCode.METHOD_NOT_ALLOWED, `\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u6CD5 ${req.method}`, 405);
    } catch (err) {
      sendError(res, err);
    }
  });
  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const port = opts.port + i;
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, opts.host, () => {
          server.removeListener("error", reject);
          resolve();
        });
      });
      return {
        port,
        close: () => new Promise((resolve) => server.close(() => resolve()))
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BridgeError,
  createBridgeServer
});
