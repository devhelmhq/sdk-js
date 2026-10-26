import type {ApiClient} from './http.js'
import type {DevhelmClient} from './base-client.js'
import type {RunDto} from './types.js'
import {DEFAULT_WAIT_TIMEOUT_MS, isFinished, waitForRun as waitWith, type WaitOptions} from './wait.js'

export {DEFAULT_WAIT_TIMEOUT_MS, isFinished}

/**
 * Wait for a run to finish (SSE, then polling). Returns the finished run
 * whatever its outcome; throws only `WaitTimeoutError`. Never cancels the
 * run. Same as `devhelm.runs.wait(runId)`.
 */
export function waitForRun(client: DevhelmClient | ApiClient, runId: string, options: WaitOptions = {}): Promise<RunDto> {
  const api = 'runs' in client ? client.api : client
  return waitWith(api, runId, options)
}
