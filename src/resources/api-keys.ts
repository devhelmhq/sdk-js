import type {ApiClient} from '../http.js'
import type {ApiKeyDto, ApiKeyCreateResponse, CreateApiKeyRequest, Page} from '../types.js'
import {ApiKeyDtoSchema, ApiKeyCreateResponseSchema} from '../schemas.js'
import {apiPost, fetchAllPages, fetchPage, fetchSingle} from '../http.js'

export class ApiKeys {
  constructor(private readonly client: ApiClient) {}

  /** List all API keys (auto-paginates). */
  async list(): Promise<ApiKeyDto[]> {
    return fetchAllPages(this.client, '/api/v1/api-keys', ApiKeyDtoSchema)
  }

  /** List API keys with manual page control. */
  async listPage(page: number, size: number): Promise<Page<ApiKeyDto>> {
    return fetchPage(this.client, '/api/v1/api-keys', ApiKeyDtoSchema, page, size)
  }

  /** Create a new API key. Returns the full key value (only available at creation time). */
  async create(body: CreateApiKeyRequest): Promise<ApiKeyCreateResponse> {
    return fetchSingle(this.client, 'POST', '/api/v1/api-keys', ApiKeyCreateResponseSchema, body)
  }

  /** Revoke an API key (disables it without deleting). */
  async revoke(id: string | number): Promise<void> {
    await apiPost(this.client, `/api/v1/api-keys/${id}/revoke`)
  }

  /** Delete an API key permanently. */
  async delete(id: string | number): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/api-keys/${id}`, ApiKeyDtoSchema)
  }
}
