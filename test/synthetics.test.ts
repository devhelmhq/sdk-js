/**
 * The synthetics surface (doc 42 §8): code → bundle upload with digest
 * check, create / test / draft → test → publish / trigger, waiting on runs
 * (SSE then polling), request strictness, the config ↔ type rule, and the
 * deprecated aliases.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Devhelm, ValidationError, WaitTimeoutError, NotFoundError, waitForRun} from '../src/index.js'
import {Devhelm as WebDevhelm} from '../src/web.js'
import {computeDigestSync} from '../src/bundler/index.js'
import {resetDeprecationWarnings} from '../src/deprecation.js'
import {MockApi, ENV_ID, MONITOR_ID, REVISION_ID, RUN_ID, errorBody, json, monitorDto, runDto, runEvent, sse} from './helpers/mock-api.js'

let dir: string

function write(rel: string, content: string): string {
  const abs = join(dir, rel)
  mkdirSync(join(abs, '..'), {recursive: true})
  writeFileSync(abs, content)
  return abs
}

const RUNTIME = {
  id: '2026.11',
  nodeVersion: '22',
  playwrightVersion: '1.62.1',
  status: 'available',
  packages: {'@playwright/test': '1.62.1'},
  nodeBuiltins: ['fs'],
  platformDefault: true,
  regions: [{region: 'us-east', available: true}],
}

function bundleRoutes(api: MockApi, mutateDigest?: (d: string) => string): MockApi {
  return api
    .on('GET', '/api/v1/synthetics/runtime-profiles', () => json(200, {data: [RUNTIME], hasNext: false, hasPrev: false, totalElements: 1, totalPages: 1}))
    .on('POST', '/api/v1/bundles', (req) => {
      const body = JSON.parse(req.body ?? '{}') as {files: Record<string, string>}
      const digest = computeDigestSync(body.files)
      return json(201, {data: {digest: mutateDigest ? mutateDigest(digest) : digest, uploadDigest: digest, files: Object.keys(body.files), keys: [], size: 10}})
    })
    .on('GET', '/api/v1/environments/{slug}', (_req, m) => json(200, {data: {id: ENV_ID, orgId: 1, name: m[1], slug: m[1], variables: {}, isDefault: false, monitorCount: 0, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z'}}))
}

function client(api: MockApi) {
  return new Devhelm({token: 't', baseUrl: 'http://api.test', fetch: api.fetch, retry: {maxDelayMs: 10}})
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'devhelm-syn-'))
  mkdirSync(join(dir, '.git'))
  resetDeprecationWarnings()
})
afterEach(() => {
  rmSync(dir, {recursive: true, force: true})
  vi.restoreAllMocks()
})

describe('code → bundle → monitor', () => {
  it('create() bundles a path, uploads JSON, checks the digest and sends code + environmentId', async () => {
    const entry = write('synthetics/checkout.spec.ts', "import {test} from '@playwright/test'\nimport './helper'\n")
    write('synthetics/helper.ts', 'export {}\n')
    const api = bundleRoutes(new MockApi()).on('POST', '/api/v1/monitors', () => json(201, {data: monitorDto()}))
    const m = await client(api).monitors.create({
      name: 'Checkout', type: 'BROWSER', environment: 'production', code: entry, frequencySeconds: 600, regions: ['us-east'],
    }, {source: false})
    expect(m.id).toBe(MONITOR_ID)
    const upload = JSON.parse(api.calls('/api/v1/bundles')[0]!.body ?? '{}')
    expect(Object.keys(upload.files).sort()).toEqual(['synthetics/checkout.spec.ts', 'synthetics/helper.ts'])
    expect(upload.entrypoint).toBe('synthetics/checkout.spec.ts')
    const create = JSON.parse(api.calls('/api/v1/monitors', 'POST')[0]!.body ?? '{}')
    expect(create).toEqual({
      name: 'Checkout', type: 'BROWSER', environmentId: ENV_ID, frequencySeconds: 600, regions: ['us-east'],
      code: {bundle: computeDigestSync(upload.files), entrypoint: 'synthetics/checkout.spec.ts'},
    })
    expect(api.calls('/api/v1/environments/{slug}')[0]!.url.pathname).toBe('/api/v1/environments/production')
  })

  it('sends code.source from CI env vars', async () => {
    const entry = write('a.spec.ts', 'export {}\n')
    process.env['GITHUB_REPOSITORY'] = 'acme/web'
    process.env['GITHUB_SHA'] = 'abc'
    try {
      const api = bundleRoutes(new MockApi()).on('POST', '/api/v1/monitors', () => json(201, {data: monitorDto()}))
      await client(api).monitors.create({name: 'x', type: 'BROWSER', environmentId: ENV_ID, code: entry})
      const create = JSON.parse(api.calls('/api/v1/monitors', 'POST')[0]!.body ?? '{}')
      expect(create.code.source).toMatchObject({repo: 'acme/web', commit: 'abc'})
    } finally {
      delete process.env['GITHUB_REPOSITORY']
      delete process.env['GITHUB_SHA']
    }
  })

  it('include ships an unimported fixture: the upload lists it in include', async () => {
    write('checks/a.spec.ts', "import {test} from '@playwright/test'\n")
    write('checks/fixtures/order.json', '{"id": 1}\n')
    const api = bundleRoutes(new MockApi()).on('POST', '/api/v1/monitors/{id}/revisions', () => json(200, {data: {revision: {id: REVISION_ID}}}))
    await client(api).monitors.revisions
      .create(MONITOR_ID, {code: {entrypoint: 'checks/a.spec.ts', include: ['checks/fixtures/order.json']}}, {source: false, cwd: dir})
      .catch(() => undefined)
    const upload = JSON.parse(api.calls('/api/v1/bundles')[0]!.body ?? '{}')
    expect(Object.keys(upload.files).sort()).toEqual(['checks/a.spec.ts', 'checks/fixtures/order.json'])
    expect(upload.entrypoint).toBe('checks/a.spec.ts')
    expect(upload.include).toEqual(['checks/fixtures/order.json'])
    const draft = JSON.parse(api.calls('/api/v1/monitors/{id}/revisions')[0]!.body ?? '{}')
    expect(draft.code).toEqual({bundle: computeDigestSync(upload.files), entrypoint: 'checks/a.spec.ts'})
  })

  it('throws BUNDLE_DIGEST_MISMATCH when the API closure differs', async () => {
    const entry = write('a.spec.ts', 'export {}\n')
    const api = bundleRoutes(new MockApi(), () => `sha256:${'0'.repeat(64)}`)
    const err = await client(api).bundles.create(entry, {source: false}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ValidationError)
    expect((err as ValidationError).code).toBe('BUNDLE_DIGEST_MISMATCH')
    expect((err as ValidationError).details['clientDigest']).toBe(computeDigestSync({'a.spec.ts': 'export {}\n'}))
  })

  it('uploads a zip when a file is binary', async () => {
    const entry = write('a.spec.ts', "import x from './b.json'\n")
    writeFileSync(join(dir, 'b.json'), new Uint8Array([0xff, 0x00]))
    let contentType: string | null = null
    const api = new MockApi()
      .on('GET', '/api/v1/synthetics/runtime-profiles', () => json(200, {data: [RUNTIME], hasNext: false, hasPrev: false}))
      .on('POST', '/api/v1/bundles', (req) => {
        contentType = req.headers.get('content-type')
        const digest = computeDigestSync({'a.spec.ts': "import x from './b.json'\n", 'b.json': new Uint8Array([0xff, 0x00])})
        expect(req.url.searchParams.get('entrypoint')).toBe('a.spec.ts')
        expect(req.bytes?.[0]).toBe(0x50)
        return json(201, {data: {digest, uploadDigest: digest, files: ['a.spec.ts', 'b.json'], keys: [], size: 3}})
      })
    await client(api).bundles.create(entry, {source: false})
    expect(contentType).toBe('application/zip')
  })

  it('a bundler refusal never reaches the API', async () => {
    const entry = write('a.spec.ts', "import './missing'\n")
    const api = bundleRoutes(new MockApi())
    const err = await client(api).bundles.create(entry).catch((e: unknown) => e)
    expect((err as ValidationError).code).toBe('IMPORT_NOT_IN_BUNDLE')
    expect(api.calls('/api/v1/bundles')).toHaveLength(0)
  })

  it('passes an uploaded {bundle, entrypoint} through untouched', async () => {
    const api = new MockApi().on('POST', '/api/v1/monitors/{id}/revisions', () =>
      json(200, {data: {revision: {id: REVISION_ID}}}),
    )
    const code = {bundle: `sha256:${'a'.repeat(64)}`, entrypoint: 'a.spec.ts'}
    await client(api).monitors.revisions.create(MONITOR_ID, {code}).catch(() => undefined)
    expect(JSON.parse(api.requests[0]!.body ?? '{}')).toEqual({code})
  })

  it('the web client takes {entrypoint, files} and refuses paths', async () => {
    const api = bundleRoutes(new MockApi())
    const web = new WebDevhelm({token: 't', baseUrl: 'http://api.test', fetch: api.fetch})
    const bundle = await web.bundles.create({entrypoint: 'a.spec.ts', files: {'a.spec.ts': 'export {}\n'}})
    expect(bundle.digest).toBe(computeDigestSync({'a.spec.ts': 'export {}\n'}))
    const err = await web.bundles.create('./a.spec.ts').catch((e: unknown) => e)
    expect((err as ValidationError).code).toBe('CODE_FORM_UNSUPPORTED')
  })
})

describe('request strictness and the config ↔ type rule', () => {
  it('rejects unknown keys before the call', async () => {
    const api = new MockApi()
    const bad = {revisionId: REVISION_ID, requireTestd: true}
    const err = await client(api).monitors.publish(MONITOR_ID, bad).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ValidationError)
    expect((err as ValidationError).errors[0]).toMatchObject({code: 'FIELD_UNKNOWN', field: 'requireTestd'})
    expect(api.requests).toHaveLength(0)
  })

  it('rejects a config that does not match the monitor type', async () => {
    const api = new MockApi()
    const err = await client(api).monitors.create({name: 'x', type: 'BROWSER', config: {url: 'https://x', method: 'GET'}}).catch((e: unknown) => e)
    expect((err as ValidationError).code).toBe('MONITOR_CONFIG_TYPE_MISMATCH')
    expect(api.requests).toHaveLength(0)
  })
})

describe('test, draft → test → publish, trigger', () => {
  it('testAdhoc() bundles, sends type/environmentId/code and waits on the run', async () => {
    const entry = write('a.spec.ts', 'export {}\n')
    let polled = 0
    const api = bundleRoutes(new MockApi())
      .on('POST', '/api/v1/monitors/test', () => json(202, {data: runDto({monitorId: MONITOR_ID})}))
      .on('GET', '/api/v1/runs/{id}/events', () => sse([runEvent(1, 'phase', {phase: 'running'}), runEvent(2, 'finished', {})]))
      .on('GET', '/api/v1/runs/{id}', () => {
        polled += 1
        return json(200, {data: runDto(polled === 1 ? {} : {phase: 'finished', outcome: 'failed'})})
      })
    const run = await client(api).monitors.testAdhoc({type: 'BROWSER', environment: 'staging', code: entry}, {wait: true, source: false})
    expect(run.phase).toBe('finished')
    expect(run.outcome).toBe('failed')
    const body = JSON.parse(api.calls('/api/v1/monitors/test')[0]!.body ?? '{}')
    expect(body).toMatchObject({type: 'BROWSER', environmentId: ENV_ID, config: {}, code: {entrypoint: 'a.spec.ts'}})
    expect(api.calls('/api/v1/runs/{id}/cancel')).toHaveLength(0)
  })

  it('testAdhoc() for a probe type returns the probe result', async () => {
    const api = new MockApi().on('POST', '/api/v1/monitors/test', () =>
      json(200, {data: {passed: true, error: null, statusCode: 200, responseTimeMs: 1, responseHeaders: {}, bodyPreview: null, responseSizeBytes: 0, redirectCount: 0, finalUrl: null, assertionResults: [], warnings: null}}),
    )
    const res = await client(api).monitors.testAdhoc({type: 'HTTP', config: {url: 'https://example.com', method: 'GET'}})
    expect(res.passed).toBe(true)
  })

  it('revisions.create → revisions.test({wait}) → publish', async () => {
    const entry = write('a.spec.ts', 'export {}\n')
    const api = bundleRoutes(new MockApi())
      .on('POST', '/api/v1/monitors/{id}/revisions', () => json(200, {data: {revision: {id: REVISION_ID, state: 'draft'}}}))
      .on('POST', '/api/v1/monitors/{id}/revisions/{rid}/test', () => json(202, {data: runDto()}))
      .on('GET', '/api/v1/runs/{id}/events', () => json(404, errorBody(404, 'NOT_FOUND', 'not_found')))
      .on('GET', '/api/v1/runs/{id}', () => json(200, {data: runDto({phase: 'finished', outcome: 'passed', flaky: false})}))
      .on('POST', '/api/v1/monitors/{id}/publish', () => json(200, {data: {}}))
    const c = client(api)
    const {revision} = await c.monitors.revisions.create(MONITOR_ID, {code: entry}, {source: false}).catch(() => ({revision: {id: REVISION_ID}}))
    const t = await c.monitors.revisions.test(MONITOR_ID, revision.id, {wait: true})
    expect(t.outcome).toBe('passed')
    if (t.outcome === 'passed') await c.monitors.publish(MONITOR_ID, {revisionId: revision.id, expectedLiveRevisionId: REVISION_ID}).catch(() => undefined)
    expect(JSON.parse(api.calls('/api/v1/monitors/{id}/revisions/{rid}/test')[0]!.body ?? 'null')).toEqual({})
    expect(JSON.parse(api.calls('/api/v1/monitors/{id}/publish')[0]!.body ?? '{}')).toEqual({revisionId: REVISION_ID, expectedLiveRevisionId: REVISION_ID})
  })

  it('trigger({wait: true}) waits for each run', async () => {
    const other = '11111111-2222-4333-8444-555555555555'
    const api = new MockApi()
      .on('POST', '/api/v1/monitors/{id}/triggers', () => json(202, {data: {triggerId: other, billedRuns: 2, runs: [
        {id: RUN_ID, region: 'us-east', phase: 'queued', url: 'u'}, {id: other, region: 'eu-west', phase: 'queued', url: 'u'},
      ]}}))
      .on('GET', '/api/v1/runs/{id}', (_r, m) => json(200, {data: runDto({id: m[1], phase: 'finished', outcome: 'passed'})}))
    const {runs, billedRuns} = await client(api).monitors.trigger(MONITOR_ID, {regions: ['us-east', 'eu-west'], wait: true})
    expect(billedRuns).toBe(2)
    expect(runs.map((r) => r.id)).toEqual([RUN_ID, other])
    expect(JSON.parse(api.calls('/api/v1/monitors/{id}/triggers')[0]!.body ?? '{}')).toEqual({regions: ['us-east', 'eu-west']})
  })
})

describe('runs.wait', () => {
  it('polls when SSE is unavailable and returns a failed run without throwing', async () => {
    let n = 0
    const api = new MockApi()
      .on('GET', '/api/v1/runs/{id}/events', () => json(503, errorBody(503, 'X', 'platform')))
      .on('GET', '/api/v1/runs/{id}', () => {
        n += 1
        return json(200, {data: runDto(n < 3 ? {phase: 'running'} : {phase: 'finished', outcome: 'execution_error'})})
      })
    const c = new Devhelm({token: 't', baseUrl: 'http://api.test', fetch: api.fetch, retry: {maxAttempts: 1}})
    const run = await c.runs.wait(RUN_ID, {pollIntervalMs: 5})
    expect(run.outcome).toBe('execution_error')
  })

  it('throws only WaitTimeoutError{runId, phase} at the deadline and never cancels', async () => {
    const api = new MockApi()
      .on('GET', '/api/v1/runs/{id}/events', () => sse([]))
      .on('GET', '/api/v1/runs/{id}', () => json(200, {data: runDto({phase: 'queued', startDeadlineAt: '2026-10-21T10:15:00Z'})}))
    const c = client(api)
    const err = await waitForRun(c, RUN_ID, {timeoutMs: 60, pollIntervalMs: 5}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WaitTimeoutError)
    expect((err as WaitTimeoutError).runId).toBe(RUN_ID)
    expect((err as WaitTimeoutError).phase).toBe('queued')
    expect((err as WaitTimeoutError).run?.startDeadlineAt).toBe('2026-10-21T10:15:00Z')
    expect(api.requests.some((r) => r.url.pathname.endsWith('/cancel'))).toBe(false)
  })

  it('streams events to onEvent and resumes with Last-Event-ID', async () => {
    let streams = 0
    let gets = 0
    const seen: string[] = []
    const api = new MockApi()
      .on('GET', '/api/v1/runs/{id}/events', (req) => {
        streams += 1
        if (streams === 1) return sse([runEvent(1, 'phase', {phase: 'running'}), runEvent(2, 'step_started')])
        expect(req.headers.get('last-event-id')).toBe('2')
        return sse([runEvent(3, 'phase', {phase: 'finished'})])
      })
      .on('GET', '/api/v1/runs/{id}', () => {
        gets += 1
        return json(200, {data: runDto(gets < 3 ? {phase: 'running'} : {phase: 'finished', outcome: 'passed'})})
      })
    const run = await client(api).runs.wait(RUN_ID, {onEvent: (e) => seen.push(e.type)})
    expect(run.outcome).toBe('passed')
    expect(seen).toEqual(['phase', 'step_started', 'phase'])
  })

  it('surfaces a gone or unknown run as its typed error', async () => {
    const api = new MockApi().on('GET', '/api/v1/runs/{id}', () => json(404, errorBody(404, 'NOT_FOUND', 'not_found')))
    await expect(client(api).runs.wait(RUN_ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('deprecated aliases (removed 2027-01-31) still work and warn once', () => {
  it('monitors.versions(id), monitors.results(id), monitors.testRun(id)', async () => {
    const warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined)
    const page = {data: [], hasNext: false, hasPrev: false, totalElements: 0, totalPages: 0}
    const api = new MockApi()
      .on('GET', '/api/v1/monitors/{id}/versions', () => json(200, page))
      .on('GET', '/api/v1/monitors/{id}/results', () => json(200, {data: [], nextCursor: null, hasMore: false}))
      .on('POST', '/api/v1/monitors/{id}/test', () => json(202, {data: runDto()}))
    const c = client(api)
    await c.monitors.versions(MONITOR_ID)
    await c.monitors.versions(MONITOR_ID)
    await c.monitors.versions.list(MONITOR_ID)
    await c.monitors.results(MONITOR_ID)
    await c.monitors.results(MONITOR_ID)
    await c.monitors.testRun(MONITOR_ID)
    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages).toHaveLength(3)
    expect(messages[0]).toContain('monitors.versions(id) is deprecated and will be removed on 2027-01-31')
    expect(messages[1]).toContain('monitors.history.list(id)')
    expect(messages[2]).toContain('monitors.testRun(id)')
  })
})
