import type {ZodType} from 'zod'
import type {ApiClient} from '../http.js'
import {
  apiPostWithStatus,
  fetchAllPages,
  fetchCursorPage,
  fetchPage,
  fetchSingle,
  fetchVoid,
  iterateCursor,
} from '../http.js'
import type {
  CheckResultDto,
  CodeTestTargetRequest,
  CreateDraftRevisionResponse,
  CreateMonitorRequest,
  CursorPage,
  DefinitionHeadDto,
  MonitorCodeSpec,
  MonitorDriftDto,
  MonitorDto,
  MonitorHistoryEntryDto,
  MonitorListQuery,
  MonitorOverlayRequest,
  MonitorRunListFilter,
  MonitorSecretRequestsDto,
  MonitorSessionDto,
  MonitorTestRequest,
  MonitorTestResultDto,
  MonitorUsageProjectionDto,
  MonitorValidationResultDto,
  MonitorVersionDto,
  Page,
  PublishRevisionRequest,
  QuarantineMonitorRequest,
  RemapSecretRequest,
  RestoreMonitorRequest,
  RevisionDiffDto,
  RevisionDto,
  RevisionFilesDto,
  RollbackPreviewDto,
  RollbackRevisionRequest,
  RunDto,
  RunSessionContext,
  ScriptMonitorConfig,
  TakeoverMonitorRequest,
  TransferMonitorRequest,
  TriggerRunRequest,
  TriggerRunsResponse,
  UpdateMonitorRequest,
  UpsertMonitorSessionRequest,
} from '../types.js'
import {
  CheckResultDtoSchema,
  CodeTestTargetRequestSchema,
  CreateDraftRevisionRequestSchema,
  CreateDraftRevisionResponseSchema,
  CreateMonitorRequestSchema,
  DefinitionHeadDtoSchema,
  DnsMonitorConfigSchema,
  EvidencePurgeRequestSchema,
  HeartbeatMonitorConfigSchema,
  HttpMonitorConfigSchema,
  IcmpMonitorConfigSchema,
  McpServerMonitorConfigSchema,
  MonitorDriftDtoSchema,
  MonitorDtoSchema,
  MonitorHistoryEntryDtoSchema,
  MonitorOverlayRequestSchema,
  MonitorSecretRequestsDtoSchema,
  MonitorSessionDtoSchema,
  MonitorTestRequestSchema,
  MonitorTestResultDtoSchema,
  MonitorUsageProjectionDtoSchema,
  MonitorValidationResultDtoSchema,
  MonitorVersionDtoSchema,
  PublishRevisionRequestSchema,
  QuarantineMonitorRequestSchema,
  RemapSecretRequestSchema,
  RestoreMonitorRequestSchema,
  RevisionDiffDtoSchema,
  RevisionDtoSchema,
  RevisionFilesDtoSchema,
  RollbackPreviewDtoSchema,
  RollbackRevisionRequestSchema,
  RunDtoSchema,
  ScriptMonitorConfigSchema,
  TakeoverMonitorRequestSchema,
  TcpMonitorConfigSchema,
  TransferMonitorRequestSchema,
  TriggerRunRequestSchema,
  TriggerRunsResponseSchema,
  UpdateMonitorRequestSchema,
  UpsertMonitorSessionRequestSchema,
  ValidateMonitorsRequestSchema,
} from '../schemas.js'
import {parseSingle, validateRequest} from '../validation.js'
import {ValidationError} from '../errors.js'
import {DEPRECATION_REMOVAL_DATE, deprecated} from '../deprecation.js'
import type {CodeInput} from '../bundler/core.js'
import type {Bundles, CodeOptions} from './bundles.js'
import type {Environments} from './environments.js'
import {waitForRun, type WaitOptions} from '../wait.js'

const BASE = '/api/v1/monitors'

/** Monitor types that run code (`BROWSER`, `MULTI_STEP_API`). */
export const CODE_MONITOR_TYPES = ['BROWSER', 'MULTI_STEP_API'] as const
export type CodeMonitorType = (typeof CODE_MONITOR_TYPES)[number]
export type MonitorType = CreateMonitorRequest['type']
export type UptimeMonitorType = Exclude<MonitorType, CodeMonitorType>

export function isCodeMonitorType(type: string | null | undefined): type is CodeMonitorType {
  return type === 'BROWSER' || type === 'MULTI_STEP_API'
}

/**
 * `code` as the SDK accepts it: an uploaded bundle (`{bundle, entrypoint}`),
 * or files to bundle and upload first — a path, `{entrypoint, include}`, or
 * `{entrypoint, files}`.
 */
export type MonitorCode = MonitorCodeSpec | CodeInput

/** Wait for the run a call starts (`{wait: true}`), with the `runs.wait()` options. */
export interface WaitFlag extends WaitOptions {
  wait?: boolean
}

