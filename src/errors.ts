import {z} from 'zod'

export type DevhelmErrorCode = 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'API'

/**
 * Shape the API uses for error response bodies. We accept any of `message`,
 * `error`, or `detail` and pass through unknown fields so a backwards-compat
 * change to the error envelope (e.g. adding `traceId`) doesn't break parsing.
 *
 * Validation here is intentionally permissive — `safeParse` is used so that
 * non-conforming bodies fall back to the raw response text rather than
 * masking the underlying problem with a Zod failure.
 */
const ErrorBodySchema = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
    detail: z.string().optional(),
  })
  .passthrough()

export class DevhelmError extends Error {
  readonly code: DevhelmErrorCode
  readonly status: number
  readonly detail: string | undefined

  constructor(code: DevhelmErrorCode, message: string, status: number, detail?: string) {
    super(message)
    this.name = 'DevhelmError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

export class AuthError extends DevhelmError {
  constructor(message: string, status: number) {
    super('AUTH', message, status)
    this.name = 'AuthError'
  }
}

export function errorFromResponse(status: number, body: string): DevhelmError {
  let message = `HTTP ${status}`
  let detail: string | undefined

  try {
    const json: unknown = JSON.parse(body)
    const result = ErrorBodySchema.safeParse(json)
    if (result.success) {
      message = result.data.message ?? result.data.error ?? message
      detail = result.data.detail
    } else if (body) {
      message = body
    }
  } catch {
    if (body) message = body
  }

  if (status === 401 || status === 403) {
    return new AuthError(message, status)
  }
  if (status === 404) {
    return new DevhelmError('NOT_FOUND', message, status, detail)
  }
  if (status === 409) {
    return new DevhelmError('CONFLICT', message, status, detail)
  }
  if (status === 400 || status === 422) {
    return new DevhelmError('VALIDATION', message, status, detail)
  }

  return new DevhelmError('API', message, status, detail)
}
