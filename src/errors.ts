import {z} from 'zod'
import {ErrorResponseSchema} from './schemas.js'
import type {ErrorResponse} from './types.js'

/**
 * Error taxonomy for the DevHelm SDK (P4 — see
 * `mono/cowork/design/040-codegen-policies.md`):
 *
 *   DevhelmValidationError  — local request/response shape validation failed
 *   DevhelmApiError         — API returned a non-2xx (with status + body)
 *   DevhelmTransportError   — request never reached the server
 *
 * All three inherit from `DevhelmError` for catch-all sites.
 */

export class DevhelmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DevhelmError'
  }
}

export interface ValidationIssue {
  readonly path: ReadonlyArray<string | number>
  readonly message: string
  readonly code: string
}

export class DevhelmValidationError extends DevhelmError {
  readonly issues: ReadonlyArray<ValidationIssue>

  constructor(message: string, issues: ReadonlyArray<ValidationIssue> = []) {
    super(message)
    this.name = 'DevhelmValidationError'
    this.issues = issues
  }

  static fromZodError(error: z.ZodError, prefix: string): DevhelmValidationError {
    const issues: ValidationIssue[] = error.issues.map((i) => ({
      path: [...i.path] as Array<string | number>,
      message: i.message,
      code: i.code,
    }))
    const summary = issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ')
    return new DevhelmValidationError(`${prefix}: ${summary}`, issues)
  }
}

export interface DevhelmApiErrorOptions {
  /** Human-readable detail extracted from the response body, if any. */
  detail?: string
  /**
   * Coarse machine-readable category from `ErrorResponse.code`
   * (e.g. `NOT_FOUND`, `RATE_LIMITED`). Switch on this — never on
   * `message` — when adapting behaviour to specific error classes.
   */
  code?: string
  /**
   * Per-request id from the API's `X-Request-Id` response header
   * (and mirrored in `ErrorResponse.requestId`). Always include it
   * when filing a support ticket.
   */
  requestId?: string
  /**
   * Parsed canonical error envelope (`ErrorResponse` from the OpenAPI
   * spec) when the response matched the contract. `undefined` for
   * non-conforming bodies (e.g. proxy 502 HTML, plain text, or JSON
   * shapes that predate the canonical envelope).
   */
  body?: ErrorResponse
  /**
   * Raw response body — the unparsed JSON value or response text.
   * Always populated when there was a body. Useful for debugging
   * non-conforming responses without losing the original shape.
   */
  rawBody?: unknown
}

export class DevhelmApiError extends DevhelmError {
  readonly status: number
  readonly detail: string | undefined
  readonly code: string | undefined
  readonly requestId: string | undefined
  readonly body: ErrorResponse | undefined
  readonly rawBody: unknown

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message)
    this.name = 'DevhelmApiError'
    this.status = status
    this.detail = options?.detail
    this.code = options?.code
    this.requestId = options?.requestId
    this.body = options?.body
    this.rawBody = options?.rawBody
  }
}

export class DevhelmAuthError extends DevhelmApiError {
  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmAuthError'
  }
}

export class DevhelmNotFoundError extends DevhelmApiError {
  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmNotFoundError'
  }
}

export class DevhelmConflictError extends DevhelmApiError {
  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmConflictError'
  }
}

export class DevhelmRateLimitError extends DevhelmApiError {
  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmRateLimitError'
  }
}

export class DevhelmServerError extends DevhelmApiError {
  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmServerError'
  }
}

export class DevhelmTransportError extends DevhelmError {
  constructor(message: string, options?: {cause?: unknown}) {
    super(message)
    this.name = 'DevhelmTransportError'
    if (options?.cause !== undefined) {
      // Node 16+ supports the standard cause chain; we set it explicitly so
      // the instance shape stays consistent across runtimes.
      ;(this as {cause?: unknown}).cause = options.cause
    }
  }
}

// Lenient shape used to extract a human-readable message + detail from
// non-conforming error bodies (e.g. older deployments that emit
// `{message, error, detail}` instead of the canonical `ErrorResponse`,
// or proxies that include their own shape).
const FallbackErrorShape = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
    detail: z.string().optional(),
    code: z.string().optional(),
    requestId: z.string().optional(),
    request_id: z.string().optional(),
  })
  .passthrough()

/**
 * Map an HTTP error response to a typed {@link DevhelmApiError} subclass.
 *
 * `requestId` is the value of the `X-Request-Id` response header. Pass it
 * in from the call site so the SDK still surfaces the id even when the
 * server returned a non-JSON body (e.g. an HTML error page from a
 * misconfigured proxy). The header takes precedence over any value found
 * in the body.
 */
export function errorFromResponse(
  status: number,
  body: string,
  options?: {requestId?: string},
): DevhelmApiError {
  let message = `HTTP ${status}`
  let detail: string | undefined
  let code: string | undefined
  let bodyRequestId: string | undefined
  let parsed: ErrorResponse | undefined
  let rawBody: unknown = body || undefined

  if (body) {
    try {
      const json: unknown = JSON.parse(body)
      rawBody = json

      const canonical = ErrorResponseSchema.safeParse(json)
      if (canonical.success) {
        parsed = canonical.data
        message = parsed.message
        code = parsed.code
        bodyRequestId = parsed.requestId ?? undefined
      } else {
        const fallback = FallbackErrorShape.safeParse(json)
        if (fallback.success) {
          message = fallback.data.message ?? fallback.data.error ?? message
          detail = fallback.data.detail
          code = fallback.data.code
          bodyRequestId = fallback.data.requestId ?? fallback.data.request_id
          if (message === `HTTP ${status}` && !fallback.data.message && !fallback.data.error) {
            message = body
          }
        } else {
          message = body
        }
      }
    } catch {
      message = body
    }
  }

  const opts: DevhelmApiErrorOptions = {
    detail,
    code,
    requestId: options?.requestId ?? bodyRequestId,
    body: parsed,
    rawBody,
  }
  if (status === 401 || status === 403) return new DevhelmAuthError(message, status, opts)
  if (status === 404) return new DevhelmNotFoundError(message, status, opts)
  if (status === 409) return new DevhelmConflictError(message, status, opts)
  if (status === 429) return new DevhelmRateLimitError(message, status, opts)
  if (status >= 500) return new DevhelmServerError(message, status, opts)
  return new DevhelmApiError(message, status, opts)
}