const WAIT_KEYS: ReadonlySet<string> = new Set(['wait', 'timeoutMs', 'signal', 'onEvent', 'pollIntervalMs', 'stream'])

/** `monitors.create()` input: the generated request, with `code` files and an environment slug. */
export type CreateMonitorInput = Omit<CreateMonitorRequest, 'code' | 'environmentId'> & {
  /** Environment slug or id; required for code monitors. */
  environment?: string
  environmentId?: string | null
  code?: MonitorCode | null
}

/** `monitors.update()` input. */
export type UpdateMonitorInput = Omit<UpdateMonitorRequest, 'code' | 'environmentId'> & {
  environment?: string
  environmentId?: string | null
  code?: MonitorCode | null
}

/** `monitors.list()` filters. `environment` takes a slug or id; `name` is an exact match. */
export type MonitorListFilter = MonitorListQuery & {
  name?: string
  environment?: string
  page?: number
  size?: number
}

/** `monitors.test()` input. A test runs in the monitor's own environment. */
export type MonitorTestInput = Omit<CodeTestTargetRequest, 'environmentId' | 'code'> & {code?: MonitorCode | null}

/** `monitors.testAdhoc()` input for a code check that has no monitor yet. */
export interface AdhocCodeTestInput {
  type: CodeMonitorType
  /** Environment slug or id the run uses. */
  environment?: string
  environmentId?: string
  code: MonitorCode
  config?: ScriptMonitorConfig | null
  region?: string
  session?: RunSessionContext
}

/** `monitors.testAdhoc()` input for an uptime probe. */
export type AdhocProbeTestInput = Omit<MonitorTestRequest, 'type' | 'code' | 'session' | 'environmentId'> & {
  type: UptimeMonitorType
  environment?: string
  environmentId?: string
}

/** What `monitors.test()` returns: a `RunDto` for code monitors; the probe result for uptime monitors (deprecated, until 2027-01-31). */
export type MonitorTestOutcome = RunDto | MonitorTestResultDto

/** Whether a `monitors.test()` result is a run (code monitor) rather than a probe result. */
export function isRun(result: MonitorTestOutcome): result is RunDto {
  return 'phase' in result && 'revisionId' in result
}

const DEPRECATION_REMOVAL_MS = Date.parse(`${DEPRECATION_REMOVAL_DATE}T00:00:00Z`)

/** `monitors.trigger()` result after `{wait: true}`: each run, finished. */
export type TriggerRunsResult = Omit<TriggerRunsResponse, 'runs'> & {runs: RunDto[]}

const CONFIG_BY_TYPE: Record<MonitorType, ZodType> = {
  HTTP: HttpMonitorConfigSchema,
  DNS: DnsMonitorConfigSchema,
  TCP: TcpMonitorConfigSchema,
  ICMP: IcmpMonitorConfigSchema,
  HEARTBEAT: HeartbeatMonitorConfigSchema,
  MCP_SERVER: McpServerMonitorConfigSchema,
  BROWSER: ScriptMonitorConfigSchema,
  MULTI_STEP_API: ScriptMonitorConfigSchema,
}

/**
 * The config union is discriminated by the monitor `type` (the spec's
 * `oneOf` has none). A config that does not match its type is a
 * `ValidationError` before the call.
 */
export function checkConfigForType(type: MonitorType, config: object | null | undefined, context: string): void {
  if (config === null || config === undefined) return
  const schema = CONFIG_BY_TYPE[type]
  if (!schema) return
  const result = schema.safeParse(config)
  if (!result.success) {
    const err = ValidationError.fromZodError(result.error, `Request validation failed (${context}): config does not match type ${type}`)
    throw new ValidationError(
      err.message,
      {code: 'MONITOR_CONFIG_TYPE_MISMATCH', errors: err.errors.map((e) => ({...e, field: e.field ? `config.${e.field}` : 'config'}))},
      err.issues,
    )
  }
}

function isCodeTestInput(input: AdhocCodeTestInput | AdhocProbeTestInput): input is AdhocCodeTestInput {
  return isCodeMonitorType(input.type)
}

function isCodeSpec(code: MonitorCode): code is MonitorCodeSpec {
  return typeof code === 'object' && code !== null && 'bundle' in code
}

function splitWait<T extends object>(input: T | undefined, options: WaitFlag | undefined): {body: T | undefined; wait: WaitFlag} {
  const wait: Record<string, unknown> = {}
  if (!input) return {body: undefined, wait: {...options}}
  const body: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (WAIT_KEYS.has(k)) wait[k] = v
    else if (v !== undefined) body[k] = v
  }
  return {body: body as T, wait: {...(wait as WaitFlag), ...options}}
}

function monitorPath(id: string | number, suffix = ''): string {
  return `${BASE}/${encodeURIComponent(String(id))}${suffix}`
}

interface MonitorDeps {
  bundles: Bundles
  environments: Environments
}

