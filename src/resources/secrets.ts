import type {ApiClient} from '../http.js'
import type {SecretDto, CreateSecretRequest, UpdateSecretRequest, Page} from '../types.js'
import {SecretDtoSchema, CreateSecretRequestSchema, UpdateSecretRequestSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import {validateRequest} from '../validation.js'

export class Secrets {
  constructor(private readonly client: ApiClient) {}

  /** List all secrets (auto-paginates). Returns metadata only, not values. */
  async list(): Promise<SecretDto[]> {
    return fetchAllPages(this.client, '/api/v1/secrets', SecretDtoSchema)
  }

  /** List secrets with manual page control. */
  async listPage(page: number, size: number): Promise<Page<SecretDto>> {
    return fetchPage(this.client, '/api/v1/secrets', SecretDtoSchema, page, size)
  }

  /** Create a new secret. */
  async create(body: CreateSecretRequest): Promise<SecretDto> {
    validateRequest(CreateSecretRequestSchema, body, 'secrets.create')
    return fetchSingle(this.client, 'POST', '/api/v1/secrets', SecretDtoSchema, body)
  }

  /** Update a secret's value by key. */
  async update(key: string, body: UpdateSecretRequest): Promise<SecretDto> {
    validateRequest(UpdateSecretRequestSchema, body, 'secrets.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/secrets/${key}`, SecretDtoSchema, body)
  }

  /** Delete a secret by key. */
  async delete(key: string): Promise<void> {
    return fetchVoid(this.client, `/api/v1/secrets/${key}`)
  }
}
