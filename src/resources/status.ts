import type {ApiClient} from '../http.js'
import type {DashboardOverviewDto} from '../types.js'
import {DashboardOverviewDtoSchema} from '../schemas.js'
import {fetchSingle} from '../http.js'

export class Status {
  constructor(private readonly client: ApiClient) {}

  /** Get the dashboard overview (monitors summary, active incidents, etc.). */
  async overview(): Promise<DashboardOverviewDto> {
    return fetchSingle(this.client, 'GET', '/api/v1/dashboard/overview', DashboardOverviewDtoSchema)
  }
}
