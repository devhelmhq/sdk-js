import type {ApiClient} from '../http.js'
import type {DeployLockDto, AcquireDeployLockRequest} from '../types.js'
import {DeployLockDtoSchema, AcquireDeployLockRequestSchema} from '../schemas.js'
import {apiGet, fetchSingle, fetchVoid} from '../http.js'
import {parse, validateRequest} from '../validation.js'
import {z} from 'zod'

export class DeployLock {
  constructor(private readonly client: ApiClient) {}

  /** Acquire an exclusive deploy lock for the current workspace. Throws CONFLICT (409) if already held. */
  async acquire(body: AcquireDeployLockRequest): Promise<DeployLockDto> {
    validateRequest(AcquireDeployLockRequestSchema, body, 'deployLock.acquire')
    return fetchSingle(this.client, 'POST', '/api/v1/deploy/lock', DeployLockDtoSchema, body)
  }

  /**
   * Get the current deploy lock status (returns null if no lock is held).
   *
   * The API returns `{ data: DeployLockDto | null }` — `data` may be null
   * when no lock is held (the controller returns `Optional.orElse(null)`),
   * so this is the one envelope in the SDK whose `data` field is nullable.
   * The envelope itself is `.strict()` (P1): unknown top-level fields fail
   * loud rather than being silently dropped.
   */
  async current(): Promise<DeployLockDto | null> {
    const raw = await apiGet(this.client, '/api/v1/deploy/lock')
    const envelope = z.object({data: DeployLockDtoSchema.nullable()}).strict()
    const parsed = parse(envelope, raw, '/api/v1/deploy/lock')
    return parsed.data
  }

  /** Release a deploy lock by its ID. */
  async release(lockId: string): Promise<void> {
    return fetchVoid(this.client, `/api/v1/deploy/lock/${lockId}`)
  }

  /** Force-release any deploy lock on the current workspace. */
  async forceRelease(): Promise<void> {
    return fetchVoid(this.client, '/api/v1/deploy/lock/force')
  }
}
