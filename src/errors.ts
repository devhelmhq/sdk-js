import type {ErrorResponse, RunDto} from './types.js'
import type {JsonObject, JsonValue} from './json.js'

/**
 * Error taxonomy (doc 42 §5.2, doc 32 D-1/D-2).
 *
 * Every error the SDK throws is a {@link DevhelmError}. The concrete class is
 * chosen by the `category` of the API's `ErrorResponse` (never by the HTTP
 * status), plus the client-side `transport` category:
 *
 *   validation            → {@link ValidationError}
 *   blocked               → {@link BlockedError}
 *   auth                  → {@link AuthError}
 *   permission            → {@link PermissionError}
 *   ownership             → {@link OwnershipError}
 *   plan                  → {@link PlanLimitError}
 *   quota                 → {@link QuotaError}
 *   rate_limit            → {@link RateLimitError}
 *   conflict              → {@link ConflictError}
 *   confirmation_required → {@link ConfirmationRequiredError}
 *   not_found             → {@link NotFoundError}
 *   gone                  → {@link GoneError}
 *   platform              → {@link PlatformError}
 *   transport             → {@link TransportError}
 *
 * `runs.wait()` adds {@link WaitTimeoutError}. Each error carries every
 * `ErrorResponse` field, and `exitCode` gives the frozen D-2 CLI exit code.
 */

export const ERROR_CATEGORIES = [
  'validation',
  'blocked',
  'auth',
  'permission',
  'ownership',
  'plan',
  'quota',
  'rate_limit',
  'conflict',
  'confirmation_required',
  'not_found',
  'gone',
  'platform',
  'transport',
] as const

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number]

/** One structured rejection, as in `ErrorResponse.errors[]`. */
export interface ErrorEntry {
  code: string
  field?: string | null
  message: string
}

/** Command and documentation that fix an error. */
export interface ErrorNext {
  command?: string | null
  docs?: string | null
}

/** Fields of an error, as carried by `ErrorResponse` (D-1). */
export interface DevhelmErrorInit {
  message: string
  category: ErrorCategory
  code: string
  status?: number | null
  retryable?: boolean
  requestId?: string | null
  timestamp?: number | null
  errors?: ErrorEntry[] | null
  retryAfterSeconds?: number | null
  resource?: string | null
  used?: number | null
  limit?: number | null
  resetsAt?: string | null
  plan?: string | null
  upgradeUrl?: string | null
  canRaise?: string | null
  owner?: string | null
  required?: string | null
  have?: number | null
  reason?: string | null
  next?: ErrorNext | null
  details?: JsonObject | null
  expiredAt?: string | null
  policy?: string | null
  /** The parsed `ErrorResponse`, when the body matched the contract. */
  response?: ErrorResponse | null
  /** The raw body (parsed JSON or text), for responses that did not match. */
  rawBody?: JsonValue | null
  /** Human-readable detail from a legacy (pre-envelope) body. */
  detail?: string | null
  cause?: Error
}

/** Options accepted by the category constructors: every field except `message` and `category`. */
export type ErrorFields = Partial<Omit<DevhelmErrorInit, 'message' | 'category'>>

/** Frozen CLI exit code per category (doc 32 D-2). */
export function exitCodeForCategory(category: ErrorCategory): number {
  switch (category) {
    case 'validation':
    case 'blocked':
    case 'not_found':
      return 4
    case 'auth':
    case 'permission':
    case 'ownership':
      return 17
    case 'plan':
    case 'quota':
      return 16
    case 'confirmation_required':
      return 15
    case 'conflict':
      return 18
    case 'gone':
      return 20
    case 'rate_limit':
    case 'platform':
      return 11
    case 'transport':
      return 12
  }
}

export class DevhelmError extends Error {
  readonly category: ErrorCategory
  /** Stable machine code, e.g. `NOT_FOUND`, `SYNTHETICS_USAGE_CAPPED`, `NO_TOKEN`. */
  readonly code: string
  /** HTTP status; null for client-side errors (validation before the call, transport). */
  readonly status: number | null
  readonly retryable: boolean
  readonly requestId: string | null
  readonly timestamp: number | null
  readonly errors: ErrorEntry[]
  readonly retryAfterSeconds: number | null
  readonly resource: string | null
  readonly used: number | null
  readonly limit: number | null
  readonly resetsAt: string | null
  readonly plan: string | null
  readonly upgradeUrl: string | null
  readonly canRaise: string | null
  readonly owner: string | null
  readonly required: string | null
  readonly have: number | null
  readonly reason: string | null
  readonly next: ErrorNext | null
  readonly details: JsonObject
  readonly expiredAt: string | null
  readonly policy: string | null
  /** The parsed `ErrorResponse`; null for client-side errors and non-conforming bodies. */
  readonly response: ErrorResponse | null
  /** Raw response body (parsed JSON or text) when there was one. */
  readonly rawBody: JsonValue | null
  /** @deprecated since 1.12, removed 2027-01-31. Legacy body detail; use `message`. */
  readonly detail: string | undefined

