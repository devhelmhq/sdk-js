import {afterEach, describe, expect, it, vi} from 'vitest'
import {Devhelm, DevhelmApiError} from '../src/index.js'

const INBOX_ID = '550e8400-e29b-41d4-a716-446655440000'
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440001'
const WHEN = '2026-09-24T12:00:00.000Z'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'},
  })
}

const event = {
  id: EVENT_ID,
  inboxId: INBOX_ID,
  receivedAt: WHEN,
  sizeBytes: 2,
  headers: {},
  method: 'POST',
  path: '/',
  sha256: 'abc',
  body: '{"ok":true}',
}

describe('inbound helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unwraps a webhook wait and downloads the signed raw body', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : null
      const url = request?.url ?? String(input)
      if (url.endsWith('/wait')) {
        expect(request?.method ?? init?.method).toBe('POST')
        const body = JSON.parse(request ? await request.clone().text() : String(init?.body))
        expect(body.timeoutMs).toBe(30_000)
        expect(body.receivedAfter).toEqual(expect.any(String))
        return json({event})
      }
      if (url.endsWith('/raw')) {
        return json({
          data: {
            url: 'https://files.example/event',
            expiresAt: WHEN,
            filename: 'event.bin',
            contentType: 'application/json',
            sizeBytes: 2,
          },
        })
      }
      if (url === 'https://files.example/event') {
        return new Response(new Uint8Array([9, 9]), {status: 200})
      }
      return json({code: 'NOT_FOUND', message: url}, 404)
    })

    const client = new Devhelm({token: 't', baseUrl: 'http://api.test'})
    const captured = await client.inboxes.wait(INBOX_ID, {timeoutMs: 30_000, http: {method: 'POST'}})
    expect(captured.method).toBe('POST')
    expect(captured.text()).toBe('{"ok":true}')
    expect(captured.json()).toEqual({ok: true})
    const file = await captured.raw()
    expect(file.name).toBe('event.bin')
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([9, 9]))
  })

  it('searches inboxes, filters events, and reads 24h activity', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      seen.push(url)
      if (url.includes('/activity')) {
        return json({data: [{inboxId: INBOX_ID, buckets: [{hour: WHEN, eventCount: 3}]}]})
      }
      if (url.includes('/events')) {
        return json({data: [event], nextCursor: null, hasMore: false})
      }
      return json({
        data: [
          {
            id: INBOX_ID,
            workspaceId: 2,
            name: 'stripe',
            status: 'active',
            publicToken: 'tok',
            httpUrl: 'https://api.test/api/v1/ingest/tok',
            httpResponse: {status: 200, headers: {}, body: '', contentType: 'text/plain', delayMs: 0},
            cors: true,
            retentionDays: 3,
            maxEvents: 10000,
            createdAt: WHEN,
            updatedAt: WHEN,
          },
        ],
        hasNext: false,
        hasPrev: false,
        totalElements: 1,
        totalPages: 1,
      })
    })

    const client = new Devhelm({token: 't', baseUrl: 'http://api.test'})
    const beforeEmpty = seen.length
    expect(await client.inboxes.activity([])).toEqual([])
    expect(seen.length).toBe(beforeEmpty)

    const rows = await client.inboxes.list({search: 'stripe'})
    expect(rows).toHaveLength(1)
    expect(new URL(seen[0]).searchParams.get('search')).toBe('stripe')

    await rows[0].events.list({method: 'POST', path: '/hooks'})
    const eventsUrl = new URL(seen.find((url) => url.includes('/events')) ?? '')
    expect(eventsUrl.searchParams.get('method')).toBe('POST')
    expect(eventsUrl.searchParams.get('path')).toBe('/hooks')

    const activity = await client.inboxes.activity([INBOX_ID])
    expect(activity[0]?.buckets[0]?.eventCount).toBe(3)
    const activityUrl = new URL(seen.find((url) => url.includes('/activity')) ?? '')
    expect(activityUrl.searchParams.get('inboxIds')).toBe(INBOX_ID)
  })

  it('filters messages by q and reads the source text', async () => {
    const messageId = '550e8400-e29b-41d4-a716-446655440003'
    const seen: string[] = []
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      seen.push(url)
      if (url.endsWith('/source')) {
        return json({data: {source: 'Subject: code', truncated: false}})
      }
      return json({
        data: [
          {
            id: messageId,
            domainId: '550e8400-e29b-41d4-a716-446655440002',
            receivedAt: WHEN,
            sizeBytes: 4,
            headers: {},
            sha256: 'abc',
          },
        ],
        nextCursor: null,
        hasMore: false,
      })
    })

    const client = new Devhelm({token: 't', baseUrl: 'http://api.test'})
    const address = await client.email.address({domain: 'ws.devhelmmail.com', label: 'signup'})
    const page = await address.messages.list({q: 'code'})
    const listUrl = new URL(seen.find((url) => url.includes('/messages?') || url.includes('/messages')) ?? '')
    expect(listUrl.searchParams.get('q')).toBe('code')
    expect(listUrl.searchParams.get('inbox')).toBe(address.localPart)
    const text = await page.data[0].source()
    expect(text).toEqual({source: 'Subject: code', truncated: false})
  })

  it('searches domains and reads 24h message activity', async () => {
    const domainId = '550e8400-e29b-41d4-a716-446655440002'
    const seen: string[] = []
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      seen.push(url)
      if (url.includes('/activity')) {
        return json({data: [{domainId, buckets: [{hour: WHEN, messageCount: 4}]}]})
      }
      return json({
        data: [
          {
            id: domainId,
            name: 'ws.devhelmmail.com',
            workspaceId: 2,
            kind: 'assigned',
            status: 'active',
            mxVerified: true,
            dnsRecords: [],
            createdAt: WHEN,
            updatedAt: WHEN,
          },
        ],
        hasNext: false,
        hasPrev: false,
        totalElements: 1,
        totalPages: 1,
      })
    })

    const client = new Devhelm({token: 't', baseUrl: 'http://api.test'})
    const domains = await client.email.domains.list({search: 'ws'})
    expect(domains).toHaveLength(1)
    expect(new URL(seen[0]).searchParams.get('search')).toBe('ws')
    const activity = await client.email.domains.activity([domainId])
    expect(activity[0]?.buckets[0]?.messageCount).toBe(4)
    expect(new URL(seen.find((url) => url.includes('/activity')) ?? '').searchParams.get('domainIds')).toBe(domainId)
  })

  it('throws WAIT_TIMEOUT when email wait finds nothing', async () => {
    vi.stubGlobal('fetch', async () => json({code: 'WAIT_TIMEOUT', message: 'timed out'}, 408))
    const client = new Devhelm({token: 't', baseUrl: 'http://api.test'})
    await expect(client.email.wait({to: 'a@b.devhelmmail.com', timeoutMs: 1000})).rejects.toMatchObject({
      status: 408,
      code: 'WAIT_TIMEOUT',
    })
    await expect(client.email.wait({to: 'a@b.devhelmmail.com', timeoutMs: 1000})).rejects.toBeInstanceOf(DevhelmApiError)
  })
})
