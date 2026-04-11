import type {ApiClient} from '../http.js'
import type {AlertChannelDto, CreateAlertChannelRequest, UpdateAlertChannelRequest, Page} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class AlertChannels {
  constructor(private readonly client: ApiClient) {}

  /** List all alert channels (auto-paginates). */
  async list(): Promise<AlertChannelDto[]> {
    return fetchAllPages<AlertChannelDto>(this.client, '/api/v1/alert-channels')
  }

  /** List alert channels with manual page control. */
  async listPage(page: number, size: number): Promise<Page<AlertChannelDto>> {
    return fetchPage<AlertChannelDto>(this.client, '/api/v1/alert-channels', page, size)
  }

  /** Get a single alert channel by ID. */
  async get(id: string | number): Promise<AlertChannelDto> {
    const resp = await apiGet<{data?: AlertChannelDto}>(this.client, `/api/v1/alert-channels/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a new alert channel. */
  async create(body: CreateAlertChannelRequest): Promise<AlertChannelDto> {
    const resp = await apiPost<{data?: AlertChannelDto}>(this.client, '/api/v1/alert-channels', body)
    return unwrapSingle(resp)
  }

  /** Update an existing alert channel. */
  async update(id: string | number, body: UpdateAlertChannelRequest): Promise<AlertChannelDto> {
    const resp = await apiPut<{data?: AlertChannelDto}>(this.client, `/api/v1/alert-channels/${id}`, body)
    return unwrapSingle(resp)
  }

  /** Delete an alert channel. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/alert-channels/${id}`)
  }

  /** Send a test notification to this channel. */
  async test(id: string | number): Promise<{success: boolean}> {
    const resp = await apiPost<{data?: {success: boolean}}>(this.client, `/api/v1/alert-channels/${id}/test`)
    return unwrapSingle(resp)
  }
}