  constructor(message: string, codeOrInit?: string | DevhelmErrorInit) {
    super(message)
    this.name = 'DevhelmError'
    const init: DevhelmErrorInit =
      typeof codeOrInit === 'object'
        ? codeOrInit
        : {message, category: 'platform', code: codeOrInit ?? 'ERROR'}
    this.category = init.category
    this.code = init.code
    this.status = init.status ?? null
    this.retryable = init.retryable ?? false
    this.requestId = init.requestId ?? null
    this.timestamp = init.timestamp ?? null
    this.errors = init.errors ?? []
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
    this.resource = init.resource ?? null
    this.used = init.used ?? null
    this.limit = init.limit ?? null
    this.resetsAt = init.resetsAt ?? null
    this.plan = init.plan ?? null
    this.upgradeUrl = init.upgradeUrl ?? null
    this.canRaise = init.canRaise ?? null
    this.owner = init.owner ?? null
    this.required = init.required ?? null
    this.have = init.have ?? null
    this.reason = init.reason ?? null
    this.next = init.next ?? null
    this.details = init.details ?? {}
    this.expiredAt = init.expiredAt ?? null
    this.policy = init.policy ?? null
    this.response = init.response ?? null
    this.rawBody = init.rawBody ?? null
    this.detail = init.detail ?? undefined
    if (init.cause !== undefined) {
      Object.defineProperty(this, 'cause', {value: init.cause, enumerable: false, writable: true, configurable: true})
    }
  }

  /** Frozen CLI exit code (doc 32 D-2) for this error. */
  get exitCode(): number {
    return exitCodeForCategory(this.category)
  }

  /** @deprecated since 1.12, removed 2027-01-31. Use `response`. */
  get body(): ErrorResponse | undefined {
    return this.response ?? undefined
  }

  /** @deprecated since 1.12, removed 2027-01-31. Use `retryAfterSeconds`. */
  get retryAfter(): number | undefined {
    return this.retryAfterSeconds ?? undefined
  }

  /** Plain JSON form: `category` plus every `ErrorResponse` field that is set. */
  toJSON(): JsonObject {
    const out: JsonObject = {
      name: this.name,
      category: this.category,
      code: this.code,
      status: this.status,
      retryable: this.retryable,
      message: this.message,
      requestId: this.requestId,
    }
    if (this.errors.length > 0) {
      out['errors'] = this.errors.map((e) => ({code: e.code, field: e.field ?? null, message: e.message}))
    }
    const optional: Array<[string, JsonValue]> = [
      ['retryAfterSeconds', this.retryAfterSeconds],
      ['resource', this.resource],
      ['used', this.used],
      ['limit', this.limit],
      ['resetsAt', this.resetsAt],
      ['plan', this.plan],
      ['upgradeUrl', this.upgradeUrl],
      ['canRaise', this.canRaise],
      ['owner', this.owner],
      ['required', this.required],
      ['have', this.have],
      ['reason', this.reason],
      ['expiredAt', this.expiredAt],
      ['policy', this.policy],
    ]
    for (const [key, value] of optional) {
      if (value !== null) out[key] = value
    }
    if (this.next) out['next'] = {command: this.next.command ?? null, docs: this.next.docs ?? null}
    if (Object.keys(this.details).length > 0) out['details'] = this.details
    return out
  }
}

function withCategory(category: ErrorCategory, message: string, fields: ErrorFields | undefined, defaultCode: string): DevhelmErrorInit {
  return {...fields, message, category, code: fields?.code ?? defaultCode}
}

/** The parts of a `ZodError` the SDK reads. */
export interface ZodErrorLike {
  issues: ReadonlyArray<{path: ReadonlyArray<PropertyKey>; message: string; code: string; keys?: ReadonlyArray<string>}>
}

export interface ValidationIssue {
  readonly path: ReadonlyArray<string | number>
  readonly message: string
  readonly code: string
}

/**
 * The request is invalid: rejected by the API (400/426) or caught before the
 * call (strict request schemas, `USE_PROBE`, `NO_TOKEN`, bundler refusals,
 * `BUNDLE_DIGEST_MISMATCH`).
 */
export class ValidationError extends DevhelmError {
  /** Local schema issues when the SDK rejected the value before sending it. */
  readonly issues: ReadonlyArray<ValidationIssue>

