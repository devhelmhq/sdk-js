/**
 * Deprecation notices: once per process per API, with the removal date.
 * Node routes them through `process.emitWarning` (so `--no-deprecation`
 * silences them); browsers get one `console.warn`.
 */

export const DEPRECATION_REMOVAL_DATE = '2027-01-31'

const warned = new Set<string>()

export function deprecated(name: string, replacement: string): void {
  if (warned.has(name)) return
  warned.add(name)
  const message = `${name} is deprecated and will be removed on ${DEPRECATION_REMOVAL_DATE}; use ${replacement}`
  const proc = (globalThis as {process?: {emitWarning?: (message: string, options: {type: string; code: string}) => void}}).process
  if (proc && typeof proc.emitWarning === 'function') {
    proc.emitWarning(message, {type: 'DeprecationWarning', code: 'DEVHELM_SDK_DEPRECATED'})
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[@devhelm/sdk] ${message}`)
  }
}

/** Test hook: forget which notices were shown. */
export function resetDeprecationWarnings(): void {
  warned.clear()
}
