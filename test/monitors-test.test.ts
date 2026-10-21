/**
 * `monitors.test()` keeps returning the probe result (200) for uptime
 * monitors and throws `DevhelmMonitorTestQueuedError` on 202.
 * `monitors.testRun()` returns the queued validation run for browser /
 * multi-step API monitors; its optional target body is validated locally
 * and sent only when given.
 */
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {Devhelm, DevhelmMonitorTestQueuedError, DevhelmValidationError} from '../src/index.js'
import type {MonitorTestResultDto, RunDto} from '../src/index.js'

interface CapturedRequest {
  method: string
  url: URL
  body: string | null
}

const MONITOR_ID = '550e8400-e29b-41d4-a716-446655440000'

const PROBE_RESULT: MonitorTestResultDto = {
  passed: true,
  error: null,
  statusCode: 200,
  responseTimeMs: 42,
  responseHeaders: {'content-type': ['application/json']},
  bodyPreview: '{"ok":true}',
  responseSizeBytes: 11,
  redirectCount: 0,
  finalUrl: 'https://example.com/health',
  assertionResults: [],
  warnings: null,
}

const QUEUED_RUN: RunDto = {
  id: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  organizationId: 1,
  monitorId: MONITOR_ID,
  monitorName: 'Checkout flow',
  monitorType: 'BROWSER',
  revisionId: '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d',
  region: 'us-east',
  source: 'VALIDATION',
  countsTowardHealth: false,
  enqueuedAt: '2026-10-21T10:00:00Z',
  phase: 'QUEUED',
  cancelRequested: false,
  bundleDigest: 'sha256:abc',
  capturePolicySnapshot: {},
  bindingVersionSnapshot: {},
  stream: false,
  evidence: [],
  tabCounts: {steps: 0, assets: 0, diff: 0},
  attempt: 1,
  attemptOf: 1,
  attempts: [],
  executionAttempts: [],
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  })
}

describe('monitors.test', () => {
  const originalFetch = globalThis.fetch
  let captured: CapturedRequest[] = []
  let nextResponse: () => Response

  beforeEach(() => {
    captured = []
    nextResponse = () => json(200, {data: PROBE_RESULT})
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init)
      const body = req.body ? await req.text() : null
      captured.push({method: req.method, url: new URL(req.url), body})
      return nextResponse()
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const client = () => new Devhelm({token: 't', baseUrl: 'http://localhost:0'})

  it('test() returns the probe result on 200, unchanged', async () => {
    const out = await client().monitors.test(MONITOR_ID)
    expect(out).toEqual(PROBE_RESULT)
    expect(captured).toHaveLength(1)
    expect(captured[0]!.method).toBe('POST')
    expect(captured[0]!.url.pathname).toBe(`/api/v1/monitors/${MONITOR_ID}/test`)
    expect(captured[0]!.body).toBeNull()
  })

  it('test() throws DevhelmMonitorTestQueuedError on 202, carrying the run', async () => {
    nextResponse = () => json(202, {data: QUEUED_RUN})
    const err = await client().monitors.test(MONITOR_ID).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DevhelmMonitorTestQueuedError)
    // Same base class code monitors got before the API queued runs.
    expect(err).toBeInstanceOf(DevhelmValidationError)
    if (!(err instanceof DevhelmMonitorTestQueuedError)) throw new Error('unreachable')
    expect(err.run.id).toBe(QUEUED_RUN.id)
    expect(err.message).toContain('monitors.testRun()')
  })

  it('test() still rejects a 200 body that is not a probe result', async () => {
    nextResponse = () => json(200, {data: QUEUED_RUN})
    await expect(client().monitors.test(MONITOR_ID)).rejects.toBeInstanceOf(DevhelmValidationError)
  })

  it('testRun() returns the queued run on 202 and sends no body by default', async () => {
    nextResponse = () => json(202, {data: QUEUED_RUN})
    const run = await client().monitors.testRun(MONITOR_ID)
    expect(run.id).toBe(QUEUED_RUN.id)
    expect(run.countsTowardHealth).toBe(false)
    expect(captured[0]!.body).toBeNull()
  })

  it('testRun() sends the target body when given', async () => {
    nextResponse = () => json(202, {data: QUEUED_RUN})
    const environmentId = '8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e'
    await client().monitors.testRun(MONITOR_ID, {environmentId, region: 'eu-west'})
    expect(JSON.parse(captured[0]!.body ?? '')).toEqual({environmentId, region: 'eu-west'})
  })

  it('testRun() rejects an unknown target key before sending', async () => {
    // A variable (not a literal) skips TS excess-property checks, like JS callers.
    const bad = {region: 'eu-west', regoin: 'typo'}
    await expect(client().monitors.testRun(MONITOR_ID, bad)).rejects.toBeInstanceOf(
      DevhelmValidationError,
    )
    expect(captured).toHaveLength(0)
  })

  it('testRun() rejects a probe result (uptime monitor) and names test()', async () => {
    await expect(client().monitors.testRun(MONITOR_ID)).rejects.toThrow(/use monitors\.test\(\)/)
  })

  it('testRun() decodes additive fields on the run', async () => {
    nextResponse = () => json(202, {data: {...QUEUED_RUN, phase: 'FUTURE_PHASE', newField: 1}})
    const run = await client().monitors.testRun(MONITOR_ID)
    expect(run.phase).toBe('FUTURE_PHASE')
  })
})
