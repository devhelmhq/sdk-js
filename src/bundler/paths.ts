/**
 * Bundle path rules, as the server's `BundlePaths`: POSIX separators, NFC,
 * no leading `./`, relative, no `.`/`..` segments, no dotfile segments
 * (which also refuses `.env*`).
 */

export type PathProblem = 'empty' | 'absolute' | 'parent_segment' | 'dotfile'

export function normalizeBundlePath(raw: string): {path: string; problem: PathProblem | null} {
  if (!raw || !raw.trim() || raw.includes('\0')) return {path: raw, problem: 'empty'}
  let path = raw.replace(/\\/g, '/').trim()
  while (path.startsWith('./')) path = path.slice(2)
  path = path.normalize('NFC')
  if (path.startsWith('/') || /^[A-Za-z]:\//.test(path) || !path.trim()) return {path, problem: 'absolute'}
  for (const part of path.split('/')) {
    if (part === '' || part === '.' || part === '..') return {path, problem: 'parent_segment'}
    if (part.startsWith('.')) return {path, problem: 'dotfile'}
  }
  return {path, problem: null}
}

/** Directory of a root-relative path (`''` for the root). */
export function dirnameOf(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash < 0 ? '' : path.slice(0, slash)
}

/**
 * Join a directory and a specifier the way the server does: `.` dropped,
 * `..` pops (and is clamped at the root, so the caller must check escapes
 * with {@link escapesRoot}).
 */
export function joinPath(dir: string, spec: string): string {
  const parts: string[] = dir ? dir.split('/').filter(Boolean) : []
  for (const part of spec.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (parts.length > 0) parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts.join('/')
}

/** Whether `dir` + `spec` climbs above the bundle root. */
export function escapesRoot(dir: string, spec: string): boolean {
  let depth = dir ? dir.split('/').filter(Boolean).length : 0
  for (const part of spec.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      depth -= 1
      if (depth < 0) return true
    } else {
      depth += 1
    }
  }
  return false
}
