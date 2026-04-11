import type {ApiClient} from '../http.js'
import type {ApiKeyDto, ApiKeyCreateResponse, CreateApiKeyRequest, Page} from '../types.js'
import {apiPost, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class ApiKeys {
  constructor(private readonly client: ApiClient) {}

  /** List all API keys (auto-paginates). */
  async list(): Promise<ApiKeyDto[]> {
    return fetchAllPages<ApiKeyDto>(this.client, '/api/v1/api-keys')
  }

  /** List API keys with manual page control. */
  async listPage(page: number, size: number): Promise<Page<ApiKeyDto>> {
    return fetchPage<ApiKeyDto>(this.client, '/api/v1/api-keys', page, size)
  }

  /** Create a new API key. Returns the full key value (only available at creation time). */
  async create(body: CreateApiKeyRequest): Promise<ApiKeyCreateResponse> {
    const resp = await apiPost<{data?: ApiKeyCreateResponse}>(this.client, '/api/v1/api-keys', body)
    return unwrapSingle(resp)
  }

  /** Revoke an API key (disables it without deleting). */
  async revoke(id: string | number): Promise<void> {
    await apiPost<unknown>(this.client, `/api/v1/api-keys/${id}/revoke`)
  }

  /** Delete an API key permanently. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/api-keys/${id}`)
  }
}
