/**
 * MaintenanceWindows resource tests.
 *
 * The HTTP layer is exercised end-to-end by stubbing `globalThis.fetch` —
 * this is the same approach used in the surface-telemetry tests in
 * `test/http.test.ts`. Capturing the live `Request` lets us assert on the
 * exact path, method, query string, and body the SDK puts on the wire,
 * without re-implementing the openapi-fetch envelope shape.
 */
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {Devhelm} from '../src/index.js'
import type {MaintenanceWindowDto} from '../src/index.js'

interface CapturedRequest {
  method: string
  url: URL
  body: string | null
}

const VALID_WINDOW: MaintenanceWindowDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  monitorId: '550e8400-e29b-41d4-a716-446655440001',
  organizationId: 1,
  startsAt: '2026-06-01T03:00:00Z',
  endsAt: '2026-06-01T04:00:00Z',
  repeatRule: null,
  reason: 'Quarterly db migration',
  suppressAlerts: true,
  createdAt: '2026-05-30T00:00:00Z',
}

describe('MaintenanceWindows resource', () => {
  const originalFetch = globalThis.fetch
  let captured: CapturedRequest[] = []
  let nextResponse: (req: CapturedRequest) => Response

  beforeEach(() => {
    captured = []
    nextResponse = () => new Response('{"data":null}', {
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

  it('exposes maintenanceWindows with the expected CRUD methods', () => {
    const c = buildClient()
    expect(c.maintenanceWindows).toBeDefined()
    expect(typeof c.maintenanceWindows.list).toBe('function')
    expect(typeof c.maintenanceWindows.listPage).toBe('function')
    expect(typeof c.maintenanceWindows.get).toBe('function')
    expect(typeof c.maintenanceWindows.create).toBe('function')
    expect(typeof c.maintenanceWindows.update).toBe('function')
    expect(typeof c.maintenanceWindows.cancel).toBe('function')
  })

  it('create posts to /api/v1/maintenance-windows with the request body', async () => {
    nextResponse = () => new Response(JSON.stringify({data: VALID_WINDOW}), {
      status: 201,
      headers: {'Content-Type': 'application/json'},
    })
    const c = buildClient()
    const result = await c.maintenanceWindows.create({
      monitorId: '550e8400-e29b-41d4-a716-446655440001',
      startsAt: '2026-06-01T03:00:00Z',
      endsAt: '2026-06-01T04:00:00Z',
      reason: 'Quarterly db migration',
      suppressAlerts: true,
    })

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('POST')
    expect(req.url.pathname).toBe('/api/v1/maintenance-windows')
    expect(req.url.search).toBe('')
    const body = JSON.parse(req.body ?? '{}')
    expect(body).toEqual({
      monitorId: '550e8400-e29b-41d4-a716-446655440001',
      startsAt: '2026-06-01T03:00:00Z',
      endsAt: '2026-06-01T04:00:00Z',
      reason: 'Quarterly db migration',
      suppressAlerts: true,
    })
    expect(result.id).toBe(VALID_WINDOW.id)
    expect(result.suppressAlerts).toBe(true)
  })

  it('create rejects payloads missing required fields before hitting the network', async () => {
    const c = buildClient()
    await expect(
      c.maintenanceWindows.create({
        // intentionally missing startsAt/endsAt to trigger client-side validation
      } as unknown as Parameters<typeof c.maintenanceWindows.create>[0]),
    ).rejects.toThrow(/validation/i)
    expect(captured).toHaveLength(0)
  })

  it('list forwards monitorId and filter as query params and unwraps the page envelope', async () => {
    nextResponse = () => new Response(JSON.stringify({
      data: [VALID_WINDOW],
      hasNext: false,
      hasPrev: false,
      totalElements: 1,
      totalPages: 1,
    }), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const result = await c.maintenanceWindows.list({
      monitorId: '550e8400-e29b-41d4-a716-446655440001',
      filter: 'active',
    })

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('GET')
    expect(req.url.pathname).toBe('/api/v1/maintenance-windows')
    expect(req.url.searchParams.get('monitorId')).toBe('550e8400-e29b-41d4-a716-446655440001')
    expect(req.url.searchParams.get('filter')).toBe('active')
    expect(req.url.searchParams.get('page')).toBe('0')
    expect(req.url.searchParams.get('size')).toBe('200')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(VALID_WINDOW.id)
  })

  it('list omits filter params when no filters are provided', async () => {
    nextResponse = () => new Response(JSON.stringify({
      data: [],
      hasNext: false,
      hasPrev: false,
      totalElements: 0,
      totalPages: 0,
    }), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const result = await c.maintenanceWindows.list()

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.url.searchParams.has('monitorId')).toBe(false)
    expect(req.url.searchParams.has('filter')).toBe(false)
    expect(result).toEqual([])
  })

  it('list auto-paginates while hasNext is true', async () => {
    let call = 0
    nextResponse = () => {
      call++
      if (call === 1) {
        return new Response(JSON.stringify({
          data: [VALID_WINDOW],
          hasNext: true,
          hasPrev: false,
          totalElements: 2,
          totalPages: 2,
        }), {status: 200, headers: {'Content-Type': 'application/json'}})
      }
      return new Response(JSON.stringify({
        data: [{...VALID_WINDOW, id: '550e8400-e29b-41d4-a716-446655440099'}],
        hasNext: false,
        hasPrev: true,
        totalElements: 2,
        totalPages: 2,
      }), {status: 200, headers: {'Content-Type': 'application/json'}})
    }

    const c = buildClient()
    const result = await c.maintenanceWindows.list()

    expect(captured).toHaveLength(2)
    expect(captured[0].url.searchParams.get('page')).toBe('0')
    expect(captured[1].url.searchParams.get('page')).toBe('1')
    expect(result).toHaveLength(2)
  })

  it('listPage forwards explicit page/size + filters', async () => {
    nextResponse = () => new Response(JSON.stringify({
      data: [VALID_WINDOW],
      hasNext: true,
      hasPrev: false,
      totalElements: 42,
      totalPages: 5,
    }), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const page = await c.maintenanceWindows.listPage(2, 10, {filter: 'upcoming'})

    const [req] = captured
    expect(req.url.searchParams.get('page')).toBe('2')
    expect(req.url.searchParams.get('size')).toBe('10')
    expect(req.url.searchParams.get('filter')).toBe('upcoming')
    expect(page.totalElements).toBe(42)
    expect(page.totalPages).toBe(5)
    expect(page.hasNext).toBe(true)
  })

  it('get fetches the window by id from the right URL', async () => {
    nextResponse = () => new Response(JSON.stringify({data: VALID_WINDOW}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    })

    const c = buildClient()
    const result = await c.maintenanceWindows.get(VALID_WINDOW.id)

    const [req] = captured
    expect(req.method).toBe('GET')
    expect(req.url.pathname).toBe(`/api/v1/maintenance-windows/${VALID_WINDOW.id}`)
    expect(result.id).toBe(VALID_WINDOW.id)
  })

  it('update PUTs the request body to /maintenance-windows/{id}', async () => {
    const updated: MaintenanceWindowDto = {
      ...VALID_WINDOW,
      reason: 'Rescheduled — vendor delay',
      endsAt: '2026-06-01T05:00:00Z',
    }
    nextResponse = () => new Response(JSON.stringify({data: updated}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    })

    const c = buildClient()
    const result = await c.maintenanceWindows.update(VALID_WINDOW.id, {
      startsAt: '2026-06-01T03:00:00Z',
      endsAt: '2026-06-01T05:00:00Z',
      reason: 'Rescheduled — vendor delay',
    })

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('PUT')
    expect(req.url.pathname).toBe(`/api/v1/maintenance-windows/${VALID_WINDOW.id}`)
    const body = JSON.parse(req.body ?? '{}')
    expect(body).toEqual({
      startsAt: '2026-06-01T03:00:00Z',
      endsAt: '2026-06-01T05:00:00Z',
      reason: 'Rescheduled — vendor delay',
    })
    expect(result.reason).toBe('Rescheduled — vendor delay')
  })

  it('cancel DELETEs /maintenance-windows/{id} and resolves to void', async () => {
    nextResponse = () => new Response(null, {status: 204})
    const c = buildClient()
    const result = await c.maintenanceWindows.cancel(VALID_WINDOW.id)

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('DELETE')
    expect(req.url.pathname).toBe(`/api/v1/maintenance-windows/${VALID_WINDOW.id}`)
    expect(result).toBeUndefined()
  })
})
