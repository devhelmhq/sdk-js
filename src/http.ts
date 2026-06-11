import createClient from 'openapi-fetch'
import type {ZodType} from 'zod'
import type {paths} from './generated/api.js'
import type {DevhelmConfig, Page, CursorPage} from './types.js'
import {DevhelmTransportError, errorFromResponse} from './errors.js'
import {parseSingle, parsePage, parseCursorPage} from './validation.js'
import {SDK_VERSION} from './version.js'

const DEFAULT_BASE_URL = 'https://api.devhelm.io'
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_SURFACE = 'sdk-js'

export type ApiClient = ReturnType<typeof createClient<paths>>

/**
 * Build the X-DevHelm-Surface* telemetry headers for one client instance.
 *
 * Returns an empty object when DEVHELM_TELEMETRY=0 so the API receives no
 * surface signal at all. Opt-out is intentionally a single env var rather
 * than a constructor flag — users opt out once for the whole process, not
 * per call site. See https://devhelm.io/telemetry.
 */
function buildTelemetryHeaders(config: DevhelmConfig): Record<string, string> {
  if ((process.env['DEVHELM_TELEMETRY'] ?? '').trim() === '0') {
    return {}
  }
  const headers: Record<string, string> = {
    'X-DevHelm-Surface': config.surface ?? DEFAULT_SURFACE,
    'X-DevHelm-Surface-Version': config.surfaceVersion ?? SDK_VERSION,
    // Always identify the underlying SDK so the API can distinguish a raw
    // SDK call from a wrapper-on-top-of-SDK call (the latter overrides
    // Surface but the SDK fingerprint stays available for client-version
    // skew debugging).
    'X-DevHelm-Sdk-Name': DEFAULT_SURFACE,
  }
  if (config.surfaceMetadata) {
    for (const [key, value] of Object.entries(config.surfaceMetadata)) {
      headers[`X-DevHelm-${key}`] = value
    }
  }
  return headers
}

export function buildClient(config: DevhelmConfig): ApiClient {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  const orgId = config.orgId ?? process.env['DEVHELM_ORG_ID'] ?? '1'
  const workspaceId = config.workspaceId ?? process.env['DEVHELM_WORKSPACE_ID'] ?? '1'

  return createClient<paths>({
    baseUrl,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'x-phelm-org-id': orgId,
      'x-phelm-workspace-id': workspaceId,
      ...buildTelemetryHeaders(config),
    },
  })
}

/**
 * Unwraps an openapi-fetch response, throwing a typed error on failure:
 *   - DevhelmApiError (or subclass) when the server returns a non-2xx
 *   - DevhelmTransportError when the request never reached the server
 *
 * Returns the raw JSON body — callers must validate it through a schema.
 */
export async function checkedFetch(
  promise: Promise<{data?: unknown; error?: unknown; response: Response}>,
): Promise<unknown> {
  let resolved: {data?: unknown; error?: unknown; response: Response}
  try {
    resolved = await promise
  } catch (e) {
    // openapi-fetch rejects with the underlying fetch error when no Response
    // was received (DNS failure, connection refused, abort, TLS, etc.).
    // Surface those as DevhelmTransportError so callers can distinguish them
    // from API-level failures.
    const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    throw new DevhelmTransportError(message, {cause: e})
  }
  const {data, error, response} = resolved
  if (error || !response.ok) {
    // openapi-fetch parses JSON error bodies into `error` (object); for non-JSON
    // it leaves `error` as a string or undefined. Re-serialize objects so
    // `errorFromResponse` can extract `code`/`requestId`/`message` uniformly,
    // and only fall back to `response.text()` when openapi-fetch handed us
    // nothing (which also indicates the body wasn't already consumed).
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
    const requestIdHeader = response.headers.get('x-request-id')
    const retryAfterHeader = response.headers.get('retry-after')
    throw errorFromResponse(response.status, body, {
      requestId: requestIdHeader ?? undefined,
      retryAfter: retryAfterHeader ?? undefined,
    })
  }
  return data
}

// ── Typed dynamic-path helpers ─────────────────────────────────────────
//
// `openapi-fetch` types `client.GET/POST/PUT/DELETE/PATCH` against the literal
// path strings declared in the OpenAPI spec, so a call like
// `client.GET("/v1/monitors/{id}", …)` only typechecks if the path literal is
// known at compile time. The handwritten resource layer composes paths at
// runtime (`/v1/${resource}/${id}`), so that compile-time binding can never
// be satisfied. We capture the structural shape of the openapi-fetch methods
// in a typed `DynamicClient` interface and convert the strongly-typed
// `ApiClient` into it at a single boundary, instead of scattering `as any`
// across every helper.
type FetchEnvelope = {data?: unknown; error?: unknown; response: Response}
type FetchInit = {body?: unknown; params?: {path?: Record<string, unknown>; query?: Record<string, unknown>}}

