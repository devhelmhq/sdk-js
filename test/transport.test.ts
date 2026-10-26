/**
 * Transport (doc 42 §5.2): token and header resolution, Idempotency-Key per
 * logical call, bounded retries on 429 / 503 / retryable 409, and one typed
 * error per category with the D-2 exit code.
 */
import {afterEach, describe, expect, it} from 'vitest'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {
  AuthError,
  BlockedError,
  ConfirmationRequiredError,
  ConflictError,
  Devhelm,
  DevhelmApiError,
  DevhelmAuthError,
  DevhelmConflictError,
  DevhelmError,
  DevhelmNotFoundError,
  DevhelmRateLimitError,
  DevhelmServerError,
  DevhelmTransportError,
  DevhelmValidationError,
  ERROR_CATEGORIES,
  GoneError,
  NotFoundError,
  OwnershipError,
  PermissionError,
  PlanLimitError,
  PlatformError,
  QuotaError,
  RateLimitError,
  SDK_VERSION,
  TransportError,
  ValidationError,
  WaitTimeoutError,
  errorFromResponse,
  exitCodeForCategory,
  type ErrorCategory,
} from '../src/index.js'
import {Devhelm as WebDevhelm} from '../src/web.js'
import {MockApi, errorBody, json, MONITOR_ID, monitorDto} from './helpers/mock-api.js'

const savedEnv = {...process.env}
afterEach(() => {
  process.env = {...savedEnv}
})

function client(api: MockApi, extra: Record<string, unknown> = {}) {
  return new Devhelm({token: 't', baseUrl: 'http://api.test', fetch: api.fetch, retry: {maxDelayMs: 50}, ...extra})
}

