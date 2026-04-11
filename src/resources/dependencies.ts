import type {ApiClient} from '../http.js'
import type {ServiceSubscriptionDto, Page} from '../types.js'
import {apiPost, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class Dependencies {
  constructor(private readonly client: ApiClient) {}

  /** List all service subscriptions (auto-paginates). */
  async list(): Promise<ServiceSubscriptionDto[]> {
    return fetchAllPages<ServiceSubscriptionDto>(this.client, '/api/v1/service-subscriptions')
  }

  /** List service subscriptions with manual page control. */
  async listPage(page: number, size: number): Promise<Page<ServiceSubscriptionDto>> {
    return fetchPage<ServiceSubscriptionDto>(this.client, '/api/v1/service-subscriptions', page, size)
  }

  /** Track (subscribe to) a service from the catalog by its slug. */
  async track(slug: string): Promise<ServiceSubscriptionDto> {
    const resp = await apiPost<{data?: ServiceSubscriptionDto}>(this.client, `/api/v1/service-subscriptions/${slug}`)
    return unwrapSingle(resp)
  }

  /** Untrack (unsubscribe from) a service subscription. */
  async delete(subscriptionId: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/service-subscriptions/${subscriptionId}`)
  }
}
