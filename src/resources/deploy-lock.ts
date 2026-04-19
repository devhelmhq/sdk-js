import type {ApiClient} from '../http.js'
import type {DeployLockDto, AcquireDeployLockRequest} from '../types.js'
import {DeployLockDtoSchema} from '../schemas.js'
import {apiGet, fetchSingle} from '../http.js'
import {parse} from '../validation.js'
import {z} from 'zod'

export class DeployLock {
  constructor(private readonly client: ApiClient) {}

  /** Acquire an exclusive deploy lock for the current workspace. Throws CONFLICT (409) if already held. */
  async acquire(body: AcquireDeployLockRequest): Promise<DeployLockDto> {
    return fetchSingle(this.client, 'POST', '/api/v1/deploy/lock', DeployLockDtoSchema, body)
  }

  /** Get the current deploy lock status (returns null if no lock is held). */
  async current(): Promise<DeployLockDto | null> {
    const raw = await apiGet(this.client, '/api/v1/deploy/lock')
    const envelope = z.object({data: DeployLockDtoSchema.nullable()}).passthrough()
    const parsed = parse(envelope, raw, '/api/v1/deploy/lock')
    return parsed.data
  }

  /** Release a deploy lock by its ID. */
  async release(lockId: string): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/deploy/lock/${lockId}`, DeployLockDtoSchema)
  }

  /** Force-release any deploy lock on the current workspace. */
  async forceRelease(): Promise<void> {
    await fetchSingle(this.client, 'DELETE', '/api/v1/deploy/lock/force', DeployLockDtoSchema)
  }
}
