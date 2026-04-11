import type {ApiClient} from '../http.js'
import type {EnvironmentDto, CreateEnvironmentRequest, UpdateEnvironmentRequest, Page} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class Environments {
  constructor(private readonly client: ApiClient) {}

  /** List all environments (auto-paginates). */
  async list(): Promise<EnvironmentDto[]> {
    return fetchAllPages<EnvironmentDto>(this.client, '/api/v1/environments')
  }

  /** List environments with manual page control. */
  async listPage(page: number, size: number): Promise<Page<EnvironmentDto>> {
    return fetchPage<EnvironmentDto>(this.client, '/api/v1/environments', page, size)
  }

  /** Get a single environment by slug. */
  async get(slug: string): Promise<EnvironmentDto> {
    const resp = await apiGet<{data?: EnvironmentDto}>(this.client, `/api/v1/environments/${slug}`)
    return unwrapSingle(resp)
  }

  /** Create a new environment. */
  async create(body: CreateEnvironmentRequest): Promise<EnvironmentDto> {
    const resp = await apiPost<{data?: EnvironmentDto}>(this.client, '/api/v1/environments', body)
    return unwrapSingle(resp)
  }

  /** Update an existing environment. */
  async update(slug: string, body: UpdateEnvironmentRequest): Promise<EnvironmentDto> {
    const resp = await apiPut<{data?: EnvironmentDto}>(this.client, `/api/v1/environments/${slug}`, body)
    return unwrapSingle(resp)
  }

  /** Delete an environment. */
  async delete(slug: string): Promise<void> {
    await apiDelete(this.client, `/api/v1/environments/${slug}`)
  }
}
