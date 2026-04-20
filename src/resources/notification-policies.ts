import type {ApiClient} from '../http.js'
import type {NotificationPolicyDto, CreateNotificationPolicyRequest, UpdateNotificationPolicyRequest, Page} from '../types.js'
import {NotificationPolicyDtoSchema, CreateNotificationPolicyRequestSchema, UpdateNotificationPolicyRequestSchema} from '../schemas.js'
import {apiPost, fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import {validateRequest} from '../validation.js'

export class NotificationPolicies {
  constructor(private readonly client: ApiClient) {}

  /** List all notification policies (auto-paginates). */
  async list(): Promise<NotificationPolicyDto[]> {
    return fetchAllPages(this.client, '/api/v1/notification-policies', NotificationPolicyDtoSchema)
  }

  /** List notification policies with manual page control. */
  async listPage(page: number, size: number): Promise<Page<NotificationPolicyDto>> {
    return fetchPage(this.client, '/api/v1/notification-policies', NotificationPolicyDtoSchema, page, size)
  }

  /** Get a single notification policy by ID. */
  async get(id: string | number): Promise<NotificationPolicyDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/notification-policies/${id}`, NotificationPolicyDtoSchema)
  }

  /** Create a new notification policy. */
  async create(body: CreateNotificationPolicyRequest): Promise<NotificationPolicyDto> {
    validateRequest(CreateNotificationPolicyRequestSchema, body, 'notificationPolicies.create')
    return fetchSingle(this.client, 'POST', '/api/v1/notification-policies', NotificationPolicyDtoSchema, body)
  }

  /** Update an existing notification policy. */
  async update(id: string | number, body: UpdateNotificationPolicyRequest): Promise<NotificationPolicyDto> {
    validateRequest(UpdateNotificationPolicyRequestSchema, body, 'notificationPolicies.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/notification-policies/${id}`, NotificationPolicyDtoSchema, body)
  }

  /** Delete a notification policy. */
  async delete(id: string | number): Promise<void> {
    return fetchVoid(this.client, `/api/v1/notification-policies/${id}`)
  }

  /** Send a test dispatch to verify policy routing. */
  async test(id: string | number): Promise<void> {
    await apiPost(this.client, `/api/v1/notification-policies/${id}/test`, {})
  }
}
