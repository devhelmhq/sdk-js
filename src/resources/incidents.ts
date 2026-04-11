import type {ApiClient} from '../http.js'
import type {IncidentDto, IncidentDetailDto, CreateManualIncidentRequest, Page} from '../types.js'
import {apiGet, apiPost, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class Incidents {
  constructor(private readonly client: ApiClient) {}

  /** List all incidents (auto-paginates). */
  async list(): Promise<IncidentDto[]> {
    return fetchAllPages<IncidentDto>(this.client, '/api/v1/incidents')
  }

  /** List incidents with manual page control. */
  async listPage(page: number, size: number): Promise<Page<IncidentDto>> {
    return fetchPage<IncidentDto>(this.client, '/api/v1/incidents', page, size)
  }

  /** Get a single incident by ID. */
  async get(id: string | number): Promise<IncidentDetailDto> {
    const resp = await apiGet<{data?: IncidentDetailDto}>(this.client, `/api/v1/incidents/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a manual incident. */
  async create(body: CreateManualIncidentRequest): Promise<IncidentDto> {
    const resp = await apiPost<{data?: IncidentDto}>(this.client, '/api/v1/incidents', body)
    return unwrapSingle(resp)
  }

  /** Resolve an incident. */
  async resolve(id: string | number, message?: string): Promise<IncidentDetailDto> {
    const body = message ? {message} : {}
    const resp = await apiPost<{data?: IncidentDetailDto}>(this.client, `/api/v1/incidents/${id}/resolve`, body)
    return unwrapSingle(resp)
  }

  /** Delete an incident. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/incidents/${id}`)
  }
}