  /**
   * `fields` carries the envelope fields. Passing an issue array as the second
   * argument is the 1.11 `DevhelmValidationError(message, issues)` form.
   */
  constructor(message: string, fields?: ErrorFields | ReadonlyArray<ValidationIssue>, issues?: ReadonlyArray<ValidationIssue>) {
    const legacyIssues = isIssueList(fields) ? fields : undefined
    super(message, withCategory('validation', message, isIssueList(fields) ? undefined : fields, 'VALIDATION'))
    this.name = 'ValidationError'
    this.issues = legacyIssues ?? issues ?? []
  }

  static fromZodError(error: ZodErrorLike, prefix: string): ValidationError {
    const issues: ValidationIssue[] = error.issues.map((i) => ({
      path: i.path.map((p) => (typeof p === 'symbol' ? String(p) : p)),
      message: i.message,
      code: i.code,
    }))
    const summary = issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ')
    const errors: ErrorEntry[] = []
    for (const issue of error.issues) {
      const base = issue.path.map((p) => (typeof p === 'symbol' ? String(p) : p)).join('.')
      if (issue.code === 'unrecognized_keys') {
        for (const key of issue.keys ?? []) {
          errors.push({code: 'FIELD_UNKNOWN', field: base ? `${base}.${key}` : key, message: `Unknown field ${key}`})
        }
      } else {
        errors.push({code: 'FIELD_INVALID', field: base || null, message: issue.message})
      }
    }
    return new ValidationError(`${prefix}: ${summary}`, {code: 'VALIDATION', errors}, issues)
  }
}

function isIssueList(value: ErrorFields | ReadonlyArray<ValidationIssue> | undefined): value is ReadonlyArray<ValidationIssue> {
  return Array.isArray(value)
}

/** A precondition blocks the call, e.g. `RUN_KEYS_MISSING` (exit 4). */
export class BlockedError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('blocked', message, fields, 'BLOCKED'))
    this.name = 'BlockedError'
  }
}

/** The credential is invalid, expired or revoked (401). */
export class AuthError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('auth', message, fields, 'UNAUTHORIZED'))
    this.name = 'AuthError'
  }
}

/** The key lacks a scope or the user a role (403). `reason` is `scope` or `role`. */
export class PermissionError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('permission', message, fields, 'FORBIDDEN'))
    this.name = 'PermissionError'
  }
}

/** Another tool owns the resource, e.g. `MONITOR_OWNED_BY_OTHER`. `owner` names it. */
export class OwnershipError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('ownership', message, fields, 'MONITOR_OWNED_BY_OTHER'))
    this.name = 'OwnershipError'
  }
}

/** The plan does not include this, e.g. `MONITOR_FREQUENCY_BELOW_PLAN_MIN`, `MONITOR_LIMIT_REACHED`. */
export class PlanLimitError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('plan', message, fields, 'PLAN_LIMIT'))
    this.name = 'PlanLimitError'
  }
}

/** A usage meter is exhausted, e.g. `SYNTHETICS_USAGE_CAPPED`, `TESTING_QUOTA_EXHAUSTED`. */
export class QuotaError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('quota', message, fields, 'QUOTA_EXHAUSTED'))
    this.name = 'QuotaError'
  }
}

/** Rate limited after the SDK's bounded retries (429). */
export class RateLimitError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('rate_limit', message, fields, 'RATE_LIMITED'))
    this.name = 'RateLimitError'
  }
}

/** State conflict, e.g. `LIVE_REVISION_CHANGED`, `REVISION_UNTESTED`, `DEPLOY_LOCKED`, `DRAFT_LIMIT`. */
export class ConflictError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('conflict', message, fields, 'CONFLICT'))
    this.name = 'ConflictError'
  }
}

/** The write needs an explicit confirmation (D-4). */
export class ConfirmationRequiredError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('confirmation_required', message, fields, 'CONFIRMATION_REQUIRED'))
    this.name = 'ConfirmationRequiredError'
  }
}

/** Unknown monitor, run, revision, environment, … (404). */
export class NotFoundError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('not_found', message, fields, 'NOT_FOUND'))
    this.name = 'NotFoundError'
  }
}

/** Evidence or run expired, e.g. `EVIDENCE_EXPIRED`, `RUN_EXPIRED` (410). */
export class GoneError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('gone', message, fields, 'GONE'))
    this.name = 'GoneError'
  }
}

/** The platform failed (5xx, unusable response, `RUNTIME_UNAVAILABLE`). */
export class PlatformError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('platform', message, fields, 'PLATFORM_ERROR'))
    this.name = 'PlatformError'
  }
}