describe('token and header resolution', () => {
  it('explicit token → DEVHELM_API_TOKEN → CLI context; none → NO_TOKEN', () => {
    process.env['DEVHELM_API_TOKEN'] = 'env-token'
    expect(new Devhelm({token: 'opt'}).config.tokenSource).toBe('option')
    expect(new Devhelm().config.tokenSource).toBe('env')

    delete process.env['DEVHELM_API_TOKEN']
    const dir = mkdtempSync(join(tmpdir(), 'devhelm-ctx-'))
    try {
      process.env['DEVHELM_CONFIG_DIR'] = dir
      writeFileSync(join(dir, 'contexts.json'), JSON.stringify({version: 1, current: 'acme', contexts: {acme: {name: 'acme', apiUrl: 'https://ctx.example', token: 'ctx-token'}}}))
      const fromContext = new Devhelm()
      expect(fromContext.config.tokenSource).toBe('context')
      expect(fromContext.config.baseUrl).toBe('https://ctx.example')

      writeFileSync(join(dir, 'contexts.json'), '{broken')
      const err = (() => {
        try {
          new Devhelm()
        } catch (e) {
          return e
        }
        return null
      })()
      expect(err).toBeInstanceOf(ValidationError)
      expect((err as ValidationError).code).toBe('NO_TOKEN')
      expect((err as ValidationError).exitCode).toBe(4)
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('DEVHELM_API_URL, DEVHELM_ORG_ID and DEVHELM_WORKSPACE_ID apply; explicit options win', async () => {
    process.env['DEVHELM_API_URL'] = 'http://env.test/'
    process.env['DEVHELM_ORG_ID'] = '9'
    process.env['DEVHELM_WORKSPACE_ID'] = '7'
    const api = new MockApi().on('GET', '/api/v1/monitors/{id}', () => json(200, {data: monitorDto()}))
    const c = new Devhelm({token: 't', fetch: api.fetch})
    expect(c.config.baseUrl).toBe('http://env.test')
    await c.monitors.get(MONITOR_ID)
    const req = api.requests[0]!
    expect(req.url.origin).toBe('http://env.test')
    expect(req.headers.get('x-phelm-org-id')).toBe('9')
    expect(req.headers.get('x-phelm-workspace-id')).toBe('7')
    expect(new Devhelm({token: 't', baseUrl: 'http://opt.test', orgId: '3'}).config).toMatchObject({baseUrl: 'http://opt.test', orgId: '3'})
  })

  it('sends X-DevHelm-Client on every call; wrappers override it', async () => {
    const api = new MockApi().on('GET', '/api/v1/monitors/{id}', () => json(200, {data: monitorDto()}))
    await client(api).monitors.get(MONITOR_ID)
    await client(api, {client: 'cli/1.30.0'}).monitors.get(MONITOR_ID)
    expect(api.requests[0]!.headers.get('x-devhelm-client')).toBe(`sdk-js/${SDK_VERSION}`)
    expect(api.requests[1]!.headers.get('x-devhelm-client')).toBe('cli/1.30.0')
  })

  it('the web entry needs an explicit token and reads no env', () => {
    process.env['DEVHELM_API_TOKEN'] = 'env-token'
    expect(() => new WebDevhelm({token: ''})).toThrow(ValidationError)
    expect(new WebDevhelm({token: 'x'}).config.tokenSource).toBe('option')
  })
})

describe('idempotency keys', () => {
  it('adds one UUID per POST, reuses it on retries, and never on GET', async () => {
    let attempts = 0
    const api = new MockApi()
      .on('POST', '/api/v1/monitors/{id}/pause', () => {
        attempts += 1
        return attempts === 1 ? json(503, errorBody(503, 'UNAVAILABLE', 'platform'), {'Retry-After': '0'}) : json(200, {data: monitorDto()})
      })
      .on('GET', '/api/v1/monitors/{id}', () => json(200, {data: monitorDto()}))
    const c = client(api)
    await c.monitors.pause(MONITOR_ID)
    await c.monitors.pause(MONITOR_ID)
    await c.monitors.get(MONITOR_ID)
    const posts = api.calls('/api/v1/monitors/{id}/pause')
    expect(posts).toHaveLength(3)
    const keys = posts.map((p) => p.headers.get('idempotency-key'))
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/)
    expect(keys[1]).toBe(keys[0])
    expect(keys[2]).not.toBe(keys[0])
    expect(api.calls('/api/v1/monitors/{id}', 'GET')[0]!.headers.get('idempotency-key')).toBeNull()
  })

  it('takes keys from the idempotencyKey hook (CLI: derived from the CI run)', async () => {
    const api = new MockApi().on('POST', '/api/v1/monitors/{id}/resume', () => json(200, {data: monitorDto()}))
    const c = client(api, {idempotencyKey: (call: {sequence: number}) => `ci-run-42-${call.sequence}`})
    await c.monitors.resume(MONITOR_ID)
    await c.monitors.resume(MONITOR_ID)
    expect(api.requests.map((r) => r.headers.get('idempotency-key'))).toEqual(['ci-run-42-1', 'ci-run-42-2'])
  })
})

describe('retries', () => {
  it('retries 429 honouring Retry-After, at most maxAttempts times, then throws RateLimitError', async () => {
    const api = new MockApi().on('GET', '/api/v1/monitors/{id}', () => json(429, errorBody(429, 'RATE_LIMITED', 'rate_limit', 'slow', {retryable: true}), {'Retry-After': '0'}))
    const err = await client(api).monitors.get(MONITOR_ID).catch((e: unknown) => e)
    expect(api.requests).toHaveLength(5)
    expect(err).toBeInstanceOf(RateLimitError)
    expect((err as RateLimitError).exitCode).toBe(11)
  })

  it('retries a retryable 409 (DEPLOY_LOCKED) and not a plain one', async () => {
    let n = 0
    const api = new MockApi()
      .on('POST', '/api/v1/monitors/{id}/publish', () => {
        n += 1
        return n < 3 ? json(409, errorBody(409, 'DEPLOY_LOCKED', 'conflict', 'locked', {retryable: true}), {'Retry-After': '0'}) : json(200, {data: {}})
      })
      .on('POST', '/api/v1/monitors/{id}/rollback', () => json(409, errorBody(409, 'LIVE_REVISION_CHANGED', 'conflict')))
    const c = client(api)
    await c.monitors.publish(MONITOR_ID, {revisionId: MONITOR_ID}).catch(() => undefined)
    expect(api.calls('/api/v1/monitors/{id}/publish')).toHaveLength(3)
    const err = await c.monitors.rollback(MONITOR_ID, {reason: 'x'}).catch((e: unknown) => e)
    expect(api.calls('/api/v1/monitors/{id}/rollback')).toHaveLength(1)
    expect(err).toBeInstanceOf(ConflictError)
    expect((err as ConflictError).code).toBe('LIVE_REVISION_CHANGED')
  })

  it('does not retry a 500 or a PATCH', async () => {
    const api = new MockApi()
      .on('GET', '/api/v1/monitors/{id}', () => json(500, errorBody(500, 'INTERNAL', 'platform')))
      .on('PATCH', '/api/v1/incidents/{id}', () => json(503, errorBody(503, 'UNAVAILABLE', 'platform')))
    const c = client(api)
    await expect(c.monitors.get(MONITOR_ID)).rejects.toBeInstanceOf(PlatformError)
    await expect(c.incidents.update(MONITOR_ID, {title: 'x'})).rejects.toBeInstanceOf(PlatformError)
    expect(api.requests).toHaveLength(2)
  })

  it('does not wait longer than maxDelayMs: a long Retry-After is final', async () => {
    const api = new MockApi().on('GET', '/api/v1/monitors/{id}', () => json(429, errorBody(429, 'RATE_LIMITED', 'rate_limit'), {'Retry-After': '3600'}))
    await expect(client(api).monitors.get(MONITOR_ID)).rejects.toBeInstanceOf(RateLimitError)
    expect(api.requests).toHaveLength(1)
  })

  it('maps a network failure to TransportError (exit 12)', async () => {
    const c = new Devhelm({token: 't', baseUrl: 'http://api.test', fetch: async () => {
      throw new TypeError('fetch failed')
    }})
    const err = await c.monitors.get(MONITOR_ID).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(TransportError)
    expect(err).toBeInstanceOf(DevhelmTransportError)
    expect((err as TransportError).exitCode).toBe(12)
    expect((err as TransportError).category).toBe('transport')
  })
})

describe('typed errors per category', () => {
  const table: Array<[ErrorCategory, number, string, new (...args: never[]) => DevhelmError, number]> = [
    ['validation', 400, 'FIELD_UNKNOWN', ValidationError, 4],
    ['blocked', 409, 'RUN_KEYS_MISSING', BlockedError, 4],
    ['auth', 401, 'API_KEY_REVOKED', AuthError, 17],
    ['permission', 403, 'SCOPE_REQUIRED', PermissionError, 17],
    ['ownership', 409, 'MONITOR_OWNED_BY_OTHER', OwnershipError, 17],
    ['plan', 402, 'MONITOR_FREQUENCY_BELOW_PLAN_MIN', PlanLimitError, 16],
    ['quota', 402, 'SYNTHETICS_USAGE_CAPPED', QuotaError, 16],
    ['rate_limit', 429, 'RATE_LIMITED', RateLimitError, 11],
    ['conflict', 409, 'REVISION_UNTESTED', ConflictError, 18],
    ['confirmation_required', 409, 'CONFIRMATION_REQUIRED', ConfirmationRequiredError, 15],
    ['not_found', 404, 'NOT_FOUND', NotFoundError, 4],
    ['gone', 410, 'RUN_EXPIRED', GoneError, 20],
    ['platform', 503, 'RUNTIME_UNAVAILABLE', PlatformError, 11],
  ]

  for (const [category, status, code, cls, exit] of table) {
    it(`${category} → ${cls.name}, exit ${exit}`, () => {
      const err = errorFromResponse(status, JSON.stringify(errorBody(status, code, category, `${code} happened`, {
        retryAfterSeconds: 5, resource: 'browser_runs', used: 10, limit: 10, resetsAt: '2026-11-01T00:00:00Z', plan: 'FREE',
        upgradeUrl: 'https://app.devhelm.io/settings/billing', canRaise: 'org admin', owner: 'TERRAFORM', required: 'runs:execute',
        have: 3, reason: 'scope', next: {command: 'devhelm account usage', docs: 'https://docs.devhelm.io/errors/X'},
        details: {key: {nested: 1}}, expiredAt: '2026-10-01T00:00:00Z', policy: 'P7D', errors: [{code, field: 'a.b', message: 'bad'}],
      })))
      expect(err).toBeInstanceOf(cls)
      expect(err).toBeInstanceOf(DevhelmError)
      expect(err.category).toBe(category)
      expect(err.code).toBe(code)
      expect(err.status).toBe(status)
      expect(err.exitCode).toBe(exit)
      expect(exitCodeForCategory(category)).toBe(exit)
      expect(err).toMatchObject({
        requestId: 'req_1', retryAfterSeconds: 5, resource: 'browser_runs', used: 10, limit: 10, resetsAt: '2026-11-01T00:00:00Z',
        plan: 'FREE', upgradeUrl: 'https://app.devhelm.io/settings/billing', canRaise: 'org admin', owner: 'TERRAFORM',
        required: 'runs:execute', have: 3, reason: 'scope', expiredAt: '2026-10-01T00:00:00Z', policy: 'P7D', timestamp: 1_700_000_000_000,
      })
      expect(err.next).toEqual({command: 'devhelm account usage', docs: 'https://docs.devhelm.io/errors/X'})
      expect(err.errors).toEqual([{code, field: 'a.b', message: 'bad'}])
      expect(err.details).toEqual({key: {nested: 1}})
      expect(err.response?.code).toBe(code)
      expect(err.toJSON()).toMatchObject({category, code, status})
    })
  }

  it('covers every category, including client-side transport', () => {
    expect([...table.map((t) => t[0]), 'transport'].sort()).toEqual([...ERROR_CATEGORIES].sort())
  })

  it('classifies by category, not by HTTP status', () => {
    // The Testing cap used to be 403; a quota body wins over the status.
    const err = errorFromResponse(403, JSON.stringify(errorBody(403, 'TESTING_QUOTA_EXHAUSTED', 'quota')))
    expect(err).toBeInstanceOf(QuotaError)
    expect(err.exitCode).toBe(16)
  })

  it('falls back to the status for an unknown category from a newer API', () => {
    const err = errorFromResponse(409, JSON.stringify(errorBody(409, 'NEW_THING', 'brand_new_category')))
    expect(err).toBeInstanceOf(ConflictError)
    expect(err.response?.category).toBe('brand_new_category')
  })

  it('WaitTimeoutError carries runId and phase and maps to exit 19', () => {
    const err = new WaitTimeoutError('run-1', 'running', 300_000)
    expect(err).toMatchObject({runId: 'run-1', phase: 'running', code: 'WAIT_TIMEOUT'})
    expect(err.exitCode).toBe(19)
    expect(err.details['runsContinue']).toBe(true)
  })

  it('keeps the 1.11 names matching the errors they used to match', () => {
    const e401 = errorFromResponse(401, JSON.stringify(errorBody(401, 'UNAUTHORIZED', 'auth')))
    const e403 = errorFromResponse(403, JSON.stringify(errorBody(403, 'SCOPE_REQUIRED', 'permission')))
    const e404 = errorFromResponse(404, JSON.stringify(errorBody(404, 'NOT_FOUND', 'not_found')))
    const e409 = errorFromResponse(409, JSON.stringify(errorBody(409, 'MONITOR_OWNED_BY_OTHER', 'ownership')))
    const e429 = errorFromResponse(429, JSON.stringify(errorBody(429, 'RATE_LIMITED', 'rate_limit')))
    const e502 = errorFromResponse(502, 'Bad Gateway')
    for (const e of [e401, e403, e404, e409, e429, e502]) expect(e).toBeInstanceOf(DevhelmApiError)
    expect(e401).toBeInstanceOf(DevhelmAuthError)
    expect(e403).toBeInstanceOf(DevhelmAuthError)
    expect(e404).toBeInstanceOf(DevhelmNotFoundError)
    expect(e409).toBeInstanceOf(DevhelmConflictError)
    expect(e429).toBeInstanceOf(DevhelmRateLimitError)
    expect(e502).toBeInstanceOf(DevhelmServerError)
    expect(new TransportError('x')).not.toBeInstanceOf(DevhelmApiError)
    expect(new DevhelmValidationError('x')).toBeInstanceOf(ValidationError)
    const legacy = new DevhelmApiError('boom', 409, {code: 'X'})
    expect(legacy).toBeInstanceOf(DevhelmConflictError)
    expect(legacy.category).toBe('conflict')
  })
})
