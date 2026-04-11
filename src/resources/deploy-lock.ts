import type {ApiClient} from '../http.js'
import type {DeployLockDto, AcquireDeployLockRequest} from '../types.js'
import {apiGet, apiPost, apiDelete, unwrapSingle} from '../http.js'

export class DeployLock {
  constructor(private readonly client: ApiClient) {}

  /** Acquire an exclusive deploy lock for the current workspace. Throws CONFLICT (409) if already held. */
  async acquire(body: AcquireDeployLockRequest): Promise<DeployLockDto> {
    const resp = await apiPost<{data?: DeployLockDto}>(this.client, '/api/v1/deploy/lock', body)
    return unwrapSingle(resp)
  }

  /** Get the current deploy lock status (returns null if no lock is held). */
  async current(): Promise<DeployLockDto | null> {
    const resp = await apiGet<{data?: DeployLockDto | null}>(this.client, '/api/v1/deploy/lock')
    return resp.data ?? null
  }

  /** Release a deploy lock by its ID. */
  async release(lockId: string): Promise<void> {
    await apiDelete(this.client, `/api/v1/deploy/lock/${lockId}`)
  }

  /** Force-release any deploy lock on the current workspace. */
  async forceRelease(): Promise<void> {
    await apiDelete(this.client, '/api/v1/deploy/lock/force')
  }
}
