import type {ApiClient} from '../http.js'
import type {EnvironmentDto, CreateEnvironmentRequest, UpdateEnvironmentRequest, Page} from '../types.js'
import {EnvironmentDtoSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle} from '../http.js'

export class Environments {
  constructor(private readonly client: ApiClient) {}

  /** List all environments (auto-paginates). */
  async list(): Promise<EnvironmentDto[]> {
    return fetchAllPages(this.client, '/api/v1/environments', EnvironmentDtoSchema)
  }

  /** List environments with manual page control. */
  async listPage(page: number, size: number): Promise<Page<EnvironmentDto>> {
    return fetchPage(this.client, '/api/v1/environments', EnvironmentDtoSchema, page, size)
  }

  /** Get a single environment by slug. */
  async get(slug: string): Promise<EnvironmentDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/environments/${slug}`, EnvironmentDtoSchema)
  }

  /** Create a new environment. */
  async create(body: CreateEnvironmentRequest): Promise<EnvironmentDto> {
    return fetchSingle(this.client, 'POST', '/api/v1/environments', EnvironmentDtoSchema, body)
  }

  /** Update an existing environment. */
  async update(slug: string, body: UpdateEnvironmentRequest): Promise<EnvironmentDto> {
    return fetchSingle(this.client, 'PUT', `/api/v1/environments/${slug}`, EnvironmentDtoSchema, body)
  }

  /** Delete an environment. */
  async delete(slug: string): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/environments/${slug}`, EnvironmentDtoSchema)
  }
}