/** Draft, test, inspect and discard code revisions. */
export class MonitorRevisions {
  constructor(
    private readonly client: ApiClient,
    private readonly monitors: Monitors,
  ) {}

  /**
   * Revisions of a monitor (`GET /monitors/{id}/revisions`). `state` is a
   * list of draft, tested_passed, tested_failed, live, previous, discarded,
   * all (default live, previous).
   */
  async list(id: string, options: {state?: string | string[]} = {}): Promise<RevisionDto[]> {
    const state = Array.isArray(options.state) ? options.state.join(',') : options.state
    return fetchAllPages(this.client, monitorPath(id, '/revisions'), RevisionDtoSchema, 100, state ? {state} : undefined)
  }

  /** One page of revisions, with totals. */
  async listPage(id: string, options: {state?: string | string[]; page?: number; size?: number} = {}): Promise<Page<RevisionDto>> {
    const state = Array.isArray(options.state) ? options.state.join(',') : options.state
    return fetchPage(this.client, monitorPath(id, '/revisions'), RevisionDtoSchema, options.page ?? 0, options.size ?? 25, state ? {state} : undefined)
  }

  /** `GET /revisions/{rid}`. */
  async get(_id: string, revisionId: string): Promise<RevisionDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/revisions/${encodeURIComponent(revisionId)}`, RevisionDtoSchema)
  }

  /**
   * Create a draft from code (`POST /monitors/{id}/revisions`). Files are
   * bundled and uploaded first. A draft with the same digest is reused.
   */
  async create(id: string, input: {code: MonitorCode}, options: CodeOptions = {}): Promise<CreateDraftRevisionResponse> {
    const body = {code: await this.monitors.resolveCode(input.code, options)}
    validateRequest(CreateDraftRevisionRequestSchema, body, 'monitors.revisions.create')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/revisions'), CreateDraftRevisionResponseSchema, body)
  }

  /**
   * Validation run of a revision in the monitor's environment
   * (`POST /monitors/{id}/revisions/{rid}/test`, 202). With `{wait: true}`
   * the finished run is returned.
   */
  async test(
    id: string,
    revisionId: string,
    input?: Omit<CodeTestTargetRequest, 'environmentId' | 'code'> & WaitFlag,
    options?: WaitFlag,
  ): Promise<RunDto> {
    const {body, wait} = splitWait(input, options)
    const request = body ?? {}
    validateRequest(CodeTestTargetRequestSchema, request, 'monitors.revisions.test')
    const run = await fetchSingle(this.client, 'POST', monitorPath(id, `/revisions/${encodeURIComponent(revisionId)}/test`), RunDtoSchema, request)
    return wait.wait ? waitForRun(this.client, run.id, wait) : run
  }

  /** Line diff between two revisions (`GET /revisions/{rid}/diff/{other}`); `other` defaults to the live revision. */
  async diff(id: string, revisionId: string, other?: string): Promise<RevisionDiffDto> {
    let against = other
    if (!against) {
      const monitor = await this.monitors.get(id)
      if (!monitor.liveRevisionId) {
        throw new ValidationError(`Monitor ${id} has no live revision to compare with`, {code: 'REVISION_NOT_LIVE'})
      }
      against = monitor.liveRevisionId
    }
    return fetchSingle(this.client, 'GET', `/api/v1/revisions/${encodeURIComponent(revisionId)}/diff/${encodeURIComponent(against)}`, RevisionDiffDtoSchema)
  }

  /** The revision's source files (`GET /revisions/{rid}/files`). */
  async files(_id: string, revisionId: string): Promise<RevisionFilesDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/revisions/${encodeURIComponent(revisionId)}/files`, RevisionFilesDtoSchema)
  }

  /** Discard a draft (`DELETE /monitors/{id}/revisions/{rid}`). */
  async discard(id: string, revisionId: string): Promise<void> {
    return fetchVoid(this.client, monitorPath(id, `/revisions/${encodeURIComponent(revisionId)}`))
  }

  /** Extend a draft's 14-day expiry (`POST /monitors/{id}/revisions/{rid}/keep`). */
  async keep(id: string, revisionId: string): Promise<RevisionDto> {
    return fetchSingle(this.client, 'POST', monitorPath(id, `/revisions/${encodeURIComponent(revisionId)}/keep`), RevisionDtoSchema)
  }

  /** Delete a revision's stored bytes, e.g. after a leaked secret (`POST /revisions/{rid}/purge`). */
  async purge(_id: string, revisionId: string, body: {reason: string}): Promise<RevisionDto> {
    validateRequest(EvidencePurgeRequestSchema, body, 'monitors.revisions.purge')
    return fetchSingle(this.client, 'POST', `/api/v1/revisions/${encodeURIComponent(revisionId)}/purge`, RevisionDtoSchema, body)
  }
}

