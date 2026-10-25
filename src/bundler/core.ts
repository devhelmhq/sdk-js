/**
 * Browser-safe bundling: the closure, findings and digest for an in-memory
 * `{entrypoint, files}` code input. The Node entry (`@devhelm/sdk/bundler`)
 * adds the filesystem forms on top of the same pieces.
 */
import {ValidationError, type ErrorEntry} from '../errors.js'
import type {JsonObject} from '../json.js'
import {compareUtf8, computeDigestWith, contentBytes, type BundleFiles, type Sha256} from './digest.js'
import {dirnameOf, joinPath, normalizeBundlePath} from './paths.js'
import {
  memorySource,
  resolveClosure,
  toBundleFiles,
  type BundleFinding,
  type BundleLimits,
  type ClosureResult,
  type FileSource,
} from './closure.js'
import type {RuntimePackages} from './runtime.js'
import type {AllowedLiteral} from './secrets.js'
import type {KeyLocation} from './keys.js'

/** Advisory provenance sent as `code.source` (all fields optional). */
export interface CodeSourceInfo {
  repo: string | null
  branch: string | null
  commit: string | null
  file: string | null
}

/** The `code` forms every surface accepts (doc 42 §5.3). */
export type CodeInput =
  | string
  | {entrypoint: string; include?: string[]; root?: string}
  | {entrypoint: string; files: BundleFiles; include?: string[]}

/** In-memory form, the only one the browser entry accepts. `include` names files of the map to ship even when nothing imports them. */
export interface InMemoryCode {
  entrypoint: string
  files: BundleFiles
  include?: string[]
}

export interface BundleOptions {
  /** Runtime to check bare imports against (e.g. `RuntimeProfileDto`). `null` skips the check. */
  runtime?: RuntimePackages | null
  /** Session setup file, relative to the entrypoint's directory (default `auth.setup.ts`). `null` disables it. */
  setupFile?: string | null
  /** Resolve `tsconfig` `paths` / `baseUrl` aliases (default true). */
  tsconfig?: boolean
  /** Run the literal-secret scan (default true; the server always runs it). */
  secretScan?: boolean
  limits?: BundleLimits
  /** Advisory source; `false` sends none. Node detects it from git / CI when omitted. */
  source?: Partial<CodeSourceInfo> | false
}

/** A resolved bundle, ready to upload. */
export interface ResolvedBundle {
  /** Absolute bundle root on disk; null for in-memory input. */
  root: string | null
  /** Entrypoint, relative to the root (POSIX). */
  entrypoint: string
  /** The closure: root-relative path → UTF-8 text, or bytes for binary files. */
  files: BundleFiles
  /** Closure paths in digest order. */
  fileList: string[]
  /** D-12 digest of the closure (`sha256:<hex>`); the API must return the same value. */
  digest: string
  /** Total bytes. */
  size: number
  /** Secret names the code reads (`process.env.KEY`). */
  keys: string[]
  keyLocations: KeyLocation[]
  /** Session setup file that was bundled, if any. */
  setupFile: string | null
  /** `tsconfig` files bundled for path aliases. */
  tsconfigFiles: string[]
  /** Lines that opted out of the secret scan with `// devhelm-allow-literal:`. */
  allowedLiterals: AllowedLiteral[]
  warnings: BundleFinding[]
  source: CodeSourceInfo | null
  /** True when a file is not valid UTF-8, so the upload goes as a zip. */
  binary: boolean
  /** Files that ship only because `include` named them; sent as `include` on upload. */
  includeOnly: string[]
}

/** Every finding, plus the bundle when there were no errors. */
export interface BundleCheck {
  bundle: ResolvedBundle | null
  findings: BundleFinding[]
  errors: BundleFinding[]
  warnings: BundleFinding[]
}

/** A bundler refusal: a {@link ValidationError} carrying every finding. */
export class BundleError extends ValidationError {
  readonly findings: BundleFinding[]

  constructor(findings: BundleFinding[]) {
    const errors = findings.filter((f) => f.severity === 'error')
    const first = errors[0]
    const more = errors.length > 1 ? ` (+${errors.length - 1} more)` : ''
    const entries: ErrorEntry[] = errors.map((f) => ({code: f.code, field: f.file ?? null, message: f.message}))
    const details: JsonObject = {}
    if (first?.file) details['file'] = first.file
    if (first?.line !== undefined) details['line'] = first.line
    if (first?.rule) details['rule'] = first.rule
    if (first?.import) details['import'] = first.import
    if (first?.suggestInclude) details['suggestInclude'] = first.suggestInclude
    if (first?.package) details['package'] = first.package
    if (first?.runtimeId) details['runtimeId'] = first.runtimeId
    super(`${first?.message ?? 'Bundle refused'}${more}`, {code: first?.code ?? 'BUNDLE_INVALID', errors: entries, details})
    this.name = 'BundleError'
    this.findings = findings
  }
}

/** Normalize an in-memory file map; bad paths become findings. */
export function normalizeFiles(files: BundleFiles): {files: Map<string, Uint8Array>; findings: BundleFinding[]} {
  const out = new Map<string, Uint8Array>()
  const findings: BundleFinding[] = []
  for (const [raw, content] of Object.entries(files)) {
    const {path, problem} = normalizeBundlePath(raw)
    if (problem) {
      findings.push({
        code: 'MONITOR_PACKAGE_PATH_INVALID',
        severity: 'error',
        rule: problem,
        file: raw,
        message: problem === 'dotfile' ? `${raw}: bundles cannot contain dotfiles or .env files` : `${raw}: bundle paths must be relative, without ..`,
      })
      continue
    }
    if (out.has(path)) {
      findings.push({code: 'MONITOR_PACKAGE_PATH_INVALID', severity: 'error', rule: 'duplicate', file: raw,
        message: `Duplicate path after normalization: ${path}`})
      continue
    }
    out.set(path, contentBytes(content))
  }
  return {files: out, findings}
}

const strictDecoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true})

function isUtf8(bytes: Uint8Array): boolean {
  try {
    strictDecoder.decode(bytes)
    return true
  } catch {
    return false
  }
}

/** Build the bundle from a resolved closure. */
export async function finishBundle(
  closure: ClosureResult,
  extraFindings: BundleFinding[],
  entrypoint: string,
  root: string | null,
  source: CodeSourceInfo | null,
  sha256: Sha256,
): Promise<BundleCheck> {
  const findings = [...extraFindings, ...closure.findings]
  const errors = findings.filter((f) => f.severity === 'error')
  const warnings = findings.filter((f) => f.severity === 'warning')
  if (errors.length > 0) return {bundle: null, findings, errors, warnings}
  const files = toBundleFiles(closure.files)
  const fileList = Object.keys(files).sort(compareUtf8)
  let binary = false
  for (const bytes of closure.files.values()) {
    if (!isUtf8(bytes)) {
      binary = true
      break
    }
  }
  const bundle: ResolvedBundle = {
    root,
    entrypoint,
    files,
    fileList,
    digest: await computeDigestWith(files, sha256),
    size: closure.size,
    keys: closure.keys.map((k) => k.key),
    keyLocations: closure.keys,
    setupFile: closure.setupFile,
    tsconfigFiles: closure.tsconfigFiles,
    allowedLiterals: closure.allowedLiterals,
    warnings,
    source,
    binary,
    includeOnly: closure.includeOnly,
  }
  return {bundle, findings, errors, warnings}
}

/** Resolve an in-memory `{entrypoint, files}` input over any closure source. */
export async function checkInMemory(code: InMemoryCode, options: BundleOptions, sha256: Sha256): Promise<BundleCheck> {
  const {files, findings} = normalizeFiles(code.files)
  const {path: entrypoint, problem} = normalizeBundlePath(code.entrypoint)
  if (problem) {
    findings.push({code: 'MONITOR_PACKAGE_PATH_INVALID', severity: 'error', rule: problem, file: code.entrypoint,
      message: `Entrypoint ${code.entrypoint} must be a relative path inside the bundle`})
    return {bundle: null, findings, errors: findings.filter((f) => f.severity === 'error'), warnings: []}
  }
  const include: string[] = []
  ;(code.include ?? []).forEach((raw, i) => {
    const normalized = normalizeBundlePath(raw)
    if (normalized.problem || !files.has(normalized.path)) {
      findings.push({code: 'MONITOR_PACKAGE_PATH_INVALID', severity: 'error', rule: 'include_missing', file: `include[${i}]`,
        message: `Included file ${raw} is not in the bundle`})
    } else {
      include.push(normalized.path)
    }
  })
  const source: FileSource = memorySource(files)
  const closure = resolveClosure(source, {
    entrypoint,
    include,
    setupFile: setupPath(entrypoint, options.setupFile),
    setupRequired: typeof options.setupFile === 'string',
    runtime: options.runtime,
    tsconfig: options.tsconfig,
    limits: options.limits,
    secretScan: options.secretScan,
  })
  const provided = options.source === false || options.source === undefined ? null : fillSource(options.source)
  return finishBundle(closure, findings, entrypoint, null, provided, sha256)
}

export function fillSource(partial: Partial<CodeSourceInfo>): CodeSourceInfo {
  return {repo: partial.repo ?? null, branch: partial.branch ?? null, commit: partial.commit ?? null, file: partial.file ?? null}
}

/** Root-relative setup path for an option relative to the entrypoint directory. */
export function setupPath(entrypoint: string, option: string | null | undefined): string | null | undefined {
  if (option === null) return null
  if (option === undefined) return undefined
  return joinPath(dirnameOf(entrypoint), option.replace(/\\/g, '/'))
}

/** Throw a {@link BundleError} when the check has errors; otherwise return the bundle. */
export function requireBundle(check: BundleCheck): ResolvedBundle {
  if (!check.bundle) throw new BundleError(check.findings)
  return check.bundle
}

/**
 * The `CreateBundleRequest` JSON body, or null when a file is binary (upload
 * a zip instead). Files that ship only because `include` named them are
 * listed in `include`, so the API keeps them in its closure.
 */
export function toCreateBundleRequest(
  bundle: ResolvedBundle,
  runtimeId?: string | null,
): {files: Record<string, string>; entrypoint: string; include?: string[]; runtimeId?: string} | null {
  if (bundle.binary) return null
  const files: Record<string, string> = {}
  for (const path of bundle.fileList) {
    const content = bundle.files[path]
    if (typeof content !== 'string') return null
    files[path] = content
  }
  const body: {files: Record<string, string>; entrypoint: string; include?: string[]; runtimeId?: string} = {files, entrypoint: bundle.entrypoint}
  if (bundle.includeOnly.length > 0) body.include = [...bundle.includeOnly]
  if (runtimeId) body.runtimeId = runtimeId
  return body
}
