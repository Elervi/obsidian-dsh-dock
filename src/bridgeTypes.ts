/**
 * bridgeTypes.ts —— Obsidian API 桥的协议类型与错误码（纯类型，零依赖）。
 *
 * 桥把 dsh-dock（Obsidian 渲染进程内，拿得到 app.vault / metadataCache /
 * fileManager / workspace 全套 API）的解析结果，经 127.0.0.1 回环 HTTP 暴露给
 * DSH 侧的工具插件 dsh-tool-obsidian-vault，替换掉工具侧的正则近似实现。
 *
 * 约定（与设计文档 §3 B1 一致）：
 * - 仅监听 127.0.0.1；启动时生成一次性 token，经 DSH_OBSIDIAN_BRIDGE_TOKEN
 *   env 注入 DSH 进程，桥拒绝无 token 请求；
 * - 错误响应统一为 `{ error: { code, message } }`，code 复用工具侧的稳定词表
 *   （VAULT_* / FS_*），客户端可直接映射成 VaultError；
 * - 所有路径均为 vault 根目录的相对路径（/ 分隔，不含前导斜杠）。
 */

/** 桥的服务端实现面（bridgeServer.ts 消费，obsidianService.ts 实现） */
export interface BridgeService {
  /** 服务身份（设置页/健康检查展示） */
  readonly info: { name: string; path: string | undefined; version: string }
  /** 当前 vault 与当前打开的笔记（Obsidian 视角，权威） */
  current(): { name: string; path: string; activeFile?: string; updatedAt: number }
  listNotes(opts: { folder?: string; all?: boolean; ignoreDirs: string[] }): { total: number; notes: BridgeNoteInfo[] }
  listFolders(opts: { folder?: string; ignoreDirs: string[] }): Promise<{ total: number; folders: BridgeFolderStat[] }>
  readNote(rel: string): Promise<{ path: string; content: string; size?: number; mtime?: number }>
  writeNote(req: BridgeWriteRequest): Promise<BridgeWriteResult>
  editNote(req: BridgeEditRequest): Promise<BridgeEditResult>
  /** 综合元信息：frontmatter/tags/aliases/出链/未解析链接数 */
  metadata(rel: string): Promise<BridgeMetadataResult>
  backlinks(req: BridgeBacklinksRequest): Promise<BridgeBacklinksResult>
  search(req: BridgeSearchRequest): Promise<{ total: number; hits: BridgeHit[] }>
  searchTags(req: BridgeTagsRequest): Promise<{ total: number; hits: BridgeTagHit[] }>
  frontmatter(rel: string): Promise<BridgeFrontmatterResult>
  updateFrontmatter(req: BridgeFrontmatterUpdateRequest): Promise<BridgeFrontmatterUpdateResult>
  rename(req: BridgeRenameRequest): Promise<BridgeRenameResult>
  /** 回收站删除（fileManager.trashFile，旧版降级 vault.trash） */
  trash(req: BridgeTrashRequest): Promise<BridgeTrashResult>
  /** 在 Obsidian 中打开/聚焦笔记（workspace.openLinkText） */
  openNote(req: BridgeOpenRequest): Promise<BridgeOpenResult>
  /** 全库标签聚合（getAllTags，Obsidian 标签面板同款） */
  allTags(opts: { folder?: string; ignoreDirs: string[] }): Promise<BridgeAllTagsResult>
  /** 生成指向笔记的标准链接文本（generateMarkdownLink，遵循用户链接设置） */
  noteLink(req: BridgeLinkRequest): Promise<BridgeLinkResult>
}

export interface BridgeVaultInfo {
  name: string
  path: string
  activeFile?: string
  updatedAt: number
}

export interface BridgeNoteInfo {
  path: string
  size?: number
  /** 非 .md 文件才有（all=true 时） */
  extension?: string
}

export interface BridgeFolderStat {
  /** vault 相对文件夹路径；'' 为根 */
  path: string
  /** 该文件夹直接包含的 .md 笔记数 */
  notes: number
}

export interface BridgeWriteRequest {
  path: string
  content: string
  overwrite?: boolean
  unique?: boolean
  /** 'write'（默认，新建或覆盖）| 'append'（追加，要求已存在） */
  op?: 'write' | 'append'
}

export interface BridgeWriteResult {
  path: string
  operation: 'create' | 'update' | 'append'
  addedChars?: number
  /** 写后文件字节数（UTF-8） */
  bytes?: number
  /** append 后的完整正文（供客户端算 bytes） */
  after?: string
}

export interface BridgeEditRequest {
  path: string
  old_string: string
  new_string: string
  replace_all?: boolean
}

export interface BridgeEditResult {
  path: string
  before: string
  after: string
  matches: number
}

/** 一条 wikilink/嵌入出链（body 为 [[...]] 的内文，保留 #锚点 与 |别名） */
export interface BridgeLinkInfo {
  body: string
  embedded: boolean
}

/** 一条 markdown `[text](target)` 出链 */
export interface BridgeMarkdownLink {
  target: string
  text: string
}

