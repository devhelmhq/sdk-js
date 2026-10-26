/**
 * `@devhelm/sdk/web` — the browser-safe DevHelm client. Same surface as
 * `@devhelm/sdk`, without the filesystem: `code` takes only
 * `{entrypoint, files}`, the token must be passed explicitly, and no env vars
 * or CLI context are read.
 */
import type {DevhelmConfig} from './types.js'
import {DevhelmClient} from './base-client.js'
import {browserPlatform} from './http.js'
import {ValidationError} from './errors.js'
import {checkInMemory, requireBundle} from './bundler/core.js'
import {computeDigestWith, webSha256, type BundleFiles} from './bundler/digest.js'
import type {CodeResolver} from './resources/bundles.js'

const webCodeResolver: CodeResolver = {
  async resolve(code, options) {
    if (typeof code === 'string' || !('files' in code)) {
      throw new ValidationError('@devhelm/sdk/web takes code as {entrypoint, files}; paths need the Node entry (@devhelm/sdk)', {
        code: 'CODE_FORM_UNSUPPORTED',
        errors: [{code: 'CODE_FORM_UNSUPPORTED', field: 'code', message: 'Pass {entrypoint, files}'}],
      })
    }
    return requireBundle(await checkInMemory(code, options, webSha256))
  },
}

/** DevHelm API client for browsers and other runtimes without a filesystem. */
export class Devhelm extends DevhelmClient {
  constructor(config: DevhelmConfig & {token: string}) {
    super(config, browserPlatform, webCodeResolver)
  }
}

/** D-12 digest of a file map (Web Crypto). */
export function computeDigest(files: BundleFiles): Promise<string> {
  return computeDigestWith(files, webSha256)
}

export {scanSecrets} from './bundler/secrets.js'
export {toCreateBundleRequest, requireBundle} from './bundler/core.js'
export * from './public.js'
