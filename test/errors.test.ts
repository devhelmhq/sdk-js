import {describe, it, expect} from 'vitest'
import {errorFromResponse, DevhelmError, AuthError} from '../src/errors.js'

describe('errorFromResponse', () => {
  it('returns AuthError for 401', () => {
    const err = errorFromResponse(401, '{"message":"Unauthorized"}')
    expect(err).toBeInstanceOf(AuthError)
    expect(err.code).toBe('AUTH')
    expect(err.status).toBe(401)
    expect(err.message).toBe('Unauthorized')
  })

  it('returns AuthError for 403', () => {
    const err = errorFromResponse(403, '{"message":"Forbidden"}')
    expect(err).toBeInstanceOf(AuthError)
    expect(err.code).toBe('AUTH')
    expect(err.status).toBe(403)
  })

  it('returns NOT_FOUND for 404', () => {
    const err = errorFromResponse(404, '{"message":"Monitor not found"}')
    expect(err).toBeInstanceOf(DevhelmError)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Monitor not found')
  })

  it('returns CONFLICT for 409', () => {
    const err = errorFromResponse(409, '{"message":"Deploy lock held by another session"}')
    expect(err.code).toBe('CONFLICT')
    expect(err.status).toBe(409)
  })

  it('returns VALIDATION for 400', () => {
    const err = errorFromResponse(400, '{"message":"Name is required","detail":"field: name"}')
    expect(err.code).toBe('VALIDATION')
    expect(err.detail).toBe('field: name')
  })

  it('returns VALIDATION for 422', () => {
    const err = errorFromResponse(422, '{"message":"Invalid frequency"}')
    expect(err.code).toBe('VALIDATION')
  })

  it('returns API for 500', () => {
    const err = errorFromResponse(500, '{"error":"Internal Server Error"}')
    expect(err.code).toBe('API')
    expect(err.message).toBe('Internal Server Error')
  })

  it('handles non-JSON body', () => {
    const err = errorFromResponse(502, 'Bad Gateway')
    expect(err.code).toBe('API')
    expect(err.message).toBe('Bad Gateway')
  })

  it('handles empty body', () => {
    const err = errorFromResponse(500, '')
    expect(err.code).toBe('API')
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
    expect(err.code).toBe('API')
    expect(err.message).toBe('"plain string body"')
  })

  it('preserves unknown extra fields without crashing', () => {
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
