import type {ApiClient} from '../http.js'
import type {ApiKeyDto, ApiKeyCreateResponse, CreateApiKeyRequest, Page} from '../types.js'
import {ApiKeyDtoSchema, ApiKeyCreateResponseSchema, CreateApiKeyRequestSchema} from '../schemas.js'
import {apiPost, fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import {validateRequest} from '../validation.js'

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

  /** Get a single API key by ID. */
  async get(id: string | number): Promise<ApiKeyDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/api-keys/${id}`, ApiKeyDtoSchema)
  }

  /** Create a new API key. Returns the full key value (only available at creation time). */
  async create(body: CreateApiKeyRequest): Promise<ApiKeyCreateResponse> {
    validateRequest(CreateApiKeyRequestSchema, body, 'apiKeys.create')
    return fetchSingle(this.client, 'POST', '/api/v1/api-keys', ApiKeyCreateResponseSchema, body)
  }

  /** Revoke an API key (disables it without deleting). */
  async revoke(id: string | number): Promise<void> {
    await apiPost(this.client, `/api/v1/api-keys/${id}/revoke`)
  }

  /** Delete an API key permanently. */
  async delete(id: string | number): Promise<void> {
    return fetchVoid(this.client, `/api/v1/api-keys/${id}`)
  }
}
