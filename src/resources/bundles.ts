import type {ApiClient} from '../http.js'
import {fetchSingle, fetchTable, transportOf, type QueryParams} from '../http.js'
import {PermissionError, PlatformError, TransportError, ValidationError} from '../errors.js'
import type {JsonObject} from '../json.js'
import type {BundleCheckResultDto, BundleDto, MonitorCodeSpec, RuntimeProfileDto} from '../types.js'
import {BundleCheckResultDtoSchema, BundleDtoSchema, CreateBundleRequestSchema, RuntimeProfileDtoSchema} from '../schemas.js'
import {parseSingle, validateRequest} from '../validation.js'
import type {BundleFiles} from '../bundler/digest.js'
import {compareUtf8} from '../bundler/digest.js'
import {toCreateBundleRequest, type BundleOptions, type CodeInput, type ResolvedBundle} from '../bundler/core.js'
import {zipBundle} from '../bundler/zip.js'
import {selectRuntime, type RuntimePackages} from '../bundler/runtime.js'
import {RUNTIME_CATALOG} from '../bundler/runtime-catalog.generated.js'

/** Options for turning a `code` input into a bundle. */
export interface CodeOptions extends BundleOptions {
  /** Runtime pin (`config.runtimeId`); imports are checked against it. */
  runtimeId?: string | null
  /** Bundle root (default: nearest `.git` ancestor, else the entrypoint's directory). */
  root?: string
  /** Directory relative paths resolve against (Node; default `process.cwd()`). */
  cwd?: string
}

/** Resolves `code` inputs. The Node client reads files; the browser client takes `{entrypoint, files}` only. */
export interface CodeResolver {
  resolve(code: CodeInput, options: CodeOptions & {runtime: RuntimePackages | null}): Promise<ResolvedBundle>
}

/** What `bundles.create()` returns: the API's `BundleDto` plus the entrypoint and source sent with it. */
export interface UploadedBundle {
  bundle: BundleDto
  local: ResolvedBundle
  /** `code` for create / update / drafts / tests. */
  code: MonitorCodeSpec
}

function isResolved(value: CodeInput | ResolvedBundle | BundleFiles): value is ResolvedBundle {
  return typeof value === 'object' && 'digest' in value && 'fileList' in value
}

function codeSpec(local: ResolvedBundle, digest: string): MonitorCodeSpec {
  const spec: MonitorCodeSpec = {bundle: digest, entrypoint: local.entrypoint}
  const src = local.source
  if (src && (src.repo || src.branch || src.commit || src.file)) {
    spec.source = {}
    if (src.repo) spec.source.repo = src.repo
    if (src.branch) spec.source.branch = src.branch
    if (src.commit) spec.source.commit = src.commit
    if (src.file) spec.source.file = src.file
  }
  return spec
}

/**
 * Bundles: upload the files a code check runs (`POST /api/v1/bundles`).
 * The upload is content-addressed and creates no revision.
 */
export class Bundles {
  private runtimeCatalog: Promise<RuntimePackages[]> | undefined

  constructor(
    private readonly client: ApiClient,
    private readonly resolver: CodeResolver,
  ) {}

  /** Resolve a `code` input locally (closure, refusals, digest) without uploading. */
  async prepare(code: CodeInput, options: CodeOptions = {}): Promise<ResolvedBundle> {
    const runtime = options.runtime === undefined ? await this.runtimeFor(options.runtimeId) : options.runtime
    return this.resolver.resolve(code, {...options, runtime})
  }

  /** Resolve and upload. The API's closure digest must equal the local one. */
  async create(code: CodeInput | ResolvedBundle, options: CodeOptions = {}): Promise<BundleDto> {
    return (await this.createWithCode(code, options)).bundle
  }

  /** {@link create}, returning the `code` spec for monitors and drafts as well. */
  async createWithCode(code: CodeInput | ResolvedBundle, options: CodeOptions = {}): Promise<UploadedBundle> {
    const local = isResolved(code) ? code : await this.prepare(code, options)
    const bundle = await this.upload(local, {runtimeId: options.runtimeId})
    return {bundle, local, code: codeSpec(local, bundle.digest)}
  }

