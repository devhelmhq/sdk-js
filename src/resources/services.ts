import type {ApiClient} from '../http.js'
import type {
  ServiceCatalogDto,
  ServiceDetailDto,
  ServiceLiveStatusDto,
  CategoryDto,
  GlobalStatusSummaryDto,
  ServiceComponentDto,
  ComponentUptimeDayDto,
  BatchComponentUptimeDto,
  ServiceDayDetailDto,
  ServiceIncidentDto,
  ServiceIncidentDetailDto,
  ServiceUptimeResponse,
  ScheduledMaintenanceDto,
  Page,
  CursorPage,
} from '../types.js'
import {
  ServiceCatalogDtoSchema,
  ServiceDetailDtoSchema,
  ServiceLiveStatusDtoSchema,
  CategoryDtoSchema,
  GlobalStatusSummaryDtoSchema,
  ServiceComponentDtoSchema,
  ComponentUptimeDayDtoSchema,
  BatchComponentUptimeDtoSchema,
  ServiceDayDetailDtoSchema,
  ServiceIncidentDtoSchema,
  ServiceIncidentDetailDtoSchema,
  ServiceUptimeResponseSchema,
  ScheduledMaintenanceDtoSchema,
} from '../schemas.js'
import {apiGet, fetchSingle} from '../http.js'
import {parsePage, parseCursorPage} from '../validation.js'

const BASE = '/api/v1/services'

/** Filters for listing catalog services. */
export interface ServiceListFilters {
  /** Filter by category slug (see `client.services.categories()`). */
  category?: string
  /** Filter by current overall status (e.g. `OPERATIONAL`, `MAJOR_OUTAGE`). */
  status?: string
  /** Free-text search over service name and slug. */
  search?: string
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string
  /** Page size. */
  limit?: number
}

/** Filters for listing service incidents (per-service or global). */
export interface ServiceIncidentFilters {
  /** When set, lists incidents for this service only; otherwise lists across all services. */
  slugOrId?: string
  /** Filter by incident status (e.g. `investigating`, `resolved`). */
  status?: string
  /** Only incidents that started at or after this ISO 8601 timestamp. */
  from?: string
  /** Filter by service category (global mode only). */
  category?: string
  page?: number
  size?: number
}

/** Time-range options for component uptime queries. */
export interface UptimeRangeOptions {
  /** Named period (e.g. `30d`, `90d`). Mutually exclusive with from/to. */
  period?: string
  /** Range start, ISO 8601. */
  from?: string
  /** Range end, ISO 8601. */
  to?: string
}

/**
 * Read-only Status Data catalog — third-party services DevHelm polls
 * (their live status, components, incidents, uptime, and maintenances).
 *
 * To subscribe your org to a service for alerting, see
 * `client.dependencies.track()`.
 */
export class Services {
  constructor(private readonly client: ApiClient) {}

  /** List catalog services (cursor-paginated). */
  async list(options: ServiceListFilters = {}): Promise<CursorPage<ServiceCatalogDto>> {
    const query: Record<string, unknown> = {}
    if (options.category !== undefined) query['category'] = options.category
    if (options.status !== undefined) query['status'] = options.status
    if (options.search !== undefined) query['search'] = options.search
    if (options.cursor !== undefined) query['cursor'] = options.cursor
    if (options.limit !== undefined) query['limit'] = options.limit

    const raw = await apiGet(this.client, BASE, query)
    const validated = parseCursorPage(ServiceCatalogDtoSchema, raw, BASE)
    return {
      data: validated.data,
      nextCursor: validated.nextCursor ?? null,
      hasMore: validated.hasMore,
    }
  }

  /** Get a single service by slug or UUID. Set `summary` to omit heavy detail sections. */
  async get(slugOrId: string, options: {summary?: boolean} = {}): Promise<ServiceDetailDto> {
    const query: Record<string, unknown> = {}
    if (options.summary !== undefined) query['summary'] = options.summary
    return fetchSingle(this.client, 'GET', `${BASE}/${slugOrId}`, ServiceDetailDtoSchema, undefined, query)
  }

  /** Current live status of a service (overall + per-component). */
  async liveStatus(slugOrId: string): Promise<ServiceLiveStatusDto> {
    return fetchSingle(this.client, 'GET', `${BASE}/${slugOrId}/live-status`, ServiceLiveStatusDtoSchema)
  }

  /** List catalog categories with per-category service counts. */
  async categories(): Promise<CategoryDto[]> {
    const path = '/api/v1/categories'
    const raw = await apiGet(this.client, path)
    return parsePage(CategoryDtoSchema, raw, path).data
  }

