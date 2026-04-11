import type {ApiClient} from '../http.js'
import type {WebhookEndpointDto, CreateWebhookEndpointRequest, UpdateWebhookEndpointRequest, Page} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class Webhooks {
  constructor(private readonly client: ApiClient) {}

  /** List all webhook endpoints (auto-paginates). */
  async list(): Promise<WebhookEndpointDto[]> {
    return fetchAllPages<WebhookEndpointDto>(this.client, '/api/v1/webhooks')
  }

  /** List webhook endpoints with manual page control. */
  async listPage(page: number, size: number): Promise<Page<WebhookEndpointDto>> {
    return fetchPage<WebhookEndpointDto>(this.client, '/api/v1/webhooks', page, size)
  }

  /** Get a single webhook endpoint by ID. */
  async get(id: string | number): Promise<WebhookEndpointDto> {
    const resp = await apiGet<{data?: WebhookEndpointDto}>(this.client, `/api/v1/webhooks/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a new webhook endpoint. */
  async create(body: CreateWebhookEndpointRequest): Promise<WebhookEndpointDto> {
    const resp = await apiPost<{data?: WebhookEndpointDto}>(this.client, '/api/v1/webhooks', body)
    return unwrapSingle(resp)
  }

  /** Update an existing webhook endpoint. */
  async update(id: string | number, body: UpdateWebhookEndpointRequest): Promise<WebhookEndpointDto> {
    const resp = await apiPut<{data?: WebhookEndpointDto}>(this.client, `/api/v1/webhooks/${id}`, body)
    return unwrapSingle(resp)
  }

  /** Delete a webhook endpoint. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/webhooks/${id}`)
  }

  /** Send a test event to this webhook. */
  async test(id: string | number): Promise<{success: boolean}> {
    const resp = await apiPost<{data?: {success: boolean}}>(this.client, `/api/v1/webhooks/${id}/test`)
    return unwrapSingle(resp)
  }
}
