import type {ApiClient} from '../http.js'
import type {
  MonitorDto, CreateMonitorRequest, UpdateMonitorRequest,
  MonitorVersionDto, CheckResultDto, MonitorTestResultDto,
  Page, CursorPage,
} from '../types.js'
import {
  MonitorDtoSchema, MonitorVersionDtoSchema,
  CheckResultDtoSchema, MonitorTestResultDtoSchema,
  CreateMonitorRequestSchema, UpdateMonitorRequestSchema,
} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchCursorPage, fetchSingle} from '../http.js'
import {validateRequest} from '../validation.js'

export class Monitors {
  constructor(private readonly client: ApiClient) {}

  /** List all monitors (auto-paginates). */
  async list(): Promise<MonitorDto[]> {
    return fetchAllPages(this.client, '/api/v1/monitors', MonitorDtoSchema)
  }

  /** List monitors with manual page control. */
  async listPage(page: number, size: number): Promise<Page<MonitorDto>> {
    return fetchPage(this.client, '/api/v1/monitors', MonitorDtoSchema, page, size)
  }

  /** Get a single monitor by ID. */
  async get(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/monitors/${id}`, MonitorDtoSchema)
  }

  /** Create a new monitor. */
  async create(body: CreateMonitorRequest): Promise<MonitorDto> {
    validateRequest(CreateMonitorRequestSchema, body, 'monitors.create')
    return fetchSingle(this.client, 'POST', '/api/v1/monitors', MonitorDtoSchema, body)
  }

  /** Update an existing monitor. */
  async update(id: string | number, body: UpdateMonitorRequest): Promise<MonitorDto> {
    validateRequest(UpdateMonitorRequestSchema, body, 'monitors.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/monitors/${id}`, MonitorDtoSchema, body)
  }

  /** Delete a monitor. */
  async delete(id: string | number): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/monitors/${id}`, MonitorDtoSchema)
  }

  /** Pause a monitor. */
  async pause(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'POST', `/api/v1/monitors/${id}/pause`, MonitorDtoSchema)
  }

  /** Resume a paused monitor. */
  async resume(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'POST', `/api/v1/monitors/${id}/resume`, MonitorDtoSchema)
  }

  /** Trigger an ad-hoc test run for a monitor. */
  async test(id: string | number): Promise<MonitorTestResultDto> {
    return fetchSingle(this.client, 'POST', `/api/v1/monitors/${id}/test`, MonitorTestResultDtoSchema)
  }

  /** List check results (cursor-paginated). */
  async results(
    id: string | number,
    options: {cursor?: string; limit?: number} = {},
  ): Promise<CursorPage<CheckResultDto>> {
    return fetchCursorPage(this.client, `/api/v1/monitors/${id}/results`, CheckResultDtoSchema, options)
  }

  /** List monitor version history. */
  async versions(
    id: string | number,
    options: {page?: number; size?: number} = {},
  ): Promise<Page<MonitorVersionDto>> {
    return fetchPage(
      this.client,
      `/api/v1/monitors/${id}/versions`,
      MonitorVersionDtoSchema,
      options.page ?? 0,
      options.size ?? 20,
    )
  }
}