interface DynamicClient {
  GET(path: string, init?: FetchInit): Promise<FetchEnvelope>
  POST(path: string, init?: FetchInit): Promise<FetchEnvelope>
  PUT(path: string, init?: FetchInit): Promise<FetchEnvelope>
  DELETE(path: string, init?: FetchInit): Promise<FetchEnvelope>
  PATCH(path: string, init?: FetchInit): Promise<FetchEnvelope>
}

function asDynamic(client: ApiClient): DynamicClient {
  // openapi-fetch's runtime methods accept any string; the literal-path
  // typing exists purely for callers that know the path at compile time.
  // This is the single P5-tracked boundary in the SDK runtime.
  return client as unknown as DynamicClient
}

export async function apiGet(client: ApiClient, path: string, query?: Record<string, unknown>): Promise<unknown> {
  return checkedFetch(asDynamic(client).GET(path, query ? {params: {query}} : undefined))
}

export async function apiPost(client: ApiClient, path: string, body?: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const init: FetchInit = {body}
  if (pathParams) init.params = {path: pathParams}
  return checkedFetch(asDynamic(client).POST(path, init))
}

export async function apiPut(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const init: FetchInit = {body}
  if (pathParams) init.params = {path: pathParams}
  return checkedFetch(asDynamic(client).PUT(path, init))
}

export async function apiDelete(client: ApiClient, path: string, pathParams?: Record<string, unknown>): Promise<void> {
  const init: FetchInit = {}
  if (pathParams) init.params = {path: pathParams}
  await checkedFetch(asDynamic(client).DELETE(path, init))
}

export async function apiPatch(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const init: FetchInit = {body}
  if (pathParams) init.params = {path: pathParams}
  return checkedFetch(asDynamic(client).PATCH(path, init))
}

// ── Validated response helpers ──────────────────────────────────────

/**
 * Fetch + validate + unwrap a SingleValueResponse: { data: T } → T.
 *
 * DELETE is intentionally excluded — it returns no body, so the schema
 * argument would be unused and the caller would receive `undefined` as `T`.
 * Use `fetchVoid` for DELETE operations instead.
 */
export async function fetchSingle<T>(
  client: ApiClient,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  schema: ZodType<T>,
  body?: unknown,
  query?: Record<string, unknown>,
): Promise<T> {
  let raw: unknown
  switch (method) {
    case 'GET':
      raw = await apiGet(client, path, query)
      break
    case 'POST':
      raw = await apiPost(client, path, body)
      break
    case 'PUT':
      raw = await apiPut(client, path, body)
      break
    case 'PATCH':
      raw = await apiPatch(client, path, body)
      break
  }
  return parseSingle(schema, raw, path)
}

/**
 * DELETE wrapper that returns nothing. Use this instead of `fetchSingle` for
 * delete operations — the API returns 204/empty body, so there is no payload
 * to validate and the resulting `Promise<void>` matches every caller's
 * expectation without an unsafe `undefined as unknown as T` cast.
 */
export async function fetchVoid(client: ApiClient, path: string): Promise<void> {
  await apiDelete(client, path)
}

// ── Pagination helpers (validated) ──────────────────────────────────

/**
 * Fetches all pages from an offset-paginated endpoint, validating each page.
 */
export async function fetchAllPages<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = []
  let page = 0

  while (true) {
    const raw = await apiGet(client, path, {page, size: pageSize})
    const validated = parsePage(schema, raw, path)
    all.push(...validated.data)
    if (!validated.hasNext) break
    page++
  }

  return all
}

/**
 * Fetches a single page from an offset-paginated endpoint (validated).
 */
export async function fetchPage<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  page: number,
  size: number,
): Promise<Page<T>> {
  const raw = await apiGet(client, path, {page, size})
  const validated = parsePage(schema, raw, path)
  return {
    data: validated.data,
    hasNext: validated.hasNext,
    hasPrev: validated.hasPrev,
    totalElements: validated.totalElements ?? null,
    totalPages: validated.totalPages ?? null,
  }
}

/**
 * Fetches a single page from a cursor-paginated endpoint (validated).
 */
export async function fetchCursorPage<T>(
  client: ApiClient,
  path: string,
  schema: ZodType<T>,
  options: {cursor?: string; limit?: number} = {},
): Promise<CursorPage<T>> {
  const query: Record<string, unknown> = {}
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