/** The request never reached the API (DNS, connection refused, TLS, abort). */
export class TransportError extends DevhelmError {
  constructor(message: string, fields?: ErrorFields) {
    super(message, withCategory('transport', message, {retryable: true, ...fields}, 'TRANSPORT'))
    this.name = 'TransportError'
  }
}

/**
 * `runs.wait()` reached its deadline before the run finished. The run keeps
 * going (the SDK never cancels it); `phase` is the last phase seen.
 * CLI exit 19 (`runsContinue: true`).
 */
export class WaitTimeoutError extends DevhelmError {
  readonly runId: string
  readonly phase: string
  /** The run as last fetched, when the SDK got one. */
  readonly run: RunDto | null

  constructor(runId: string, phase: string, timeoutMs: number, run: RunDto | null = null) {
    const message = `Run ${runId} did not finish within ${Math.round(timeoutMs / 1000)} s (last phase: ${phase}); it keeps running`
    super(message, {
      message,
      category: 'platform',
      code: 'WAIT_TIMEOUT',
      retryable: true,
      details: {runId, phase, timeoutMs, runsContinue: true},
    })
    this.name = 'WaitTimeoutError'
    this.runId = runId
    this.phase = phase
    this.run = run
  }

  override get exitCode(): number {
    return 19
  }
}

// ── Deprecated names (removed 2027-01-31) ─────────────────────────────
//
// 1.11 and earlier classified errors by HTTP status. These names keep
// working for `instanceof`: each one matches the errors it used to match.

/** @deprecated since 1.12, removed 2027-01-31. Use the category classes. */
export interface DevhelmApiErrorOptions {
  detail?: string
  code?: string
  requestId?: string
  body?: ErrorResponse
  rawBody?: JsonValue
  retryAfter?: number
}

function legacyInit(message: string, status: number, options: DevhelmApiErrorOptions | undefined): DevhelmErrorInit {
  const body = options?.body
  return {
    ...(body ? envelopeFields(body) : {}),
    message,
    category: categoryOf(body?.category, status),
    code: options?.code ?? body?.code ?? defaultCodeForStatus(status),
    status,
    requestId: options?.requestId ?? body?.requestId ?? null,
    response: body ?? null,
    rawBody: options?.rawBody ?? null,
    retryAfterSeconds: options?.retryAfter ?? body?.retryAfterSeconds ?? null,
    detail: options?.detail ?? null,
  }
}

/** @deprecated since 1.12, removed 2027-01-31. Matches every error that carries an HTTP status. */
export class DevhelmApiError extends DevhelmError {
  static [Symbol.hasInstance](value: object): boolean {
    return value instanceof DevhelmError && value.status !== null
  }

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, legacyInit(message, status, options))
    this.name = 'DevhelmApiError'
  }
}

/** @deprecated since 1.12, removed 2027-01-31. Use `AuthError` / `PermissionError`. Matches 401 and 403. */
export class DevhelmAuthError extends DevhelmApiError {
  static override [Symbol.hasInstance](value: object): boolean {
    return value instanceof DevhelmError && (value.status === 401 || value.status === 403)
  }

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmAuthError'
  }
}

/** @deprecated since 1.12, removed 2027-01-31. Use `NotFoundError`. Matches 404. */
export class DevhelmNotFoundError extends DevhelmApiError {
  static override [Symbol.hasInstance](value: object): boolean {
    return value instanceof DevhelmError && value.status === 404
  }

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmNotFoundError'
  }
}

/** @deprecated since 1.12, removed 2027-01-31. Use `ConflictError` (and `OwnershipError`, `BlockedError`). Matches 409. */
export class DevhelmConflictError extends DevhelmApiError {
  static override [Symbol.hasInstance](value: object): boolean {
    return value instanceof DevhelmError && value.status === 409
  }

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmConflictError'
  }
}

/** @deprecated since 1.12, removed 2027-01-31. Use `RateLimitError`. Matches 429. */
export class DevhelmRateLimitError extends DevhelmApiError {
  static override [Symbol.hasInstance](value: object): boolean {
    return value instanceof DevhelmError && value.status === 429
  }

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmRateLimitError'
  }
}

/** @deprecated since 1.12, removed 2027-01-31. Use `PlatformError`. Matches 5xx. */
export class DevhelmServerError extends DevhelmApiError {
  static override [Symbol.hasInstance](value: object): boolean {
    return value instanceof DevhelmError && value.status !== null && value.status >= 500
  }

  constructor(message: string, status: number, options?: DevhelmApiErrorOptions) {
    super(message, status, options)
    this.name = 'DevhelmServerError'
  }
}

