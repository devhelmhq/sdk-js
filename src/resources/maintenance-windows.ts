import type {ApiClient} from '../http.js'
import type {
  MaintenanceWindowDto,
  CreateMaintenanceWindowRequest,
  UpdateMaintenanceWindowRequest,
  Page,
} from '../types.js'
import {
  MaintenanceWindowDtoSchema,
  CreateMaintenanceWindowRequestSchema,
  UpdateMaintenanceWindowRequestSchema,
} from '../schemas.js'
import {apiGet, fetchSingle, fetchVoid} from '../http.js'
import {parsePage, validateRequest} from '../validation.js'

/**
 * Filters for listing maintenance windows.
 *
 * - `monitorId` scopes results to a single monitor.
 * - `filter` is a server-side status bucket: `"active"` for windows currently
 *   in progress, `"upcoming"` for windows whose `startsAt` is in the future.
 *   Omit to return every window in the org regardless of status.
 */
export interface MaintenanceWindowFilters {
  monitorId?: string
  filter?: 'active' | 'upcoming'
}

/**
 * Schedule planned downtime so DevHelm suppresses alerts during the window.
 *
 * Maintenance windows are scoped to a single monitor (set `monitorId`) or
 * org-wide (leave `monitorId` unset / `null`). Recurring windows are
 * expressed via an iCal RRULE in `repeatRule`.
 */
export class MaintenanceWindows {
  constructor(private readonly client: ApiClient) {}

  /**
   * List maintenance windows for the calling org. Auto-paginates through
   * every page so callers receive the full set in a single array.
   *
   * @example
   * ```ts
   * const windows = await client.maintenanceWindows.list({filter: 'upcoming'})
   * ```
   */
  async list(filters: MaintenanceWindowFilters = {}): Promise<MaintenanceWindowDto[]> {
    const path = '/api/v1/maintenance-windows'
    const baseQuery: Record<string, unknown> = {}
    if (filters.monitorId !== undefined) baseQuery['monitorId'] = filters.monitorId
    if (filters.filter !== undefined) baseQuery['filter'] = filters.filter

    const all: MaintenanceWindowDto[] = []
    let page = 0
    const size = 200
    while (true) {
      const raw = await apiGet(this.client, path, {...baseQuery, page, size})
      const validated = parsePage(MaintenanceWindowDtoSchema, raw, path)
      all.push(...validated.data)
      if (!validated.hasNext) break
      page++
    }
    return all
  }

  /**
   * List maintenance windows with manual page control. Useful for callers
   * that render large windows in a paginated UI.
   *
   * @example
   * ```ts
   * const page = await client.maintenanceWindows.listPage(0, 50)
   * ```
   */
  async listPage(
    page: number,
    size: number,
    filters: MaintenanceWindowFilters = {},
  ): Promise<Page<MaintenanceWindowDto>> {
    const path = '/api/v1/maintenance-windows'
    const query: Record<string, unknown> = {page, size}
    if (filters.monitorId !== undefined) query['monitorId'] = filters.monitorId
    if (filters.filter !== undefined) query['filter'] = filters.filter
    const raw = await apiGet(this.client, path, query)
    const validated = parsePage(MaintenanceWindowDtoSchema, raw, path)
    return {
      data: validated.data,
      hasNext: validated.hasNext,
      hasPrev: validated.hasPrev,
      totalElements: validated.totalElements ?? null,
      totalPages: validated.totalPages ?? null,
    }
  }

  /**
   * Fetch a single maintenance window by UUID.
   *
   * @example
   * ```ts
   * const window = await client.maintenanceWindows.get(id)
   * ```
   */
  async get(id: string): Promise<MaintenanceWindowDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/maintenance-windows/${id}`, MaintenanceWindowDtoSchema)
  }

  /**
   * Schedule a new maintenance window. Set `monitorId` to `null` (or omit it)
   * to create an org-wide window that suppresses every monitor's alerts.
   *
   * @example
   * ```ts
   * const window = await client.maintenanceWindows.create({
   *   monitorId: '6f1a...',
   *   startsAt: '2026-06-01T03:00:00Z',
   *   endsAt: '2026-06-01T04:00:00Z',
   *   reason: 'Quarterly db migration',
   * })
   * ```
   */
  async create(body: CreateMaintenanceWindowRequest): Promise<MaintenanceWindowDto> {
    validateRequest(CreateMaintenanceWindowRequestSchema, body, 'maintenanceWindows.create')
    return fetchSingle(this.client, 'POST', '/api/v1/maintenance-windows', MaintenanceWindowDtoSchema, body)
  }

  /**
   * Update an existing maintenance window — adjust the start/end, swap the
   * monitor it covers, or change the recurrence rule.
   *
   * @example
   * ```ts
   * await client.maintenanceWindows.update(id, {
   *   startsAt: '2026-06-01T04:00:00Z',
   *   endsAt: '2026-06-01T05:00:00Z',
   * })
   * ```
   */
  async update(id: string, body: UpdateMaintenanceWindowRequest): Promise<MaintenanceWindowDto> {
    validateRequest(UpdateMaintenanceWindowRequestSchema, body, 'maintenanceWindows.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/maintenance-windows/${id}`, MaintenanceWindowDtoSchema, body)
  }

  /**
   * Cancel (delete) a maintenance window. After this call, alerts will fire
   * normally for the affected monitor — even if the window's `endsAt` is
   * still in the future.
   *
   * @example
   * ```ts
   * await client.maintenanceWindows.cancel(id)
   * ```
   */
  async cancel(id: string): Promise<void> {
    return fetchVoid(this.client, `/api/v1/maintenance-windows/${id}`)
  }
}
