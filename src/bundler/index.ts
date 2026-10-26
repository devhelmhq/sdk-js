/**
 * `@devhelm/sdk/bundler` — the Node bundler for code checks (doc 42 §5.3,
 * doc 32 D-12). It turns a `code` input (a path, `{entrypoint, include}`, or
 * `{entrypoint, files}`) into the import closure the API expects, with the
 * canonical digest, the offline refusals and the literal-secret scan.
 *
 * It has no API client dependency: the SDK's `bundles.create()` and the CLI
 * both call {@link resolveBundle} and upload the result.
 *
 * @example
 * ```ts
 * import {resolveBundle, toCreateBundleRequest} from '@devhelm/sdk/bundler'
 *
 * const bundle = await resolveBundle('./synthetics/checkout.spec.ts')
 * console.log(bundle.digest, bundle.fileList)
 * const body = toCreateBundleRequest(bundle)   // POST /api/v1/bundles
 * ```
 */
import {createHash} from 'node:crypto'
import {existsSync, lstatSync, realpathSync, statSync} from 'node:fs'
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path'
import {computeDigestWith, digestFrame, toHex, type BundleFiles, type Sha256} from './digest.js'
import {resolveClosure, type BundleFinding} from './closure.js'
import {
  checkInMemory,
  fillSource,
  finishBundle,
  requireBundle,
  setupPath,
  type BundleCheck,
  type BundleOptions,
  type CodeInput,
  type CodeSourceInfo,
  type ResolvedBundle,
} from './core.js'
import {DiskSource} from './disk.js'
import {compileGlob} from './glob.js'
import {detectSource} from './source.js'
import {normalizeBundlePath} from './paths.js'

export type {BundleFileContent, BundleFiles, Sha256} from './digest.js'
export {TEXT_EXTENSIONS, compareUtf8, digestFrame, normalizeContent, isTextPath} from './digest.js'
export type {
  BundleFinding,
  BundleLimits,
  ClosureOptions,
  ClosureResult,
  FileSource,
  FindingSeverity,
  RefusalRule,
} from './closure.js'
export {BUNDLE_LIMITS, memorySource, resolveClosure} from './closure.js'
export type {
  BundleCheck,
  BundleOptions,
  CodeInput,
  CodeSourceInfo,
  InMemoryCode,
  ResolvedBundle,
} from './core.js'
export {BundleError, requireBundle, toCreateBundleRequest} from './core.js'
export type {RuntimePackages} from './runtime.js'
export {runtimeHasImport, selectRuntime} from './runtime.js'
export {RUNTIME_CATALOG, RUNTIME_CATALOG_SOURCE} from './runtime-catalog.generated.js'
export type {AllowedLiteral, SecretFinding, SecretRule, SecretScanResult} from './secrets.js'
export {scanSecrets, shannonEntropy} from './secrets.js'
export type {KeyLocation} from './keys.js'
export {scanKeys} from './keys.js'
export {zipBundle} from './zip.js'
export {detectSource, repoFromRemote} from './source.js'
export {IgnoreMatcher, compileGlob} from './glob.js'

/** SHA-256 with `node:crypto` (synchronous). */
export const nodeSha256: Sha256 = (bytes) => new Uint8Array(createHash('sha256').update(bytes).digest())

/** D-12 digest of a file map: `sha256:<64 hex>`. */
export async function computeDigest(files: BundleFiles): Promise<string> {
  return computeDigestWith(files, nodeSha256)
}

/** Synchronous {@link computeDigest}. */
export function computeDigestSync(files: BundleFiles): string {
  return `sha256:${toHex(nodeSha256(digestFrame(files)) as Uint8Array)}`
}

/** Options for {@link resolveBundle} on top of {@link BundleOptions}. */
export interface ResolveBundleOptions extends BundleOptions {
  /** Directory relative paths (entrypoint, include, root) resolve against (default `process.cwd()`). */
  cwd?: string
  /**
   * Bundle root. Default: the nearest ancestor of the entrypoint containing
   * `.git`, else {@link fallbackRoot}, else the entrypoint's directory.
   */
  root?: string
  /** Root when no `.git` ancestor exists (the CLI passes the `devhelm.yml` directory). */
  fallbackRoot?: string
  /** Include globs; override the input's `include`. Relative to {@link cwd}. */
  include?: string[]
  /** Environment for source detection (default `process.env`). */
  env?: Record<string, string | undefined>
}

