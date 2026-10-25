import type {ApiClient} from '../http.js'
import type {EnvironmentDto, CreateEnvironmentRequest, UpdateEnvironmentRequest, Page} from '../types.js'
import {EnvironmentDtoSchema, CreateEnvironmentRequestSchema, UpdateEnvironmentRequestSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import {validateRequest} from '../validation.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class Environments {
  private readonly ids = new Map<string, Promise<string>>()

  constructor(private readonly client: ApiClient) {}

  /**
   * An environment id from a slug or id. Slugs resolve through
   * `GET /environments/{slug}` once per client; an unknown slug throws
   * `NotFoundError`.
   */
  async resolveId(slugOrId: string): Promise<string> {
    if (UUID.test(slugOrId)) return slugOrId
    let id = this.ids.get(slugOrId)
    if (!id) {
      id = this.get(slugOrId).then((env) => env.id)
      id.catch(() => this.ids.delete(slugOrId))
      this.ids.set(slugOrId, id)
    }
    return id
  }

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
    validateRequest(CreateEnvironmentRequestSchema, body, 'environments.create')
    return fetchSingle(this.client, 'POST', '/api/v1/environments', EnvironmentDtoSchema, body)
  }

  /** Update an existing environment. */
  async update(slug: string, body: UpdateEnvironmentRequest): Promise<EnvironmentDto> {
    validateRequest(UpdateEnvironmentRequestSchema, body, 'environments.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/environments/${slug}`, EnvironmentDtoSchema, body)
  }

  /** Delete an environment. */
  async delete(slug: string): Promise<void> {
    return fetchVoid(this.client, `/api/v1/environments/${slug}`)
  }
}
