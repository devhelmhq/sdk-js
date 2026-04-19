import type {ApiClient} from '../http.js'
import type {TagDto, CreateTagRequest, UpdateTagRequest, Page} from '../types.js'
import {TagDtoSchema, CreateTagRequestSchema, UpdateTagRequestSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle} from '../http.js'
import {validateRequest} from '../validation.js'

export class Tags {
  constructor(private readonly client: ApiClient) {}

  /** List all tags (auto-paginates). */
  async list(): Promise<TagDto[]> {
    return fetchAllPages(this.client, '/api/v1/tags', TagDtoSchema)
  }

  /** List tags with manual page control. */
  async listPage(page: number, size: number): Promise<Page<TagDto>> {
    return fetchPage(this.client, '/api/v1/tags', TagDtoSchema, page, size)
  }

  /** Get a single tag by ID. */
  async get(id: string | number): Promise<TagDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/tags/${id}`, TagDtoSchema)
  }

  /** Create a new tag. */
  async create(body: CreateTagRequest): Promise<TagDto> {
    validateRequest(CreateTagRequestSchema, body, 'tags.create')
    return fetchSingle(this.client, 'POST', '/api/v1/tags', TagDtoSchema, body)
  }

  /** Update an existing tag. */
  async update(id: string | number, body: UpdateTagRequest): Promise<TagDto> {
    validateRequest(UpdateTagRequestSchema, body, 'tags.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/tags/${id}`, TagDtoSchema, body)
  }

  /** Delete a tag. */
  async delete(id: string | number): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/tags/${id}`, TagDtoSchema)
  }
}