/** Nearest ancestor (inclusive) of `dir` that contains `.git`. */
export function findGitRoot(dir: string): string | null {
  let current = resolve(dir)
  while (true) {
    if (existsSync(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

function toRootRelative(root: string, absPath: string): string | null {
  const rel = relative(root, absPath)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
  return rel.split(sep).join('/').normalize('NFC')
}

function finding(code: string, message: string, extra: Partial<BundleFinding> = {}): BundleFinding {
  return {code, severity: 'error', message, ...extra}
}

function failed(findings: BundleFinding[]): BundleCheck {
  return {bundle: null, findings, errors: findings.filter((f) => f.severity === 'error'), warnings: findings.filter((f) => f.severity === 'warning')}
}

/** Resolve a code input and return every finding (errors do not throw). */
export async function checkBundle(input: CodeInput, options: ResolveBundleOptions = {}): Promise<BundleCheck> {
  if (typeof input !== 'string' && 'files' in input) {
    return checkInMemory(input, options, nodeSha256)
  }
  const cwd = resolve(options.cwd ?? process.cwd())
  const entryArg = typeof input === 'string' ? input : input.entrypoint
  const includeArg = options.include ?? (typeof input === 'string' ? undefined : input.include)
  const rootArg = options.root ?? (typeof input === 'string' ? undefined : input.root)

  const entryAbs = resolve(cwd, entryArg)
  let entryStat
  try {
    entryStat = lstatSync(entryAbs)
  } catch {
    return failed([finding('MONITOR_PACKAGE_PATH_INVALID', `Entrypoint ${entryArg} does not exist`, {rule: 'entrypoint_missing', file: entryArg})])
  }
  if (entryStat.isSymbolicLink()) {
    return failed([finding('MONITOR_PACKAGE_PATH_INVALID', `Entrypoint ${entryArg} is a symlink; bundles cannot contain symlinks`, {rule: 'symlink', file: entryArg})])
  }
  if (!statSync(entryAbs).isFile()) {
    return failed([finding('MONITOR_PACKAGE_PATH_INVALID', `Entrypoint ${entryArg} is not a file`, {rule: 'entrypoint_missing', file: entryArg})])
  }

  const rootGiven = rootArg ? resolve(cwd, rootArg) : (findGitRoot(dirname(entryAbs)) ?? (options.fallbackRoot ? resolve(cwd, options.fallbackRoot) : dirname(entryAbs)))
  const entrypoint = toRootRelative(rootGiven, entryAbs)
  if (!entrypoint) {
    return failed([finding('IMPORT_NOT_IN_BUNDLE', `Entrypoint ${entryArg} is outside the bundle root ${rootGiven}`, {rule: 'outside_root', file: entryArg})])
  }
  const {problem} = normalizeBundlePath(entrypoint)
  if (problem) {
    return failed([finding('MONITOR_PACKAGE_PATH_INVALID', `Entrypoint ${entrypoint} cannot be bundled (${problem})`, {rule: problem, file: entrypoint})])
  }
  const root = realpathSync(rootGiven)

  const include: string[] = []
  const includeArgIndex: number[] = []
  const extra: BundleFinding[] = []
  for (const [index, glob] of (includeArg ?? []).entries()) {
    const absGlob = isAbsolute(glob) ? glob : join(cwd, glob)
    const rel = relative(rootGiven, absGlob).split(sep).join('/')
    if (rel.startsWith('..') || isAbsolute(rel)) {
      extra.push(finding('IMPORT_NOT_IN_BUNDLE', `Include ${glob} is outside the bundle root ${rootGiven}`, {rule: 'outside_root'}))
      continue
    }
    include.push(rel || '**')
    includeArgIndex.push(index)
  }

  const setup = setupPath(entrypoint, options.setupFile)
  const disk = new DiskSource({root, include: include.length > 0 ? include : undefined})
  const included = disk.includeFiles()
  // An include that matches no file is refused, as the server refuses an include path not in the set.
  const matched = [...included.files, ...included.skipped.map((s) => s.path)]
  include.forEach((glob, i) => {
    const regex = compileGlob(glob)
    if (!matched.some((p) => regex.test(p))) {
      const field = `include[${includeArgIndex[i] ?? i}]`
      extra.push(finding('MONITOR_PACKAGE_PATH_INVALID', `Included file ${includeArg?.[includeArgIndex[i] ?? i] ?? glob} is not in the bundle`, {rule: 'include_missing', file: field}))
    }
  })
  for (const s of included.skipped) {
    if (s.rule === 'symlink') {
      // A symlink anywhere in the set is refused, as the server refuses one in an upload.
      extra.push(finding('MONITOR_PACKAGE_PATH_INVALID', `${s.path} is a symlink; bundles cannot contain symlinks`, {rule: 'symlink', file: s.path}))
    } else {
      extra.push({code: 'INCLUDE_SKIPPED', severity: 'warning', file: s.path, rule: s.rule, message: `Include skipped ${s.path} (${s.rule})`})
    }
  }

  const closure = resolveClosure(disk, {
    entrypoint,
    setupFile: setup,
    setupRequired: typeof options.setupFile === 'string',
    include: included.files,
    runtime: options.runtime,
    tsconfig: options.tsconfig,
    limits: options.limits,
    secretScan: options.secretScan,
  })

  let source: CodeSourceInfo | null = null
  if (options.source !== false) {
    const detected = detectSource(join(root, ...entrypoint.split('/')), dirname(entryAbs), options.env ?? process.env)
    source = fillSource({...detected, ...(options.source ?? {})})
  }
  return finishBundle(closure, extra, entrypoint, root, source, nodeSha256)
}

/**
 * Resolve a code input into a {@link ResolvedBundle}. Throws `BundleError`
 * (a `ValidationError`, CLI exit 4) listing every error finding.
 */
export async function resolveBundle(input: CodeInput, options: ResolveBundleOptions = {}): Promise<ResolvedBundle> {
  return requireBundle(await checkBundle(input, options))
}

