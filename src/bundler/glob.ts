/**
 * Glob matching for `include` patterns and `.devhelmignore` (gitignore
 * syntax), over root-relative POSIX paths. Supports `**`, `*`, `?`,
 * `[...]` classes and `{a,b}` alternation.
 */

function escapeRegex(ch: string): string {
  return /[.+^$()|\\/]/.test(ch) ? `\\${ch}` : ch
}

/** Translate a glob to a regex source (no anchors). */
export function globToRegexSource(glob: string): string {
  let out = ''
  let i = 0
  let braceDepth = 0
  while (i < glob.length) {
    const ch = glob[i] ?? ''
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        // `**/` matches zero or more directories; a trailing `**` matches everything.
        const atSegmentStart = i === 0 || glob[i - 1] === '/'
        if (atSegmentStart && glob[i + 2] === '/') {
          out += '(?:[^/]*(?:/|$))*'
          i += 3
          continue
        }
        out += '.*'
        i += 2
        continue
      }
      out += '[^/]*'
      i += 1
      continue
    }
    if (ch === '?') {
      out += '[^/]'
      i += 1
      continue
    }
    if (ch === '[') {
      const close = glob.indexOf(']', i + 1)
      if (close > i + 1) {
        let cls = glob.slice(i + 1, close)
        if (cls.startsWith('!')) cls = `^${cls.slice(1)}`
        out += `[${cls.replace(/\\/g, '\\\\')}]`
        i = close + 1
        continue
      }
      out += '\\['
      i += 1
      continue
    }
    if (ch === '{') {
      braceDepth += 1
      out += '(?:'
      i += 1
      continue
    }
    if (ch === '}' && braceDepth > 0) {
      braceDepth -= 1
      out += ')'
      i += 1
      continue
    }
    if (ch === ',' && braceDepth > 0) {
      out += '|'
      i += 1
      continue
    }
    if (ch === '\\' && i + 1 < glob.length) {
      out += escapeRegex(glob[i + 1] ?? '')
      i += 2
      continue
    }
    out += escapeRegex(ch)
    i += 1
  }
  return out
}

/** A compiled glob that matches root-relative paths. */
export function compileGlob(glob: string): RegExp {
  let pattern = glob.replace(/\\/g, '/').trim()
  while (pattern.startsWith('./')) pattern = pattern.slice(2)
  if (pattern.endsWith('/')) pattern += '**'
  return new RegExp(`^${globToRegexSource(pattern)}$`)
}

/** Literal directory prefix of a glob (where a filesystem walk can start). */
export function globBase(glob: string): string {
  let pattern = glob.replace(/\\/g, '/').trim()
  while (pattern.startsWith('./')) pattern = pattern.slice(2)
  const parts = pattern.split('/')
  const base: string[] = []
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i] ?? ''
    if (/[*?[{]/.test(part)) break
    base.push(part)
  }
  return base.join('/')
}

interface IgnoreRule {
  regex: RegExp
  negate: boolean
  dirOnly: boolean
}

/** A `.gitignore`-syntax matcher (`.devhelmignore`). */
export class IgnoreMatcher {
  private readonly rules: IgnoreRule[] = []

  constructor(text = '') {
    for (const rawLine of text.split(/\r?\n/)) {
      let line = rawLine.replace(/(?<!\\)\s+$/, '')
      if (!line || line.startsWith('#')) continue
      let negate = false
      if (line.startsWith('!')) {
        negate = true
        line = line.slice(1)
      }
      if (line.startsWith('\\#') || line.startsWith('\\!')) line = line.slice(1)
      let dirOnly = false
      if (line.endsWith('/')) {
        dirOnly = true
        line = line.slice(0, -1)
      }
      const anchored = line.startsWith('/') || line.slice(0, -1).includes('/')
      if (line.startsWith('/')) line = line.slice(1)
      const source = globToRegexSource(line)
      const prefix = anchored ? '^' : '^(?:.*/)?'
      this.rules.push({regex: new RegExp(`${prefix}${source}$`), negate, dirOnly})
    }
  }

  get empty(): boolean {
    return this.rules.length === 0
  }

  /** Whether a root-relative file path is ignored (a matching parent directory ignores it). */
  ignores(path: string): boolean {
    const parts = path.split('/')
    let ignored = false
    // Check each ancestor directory first, then the file itself.
    for (let i = 1; i <= parts.length; i++) {
      const candidate = parts.slice(0, i).join('/')
      const isDir = i < parts.length
      for (const rule of this.rules) {
        if (rule.dirOnly && !isDir) continue
        if (rule.regex.test(candidate)) ignored = !rule.negate
      }
      if (ignored && isDir) return true
    }
    return ignored
  }
}

/** Default exclusions for a bundle's file set (doc 32 D-12). */
export const DEFAULT_EXCLUDES = new IgnoreMatcher(
  ['node_modules/', '.git/', 'dist/', 'build/', 'coverage/', '*.map', '.env*'].join('\n'),
)
