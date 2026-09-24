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
