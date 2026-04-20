import {describe, it, expect} from 'vitest'
import {
  DevhelmApiError,
  DevhelmAuthError,
  DevhelmConflictError,
  DevhelmError,
  DevhelmNotFoundError,
  DevhelmRateLimitError,
  DevhelmServerError,
  DevhelmValidationError,
  errorFromResponse,
} from '../src/errors.js'

describe('errorFromResponse', () => {
  it('returns DevhelmAuthError for 401', () => {
    const err = errorFromResponse(401, '{"message":"Unauthorized"}')
    expect(err).toBeInstanceOf(DevhelmAuthError)
    expect(err).toBeInstanceOf(DevhelmApiError)
    expect(err).toBeInstanceOf(DevhelmError)
    expect(err.status).toBe(401)
    expect(err.message).toBe('Unauthorized')
  })

  it('returns DevhelmAuthError for 403', () => {
    const err = errorFromResponse(403, '{"message":"Forbidden"}')
    expect(err).toBeInstanceOf(DevhelmAuthError)
    expect(err.status).toBe(403)
  })

  it('returns DevhelmNotFoundError for 404', () => {
    const err = errorFromResponse(404, '{"message":"Monitor not found"}')
    expect(err).toBeInstanceOf(DevhelmNotFoundError)
    expect(err.message).toBe('Monitor not found')
  })

  it('returns DevhelmConflictError for 409', () => {
    const err = errorFromResponse(409, '{"message":"Deploy lock held by another session"}')
    expect(err).toBeInstanceOf(DevhelmConflictError)
    expect(err.status).toBe(409)
  })

  it('returns plain DevhelmApiError for 400 (not Validation)', () => {
    const err = errorFromResponse(400, '{"message":"Name is required","detail":"field: name"}')
    expect(err).toBeInstanceOf(DevhelmApiError)
    expect(err).not.toBeInstanceOf(DevhelmValidationError)
    expect(err.status).toBe(400)
    expect(err.detail).toBe('field: name')
  })

  it('returns plain DevhelmApiError for 422 (not Validation)', () => {
    const err = errorFromResponse(422, '{"message":"Invalid frequency"}')
    expect(err).toBeInstanceOf(DevhelmApiError)
    expect(err).not.toBeInstanceOf(DevhelmValidationError)
    expect(err.status).toBe(422)
  })

  it('returns DevhelmRateLimitError for 429', () => {
    const err = errorFromResponse(429, '{"message":"Slow down"}')
    expect(err).toBeInstanceOf(DevhelmRateLimitError)
    expect(err.status).toBe(429)
  })

  it('returns DevhelmServerError for 500', () => {
    const err = errorFromResponse(500, '{"error":"Internal Server Error"}')
    expect(err).toBeInstanceOf(DevhelmServerError)
    expect(err.message).toBe('Internal Server Error')
  })

  it('handles non-JSON body', () => {
    const err = errorFromResponse(502, 'Bad Gateway')
    expect(err).toBeInstanceOf(DevhelmServerError)
    expect(err.message).toBe('Bad Gateway')
  })

  it('handles empty body', () => {
    const err = errorFromResponse(500, '')
    expect(err).toBeInstanceOf(DevhelmServerError)
    expect(err.message).toBe('HTTP 500')
  })

  it('prefers message over error field', () => {
    const err = errorFromResponse(400, '{"message":"Specific message","error":"Generic error"}')
    expect(err.message).toBe('Specific message')
  })

  it('falls back to error field when message is absent', () => {
    const err = errorFromResponse(400, '{"error":"Validation failed"}')
    expect(err.message).toBe('Validation failed')
  })

  it('falls back to raw body when JSON parses to a non-object shape', () => {
    const err = errorFromResponse(500, '"plain string body"')
    expect(err).toBeInstanceOf(DevhelmServerError)
    expect(err.message).toBe('"plain string body"')
  })

  it('preserves unknown extra fields without crashing (error envelope is permissive)', () => {
    const err = errorFromResponse(
      400,
      '{"message":"Bad","traceId":"abc-123","timestamp":1700000000}',
    )
    expect(err.message).toBe('Bad')
  })

  it('ignores fields with wrong types (rejects non-string message)', () => {
    const err = errorFromResponse(500, '{"message":42,"detail":"info"}')
    expect(err.message).toBe('{"message":42,"detail":"info"}')
  })
})

describe('DevhelmValidationError', () => {
  it('inherits from DevhelmError but NOT DevhelmApiError', () => {
    const err = new DevhelmValidationError('boom')
    expect(err).toBeInstanceOf(DevhelmError)
    expect(err).not.toBeInstanceOf(DevhelmApiError)
  })

  it('exposes structured issues from a Zod error', async () => {
    const {z} = await import('zod')
    const schema = z.object({name: z.string()}).strict()
    const parsed = schema.safeParse({foo: 1})
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    const err = DevhelmValidationError.fromZodError(parsed.error, 'Request validation failed')
    expect(err.issues.length).toBeGreaterThan(0)
    expect(err.message).toMatch(/Request validation failed/)
  })
})
