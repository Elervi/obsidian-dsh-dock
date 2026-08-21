/**
 * obsidianService.ts —— 用 Obsidian 官方 API 实现 {@link BridgeService}。
 *
 * 这是桥的「真相源」：app.vault（读写/枚举）、app.metadataCache（出链/嵌入/
 * 标签/frontmatter 解析、链接解析）、app.fileManager（重命名自动更新引用、
 * 原子 frontmatter 修改）、app.workspace（当前笔记）。工具侧的"正则近似"
 * （wikilink 解析、frontmatter 行级解析、tag 提取、反向链接扫描）在这里全部
 * 换成官方解析结果。
 *
 * 本文件是唯一 import 'obsidian' 的桥文件；bridgeServer.ts 保持纯 Node 可测。
 * 所有入参路径均按 vault 相对路径校验（拒绝绝对路径/.. 穿越/盘符），
 * 与工具侧 noteRelPath 语义一致（双端防御）。
 */

import { App, FileSystemAdapter, TFile, getAllTags, normalizePath } from 'obsidian'
import { BridgeError } from './bridgeServer.js'
import { BridgeErrorCode } from './bridgeTypes.js'
import type {
  BridgeAllTagsResult,
  BridgeBacklinksRequest,
  BridgeBacklinksResult,
  BridgeEditRequest,
  BridgeEditResult,
  BridgeFolderStat,
  BridgeFrontmatterResult,
  BridgeFrontmatterUpdateRequest,
  BridgeFrontmatterUpdateResult,
  BridgeHit,
  BridgeLinkInfo,
  BridgeLinkRequest,
  BridgeLinkResult,
  BridgeMarkdownLink,
  BridgeMetadataResult,
  BridgeNoteInfo,
  BridgeOpenRequest,
  BridgeOpenResult,
  BridgeRenameRequest,
  BridgeRenameResult,
  BridgeSearchRequest,
  BridgeService,
  BridgeTagHit,
  BridgeTagsRequest,
  BridgeTrashRequest,
  BridgeTrashResult,
  BridgeWriteRequest,
  BridgeWriteResult,
} from './bridgeTypes.js'

// ---------------------------------------------------------------------------
// 纯函数工具（与 dsh-tool-obsidian-vault/src/vault.ts 语义对齐）
// ---------------------------------------------------------------------------

/** 校验并归一化 vault 相对笔记路径：拒绝空/绝对/盘符/.. 穿越，补 .md 后缀。 */
function noteRel(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') throw new BridgeError(BridgeErrorCode.PATH_INVALID, '笔记路径不能为空', 400)
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    throw new BridgeError(BridgeErrorCode.PATH_INVALID, `笔记路径必须是 vault 相对路径（/ 分隔，不含盘符）：${trimmed}`, 400)
  }
  const segments = trimmed.split(/[\\/]+/).filter((s) => s !== '' && s !== '.')
  if (segments.includes('..')) {
    throw new BridgeError(BridgeErrorCode.PATH_INVALID, `笔记路径不能包含 .. 段：${trimmed}`, 400)
  }
  const joined = normalizePath(segments.join('/'))
  if (joined === '') throw new BridgeError(BridgeErrorCode.PATH_INVALID, '笔记路径不能为空', 400)
  const noExt = joined.replace(/\.md$/, '')
  const base = noExt.split('/').pop() ?? ''
  if (noExt === '' || base === '' || base === '.') {
    throw new BridgeError(BridgeErrorCode.PATH_INVALID, `笔记路径无效（缺少文件名）：${trimmed}`, 400)
  }
  return noExt + '.md'
}

/** basename stem（无目录、无 .md） */
function stemOf(rel: string): string {
  return (rel.replace(/\.md$/, '').split('/').pop() ?? '') || rel
}

