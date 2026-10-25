/**
 * A fetch stub that routes requests to handlers by method and path pattern
 * and records every request.
 */
export interface Recorded {
  method: string
  url: URL
  headers: Headers
  body: string | null
  bytes: Uint8Array | null
}

type Handler = (req: Recorded, match: RegExpMatchArray) => Response | Promise<Response>

export class MockApi {
  readonly requests: Recorded[] = []
  private readonly routes: Array<{method: string; pattern: RegExp; handler: Handler}> = []

  on(method: string, path: string | RegExp, handler: Handler): this {
    const pattern = typeof path === 'string' ? new RegExp(`^${path.replace(/\{[^}]+\}/g, '([^/]+)')}$`) : path
    this.routes.push({method, pattern, handler})
    return this
  }

  /** Requests to a path (method optional). */
  calls(path: string | RegExp, method?: string): Recorded[] {
    const pattern = typeof path === 'string' ? new RegExp(`^${path.replace(/\{[^}]+\}/g, '([^/]+)')}$`) : path
    return this.requests.filter((r) => pattern.test(r.url.pathname) && (!method || r.method === method))
  }

  readonly fetch = async (input: Request): Promise<Response> => {
    const buf = input.body ? new Uint8Array(await input.arrayBuffer()) : null
    const rec: Recorded = {
      method: input.method,
      url: new URL(input.url),
      headers: input.headers,
      body: buf ? new TextDecoder().decode(buf) : null,
      bytes: buf,
    }
    this.requests.push(rec)
    for (const route of this.routes) {
      if (route.method !== rec.method) continue
      const match = rec.url.pathname.match(route.pattern)
      if (match) return route.handler(rec, match)
    }
    return json(404, errorBody(404, 'NOT_FOUND', 'not_found', `No route for ${rec.method} ${rec.url.pathname}`))
  }
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json', ...headers}})
}

export function errorBody(status: number, code: string, category: string, message = code, extra: Record<string, unknown> = {}) {
  return {status, code, category, retryable: false, message, timestamp: 1_700_000_000_000, requestId: 'req_1', ...extra}
}

export const MONITOR_ID = '550e8400-e29b-41d4-a716-446655440000'
export const ENV_ID = '8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e'
export const RUN_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'
export const REVISION_ID = '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d'

export function runDto(overrides: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    organizationId: 1,
    monitorId: MONITOR_ID,
    revisionId: REVISION_ID,
    region: 'us-east',
    source: 'remote_validation',
    countsTowardHealth: false,
    enqueuedAt: '2026-10-21T10:00:00Z',
    phase: 'queued',
    cancelRequested: false,
    bundleDigest: 'sha256:abc',
    capturePolicySnapshot: {},
    bindingVersionSnapshot: {},
    stream: true,
    evidence: [],
    tabCounts: {steps: 0, assets: 0, diff: 0},
    attempt: 1,
    attemptOf: 1,
    attempts: [],
    executionAttempts: [],
    billable: true,
    flaky: false,
    url: `https://app.devhelm.io/runs/${RUN_ID}`,
    ...overrides,
  }
}

export function monitorDto(overrides: Record<string, unknown> = {}) {
  return {
    id: MONITOR_ID,
    organizationId: 1,
    name: 'Checkout',
    type: 'BROWSER',
    config: {timeoutSeconds: 90},
    frequencySeconds: 600,
    enabled: true,
    regions: ['us-east'],
    managedBy: 'API',
    ownerEnforced: false,
    muted: false,
    createdAt: '2026-10-21T10:00:00Z',
    updatedAt: '2026-10-21T10:00:00Z',
    liveRevisionId: REVISION_ID,
    ...overrides,
  }
}

export function sse(events: Array<Record<string, unknown>>): Response {
  const text = events.map((e) => `id: ${String(e['seq'])}\nevent: run\ndata: ${JSON.stringify(e)}\n\n`).join('')
  return new Response(text, {status: 200, headers: {'Content-Type': 'text/event-stream'}})
}

export function runEvent(seq: number, type: string, payload: Record<string, unknown> = {}) {
  return {id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`, organizationId: 1, runId: RUN_ID, seq, type, payload, createdAt: '2026-10-21T10:00:00Z'}
}
