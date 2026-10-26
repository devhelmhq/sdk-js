import type {ApiClient} from '../http.js'
import {fetchAllPages, fetchSingle} from '../http.js'
import type {RuntimeProfileDto} from '../types.js'
import {RuntimeProfileDtoSchema} from '../schemas.js'

/** Runtime profiles code checks run on (read-only; pin one with `config.runtimeId`). */
export class Runtimes {
  constructor(private readonly client: ApiClient) {}

  /** `GET /synthetics/runtime-profiles`: packages, versions and lifecycle dates. */
  async list(): Promise<RuntimeProfileDto[]> {
    return fetchAllPages(this.client, '/api/v1/synthetics/runtime-profiles', RuntimeProfileDtoSchema)
  }

  /** `GET /synthetics/runtime-profiles/{id}`. */
  async get(id: string): Promise<RuntimeProfileDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/synthetics/runtime-profiles/${encodeURIComponent(id)}`, RuntimeProfileDtoSchema)
  }
}
