/**
 * Runtime import checks: a bare import must be a Node built-in (`node:` or a
 * listed built-in) or a package of the runtime (doc 42 §5.3, the server's
 * `BundleImports.runtimeProblems`).
 */
import {packageName} from './specifiers.js'

/**
 * What the bundler needs from a runtime profile. `RuntimeProfileDto` from
 * `GET /api/v1/synthetics/runtime-profiles/{id}` satisfies it.
 */
export interface RuntimePackages {
  id: string
  status?: string
  nodeVersion?: string
  playwrightVersion?: string
  eolAt?: string | null
  packages?: Record<string, string | null> | null
  nodeBuiltins?: string[] | null
  /**
   * Whether new checks use this runtime when none is pinned.
   * Absent on the bundled snapshot, which has no platform default.
   */
  platformDefault?: boolean
}

/** Whether a bare specifier is available on the runtime. */
export function runtimeHasImport(runtime: RuntimePackages, spec: string): boolean {
  if (spec.startsWith('node:')) return true
  const pkg = packageName(spec)
  if ((runtime.nodeBuiltins ?? []).includes(pkg)) return true
  return Object.prototype.hasOwnProperty.call(runtime.packages ?? {}, pkg)
}

/**
 * Pick a runtime from a catalog: the pinned id, or the platform default.
 * A catalog with no platform default, including the bundled snapshot, uses
 * the last `available` entry.
 */
export function selectRuntime(catalog: ReadonlyArray<RuntimePackages>, runtimeId?: string | null): RuntimePackages | undefined {
  if (runtimeId && runtimeId.trim()) return catalog.find((r) => r.id === runtimeId.trim())
  const platform = catalog.find((entry) => entry.platformDefault === true)
  if (platform) return platform
  let available: RuntimePackages | undefined
  for (const entry of catalog) if (entry.status === 'available') available = entry
  return available
}
