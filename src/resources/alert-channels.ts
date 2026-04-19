import type {ApiClient} from '../http.js'
import type {AlertChannelDto, CreateAlertChannelRequest, UpdateAlertChannelRequest, TestChannelResult, Page} from '../types.js'
import {AlertChannelDtoSchema, TestChannelResultSchema} from '../schemas.js'
import {fetchAllPages, fetchPage, fetchSingle} from '../http.js'

export class AlertChannels {
  constructor(private readonly client: ApiClient) {}

  /** List all alert channels (auto-paginates). */
  async list(): Promise<AlertChannelDto[]> {
    return fetchAllPages(this.client, '/api/v1/alert-channels', AlertChannelDtoSchema)
  }

  /** List alert channels with manual page control. */
  async listPage(page: number, size: number): Promise<Page<AlertChannelDto>> {
    return fetchPage(this.client, '/api/v1/alert-channels', AlertChannelDtoSchema, page, size)
  }

  /** Get a single alert channel by ID. */
  async get(id: string | number): Promise<AlertChannelDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/alert-channels/${id}`, AlertChannelDtoSchema)
  }

  /** Create a new alert channel. */
  async create(body: CreateAlertChannelRequest): Promise<AlertChannelDto> {
    return fetchSingle(this.client, 'POST', '/api/v1/alert-channels', AlertChannelDtoSchema, body)
  }

  /** Update an existing alert channel. */
  async update(id: string | number, body: UpdateAlertChannelRequest): Promise<AlertChannelDto> {
    return fetchSingle(this.client, 'PUT', `/api/v1/alert-channels/${id}`, AlertChannelDtoSchema, body)
  }

  /** Delete an alert channel. */
  async delete(id: string | number): Promise<void> {
    await fetchSingle(this.client, 'DELETE', `/api/v1/alert-channels/${id}`, AlertChannelDtoSchema)
  }

  /** Send a test notification to this channel. */
  async test(id: string | number): Promise<TestChannelResult> {
    return fetchSingle(this.client, 'POST', `/api/v1/alert-channels/${id}/test`, TestChannelResultSchema)
  }
}
