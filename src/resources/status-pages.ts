import type {ApiClient} from '../http.js'
import type {
  StatusPageDto, CreateStatusPageRequest, UpdateStatusPageRequest,
  StatusPageComponentDto, CreateStatusPageComponentRequest, UpdateStatusPageComponentRequest,
  StatusPageComponentGroupDto, CreateStatusPageComponentGroupRequest, UpdateStatusPageComponentGroupRequest,
  StatusPageIncidentDto, CreateStatusPageIncidentRequest, UpdateStatusPageIncidentRequest,
  StatusPageSubscriberDto,
  StatusPageCustomDomainDto,
  Page,
} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

const BASE = '/api/v1/status-pages'

class Components {
  constructor(private readonly client: ApiClient) {}

  /** List all components on a status page. */
  async list(pageId: string | number): Promise<StatusPageComponentDto[]> {
    return fetchAllPages<StatusPageComponentDto>(this.client, `${BASE}/${pageId}/components`)
  }

  /** Add a component to a status page. */
  async create(pageId: string | number, body: CreateStatusPageComponentRequest): Promise<StatusPageComponentDto> {
    const resp = await apiPost<{data?: StatusPageComponentDto}>(this.client, `${BASE}/${pageId}/components`, body)
    return unwrapSingle(resp)
  }

  /** Update a component. */
  async update(pageId: string | number, componentId: string | number, body: UpdateStatusPageComponentRequest): Promise<StatusPageComponentDto> {
    const resp = await apiPut<{data?: StatusPageComponentDto}>(this.client, `${BASE}/${pageId}/components/${componentId}`, body)
    return unwrapSingle(resp)
  }

  /** Remove a component from a status page. */
  async delete(pageId: string | number, componentId: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${pageId}/components/${componentId}`)
  }

  /** Batch reorder components. */
  async reorder(pageId: string | number, body: {positions: Array<{componentId: string; displayOrder?: number; groupId?: string | null}>}): Promise<void> {
    await apiPut<void>(this.client, `${BASE}/${pageId}/components/reorder`, body)
  }
}

class Groups {
  constructor(private readonly client: ApiClient) {}

  /** List all component groups (with nested components). */
  async list(pageId: string | number): Promise<StatusPageComponentGroupDto[]> {
    return fetchAllPages<StatusPageComponentGroupDto>(this.client, `${BASE}/${pageId}/groups`)
  }

  /** Create a component group. */
  async create(pageId: string | number, body: CreateStatusPageComponentGroupRequest): Promise<StatusPageComponentGroupDto> {
    const resp = await apiPost<{data?: StatusPageComponentGroupDto}>(this.client, `${BASE}/${pageId}/groups`, body)
    return unwrapSingle(resp)
  }

  /** Update a component group. */
  async update(pageId: string | number, groupId: string | number, body: UpdateStatusPageComponentGroupRequest): Promise<StatusPageComponentGroupDto> {
    const resp = await apiPut<{data?: StatusPageComponentGroupDto}>(this.client, `${BASE}/${pageId}/groups/${groupId}`, body)
    return unwrapSingle(resp)
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
    return fetchPage<StatusPageIncidentDto>(this.client, `${BASE}/${pageId}/incidents`, options.page ?? 0, options.size ?? 20)
  }

  /** Get a single incident with timeline. */
  async get(pageId: string | number, incidentId: string | number): Promise<StatusPageIncidentDto> {
    const resp = await apiGet<{data?: StatusPageIncidentDto}>(this.client, `${BASE}/${pageId}/incidents/${incidentId}`)
    return unwrapSingle(resp)
  }

  /** Create a status page incident. */
  async create(pageId: string | number, body: CreateStatusPageIncidentRequest): Promise<StatusPageIncidentDto> {
    const resp = await apiPost<{data?: StatusPageIncidentDto}>(this.client, `${BASE}/${pageId}/incidents`, body)
    return unwrapSingle(resp)
  }

  /** Update an incident. */
  async update(pageId: string | number, incidentId: string | number, body: UpdateStatusPageIncidentRequest): Promise<StatusPageIncidentDto> {
    const resp = await apiPut<{data?: StatusPageIncidentDto}>(this.client, `${BASE}/${pageId}/incidents/${incidentId}`, body)
    return unwrapSingle(resp)
  }

  /** Post a timeline update on an incident. */
  async postUpdate(pageId: string | number, incidentId: string | number, body: {body: string; status: string; notifySubscribers?: boolean; affectedComponents?: Array<{componentId: string; status: string}>}): Promise<StatusPageIncidentDto> {
    const resp = await apiPost<{data?: StatusPageIncidentDto}>(this.client, `${BASE}/${pageId}/incidents/${incidentId}/updates`, body)
    return unwrapSingle(resp)
  }

  /** Publish a draft incident. */
  async publish(pageId: string | number, incidentId: string | number, body?: Record<string, unknown>): Promise<StatusPageIncidentDto> {
    const resp = await apiPost<{data?: StatusPageIncidentDto}>(this.client, `${BASE}/${pageId}/incidents/${incidentId}/publish`, body)
    return unwrapSingle(resp)
  }

  /** Dismiss a draft incident. */
  async dismiss(pageId: string | number, incidentId: string | number): Promise<void> {
    await apiPost<void>(this.client, `${BASE}/${pageId}/incidents/${incidentId}/dismiss`)
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
    return fetchPage<StatusPageSubscriberDto>(this.client, `${BASE}/${pageId}/subscribers`, options.page ?? 0, options.size ?? 20)
  }

  /** Add a subscriber (admin). */
  async add(pageId: string | number, body: {email: string}): Promise<StatusPageSubscriberDto> {
    const resp = await apiPost<{data?: StatusPageSubscriberDto}>(this.client, `${BASE}/${pageId}/subscribers`, body)
    return unwrapSingle(resp)
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
    return fetchAllPages<StatusPageCustomDomainDto>(this.client, `${BASE}/${pageId}/domains`)
  }

  /** Add a custom domain. */
  async add(pageId: string | number, body: {hostname: string}): Promise<StatusPageCustomDomainDto> {
    const resp = await apiPost<{data?: StatusPageCustomDomainDto}>(this.client, `${BASE}/${pageId}/domains`, body)
    return unwrapSingle(resp)
  }

  /** Trigger domain verification check. */
  async verify(pageId: string | number, domainId: string | number): Promise<StatusPageCustomDomainDto> {
    const resp = await apiPost<{data?: StatusPageCustomDomainDto}>(this.client, `${BASE}/${pageId}/domains/${domainId}/verify`)
    return unwrapSingle(resp)
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
    return fetchAllPages<StatusPageDto>(this.client, BASE)
  }

  /** Get a status page by ID. */
  async get(id: string | number): Promise<StatusPageDto> {
    const resp = await apiGet<{data?: StatusPageDto}>(this.client, `${BASE}/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a status page. */
  async create(body: CreateStatusPageRequest): Promise<StatusPageDto> {
    const resp = await apiPost<{data?: StatusPageDto}>(this.client, BASE, body)
    return unwrapSingle(resp)
  }

  /** Update a status page. */
  async update(id: string | number, body: UpdateStatusPageRequest): Promise<StatusPageDto> {
    const resp = await apiPut<{data?: StatusPageDto}>(this.client, `${BASE}/${id}`, body)
    return unwrapSingle(resp)
  }

  /** Delete a status page. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `${BASE}/${id}`)
  }
}
