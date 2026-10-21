import type {ApiClient} from '../http.js'
import type {
  MonitorDto, CreateMonitorRequest, UpdateMonitorRequest,
  MonitorVersionDto, CheckResultDto, MonitorTestResultDto, RunDto,
  CodeTestTargetRequest, Page, CursorPage,
} from '../types.js'
import {
  MonitorDtoSchema, MonitorVersionDtoSchema,
  CheckResultDtoSchema, MonitorTestResultDtoSchema, RunDtoSchema,
  CreateMonitorRequestSchema, UpdateMonitorRequestSchema, CodeTestTargetRequestSchema,
} from '../schemas.js'
import {
  apiPostWithStatus, fetchAllPages, fetchPage, fetchCursorPage, fetchSingle, fetchVoid,
} from '../http.js'
import {parseSingle, validateRequest} from '../validation.js'
import {DevhelmMonitorTestQueuedError, DevhelmValidationError} from '../errors.js'

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
    return fetchVoid(this.client, `/api/v1/monitors/${id}`)
  }

  /** Pause a monitor. */
  async pause(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'POST', `/api/v1/monitors/${id}/pause`, MonitorDtoSchema)
  }

  /** Resume a paused monitor. */
  async resume(id: string | number): Promise<MonitorDto> {
    return fetchSingle(this.client, 'POST', `/api/v1/monitors/${id}/resume`, MonitorDtoSchema)
  }

  /**
   * Test an uptime monitor (HTTP, TCP, DNS, ICMP, MCP) once and return the
   * probe result. Nothing is stored.
   *
   * Browser and multi-step API monitors do not return a probe result: the
   * API queues a validation run instead, and this method throws
   * {@link DevhelmMonitorTestQueuedError} (carrying that run). Use
   * {@link Monitors.testRun} for those monitors.
   */
  async test(id: string | number): Promise<MonitorTestResultDto> {
    const path = `/api/v1/monitors/${id}/test`
    const {status, data} = await apiPostWithStatus(this.client, path)
    if (status === 202) {
      throw new DevhelmMonitorTestQueuedError(parseSingle(RunDtoSchema, data, path))
    }
    return parseSingle(MonitorTestResultDtoSchema, data, path)
  }

  /**
   * Queue a validation run for a browser or multi-step API monitor and
   * return it. The run does not vote on health; poll it by `run.id` for its
   * outcome. `target` picks the environment and region; each defaults to the
   * monitor's own.
   *
   * Uptime monitors answer with a probe result instead; this method then
   * throws `DevhelmValidationError`. Use {@link Monitors.test} for those.
   */
  async testRun(id: string | number, target?: CodeTestTargetRequest): Promise<RunDto> {
    const path = `/api/v1/monitors/${id}/test`
    const body = target === undefined
      ? undefined
      : validateRequest(CodeTestTargetRequestSchema, target, 'monitors.testRun')
    const {status, data} = await apiPostWithStatus(this.client, path, body)
    if (status !== 202) {
      throw new DevhelmValidationError(
        `Response validation failed (${path}): expected a queued validation run (202), got ${status}. ` +
          'This is an uptime monitor; use monitors.test() for it.',
      )
    }
    return parseSingle(RunDtoSchema, data, path)
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
