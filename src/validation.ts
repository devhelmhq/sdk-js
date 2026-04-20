import {z, type ZodType} from 'zod'
import {DevhelmError} from './errors.js'

/**
 * Validate a request body against its Zod schema before sending to the API.
 *
 * Catches invalid inputs (missing required fields, bad enums, constraint
 * violations) client-side with a clear error instead of letting the API
 * return a generic 400/422.
 */
export function validateRequest<T>(schema: ZodType<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const issues = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ')
  const ctx = context ? ` (${context})` : ''
  throw new DevhelmError(
    'VALIDATION',
    `Request validation failed${ctx}: ${issues}`,
    0,
    JSON.stringify(result.error.issues),
  )
}

/**
 * Parse a value through a Zod schema, throwing DevhelmError on failure.
 *
 * Used for runtime validation of API responses — catches shape mismatches
 * before they propagate as silent bugs.
 */
export function parse<T>(schema: ZodType<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const issues = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ')
  const ctx = context ? ` (${context})` : ''
  throw new DevhelmError(
    'VALIDATION',
    `Response validation failed${ctx}: ${issues}`,
    0,
    JSON.stringify(result.error.issues),
  )
}

/**
 * Parse and unwrap a SingleValueResponse envelope: { data: T } → T
 */
export function parseSingle<T>(schema: ZodType<T>, data: unknown, context?: string): T {
  const envelope = z.object({data: schema}).passthrough()
  const parsed = parse(envelope, data, context)
  return parsed.data
}

/**
 * Parse a paginated (TableValueResult) response.
 */
export function parsePage<T>(schema: ZodType<T>, data: unknown, context?: string) {
  const pageSchema = z.object({
    data: z.array(schema),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    totalElements: z.number().int().nullable().optional(),
    totalPages: z.number().int().nullable().optional(),
  }).passthrough()
  return parse(pageSchema, data, context)
}

/**
 * Parse a cursor-paginated response.
 */
export function parseCursorPage<T>(schema: ZodType<T>, data: unknown, context?: string) {
  const cursorSchema = z.object({
    data: z.array(schema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }).passthrough()
  return parse(cursorSchema, data, context)
}