/** @deprecated since 1.12, removed 2027-01-31. Use `ValidationError`. */
export const DevhelmValidationError = ValidationError
/** @deprecated since 1.12, removed 2027-01-31. Use `ValidationError`. */
export type DevhelmValidationError = ValidationError

/** @deprecated since 1.12, removed 2027-01-31. Use `TransportError`. */
export const DevhelmTransportError = TransportError
/** @deprecated since 1.12, removed 2027-01-31. Use `TransportError`. */
export type DevhelmTransportError = TransportError

/**
 * @deprecated since 1.12, removed 2027-01-31. No longer thrown:
 * `monitors.test()` returns the queued `Run` for browser and multi-step API
 * monitors.
 */
export class DevhelmMonitorTestQueuedError extends ValidationError {
  readonly run: RunDto

  constructor(run: RunDto) {
    super(`monitors.test() queued validation run ${run.id}`, {code: 'TEST_QUEUED'})
    this.name = 'DevhelmMonitorTestQueuedError'
    this.run = run
  }
}

// ── Mapping a response to an error ────────────────────────────────────

/** Categories the API sends; `transport` is client-side only. */
const SERVER_CATEGORIES: ReadonlyArray<ErrorCategory> = ERROR_CATEGORIES.filter((c) => c !== 'transport')

function isServerCategory(value: string): value is ErrorCategory {
  return (SERVER_CATEGORIES as ReadonlyArray<string>).includes(value)
}

export function categoryForStatus(status: number): ErrorCategory {
  if (status === 401) return 'auth'
  if (status === 402) return 'plan'
  if (status === 403) return 'permission'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 410) return 'gone'
  if (status === 429) return 'rate_limit'
  if (status >= 500) return 'platform'
  if (status >= 400) return 'validation'
  return 'platform'
}

/** Category from the body; an unknown value (from a newer API) falls back to the status. */
export function categoryOf(value: string | null | undefined, status: number): ErrorCategory {
  if (value && isServerCategory(value)) return value
  return categoryForStatus(status)
}

export function envelopeFields(body: ErrorResponse): ErrorFields {
  const details: JsonObject = {}
  if (body.details) {
    for (const [k, v] of Object.entries(body.details)) details[k] = v ?? null
  }
  const errors: ErrorEntry[] = []
  for (const e of body.errors ?? []) {
    if (e) errors.push({code: e.code, field: e.field ?? null, message: e.message})
  }
  return {
    retryable: body.retryable,
    requestId: body.requestId ?? null,
    timestamp: body.timestamp,
    errors,
    retryAfterSeconds: body.retryAfterSeconds ?? null,
    resource: body.resource ?? null,
    used: body.used ?? null,
    limit: body.limit ?? null,
    resetsAt: body.resetsAt ?? null,
    plan: body.plan ?? null,
    upgradeUrl: body.upgradeUrl ?? null,
    canRaise: body.canRaise ?? null,
    owner: body.owner ?? null,
    required: body.required ?? null,
    have: body.have ?? null,
    reason: body.reason ?? null,
    next: body.next ? {command: body.next.command ?? null, docs: body.next.docs ?? null} : null,
    details,
    expiredAt: body.expiredAt ?? null,
    policy: body.policy ?? null,
  }
}

/** Construct the error class for a category. */
export function errorForCategory(init: DevhelmErrorInit): DevhelmError {
  const {message, category: _category, ...fields} = init
  switch (init.category) {
    case 'validation':
      return new ValidationError(message, fields)
    case 'blocked':
      return new BlockedError(message, fields)
    case 'auth':
      return new AuthError(message, fields)
    case 'permission':
      return new PermissionError(message, fields)
    case 'ownership':
      return new OwnershipError(message, fields)
    case 'plan':
      return new PlanLimitError(message, fields)
    case 'quota':
      return new QuotaError(message, fields)
    case 'rate_limit':
      return new RateLimitError(message, fields)
    case 'conflict':
      return new ConflictError(message, fields)
    case 'confirmation_required':
      return new ConfirmationRequiredError(message, fields)
    case 'not_found':
      return new NotFoundError(message, fields)
    case 'gone':
      return new GoneError(message, fields)
    case 'platform':
      return new PlatformError(message, fields)
    case 'transport':
      return new TransportError(message, fields)
  }
}


export function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST'
    case 401:
      return 'UNAUTHORIZED'
    case 402:
      return 'PAYMENT_REQUIRED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 410:
      return 'GONE'
    case 429:
      return 'RATE_LIMITED'
    default:
      return status >= 500 ? 'PLATFORM_ERROR' : 'API_ERROR'
  }
}
