import {z} from 'zod'
import {ErrorResponseSchema} from './schemas.js'
import {decoded} from './validation.js'
import type {ErrorResponse} from './types.js'
import type {JsonValue} from './json.js'
import {
  categoryForStatus,
  categoryOf,
  envelopeFields,
  errorForCategory,
  type DevhelmError,
  type ErrorCategory,
  type ErrorFields,
} from './errors.js'

// Lenient shape for bodies that predate the canonical envelope (proxies,
// legacy deployments): `{message, error, detail, code, requestId}`.
const FallbackErrorShape = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
    detail: z.string().optional(),
    code: z.string().optional(),
    category: z.string().optional(),
    retryable: z.boolean().optional(),
    requestId: z.string().optional(),
    request_id: z.string().optional(),
  })
  .passthrough()

/** Parse a `Retry-After` header: delta seconds or an HTTP date. */
export function parseRetryAfter(value: string | null | undefined): number | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10)
  // HTTP-date only (e.g. `Wed, 21 Oct 2026 07:28:00 GMT`).
  if (!/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(trimmed)) return null
  const date = Date.parse(trimmed)
  if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000))
  return null
}

/**
 * Map an HTTP error response to the typed error for its `category`.
 *
 * `requestId` is the `X-Request-Id` response header and wins over the body,
 * so the id survives non-JSON bodies (e.g. a proxy's HTML error page).
 * `retryAfter` is the raw `Retry-After` header (seconds or HTTP date).
 */
export function errorFromResponse(
  status: number,
  body: string,
  options?: {requestId?: string; retryAfter?: string},
): DevhelmError {
  let message = `HTTP ${status}`
  let rawBody: JsonValue | null = body ? body : null
  let fields: ErrorFields = {}
  let category: ErrorCategory = categoryForStatus(status)
  let code: string | undefined
  let response: ErrorResponse | null = null

  if (body) {
    let json: JsonValue | undefined
    try {
      json = JSON.parse(body) as JsonValue
    } catch {
      json = undefined
    }
    if (json === undefined) {
      message = body
    } else {
      rawBody = json
      const canonical = ErrorResponseSchema.safeParse(json)
      if (canonical.success) {
        // Decoded from JSON, so its free-form slots are JSON (see Wire<T>).
        const parsed: ErrorResponse = decoded(canonical.data)
        response = parsed
        message = parsed.message
        code = parsed.code
        category = categoryOf(parsed.category, status)
        fields = envelopeFields(parsed)
      } else {
        const fallback = FallbackErrorShape.safeParse(json)
        if (fallback.success) {
          const f = fallback.data
          message = f.message ?? f.error ?? body
          code = f.code
          category = categoryOf(f.category, status)
          fields = {requestId: f.requestId ?? f.request_id ?? null, detail: f.detail ?? null}
          if (f.retryable !== undefined) fields.retryable = f.retryable
        } else {
          message = body
        }
      }
    }
  }

  return errorForCategory({
    ...fields,
    message,
    category,
    code: code ?? 'API_ERROR',
    status,
    retryable: fields.retryable ?? (status === 429 || status === 503),
    requestId: options?.requestId ?? fields.requestId ?? null,
    retryAfterSeconds: fields.retryAfterSeconds ?? parseRetryAfter(options?.retryAfter),
    response,
    rawBody,
  })
}

