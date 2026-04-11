import type {ApiClient} from '../http.js'
import type {NotificationPolicyDto, CreateNotificationPolicyRequest, UpdateNotificationPolicyRequest, Page} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class NotificationPolicies {
  constructor(private readonly client: ApiClient) {}

  /** List all notification policies (auto-paginates). */
  async list(): Promise<NotificationPolicyDto[]> {
    return fetchAllPages<NotificationPolicyDto>(this.client, '/api/v1/notification-policies')
  }

  /** List notification policies with manual page control. */
  async listPage(page: number, size: number): Promise<Page<NotificationPolicyDto>> {
    return fetchPage<NotificationPolicyDto>(this.client, '/api/v1/notification-policies', page, size)
  }

  /** Get a single notification policy by ID. */
  async get(id: string | number): Promise<NotificationPolicyDto> {
    const resp = await apiGet<{data?: NotificationPolicyDto}>(this.client, `/api/v1/notification-policies/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a new notification policy. */
  async create(body: CreateNotificationPolicyRequest): Promise<NotificationPolicyDto> {
    const resp = await apiPost<{data?: NotificationPolicyDto}>(this.client, '/api/v1/notification-policies', body)
    return unwrapSingle(resp)
  }

  /** Update an existing notification policy. */
  async update(id: string | number, body: UpdateNotificationPolicyRequest): Promise<NotificationPolicyDto> {
    const resp = await apiPut<{data?: NotificationPolicyDto}>(this.client, `/api/v1/notification-policies/${id}`, body)
    return unwrapSingle(resp)
  }

  /** Delete a notification policy. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/notification-policies/${id}`)
  }

  /** Send a test dispatch to verify policy routing. */
  async test(id: string | number): Promise<void> {
    await apiPost<unknown>(this.client, `/api/v1/notification-policies/${id}/test`, {})
  }
}