/** Settings history (`/monitors/{id}/versions`). */
export interface MonitorVersions {
  /** @deprecated since 1.12, removed 2027-01-31. Use `monitors.versions.list(id)`. */
  (id: string | number, options?: {page?: number; size?: number}): Promise<Page<MonitorVersionDto>>
  list(id: string | number, options?: {page?: number; size?: number}): Promise<Page<MonitorVersionDto>>
  get(id: string | number, version: number): Promise<MonitorVersionDto>
}

/** Run history of both kinds (`GET /monitors/{id}/history`). */
export class MonitorHistory {
  constructor(private readonly client: ApiClient) {}

  async list(id: string, options: {cursor?: string; limit?: number} = {}): Promise<CursorPage<MonitorHistoryEntryDto>> {
    return fetchCursorPage(this.client, monitorPath(id, '/history'), MonitorHistoryEntryDtoSchema, options)
  }

  async listAll(id: string, options: {limit?: number; max?: number} = {}): Promise<MonitorHistoryEntryDto[]> {
    const out: MonitorHistoryEntryDto[] = []
    for await (const entry of iterateCursor(this.client, monitorPath(id, '/history'), MonitorHistoryEntryDtoSchema, {limit: options.limit})) {
      out.push(entry)
      if (options.max !== undefined && out.length >= options.max) break
    }
    return out
  }
}

/** Secrets a monitor's code reads, and how each one is bound. */
export class MonitorSecretRequests {
  constructor(private readonly client: ApiClient) {}

  /** `GET /monitors/{id}/secret-requests`. */
  async list(id: string, options: {revisionId?: string} = {}): Promise<MonitorSecretRequestsDto> {
    return fetchSingle(this.client, 'GET', monitorPath(id, '/secret-requests'), MonitorSecretRequestsDtoSchema, undefined, options)
  }

  /** Bind a requested key to a secret (`PUT /monitors/{id}/secret-requests/{key}`); `secretId: null` restores the name match. */
  async remap(id: string, key: string, body: RemapSecretRequest): Promise<MonitorSecretRequestsDto> {
    validateRequest(RemapSecretRequestSchema, body, 'monitors.secretRequests.remap')
    return fetchSingle(this.client, 'PUT', monitorPath(id, `/secret-requests/${encodeURIComponent(key)}`), MonitorSecretRequestsDtoSchema, body)
  }

  /** Re-scan the live code for keys (`POST /monitors/{id}/secret-requests/rescan`). */
  async rescan(id: string): Promise<MonitorSecretRequestsDto> {
    return fetchSingle(this.client, 'POST', monitorPath(id, '/secret-requests/rescan'), MonitorSecretRequestsDtoSchema)
  }
}

/** Cached sessions captured by setup files. */
export class MonitorSessions {
  constructor(private readonly client: ApiClient) {}

  /** `GET /monitors/{id}/sessions`. */
  async list(id: string): Promise<MonitorSessionDto[]> {
    return fetchAllPages(this.client, monitorPath(id, '/sessions'), MonitorSessionDtoSchema)
  }

  /** `PUT /monitors/{id}/sessions`. */
  async upsert(id: string, body: UpsertMonitorSessionRequest): Promise<MonitorSessionDto> {
    validateRequest(UpsertMonitorSessionRequestSchema, body, 'monitors.sessions.upsert')
    return fetchSingle(this.client, 'PUT', monitorPath(id, '/sessions'), MonitorSessionDtoSchema, body)
  }

  /** Re-run a setup file (`POST /monitors/{id}/sessions/renew`, 202 Run). */
  async renew(id: string, options: {setupFile?: string} & WaitFlag = {}): Promise<RunDto> {
    const {body, wait} = splitWait<{setupFile?: string}>(options, undefined)
    const query = body?.setupFile ? {setupFile: body.setupFile} : undefined
    const run = await fetchSingle(this.client, 'POST', monitorPath(id, '/sessions/renew'), RunDtoSchema, undefined, query)
    return wait.wait ? waitForRun(this.client, run.id, wait) : run
  }

  /** Drop a cached session (`POST /monitors/{id}/sessions/revoke`). */
  async revoke(id: string, options: {setupFile?: string} = {}): Promise<MonitorSessionDto> {
    const query = options.setupFile ? {setupFile: options.setupFile} : undefined
    return fetchSingle(this.client, 'POST', monitorPath(id, '/sessions/revoke'), MonitorSessionDtoSchema, undefined, query)
  }
}

/** Monitors in Trash. */
export class MonitorTrash {
  constructor(private readonly client: ApiClient) {}

  /** `GET /monitors/trash`. */
  async list(): Promise<MonitorDto[]> {
    return fetchAllPages(this.client, `${BASE}/trash`, MonitorDtoSchema)
  }
}

