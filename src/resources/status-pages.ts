import type {ApiClient} from '../http.js'
import type {
  StatusPageDto, CreateStatusPageRequest, UpdateStatusPageRequest,
  StatusPageComponentDto, CreateStatusPageComponentRequest, UpdateStatusPageComponentRequest,
  StatusPageComponentGroupDto, CreateStatusPageComponentGroupRequest, UpdateStatusPageComponentGroupRequest,
  StatusPageIncidentDto, CreateStatusPageIncidentRequest, UpdateStatusPageIncidentRequest,
  CreateStatusPageIncidentUpdateRequest, PublishStatusPageIncidentRequest,
  StatusPageSubscriberDto, AdminAddSubscriberRequest,
  StatusPageCustomDomainDto, AddCustomDomainRequest,
  ReorderComponentsRequest,
  Page,
} from '../types.js'
import {
  StatusPageDtoSchema, StatusPageComponentDtoSchema, StatusPageComponentGroupDtoSchema,
  StatusPageIncidentDtoSchema, StatusPageSubscriberDtoSchema, StatusPageCustomDomainDtoSchema,
} from '../schemas.js'
import {apiPut, apiDelete, fetchAllPages, fetchPage, fetchSingle} from '../http.js'

const BASE = '/api/v1/status-pages'

class Components {
  constructor(private readonly client: ApiClient) {}

  /** List all components on a status page. */
  async list(pageId: string | number): Promise<StatusPageComponentDto[]> {
    return fetchAllPages(this.client, `${BASE}/${pageId}/components`, StatusPageComponentDtoSchema)
  }

  /** Add a component to a status page. */
  async create(pageId: string | number, body: CreateStatusPageComponentRequest): Promise<StatusPageComponentDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/components`, StatusPageComponentDtoSchema, body)
  }

  /** Update a component. */
  async update(pageId: string | number, componentId: string | number, body: UpdateStatusPageComponentRequest): Promise<StatusPageComponentDto> {
    return fetchSingle(this.client, 'PUT', `${BASE}/${pageId}/components/${componentId}`, StatusPageComponentDtoSchema, body)
  }

  /** Remove a component from a status page. */
  async delete(pageId: string | number, componentId: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${pageId}/components/${componentId}`)
  }

  /** Batch reorder components. */
  async reorder(pageId: string | number, body: ReorderComponentsRequest): Promise<void> {
    await apiPut(this.client, `${BASE}/${pageId}/components/reorder`, body)
  }
}

class Groups {
  constructor(private readonly client: ApiClient) {}

  /** List all component groups (with nested components). */
  async list(pageId: string | number): Promise<StatusPageComponentGroupDto[]> {
    return fetchAllPages(this.client, `${BASE}/${pageId}/groups`, StatusPageComponentGroupDtoSchema)
  }

  /** Create a component group. */
  async create(pageId: string | number, body: CreateStatusPageComponentGroupRequest): Promise<StatusPageComponentGroupDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/groups`, StatusPageComponentGroupDtoSchema, body)
  }

  /** Update a component group. */
  async update(pageId: string | number, groupId: string | number, body: UpdateStatusPageComponentGroupRequest): Promise<StatusPageComponentGroupDto> {
    return fetchSingle(this.client, 'PUT', `${BASE}/${pageId}/groups/${groupId}`, StatusPageComponentGroupDtoSchema, body)
  }

  /** Delete a component group. */
  async delete(pageId: string | number, groupId: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${pageId}/groups/${groupId}`)
  }
}

class Incidents {
  constructor(private readonly client: ApiClient) {}

  /** List incidents on a status page (paginated). */
  async list(pageId: string | number, options: {page?: number; size?: number} = {}): Promise<Page<StatusPageIncidentDto>> {
    return fetchPage(this.client, `${BASE}/${pageId}/incidents`, StatusPageIncidentDtoSchema, options.page ?? 0, options.size ?? 20)
  }

  /** Get a single incident with timeline. */
  async get(pageId: string | number, incidentId: string | number): Promise<StatusPageIncidentDto> {
    return fetchSingle(this.client, 'GET', `${BASE}/${pageId}/incidents/${incidentId}`, StatusPageIncidentDtoSchema)
  }

