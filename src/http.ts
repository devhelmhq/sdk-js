import createClient from 'openapi-fetch'
import type {ZodType} from 'zod'
import type {paths} from './generated/api.js'
import type {DevhelmConfig, Page, CursorPage} from './types.js'
import {errorFromResponse} from './errors.js'
import {parseSingle, parsePage, parseCursorPage} from './validation.js'

const DEFAULT_BASE_URL = 'https://api.devhelm.io'
const DEFAULT_PAGE_SIZE = 200

export type ApiClient = ReturnType<typeof createClient<paths>>

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
    },
  })
}

/**
 * Unwraps an openapi-fetch response, throwing a typed DevhelmError on failure.
 * Returns the raw JSON body — callers must validate it through a schema.
 */
export async function checkedFetch(
  promise: Promise<{data?: unknown; error?: unknown; response: Response}>,
): Promise<unknown> {
  const {data, error, response} = await promise
  if (error || !response.ok) {
    const body = typeof error === 'string' ? error : await response.text().catch(() => '')
    throw errorFromResponse(response.status, body)
  }
  return data
}

// ── Typed dynamic-path helpers ─────────────────────────────────────────

export async function apiGet(client: ApiClient, path: string, query?: Record<string, unknown>): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch((client as any).GET(path, query ? {params: {query}} : undefined))
}

export async function apiPost(client: ApiClient, path: string, body?: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch((client as any).POST(path, {body, params}))
}

export async function apiPut(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch((client as any).PUT(path, {body, params}))
}

export async function apiDelete(client: ApiClient, path: string, pathParams?: Record<string, unknown>): Promise<void> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await checkedFetch((client as any).DELETE(path, {params}))
}

export async function apiPatch(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<unknown> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch((client as any).PATCH(path, {body, params}))
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
