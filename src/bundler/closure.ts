/**
 * The import-closure resolver (doc 42 §5.3, doc 32 D-12). It walks from the
 * entrypoint (plus the session setup file and any `include` files) over a
 * {@link FileSource}, following relative imports, `tsconfig` path aliases
 * and JSON imports the way the server's `BundleImports` does, and collects
 * every finding in one pass.
 *
 * Pure: no filesystem access. The Node entry supplies a disk-backed source;
 * the browser entry an in-memory one.
 */
import type {BundleFiles} from './digest.js'
import {isTextPath} from './digest.js'
import {dirnameOf, escapesRoot, joinPath} from './paths.js'
import {candidatesFor, findSpecifiers, isRelative, isWalkable, packageName} from './specifiers.js'
import {aliasTargets, tsconfigFor, type TsconfigReader} from './tsconfig.js'
import {runtimeHasImport, type RuntimePackages} from './runtime.js'
import {scanSecrets, type AllowedLiteral} from './secrets.js'
import {scanKeys, type KeyLocation} from './keys.js'

/** Why an existing path cannot be part of the bundle. */
export type RefusalRule = 'symlink' | 'dotfile' | 'excluded' | 'ignored' | 'outside_root'

/** The files the resolver may read, addressed by root-relative POSIX path. */
export interface FileSource {
  /** Bytes of a file, or undefined when there is no file at `path`. */
  read(path: string): Uint8Array | undefined
  /** Why an existing file cannot be bundled, or null when it can. */
  refusal(path: string): RefusalRule | null
}

export type FindingSeverity = 'error' | 'warning'

/**
 * One bundler finding. Error codes match the API's (`IMPORT_NOT_IN_BUNDLE`,
 * `IMPORT_NOT_IN_RUNTIME`, `SECRET_LITERAL`, `BUNDLE_TOO_LARGE`,
 * `MONITOR_PACKAGE_PATH_INVALID`); warnings use `RUNTIME_UNCHECKED`,
 * `INCLUDE_SKIPPED`, `SECRET_LITERAL_ALLOWED`.
 */
export interface BundleFinding {
  code: string
  severity: FindingSeverity
  message: string
  file?: string
  line?: number
  /** Refusal rule (`symlink`, `dotfile`, …) or secret rule (`jwt`, …). */
  rule?: string
  import?: string
  suggestInclude?: string
  package?: string
  runtimeId?: string
}

export interface BundleLimits {
  maxFiles: number
  maxBytes: number
}

/** Server limits: 256 files, 5 MB uncompressed. */
export const BUNDLE_LIMITS: BundleLimits = {maxFiles: 256, maxBytes: 5 * 1024 * 1024}

export interface ClosureOptions {
  /** Root-relative entrypoint. */
  entrypoint: string
  /** Root-relative session setup file; defaults to `auth.setup.ts` next to the entrypoint. `null` disables it. */
  setupFile?: string | null
  /** When true, a missing setup file is an error (it was named explicitly). */
  setupRequired?: boolean
  /** Root-relative files matched by `include` globs: every one ships, imported or not (fixtures, data). */
  include?: ReadonlyArray<string>
  /** Runtime to check bare imports against; `null` skips the check with a warning. */
  runtime?: RuntimePackages | null
  /** Resolve `tsconfig` `paths` / `baseUrl` aliases (default true). */
  tsconfig?: boolean
  limits?: BundleLimits
  /** Run the literal-secret scan (default true). */
  secretScan?: boolean
}

export interface ClosureResult {
  /** The closure: every bundled file and its bytes, in walk order. */
  files: Map<string, Uint8Array>
  findings: BundleFinding[]
  /** `tsconfig` files bundled because an alias import resolved through them. */
  tsconfigFiles: string[]
  /** The setup file that was bundled, if any. */
  setupFile: string | null
  allowedLiterals: AllowedLiteral[]
  keys: KeyLocation[]
  size: number
  /** Files bundled only because `include` named them (nothing imports them). */
  includeOnly: string[]
}

const decoder = new TextDecoder('utf-8', {ignoreBOM: true})

function refusalFinding(path: string, rule: RefusalRule, from?: {file: string; line: number; spec: string}): BundleFinding {
  const where = from ? `Import ${from.spec} in ${from.file}:${from.line}` : path
  switch (rule) {
    case 'symlink':
      return {code: 'MONITOR_PACKAGE_PATH_INVALID', severity: 'error', rule, file: from?.file ?? path, line: from?.line, import: from?.spec,
        message: `${where} resolves to ${path}, a symlink; bundles cannot contain symlinks`}
    case 'dotfile':
      return {code: 'MONITOR_PACKAGE_PATH_INVALID', severity: 'error', rule, file: from?.file ?? path, line: from?.line, import: from?.spec,
        message: `${where} resolves to ${path}; bundles cannot contain dotfiles or .env files`}
    default:
      return {code: 'IMPORT_NOT_IN_BUNDLE', severity: 'error', rule, file: from?.file ?? path, line: from?.line, import: from?.spec,
        suggestInclude: path,
        message: from
          ? `${where} is outside the bundle (${path} is ${describeRule(rule)})`
          : `${path} is ${describeRule(rule)}`}
  }
}

