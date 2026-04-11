export type DevhelmErrorCode = 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'API'

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
    const parsed = JSON.parse(body) as Record<string, unknown>
    message = String(parsed['message'] ?? parsed['error'] ?? message)
    detail = parsed['detail'] ? String(parsed['detail']) : undefined
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
