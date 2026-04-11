import type {ApiClient} from '../http.js'
import type {TagDto, CreateTagRequest, UpdateTagRequest, Page} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class Tags {
  constructor(private readonly client: ApiClient) {}

  /** List all tags (auto-paginates). */
  async list(): Promise<TagDto[]> {
    return fetchAllPages<TagDto>(this.client, '/api/v1/tags')
  }

  /** List tags with manual page control. */
  async listPage(page: number, size: number): Promise<Page<TagDto>> {
    return fetchPage<TagDto>(this.client, '/api/v1/tags', page, size)
  }

  /** Get a single tag by ID. */
  async get(id: string | number): Promise<TagDto> {
    const resp = await apiGet<{data?: TagDto}>(this.client, `/api/v1/tags/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a new tag. */
  async create(body: CreateTagRequest): Promise<TagDto> {
    const resp = await apiPost<{data?: TagDto}>(this.client, '/api/v1/tags', body)
    return unwrapSingle(resp)
  }

  /** Update an existing tag. */
  async update(id: string | number, body: UpdateTagRequest): Promise<TagDto> {
    const resp = await apiPut<{data?: TagDto}>(this.client, `/api/v1/tags/${id}`, body)
    return unwrapSingle(resp)
  }

  /** Delete a tag. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/tags/${id}`)
  }
}