/** 该路径是否位于被忽略目录（点目录或用户 ignoreDirs）内 */
function inIgnoredDir(rel: string, ignoreDirs: readonly string[]): boolean {
  const dirs = rel.split('/').slice(0, -1)
  return dirs.some((d) => d.startsWith('.') || ignoreDirs.includes(d))
}

/** folder 前缀过滤（'' = 全部） */
function inFolder(rel: string, folder: string | undefined): boolean {
  if (!folder) return true
  const prefix = folder.replace(/^\/+/, '').replace(/\/+$/, '')
  if (prefix === '') return true
  return rel === prefix || rel.startsWith(prefix + '/')
}

/** frontmatter 值 → 工具侧 schema 的字符串表示 */
function stringifyFmValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return `[${v.map((x) => String(x)).join(', ')}]`
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

/** 工具侧传入的单行 YAML 标量 → JS 值（Obsidian 序列化用） */
function parseFmScalar(s: string): unknown {
  const v = s.trim()
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null' || v === '~') return null
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1)
  }
  return v
}

/** frontmatter 的 tags/tag 属性 → string[] */
function fmTagsOf(frontmatter: Record<string, unknown> | undefined): string[] {
  if (!frontmatter) return []
  const out: string[] = []
  for (const key of ['tags', 'tag']) {
    const v = frontmatter[key]
    if (Array.isArray(v)) out.push(...v.map((x) => String(x)))
    else if (typeof v === 'string' && v.trim()) out.push(v.trim())
  }
  return out
}

/** frontmatter 的 aliases 属性 → string[] */
function fmAliasesOf(frontmatter: Record<string, unknown> | undefined): string[] {
  if (!frontmatter) return []
  const v = frontmatter['aliases']
  if (Array.isArray(v)) return v.map((x) => String(x)).filter((x) => x.length > 0)
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}

/** 是否 wikilink/嵌入写法（`[[…]]` / `![[…]]`）；否则视为 markdown 链接 */
function isWikilink(original: string): boolean {
  return original.startsWith('[[') || original.startsWith('![')
}

/** `![[a|b]]` → `a|b`；`[[a]]` → `a` */
function wikilinkBody(original: string): string {
  const inner = original.startsWith('![') ? original.slice(3) : original.slice(2)
  return inner.replace(/\]\]$/, '').trim()
}

/** 外部 URL（http:/mailto: 等），工具侧对这类 markdown 链接不计数 */
function isExternalUrl(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) && !/^[a-z]:[\\/]/i.test(target)
}

const MARKDOWN_LINK_RE = /^\[([^\]]*)\]\(([^)]*)\)$/

/** `[text](target)` → { text, target }（尖括号形式剥离 < >） */
function parseMarkdownLink(original: string): { target: string; text: string } {
  const m = MARKDOWN_LINK_RE.exec(original)
  if (!m) return { target: original, text: '' }
  let target = m[2]!.trim()
  if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1)
  return { target, text: m[1] ?? '' }
}

/** 命中片段（与工具侧 excerptAround 相同半径 80） */
function excerptAround(text: string, index: number, queryLen: number, radius = 80): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + queryLen + radius)
  const before = start > 0 ? '…' : ''
  const after = end < text.length ? '…' : ''
  return `${before}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${after}`
}

/** frontmatter → 字段列表（键序保持，值字符串化） */
function fieldsOf(frontmatter: Record<string, unknown> | undefined): Array<{ key: string; value: string }> {
  if (!frontmatter) return []
  return Object.entries(frontmatter).map(([key, value]) => ({ key, value: stringifyFmValue(value) }))
}

// ---------------------------------------------------------------------------
// Obsidian 实现
// ---------------------------------------------------------------------------

export class ObsidianBridgeService implements BridgeService {
  readonly info: { name: string; path: string | undefined; version: string }

  constructor(
    private readonly app: App,
    version: string,
  ) {
    this.info = { name: app.vault.getName(), path: this.vaultPath(), version }
  }

