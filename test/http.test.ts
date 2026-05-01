import {describe, it, expect} from 'vitest'
import {z} from 'zod'
import {parse, parseSingle, parsePage, parseCursorPage} from '../src/validation.js'
import {DevhelmError, DevhelmValidationError} from '../src/errors.js'

const ItemSchema = z.object({id: z.number(), name: z.string()})

describe('parse', () => {
  it('parses valid data', () => {
    const result = parse(ItemSchema, {id: 1, name: 'Test'})
    expect(result).toEqual({id: 1, name: 'Test'})
  })

  it('passes through extra fields (.passthrough behavior from z.object)', () => {
    const schema = ItemSchema.passthrough()
    const result = parse(schema, {id: 1, name: 'Test', extra: true})
    expect(result).toEqual({id: 1, name: 'Test', extra: true})
  })

  it('throws DevhelmError on invalid data', () => {
    expect(() => parse(ItemSchema, {id: 'not-a-number', name: 123})).toThrow(DevhelmError)
  })

  it('includes field path in error message and structured issues', () => {
    try {
      parse(ItemSchema, {id: 'bad'})
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(DevhelmValidationError)
      expect((e as DevhelmValidationError).message).toContain('id')
      expect((e as DevhelmValidationError).issues.length).toBeGreaterThan(0)
    }
  })

  it('includes context in error message when provided', () => {
    try {
      parse(ItemSchema, {}, '/api/v1/monitors')
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).message).toContain('/api/v1/monitors')
    }
  })
})

describe('parseSingle', () => {
  it('unwraps SingleValueResponse envelope', () => {
    const result = parseSingle(ItemSchema, {data: {id: 1, name: 'Test'}})
    expect(result).toEqual({id: 1, name: 'Test'})
  })

  it('throws when envelope is missing data field', () => {
    expect(() => parseSingle(ItemSchema, {result: {id: 1}})).toThrow(DevhelmError)
  })

  it('throws when inner data fails schema validation', () => {
    expect(() => parseSingle(ItemSchema, {data: {id: 'bad'}})).toThrow(DevhelmError)
  })
})

describe('parsePage', () => {
  it('parses valid paginated response', () => {
    const raw = {data: [{id: 1, name: 'A'}], hasNext: true, hasPrev: false, totalElements: 10, totalPages: 2}
    const result = parsePage(ItemSchema, raw)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual({id: 1, name: 'A'})
    expect(result.hasNext).toBe(true)
    expect(result.hasPrev).toBe(false)
    expect(result.totalElements).toBe(10)
    expect(result.totalPages).toBe(2)
  })

  it('accepts null totalElements/totalPages', () => {
    const raw = {data: [], hasNext: false, hasPrev: false, totalElements: null, totalPages: null}
    const result = parsePage(ItemSchema, raw)
    expect(result.totalElements).toBeNull()
  })

  it('throws when data items fail validation', () => {
    const raw = {data: [{id: 'bad'}], hasNext: false, hasPrev: false}
    expect(() => parsePage(ItemSchema, raw)).toThrow(DevhelmError)
  })

  it('throws when hasNext is missing', () => {
    const raw = {data: [], hasPrev: false}
    expect(() => parsePage(ItemSchema, raw)).toThrow(DevhelmError)
  })
})

describe('parseCursorPage', () => {
  it('parses valid cursor-paginated response', () => {
    const raw = {data: [{id: 1, name: 'A'}], nextCursor: 'abc123', hasMore: true}
    const result = parseCursorPage(ItemSchema, raw)
    expect(result.data).toHaveLength(1)
    expect(result.nextCursor).toBe('abc123')
    expect(result.hasMore).toBe(true)
  })

  it('accepts null nextCursor', () => {
    const raw = {data: [], nextCursor: null, hasMore: false}
    const result = parseCursorPage(ItemSchema, raw)
    expect(result.nextCursor).toBeNull()
  })

  it('throws when data items fail validation', () => {
    const raw = {data: [{wrong: 'shape'}], nextCursor: null, hasMore: false}
    expect(() => parseCursorPage(ItemSchema, raw)).toThrow(DevhelmError)
  })
})

describe('buildClient configuration', () => {
  it('is importable and returns a client', async () => {
    const {buildClient} = await import('../src/http.js')
    const client = buildClient({token: 'test-token', baseUrl: 'http://localhost:8080'})
    expect(client).toBeDefined()
    expect(typeof client.GET).toBe('function')
    expect(typeof client.POST).toBe('function')
  })
})

describe('surface telemetry headers', () => {
  // openapi-fetch ultimately delegates to globalThis.fetch, so the cleanest
  // way to assert outbound headers is to stub fetch, fire one request, and
  // inspect what the SDK handed to the network layer. The server response
  // is irrelevant — we just need the request to be issued.
  async function captureRequest(
    config: import('../src/types.js').DevhelmConfig,
  ): Promise<Headers> {
    const original = globalThis.fetch
    let captured: Headers | undefined
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init)
      captured = req.headers
      return new Response('{}', {status: 200, headers: {'Content-Type': 'application/json'}})
    }
    try {
      const {buildClient} = await import('../src/http.js')
      const client = buildClient({...config, baseUrl: 'http://localhost:0'})
      // openapi-fetch types path strings as path literals; cast via unknown is
      // local to this test and matches the same boundary used in src/http.ts.
      await (client as unknown as {GET: (p: string) => Promise<unknown>}).GET('/api/v1/_')
    } finally {
      globalThis.fetch = original
    }
    if (!captured) throw new Error('fetch was never called')
    return captured
  }

  it('emits sdk-js surface headers by default', async () => {
    delete process.env['DEVHELM_TELEMETRY']
    const headers = await captureRequest({token: 't'})
    expect(headers.get('x-devhelm-surface')).toBe('sdk-js')
    expect(headers.get('x-devhelm-sdk-name')).toBe('sdk-js')
    expect(headers.get('x-devhelm-surface-version')).toBeTruthy()
  })

  it('lets a wrapper override surface but keeps sdk-name', async () => {
    delete process.env['DEVHELM_TELEMETRY']
    const headers = await captureRequest({
      token: 't',
      surface: 'mcp',
      surfaceVersion: '0.5.0',
      surfaceMetadata: {'Mcp-Client': 'cursor'},
    })
    expect(headers.get('x-devhelm-surface')).toBe('mcp')
    expect(headers.get('x-devhelm-surface-version')).toBe('0.5.0')
    expect(headers.get('x-devhelm-sdk-name')).toBe('sdk-js')
    expect(headers.get('x-devhelm-mcp-client')).toBe('cursor')
  })

  it('drops every surface header when DEVHELM_TELEMETRY=0', async () => {
    process.env['DEVHELM_TELEMETRY'] = '0'
    try {
      const headers = await captureRequest({
        token: 't',
        surface: 'mcp',
        surfaceMetadata: {'X': 'y'},
      })
      expect(headers.get('x-devhelm-surface')).toBeNull()
      expect(headers.get('x-devhelm-surface-version')).toBeNull()
      expect(headers.get('x-devhelm-sdk-name')).toBeNull()
      expect(headers.get('x-devhelm-x')).toBeNull()
      // Auth + tenant must still ride along.
      expect(headers.get('authorization')).toBe('Bearer t')
      expect(headers.get('x-phelm-org-id')).toBe('1')
    } finally {
      delete process.env['DEVHELM_TELEMETRY']
    }
  })
})
