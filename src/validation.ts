import {z, type ZodType} from 'zod'
import {ValidationError} from './errors.js'
import type {Wire} from './json.js'

/**
 * Validate a request body against its Zod schema before sending to the API.
 *
 * Catches invalid inputs (missing required fields, bad enums, constraint
 * violations) client-side as a typed `DevhelmValidationError` instead of
 * letting the API return a generic 400/422 (which would surface as a
 * `DevhelmApiError` and obscure that the bug is in the caller).
 */
export function validateRequest<T>(schema: ZodType<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const ctx = context ? ` (${context})` : ''
  throw ValidationError.fromZodError(result.error, `Request validation failed${ctx}`)
}

/**
 * Parse a value through a Zod schema, throwing DevhelmValidationError on failure.
 *
 * Used for runtime validation of API responses — catches shape mismatches
 * before they propagate as silent bugs.
 */
/**
 * The single decode boundary. A value decoded from JSON is JSON, so the
 * `unknown` slots a tolerant schema leaves are JsonValue (see `Wire<T>`).
 * Sound because the generated schemas have no transforms, defaults or
 * coercions: their output type is their input type.
 */
export function decoded<T>(value: T): Wire<T> {
  return value as Wire<T>
}

export function parse<T>(schema: ZodType<T>, data: unknown, context?: string): Wire<T> {
  const result = schema.safeParse(data)
  if (result.success) return decoded(result.data)
  const ctx = context ? ` (${context})` : ''
  throw ValidationError.fromZodError(result.error, `Response validation failed${ctx}`)
}

/**
 * Parse and unwrap a SingleValueResponse envelope: { data: T } → T
 *
 * The envelope itself is `.strict()` (P1) so that an extra top-level field
 * like `{data: ..., wat: 1}` raises locally rather than being silently
 * discarded.
 */
/** Unwrap `{ event }` or `{ message }`. Those bodies are not `{ data }`. */
export function parseEnvelopeKey<T>(key: 'event' | 'message', schema: ZodType<T>, data: unknown, context?: string): Wire<T> {
  const envelope = z.object({[key]: schema}).strict()
  const parsed = envelope.safeParse(data)
  if (!parsed.success) {
    const ctx = context ? ` (${context})` : ''
    throw ValidationError.fromZodError(parsed.error, `Response validation failed${ctx}`)
  }
  return decoded((parsed.data as Record<'event' | 'message', T>)[key])
}

export function parseSingle<T>(schema: ZodType<T>, data: unknown, context?: string): Wire<T> {
  const envelope = z.object({data: schema}).strict()
  const parsed = envelope.safeParse(data)
  if (!parsed.success) {
    const ctx = context ? ` (${context})` : ''
    throw ValidationError.fromZodError(parsed.error, `Response validation failed${ctx}`)
  }
  return decoded(parsed.data.data)
}

/**
 * Parse a paginated (TableValueResult) response.
 *
 * The envelope is sealed (AGENTS.md "SDK Safety"): `data`, `hasNext`,
 * `hasPrev`, `totalElements`, `totalPages`. `nextCursor` is tolerated because
 * 1.6 shipped accepting it. Items decode tolerantly.
 */
export function parsePage<T>(schema: ZodType<T>, data: unknown, context?: string) {
  const pageSchema = z
    .object({
      data: z.array(schema),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
      totalElements: z.number().int().nullable().optional(),
      totalPages: z.number().int().nullable().optional(),
      nextCursor: z.string().nullable().optional(),
    })
    .strict()
  return parse(pageSchema, data, context)
}

/**
 * Parse a cursor-paginated response.
 */
export function parseCursorPage<T>(schema: ZodType<T>, data: unknown, context?: string) {
  const cursorSchema = z
    .object({
      data: z.array(schema),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    })
    .strict()
  return parse(cursorSchema, data, context)
}
