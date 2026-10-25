import createClient from 'openapi-fetch'
import type {ZodType} from 'zod'
import type {paths} from './generated/api.js'
import type {DevhelmConfig, Page, CursorPage} from './types.js'
import {DevhelmError, TransportError, ValidationError} from './errors.js'
import {errorFromResponse, parseRetryAfter} from './error-mapping.js'
import {parseSingle, parsePage, parseCursorPage} from './validation.js'
import type {Wire} from './json.js'
import {SDK_VERSION} from './generated/version.js'

const DEFAULT_BASE_URL = 'https://api.devhelm.io'
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_SURFACE = 'sdk-js'
const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000
const BASE_RETRY_DELAY_MS = 500

export type ApiClient = ReturnType<typeof createClient<paths>>

/** Where the client found its token (explicit option, env var, or CLI context). */
export type TokenSource = 'option' | 'env' | 'context'

/** Saved CLI login (`~/.devhelm/contexts.json`), read by the Node entry only. */
export interface StoredContext {
  name: string
  apiUrl?: string
  token?: string
  orgId?: string
  workspaceId?: string
}

/** Environment the client runs in: Node reads env vars and the CLI context; the web entry reads neither. */
export interface Platform {
  env(name: string): string | undefined
  readContext(): StoredContext | undefined
}

/** One logical call, passed to {@link DevhelmConfig.idempotencyKey}. */
export interface IdempotencyCall {
  method: string
  url: string
  /** 1-based count of POSTs made by this client instance. */
  sequence: number
}

/** Configuration after defaults, env vars and the CLI context are applied. */
export interface ResolvedConfig {
  token: string
  tokenSource: TokenSource
  baseUrl: string
  orgId: string
  workspaceId: string | undefined
  client: string
  maxAttempts: number
  maxRetryDelayMs: number
  fetch: (request: Request) => Promise<Response>
  idempotencyKey: ((call: IdempotencyCall) => string | null | undefined) | undefined
  headers: Record<string, string>
}

export const browserPlatform: Platform = {
  env: () => undefined,
  readContext: () => undefined,
}

/** Reads `process.env` when there is one; no CLI context. */
export const envPlatform: Platform = {
  env: (name) => (globalThis as {process?: {env?: Record<string, string | undefined>}}).process?.env?.[name],
  readContext: () => undefined,
}

/**
 * Apply the token and header rules of doc 42 §5.2:
 *   token:   explicit option → DEVHELM_API_TOKEN → CLI context
 *   baseUrl: explicit option → DEVHELM_API_URL → CLI context → production
 *   org / workspace: explicit option → DEVHELM_ORG_ID / DEVHELM_WORKSPACE_ID → CLI context
 */
