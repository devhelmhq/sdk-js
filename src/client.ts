import type {DevhelmConfig} from './types.js'
import {DevhelmClient} from './base-client.js'
import {nodeCodeResolver, nodePlatform} from './node/platform.js'

/**
 * DevHelm API client for Node.js.
 *
 * The token comes from `{token}`, else `DEVHELM_API_TOKEN`, else the current
 * `devhelm auth login` context. `code` inputs are read from disk and bundled
 * (`@devhelm/sdk/bundler`).
 *
 * @example
 * ```ts
 * import {Devhelm} from '@devhelm/sdk'
 *
 * const devhelm = new Devhelm({token: process.env.DEVHELM_API_TOKEN})
 *
 * const run = await devhelm.monitors.testAdhoc(
 *   {type: 'BROWSER', environment: 'staging', code: './checkout.spec.ts'},
 *   {wait: true},
 * )
 * const m = await devhelm.monitors.create({
 *   name: 'Checkout', type: 'BROWSER', environment: 'production',
 *   code: './checkout.spec.ts', frequencySeconds: 600, regions: ['us-east'],
 * })
 * ```
 */
export class Devhelm extends DevhelmClient {
  constructor(config: DevhelmConfig = {}) {
    super(config, nodePlatform, nodeCodeResolver)
  }
}