export class Monitors {
  readonly revisions: MonitorRevisions
  readonly versions: MonitorVersions
  readonly history: MonitorHistory
  readonly secretRequests: MonitorSecretRequests
  readonly sessions: MonitorSessions
  readonly trash: MonitorTrash

  constructor(
    private readonly client: ApiClient,
    private readonly deps: MonitorDeps,
  ) {
    this.revisions = new MonitorRevisions(client, this)
    this.history = new MonitorHistory(client)
    this.secretRequests = new MonitorSecretRequests(client)
    this.sessions = new MonitorSessions(client)
    this.trash = new MonitorTrash(client)
    const listVersions = (id: string | number, options: {page?: number; size?: number} = {}) =>
      fetchPage(client, monitorPath(id, '/versions'), MonitorVersionDtoSchema, options.page ?? 0, options.size ?? 20)
    const getVersion = (id: string | number, version: number) =>
      fetchSingle(client, 'GET', monitorPath(id, `/versions/${encodeURIComponent(String(version))}`), MonitorVersionDtoSchema)
    const deprecatedCall = (id: string | number, options?: {page?: number; size?: number}) => {
      deprecated('monitors.versions(id)', 'monitors.versions.list(id)')
      return listVersions(id, options)
    }
    this.versions = Object.assign(deprecatedCall, {list: listVersions, get: getVersion})
  }

  // ── List and CRUD ────────────────────────────────────────────────

  /**
   * List monitors (`GET /monitors`). Without `page` every page is fetched;
   * with `page` only that page is returned. `name` is an exact match;
   * `environment` takes a slug or id.
   */
  async list(filter: MonitorListFilter = {}): Promise<MonitorDto[]> {
    const {page, size, query} = await this.listQuery(filter)
    if (page !== undefined) return (await fetchPage(this.client, BASE, MonitorDtoSchema, page, size ?? 50, query)).data
    return fetchAllPages(this.client, BASE, MonitorDtoSchema, size ?? 200, query)
  }

  /** Every monitor matching the filter (all pages). */
  async listAll(filter: Omit<MonitorListFilter, 'page'> = {}): Promise<MonitorDto[]> {
    const {size, query} = await this.listQuery(filter)
    return fetchAllPages(this.client, BASE, MonitorDtoSchema, size ?? 200, query)
  }

  /** One page with its totals. The 1.11 `listPage(page, size)` form still works. */
  async listPage(pageOrFilter: number | MonitorListFilter = 0, size?: number): Promise<Page<MonitorDto>> {
    const filter: MonitorListFilter = typeof pageOrFilter === 'number' ? {page: pageOrFilter, size} : pageOrFilter
    const resolved = await this.listQuery(filter)
    return fetchPage(this.client, BASE, MonitorDtoSchema, resolved.page ?? 0, resolved.size ?? 50, resolved.query)
  }

  private async listQuery(filter: MonitorListFilter): Promise<{page?: number; size?: number; query: Record<string, unknown>}> {
    const {page, size, environment, ...rest} = filter
    const query: Record<string, unknown> = {...rest}
    if (environment) query['environmentId'] = await this.deps.environments.resolveId(environment)
    return {page, size, query}
  }

