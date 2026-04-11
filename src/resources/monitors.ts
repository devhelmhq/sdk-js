import type {ApiClient} from '../http.js'
import type {
  MonitorDto, CreateMonitorRequest, UpdateMonitorRequest,
  MonitorVersionDto, CheckResultDto, AssertionTestResultDto,
  Page, CursorPage,
} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, fetchCursorPage, unwrapSingle} from '../http.js'

export class Monitors {
  constructor(private readonly client: ApiClient) {}

  /** List all monitors (auto-paginates). */
  async list(): Promise<MonitorDto[]> {
    return fetchAllPages<MonitorDto>(this.client, '/api/v1/monitors')
  }

  /** List monitors with manual page control. */
  async listPage(page: number, size: number): Promise<Page<MonitorDto>> {
    return fetchPage<MonitorDto>(this.client, '/api/v1/monitors', page, size)
  }

  /** Get a single monitor by ID. */
  async get(id: string | number): Promise<MonitorDto> {
    const resp = await apiGet<{data?: MonitorDto}>(this.client, `/api/v1/monitors/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a new monitor. */
  async create(body: CreateMonitorRequest): Promise<MonitorDto> {
    const resp = await apiPost<{data?: MonitorDto}>(this.client, '/api/v1/monitors', body)
    return unwrapSingle(resp)
  }

  /** Update an existing monitor. */
  async update(id: string | number, body: UpdateMonitorRequest): Promise<MonitorDto> {
    const resp = await apiPut<{data?: MonitorDto}>(this.client, `/api/v1/monitors/${id}`, body)
    return unwrapSingle(resp)
  }

  /** Delete a monitor. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/monitors/${id}`)
  }

  /** Pause a monitor. */
  async pause(id: string | number): Promise<MonitorDto> {
    const resp = await apiPost<{data?: MonitorDto}>(this.client, `/api/v1/monitors/${id}/pause`)
    return unwrapSingle(resp)
  }

  /** Resume a paused monitor. */
  async resume(id: string | number): Promise<MonitorDto> {
    const resp = await apiPost<{data?: MonitorDto}>(this.client, `/api/v1/monitors/${id}/resume`)
    return unwrapSingle(resp)
  }

  /** Trigger an ad-hoc test run for a monitor. */
  async test(id: string | number): Promise<AssertionTestResultDto> {
    const resp = await apiPost<{data?: AssertionTestResultDto}>(this.client, `/api/v1/monitors/${id}/test`)
    return unwrapSingle(resp)
  }

  /** List check results (cursor-paginated). */
  async results(
    id: string | number,
    options: {cursor?: string; limit?: number} = {},
  ): Promise<CursorPage<CheckResultDto>> {
    return fetchCursorPage<CheckResultDto>(this.client, `/api/v1/monitors/${id}/results`, options)
  }

  /** List monitor version history. */
  async versions(
    id: string | number,
    options: {page?: number; size?: number} = {},
  ): Promise<Page<MonitorVersionDto>> {
    return fetchPage<MonitorVersionDto>(
      this.client,
      `/api/v1/monitors/${id}/versions`,
      options.page ?? 0,
      options.size ?? 20,
    )
  }
}
