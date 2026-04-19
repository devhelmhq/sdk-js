import type {ApiClient} from '../http.js'
import type {WebhookEndpointDto, CreateWebhookEndpointRequest, UpdateWebhookEndpointRequest, WebhookTestResult, Page} from '../types.js'
import {WebhookEndpointDtoSchema, WebhookTestResultSchema, CreateWebhookEndpointRequestSchema, UpdateWebhookEndpointRequestSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle} from '../http.js'
import {validateRequest} from '../validation.js'

export class Webhooks {
  constructor(private readonly client: ApiClient) {}

  /** List all webhook endpoints (auto-paginates). */
  async list(): Promise<WebhookEndpointDto[]> {
    return fetchAllPages(this.client, '/api/v1/webhooks', WebhookEndpointDtoSchema)
  }

  /** List webhook endpoints with manual page control. */
  async listPage(page: number, size: number): Promise<Page<WebhookEndpointDto>> {
    return fetchPage(this.client, '/api/v1/webhooks', WebhookEndpointDtoSchema, page, size)
  }

  /** Get a single webhook endpoint by ID. */
  async get(id: string | number): Promise<WebhookEndpointDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/webhooks/${id}`, WebhookEndpointDtoSchema)
  }

  /** Create a new webhook endpoint. */
  async create(body: CreateWebhookEndpointRequest): Promise<WebhookEndpointDto> {
    validateRequest(CreateWebhookEndpointRequestSchema, body, 'webhooks.create')
    return fetchSingle(this.client, 'POST', '/api/v1/webhooks', WebhookEndpointDtoSchema, body)
  }

  /** Update an existing webhook endpoint. */
  async update(id: string | number, body: UpdateWebhookEndpointRequest): Promise<WebhookEndpointDto> {
    validateRequest(UpdateWebhookEndpointRequestSchema, body, 'webhooks.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/webhooks/${id}`, WebhookEndpointDtoSchema, body)
  }

  /** Delete a webhook endpoint. */
  async delete(id: string | number): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/webhooks/${id}`, WebhookEndpointDtoSchema)
  }

  /** Send a test event to this webhook. */
  async test(id: string | number): Promise<WebhookTestResult> {
    return fetchSingle(this.client, 'POST', `/api/v1/webhooks/${id}/test`, WebhookTestResultSchema)
  }
}
