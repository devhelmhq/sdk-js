import type {ApiClient} from '../http.js'
import type {ServiceSubscriptionDto, Page} from '../types.js'
import {ServiceSubscriptionDtoSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'

export class Dependencies {
  constructor(private readonly client: ApiClient) {}

  /** List all service subscriptions (auto-paginates). */
  async list(): Promise<ServiceSubscriptionDto[]> {
    return fetchAllPages(this.client, '/api/v1/service-subscriptions', ServiceSubscriptionDtoSchema)
  }

  /** List service subscriptions with manual page control. */
  async listPage(page: number, size: number): Promise<Page<ServiceSubscriptionDto>> {
    return fetchPage(this.client, '/api/v1/service-subscriptions', ServiceSubscriptionDtoSchema, page, size)
  }

  /** Get a single service subscription by ID. */
  async get(id: string | number): Promise<ServiceSubscriptionDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/service-subscriptions/${id}`, ServiceSubscriptionDtoSchema)
  }

  /** Track (subscribe to) a service from the catalog by its slug. */
  async track(slug: string): Promise<ServiceSubscriptionDto> {
    return fetchSingle(this.client, 'POST', `/api/v1/service-subscriptions/${slug}`, ServiceSubscriptionDtoSchema)
  }

  /** Untrack (unsubscribe from) a service subscription. */
  async delete(subscriptionId: string | number): Promise<void> {
    return fetchVoid(this.client, `/api/v1/service-subscriptions/${subscriptionId}`)
  }
}
