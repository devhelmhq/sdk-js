import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import type {Platform, StoredContext} from '../http.js'
import {nodeSha256, checkBundle} from '../bundler/index.js'
import {checkInMemory, requireBundle} from '../bundler/core.js'
import type {CodeResolver} from '../resources/bundles.js'

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

/**
 * The current `devhelm auth login` context from `~/.devhelm/contexts.json`
 * (or `$DEVHELM_CONFIG_DIR/contexts.json`). Read-only and tolerant: a
 * missing or malformed file means no context.
 */
export function readCliContext(env: NodeJS.ProcessEnv = process.env): StoredContext | undefined {
  const dir = env['DEVHELM_CONFIG_DIR'] || join(homedir(), '.devhelm')
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(dir, 'contexts.json'), 'utf8'))
  } catch {
    return undefined
  }
  if (typeof raw !== 'object' || raw === null) return undefined
  const file = raw as {current?: unknown; contexts?: unknown}
  const current = str(file.current)
  if (!current || typeof file.contexts !== 'object' || file.contexts === null) return undefined
  const ctx = (file.contexts as Record<string, unknown>)[current]
  if (typeof ctx !== 'object' || ctx === null) return undefined
  const c = ctx as Record<string, unknown>
  return {name: current, apiUrl: str(c['apiUrl']), token: str(c['token']), orgId: str(c['orgId']), workspaceId: str(c['workspaceId'])}
}

export const nodePlatform: Platform = {
  env: (name) => process.env[name],
  readContext: () => readCliContext(),
}

/** Reads `code` from disk (paths, `{entrypoint, include}`) or memory (`{entrypoint, files}`). */
export const nodeCodeResolver: CodeResolver = {
  async resolve(code, options) {
    if (typeof code !== 'string' && 'files' in code) return requireBundle(await checkInMemory(code, options, nodeSha256))
    return requireBundle(await checkBundle(code, options))
  },
}