  /** Create a status page incident. */
  async create(pageId: string | number, body: CreateStatusPageIncidentRequest): Promise<StatusPageIncidentDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/incidents`, StatusPageIncidentDtoSchema, body)
  }

  /** Update an incident. */
  async update(pageId: string | number, incidentId: string | number, body: UpdateStatusPageIncidentRequest): Promise<StatusPageIncidentDto> {
    return fetchSingle(this.client, 'PUT', `${BASE}/${pageId}/incidents/${incidentId}`, StatusPageIncidentDtoSchema, body)
  }

  /** Post a timeline update on an incident. */
  async postUpdate(pageId: string | number, incidentId: string | number, body: CreateStatusPageIncidentUpdateRequest): Promise<StatusPageIncidentDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/incidents/${incidentId}/updates`, StatusPageIncidentDtoSchema, body)
  }

  /** Publish a draft incident. */
  async publish(pageId: string | number, incidentId: string | number, body?: PublishStatusPageIncidentRequest): Promise<StatusPageIncidentDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/incidents/${incidentId}/publish`, StatusPageIncidentDtoSchema, body)
  }

  /** Dismiss a draft incident. */
  async dismiss(pageId: string | number, incidentId: string | number): Promise<void> {
    await fetchSingle(this.client, 'POST', `${BASE}/${pageId}/incidents/${incidentId}/dismiss`, StatusPageIncidentDtoSchema)
  }

  /** Delete an incident. */
  async delete(pageId: string | number, incidentId: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${pageId}/incidents/${incidentId}`)
  }
}

class Subscribers {
  constructor(private readonly client: ApiClient) {}

  /** List confirmed subscribers (paginated). */
  async list(pageId: string | number, options: {page?: number; size?: number} = {}): Promise<Page<StatusPageSubscriberDto>> {
    return fetchPage(this.client, `${BASE}/${pageId}/subscribers`, StatusPageSubscriberDtoSchema, options.page ?? 0, options.size ?? 20)
  }

  /** Add a subscriber (admin). */
  async add(pageId: string | number, body: AdminAddSubscriberRequest): Promise<StatusPageSubscriberDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/subscribers`, StatusPageSubscriberDtoSchema, body)
  }

  /** Remove a subscriber. */
  async remove(pageId: string | number, subscriberId: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${pageId}/subscribers/${subscriberId}`)
  }
}

class Domains {
  constructor(private readonly client: ApiClient) {}

  /** List custom domains on a status page. */
  async list(pageId: string | number): Promise<StatusPageCustomDomainDto[]> {
    return fetchAllPages(this.client, `${BASE}/${pageId}/domains`, StatusPageCustomDomainDtoSchema)
  }

  /** Add a custom domain. */
  async add(pageId: string | number, body: AddCustomDomainRequest): Promise<StatusPageCustomDomainDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/domains`, StatusPageCustomDomainDtoSchema, body)
  }

  /** Trigger domain verification check. */
  async verify(pageId: string | number, domainId: string | number): Promise<StatusPageCustomDomainDto> {
    return fetchSingle(this.client, 'POST', `${BASE}/${pageId}/domains/${domainId}/verify`, StatusPageCustomDomainDtoSchema)
  }

  /** Remove a custom domain. */
  async remove(pageId: string | number, domainId: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${pageId}/domains/${domainId}`)
  }
}

export class StatusPages {
  readonly components: Components
  readonly groups: Groups
  readonly incidents: Incidents
  readonly subscribers: Subscribers
  readonly domains: Domains

  constructor(private readonly client: ApiClient) {
    this.components = new Components(client)
    this.groups = new Groups(client)
    this.incidents = new Incidents(client)
    this.subscribers = new Subscribers(client)
    this.domains = new Domains(client)
  }

  /** List all status pages in the workspace. */
  async list(): Promise<StatusPageDto[]> {
    return fetchAllPages(this.client, BASE, StatusPageDtoSchema)
  }

  /** Get a status page by ID. */
  async get(id: string | number): Promise<StatusPageDto> {
    return fetchSingle(this.client, 'GET', `${BASE}/${id}`, StatusPageDtoSchema)
  }

  /** Create a status page. */
  async create(body: CreateStatusPageRequest): Promise<StatusPageDto> {
    return fetchSingle(this.client, 'POST', BASE, StatusPageDtoSchema, body)
  }

  /** Update a status page. */
  async update(id: string | number, body: UpdateStatusPageRequest): Promise<StatusPageDto> {
    return fetchSingle(this.client, 'PUT', `${BASE}/${id}`, StatusPageDtoSchema, body)
  }

  /** Delete a status page. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${id}`)
  }
}
