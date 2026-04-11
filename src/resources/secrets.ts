import type {ApiClient} from '../http.js'
import type {SecretDto, CreateSecretRequest, UpdateSecretRequest, Page} from '../types.js'
import {apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class Secrets {
  constructor(private readonly client: ApiClient) {}

  /** List all secrets (auto-paginates). Returns metadata only, not values. */
  async list(): Promise<SecretDto[]> {
    return fetchAllPages<SecretDto>(this.client, '/api/v1/secrets')
  }

  /** List secrets with manual page control. */
  async listPage(page: number, size: number): Promise<Page<SecretDto>> {
    return fetchPage<SecretDto>(this.client, '/api/v1/secrets', page, size)
  }

  /** Create a new secret. */
  async create(body: CreateSecretRequest): Promise<SecretDto> {
    const resp = await apiPost<{data?: SecretDto}>(this.client, '/api/v1/secrets', body)
    return unwrapSingle(resp)
  }

  /** Update a secret's value by key. */
  async update(key: string, body: UpdateSecretRequest): Promise<SecretDto> {
    const resp = await apiPut<{data?: SecretDto}>(this.client, `/api/v1/secrets/${key}`, body)
    return unwrapSingle(resp)
  }

  /** Delete a secret by key. */
  async delete(key: string): Promise<void> {
    await apiDelete(this.client, `/api/v1/secrets/${key}`)
  }
}
