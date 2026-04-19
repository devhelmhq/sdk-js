import type {ApiClient} from '../http.js'
import type {IncidentDto, IncidentDetailDto, CreateManualIncidentRequest, ResolveIncidentRequest, Page} from '../types.js'
import {IncidentDtoSchema, IncidentDetailDtoSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle} from '../http.js'

export class Incidents {
  constructor(private readonly client: ApiClient) {}

  /** List all incidents (auto-paginates). */
  async list(): Promise<IncidentDto[]> {
    return fetchAllPages(this.client, '/api/v1/incidents', IncidentDtoSchema)
  }

  /** List incidents with manual page control. */
  async listPage(page: number, size: number): Promise<Page<IncidentDto>> {
    return fetchPage(this.client, '/api/v1/incidents', IncidentDtoSchema, page, size)
  }

  /** Get a single incident by ID. */
  async get(id: string | number): Promise<IncidentDetailDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/incidents/${id}`, IncidentDetailDtoSchema)
  }

  /** Create a manual incident. */
  async create(body: CreateManualIncidentRequest): Promise<IncidentDetailDto> {
    return fetchSingle(this.client, 'POST', '/api/v1/incidents', IncidentDetailDtoSchema, body)
  }

  /** Resolve an incident. */
  async resolve(id: string | number, body?: ResolveIncidentRequest): Promise<IncidentDetailDto> {
    return fetchSingle(this.client, 'POST', `/api/v1/incidents/${id}/resolve`, IncidentDetailDtoSchema, body ?? {})
  }

  /** Delete an incident. */
  async delete(id: string | number): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/incidents/${id}`, IncidentDetailDtoSchema)
  }
}
