import {z} from 'zod'

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

const ErrorBodySchema = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
    detail: z.string().optional(),
  })
  // Error envelope is intentionally permissive: pass through unknown fields
  // (e.g. a future `traceId`) rather than raising on the response we already
  // know is broken. Strict-fail would be self-defeating here.
  .passthrough()

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

export class DevhelmApiError extends DevhelmError {
  readonly status: number
  readonly detail: string | undefined
  readonly body: unknown

  constructor(message: string, status: number, options?: {detail?: string; body?: unknown}) {
    super(message)
    this.name = 'DevhelmApiError'
    this.status = status
    this.detail = options?.detail
    this.body = options?.body
  }
}

export class DevhelmAuthError extends DevhelmApiError {
  constructor(message: string, status: number, options?: {detail?: string; body?: unknown}) {
    super(message, status, options)
    this.name = 'DevhelmAuthError'
  }
}

export class DevhelmNotFoundError extends DevhelmApiError {
  constructor(message: string, status: number, options?: {detail?: string; body?: unknown}) {
    super(message, status, options)
    this.name = 'DevhelmNotFoundError'
  }
}

export class DevhelmConflictError extends DevhelmApiError {
  constructor(message: string, status: number, options?: {detail?: string; body?: unknown}) {
    super(message, status, options)
    this.name = 'DevhelmConflictError'
  }
}

export class DevhelmRateLimitError extends DevhelmApiError {
  constructor(message: string, status: number, options?: {detail?: string; body?: unknown}) {
    super(message, status, options)
    this.name = 'DevhelmRateLimitError'
  }
}

export class DevhelmServerError extends DevhelmApiError {
  constructor(message: string, status: number, options?: {detail?: string; body?: unknown}) {
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

export function errorFromResponse(status: number, body: string): DevhelmApiError {
  let message = `HTTP ${status}`
  let detail: string | undefined
  let parsedBody: unknown = body || undefined

  try {
    const json: unknown = JSON.parse(body)
    const result = ErrorBodySchema.safeParse(json)
    if (result.success) {
      message = result.data.message ?? result.data.error ?? message
      detail = result.data.detail
      parsedBody = json
    } else if (body) {
      message = body
    }
  } catch {
    if (body) message = body
  }

  if (status === 401 || status === 403) return new DevhelmAuthError(message, status, {detail, body: parsedBody})
  if (status === 404) return new DevhelmNotFoundError(message, status, {detail, body: parsedBody})
  if (status === 409) return new DevhelmConflictError(message, status, {detail, body: parsedBody})
  if (status === 429) return new DevhelmRateLimitError(message, status, {detail, body: parsedBody})
  if (status >= 500) return new DevhelmServerError(message, status, {detail, body: parsedBody})
  return new DevhelmApiError(message, status, {detail, body: parsedBody})
}

// ────────────────────────────────────────────────────────────────────────
// Backwards-compat aliases. We have no shipping consumers yet so these are
// here purely so internal scripts/tests keep working until they're migrated
// off the legacy names; flip them to deprecation warnings once the rest of
// the surface is updated.
// ────────────────────────────────────────────────────────────────────────

export const AuthError = DevhelmAuthError
export type DevhelmErrorCode = 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'API'