  /** `GET /monitors/{id}`. */
  async get(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'GET', monitorPath(id), MonitorDtoSchema)
  }

  /**
   * Create a monitor (`POST /monitors`). For a code monitor, `code` files
   * are bundled and uploaded first, and revision 1 goes live in this call.
   * Every new monitor runs at create.
   */
  async create(input: CreateMonitorInput, options: CodeOptions = {}): Promise<MonitorDto> {
    checkConfigForType(input.type, input.config, 'monitors.create')
    const body = await this.authoringBody(input, options)
    validateRequest(CreateMonitorRequestSchema, body, 'monitors.create')
    return fetchSingle(this.client, 'POST', BASE, MonitorDtoSchema, body)
  }

  /**
   * Update a monitor (`PUT /monitors/{id}`). With `code` the new code goes
   * live in this call, untested; use `revisions.create` → `revisions.test` →
   * `publish` to test first.
   */
  async update(id: string | number, input: UpdateMonitorInput, options: CodeOptions = {}): Promise<MonitorDto> {
    const body = await this.authoringBody(input, options)
    validateRequest(UpdateMonitorRequestSchema, body, 'monitors.update')
    return fetchSingle(this.client, 'PUT', monitorPath(id), MonitorDtoSchema, body)
  }

  /** Move a monitor to Trash (`DELETE /monitors/{id}`). */
  async delete(id: string | number): Promise<void> {
    return fetchVoid(this.client, monitorPath(id))
  }

  /** Restore a monitor from Trash (`POST /monitors/{id}/restore`). */
  async restore(id: string, body: RestoreMonitorRequest = {}): Promise<MonitorDto> {
    validateRequest(RestoreMonitorRequestSchema, body, 'monitors.restore')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/restore'), MonitorDtoSchema, body)
  }

  /** Dry run: findings and projected runs for create payloads (`POST /monitors/validate`). */
  async validate(monitors: CreateMonitorInput[], options: CodeOptions = {}): Promise<MonitorValidationResultDto> {
    const bodies: Array<Record<string, unknown>> = []
    for (const m of monitors) {
      checkConfigForType(m.type, m.config, 'monitors.validate')
      bodies.push(await this.authoringBody(m, options))
    }
    const body = {monitors: bodies}
    validateRequest(ValidateMonitorsRequestSchema, body, 'monitors.validate')
    return fetchSingle(this.client, 'POST', `${BASE}/validate`, MonitorValidationResultDtoSchema, body)
  }

  /** Monthly run projection for a new monitor (`POST /monitors/usage-preview`). */
  async usagePreview(input: CreateMonitorInput, options: CodeOptions = {}): Promise<MonitorUsageProjectionDto> {
    const body = await this.authoringBody(input, options)
    validateRequest(CreateMonitorRequestSchema, body, 'monitors.usagePreview')
    return fetchSingle(this.client, 'POST', `${BASE}/usage-preview`, MonitorUsageProjectionDtoSchema, body)
  }

  // ── Overlays ─────────────────────────────────────────────────────

  /** Pause scheduled runs (`POST /monitors/{id}/pause`). */
  async pause(id: string | number, body: MonitorOverlayRequest = {}): Promise<MonitorDto> {
    validateRequest(MonitorOverlayRequestSchema, body, 'monitors.pause')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/pause'), MonitorDtoSchema, body)
  }

  /** `POST /monitors/{id}/resume`. */
  async resume(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'POST', monitorPath(id, '/resume'), MonitorDtoSchema)
  }

  /** Mute alert delivery (`POST /monitors/{id}/mute`). */
  async mute(id: string | number, body: MonitorOverlayRequest = {}): Promise<MonitorDto> {
    validateRequest(MonitorOverlayRequestSchema, body, 'monitors.mute')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/mute'), MonitorDtoSchema, body)
  }

  /** `POST /monitors/{id}/unmute`. */
  async unmute(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'POST', monitorPath(id, '/unmute'), MonitorDtoSchema)
  }

  /** Hold a flaky monitor out of alerting (`POST /monitors/{id}/quarantine`). */
  async quarantine(id: string | number, body: QuarantineMonitorRequest): Promise<MonitorDto> {
    validateRequest(QuarantineMonitorRequestSchema, body, 'monitors.quarantine')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/quarantine'), MonitorDtoSchema, body)
  }

  /** `POST /monitors/{id}/release-quarantine`. */
  async releaseQuarantine(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'POST', monitorPath(id, '/release-quarantine'), MonitorDtoSchema)
  }

  // ── Testing and running ──────────────────────────────────────────

  /**
   * Validation run of a code monitor (`POST /monitors/{id}/test`, 202). With
   * `code`, the local files are tested against the saved monitor. With
   * `{wait: true}` the finished run is returned. The run is billed and never
   * signals.
   *
   * On an uptime monitor the API answers with a probe result. Until
   * 2027-01-31 that result is returned with a one-time deprecation warning
   * (use {@link probe}); from then on this throws `ValidationError` `USE_PROBE`.
   * Narrow the result with {@link isRun}.
   */
  async test(id: string | number, input?: MonitorTestInput & WaitFlag, options?: WaitFlag & CodeOptions): Promise<MonitorTestOutcome> {
    const {body, wait} = splitWait(input, options)
    const request: Record<string, unknown> = {...body}
    if (body?.code) request['code'] = await this.resolveCode(body.code, options ?? {})
    validateRequest(CodeTestTargetRequestSchema, request, 'monitors.test')
    const path = monitorPath(id, '/test')
    const {status, data} = await apiPostWithStatus(this.client, path, request)
    if (status !== 202) {
      const probe = parseSingle(MonitorTestResultDtoSchema, data, path)
      if (Date.now() < DEPRECATION_REMOVAL_MS) {
        deprecated('monitors.test(id) on an uptime monitor', 'monitors.probe(id)')
        return probe
      }
      throw new ValidationError('This is an uptime monitor: monitors.test() runs code checks; use monitors.probe(id)', {
        code: 'USE_PROBE',
        next: {command: 'monitors.probe(id)', docs: 'https://docs.devhelm.io/sdk/testing'},
        details: {passed: probe.passed},
      })
    }
    const run = parseSingle(RunDtoSchema, data, path)
    return wait.wait ? waitForRun(this.client, run.id, wait) : run
  }

  /** Probe an uptime monitor once (`POST /monitors/{id}/test`, 200). Nothing is stored. */
  async probe(id: string | number): Promise<MonitorTestResultDto> {
    const path = monitorPath(id, '/test')
    const {status, data} = await apiPostWithStatus(this.client, path, {})
    if (status === 202) {
      const run = parseSingle(RunDtoSchema, data, path)
      throw new ValidationError(`This is a code monitor: the API queued validation run ${run.id}; use monitors.test(id)`, {
        code: 'USE_TEST',
        next: {command: 'monitors.test(id)', docs: 'https://docs.devhelm.io/sdk/testing'},
        details: {runId: run.id, url: run.url ?? null},
      })
    }
    return parseSingle(MonitorTestResultDtoSchema, data, path)
  }

  /** @deprecated since 1.12, removed 2027-01-31. Use {@link test}, which returns the queued run. */
  async testRun(id: string | number, target?: CodeTestTargetRequest): Promise<RunDto> {
    deprecated('monitors.testRun(id)', 'monitors.test(id)')
    const path = monitorPath(id, '/test')
    const body = target === undefined ? undefined : validateRequest(CodeTestTargetRequestSchema, target, 'monitors.testRun')
    const {status, data} = await apiPostWithStatus(this.client, path, body)
    if (status !== 202) {
      throw new ValidationError(
        `Response validation failed (${path}): expected a queued validation run (202), got ${status}. This is an uptime monitor; use monitors.probe() for it.`,
        {code: 'USE_PROBE'},
      )
    }
    return parseSingle(RunDtoSchema, data, path)
  }

  /**
   * Test code or a probe config without a saved monitor (`POST /monitors/test`).
   * Code types return the validation `Run` (202; `{wait: true}` waits);
   * uptime types return the probe result.
   */
  async testAdhoc(input: AdhocCodeTestInput & WaitFlag, options?: WaitFlag & CodeOptions): Promise<RunDto>
  async testAdhoc(input: AdhocProbeTestInput, options?: CodeOptions): Promise<MonitorTestResultDto>
  async testAdhoc(input: (AdhocCodeTestInput & WaitFlag) | AdhocProbeTestInput, options?: WaitFlag & CodeOptions): Promise<RunDto | MonitorTestResultDto> {
    const {body, wait} = splitWait<AdhocCodeTestInput | AdhocProbeTestInput>(input, options)
    const source = body ?? input
    const request: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(source)) if (k !== 'environment' && k !== 'code') request[k] = v
    const environment = source.environment ?? source.environmentId
    if (environment) request['environmentId'] = await this.deps.environments.resolveId(environment)
    if (isCodeTestInput(source)) {
      const code = source.code
      if (!code) {
        throw new ValidationError('monitors.testAdhoc: code is required for code monitors', {
          code: 'FIELD_REQUIRED', errors: [{code: 'FIELD_REQUIRED', field: 'code', message: 'Required'}],
        })
      }
      if (!environment) {
        throw new ValidationError('monitors.testAdhoc: environment is required for code monitors', {
          code: 'MONITOR_ENVIRONMENT_REQUIRED', errors: [{code: 'MONITOR_ENVIRONMENT_REQUIRED', field: 'environment', message: 'Required'}],
        })
      }
      const runtimeId = source.config?.runtimeId ?? options?.runtimeId
      request['code'] = await this.resolveCode(code, {...options, runtimeId})
      request['config'] = source.config ?? {}
      checkConfigForType(source.type, source.config, 'monitors.testAdhoc')
    } else {
      checkConfigForType(source.type, source.config, 'monitors.testAdhoc')
    }
    validateRequest(MonitorTestRequestSchema, request, 'monitors.testAdhoc')
    const path = `${BASE}/test`
    const {status, data} = await apiPostWithStatus(this.client, path, request)
    if (status === 202) {
      const run = parseSingle(RunDtoSchema, data, path)
      return wait.wait ? waitForRun(this.client, run.id, wait) : run
    }
    return parseSingle(MonitorTestResultDtoSchema, data, path)
  }

  /**
   * One run now in the first configured region (`POST /monitors/{id}/runs`;
   * code monitors only; works while paused). Never votes on health.
   */
  async runNow(id: string | number, options: WaitFlag = {}): Promise<RunDto> {
    const run = await fetchSingle(this.client, 'POST', monitorPath(id, '/runs'), RunDtoSchema)
    return options.wait ? waitForRun(this.client, run.id, options) : run
  }

  /**
   * Recorded runs in several regions (`POST /monitors/{id}/triggers`; code
   * monitors only). Billed one run per region; never alerts unless
   * `signal: true`. With `{wait: true}` each run is waited for.
   */
  async trigger(id: string | number, input: TriggerRunRequest & WaitFlag & {wait: true}, options?: WaitFlag): Promise<TriggerRunsResult>
  async trigger(id: string | number, input: (TriggerRunRequest & WaitFlag) | undefined, options: WaitFlag & {wait: true}): Promise<TriggerRunsResult>
  async trigger(id: string | number, input?: TriggerRunRequest & WaitFlag, options?: WaitFlag): Promise<TriggerRunsResponse>
  async trigger(id: string | number, input?: TriggerRunRequest & WaitFlag, options?: WaitFlag): Promise<TriggerRunsResponse | TriggerRunsResult> {
    const {body, wait} = splitWait(input, options)
    const request = body ?? {}
    validateRequest(TriggerRunRequestSchema, request, 'monitors.trigger')
    const response = await fetchSingle(this.client, 'POST', monitorPath(id, '/triggers'), TriggerRunsResponseSchema, request)
    if (!wait.wait) return response
    const runs = await Promise.all(response.runs.map((ref) => waitForRun(this.client, ref.id, wait)))
    return {...response, runs}
  }

  /** Runs of this monitor (`GET /monitors/{id}/runs`). */
  async runs(id: string, filter: MonitorRunListFilter = {}): Promise<CursorPage<RunDto>> {
    const {cursor, limit, ...query} = filter
    return fetchCursorPage(this.client, monitorPath(id, '/runs'), RunDtoSchema, {cursor, limit: limit ?? undefined, query})
  }

  // ── Publish, roll back, ownership ────────────────────────────────

  /**
   * Make a revision live (`POST /monitors/{id}/publish`). Untested drafts
   * publish unless `requireTested: true`; pass `expectedLiveRevisionId` so a
   * stale caller cannot publish over a newer change.
   */
  async publish(id: string | number, body: PublishRevisionRequest): Promise<DefinitionHeadDto> {
    validateRequest(PublishRevisionRequestSchema, body, 'monitors.publish')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/publish'), DefinitionHeadDtoSchema, body)
  }

  /** Restore an earlier revision (`POST /monitors/{id}/rollback`). */
  async rollback(id: string | number, body: RollbackRevisionRequest): Promise<DefinitionHeadDto> {
    validateRequest(RollbackRevisionRequestSchema, body, 'monitors.rollback')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/rollback'), DefinitionHeadDtoSchema, body)
  }

  /** What a rollback would change (`GET /monitors/{id}/rollback-preview`). */
  async rollbackPreview(id: string | number, options: {revisionId?: string} = {}): Promise<RollbackPreviewDto> {
    return fetchSingle(this.client, 'GET', monitorPath(id, '/rollback-preview'), RollbackPreviewDtoSchema, undefined, options)
  }

  /** Move ownership to another tool (`POST /monitors/{id}/transfer`). */
  async transfer(id: string | number, body: TransferMonitorRequest): Promise<MonitorDto> {
    validateRequest(TransferMonitorRequestSchema, body, 'monitors.transfer')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/transfer'), MonitorDtoSchema, body)
  }

  /** Clear an overlay set outside the owning tool (`POST /monitors/{id}/takeover`). */
  async takeover(id: string | number, body: TakeoverMonitorRequest): Promise<MonitorDto> {
    validateRequest(TakeoverMonitorRequestSchema, body, 'monitors.takeover')
    return fetchSingle(this.client, 'POST', monitorPath(id, '/takeover'), MonitorDtoSchema, body)
  }

  /** How the live monitor differs from what was last applied (`GET /monitors/{id}/drift`). */
  async drift(id: string | number): Promise<MonitorDriftDto> {
    return fetchSingle(this.client, 'GET', monitorPath(id, '/drift'), MonitorDriftDtoSchema)
  }

  // ── Deprecated ───────────────────────────────────────────────────

  /** @deprecated since 1.12, removed 2027-01-31. Use `monitors.history.list(id)`, which covers code and uptime runs. */
  async results(id: string | number, options: {cursor?: string; limit?: number} = {}): Promise<CursorPage<CheckResultDto>> {
    deprecated('monitors.results(id)', 'monitors.history.list(id)')
    return fetchCursorPage(this.client, monitorPath(id, '/results'), CheckResultDtoSchema, options)
  }

  // ── Helpers ──────────────────────────────────────────────────────

  /** `code` → `MonitorCodeSpec`: an uploaded bundle passes through; files are bundled and uploaded. */
  async resolveCode(code: MonitorCode, options: CodeOptions = {}): Promise<MonitorCodeSpec> {
    if (isCodeSpec(code)) return code
    return (await this.deps.bundles.createWithCode(code, options)).code
  }

  private async authoringBody(input: CreateMonitorInput | UpdateMonitorInput, options: CodeOptions): Promise<Record<string, unknown>> {
    const {environment, code, ...rest} = input
    const body: Record<string, unknown> = {...rest}
    if (environment !== undefined) body['environmentId'] = await this.deps.environments.resolveId(environment)
    if (code !== undefined && code !== null) {
      const config = input.config
      const pinned = config && 'runtimeId' in config ? config.runtimeId : undefined
      body['code'] = await this.resolveCode(code, {...options, runtimeId: options.runtimeId ?? pinned})
    } else if (code === null) {
      body['code'] = null
    }
    return body
  }
}