  /**
   * Upload a resolved bundle: JSON when every file is UTF-8, else a zip.
   * Throws `ValidationError` `BUNDLE_DIGEST_MISMATCH` when the API's closure
   * differs from the local one.
   */
  async upload(local: ResolvedBundle, options: {runtimeId?: string | null} = {}): Promise<BundleDto> {
    const body = toCreateBundleRequest(local, options.runtimeId)
    let bundle: BundleDto
    if (body) {
      validateRequest(CreateBundleRequestSchema, body, 'bundles.create')
      bundle = await fetchSingle(this.client, 'POST', '/api/v1/bundles', BundleDtoSchema, body)
    } else {
      const transport = transportOf(this.client)
      const query: QueryParams = {entrypoint: local.entrypoint}
      if (local.includeOnly.length > 0) query['include'] = local.includeOnly
      if (options.runtimeId) query['runtimeId'] = options.runtimeId
      const response = await transport.fetchOk(
        transport.request('POST', '/api/v1/bundles', {query, body: zipBundle(local.files), headers: {'Content-Type': 'application/zip'}}),
      )
      bundle = parseSingle(BundleDtoSchema, await response.json(), '/api/v1/bundles')
    }
    if (bundle.digest !== local.digest) throw digestMismatch(local, bundle)
    return bundle
  }

  /**
   * Collect every import finding for a file set (`POST /api/v1/bundles/check`).
   * JSON only; no secret scan. Used by `validate --online`.
   */
  async check(files: BundleFiles | ResolvedBundle, options: {entrypoint?: string; include?: string[]; runtimeId?: string | null} = {}): Promise<BundleCheckResultDto> {
    const map = isResolved(files) ? files.files : files
    const text: Record<string, string> = {}
    for (const [path, content] of Object.entries(map)) {
      if (typeof content !== 'string') {
        throw new ValidationError(`bundles.check: ${path} is binary; the check endpoint takes UTF-8 text only`, {code: 'BUNDLE_BINARY_UNSUPPORTED', details: {file: path}})
      }
      text[path] = content
    }
    const body: {files: Record<string, string>; entrypoint?: string; include?: string[]; runtimeId?: string} = {files: text}
    const entrypoint = options.entrypoint ?? (isResolved(files) ? files.entrypoint : undefined)
    if (entrypoint) body.entrypoint = entrypoint
    const include = options.include ?? (isResolved(files) && files.includeOnly.length > 0 ? files.includeOnly : undefined)
    if (include) body.include = include
    if (options.runtimeId) body.runtimeId = options.runtimeId
    validateRequest(CreateBundleRequestSchema, body, 'bundles.check')
    return fetchSingle(this.client, 'POST', '/api/v1/bundles/check', BundleCheckResultDtoSchema, body)
  }

  /**
   * The runtime imports are checked against: the pinned profile, or the
   * newest available one. Falls back to the bundled catalog snapshot when the
   * API cannot be read.
   */
  async runtimeFor(runtimeId?: string | null): Promise<RuntimePackages | null> {
    if (!this.runtimeCatalog) {
      this.runtimeCatalog = fetchTable(this.client, '/api/v1/synthetics/runtime-profiles', RuntimeProfileDtoSchema)
        .then((page) => page.data.map(toRuntimePackages))
    }
    let catalog: ReadonlyArray<RuntimePackages>
    try {
      catalog = await this.runtimeCatalog
    } catch (e) {
      this.runtimeCatalog = undefined
      // Only an unreachable or failing catalog falls back to the bundled
      // snapshot; auth and other refusals surface.
      if (!(e instanceof TransportError || e instanceof PlatformError || e instanceof PermissionError)) throw e
      catalog = RUNTIME_CATALOG
    }
    return selectRuntime(catalog, runtimeId) ?? selectRuntime(RUNTIME_CATALOG, runtimeId) ?? null
  }
}

function toRuntimePackages(profile: RuntimeProfileDto): RuntimePackages {
  return {
    id: profile.id,
    status: profile.status,
    nodeVersion: profile.nodeVersion,
    playwrightVersion: profile.playwrightVersion,
    eolAt: profile.eolAt ?? null,
    packages: profile.packages ?? null,
    nodeBuiltins: profile.nodeBuiltins ?? null,
  }
}

function digestMismatch(local: ResolvedBundle, remote: BundleDto): ValidationError {
  const server = [...remote.files].sort(compareUtf8)
  const client = local.fileList
  const onlyClient = client.filter((f) => !server.includes(f))
  const onlyServer = server.filter((f) => !client.includes(f))
  const details: JsonObject = {clientDigest: local.digest, serverDigest: remote.digest, onlyClient, onlyServer}
  const files = onlyClient.length > 0 || onlyServer.length > 0
    ? ` Files only here: ${onlyClient.join(', ') || '-'}; only on the server: ${onlyServer.join(', ') || '-'}.`
    : ' The file lists match, so a file\'s content was read differently.'
  return new ValidationError(
    `Bundle digest mismatch: computed ${local.digest}, the API returned ${remote.digest}.${files}`,
    {code: 'BUNDLE_DIGEST_MISMATCH', details},
  )
}
