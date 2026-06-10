import type {ApiClient} from '../http.js'
import type {ServiceSubscriptionDto, ServiceSubscribeRequest, Page} from '../types.js'
import {
  ServiceSubscriptionDtoSchema,
  ServiceSubscribeRequestSchema,
  UpdateAlertSensitivityRequestSchema,
} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import {validateRequest} from '../validation.js'

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

  /**
   * Track (subscribe to) a service from the catalog by its slug.
   *
   * Optionally scope the subscription to a single component (`componentId`)
   * and/or set the alert sensitivity. When neither option is provided the
   * request is sent without a body, matching the server's defaults
   * (whole-service subscription, default sensitivity).
   */
  async track(slug: string, options?: ServiceSubscribeRequest): Promise<ServiceSubscriptionDto> {
    const hasBody = options !== undefined && (options.componentId !== undefined || options.alertSensitivity !== undefined)
    if (hasBody) validateRequest(ServiceSubscribeRequestSchema, options, 'dependencies.track')
    return fetchSingle(
      this.client,
      'POST',
      `/api/v1/service-subscriptions/${slug}`,
      ServiceSubscriptionDtoSchema,
      hasBody ? options : undefined,
    )
  }

  /** Change how sensitively a subscription alerts (e.g. `ALL`, `MAJOR_ONLY`). */
  async updateAlertSensitivity(
    subscriptionId: string | number,
    alertSensitivity: string,
  ): Promise<ServiceSubscriptionDto> {
    const body = {alertSensitivity}
    validateRequest(UpdateAlertSensitivityRequestSchema, body, 'dependencies.updateAlertSensitivity')
    return fetchSingle(
      this.client,
      'PATCH',
      `/api/v1/service-subscriptions/${subscriptionId}/alert-sensitivity`,
      ServiceSubscriptionDtoSchema,
      body,
    )
  }

  /** Untrack (unsubscribe from) a service subscription. */
  async delete(subscriptionId: string | number): Promise<void> {
    return fetchVoid(this.client, `/api/v1/service-subscriptions/${subscriptionId}`)
  }
}