export interface BridgeMetadataResult {
  path: string
  size?: number
  mtime?: number
  frontmatter: { present: boolean; fields: Array<{ key: string; value: string }> }
  /** 内联 #tag 与 frontmatter tags，无前导 # */
  tags: string[]
  aliases: string[]
  wikilinks: BridgeLinkInfo[]
  markdown: BridgeMarkdownLink[]
  /** wikilink/嵌入/markdown 中解析不到目标笔记的数量 */
  unresolved: number
}

export interface BridgeBacklinksRequest {
  /** 精确目标路径（不含 .md）；与 title 二选一，path 优先 */
  path?: string
  /** 按标题（basename stem）匹配；同名时取最短路径并标记 ambiguous */
  title?: string
  format?: 'wikilink' | 'markdown' | 'all'
}

export interface BridgeHit {
  path: string
  snippet: string
}

export interface BridgeBacklinksResult {
  total: number
  backlinks: BridgeHit[]
  target?: string
  ambiguous?: boolean
}

export interface BridgeSearchRequest {
  q: string
  folder?: string
  limit?: number
  regex?: boolean
  case_sensitive?: boolean
  match_all?: boolean
  ignoreDirs: string[]
}

export interface BridgeTagHit {
  path: string
  tags: string[]
}

export interface BridgeTagsRequest {
  tag: string
  folder?: string
  limit?: number
  ignoreDirs: string[]
}

export interface BridgeFrontmatterResult {
  path: string
  present: boolean
  valid: boolean
  fields: Array<{ key: string; value: string }>
  issues: string[]
}

export interface BridgeFrontmatterChange {
  op: 'set' | 'delete'
  key: string
  value?: string
}

export interface BridgeFrontmatterUpdateRequest {
  path: string
  set?: Record<string, string>
  delete?: string[]
}

export interface BridgeFrontmatterUpdateResult {
  path: string
  created: boolean
  changes: BridgeFrontmatterChange[]
  before: Array<{ key: string; value: string }>
  after: Array<{ key: string; value: string }>
  issues: string[]
}

export interface BridgeRenameRequest {
  old_path: string
  new_path: string
  keep_old?: 'keep' | 'stub'
}

export interface BridgeRenameResult {
  old_path: string
  new_path: string
  totalLinks: number
  updated: Array<{ path: string; count: number }>
  old_handling: 'kept' | 'stubbed'
}

export interface BridgeTrashRequest {
  path: string
}

export interface BridgeTrashResult {
  path: string
  trashed: true
}

export interface BridgeOpenRequest {
  path: string
}

export interface BridgeOpenResult {
  path: string
  opened: true
}

export interface BridgeTagStat {
  tag: string
  count: number
}

export interface BridgeAllTagsResult {
  total: number
  tags: BridgeTagStat[]
}

export interface BridgeLinkRequest {
  path: string
  /** 来源笔记（vault 相对路径）：生成相对它的 markdown 链接；省略 = 根 */
  source?: string
}

export interface BridgeLinkResult {
  path: string
  link: string
  format: 'wikilink' | 'markdown'
}

/**
 * 稳定错误码：工具侧已有 VAULT_* / FS_* 词表（dsh-tool-obsidian-vault
 * src/errors.ts），桥直接复用同一词汇，客户端无需翻译；桥自身的协议错误
 * 用 BRIDGE_* 前缀。
 */
export const BridgeErrorCode = {
  BAD_REQUEST: 'BRIDGE_BAD_REQUEST',
  UNAUTHORIZED: 'BRIDGE_UNAUTHORIZED',
  INTERNAL: 'BRIDGE_INTERNAL',
  NOT_FOUND: 'BRIDGE_NOT_FOUND',
  METHOD_NOT_ALLOWED: 'BRIDGE_METHOD_NOT_ALLOWED',
  TOO_LARGE: 'BRIDGE_BODY_TOO_LARGE',
  NOTE_NOT_FOUND: 'VAULT_NOTE_NOT_FOUND',
  NOT_FILE: 'VAULT_NOT_FILE',
  EXISTS: 'VAULT_EXISTS',
  PATH_INVALID: 'VAULT_PATH_INVALID',
  INVALID_ARGS: 'VAULT_INVALID_ARGS',
  EDIT_NOT_FOUND: 'FS_EDIT_NOT_FOUND',
  AMBIGUOUS_EDIT: 'FS_AMBIGUOUS_EDIT',
  FRONTMATTER_NO_FIELDS: 'VAULT_FRONTMATTER_NO_FIELDS',
  FRONTMATTER_MULTILINE: 'VAULT_FRONTMATTER_MULTILINE',
  REGEX_INVALID: 'VAULT_REGEX_INVALID',
  RENAME_UPDATE_FAILED: 'VAULT_RENAME_UPDATE_FAILED',
  RENAME_STUB_FAILED: 'VAULT_RENAME_STUB_FAILED',
} as const

export type BridgeErrorCode = (typeof BridgeErrorCode)[keyof typeof BridgeErrorCode]
