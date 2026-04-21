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
  readonly body: ErrorResponse | undefined
  readonly rawBody: unknown

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message)
    this.name = 'DevhelmApiError'
    this.status = status
    this.detail = options?.detail
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
  })
  .passthrough()

export function errorFromResponse(status: number, body: string): DevhelmApiError {
  let message = `HTTP ${status}`
  let detail: string | undefined
  let parsed: ErrorResponse | undefined
  let rawBody: unknown = body || undefined

  if (body) {
    try {
      const json: unknown = JSON.parse(body)
      rawBody = json

      // Prefer the canonical envelope (P1 — typed `ErrorResponse`).
      const canonical = ErrorResponseSchema.safeParse(json)
      if (canonical.success) {
        parsed = canonical.data
        message = parsed.message
      } else {
        // Fall back to the lenient shape so older API versions and
        // proxy-injected error bodies still produce useful messages.
        const fallback = FallbackErrorShape.safeParse(json)
        if (fallback.success) {
          message = fallback.data.message ?? fallback.data.error ?? message
          detail = fallback.data.detail
          // Treat empty extracted message as "no useful info" — don't
          // overwrite the HTTP fallback unless we got *something*.
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

  const opts: DevhelmApiErrorOptions = {detail, body: parsed, rawBody}
  if (status === 401 || status === 403) return new DevhelmAuthError(message, status, opts)
  if (status === 404) return new DevhelmNotFoundError(message, status, opts)
  if (status === 409) return new DevhelmConflictError(message, status, opts)
  if (status === 429) return new DevhelmRateLimitError(message, status, opts)
  if (status >= 500) return new DevhelmServerError(message, status, opts)
  return new DevhelmApiError(message, status, opts)
}

// ────────────────────────────────────────────────────────────────────────
// Backwards-compat aliases. We have no shipping consumers yet so these are
// here purely so internal scripts/tests keep working until they're migrated
// off the legacy names; flip them to deprecation warnings once the rest of
// the surface is updated.
// ────────────────────────────────────────────────────────────────────────

export const AuthError = DevhelmAuthError
export type DevhelmErrorCode = 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'API'
