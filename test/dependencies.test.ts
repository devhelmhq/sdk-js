/**
 * Dependencies (service subscriptions) resource tests.
 *
 * Same fetch-stub approach as `test/maintenance-windows.test.ts`. Focused on
 * the two body-carrying operations: `track` (optional ServiceSubscribeRequest
 * body, omitted entirely when no options are given — preserving the original
 * body-less behavior) and `updateAlertSensitivity` (PATCH with required body).
 */
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {Devhelm} from '../src/index.js'
import type {ServiceSubscriptionDto} from '../src/index.js'

interface CapturedRequest {
  method: string
  url: URL
  body: string | null
}

const VALID_SUBSCRIPTION: ServiceSubscriptionDto = {
  subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
  serviceId: '550e8400-e29b-41d4-a716-446655440001',
  slug: 'github',
  name: 'GitHub',
  category: 'developer-tools',
  officialStatusUrl: null,
  adapterType: 'STATUSPAGE',
  pollingIntervalSeconds: 60,
  enabled: true,
  logoUrl: null,
  overallStatus: 'OPERATIONAL',
  componentId: null,
  component: null,
  alertSensitivity: 'INCIDENTS_ONLY',
  subscribedAt: '2026-06-01T00:00:00Z',
}

describe('Dependencies resource', () => {
  const originalFetch = globalThis.fetch
  let captured: CapturedRequest[] = []
  let nextResponse: (req: CapturedRequest) => Response

  beforeEach(() => {
    captured = []
    nextResponse = () => new Response(JSON.stringify({data: VALID_SUBSCRIPTION}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    })
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init)
      const url = new URL(req.url)
      const body = req.body ? await req.text() : null
      const c: CapturedRequest = {method: req.method, url, body}
      captured.push(c)
      return nextResponse(c)
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function buildClient() {
    return new Devhelm({token: 't', baseUrl: 'http://localhost:0'})
  }

  it('exposes dependencies with the expected methods', () => {
    const c = buildClient()
    expect(typeof c.dependencies.list).toBe('function')
    expect(typeof c.dependencies.listPage).toBe('function')
    expect(typeof c.dependencies.get).toBe('function')
    expect(typeof c.dependencies.track).toBe('function')
    expect(typeof c.dependencies.updateAlertSensitivity).toBe('function')
    expect(typeof c.dependencies.delete).toBe('function')
  })

  it('track without options POSTs to /service-subscriptions/{slug} with no body', async () => {
    const c = buildClient()
    const result = await c.dependencies.track('github')

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('POST')
    expect(req.url.pathname).toBe('/api/v1/service-subscriptions/github')
    expect(req.body).toBeNull()
    expect(result.subscriptionId).toBe(VALID_SUBSCRIPTION.subscriptionId)
  })

  it('track with options POSTs the ServiceSubscribeRequest body', async () => {
    const c = buildClient()
    const componentId = '550e8400-e29b-41d4-a716-446655440002'
    const result = await c.dependencies.track('github', {
      componentId,
      alertSensitivity: 'MAJOR_ONLY',
    })

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('POST')
    expect(req.url.pathname).toBe('/api/v1/service-subscriptions/github')
    expect(JSON.parse(req.body ?? '{}')).toEqual({
      componentId,
      alertSensitivity: 'MAJOR_ONLY',
    })
    expect(result.slug).toBe('github')
  })

  it('track rejects an invalid alertSensitivity before hitting the network', async () => {
    const c = buildClient()
    await expect(
      c.dependencies.track('github', {alertSensitivity: 'SOMETIMES'}),
    ).rejects.toThrow(/validation/i)
    expect(captured).toHaveLength(0)
  })

  it('updateAlertSensitivity PATCHes /service-subscriptions/{id}/alert-sensitivity with the body', async () => {
    nextResponse = () => new Response(JSON.stringify({
      data: {...VALID_SUBSCRIPTION, alertSensitivity: 'MAJOR_ONLY'},
    }), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const result = await c.dependencies.updateAlertSensitivity(
      VALID_SUBSCRIPTION.subscriptionId,
      'MAJOR_ONLY',
    )

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('PATCH')
    expect(req.url.pathname).toBe(`/api/v1/service-subscriptions/${VALID_SUBSCRIPTION.subscriptionId}/alert-sensitivity`)
    expect(JSON.parse(req.body ?? '{}')).toEqual({alertSensitivity: 'MAJOR_ONLY'})
    expect(result.alertSensitivity).toBe('MAJOR_ONLY')
  })

  it('updateAlertSensitivity rejects an invalid value before hitting the network', async () => {
    const c = buildClient()
    await expect(
      c.dependencies.updateAlertSensitivity(VALID_SUBSCRIPTION.subscriptionId, 'LOUD'),
    ).rejects.toThrow(/validation/i)
    expect(captured).toHaveLength(0)
  })
})