function describeRule(rule: RefusalRule): string {
  switch (rule) {
    case 'excluded':
      return 'excluded by default (node_modules, dist, build, coverage, *.map, .env*)'
    case 'ignored':
      return 'listed in .devhelmignore'
    case 'outside_root':
      return 'outside the bundle root'
    case 'symlink':
      return 'a symlink'
    case 'dotfile':
      return 'a dotfile'
  }
}

/** Resolve the closure. Never throws on user input: problems are findings. */
export function resolveClosure(source: FileSource, options: ClosureOptions): ClosureResult {
  const findings: BundleFinding[] = []
  const files = new Map<string, Uint8Array>()
  const tsconfigFiles = new Set<string>()
  const queue: string[] = []
  const queued = new Set<string>()
  const limits = options.limits ?? BUNDLE_LIMITS
  const runtime = options.runtime
  const useTsconfig = options.tsconfig ?? true
  const textCache = new Map<string, string | undefined>()

  const readText = (path: string): string | undefined => {
    if (textCache.has(path)) return textCache.get(path)
    let text: string | undefined
    if (source.refusal(path) === null) {
      const bytes = source.read(path)
      text = bytes === undefined ? undefined : decoder.decode(bytes)
    }
    textCache.set(path, text)
    return text
  }
  const reader: TsconfigReader = {readText}

  const enqueue = (path: string) => {
    if (queued.has(path)) return
    queued.add(path)
    queue.push(path)
  }

  // Roots of the walk.
  const entry = options.entrypoint
  const entryRefusal = source.read(entry) === undefined ? null : source.refusal(entry)
  if (source.read(entry) === undefined) {
    findings.push({code: 'MONITOR_PACKAGE_PATH_INVALID', severity: 'error', rule: 'entrypoint_missing', file: entry,
      message: `Entrypoint ${entry} does not exist`})
  } else if (entryRefusal !== null) {
    findings.push(refusalFinding(entry, entryRefusal))
  } else {
    enqueue(entry)
  }

  let setupFile: string | null = null
  const setupCandidate = options.setupFile === undefined ? joinPath(dirnameOf(entry), 'auth.setup.ts') : options.setupFile
  if (setupCandidate) {
    if (source.read(setupCandidate) !== undefined) {
      const refusal = source.refusal(setupCandidate)
      if (refusal === null) {
        setupFile = setupCandidate
        enqueue(setupCandidate)
      } else {
        findings.push(refusalFinding(setupCandidate, refusal))
      }
    } else if (options.setupRequired) {
      findings.push({code: 'MONITOR_PACKAGE_PATH_INVALID', severity: 'error', rule: 'setup_missing', file: setupCandidate,
        message: `Session setup file ${setupCandidate} does not exist`})
    }
  }

  let runtimeWarned = false
  const checkBare = (from: string, line: number, spec: string): string | null => {
    // tsconfig `paths` / `baseUrl` alias → a file in the bundle.
    if (useTsconfig && !spec.startsWith('node:')) {
      const config = tsconfigFor(reader, dirnameOf(from))
      if (config) {
        for (const base of aliasTargets(config, spec)) {
          for (const candidate of candidatesFor(base)) {
            if (source.read(candidate) === undefined) continue
            const refusal = source.refusal(candidate)
            if (refusal !== null) {
              findings.push(refusalFinding(candidate, refusal, {file: from, line, spec}))
              return null
            }
            for (const f of config.files) tsconfigFiles.add(f)
            return candidate
          }
        }
      }
    }
    if (runtime === null || runtime === undefined) {
      if (!runtimeWarned) {
        runtimeWarned = true
        findings.push({code: 'RUNTIME_UNCHECKED', severity: 'warning',
          message: 'Imports were not checked against a runtime: no runtime profile was given'})
      }
      return null
    }
    if (!runtimeHasImport(runtime, spec)) {
      const pkg = packageName(spec)
      findings.push({code: 'IMPORT_NOT_IN_RUNTIME', severity: 'error', file: from, line, import: spec, package: pkg,
        runtimeId: runtime.id, message: `Import ${pkg} in ${from}:${line} is not in runtime ${runtime.id}`})
    }
    return null
  }

  const resolveRelative = (from: string, line: number, spec: string): string | null => {
    const dir = dirnameOf(from)
    if (escapesRoot(dir, spec)) {
      findings.push({code: 'IMPORT_NOT_IN_BUNDLE', severity: 'error', rule: 'outside_root', file: from, line, import: spec,
        message: `Import ${spec} in ${from}:${line} is outside the bundle root`})
      return null
    }
    const base = joinPath(dir, spec)
    for (const candidate of candidatesFor(base)) {
      if (source.read(candidate) === undefined) continue
      const refusal = source.refusal(candidate)
      if (refusal !== null) {
        findings.push(refusalFinding(candidate, refusal, {file: from, line, spec}))
        return null
      }
      return candidate
    }
    findings.push({code: 'IMPORT_NOT_IN_BUNDLE', severity: 'error', file: from, line, import: spec, suggestInclude: base,
      message: `Import ${spec} in ${from}:${line} is outside the bundle`})
    return null
  }

  // The server follows imports from source and JSON files only, but checks
  // the relative imports of every text file against what was uploaded.
  const unwalked: Array<{file: string; line: number; spec: string; target: string}> = []
  const drain = () => {
    while (queue.length > 0) {
      const path = queue.shift() ?? ''
      const bytes = source.read(path)
      if (bytes === undefined) continue
      files.set(path, bytes)
      if (!isTextPath(path)) continue
      const text = decoder.decode(bytes)
      const walk = isWalkable(path)
      for (const {value: spec, line} of findSpecifiers(text)) {
        if (isRelative(spec)) {
          const target = resolveRelative(path, line, spec)
          if (!target) continue
          if (walk) enqueue(target)
          else unwalked.push({file: path, line, spec, target})
        } else if (spec && !spec.startsWith('/')) {
          const target = checkBare(path, line, spec)
          if (target && walk) enqueue(target)
        }
      }
    }
  }
  // The closure from the entrypoint and setup file, as the server computes it…
  drain()
  const reached = new Set(files.keys())
  // …then files named by `include` that nothing imports (fixtures, data files).
  for (const path of options.include ?? []) {
    if (source.read(path) !== undefined && source.refusal(path) === null) enqueue(path)
  }
  drain()
  const includeOnly = [...files.keys()].filter((f) => !reached.has(f))

  for (const u of unwalked) {
    if (files.has(u.target)) continue
    findings.push({code: 'IMPORT_NOT_IN_BUNDLE', severity: 'error', file: u.file, line: u.line, import: u.spec, suggestInclude: u.target,
      message: `Import ${u.spec} in ${u.file}:${u.line} names ${u.target}, which no source file imports; add it to include or remove the reference`})
  }

  for (const f of tsconfigFiles) {
    const bytes = source.read(f)
    if (bytes !== undefined && !files.has(f)) files.set(f, bytes)
  }

  let size = 0
  for (const bytes of files.values()) size += bytes.length
  if (files.size > limits.maxFiles || size > limits.maxBytes) {
    findings.push({code: 'BUNDLE_TOO_LARGE', severity: 'error',
      message: `Bundle has ${files.size} files and ${size} bytes; the limit is ${limits.maxFiles} files and ${limits.maxBytes} bytes. Largest directories: ${
        largestDirectories(files).map((d) => `${d.dir} (${d.bytes} bytes)`).join(', ')}`})
  }

  const asFiles = toBundleFiles(files)
  let allowedLiterals: AllowedLiteral[] = []
  if (options.secretScan ?? true) {
    const scan = scanSecrets(asFiles)
    for (const f of scan.findings) {
      findings.push({code: f.code, severity: 'error', file: f.file, line: f.line, rule: f.rule, message: f.message})
    }
    allowedLiterals = scan.allowed
    for (const a of scan.allowed) {
      findings.push({code: 'SECRET_LITERAL_ALLOWED', severity: 'warning', file: a.file, line: a.line,
        message: `Literal allowed in ${a.file}:${a.line}: ${a.reason || '(no reason given)'}`})
    }
  }

  return {
    files,
    findings,
    tsconfigFiles: [...tsconfigFiles],
    setupFile,
    allowedLiterals,
    keys: scanKeys(asFiles, entry),
    size,
    includeOnly,
  }
}

/** The ten largest top-level directories, as the server reports them. */
export function largestDirectories(files: Map<string, Uint8Array>): Array<{dir: string; bytes: number}> {
  const sizes = new Map<string, number>()
  for (const [path, bytes] of files) {
    const slash = path.indexOf('/')
    const top = slash < 0 ? '(root)' : path.slice(0, slash)
    sizes.set(top, (sizes.get(top) ?? 0) + bytes.length)
  }
  return [...sizes.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 10)
    .map(([dir, bytes]) => ({dir, bytes}))
}

const strictDecoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true})

/** Decode valid UTF-8 to a string (lossless); keep other bytes as bytes. */
export function toBundleFiles(files: Map<string, Uint8Array>): BundleFiles {
  const out: BundleFiles = {}
  for (const [path, bytes] of files) {
    try {
      out[path] = strictDecoder.decode(bytes)
    } catch {
      out[path] = bytes
    }
  }
  return out
}

/** A {@link FileSource} over an in-memory file map (paths already normalized). */
export function memorySource(files: Map<string, Uint8Array>, refusal: (path: string) => RefusalRule | null = () => null): FileSource {
  return {
    read: (path) => files.get(path),
    refusal,
  }
}
