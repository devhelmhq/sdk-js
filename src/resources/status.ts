import type {ApiClient} from '../http.js'
import type {DashboardOverviewDto} from '../types.js'
import {apiGet, unwrapSingle} from '../http.js'

export class Status {
  constructor(private readonly client: ApiClient) {}

  /** Get the dashboard overview (monitors summary, active incidents, etc.). */
  async overview(): Promise<DashboardOverviewDto> {
    const resp = await apiGet<{data?: DashboardOverviewDto}>(this.client, '/api/v1/dashboard/overview')
    return unwrapSingle(resp)
  }
}