export function resolveConfig(config: DevhelmConfig, platform: Platform): ResolvedConfig {
  let token = config.token
  let tokenSource: TokenSource = 'option'
  if (!token) {
    token = platform.env('DEVHELM_API_TOKEN')
    tokenSource = 'env'
  }
  // A context's URL, org and workspace belong to its token: never mix them with another token.
  let context: StoredContext | undefined
  if (!token) {
    context = safeReadContext(platform)
    if (context?.token) {
      token = context.token
      tokenSource = 'context'
    } else {
      context = undefined
    }
  }
  if (token === undefined || token === '') {
    throw new ValidationError(
      'No API token: pass {token}, set DEVHELM_API_TOKEN, or run `devhelm auth login`',
      {code: 'NO_TOKEN', next: {command: 'devhelm auth login', docs: 'https://docs.devhelm.io/sdk/authentication'}},
    )
  }
  const baseUrl = (config.baseUrl ?? platform.env('DEVHELM_API_URL') ?? context?.apiUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  const orgId = config.orgId ?? platform.env('DEVHELM_ORG_ID') ?? context?.orgId ?? '1'
  const workspaceId = config.workspaceId ?? platform.env('DEVHELM_WORKSPACE_ID') ?? context?.workspaceId
  const client = config.client ?? `${DEFAULT_SURFACE}/${SDK_VERSION}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-phelm-org-id': orgId,
    'X-DevHelm-Client': client,
    ...buildTelemetryHeaders(config, platform),
  }
  if (workspaceId) headers['x-phelm-workspace-id'] = workspaceId

  const fetchImpl = config.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new ValidationError('No fetch implementation: pass {fetch} on this runtime', {code: 'FETCH_UNAVAILABLE'})
  }

  return {
    token,
    tokenSource,
    baseUrl,
    orgId,
    workspaceId,
    client,
    maxAttempts: Math.max(1, Math.min(config.retry?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS)),
    maxRetryDelayMs: config.retry?.maxDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS,
    fetch: config.fetch ?? ((input: Request) => globalThis.fetch(input)),
    idempotencyKey: config.idempotencyKey,
    headers,
  }
}

function safeReadContext(platform: Platform): StoredContext | undefined {
  try {
    return platform.readContext()
  } catch {
    return undefined
  }
}

/**
 * X-DevHelm-Surface* telemetry headers for one client instance.
 *
 * Empty when DEVHELM_TELEMETRY=0. `X-DevHelm-Client` is not telemetry: the
 * API uses it to record who created a revision, so it is always sent.
 * See https://devhelm.io/telemetry.
 */
function buildTelemetryHeaders(config: DevhelmConfig, platform: Platform): Record<string, string> {
  if ((platform.env('DEVHELM_TELEMETRY') ?? '').trim() === '0') {
    return {}
  }
  const headers: Record<string, string> = {
    'X-DevHelm-Surface': config.surface ?? DEFAULT_SURFACE,
    'X-DevHelm-Surface-Version': config.surfaceVersion ?? SDK_VERSION,
    // Always identify the underlying SDK so the API can tell a raw SDK call
    // from a wrapper-on-top-of-SDK call.
    'X-DevHelm-Sdk-Name': DEFAULT_SURFACE,
  }
  if (config.surfaceMetadata) {
    for (const [key, value] of Object.entries(config.surfaceMetadata)) {
      headers[`X-DevHelm-${key}`] = value
    }
  }
  return headers
}

// ── Transport: retries, idempotency keys, typed errors ─────────────────

/** UUID v4 from the platform's Web Crypto (Node ≥ 18, browsers). */
export function uuidV4(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new ValidationError('No Web Crypto on this runtime: pass {idempotencyKey} to generate Idempotency-Key values', {code: 'CRYPTO_UNAVAILABLE'})
  }
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Resolve after `ms`, or reject with the abort reason. */
export function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortReason(signal))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, {once: true})
  })
}

export function abortReason(signal: AbortSignal | null | undefined): Error {
  const reason: unknown = signal?.reason
  if (reason instanceof Error) return reason
  return new DOMException('The operation was aborted', 'AbortError')
}

const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'])

/**
 * The transport every call goes through. It adds the auth and client
 * headers, an `Idempotency-Key` on each POST (one per logical call, reused
 * only by retries of that call), and retries 429, 503 and `retryable: true`
 * 409s (`DEPLOY_LOCKED`, `IDEMPOTENCY_KEY_IN_PROGRESS`) honouring
 * `Retry-After`, at most `maxAttempts` times with jitter. A POST is retried
 * only because it carries an idempotency key; PATCH is never retried.
 */
export class Transport {
  readonly config: ResolvedConfig
  readonly api: ApiClient
  private postSequence = 0

  constructor(config: ResolvedConfig) {
    this.config = config
    this.api = createClient<paths>({
      baseUrl: config.baseUrl,
      headers: config.headers,
      fetch: (input: Request) => this.send(input),
    })
    transports.set(this.api, this)
  }

  /** Absolute URL for an API path (`/api/v1/...`) with an optional query. */
  url(path: string, query?: QueryParams): string {
    const url = new URL(this.config.baseUrl + path)
    if (query) appendQuery(url, query)
    return url.toString()
  }

  /** Build a request carrying the client's headers. */
  request(method: string, path: string, init: RawRequestInit = {}): Request {
    const headers = new Headers(this.config.headers)
    for (const [k, v] of Object.entries(init.headers ?? {})) headers.set(k, v)
    if (init.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    const body = init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : toArrayBuffer(init.body)
    return new Request(this.url(path, init.query), {method, headers, body, signal: init.signal ?? null})
  }

  /** Send a request with retries. Non-2xx responses are returned, not thrown. */
  async send(request: Request): Promise<Response> {
    let prepared = request
    if (prepared.method === 'POST' && !prepared.headers.has('Idempotency-Key')) {
      const headers = new Headers(prepared.headers)
      this.postSequence += 1
      const key = this.config.idempotencyKey?.({method: 'POST', url: prepared.url, sequence: this.postSequence}) || uuidV4()
      headers.set('Idempotency-Key', key)
      prepared = new Request(prepared, {headers})
    }
    const canRetry = RETRYABLE_METHODS.has(prepared.method) || (prepared.method === 'POST' && prepared.headers.has('Idempotency-Key'))
    const attempts = canRetry ? this.config.maxAttempts : 1

    for (let attempt = 1; ; attempt++) {
      const current = attempt < attempts ? prepared.clone() : prepared
      let response: Response
      try {
        response = await this.config.fetch(current)
      } catch (e) {
        if (prepared.signal?.aborted) throw abortReason(prepared.signal)
        const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
        throw new TransportError(message, {cause: e instanceof Error ? e : undefined})
      }
      if (attempt >= attempts) return response
      const delay = await this.retryDelay(response, attempt)
      if (delay === null) return response
      // Drain the body so the connection can be reused.
      await response.body?.cancel().catch(() => undefined)
      await sleep(delay, prepared.signal)
    }
  }

  /** Milliseconds to wait before retrying, or null when the response is final. */
  private async retryDelay(response: Response, attempt: number): Promise<number | null> {
    const status = response.status
    let retry = status === 429 || status === 503
    if (status === 409) {
      retry = await bodyIsRetryable(response)
    }
    if (!retry) return null
    const headerSeconds = parseRetryAfter(response.headers.get('retry-after'))
    const backoff = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), this.config.maxRetryDelayMs)
    const base = headerSeconds !== null ? headerSeconds * 1000 : backoff
    if (base > this.config.maxRetryDelayMs) return null
    // Full jitter on computed backoff; small additive jitter on a server-given delay.
    return headerSeconds !== null ? base + Math.random() * 250 : Math.random() * base
  }

  /** Send and throw the typed error on a non-2xx. */
  async fetchOk(request: Request): Promise<Response> {
    const response = await this.send(request)
    if (!response.ok) throw await errorFromHttpResponse(response)
    return response
  }
}

async function bodyIsRetryable(response: Response): Promise<boolean> {
  try {
    const text = await response.clone().text()
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && (parsed as {retryable?: unknown}).retryable === true
  } catch {
    return false
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export type QueryValue = string | number | boolean | null | undefined | ReadonlyArray<string | number | boolean>
export type QueryParams = Record<string, QueryValue>

export interface RawRequestInit {
  query?: QueryParams
  body?: string | Uint8Array
  headers?: Record<string, string>
  signal?: AbortSignal
}

function appendQuery(url: URL, query: QueryParams): void {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, String(v))
    } else {
      url.searchParams.append(key, String(value))
    }
  }
}

/** Typed error for a non-2xx response (reads the body once). */
export async function errorFromHttpResponse(response: Response): Promise<DevhelmError> {
  const body = await response.text().catch(() => '')
  return errorFromResponse(response.status, body, {
    requestId: response.headers.get('x-request-id') ?? undefined,
    retryAfter: response.headers.get('retry-after') ?? undefined,
  })
}

const transports = new WeakMap<ApiClient, Transport>()

/** The transport behind an `ApiClient` built by {@link buildClient}. */
export function transportOf(client: ApiClient): Transport {
  const transport = transports.get(client)
  if (!transport) throw new ValidationError('This ApiClient was not built by the DevHelm SDK', {code: 'CLIENT_UNKNOWN'})
  return transport
}

/** Build the API client for a configuration. */
export function buildClient(config: DevhelmConfig, platform: Platform = envPlatform): ApiClient {
  return new Transport(resolveConfig(config, platform)).api
}

/**
 * Unwraps an openapi-fetch response, throwing the typed error on failure.
 * Returns the raw JSON body; callers validate it through a schema.
 */
export async function checkedFetch(
  promise: Promise<{data?: unknown; error?: unknown; response: Response}>,
): Promise<unknown> {
  return (await checkedFetchWithStatus(promise)).data
}

/**
 * Same as {@link checkedFetch}, but also returns the 2xx status code for
 * endpoints whose success body depends on it (e.g. 200 vs 202).
 */
export async function checkedFetchWithStatus(
  promise: Promise<{data?: unknown; error?: unknown; response: Response}>,
): Promise<{status: number; data: unknown}> {
  let resolved: {data?: unknown; error?: unknown; response: Response}
  try {
    resolved = await promise
  } catch (e) {
    if (e instanceof DevhelmError) throw e
    // An aborted or timed-out signal propagates its reason, not a TransportError.
    if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) throw e
    const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    throw new TransportError(message, {cause: e instanceof Error ? e : undefined})
  }
  const {data, error, response} = resolved
  if (error || !response.ok) {
    // openapi-fetch parses JSON error bodies into `error`; re-serialize so
    // errorFromResponse sees one text form.
    let body: string
    if (typeof error === 'string') {
      body = error
    } else if (error !== undefined && error !== null) {
      try {
        body = JSON.stringify(error)
      } catch {
        body = String(error)
      }
    } else {
      body = await response.text().catch(() => '')
    }
    throw errorFromResponse(response.status, body, {
      requestId: response.headers.get('x-request-id') ?? undefined,
      retryAfter: response.headers.get('retry-after') ?? undefined,
    })
  }
  return {status: response.status, data}
}

// ── Typed dynamic-path helpers ─────────────────────────────────────────
//
// `openapi-fetch` types `client.GET/POST/...` against the literal path
// strings of the spec. The resource layer composes paths at runtime, so the
// structural shape is captured in `DynamicClient` and the strongly-typed
// client is converted at this one boundary.
type FetchEnvelope = {data?: unknown; error?: unknown; response: Response}
type FetchInit = {
  body?: unknown
  params?: {path?: Record<string, unknown>; query?: Record<string, unknown>}
  headers?: Record<string, string>
  signal?: AbortSignal
}

interface DynamicClient {
  GET(path: string, init?: FetchInit): Promise<FetchEnvelope>
  POST(path: string, init?: FetchInit): Promise<FetchEnvelope>
  PUT(path: string, init?: FetchInit): Promise<FetchEnvelope>
  DELETE(path: string, init?: FetchInit): Promise<FetchEnvelope>
  PATCH(path: string, init?: FetchInit): Promise<FetchEnvelope>
}

function asDynamic(client: ApiClient): DynamicClient {
  return client as unknown as DynamicClient
}

/** Per-call request options. */
export interface CallOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

export async function apiGet(client: ApiClient, path: string, query?: Record<string, unknown>, options?: CallOptions): Promise<unknown> {
  const init: FetchInit = {}
  if (query) init.params = {query: compactQuery(query)}
  if (options?.signal) init.signal = options.signal
  if (options?.headers) init.headers = options.headers
  return checkedFetch(asDynamic(client).GET(path, init))
}

export async function apiPost(
  client: ApiClient,
  path: string,
  body?: unknown,
  pathParams?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> {
  return (await apiPostWithStatus(client, path, body, {signal, pathParams})).data
}

/** POST that also returns the success status code. */
export async function apiPostWithStatus(
  client: ApiClient,
  path: string,
  body?: unknown,
  options?: CallOptions & {query?: Record<string, unknown>; pathParams?: Record<string, unknown>},
): Promise<{status: number; data: unknown}> {
  const init: FetchInit = {body}
  if (options?.pathParams || options?.query) {
    init.params = {}
    if (options.pathParams) init.params.path = options.pathParams
    if (options.query) init.params.query = compactQuery(options.query)
  }
  if (options?.signal) init.signal = options.signal
  if (options?.headers) init.headers = options.headers
  return checkedFetchWithStatus(asDynamic(client).POST(path, init))
}

export async function apiPut(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const init: FetchInit = {body}
  if (pathParams) init.params = {path: pathParams}
  return checkedFetch(asDynamic(client).PUT(path, init))
}

export async function apiDelete(
  client: ApiClient,
  path: string,
  pathParams?: Record<string, unknown>,
  query?: Record<string, unknown>,
): Promise<unknown> {
  const init: FetchInit = {}
  if (pathParams || query) {
    init.params = {}
    if (pathParams) init.params.path = pathParams
    if (query) init.params.query = compactQuery(query)
  }
  return checkedFetch(asDynamic(client).DELETE(path, init))
}

export async function apiPatch(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const init: FetchInit = {body}
  if (pathParams) init.params = {path: pathParams}
  return checkedFetch(asDynamic(client).PATCH(path, init))
}

function compactQuery(query: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) out[k] = v
  }
  return out
}

// ── Validated response helpers ──────────────────────────────────────

/** Fetch + validate + unwrap a SingleValueResponse: { data: T } → T. */
export async function fetchSingle<T>(
  client: ApiClient,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  schema: ZodType<T>,
  body?: unknown,
  query?: Record<string, unknown>,
  options?: CallOptions,
): Promise<Wire<T>> {
  let raw: unknown
  switch (method) {
    case 'GET':
      raw = await apiGet(client, path, query, options)
      break
    case 'POST':
      raw = (await apiPostWithStatus(client, path, body, {...options, query})).data
      break
    case 'PUT':
      raw = await apiPut(client, path, body)
      break
    case 'PATCH':
      raw = await apiPatch(client, path, body)
      break
    case 'DELETE':
      raw = await apiDelete(client, path, undefined, query)
      break
  }
  return parseSingle(schema, raw, path)
}

/** DELETE that returns nothing (204). */
export async function fetchVoid(client: ApiClient, path: string, query?: Record<string, unknown>): Promise<void> {
  await apiDelete(client, path, undefined, query)
}

// ── Pagination helpers (validated) ──────────────────────────────────

/** Fetch every page of an offset-paginated endpoint, validating each page. */
export async function fetchAllPages<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  pageSize = DEFAULT_PAGE_SIZE,
  extraQuery?: Record<string, unknown>,
): Promise<Array<Wire<T>>> {
  const all: Array<Wire<T>> = []
  let page = 0

  while (true) {
    const raw = await apiGet(client, path, {...extraQuery, page, size: pageSize})
    const validated = parsePage(schema, raw, path)
    all.push(...validated.data)
    if (!validated.hasNext) break
    page++
  }

  return all
}

/** Fetch one page of an offset-paginated endpoint (validated). */
export async function fetchPage<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  page: number,
  size: number,
  extraQuery?: Record<string, unknown>,
): Promise<Page<Wire<T>>> {
  return fetchTable(client, path, schema, {...extraQuery, page, size})
}

/** Fetch a TableValueResult endpoint (validated). */
export async function fetchTable<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  query?: Record<string, unknown>,
): Promise<Page<Wire<T>>> {
  const raw = await apiGet(client, path, query)
  const validated = parsePage(schema, raw, path)
  return {
    data: validated.data,
    hasNext: validated.hasNext,
    hasPrev: validated.hasPrev,
    totalElements: validated.totalElements ?? null,
    totalPages: validated.totalPages ?? null,
  }
}

/** Fetch one page of a cursor-paginated endpoint (validated). */
export async function fetchCursorPage<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  options: {cursor?: string | null; limit?: number; query?: Record<string, unknown>} = {},
): Promise<CursorPage<Wire<T>>> {
  const query: Record<string, unknown> = {...options.query}
  if (options.limit) query['limit'] = options.limit
  if (options.cursor) query['cursor'] = options.cursor

  const raw = await apiGet(client, path, query)
  const validated = parseCursorPage(schema, raw, path)
  return {
    data: validated.data,
    nextCursor: validated.nextCursor ?? null,
    hasMore: validated.hasMore,
  }
}

/** Walk every page of a cursor-paginated endpoint. */
export async function* iterateCursor<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  options: {limit?: number; query?: Record<string, unknown>} = {},
): AsyncGenerator<Wire<T>, void, undefined> {
  let cursor: string | null = null
  while (true) {
    const page: CursorPage<Wire<T>> = await fetchCursorPage(client, path, schema, {...options, cursor})
    for (const item of page.data) yield item
    if (!page.hasMore || !page.nextCursor) return
    cursor = page.nextCursor
  }
}
