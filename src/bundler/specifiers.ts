/**
 * Import specifiers, found with the server's `BundleImports.SPECIFIER`
 * pattern so the client and the server see the same imports (including ones
 * the server would also see inside comments).
 */

const SPECIFIER =
  /(?:(?:import|export)\s+(?:[^'"\n;]*?\s+from\s+)?|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g

export interface Specifier {
  value: string
  line: number
}

export function findSpecifiers(source: string): Specifier[] {
  const out: Specifier[] = []
  SPECIFIER.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = SPECIFIER.exec(source)) !== null) {
    out.push({value: match[1] ?? '', line: lineAt(source, match.index)})
  }
  return out
}

export function lineAt(source: string, offset: number): number {
  let line = 1
  const end = Math.min(offset, source.length)
  for (let i = 0; i < end; i++) if (source.charCodeAt(i) === 10) line++
  return line
}

export function isRelative(spec: string): boolean {
  return spec.startsWith('./') || spec.startsWith('../')
}

/** `@scope/pkg/sub` → `@scope/pkg`; `pkg/sub` → `pkg`. */
export function packageName(spec: string): string {
  if (spec.startsWith('@')) {
    const slash = spec.indexOf('/')
    const next = slash < 0 ? -1 : spec.indexOf('/', slash + 1)
    return next < 0 ? spec : spec.slice(0, next)
  }
  const slash = spec.indexOf('/')
  return slash < 0 ? spec : spec.slice(0, slash)
}

/** Extensions tried after a relative specifier, in the server's order. */
export const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'] as const

/** Candidate files for a resolved base path, in the server's order. */
export function candidatesFor(base: string): string[] {
  const out = [base]
  for (const ext of RESOLVE_EXTENSIONS) {
    out.push(base + ext, `${base}/index${ext}`)
  }
  return out
}

/** Source files the closure walks (the server's `source()` plus `.json`). */
export function isWalkable(path: string): boolean {
  return RESOLVE_EXTENSIONS.some((ext) => path.endsWith(ext))
}

export function isSourcePath(path: string): boolean {
  return RESOLVE_EXTENSIONS.some((ext) => ext !== '.json' && path.endsWith(ext))
}