  /** Global status summary across the whole catalog. */
  async summary(): Promise<GlobalStatusSummaryDto> {
    return fetchSingle(this.client, 'GET', `${BASE}/summary`, GlobalStatusSummaryDtoSchema)
  }

  /** List components of a service, optionally scoped to a component group. */
  async components(slugOrId: string, options: {groupId?: string} = {}): Promise<ServiceComponentDto[]> {
    const path = `${BASE}/${slugOrId}/components`
    const query: Record<string, unknown> = {}
    if (options.groupId !== undefined) query['groupId'] = options.groupId
    const raw = await apiGet(this.client, path, query)
    return parsePage(ServiceComponentDtoSchema, raw, path).data
  }

  /** Daily uptime history for a single component. */
  async componentUptime(
    slugOrId: string,
    componentId: string,
    options: UptimeRangeOptions = {},
  ): Promise<ComponentUptimeDayDto[]> {
    const path = `${BASE}/${slugOrId}/components/${componentId}/uptime`
    const raw = await apiGet(this.client, path, buildRangeQuery(options))
    return parsePage(ComponentUptimeDayDtoSchema, raw, path).data
  }

  /** Daily uptime history for every component of a service, keyed by component id. */
  async batchComponentUptime(slugOrId: string, options: UptimeRangeOptions = {}): Promise<BatchComponentUptimeDto> {
    return fetchSingle(
      this.client,
      'GET',
      `${BASE}/${slugOrId}/components/uptime`,
      BatchComponentUptimeDtoSchema,
      undefined,
      buildRangeQuery(options),
    )
  }

  /** Detailed breakdown of a single day (`date` as `YYYY-MM-DD`). */
  async day(slugOrId: string, date: string): Promise<ServiceDayDetailDto> {
    return fetchSingle(this.client, 'GET', `${BASE}/${slugOrId}/days/${date}`, ServiceDayDetailDtoSchema)
  }

  /**
   * List service incidents (paginated).
   *
   * With `slugOrId` set, lists incidents for that service; without it,
   * lists incidents across the whole catalog (optionally filtered by
   * `category`, which only applies in global mode).
   */
  async incidents(options: ServiceIncidentFilters = {}): Promise<Page<ServiceIncidentDto>> {
    const path = options.slugOrId !== undefined ? `${BASE}/${options.slugOrId}/incidents` : `${BASE}/incidents`
    const query: Record<string, unknown> = {
      page: options.page ?? 0,
      size: options.size ?? 20,
    }
    if (options.status !== undefined) query['status'] = options.status
    if (options.from !== undefined) query['from'] = options.from
    if (options.slugOrId === undefined && options.category !== undefined) query['category'] = options.category

    const raw = await apiGet(this.client, path, query)
    const validated = parsePage(ServiceIncidentDtoSchema, raw, path)
    return {
      data: validated.data,
      hasNext: validated.hasNext,
      hasPrev: validated.hasPrev,
      totalElements: validated.totalElements ?? null,
      totalPages: validated.totalPages ?? null,
    }
  }

  /** Get a single service incident with its update timeline. */
  async incident(slugOrId: string, incidentId: string): Promise<ServiceIncidentDetailDto> {
    return fetchSingle(
      this.client,
      'GET',
      `${BASE}/${slugOrId}/incidents/${incidentId}`,
      ServiceIncidentDetailDtoSchema,
    )
  }

  /** Service-level uptime over a period, bucketed by granularity. */
  async uptime(
    slugOrId: string,
    options: {period?: string; granularity?: string} = {},
  ): Promise<ServiceUptimeResponse> {
    const query: Record<string, unknown> = {}
    if (options.period !== undefined) query['period'] = options.period
    if (options.granularity !== undefined) query['granularity'] = options.granularity
    return fetchSingle(this.client, 'GET', `${BASE}/${slugOrId}/uptime`, ServiceUptimeResponseSchema, undefined, query)
  }

  /** List scheduled maintenances for a service, optionally filtered by status(es). */
  async maintenances(slugOrId: string, options: {status?: string | string[]} = {}): Promise<ScheduledMaintenanceDto[]> {
    const path = `${BASE}/${slugOrId}/maintenances`
    const query: Record<string, unknown> = {}
    if (options.status !== undefined) query['status'] = options.status
    const raw = await apiGet(this.client, path, query)
    return parsePage(ScheduledMaintenanceDtoSchema, raw, path).data
  }
}

function buildRangeQuery(options: UptimeRangeOptions): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (options.period !== undefined) query['period'] = options.period
  if (options.from !== undefined) query['from'] = options.from
  if (options.to !== undefined) query['to'] = options.to
  return query
}