  private vaultPath(): string | undefined {
    const adapter = this.app.vault.adapter
    return adapter instanceof FileSystemAdapter ? adapter.getBasePath() : undefined
  }

  // ------------------------------------------------------------- 只读

  current(): { name: string; path: string; activeFile?: string; updatedAt: number } {
    const activeFile = this.app.workspace.getActiveFile()?.path
    const result: { name: string; path: string; activeFile?: string; updatedAt: number } = {
      name: this.app.vault.getName(),
      path: this.info.path ?? '',
      updatedAt: Date.now(),
    }
    if (activeFile) result.activeFile = activeFile
    return result
  }

  /** Obsidian 视角的文件集（getMarkdownFiles / getFiles），按 ignoreDirs + folder 过滤 */
  private vaultFiles(opts: { folder?: string; all?: boolean; ignoreDirs: string[] }): TFile[] {
    const files = opts.all ? this.app.vault.getFiles() : this.app.vault.getMarkdownFiles()
    return files.filter(
      (f) => !inIgnoredDir(f.path, opts.ignoreDirs) && inFolder(f.path, opts.folder),
    )
  }

  private fileOf(rel: string): TFile {
    const relN = noteRel(rel)
    const f = this.app.vault.getAbstractFileByPath(relN)
    if (!f) throw new BridgeError(BridgeErrorCode.NOTE_NOT_FOUND, `笔记不存在：${relN}`, 404)
    if (!(f instanceof TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `路径不是文件：${relN}`, 400)
    return f
  }

  listNotes(opts: { folder?: string; all?: boolean; ignoreDirs: string[] }): { total: number; notes: BridgeNoteInfo[] } {
    const notes = this.vaultFiles(opts).map((f) => {
      const item: BridgeNoteInfo = { path: f.path, size: f.stat.size }
      if (opts.all) {
        const dot = f.path.lastIndexOf('.')
        item.extension = f.path.endsWith('.md') ? 'md' : dot > 0 ? f.path.slice(dot + 1).toLowerCase() : ''
      }
      return item
    })
    return { total: notes.length, notes }
  }

  async listFolders(opts: { folder?: string; ignoreDirs: string[] }): Promise<{ total: number; folders: BridgeFolderStat[] }> {
    const counts = new Map<string, number>()
    counts.set('', 0)
    const adapter = this.app.vault.adapter
    const walk = async (dir: string, rel: string): Promise<void> => {
      let list: { files: string[]; folders: string[] }
      try {
        list = await adapter.list(dir)
      } catch {
        return
      }
      for (const folder of list.folders) {
        const name = (folder.split('/').pop() ?? '').replace(/^\/+/, '')
        if (name.startsWith('.') || opts.ignoreDirs.includes(name)) continue
        const relDir = rel === '' ? name : `${rel}/${name}`
        counts.set(relDir, 0)
        await walk(folder, relDir)
      }
      for (const file of list.files) {
        if (file.endsWith('.md')) counts.set(rel, (counts.get(rel) ?? 0) + 1)
      }
    }
    await walk('', '')
    let folders: BridgeFolderStat[] = [...counts.entries()].map(([path, notes]) => ({ path, notes }))
    if (opts.folder) {
      const prefix = opts.folder.replace(/^\/+/, '').replace(/\/+$/, '')
      folders = folders.filter((f) => f.path === prefix || f.path.startsWith(prefix + '/'))
    }
    folders.sort((a, b) => a.path.localeCompare(b.path))
    return { total: folders.length, folders }
  }

  async readNote(rel: string): Promise<{ path: string; content: string; size?: number; mtime?: number }> {
    const file = this.fileOf(rel)
    const content = await this.app.vault.cachedRead(file)
    return { path: file.path, content, size: file.stat.size, mtime: file.stat.mtime }
  }

  async metadata(rel: string): Promise<BridgeMetadataResult> {
    const file = this.fileOf(rel)
    const cache = this.app.metadataCache.getFileCache(file)
    const frontmatter = cache?.frontmatter
    const inlineTags = (cache?.tags ?? []).map((t) => t.tag.replace(/^#/, '')).filter((t) => t.length > 0)
    const tags = [...new Set([...inlineTags, ...fmTagsOf(frontmatter)])]
    const aliases = fmAliasesOf(frontmatter)

    const wikilinks: BridgeLinkInfo[] = []
    const markdown: BridgeMarkdownLink[] = []
    let unresolved = 0
    const countUnresolved = (dest: TFile | null): void => {
      if (!dest) unresolved++
    }
    for (const link of cache?.links ?? []) {
      const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path)
      countUnresolved(dest)
      if (isWikilink(link.original)) {
        wikilinks.push({ body: wikilinkBody(link.original), embedded: false })
      } else {
        const md = parseMarkdownLink(link.original)
        if (!isExternalUrl(md.target)) markdown.push(md)
      }
    }
    for (const emb of cache?.embeds ?? []) {
      countUnresolved(this.app.metadataCache.getFirstLinkpathDest(emb.link, file.path))
      wikilinks.push({ body: wikilinkBody(emb.original), embedded: true })
    }

    return {
      path: file.path,
      size: file.stat.size,
      mtime: file.stat.mtime,
      frontmatter: { present: frontmatter !== undefined, fields: fieldsOf(frontmatter) },
      tags,
      aliases,
      wikilinks,
      markdown,
      unresolved,
    }
  }

  async frontmatter(rel: string): Promise<BridgeFrontmatterResult> {
    const meta = await this.metadata(rel)
    return {
      path: meta.path,
      present: meta.frontmatter.present,
      valid: true,
      fields: meta.frontmatter.fields,
      issues: [],
    }
  }

  async backlinks(req: BridgeBacklinksRequest): Promise<BridgeBacklinksResult> {
    const format = req.format ?? 'wikilink'
    let targetRel: string | undefined
    let ambiguous = false
    if (req.path && req.path.trim()) {
      targetRel = this.fileOf(req.path).path
    } else if (req.title && req.title.trim()) {
      const title = req.title.trim()
      const candidates = this.app.vault
        .getMarkdownFiles()
        .filter((f) => stemOf(f.path).toLowerCase() === title.toLowerCase())
      ambiguous = candidates.length > 1
      candidates.sort((a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path))
      targetRel = candidates[0]?.path
    } else {
      throw new BridgeError(BridgeErrorCode.INVALID_ARGS, 'path 与 title 至少提供其一', 400)
    }

    if (!targetRel) {
      return { total: 0, backlinks: [], target: req.title, ambiguous }
    }
    const targetKey = targetRel.toLowerCase()
    const targetStem = stemOf(targetRel).toLowerCase()
    const checkWikilink = format === 'wikilink' || format === 'all'
    const checkMarkdown = format === 'markdown' || format === 'all'

    const hits: BridgeHit[] = []
    for (const source of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(source)
      if (!cache) continue
      let hit: BridgeHit | undefined
      const consider = (link: { link: string; original: string }, isEmbed: boolean): boolean => {
        const md = !isWikilink(link.original) && !isEmbed
        if (md && !checkMarkdown) return false
        if (!md && !checkWikilink) return false
        const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, source.path)
        if (dest) return dest.path.toLowerCase() === targetKey
        // 未解析链接：按裸目标路径 / stem 匹配
        if (req.path) {
          return link.link.replace(/\.md$/i, '').toLowerCase() === targetKey.replace(/\.md$/i, '')
        }
        return (
          stemOf(link.link).toLowerCase() === targetStem
          || link.link.replace(/\.md$/i, '').toLowerCase() === targetKey.replace(/\.md$/i, '')
        )
      }
      for (const link of cache.links ?? []) {
        if (consider(link, false)) {
          hit = await this.snippetHit(source, link)
          break
        }
      }
      if (!hit && checkWikilink) {
        for (const emb of cache.embeds ?? []) {
          if (consider(emb, true)) {
            hit = await this.snippetHit(source, emb)
            break
          }
        }
      }
      if (hit) hits.push(hit)
    }
    const result: BridgeBacklinksResult = {
      total: hits.length,
      backlinks: hits,
      target: req.path ? targetRel.replace(/\.md$/, '') : req.title,
    }
    if (ambiguous) result.ambiguous = true
    return result
  }

  private async snippetHit(
    source: TFile,
    link: { link: string; original: string; position?: { start?: { offset?: number } } },
  ): Promise<BridgeHit> {
    const content = await this.app.vault.cachedRead(source)
    const offset = link.position?.start?.offset ?? content.indexOf(link.original)
    return {
      path: source.path,
      snippet: offset >= 0 ? excerptAround(content, offset, Math.max(link.original.length, 1)) : '链接命中',
    }
  }

  async search(req: BridgeSearchRequest): Promise<{ total: number; hits: BridgeHit[] }> {
    const q = req.q.trim()
    if (q === '') throw new BridgeError(BridgeErrorCode.INVALID_ARGS, 'query 不能为空', 400)
    const regex = req.regex ?? false
    const caseSensitive = req.case_sensitive ?? false
    const matchAll = req.match_all ?? false
    let re: RegExp | undefined
    if (regex) {
      try {
        re = new RegExp(q, caseSensitive ? '' : 'i')
      } catch (err) {
        throw new BridgeError(
          BridgeErrorCode.REGEX_INVALID,
          `正则无效：${q}（${err instanceof Error ? err.message : String(err)}）`,
          400,
        )
      }
    }
    const tokens = !regex && matchAll ? q.split(/\s+/).filter((t) => t.length > 0) : undefined
    const limit = Math.max(1, Math.min(req.limit ?? 20, 200))
    const files = this.vaultFiles({ folder: req.folder, all: false, ignoreDirs: req.ignoreDirs })
    const hits: BridgeHit[] = []
    for (const file of files) {
      if (hits.length >= limit) break
      let content: string
      try {
        content = await this.app.vault.cachedRead(file)
      } catch {
        continue
      }
      const path = file.path
      const text = content
      const haystack = caseSensitive ? `${path}\n${text}` : `${path}\n${text}`.toLowerCase()
      let nameMatch = false
      let bodyIndex = -1
      let matchLen = 0
      if (regex && re) {
        const m = re.exec(text)
        if (m) {
          bodyIndex = m.index
          matchLen = m[0].length
        }
        nameMatch = re.test(path)
      } else if (tokens) {
        nameMatch = tokens.every((t) => haystack.includes(caseSensitive ? t : t.toLowerCase()))
        if (nameMatch) {
          for (const t of tokens) {
            const idx = (caseSensitive ? text : text.toLowerCase()).indexOf(caseSensitive ? t : t.toLowerCase())
            if (idx >= 0) {
              bodyIndex = idx
              matchLen = t.length
              break
            }
          }
        }
      } else {
        const needle = caseSensitive ? q : q.toLowerCase()
        nameMatch = path.includes(needle) || haystack.includes(needle)
        bodyIndex = (caseSensitive ? text : text.toLowerCase()).indexOf(needle)
        matchLen = q.length
      }
      if ((nameMatch || bodyIndex >= 0) && hits.length < limit) {
        hits.push({
          path,
          snippet: bodyIndex >= 0 ? excerptAround(text, bodyIndex, Math.max(matchLen, 1)) : '文件名命中（正文无匹配）',
        })
      }
    }
    return { total: hits.length, hits }
  }

  async searchTags(req: BridgeTagsRequest): Promise<{ total: number; hits: BridgeTagHit[] }> {
    const q = req.tag.trim().toLowerCase()
    if (q === '') throw new BridgeError(BridgeErrorCode.INVALID_ARGS, 'tag 不能为空', 400)
    const limit = Math.max(1, Math.min(req.limit ?? 20, 200))
    const hits: BridgeTagHit[] = []
    for (const file of this.vaultFiles({ folder: req.folder, all: false, ignoreDirs: req.ignoreDirs })) {
      if (hits.length >= limit) break
      const cache = this.app.metadataCache.getFileCache(file)
      const inline = (cache?.tags ?? []).map((t) => t.tag.replace(/^#/, '')).filter((t) => t.length > 0)
      const all = [...new Set([...inline, ...fmTagsOf(cache?.frontmatter)])]
      const matched = all
        .filter((t) => {
          const l = t.toLowerCase()
          return l === q || l.startsWith(q + '/')
        })
        .sort()
      if (matched.length > 0) hits.push({ path: file.path, tags: matched })
    }
    return { total: hits.length, hits }
  }

  // ------------------------------------------------------------- 写入

  async writeNote(req: BridgeWriteRequest): Promise<BridgeWriteResult> {
    const rel = noteRel(req.path)
    const existing = this.app.vault.getAbstractFileByPath(rel)
    const byteLen = (s: string): number => Buffer.byteLength(s, 'utf8')

    // append：要求已存在（与工具侧语义一致）
    if (req.op === 'append') {
      if (!existing) throw new BridgeError(BridgeErrorCode.NOTE_NOT_FOUND, `笔记不存在：${rel}（如需新建请用 vault_create_note）`, 404)
      if (!(existing instanceof TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `路径不是文件：${rel}`, 400)
      const current = await this.app.vault.cachedRead(existing)
      const glued = current === '' || current.endsWith('\n') || req.content.startsWith('\n')
        ? current + req.content
        : current + '\n' + req.content
      await this.app.vault.modify(existing, glued)
      return { path: rel, operation: 'append', addedChars: req.content.length, bytes: byteLen(glued), after: glued }
    }

    if (existing) {
      if (!(existing instanceof TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `路径已存在但不是文件：${rel}`, 400)
      if (req.unique) {
        // Obsidian 风格唯一命名：`name 1.md`、`name 2.md`…
        const noExt = rel.replace(/\.md$/, '')
        const dir = noExt.includes('/') ? noExt.slice(0, noExt.lastIndexOf('/')) : ''
        const base = noExt.split('/').pop() ?? 'name'
        let i = 1
        let candidate = dir !== '' ? `${dir}/${base} ${i}.md` : `${base} ${i}.md`
        while (this.app.vault.getAbstractFileByPath(candidate)) {
          i++
          candidate = dir !== '' ? `${dir}/${base} ${i}.md` : `${base} ${i}.md`
        }
        await this.app.vault.create(candidate, req.content)
        return { path: candidate, operation: 'create', bytes: byteLen(req.content) }
      }
      if (!req.overwrite) {
        throw new BridgeError(BridgeErrorCode.EXISTS, `笔记已存在：${rel}（如需覆盖请传 overwrite: true，或传 unique: true 生成唯一名）`, 409)
      }
      await this.app.vault.modify(existing, req.content)
      return { path: rel, operation: 'update', bytes: byteLen(req.content) }
    }

    await this.app.vault.create(rel, req.content)
    return { path: rel, operation: 'create', bytes: byteLen(req.content) }
  }

  async editNote(req: BridgeEditRequest): Promise<BridgeEditResult> {
    const file = this.fileOf(req.path)
    if (req.old_string === '') throw new BridgeError(BridgeErrorCode.INVALID_ARGS, 'old_string 不能为空', 400)
    const current = await this.app.vault.cachedRead(file)
    const oldS = req.old_string.replaceAll('\r\n', '\n')
    const norm = current.replaceAll('\r\n', '\n')
    const count = norm.split(oldS).length - 1
    if (count === 0) {
      throw new BridgeError(BridgeErrorCode.EDIT_NOT_FOUND, `在 ${file.path} 中未找到与 old_string 精确匹配的文本；编辑按字面匹配，请先 vault_read_note 核对原文（注意换行与首尾空白）`, 404)
    }
    if (count > 1 && !req.replace_all) {
      throw new BridgeError(BridgeErrorCode.AMBIGUOUS_EDIT, `old_string 在 ${file.path} 中出现多次（默认只允许一次精确替换）；请提供更长上下文，或设 replace_all: true`, 400)
    }
    const after = req.replace_all ? norm.split(oldS).join(req.new_string) : norm.replace(oldS, req.new_string)
    await this.app.vault.modify(file, after)
    return { path: file.path, before: current, after, matches: count }
  }

  async updateFrontmatter(req: BridgeFrontmatterUpdateRequest): Promise<BridgeFrontmatterUpdateResult> {
    const file = this.fileOf(req.path)
    const setEntries = Object.entries(req.set ?? {})
    for (const [k, v] of setEntries) {
      if (/[\r\n]/.test(v)) {
        throw new BridgeError(BridgeErrorCode.FRONTMATTER_MULTILINE, `frontmatter 值必须单行（字段 ${k} 的取值含换行）；列表请用内联数组 [a, b]`, 400)
      }
      if (k.trim() === '' || !/^[^:#][^:]*$/.test(k)) {
        throw new BridgeError(BridgeErrorCode.INVALID_ARGS, `无效的 frontmatter 字段名：${k}`, 400)
      }
    }
    const del = (req.delete ?? []).map((k) => k.trim()).filter((k) => k.length > 0)
    if (setEntries.length === 0 && del.length === 0) {
      throw new BridgeError(BridgeErrorCode.INVALID_ARGS, 'set 与 delete 至少提供其一', 400)
    }

    const beforeCache = this.app.metadataCache.getFileCache(file)
    const created = beforeCache?.frontmatter === undefined
    const before = fieldsOf(beforeCache?.frontmatter)
    const changes: BridgeFrontmatterUpdateResult['changes'] = [
      ...setEntries.map(([key, value]) => ({ op: 'set' as const, key, value })),
      ...del.map((key) => ({ op: 'delete' as const, key })),
    ]

    let saved: Record<string, unknown> | undefined
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      for (const [k, v] of setEntries) fm[k] = parseFmScalar(v)
      for (const k of del) delete fm[k]
      saved = { ...fm }
    })
    const after = fieldsOf(saved)
    return { path: file.path, created, changes, before, after, issues: [] }
  }

  async rename(req: BridgeRenameRequest): Promise<BridgeRenameResult> {
    const oldRel = noteRel(req.old_path)
    const newRel = noteRel(req.new_path)
    if (oldRel === newRel) throw new BridgeError(BridgeErrorCode.INVALID_ARGS, '新旧路径相同，无需重命名', 400)
    const oldFile = this.app.vault.getAbstractFileByPath(oldRel)
    if (!oldFile) throw new BridgeError(BridgeErrorCode.NOTE_NOT_FOUND, `笔记不存在：${oldRel}`, 404)
    if (!(oldFile instanceof TFile)) throw new BridgeError(BridgeErrorCode.NOT_FILE, `路径不是文件：${oldRel}`, 400)
    if (this.app.vault.getAbstractFileByPath(newRel)) {
      throw new BridgeError(BridgeErrorCode.EXISTS, `目标已存在：${newRel}`, 409)
    }

    // 改前统计：哪些文件链接到旧路径（Obsidian 解析视角），用于回报 updated 列表
    const countRefs = async (path: string): Promise<number> => {
      const src = this.app.vault.getAbstractFileByPath(path)
      if (!(src instanceof TFile)) return 0
      const cache = this.app.metadataCache.getFileCache(src)
      if (!cache) return 0
      let n = 0
      for (const link of [...(cache.links ?? []), ...(cache.embeds ?? [])]) {
        const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, src.path)
        if (dest && dest.path === oldRel) n++
      }
      return n
    }
    const selfCount = await countRefs(oldRel)
    const updated: Array<{ path: string; count: number }> = []
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path === oldRel) continue
      const n = await countRefs(f.path)
      if (n > 0) updated.push({ path: f.path, count: n })
    }

    // fileManager.renameFile：Obsidian 按用户「自动更新内部链接」设置原子更新引用
    await this.app.fileManager.renameFile(oldFile, newRel)

    let oldHandling: 'kept' | 'stubbed' = 'kept'
    if (req.keep_old === 'stub') {
      const stub = `---\nmoved: true\n---\n\n> 此笔记已移至 [[${newRel.replace(/\.md$/, '')}]]。\n\n（原路径保留为跳转占位；如需彻底删除请用 bash 清理。）\n`
      try {
        await this.app.vault.create(oldRel, stub)
        oldHandling = 'stubbed'
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new BridgeError(
          BridgeErrorCode.RENAME_STUB_FAILED,
          `写跳转占位失败 ${oldRel}：${msg}。重命名本身已完成（新文件 ${newRel} 已创建、引用已更新），仅旧文件内容未变。`,
          500,
        )
      }
    }
    if (selfCount > 0) updated.unshift({ path: newRel, count: selfCount })
    const totalLinks = updated.reduce((s, u) => s + u.count, 0)
    return { old_path: oldRel, new_path: newRel, totalLinks, updated, old_handling: oldHandling }
  }

  // ------------------------------------------------------------- 扩展能力

  /**
   * 回收站删除：fileManager.trashFile 按用户 Obsidian 设置（移入 .trash/ 或
   * 系统回收站，可恢复）；旧版 Obsidian（<1.7.0）降级 vault.trash(file, true)
   * 直接进系统回收站。
   */
  async trash(req: BridgeTrashRequest): Promise<BridgeTrashResult> {
    const file = this.fileOf(req.path)
    const fm = this.app.fileManager as { trashFile?: (file: TFile) => Promise<void> }
    if (typeof fm.trashFile === 'function') {
      await fm.trashFile(file)
    } else {
      await this.app.vault.trash(file, true)
    }
    return { path: file.path, trashed: true }
  }

  /** 在 Obsidian 中打开/聚焦笔记（当前叶子，不强制新窗口） */
  async openNote(req: BridgeOpenRequest): Promise<BridgeOpenResult> {
    const file = this.fileOf(req.path)
    await this.app.workspace.openLinkText(file.path, '', false)
    return { path: file.path, opened: true }
  }

  /** 全库标签聚合：metadataCache.getAllTags 官方解析（含 frontmatter tags） */
  async allTags(opts: { folder?: string; ignoreDirs: string[] }): Promise<BridgeAllTagsResult> {
    const counts = new Map<string, number>()
    for (const file of this.vaultFiles({ folder: opts.folder, all: false, ignoreDirs: opts.ignoreDirs })) {
      const cache = this.app.metadataCache.getFileCache(file)
      const tags = cache ? getAllTags(cache) : null
      if (tags) {
        for (const raw of tags) {
          const tag = raw.replace(/^#/, '')
          if (tag.length > 0) counts.set(tag, (counts.get(tag) ?? 0) + 1)
        }
      }
    }
    const tags = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag))
    return { total: tags.length, tags }
  }

  /** 生成标准链接文本：fileManager.generateMarkdownLink 遵循用户 useMarkdownLinks 设置 */
  async noteLink(req: BridgeLinkRequest): Promise<BridgeLinkResult> {
    const file = this.fileOf(req.path)
    const source = (req.source ?? '').trim()
    const link = this.app.fileManager.generateMarkdownLink(file, source, '')
    return { path: file.path, link, format: link.startsWith('[[') ? 'wikilink' : 'markdown' }
  }
}
