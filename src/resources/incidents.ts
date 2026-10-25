import type {ApiClient} from '../http.js'
import type {
  AcknowledgeAllIncidentsResponse,
  AddIncidentUpdateRequest,
  CreateManualIncidentRequest,
  CursorPage,
  IncidentActivityEventDto,
  IncidentDetailDto,
  IncidentDto,
  IncidentFilter,
  IncidentTriggerDto,
  Page,
  RelatedIncidentsResponse,
  ResolveIncidentRequest,
  RunDto,
  UpdateIncidentRequest,
} from '../types.js'
import {
  AcknowledgeAllIncidentsResponseSchema,
  AddIncidentUpdateRequestSchema,
  CreateManualIncidentRequestSchema,
  IncidentActivityEventDtoSchema,
  IncidentDetailDtoSchema,
  IncidentDtoSchema,
  IncidentTriggerDtoSchema,
  RelatedIncidentsResponseSchema,
  ResolveIncidentRequestSchema,
  RunDtoSchema,
  UpdateIncidentRequestSchema,
} from '../schemas.js'
import {apiGet, fetchAllPages, fetchCursorPage, fetchPage, fetchSingle} from '../http.js'
import {parse, validateRequest} from '../validation.js'

function incidentPath(id: string | number, suffix = ''): string {
  return `/api/v1/incidents/${encodeURIComponent(String(id))}${suffix}`
}

export class Incidents {
  constructor(private readonly client: ApiClient) {}

  /** List incidents (auto-paginates). */
  async list(filter: Omit<IncidentFilter, 'page' | 'size'> = {}): Promise<IncidentDto[]> {
    return fetchAllPages(this.client, '/api/v1/incidents', IncidentDtoSchema, 200, filter)
  }

  /** List incidents with manual page control. */
  async listPage(page: number, size: number, filter: Omit<IncidentFilter, 'page' | 'size'> = {}): Promise<Page<IncidentDto>> {
    return fetchPage(this.client, '/api/v1/incidents', IncidentDtoSchema, page, size, filter)
  }

  /** Get a single incident by ID. */
  async get(id: string | number): Promise<IncidentDetailDto> {
    return fetchSingle(this.client, 'GET', incidentPath(id), IncidentDetailDtoSchema)
  }

  /** Create a manual incident. */
  async create(body: CreateManualIncidentRequest): Promise<IncidentDetailDto> {
    validateRequest(CreateManualIncidentRequestSchema, body, 'incidents.create')
    return fetchSingle(this.client, 'POST', '/api/v1/incidents', IncidentDetailDtoSchema, body)
  }

  /** Edit title, severity or body (`PATCH /incidents/{id}`). */
  async update(id: string | number, body: UpdateIncidentRequest): Promise<IncidentDetailDto> {
    validateRequest(UpdateIncidentRequestSchema, body, 'incidents.update')
    return fetchSingle(this.client, 'PATCH', incidentPath(id), IncidentDetailDtoSchema, body)
  }

  /** Acknowledge (`POST /incidents/{id}/acknowledge`). */
  async acknowledge(id: string | number): Promise<AcknowledgeAllIncidentsResponse> {
    return fetchSingle(this.client, 'POST', incidentPath(id, '/acknowledge'), AcknowledgeAllIncidentsResponseSchema)
  }

  /** Resolve an incident. */
  async resolve(id: string | number, body?: ResolveIncidentRequest): Promise<IncidentDetailDto> {
    if (body) validateRequest(ResolveIncidentRequestSchema, body, 'incidents.resolve')
    return fetchSingle(this.client, 'POST', incidentPath(id, '/resolve'), IncidentDetailDtoSchema, body ?? {})
  }

  /** Add a timeline update (`POST /incidents/{id}/updates`). */
  async addUpdate(id: string | number, body: AddIncidentUpdateRequest): Promise<IncidentDetailDto> {
    validateRequest(AddIncidentUpdateRequestSchema, body, 'incidents.addUpdate')
    return fetchSingle(this.client, 'POST', incidentPath(id, '/updates'), IncidentDetailDtoSchema, body)
  }

  /** Runs in the incident (`GET /incidents/{id}/runs`). */
  async runs(id: string | number, options: {cursor?: string; limit?: number} = {}): Promise<CursorPage<RunDto>> {
    return fetchCursorPage(this.client, incidentPath(id, '/runs'), RunDtoSchema, options)
  }

  /** The run that opened the incident (`GET /incidents/{id}/trigger`). */
  async trigger(id: string | number): Promise<IncidentTriggerDto> {
    return fetchSingle(this.client, 'GET', incidentPath(id, '/trigger'), IncidentTriggerDtoSchema)
  }

  /** Related incidents (`GET /incidents/{id}/related`). */
  async related(id: string | number, options: {windowDays?: number; limit?: number} = {}): Promise<RelatedIncidentsResponse> {
    const path = incidentPath(id, '/related')
    return parse(RelatedIncidentsResponseSchema, await apiGet(this.client, path, options), path)
  }

  /** Activity timeline (`GET /incidents/{id}/events`). */
  async events(id: string | number, options: {cursor?: string; limit?: number} = {}): Promise<CursorPage<IncidentActivityEventDto>> {
    return fetchCursorPage(this.client, incidentPath(id, '/events'), IncidentActivityEventDtoSchema, options)
  }
}
