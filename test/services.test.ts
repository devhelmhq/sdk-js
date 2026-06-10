/**
 * Services (Status Data catalog) resource tests.
 *
 * Same approach as `test/maintenance-windows.test.ts`: stub
 * `globalThis.fetch`, capture the live `Request`, and assert on the exact
 * path, method, and query string the SDK puts on the wire.
 */
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {Devhelm} from '../src/index.js'
import type {ServiceCatalogDto, ServiceIncidentDto} from '../src/index.js'

interface CapturedRequest {
  method: string
  url: URL
  body: string | null
}

const VALID_SERVICE: ServiceCatalogDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'github',
  name: 'GitHub',
  category: 'developer-tools',
  officialStatusUrl: 'https://www.githubstatus.com',
  logoUrl: null,
  adapterType: 'STATUSPAGE',
  pollingIntervalSeconds: 60,
  lifecycleStatus: 'ACTIVE',
  enabled: true,
  published: true,
  overallStatus: 'OPERATIONAL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  componentCount: 12,
  activeIncidentCount: 0,
  dataCompleteness: 'FULL',
  uptime30d: 99.98,
}

const VALID_INCIDENT: ServiceIncidentDto = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  serviceId: VALID_SERVICE.id,
  serviceSlug: 'github',
  serviceName: 'GitHub',
  externalId: 'abc123',
  title: 'Elevated error rates on Actions',
  status: 'resolved',
  impact: 'minor',
  startedAt: '2026-05-20T10:00:00Z',
  resolvedAt: '2026-05-20T11:30:00Z',
  updatedAt: '2026-05-20T11:30:00Z',
  shortlink: null,
  detectedAt: '2026-05-20T10:01:00Z',
  vendorCreatedAt: null,
}

function pageEnvelope(data: unknown[]) {
  return JSON.stringify({data, hasNext: false, hasPrev: false, totalElements: data.length, totalPages: 1})
}

describe('Services resource', () => {
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

  it('exposes services with the expected methods', () => {
    const c = buildClient()
    expect(c.services).toBeDefined()
    for (const method of [
      'list', 'get', 'liveStatus', 'categories', 'summary', 'components',
      'componentUptime', 'batchComponentUptime', 'day', 'incidents',
      'incident', 'uptime', 'maintenances',
    ]) {
      expect(typeof (c.services as unknown as Record<string, unknown>)[method], method).toBe('function')
    }
  })

  it('list forwards search and filters as query params and unwraps the cursor envelope', async () => {
    nextResponse = () => new Response(JSON.stringify({
      data: [VALID_SERVICE],
      nextCursor: 'abc',
      hasMore: true,
    }), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const page = await c.services.list({search: 'git', category: 'developer-tools', status: 'OPERATIONAL', limit: 10})

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.method).toBe('GET')
    expect(req.url.pathname).toBe('/api/v1/services')
    expect(req.url.searchParams.get('search')).toBe('git')
    expect(req.url.searchParams.get('category')).toBe('developer-tools')
    expect(req.url.searchParams.get('status')).toBe('OPERATIONAL')
    expect(req.url.searchParams.get('limit')).toBe('10')
    expect(req.url.searchParams.has('cursor')).toBe(false)
    expect(page.data).toHaveLength(1)
    expect(page.data[0].slug).toBe('github')
    expect(page.nextCursor).toBe('abc')
    expect(page.hasMore).toBe(true)
  })

  it('list forwards the cursor and omits unset filters', async () => {
    nextResponse = () => new Response(JSON.stringify({
      data: [],
      nextCursor: null,
      hasMore: false,
    }), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const page = await c.services.list({cursor: 'next-page-token'})

    const [req] = captured
    expect(req.url.searchParams.get('cursor')).toBe('next-page-token')
    expect(req.url.searchParams.has('search')).toBe(false)
    expect(req.url.searchParams.has('category')).toBe(false)
    expect(page.nextCursor).toBeNull()
    expect(page.hasMore).toBe(false)
  })

  it('get forwards the summary flag', async () => {
    nextResponse = () => new Response(pageEnvelope([]), {status: 200, headers: {'Content-Type': 'application/json'}})
    const c = buildClient()
    // Response shape validation is exercised elsewhere; here we only care
    // about the request, so let the (invalid-shape) call reject.
    await c.services.get('github', {summary: true}).catch(() => undefined)

    const [req] = captured
    expect(req.method).toBe('GET')
    expect(req.url.pathname).toBe('/api/v1/services/github')
    expect(req.url.searchParams.get('summary')).toBe('true')
  })

  it('incidents with slugOrId hits the per-service path', async () => {
    nextResponse = () => new Response(pageEnvelope([VALID_INCIDENT]), {
      status: 200, headers: {'Content-Type': 'application/json'},
    })

    const c = buildClient()
    const page = await c.services.incidents({slugOrId: 'github', status: 'resolved', from: '2026-05-01T00:00:00Z'})

    expect(captured).toHaveLength(1)
    const [req] = captured
    expect(req.url.pathname).toBe('/api/v1/services/github/incidents')
    expect(req.url.searchParams.get('status')).toBe('resolved')
    expect(req.url.searchParams.get('from')).toBe('2026-05-01T00:00:00Z')
    expect(req.url.searchParams.get('page')).toBe('0')
    expect(req.url.searchParams.get('size')).toBe('20')
    expect(page.data).toHaveLength(1)
    expect(page.data[0].title).toBe(VALID_INCIDENT.title)
  })

  it('incidents without slugOrId hits the global path and forwards category', async () => {
    nextResponse = () => new Response(pageEnvelope([VALID_INCIDENT]), {
      status: 200, headers: {'Content-Type': 'application/json'},
    })

    const c = buildClient()
    const page = await c.services.incidents({category: 'developer-tools', page: 2, size: 50})

    const [req] = captured
    expect(req.url.pathname).toBe('/api/v1/services/incidents')
    expect(req.url.searchParams.get('category')).toBe('developer-tools')
    expect(req.url.searchParams.get('page')).toBe('2')
    expect(req.url.searchParams.get('size')).toBe('50')
    expect(page.totalElements).toBe(1)
  })

  it('categories unwraps the table envelope into a plain array', async () => {
    nextResponse = () => new Response(pageEnvelope([
      {category: 'developer-tools', serviceCount: 42},
      {category: 'cloud', serviceCount: 17},
    ]), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const categories = await c.services.categories()

    const [req] = captured
    expect(req.url.pathname).toBe('/api/v1/categories')
    expect(req.url.search).toBe('')
    expect(categories).toHaveLength(2)
    expect(categories[0].category).toBe('developer-tools')
  })

  it('componentUptime builds the nested path and forwards the range query', async () => {
    nextResponse = () => new Response(pageEnvelope([]), {status: 200, headers: {'Content-Type': 'application/json'}})

    const c = buildClient()
    const componentId = '550e8400-e29b-41d4-a716-446655440020'
    await c.services.componentUptime('github', componentId, {period: '90d'})

    const [req] = captured
    expect(req.url.pathname).toBe(`/api/v1/services/github/components/${componentId}/uptime`)
    expect(req.url.searchParams.get('period')).toBe('90d')
  })
})
