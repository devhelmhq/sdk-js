import createClient from 'openapi-fetch'
import type {paths} from './generated/api.js'
import type {DevhelmConfig, Page, CursorPage} from './types.js'
import {errorFromResponse} from './errors.js'

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
 */
export async function checkedFetch<T>(
  promise: Promise<{data?: T; error?: unknown; response: Response}>,
): Promise<T> {
  const {data, error, response} = await promise
  if (error || !response.ok) {
    const body = typeof error === 'string' ? error : await response.text().catch(() => '')
    throw errorFromResponse(response.status, body)
  }
  return data as T
}

/**
 * Unwrap a SingleValueResponse envelope: { data: T } -> T
 */
export function unwrapSingle<T>(resp: {data?: T} | T): T {
  if (resp && typeof resp === 'object' && 'data' in resp) {
    return (resp as {data: T}).data
  }
  return resp as T
}

// ── Typed dynamic-path helpers ─────────────────────────────────────────

export async function apiGet<T>(client: ApiClient, path: string, query?: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch<T>((client as any).GET(path, query ? {params: {query}} : undefined))
}

export async function apiPost<T>(client: ApiClient, path: string, body?: unknown, pathParams?: Record<string, unknown>): Promise<T> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch<T>((client as any).POST(path, {body, params}))
}

export async function apiPut<T>(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<T> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch<T>((client as any).PUT(path, {body, params}))
}

export async function apiDelete(client: ApiClient, path: string, pathParams?: Record<string, unknown>): Promise<void> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await checkedFetch<unknown>((client as any).DELETE(path, {params}))
}

export async function apiPatch<T>(client: ApiClient, path: string, body: unknown, pathParams?: Record<string, unknown>): Promise<T> {
  const params: Record<string, unknown> = {}
  if (pathParams) params['path'] = pathParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkedFetch<T>((client as any).PATCH(path, {body, params}))
}

// ── Pagination helpers ─────────────────────────────────────────────────

interface PaginatedResponse<T> {
  data?: T[]
  hasNext?: boolean
  hasPrev?: boolean
}

/**
 * Fetches all pages from an offset-paginated (Spring Pageable) endpoint.
 */
export async function fetchAllPages<T>(client: ApiClient, path: string, pageSize = DEFAULT_PAGE_SIZE): Promise<T[]> {
  const all: T[] = []
  let page = 0

  while (true) {
    const resp = await apiGet<PaginatedResponse<T>>(client, path, {page, size: pageSize})
    const items = resp.data ?? []
    all.push(...items)
    if (!resp.hasNext) break
    page++
  }

  return all
}

/**
 * Fetches a single page from an offset-paginated endpoint.
 */
export async function fetchPage<T>(
  client: ApiClient,
  path: string,
  page: number,
  size: number,
): Promise<Page<T>> {
  const resp = await apiGet<PaginatedResponse<T>>(client, path, {page, size})
  return {
    data: resp.data ?? [],
    hasNext: resp.hasNext ?? false,
    hasPrev: resp.hasPrev ?? false,
  }
}

/**
 * Fetches a single page from a cursor-paginated endpoint.
 */
export async function fetchCursorPage<T>(
  client: ApiClient,
  path: string,
  options: {cursor?: string; limit?: number} = {},
): Promise<CursorPage<T>> {
  const query: Record<string, unknown> = {}
  if (options.limit) query['limit'] = options.limit
  if (options.cursor) query['cursor'] = options.cursor

  const resp = await apiGet<{data?: T[]; nextCursor?: string; hasMore?: boolean}>(client, path, query)
  return {
    data: resp.data ?? [],
    nextCursor: resp.nextCursor ?? null,
    hasMore: resp.hasMore ?? false,
  }
}
