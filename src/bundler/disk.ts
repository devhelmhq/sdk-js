/**
 * Disk-backed {@link FileSource}: files under the bundle root, with the
 * D-12 refusals (symlinks, dotfiles / `.env`, default exclusions,
 * `.devhelmignore`). `include` globs name extra files to ship.
 */
import {existsSync, lstatSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {join, sep} from 'node:path'
import {DEFAULT_EXCLUDES, IgnoreMatcher, compileGlob, globBase} from './glob.js'
import type {FileSource, RefusalRule} from './closure.js'
import {dirnameOf} from './paths.js'

const MAX_INCLUDE_SCAN = 20_000

export interface DiskSourceOptions {
  /** Absolute, real bundle root. */
  root: string
  /** Root-relative include globs: files to ship even when nothing imports them. */
  include?: string[]
}

export class DiskSource implements FileSource {
  readonly root: string
  private readonly include: RegExp[] | null
  private readonly includeGlobs: string[]
  private readonly bytes = new Map<string, Uint8Array | undefined>()
  private readonly ignoreByDir = new Map<string, IgnoreMatcher | null>()

  constructor(options: DiskSourceOptions) {
    this.root = options.root
    this.includeGlobs = options.include ?? []
    this.include = options.include && options.include.length > 0 ? options.include.map(compileGlob) : null
  }

  private abs(path: string): string {
    return join(this.root, ...path.split('/'))
  }

  read(path: string): Uint8Array | undefined {
    if (this.bytes.has(path)) return this.bytes.get(path)
    let value: Uint8Array | undefined
    try {
      const abs = this.abs(path)
      if (statSync(abs).isFile()) value = new Uint8Array(readFileSync(abs))
    } catch {
      value = undefined
    }
    this.bytes.set(path, value)
    return value
  }

  refusal(path: string): RefusalRule | null {
    const parts = path.split('/')
    if (parts.some((p) => p.startsWith('.'))) return 'dotfile'
    for (let i = 1; i <= parts.length; i++) {
      try {
        if (lstatSync(this.abs(parts.slice(0, i).join('/'))).isSymbolicLink()) return 'symlink'
      } catch {
        break
      }
    }
    if (DEFAULT_EXCLUDES.ignores(path)) return 'excluded'
    if (this.ignored(path)) return 'ignored'
    return null
  }

  /** `.devhelmignore` files in the root and in every directory above `path`. */
  private ignored(path: string): boolean {
    let dir = dirnameOf(path)
    while (true) {
      const matcher = this.ignoreFor(dir)
      if (matcher) {
        const rel = dir ? path.slice(dir.length + 1) : path
        if (matcher.ignores(rel)) return true
      }
      if (!dir) return false
      dir = dirnameOf(dir)
    }
  }

  private ignoreFor(dir: string): IgnoreMatcher | null {
    if (this.ignoreByDir.has(dir)) return this.ignoreByDir.get(dir) ?? null
    let matcher: IgnoreMatcher | null = null
    const file = join(this.abs(dir || '.'), '.devhelmignore')
    try {
      if (existsSync(file)) {
        const m = new IgnoreMatcher(readFileSync(file, 'utf8'))
        matcher = m.empty ? null : m
      }
    } catch {
      matcher = null
    }
    this.ignoreByDir.set(dir, matcher)
    return matcher
  }

  /** Files matched by the include globs, minus refused ones (reported separately). */
  includeFiles(): {files: string[]; skipped: Array<{path: string; rule: RefusalRule}>} {
    if (!this.include) return {files: [], skipped: []}
    const files: string[] = []
    const skipped: Array<{path: string; rule: RefusalRule}> = []
    const seen = new Set<string>()
    const bases = new Set(this.includeGlobs.map(globBase))
    let scanned = 0
    const walk = (dir: string) => {
      if (scanned > MAX_INCLUDE_SCAN) return
      let entries: string[]
      try {
        entries = readdirSync(this.abs(dir || '.'))
      } catch {
        return
      }
      for (const name of entries.sort()) {
        scanned += 1
        const rel = (dir ? `${dir}/${name}` : name).split(sep).join('/').normalize('NFC')
        let isDir = false
        let isLink = false
        try {
          const st = lstatSync(this.abs(rel))
          isLink = st.isSymbolicLink()
          isDir = st.isDirectory()
        } catch {
          continue
        }
        if (isDir) {
          if (name.startsWith('.') || DEFAULT_EXCLUDES.ignores(`${rel}/x`)) continue
          walk(rel)
          continue
        }
        if (seen.has(rel) || !this.include?.some((r) => r.test(rel))) continue
        seen.add(rel)
        const rule: RefusalRule | null = isLink ? 'symlink' : this.refusal(rel)
        if (rule) skipped.push({path: rel, rule})
        else files.push(rel)
      }
    }
    for (const base of bases) {
      const start = base && this.read(base) !== undefined ? dirnameOf(base) : base
      walk(start)
    }
    return {files, skipped}
  }
}

